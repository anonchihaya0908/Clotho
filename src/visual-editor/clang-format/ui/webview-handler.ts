/**
 * Webview消息处理器
 * 专门处理来自webview的消息，分离消息处理逻辑
 */

import * as vscode from 'vscode';
import {
  WebviewMessage,
  WebviewMessageType,
} from '../../../common/types/index';
import { ClangFormatService } from '../format-service';
import { ErrorHandler } from '../../../common/error-handler';

/**
 * Webview消息处理器接口
 */
export interface WebviewMessageHandler {
  handleMessage(message: WebviewMessage): Promise<void>;
  sendMessage(message: WebviewMessage): Promise<void>;
}

/**
 * ClangFormat Webview消息处理器实现
 */
export class ClangFormatWebviewHandler implements WebviewMessageHandler {
  private formatService: ClangFormatService;
  private currentConfig: Record<string, any>;

  constructor(
    private panel: vscode.WebviewPanel,
    private instanceId: string,
    initialConfig: Record<string, any> = {},
  ) {
    this.formatService = new ClangFormatService();
    this.currentConfig = { ...initialConfig };

    // 设置消息监听
    this.setupMessageHandling();
  }

  /**
   * 处理来自webview的消息
   */
  async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      console.log(
        `WebviewHandler[${this.instanceId}]: Received message ${message.type}`,
      );

      switch (message.type) {
      case WebviewMessageType.CONFIG_CHANGED:
        await this.handleConfigChange(message.payload);
        break;

      case WebviewMessageType.SAVE_CONFIG:
        await this.handleSaveConfig(message.payload);
        break;

      case WebviewMessageType.EXPORT_CONFIG:
        await this.handleExportConfig();
        break;

      case WebviewMessageType.IMPORT_CONFIG:
        await this.handleImportConfig();
        break;

      case WebviewMessageType.RESET_CONFIG:
        await this.handleResetConfig();
        break;

      case WebviewMessageType.VALIDATE_CONFIG:
        await this.handleValidateConfig();
        break;

      case WebviewMessageType.GET_MICRO_PREVIEW:
        await this.handleGetMicroPreview(message.payload);
        break;

      case WebviewMessageType.UPDATE_SETTINGS:
        await this.handleUpdateSettings(message.payload);
        break;

      case WebviewMessageType.CONFIG_OPTION_HOVER:
        await this.handleConfigOptionHover(message.payload);
        break;

      case WebviewMessageType.CONFIG_OPTION_FOCUS:
        await this.handleConfigOptionFocus(message.payload);
        break;

      case WebviewMessageType.CLEAR_HIGHLIGHTS:
        await this.handleClearHighlights();
        break;

      default:
        console.warn(
          `WebviewHandler[${this.instanceId}]: Unknown message type: ${message.type}`,
        );
      }
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'handleWebviewMessage',
        module: 'ClangFormatWebviewHandler',
        showToUser: false,
        logLevel: 'error',
      });
    }
  }

  /**
   * 发送消息到webview
   */
  async sendMessage(message: WebviewMessage): Promise<void> {
    try {
      if (this.panel && !this.panel.disposed) {
        await this.panel.webview.postMessage({
          ...message,
          instanceId: this.instanceId,
        });
      }
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'sendWebviewMessage',
        module: 'ClangFormatWebviewHandler',
        showToUser: false,
        logLevel: 'error',
      });
    }
  }

  /**
   * 获取当前配置
   */
  getCurrentConfig(): Record<string, any> {
    return { ...this.currentConfig };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Record<string, any>): void {
    this.currentConfig = { ...config };
  }

  /**
   * 设置消息处理
   */
  private setupMessageHandling(): void {
    this.panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      await this.handleMessage(message);
    });
  }

  /**
   * 处理配置变更
   */
  private async handleConfigChange(payload: any): Promise<void> {
    const { key, value } = payload;
    this.currentConfig[key] = value;

    // 发送配置更新确认
    await this.sendMessage({
      type: WebviewMessageType.CONFIG_LOADED,
      payload: { config: this.currentConfig },
    });

    console.log(
      `WebviewHandler[${this.instanceId}]: Config updated - ${key}: ${value}`,
    );
  }

  /**
   * 处理保存配置
   */
  private async handleSaveConfig(payload: any): Promise<void> {
    try {
      await this.formatService.applyConfigToWorkspace(this.currentConfig);

      await this.sendMessage({
        type: WebviewMessageType.CONFIG_SAVED,
        payload: { success: true },
      });

      vscode.window.showInformationMessage('Configuration saved to workspace');
      console.log(`WebviewHandler[${this.instanceId}]: Configuration saved`);
    } catch (error) {
      await this.sendMessage({
        type: WebviewMessageType.CONFIG_SAVED,
        payload: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      ErrorHandler.handle(error, {
        operation: 'saveConfig',
        module: 'ClangFormatWebviewHandler',
        showToUser: true,
        logLevel: 'error',
      });
    }
  }

  /**
   * 处理导出配置
   */
  private async handleExportConfig(): Promise<void> {
    try {
      const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('.clang-format'),
        filters: {
          'Clang-Format Config': ['clang-format', 'yaml', 'yml'],
        },
      });

      if (saveUri) {
        const configContent = this.formatService.generateConfigFile(
          this.currentConfig,
        );
        await vscode.workspace.fs.writeFile(
          saveUri,
          Buffer.from(configContent, 'utf8'),
        );
        vscode.window.showInformationMessage(
          `Configuration exported to ${saveUri.fsPath}`,
        );
      }
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'exportConfig',
        module: 'ClangFormatWebviewHandler',
        showToUser: true,
        logLevel: 'error',
      });
    }
  }

  /**
   * 处理导入配置
   */
  private async handleImportConfig(): Promise<void> {
    try {
      const openUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectMany: false,
        filters: {
          'Clang-Format Config': ['clang-format', 'yaml', 'yml'],
        },
      });

      if (openUri && openUri[0]) {
        const importedConfig = await this.formatService.loadConfigFromFile(
          openUri[0].fsPath,
        );
        this.currentConfig = { ...importedConfig };

        await this.sendMessage({
          type: WebviewMessageType.CONFIG_LOADED,
          payload: { config: this.currentConfig },
        });

        vscode.window.showInformationMessage(
          'Configuration imported successfully',
        );
      }
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'importConfig',
        module: 'ClangFormatWebviewHandler',
        showToUser: true,
        logLevel: 'error',
      });
    }
  }

  /**
   * 处理重置配置
   */
  private async handleResetConfig(): Promise<void> {
    const choice = await vscode.window.showWarningMessage(
      'Reset configuration to default values?',
      'Reset',
      'Cancel',
    );

    if (choice === 'Reset') {
      // 重置到默认配置
      this.currentConfig = {};

      await this.sendMessage({
        type: WebviewMessageType.CONFIG_LOADED,
        payload: { config: this.currentConfig },
      });

      console.log(
        `WebviewHandler[${this.instanceId}]: Configuration reset to defaults`,
      );
    }
  }

  /**
   * 处理验证配置
   */
  private async handleValidateConfig(): Promise<void> {
    const validation = await this.formatService.validateConfig(
      this.currentConfig,
    );

    await this.sendMessage({
      type: validation.isValid
        ? WebviewMessageType.VALIDATION_RESULT
        : WebviewMessageType.VALIDATION_ERROR,
      payload: validation,
    });
  }

  /**
   * 处理微观预览请求
   */
  private async handleGetMicroPreview(payload: any): Promise<void> {
    try {
      const { optionName, config, previewSnippet } = payload;

      if (!optionName || !previewSnippet) {
        throw new Error('Missing required parameters for micro preview');
      }

      const result = await this.formatService.format(previewSnippet, config);

      await this.sendMessage({
        type: WebviewMessageType.UPDATE_MICRO_PREVIEW,
        payload: {
          formattedCode: result.formattedCode,
          success: result.success,
          error: result.error,
          key: optionName,
        },
      });
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'handleGetMicroPreview',
        module: 'ClangFormatWebviewHandler',
        showToUser: false,
        logLevel: 'error',
      });
    }
  }

  /**
   * 处理设置更新
   */
  private async handleUpdateSettings(payload: any): Promise<void> {
    try {
      const { showGuideButton } = payload;

      const config = vscode.workspace.getConfiguration('clotho.clangFormat');
      await config.update(
        'showGuideButton',
        showGuideButton,
        vscode.ConfigurationTarget.Workspace,
      );

      await this.sendMessage({
        type: WebviewMessageType.SETTINGS_UPDATED,
        payload: { showGuideButton },
      });
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'updateSettings',
        module: 'ClangFormatWebviewHandler',
        showToUser: false,
        logLevel: 'error',
      });
    }
  }

  /**
   * 处理配置项hover事件
   */
  private async handleConfigOptionHover(payload: {
    optionName: string;
  }): Promise<void> {
    // 这里可以实现hover时的高亮逻辑
    console.log(
      `WebviewHandler[${this.instanceId}]: Option hover - ${payload.optionName}`,
    );
  }

  /**
   * 处理配置项focus事件
   */
  private async handleConfigOptionFocus(payload: {
    optionName: string;
  }): Promise<void> {
    // 这里可以实现focus时的滚动逻辑
    console.log(
      `WebviewHandler[${this.instanceId}]: Option focus - ${payload.optionName}`,
    );
  }

  /**
   * 处理清除高亮
   */
  private async handleClearHighlights(): Promise<void> {
    // 这里可以实现清除高亮的逻辑
    console.log(`WebviewHandler[${this.instanceId}]: Clear highlights`);
  }
}
