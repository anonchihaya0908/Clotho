import * as vscode from 'vscode';
import { EditorOpenSource, ManagerContext } from '../../common/types';
import { EventBus } from './messaging/event-bus';
import { EditorStateManager } from './state/editor-state-manager';
import { ErrorRecoveryManager } from './error/error-recovery-manager';
import { MessageHandler } from './messaging/message-handler';
import { ClangFormatEditorManager } from './core/editor-manager';
import { PreviewEditorManager } from './core/preview-manager';
import { ConfigActionManager } from './core/config-action-manager';
import { PlaceholderWebviewManager } from './core/placeholder-manager';
import { DEFAULT_CLANG_FORMAT_CONFIG } from './config-options';
import { WebviewMessageType } from '../../common/types/webview';
import { DebounceIntegration } from './core/debounce-integration';

/**
 * 主协调器
 * 负责初始化和协调各个管理器
 */
export class ClangFormatEditorCoordinator implements vscode.Disposable {
  private eventBus: EventBus;
  private stateManager: EditorStateManager;
  private errorRecovery: ErrorRecoveryManager;
  private messageHandler: MessageHandler;
  private editorManager: ClangFormatEditorManager;
  private previewManager: PreviewEditorManager;
  private configActionManager: ConfigActionManager;
  private placeholderManager: PlaceholderWebviewManager;
  private debounceIntegration: DebounceIntegration;

  private disposables: vscode.Disposable[] = [];
  private isInitialized = false;

  constructor(private extensionUri: vscode.Uri) {
    // 1. 初始化核心服务
    this.eventBus = new EventBus();
    this.stateManager = new EditorStateManager(this.eventBus);
    this.errorRecovery = new ErrorRecoveryManager(
      this.stateManager,
      this.eventBus,
    );

    // 2. 初始化管理器
    this.messageHandler = new MessageHandler();
    this.editorManager = new ClangFormatEditorManager();
    this.previewManager = new PreviewEditorManager();
    this.configActionManager = new ConfigActionManager();
    this.placeholderManager = new PlaceholderWebviewManager();
    this.debounceIntegration = new DebounceIntegration(
      this.extensionUri,
      this.previewManager,
      this.placeholderManager,
    );

    // 3. 设置事件监听
    this.setupEventListeners();

    // 4. 注册VS Code命令
    this.registerCommands();
  }

  /**
   * 显示编辑器的主入口点
   */
  async showEditor(
    source: EditorOpenSource = EditorOpenSource.DIRECT,
  ): Promise<void> {
    try {
      // 确保只初始化一次
      if (!this.isInitialized) {
        await this.initializeOnce();
      }

      // 触发事件来创建编辑器
      this.eventBus.emit('create-editor-requested', source);
    } catch (error: any) {
      await this.errorRecovery.handleError('coordinator-startup-failed', error);
    }
  }

  /**
   * 确保只初始化一次的私有方法
   */
  private async initializeOnce(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const context: ManagerContext = {
      extensionUri: this.extensionUri,
      stateManager: this.stateManager,
      errorRecovery: this.errorRecovery,
      eventBus: this.eventBus,
    };

    await this.initializeManagers(context);
    this.isInitialized = true;
  }

  /**
   * 统一的资源清理
   */
  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.eventBus.dispose();
    this.stateManager.dispose();
    this.errorRecovery.dispose();
    this.messageHandler.dispose();
    this.editorManager.dispose();
    this.previewManager.dispose();
    this.placeholderManager.dispose();
    this.debounceIntegration.dispose();
  }

  /**
   * 设置管理器之间的事件监听和响应
   */
  private setupEventListeners(): void {
    // 监听重新打开预览的请求
    const debouncedReopenHandler =
      this.debounceIntegration.createDebouncedPreviewReopenHandler();
    this.eventBus.on('open-preview-requested', debouncedReopenHandler);

    // 监听预览关闭事件
    const debouncedCloseHandler =
      this.debounceIntegration.createDebouncedPreviewCloseHandler();
    this.eventBus.on('preview-closed', debouncedCloseHandler);

    // Webview消息路由
    this.eventBus.on('webview-message-received', (message) => {
      this.messageHandler.handleMessage(message);
    });

    // 监听配置变化请求
    this.eventBus.on(
      'config-change-requested',
      async (payload: { key: string; value: any }) => {
        await this.handleConfigChange(payload);
      },
    );

    // 监听主编辑器关闭事件，联动关闭所有
    this.eventBus.on('editor-closed', () => {
      this.eventBus.emit('close-preview-requested');
    });

    // 监听 webview 完全准备就绪事件，自动打开预览
    this.eventBus.on('editor-fully-ready', async () => {
      this.eventBus.emit('open-preview-requested');
    });

    // 检测用户手动关闭预览标签页
    vscode.window.tabGroups.onDidChangeTabs(async (event) => {
      const state = this.stateManager.getState();
      if (!state.previewUri) {
        return;
      }

      for (const tab of event.closed) {
        const tabInput = tab.input as { uri?: vscode.Uri };
        if (tabInput?.uri?.toString() === state.previewUri.toString()) {
          this.eventBus.emit('preview-closed');
          break;
        }
      }
    });

    // 【修复】重新添加对配置更新的监听，以刷新预览
    this.eventBus.on(
      'config-updated-for-preview',
      ({ newConfig }: { newConfig: Record<string, any> }) => {
        // 直接调用 previewManager 的方法来更新预览内容
        this.previewManager.updatePreviewWithConfig(newConfig);
      },
    );
  }

  /**
   * 处理配置变化请求
   */
  private async handleConfigChange(payload: {
    key: string;
    value: any;
  }): Promise<void> {
    try {
      const { key, value } = payload;

      // 更新配置状态
      const currentState = this.stateManager.getState();
      const newConfig = { ...currentState.currentConfig };

      if (value === 'inherit' || value === undefined || value === null) {
        delete newConfig[key];
      } else {
        newConfig[key] = value;
      }

      await this.stateManager.updateState(
        {
          currentConfig: newConfig,
          configDirty: true,
        },
        'config-changed',
      );

      // 通知webview配置已更新
      this.eventBus.emit('post-message-to-webview', {
        type: WebviewMessageType.CONFIG_LOADED,
        payload: { config: newConfig },
      });

      // 通知预览更新
      this.eventBus.emit('config-updated-for-preview', { newConfig });
    } catch (error: any) {
      await this.errorRecovery.handleError('config-change-failed', error, {
        payload,
      });
    }
  }

  /**
   * 初始化所有管理器
   */
  private async initializeManagers(context: ManagerContext): Promise<void> {
    const managers = [
      this.messageHandler,
      this.editorManager,
      this.previewManager,
      this.configActionManager,
      this.placeholderManager,
      this.debounceIntegration,
    ];

    for (const manager of managers) {
      try {
        await manager.initialize(context);
      } catch (error: any) {
        throw error;
      }
    }
  }

  /**
   * 注册需要在VS Code中使用的命令
   */
  private registerCommands(): void {
    const showCommand = vscode.commands.registerCommand(
      'clotho.showClangFormatEditor',
      () => {
        this.showEditor(EditorOpenSource.COMMAND);
      },
    );
    this.disposables.push(showCommand);
  }
}
