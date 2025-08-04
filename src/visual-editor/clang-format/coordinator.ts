import * as vscode from 'vscode';
import { logger } from '../../common/logger';
import { EditorOpenSource, ManagerContext } from '../../common/types';
import { WebviewMessageType } from '../../common/types/clang-format-shared';
import { ConfigActionManager } from './core/config-action-manager';
import { ConfigChangeService } from './core/config-change-service';
import { DebounceIntegration } from './core/debounce-integration';
import { ClangFormatEditorManager } from './core/editor-manager';
import { ManagerRegistry } from './core/manager-registry';
import { PlaceholderWebviewManager } from './core/placeholder-manager';
import { PreviewEditorManager } from './core/preview-manager';
import { ErrorRecoveryManager } from './error/error-recovery-manager';
import { ClangFormatService } from './format-service';
import { EventBus } from './messaging/event-bus';
import { MessageHandler } from './messaging/message-handler';
import { EditorStateManager } from './state/editor-state-manager';

/**
 * 主协调器
 * 负责初始化和协调各个管理器
 */
export class ClangFormatEditorCoordinator implements vscode.Disposable {
  private eventBus: EventBus;
  private stateManager: EditorStateManager;
  private errorRecovery: ErrorRecoveryManager;
  private configChangeService: ConfigChangeService;
  private managerRegistry: ManagerRegistry;

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

    // 2. 初始化配置变化服务
    this.configChangeService = new ConfigChangeService(
      this.stateManager,
      this.eventBus,
      this.errorRecovery,
    );

    // 3. 初始化管理器注册表
    this.managerRegistry = new ManagerRegistry();
    this.registerManagers();
  }

  /**
   * 注册所有管理器工厂到注册表（懒加载优化）
   */
  private registerManagers(): void {
    // 注册管理器工厂而非实例，实现懒加载
    this.managerRegistry.registerFactory('messageHandler', () => new MessageHandler());
    this.managerRegistry.registerFactory('editorManager', () => new ClangFormatEditorManager());
    this.managerRegistry.registerFactory('previewManager', () => new PreviewEditorManager());
    this.managerRegistry.registerFactory('configActionManager', () => new ConfigActionManager());
    this.managerRegistry.registerFactory('placeholderManager', () => new PlaceholderWebviewManager());

    // DebounceIntegration 延迟依赖注入，避免循环依赖
    this.managerRegistry.registerFactory('debounceIntegration', () => {
      // 创建一个延迟依赖解析的DebounceIntegration
      return new DebounceIntegration(
        () => this.managerRegistry.getInstance<PreviewEditorManager>('previewManager')!,
        () => this.managerRegistry.getInstance<PlaceholderWebviewManager>('placeholderManager')!
      );
    });

    logger.info('All manager factories registered for lazy loading', {
      module: 'ClangFormatEditorCoordinator',
      operation: 'registerManagers',
      count: 6,
    });
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

      // 【修复】确保EditorManager被创建并初始化，然后直接调用其方法
      const editorManager = await this.managerRegistry.getOrCreateInstance<ClangFormatEditorManager>('editorManager');
      if (editorManager) {
        await editorManager.createOrShowEditor(source);
      } else {
        throw new Error('Failed to create EditorManager');
      }
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

    // 先初始化所有管理器
    await this.managerRegistry.initializeAll(context);

    // 然后设置事件监听器（确保管理器已经初始化）
    this.setupEventListeners();

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
    this.managerRegistry.dispose();
    this.configChangeService = null as any;
  }

  /**
   * 设置管理器之间的事件监听和响应（支持懒加载）
   */
  private setupEventListeners(): void {
    // 监听重新打开预览的请求
    this.eventBus.on('open-preview-requested', async () => {
      try {
        const debounceIntegration = await this.managerRegistry.getOrCreateInstance<DebounceIntegration>('debounceIntegration');
        const handler = debounceIntegration?.createDebouncedPreviewReopenHandler();
        if (handler) {
          await handler();
        } else {
          logger.error('Debounce integration handler not available', undefined, {
            module: 'ClangFormatEditorCoordinator',
            operation: 'open-preview-requested',
          });
        }
      } catch (error) {
        logger.error('Failed to get DebounceIntegration for preview reopen', error as Error, {
          module: 'ClangFormatEditorCoordinator',
          operation: 'open-preview-requested',
        });
      }
    });

    // 监听预览关闭事件
    this.eventBus.on('preview-closed', async () => {
      try {
        const debounceIntegration = await this.managerRegistry.getOrCreateInstance<DebounceIntegration>('debounceIntegration');
        const handler = debounceIntegration?.createDebouncedPreviewCloseHandler();
        if (handler) {
          handler();
        }
      } catch (error) {
        logger.error('Failed to get DebounceIntegration for preview close', error as Error, {
          module: 'ClangFormatEditorCoordinator',
          operation: 'preview-closed',
        });
      }
    });

    // Webview消息路由
    this.eventBus.on('webview-message-received', async (message) => {
      try {
        const messageHandler = await this.managerRegistry.getOrCreateInstance<MessageHandler>('messageHandler');
        messageHandler?.handleMessage(message);
      } catch (error) {
        logger.error('Failed to get MessageHandler for webview message', error as Error, {
          module: 'ClangFormatEditorCoordinator',
          operation: 'webview-message-received',
        });
      }
    });

    // 监听配置变化请求 - 使用新的配置变化服务
    this.eventBus.on(
      'config-change-requested',
      async (payload: { key: string; value: any }) => {
        if (process.env.CLOTHO_DEBUG === 'true') {
          logger.debug('Configuration change request received', { payload });
        }
        await this.configChangeService.handleConfigChange(payload);
      },
    );

    // 监听主编辑器关闭事件，联动关闭所有
    this.eventBus.on('editor-closed', () => {
      this.eventBus.emit('close-preview-requested');
    });

    // 主编辑器可见性变化事件会自动传播到所有监听器，无需在此处理

    // 监听 webview 完全准备就绪事件，自动打开预览
    this.eventBus.on('editor-fully-ready', async () => {
      this.eventBus.emit('open-preview-requested');
    });

    // 【新增】监听错误恢复的编辑器重试请求
    this.eventBus.on('retry-editor-creation-requested', async () => {
      try {
        logger.info('Retrying editor creation due to error recovery', {
          module: 'ClangFormatEditorCoordinator',
          operation: 'retry-editor-creation-requested',
        });
        await this.showEditor(EditorOpenSource.ERROR_RECOVERY);
      } catch (error) {
        logger.error('Failed to retry editor creation', error as Error, {
          module: 'ClangFormatEditorCoordinator',
          operation: 'retry-editor-creation-requested',
        });
      }
    });

    // 【移除】检测用户手动关闭预览标签页的逻辑
    // 这个逻辑已经在 PreviewManager 中更完善地处理了，包括区分程序隐藏和用户手动关闭
    // 移除这个重复的监听器，避免在程序隐藏时错误地触发 preview-closed 事件

    // 【修复】重新添加对配置更新的监听，以刷新预览
    this.eventBus.on(
      'config-updated-for-preview',
      ({ newConfig }: { newConfig: Record<string, any> }) => {
        // 通过注册表获取 previewManager 实例（懒加载）
        this.managerRegistry.getOrCreateInstance<PreviewEditorManager>('previewManager').then(previewManager => {
          if (previewManager) {
            previewManager.updatePreviewWithConfig(newConfig);
          } else {
            logger.warn('Preview manager not found', {
              module: 'ClangFormatEditorCoordinator',
              operation: 'config-updated-for-preview',
            });
          }
        }).catch(error => {
          logger.error('Failed to get PreviewManager for config update', error as Error, {
            module: 'ClangFormatEditorCoordinator',
            operation: 'config-updated-for-preview',
          });
        });
      },
    );

    // 【新增】微观预览请求处理
    this.eventBus.on(
      'micro-preview-requested',
      async ({ optionName, config, previewSnippet }: {
        optionName: string;
        config: Record<string, any>;
        previewSnippet: string;
      }) => {
        try {
          // 获取格式化服务
          const formatService = ClangFormatService.getInstance();

          // 格式化微观预览代码
          const formatResult = await formatService.format(previewSnippet, config);

          // 通过事件总线发送结果，让 placeholderManager 处理
          this.eventBus.emit('post-message-to-webview', {
            type: WebviewMessageType.UPDATE_MICRO_PREVIEW,
            payload: {
              optionName,
              formattedCode: formatResult.formattedCode,
              success: formatResult.success,
              error: formatResult.error
            }
          });
        } catch (error) {
          logger.error('Micro preview processing failed', error instanceof Error ? error : new Error(String(error)), {
            module: 'ClangFormatEditorCoordinator',
            operation: 'handleMicroPreview',
          });
          // 发送错误结果
          this.eventBus.emit('post-message-to-webview', {
            type: WebviewMessageType.UPDATE_MICRO_PREVIEW,
            payload: {
              optionName,
              formattedCode: previewSnippet,
              success: false,
              error: error instanceof Error ? error.message : '未知错误'
            }
          });
        }
      },
    );
  }

}
