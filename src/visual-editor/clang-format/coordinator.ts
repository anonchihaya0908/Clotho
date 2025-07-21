/**
 * Clang-Format Editor Coordinator
 * 管理 clang-format 图形化编辑器的业务逻辑
 */

import * as vscode from 'vscode';
import { ClangFormatService, FormatResult, ConfigValidationResult } from './format-service';
import { WebviewMessage, WebviewMessageType, ConfigCategories } from './types';
import { CLANG_FORMAT_OPTIONS, DEFAULT_CLANG_FORMAT_CONFIG, MACRO_PREVIEW_CODE } from './config-options';
import { ErrorHandler } from '../../common/error-handler';
import { COMMANDS } from '../../common/constants';

export class ClangFormatVisualEditorCoordinator implements vscode.Disposable {
    private panel: vscode.WebviewPanel | undefined;
    private formatService: ClangFormatService;
    private currentConfig: Record<string, any>;
    private readonly extensionUri: vscode.Uri;
    private readonly disposables: vscode.Disposable[] = [];

    constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
        this.formatService = new ClangFormatService();
        this.currentConfig = { ...DEFAULT_CLANG_FORMAT_CONFIG };

        // Register command
        this.disposables.push(
            vscode.commands.registerCommand(
                COMMANDS.OPEN_CLANG_FORMAT_EDITOR,
                () => this.showEditor()
            )
        );
    }

    /**
     * Dispose of all resources
     */
    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        if (this.panel) {
            this.panel.dispose();
        }
        // 不再需要cleanup，新的format服务不使用临时文件
    }

    /**
     * 显示 clang-format 编辑器
     */
    async showEditor(): Promise<void> {
        try {
            // 如果面板已存在，则聚焦
            if (this.panel) {
                this.panel.reveal(vscode.ViewColumn.One);
                return;
            }

            // 创建 webview 面板
            this.panel = vscode.window.createWebviewPanel(
                'clangFormatEditor',
                'Clang-Format Editor',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.joinPath(this.extensionUri, 'webviews')
                    ]
                }
            );

            // 设置图标
            this.panel.iconPath = {
                light: vscode.Uri.joinPath(this.extensionUri, 'resources', 'light', 'format.svg'),
                dark: vscode.Uri.joinPath(this.extensionUri, 'resources', 'dark', 'format.svg')
            };

            // 设置 HTML 内容
            this.panel.webview.html = await this.getWebviewContent();

            // 监听消息
            this.setupMessageHandling();

            // 监听面板销毁
            this.panel.onDidDispose(() => {
                this.panel = undefined;
                // 不再需要cleanup，新的format服务不使用临时文件
            });

            // 初始化编辑器
            await this.initializeEditor();

        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'showEditor',
                module: 'ClangFormatEditorCoordinator',
                showToUser: true,
                logLevel: 'error'
            });
        }
    }

    /**
     * 关闭编辑器
     */
    closeEditor(): void {
        if (this.panel) {
            this.panel.dispose();
        }
    }

    /**
     * 从工作区加载现有配置
     */
    async loadWorkspaceConfig(): Promise<void> {
        try {
            const configPath = this.formatService.getWorkspaceConfigPath();
            if (configPath) {
                this.currentConfig = await this.formatService.loadConfigFromFile(configPath);

                // 通知 webview 更新配置
                await this.sendMessage({
                    type: WebviewMessageType.CONFIG_LOADED,
                    payload: { config: this.currentConfig }
                });

                vscode.window.showInformationMessage('Workspace clang-format configuration loaded');
            } else {
                vscode.window.showInformationMessage('No .clang-format file found in workspace');
            }
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'loadWorkspaceConfig',
                module: 'ClangFormatEditorCoordinator',
                showToUser: true,
                logLevel: 'error'
            });
        }
    }

    // 私有方法

    private async initializeEditor(): Promise<void> {
        // 获取当前设置
        const config = vscode.workspace.getConfiguration('clotho.clangFormat');
        const showGuideButton = config.get<boolean>('showGuideButton', true);

        // 发送初始配置选项
        await this.sendMessage({
            type: WebviewMessageType.INITIALIZE,
            payload: {
                options: CLANG_FORMAT_OPTIONS,
                categories: Object.values(ConfigCategories),
                currentConfig: this.currentConfig,
                settings: { showGuideButton }
            }
        });

        // 生成初始预览
        await this.updatePreview();
    }

    private setupMessageHandling(): void {
        if (!this.panel) return;

        this.panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
            try {
                switch (message.type) {
                    case WebviewMessageType.CONFIG_CHANGED:
                        await this.handleConfigChange(message.payload);
                        break;

                    case WebviewMessageType.LOAD_WORKSPACE_CONFIG:
                        await this.loadWorkspaceConfig();
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

                    case WebviewMessageType.UPDATE_SETTINGS:
                        await this.handleUpdateSettings(message.payload);
                        break;

                    case WebviewMessageType.GET_MICRO_PREVIEW:
                        await this.handleGetMicroPreview(message.payload);
                        break;

                    default:
                        console.warn('Unknown message type:', message.type);
                }
            } catch (error) {
                ErrorHandler.handle(error, {
                    operation: 'handleWebviewMessage',
                    module: 'ClangFormatEditorCoordinator',
                    showToUser: true,
                    logLevel: 'error'
                });
            }
        });
    }

    private async handleConfigChange(payload: any): Promise<void> {
        const { key, value } = payload;

        // 更新当前配置
        if (value === 'inherit' || value === undefined || value === null) {
            // 如果值设为inherit或undefined，则从配置中移除该项，让其从基础风格继承
            delete this.currentConfig[key];
        } else {
            this.currentConfig[key] = value;
        }

        // 验证配置
        const validation = await this.formatService.validateConfig(this.currentConfig);
        if (!validation.isValid) {
            await this.sendMessage({
                type: WebviewMessageType.VALIDATION_ERROR,
                payload: { error: validation.error }
            });
            return;
        }

        // 更新预览
        await this.updatePreview(key);
    }

    private async handleSaveConfig(payload: any): Promise<void> {
        try {
            await this.formatService.applyConfigToWorkspace(this.currentConfig);

            await this.sendMessage({
                type: WebviewMessageType.CONFIG_SAVED,
                payload: { success: true }
            });
        } catch (error) {
            await this.sendMessage({
                type: WebviewMessageType.CONFIG_SAVED,
                payload: {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to save configuration'
                }
            });
        }
    }

    private async handleExportConfig(): Promise<void> {
        try {
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('.clang-format'),
                filters: {
                    'Clang-Format Config': ['clang-format'],
                    'YAML Files': ['yaml', 'yml'],
                    'All Files': ['*']
                }
            });

            if (saveUri) {
                await this.formatService.saveConfigToFile(this.currentConfig, saveUri.fsPath);
                vscode.window.showInformationMessage(`Configuration exported to ${saveUri.fsPath}`);
            }
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'exportConfig',
                module: 'ClangFormatEditorCoordinator',
                showToUser: true,
                logLevel: 'error'
            });
        }
    }

    private async handleImportConfig(): Promise<void> {
        try {
            const openUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'Clang-Format Config': ['clang-format'],
                    'YAML Files': ['yaml', 'yml'],
                    'All Files': ['*']
                }
            });

            if (openUri && openUri[0]) {
                const importedConfig = await this.formatService.loadConfigFromFile(openUri[0].fsPath);
                this.currentConfig = { ...DEFAULT_CLANG_FORMAT_CONFIG, ...importedConfig };

                await this.sendMessage({
                    type: WebviewMessageType.CONFIG_LOADED,
                    payload: { config: this.currentConfig }
                });

                await this.updatePreview();
                vscode.window.showInformationMessage(`Configuration imported from ${openUri[0].fsPath}`);
            }
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'importConfig',
                module: 'ClangFormatEditorCoordinator',
                showToUser: true,
                logLevel: 'error'
            });
        }
    }

    private async handleResetConfig(): Promise<void> {
        const choice = await vscode.window.showWarningMessage(
            'Reset configuration to default values?',
            { modal: true },
            'Reset',
            'Cancel'
        );

        if (choice === 'Reset') {
            this.currentConfig = { ...DEFAULT_CLANG_FORMAT_CONFIG };

            await this.sendMessage({
                type: WebviewMessageType.CONFIG_LOADED,
                payload: { config: this.currentConfig }
            });

            await this.updatePreview();
        }
    }

    private async handleValidateConfig(): Promise<void> {
        const validation = await this.formatService.validateConfig(this.currentConfig);

        await this.sendMessage({
            type: WebviewMessageType.VALIDATION_RESULT,
            payload: validation
        });
    }

    private async handleUpdateSettings(payload: any): Promise<void> {
        try {
            const { showGuideButton } = payload;

            if (typeof showGuideButton === 'boolean') {
                // 更新 VS Code 配置
                const config = vscode.workspace.getConfiguration('clotho.clangFormat');
                await config.update('showGuideButton', showGuideButton, vscode.ConfigurationTarget.Global);

                // 通知 webview 设置已更新
                await this.sendMessage({
                    type: WebviewMessageType.SETTINGS_UPDATED,
                    payload: { showGuideButton }
                });

                vscode.window.showInformationMessage('Settings updated successfully');
            }
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'updateSettings',
                module: 'ClangFormatEditorCoordinator',
                showToUser: true,
                logLevel: 'error'
            });
        }
    }

    /**
     * 处理动态微观预览请求 - 使用无文件的安全方案
     */
    private async handleGetMicroPreview(payload: any): Promise<void> {
        try {
            const { optionName, config, previewSnippet } = payload;

            if (!optionName || !previewSnippet) {
                throw new Error('Missing required parameters for micro preview');
            }

            // 使用新的统一format方法，直接传递配置对象
            const formatResult = await this.formatService.format(previewSnippet, config);

            // 发送格式化结果回前端
            await this.sendMessage({
                type: WebviewMessageType.UPDATE_MICRO_PREVIEW,
                payload: {
                    optionName,
                    formattedCode: formatResult.formattedCode,
                    success: formatResult.success,
                    error: formatResult.error
                }
            });

        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'handleGetMicroPreview',
                module: 'ClangFormatEditorCoordinator',
                showToUser: false,
                logLevel: 'error'
            });

            // 发送错误结果
            await this.sendMessage({
                type: WebviewMessageType.UPDATE_MICRO_PREVIEW,
                payload: {
                    optionName: payload?.optionName || 'unknown',
                    formattedCode: payload?.previewSnippet || '',
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to generate preview'
                }
            });
        }
    }

    private async updatePreview(changedKey?: string): Promise<void> {
        try {
            // 更新宏观预览 - 使用新的统一format方法
            const macroResult = await this.formatService.format(MACRO_PREVIEW_CODE, this.currentConfig);

            await this.sendMessage({
                type: WebviewMessageType.MACRO_PREVIEW_UPDATE,
                payload: {
                    formattedCode: macroResult.formattedCode,
                    success: macroResult.success,
                    error: macroResult.error
                }
            });

            // 如果有特定的配置项变更，更新对应的微观预览
            if (changedKey) {
                const option = CLANG_FORMAT_OPTIONS.find(opt => opt.key === changedKey);
                if (option && option.microPreviewCode) {
                    const microResult = await this.formatService.format(
                        option.microPreviewCode,
                        this.currentConfig
                    );

                    await this.sendMessage({
                        type: WebviewMessageType.MICRO_PREVIEW_UPDATE,
                        payload: {
                            key: changedKey,
                            formattedCode: microResult.formattedCode,
                            success: microResult.success,
                            error: microResult.error
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Failed to update preview:', error);
        }
    }

    private async sendMessage(message: WebviewMessage): Promise<void> {
        if (this.panel) {
            await this.panel.webview.postMessage(message);
        }
    }

    private async getWebviewContent(): Promise<string> {
        if (!this.panel) {
            throw new Error('Panel not initialized');
        }

        const webview = this.panel.webview;

        // 获取资源路径
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'webviews', 'visual-editor', 'clang-format', 'dist', 'index.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'webviews', 'visual-editor', 'clang-format', 'dist', 'index.css')
        );

        // 生成 HTML
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Clang-Format Editor</title>
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};">
            <link href="${styleUri}" rel="stylesheet">
            <style>
                /* 确保 VS Code 主题变量可用 */
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    font-weight: var(--vscode-font-weight);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    padding: 0;
                }
            </style>
        </head>
        <body>
            <div id="app"></div>
            <script src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}
