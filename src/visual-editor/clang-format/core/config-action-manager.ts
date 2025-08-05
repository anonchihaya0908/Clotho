import * as vscode from 'vscode';
import {
  BaseManager,
  ManagerContext,
  ManagerStatus,
} from '../../../common/types';
import { logger } from '../../../common/logger';
import { UI_CONSTANTS } from '../../../common/constants';
import { WebviewMessageType } from '../../../common/types/clang-format-shared';
import { DEFAULT_CLANG_FORMAT_CONFIG } from '../data/clang-format-options-database';
import { ClangFormatService } from '../format-service';

/**
 * 负责处理所有与用户配置操作相关的业务逻辑，
 * 例如加载、保存、导入、导出、重置等。
 */
export class ConfigActionManager implements BaseManager {
  readonly name = 'ConfigActionManager';

  private context!: ManagerContext;
  private formatService: ClangFormatService;

  constructor() {
    // 由于 ClangFormatService 的构造函数是私有的，这里应通过其提供的静态方法获取实例
    this.formatService = ClangFormatService.getInstance();
    logger.debug('ConfigActionManager constructed', {
      module: 'ConfigActionManager',
      operation: 'constructor'
    });
  }

  async initialize(context: ManagerContext): Promise<void> {
    this.context = context;
    this.setupEventListeners();
    logger.info('ConfigActionManager initialized', {
      module: 'ConfigActionManager',
      operation: 'initialize'
    });
  }

  dispose(): void {
    // No complex resources to dispose for now
  }

  getStatus(): ManagerStatus {
    return {
      isInitialized: !!this.context,
      isHealthy: true,
      lastActivity: new Date(),
      errorCount: 0,
    };
  }

  /**
   * 在事件总线上注册所有动作处理器
   */
  private setupEventListeners(): void {
    const eventBus = this.context.eventBus;

    // 监听UI的动作请求
    eventBus.on('load-workspace-config-requested', () =>
      this.handleLoadWorkspaceConfig(),
    );
    eventBus.on('save-config-requested', () => this.handleSaveConfig());
    eventBus.on('import-config-requested', () => this.handleImportConfig());
    eventBus.on('export-config-requested', () => this.handleExportConfig());
    eventBus.on('reset-config-requested', () => this.handleResetConfig());
    eventBus.on('open-clang-format-file-requested', () =>
      this.handleOpenClangFormatFile(),
    );

    // 监听生命周期事件以触发自动加载
    eventBus.on('editor-fully-ready', () => this.autoLoadWorkspaceConfig());
  }

  // --- 配置操作处理方法 ---

  /**
   * 如果工作区存在 .clang-format 文件，则自动静默加载。
   */
  private async autoLoadWorkspaceConfig(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return; // 没有打开工作区，静默处理
    }
    const fileUri = vscode.Uri.joinPath(
      workspaceFolders[0].uri,
      '.clang-format',
    );

    try {
      await vscode.workspace.fs.stat(fileUri);
      logger.info('Found .clang-format file in workspace, auto-loading', {
        module: 'ConfigActionManager',
        operation: 'autoLoadWorkspaceConfig',
        fileUri: fileUri.toString()
      });
      await this.loadConfigFromFile(fileUri, true); // 传递 silent=true 表示自动加载
    } catch (error) {
      // 文件不存在，静默处理
      logger.debug('.clang-format file not found in workspace. Using default settings', {
        module: 'ConfigActionManager',
        operation: 'autoLoadWorkspaceConfig'
      });
    }
  }

  private async getWorkspaceClangFormatUri(): Promise<vscode.Uri | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage(
        'Please open a workspace to manage .clang-format files.',
      );
      return undefined;
    }
    return vscode.Uri.joinPath(workspaceFolders[0].uri, '.clang-format');
  }

  private async loadConfigFromFile(fileUri: vscode.Uri, silent: boolean = false): Promise<void> {
    try {
      const fileContentBytes = await vscode.workspace.fs.readFile(fileUri);
      const fileContent = Buffer.from(fileContentBytes).toString('utf-8');
      const newConfig = this.formatService.parse(fileContent);
      await this.updateConfigState(newConfig, 'config-loaded-from-file');
      
      if (!silent) {
        // 手动加载时显示信息弹窗
        vscode.window.showInformationMessage(
          `Configuration loaded from ${vscode.workspace.asRelativePath(fileUri)}.`,
        );
      } else {
        // 自动加载时仅在状态栏显示轻量提示
        const fileName = vscode.workspace.asRelativePath(fileUri);
        vscode.window.setStatusBarMessage(
          ` Auto-loaded ${fileName}`,
          UI_CONSTANTS.NOTIFICATION_DISPLAY_TIME // Use centralized notification display time
        );
      }
    } catch (error: any) {
      await this.context.errorRecovery.handleError(
        'config-load-failed',
        error,
        { file: fileUri.toString() },
      );
      
      if (!silent) {
        // 只有非静默模式下才显示错误弹窗
        vscode.window.showErrorMessage(
          `Failed to read or parse configuration file: ${error.message}`,
        );
      } else {
        // 自动加载失败时仅记录日志，不打扰用户
        logger.warn('Auto-load failed, using default configuration', {
          module: 'ConfigActionManager',
          operation: 'loadConfigFromFile',
          error: error.message
        });
      }
    }
  }

  private async writeConfigToFile(fileUri: vscode.Uri): Promise<void> {
    try {
      const currentConfig = this.context.stateManager.getState().currentConfig;
      const fileContent = this.formatService.stringify(currentConfig);
      await vscode.workspace.fs.writeFile(
        fileUri,
        Buffer.from(fileContent, 'utf-8'),
      );
      await this.context.stateManager.updateState(
        { configDirty: false },
        'config-saved',
      );
      vscode.window.showInformationMessage(
        `Configuration saved to ${vscode.workspace.asRelativePath(fileUri)}.`,
      );
    } catch (error: any) {
      await this.context.errorRecovery.handleError(
        'config-save-failed',
        error,
        { file: fileUri.toString() },
      );
      vscode.window.showErrorMessage(
        `Failed to save configuration file: ${error.message}`,
      );
    }
  }

  private async handleLoadWorkspaceConfig(): Promise<void> {
    const fileUri = await this.getWorkspaceClangFormatUri();
    if (fileUri) {
      await this.loadConfigFromFile(fileUri);
    }
  }

  private async handleSaveConfig(): Promise<void> {
    const fileUri = await this.getWorkspaceClangFormatUri();
    if (fileUri) {
      await this.writeConfigToFile(fileUri);
    }
  }

  private async handleImportConfig(): Promise<void> {
    const options: vscode.OpenDialogOptions = {
      canSelectMany: false,
      openLabel: 'Import',
      filters: { 'Clang-Format Config': ['clang-format', ''] },
    };
    const fileUris = await vscode.window.showOpenDialog(options);
    if (fileUris && fileUris.length > 0) {
      await this.loadConfigFromFile(fileUris[0]);
    }
  }

  private async handleExportConfig(): Promise<void> {
    const options: vscode.SaveDialogOptions = {
      saveLabel: 'Export',
      defaultUri: await this.getWorkspaceClangFormatUri(),
    };
    const fileUri = await vscode.window.showSaveDialog(options);
    if (fileUri) {
      await this.writeConfigToFile(fileUri);
    }
  }

  private async handleResetConfig(): Promise<void> {
    await this.updateConfigState(DEFAULT_CLANG_FORMAT_CONFIG, 'config-reset');
    vscode.window.showInformationMessage(
      'Configuration has been reset to default.',
    );
  }

  private async handleOpenClangFormatFile(): Promise<void> {
    const fileUri = await this.getWorkspaceClangFormatUri();
    if (!fileUri) { return; }

    try {
      await vscode.workspace.fs.stat(fileUri);
    } catch (error) {
      const result = await vscode.window.showInformationMessage(
        '.clang-format file not found. Do you want to create it with the current configuration?',
        'Yes',
        'No',
      );
      if (result === 'Yes') {
        await this.writeConfigToFile(fileUri);
      } else {
        return;
      }
    }

    await vscode.window.showTextDocument(fileUri);
  }

  private async updateConfigState(
    newConfig: Record<string, any>,
    source: string,
  ): Promise<void> {
    await this.context.stateManager.updateState(
      { currentConfig: newConfig, configDirty: source !== 'config-saved' },
      source,
    );
    this.context.eventBus.emit('post-message-to-webview', {
      type: WebviewMessageType.CONFIG_LOADED,
      payload: { config: newConfig },
    });
    // 注意：不再发送 'config-updated-for-preview' 事件
    // 该事件现在由 ConfigChangeService 统一处理，避免重复调用
  }
}
