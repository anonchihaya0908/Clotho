import * as vscode from 'vscode';
import { UI_CONSTANTS } from '../../../common/constants';
import { createModuleLogger } from '../../../common/logger/unified-logger';
import {
  BaseManager,
  ManagerContext,
  ManagerStatus,
} from '../../../common/types';
import { WebviewMessageType } from '../../../common/types/clang-format-shared';
import { DEFAULT_CLANG_FORMAT_CONFIG } from '../data/clang-format-options-database';
import { EventBus } from '../messaging/event-bus';
import { onTyped, emitTyped } from '../messaging/typed-event-bus';
import { ClangFormatService } from '../format-service';
import { getStateOrDefault } from '../types/state';
import { BoundedHistory } from '../../../common/utils/memory';

/**
 * 负责处理所有与用户配置操作相关的业务逻辑，
 * 例如加载、保存、导入、导出、重置等。
 */
export class ConfigActionManager implements BaseManager {
  private readonly logger = createModuleLogger('ConfigActionManager');

  readonly name = 'ConfigActionManager';

  private context!: ManagerContext;
  private formatService: ClangFormatService;
  private disposables: vscode.Disposable[] = [];
  private configHistory = new BoundedHistory<import('../../../common/types/clang-format-shared').ClangFormatConfig>(20);

  constructor() {
    // 由于 ClangFormatService 的构造函数是私有的，这里应通过其提供的静态方法获取实例
    this.formatService = ClangFormatService.getInstance();
    this.logger.debug('ConfigActionManager constructed', {
      module: 'ConfigActionManager',
      operation: 'constructor'
    });
  }

  async initialize(context: ManagerContext): Promise<void> {
    this.context = context;
    this.setupEventListeners();
    this.logger.info('ConfigActionManager initialized', {
      module: 'ConfigActionManager',
      operation: 'initialize'
    });
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables.length = 0;
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
    const eventBus = this.context.eventBus as unknown as EventBus | undefined;
    if (!eventBus) {
      return;
    }

    // 监听UI的动作请求
    onTyped(eventBus, 'load-workspace-config-requested', () => { void this.handleLoadWorkspaceConfig(); });
    onTyped(eventBus, 'save-config-requested', () => { void this.handleSaveConfig(); });
    onTyped(eventBus, 'import-config-requested', () => { void this.handleImportConfig(); });
    onTyped(eventBus, 'export-config-requested', () => { void this.handleExportConfig(); });
    onTyped(eventBus, 'reset-config-requested', () => { void this.handleResetConfig(); });
    onTyped(eventBus, 'open-clang-format-file-requested', () => { void this.handleOpenClangFormatFile(); });

    // 监听生命周期事件以触发自动加载
    onTyped(eventBus, 'editor-fully-ready', () => { void this.autoLoadWorkspaceConfig(); });

    // 显式保存触发：当用户保存 .clang-format 文件时，解析并应用到状态
    const saveListener = vscode.workspace.onDidSaveTextDocument(async (doc) => {
      try {
        const base = (doc.uri.path.split('/')?.pop() || '').toLowerCase();
        if (base === '.clang-format' || base === '_clang-format') {
          const content = doc.getText();
          const newConfig = this.formatService.parse(content) as unknown as import('../../../common/types/clang-format-shared').ClangFormatConfig;
          await this.updateConfigState(newConfig, 'config-loaded-from-file');
          await this.validateAndPublish(newConfig as unknown as Record<string, unknown>, 'editor-save');
          this.logger.info('Applied configuration from saved .clang-format', { module: 'ConfigActionManager', operation: 'onDidSaveTextDocument' });
        }
      } catch (error) {
        this.logger.error('Failed to apply configuration from saved .clang-format', error as Error, { module: 'ConfigActionManager', operation: 'onDidSaveTextDocument' });
      }
    });
    this.disposables.push(saveListener);

    // 文本模式（M3）
    onTyped(eventBus, 'request-text-config', () => { void this.handleRequestTextConfig(); });
    onTyped(eventBus, 'apply-text-config-requested', ({ content }) => { void this.handleApplyTextConfig(content); });
  }

  // --- 配置操作处理方法 ---

  /**
   * 如果工作区存在 .clang-format 文件，则自动静默加载。
   */
  private async autoLoadWorkspaceConfig(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      this.logger.info('No workspace folder found, using default clang-format settings', {
        module: 'ConfigActionManager',
        operation: 'autoLoadWorkspaceConfig'
      });
      return; // 没有打开工作区，静默处理
    }
    if (!workspaceFolders[0]) {
      throw new Error('No workspace folder found');
    }
    const fileUri = vscode.Uri.joinPath(
      workspaceFolders[0].uri,
      '.clang-format',
    );

    try {
      await vscode.workspace.fs.stat(fileUri);
      this.logger.info('Found .clang-format file in workspace, auto-loading configuration', {
        module: 'ConfigActionManager',
        operation: 'autoLoadWorkspaceConfig',
        fileUri: fileUri.toString(),
        workspaceRoot: workspaceFolders[0].uri.fsPath
      });
      await this.loadConfigFromFile(fileUri, true); // 传递 silent=true 表示自动加载
    } catch {
      // 文件不存在，记录详细信息但静默处理
      this.logger.info('.clang-format file not found in workspace, using default settings', {
        module: 'ConfigActionManager',
        operation: 'autoLoadWorkspaceConfig',
        workspaceRoot: workspaceFolders[0].uri.fsPath,
        expectedPath: fileUri.fsPath,
        message: 'This is normal if no .clang-format file exists in the project'
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
    if (!workspaceFolders[0]) {
      return undefined;
    }
    return vscode.Uri.joinPath(workspaceFolders[0].uri, '.clang-format');
  }

  private async loadConfigFromFile(fileUri: vscode.Uri, silent: boolean = false): Promise<void> {
    try {
      const fileContentBytes = await vscode.workspace.fs.readFile(fileUri);
      const fileContent = Buffer.from(fileContentBytes).toString('utf-8');
      const newConfig = this.formatService.parse(fileContent) as unknown as import('../../../common/types/clang-format-shared').ClangFormatConfig;
      await this.updateConfigState(newConfig, 'config-loaded-from-file');
      await this.validateAndPublish(newConfig as unknown as Record<string, unknown>, 'config-loaded-from-file');

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
    } catch (error: unknown) {
      // Unified error handling through errorRecovery
      if (this.context.errorRecovery) {
        await this.context.errorRecovery.handleError(
          'config-load-failed',
          error as Error,
          {
            file: fileUri.toString(),
            silent: silent // Pass silent flag to control user notification
          },
        );
      } else {
        // Fallback: only show error if errorRecovery is unavailable
        if (!silent) {
          vscode.window.showErrorMessage(
            `Failed to read or parse configuration file: ${(error as Error).message || 'Unknown error'}`,
          );
        }
      }

      // Always log for debugging, even in silent mode
      if (silent) {
        this.logger.warn('Auto-load failed, using default configuration', {
          module: 'ConfigActionManager',
          operation: 'loadConfigFromFile',
          error: (error as Error).message || 'Unknown error'
        });
      }
    }
  }

  private async writeConfigToFile(fileUri: vscode.Uri): Promise<void> {
    try {
      if (!this.context.stateManager) {
        throw new Error('StateManager is not available');
      }
      const currentConfig = getStateOrDefault(this.context.stateManager.getState()).currentConfig;
      const fileContent = this.formatService.stringify(currentConfig as Record<string, unknown>);
      await vscode.workspace.fs.writeFile(
        fileUri,
        Buffer.from(fileContent, 'utf-8'),
      );
      if (this.context.stateManager) {
        await this.context.stateManager.updateState(
          { configDirty: false },
          'config-saved',
        );
      }
      await this.validateAndPublish(currentConfig as unknown as Record<string, unknown>, 'config-saved');
      this.configHistory.push(currentConfig as unknown as import('../../../common/types/clang-format-shared').ClangFormatConfig);
      vscode.window.showInformationMessage(
        `Configuration saved to ${vscode.workspace.asRelativePath(fileUri)}.`,
      );
    } catch (error: unknown) {
      // Unified error handling through errorRecovery
      if (this.context.errorRecovery) {
        await this.context.errorRecovery.handleError(
          'config-save-failed',
          error as Error,
          { file: fileUri.toString() },
        );
      } else {
        // Fallback: only show error if errorRecovery is unavailable
        vscode.window.showErrorMessage(
          `Failed to save configuration file: ${(error as Error).message || 'Unknown error'}`,
        );
      }
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
      // 覆盖确认
      try {
        await vscode.workspace.fs.stat(fileUri);
        const confirm = await vscode.window.showWarningMessage('Overwrite existing .clang-format in workspace?', { modal: true }, 'Overwrite', 'Cancel');
        if (confirm !== 'Overwrite') { return; }
      } catch { /* file not exists */ }
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
      const firstFile = fileUris[0];
      if (firstFile) {
        await this.loadConfigFromFile(firstFile);
      }
    }
  }

  private async handleExportConfig(): Promise<void> {
    const defaultUri = await this.getWorkspaceClangFormatUri();
    const options: vscode.SaveDialogOptions = {
      saveLabel: 'Export',
      ...(defaultUri && { defaultUri }),
    };
    const fileUri = await vscode.window.showSaveDialog(options);
    if (fileUri) {
      await this.writeConfigToFile(fileUri);
    }
  }

  private async handleResetConfig(): Promise<void> {
    await this.updateConfigState(
      DEFAULT_CLANG_FORMAT_CONFIG as unknown as import('../../../common/types/clang-format-shared').ClangFormatConfig,
      'config-reset'
    );
    vscode.window.showInformationMessage(
      'Configuration has been reset to default.',
    );
  }

  private async handleOpenClangFormatFile(): Promise<void> {
    const fileUri = await this.getWorkspaceClangFormatUri();
    if (!fileUri) { return; }

    try {
      await vscode.workspace.fs.stat(fileUri);
    } catch {
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

  // ====== Validation and utilities ======
  private async validateAndPublish(config: Record<string, unknown>, source: string): Promise<void> {
    try {
      const result = await this.formatService.validateConfig(config);
      if (this.context.eventBus) {
        emitTyped(this.context.eventBus as unknown as EventBus, 'post-message-to-webview', {
          type: WebviewMessageType.VALIDATION_RESULT,
          payload: { isValid: !!result.isValid, errors: result.errors ?? [] },
        });
      }
      const msg = result.isValid ? 'Clang-Format configuration is valid.' : `Configuration has errors: ${result.errors?.[0] ?? 'Unknown error'}`;
      vscode.window.setStatusBarMessage(`Validate (${source}): ${msg}`, UI_CONSTANTS.NOTIFICATION_DISPLAY_TIME);
      if (!result.isValid) {
        vscode.window.showWarningMessage('Clang-Format configuration validation failed. See status bar for details.');
      }
    } catch (error) {
      if (this.context.eventBus) {
        emitTyped(this.context.eventBus as unknown as EventBus, 'post-message-to-webview', {
          type: WebviewMessageType.VALIDATION_RESULT,
          payload: { isValid: false, errors: [error instanceof Error ? error.message : 'Unknown error'] },
        });
      }
      vscode.window.showErrorMessage(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Exposed operations for command handlers
  public async validateCurrentConfigCommand(): Promise<void> {
    const state = getStateOrDefault(this.context.stateManager?.getState());
    await this.validateAndPublish(state.currentConfig as unknown as Record<string, unknown>, 'manual-validate');
  }

  public async rollbackToLastSavedCommand(): Promise<void> {
    const last = this.configHistory.pop();
    if (!last) {
      vscode.window.showInformationMessage('No saved configuration snapshot to rollback.');
      return;
    }
    await this.updateConfigState(last, 'rollback-to-last-saved');
    await this.validateAndPublish(last as unknown as Record<string, unknown>, 'rollback-to-last-saved');
    vscode.window.showInformationMessage('Rolled back to last saved configuration.');
  }

  public async applyActiveTextToPreviewCommand(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor. Open .clang-format to apply text.');
      return;
    }
    const base = (editor.document.uri.path.split('/')?.pop() || '').toLowerCase();
    if (base !== '.clang-format' && base !== '_clang-format') {
      vscode.window.showWarningMessage('Active document is not a .clang-format file.');
      return;
    }
    try {
      const content = editor.document.getText();
      const parsed = this.formatService.parse(content) as unknown as import('../../../common/types/clang-format-shared').ClangFormatConfig;
      await this.validateAndPublish(parsed as unknown as Record<string, unknown>, 'apply-text-to-preview');
      // 仅更新预览，不落库
      if (this.context.eventBus) {
        emitTyped(this.context.eventBus as unknown as EventBus, 'config-updated-for-preview', { newConfig: parsed });
      }
      vscode.window.setStatusBarMessage('Applied current .clang-format text to preview (dry run).', UI_CONSTANTS.NOTIFICATION_DISPLAY_TIME);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to apply text to preview: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  // ====== M3: Text Mode ======
  private async handleRequestTextConfig(): Promise<void> {
    try {
      if (!this.context.stateManager || !this.context.eventBus) { return; }
      const state = getStateOrDefault(this.context.stateManager.getState());
      const currentConfig = (state.currentConfig ?? {}) as unknown as Record<string, unknown>;
      const content = this.formatService.stringify(currentConfig);
      emitTyped(this.context.eventBus as unknown as EventBus, 'post-message-to-webview', {
        type: WebviewMessageType.TEXT_CONFIG_RESPONSE,
        payload: { content },
      });
    } catch (error) {
      this.logger.error('Failed to stringify current config', error as Error, {
        module: 'ConfigActionManager',
        operation: 'handleRequestTextConfig',
      });
      if (this.context.eventBus) {
        emitTyped(this.context.eventBus as unknown as EventBus, 'post-message-to-webview', {
          type: WebviewMessageType.TEXT_CONFIG_RESPONSE,
          payload: { content: '# Error: failed to generate YAML from current config' },
        });
      }
    }
  }

  private async handleApplyTextConfig(content: string): Promise<void> {
    try {
      // 1) Parse YAML-like content
      const parsed = this.formatService.parse(content) as unknown as import('../../../common/types/clang-format-shared').ClangFormatConfig;

      // 2) Validate by attempting a format pass
      const validation = await this.formatService.validateConfig(parsed as unknown as Record<string, unknown>);
      if (!validation.isValid) {
        if (this.context.eventBus) {
          emitTyped(this.context.eventBus as unknown as EventBus, 'post-message-to-webview', {
            type: WebviewMessageType.APPLY_TEXT_CONFIG_RESULT,
            payload: { success: false, errors: validation.errors ?? ['Invalid configuration'] },
          });
        }
        return;
      }

      // 3) Apply to state (and mark dirty)
      await this.updateConfigState(parsed, 'text-config-applied');
      if (this.context.eventBus) {
        emitTyped(this.context.eventBus as unknown as EventBus, 'post-message-to-webview', {
          type: WebviewMessageType.APPLY_TEXT_CONFIG_RESULT,
          payload: { success: true },
        });
      }
    } catch (error) {
      this.logger.error('Failed to apply text config', error as Error, {
        module: 'ConfigActionManager',
        operation: 'handleApplyTextConfig',
      });
      if (this.context.eventBus) {
        emitTyped(this.context.eventBus as unknown as EventBus, 'post-message-to-webview', {
          type: WebviewMessageType.APPLY_TEXT_CONFIG_RESULT,
          payload: { success: false, errors: [error instanceof Error ? error.message : 'Unknown error'] },
        });
      }
    }
  }

  private async updateConfigState(
    newConfig: import('../../../common/types/clang-format-shared').ClangFormatConfig,
    source: string,
  ): Promise<void> {
    if (this.context.stateManager) {
      await this.context.stateManager.updateState(
        { currentConfig: newConfig, configDirty: source !== 'config-saved' },
        source,
      );
    }
    if (this.context.eventBus) {
      emitTyped(this.context.eventBus as unknown as EventBus, 'post-message-to-webview', {
        type: WebviewMessageType.CONFIG_LOADED,
        payload: { config: newConfig },
      });
    }
    // 注意：不再发送 'config-updated-for-preview' 事件
    // 该事件现在由 ConfigChangeService 统一处理，避免重复调用
  }
}
