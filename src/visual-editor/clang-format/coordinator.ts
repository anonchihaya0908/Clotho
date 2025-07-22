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
import { ClangFormatPreviewProvider } from './preview-provider';

/**
 * 编辑器打开来源
 * 用于实现"从哪里来，回哪里去"的智能导航
 */
export enum EditorOpenSource {
    COMMAND_PALETTE = 'commandPalette',   // 来自命令面板（用户正在编辑代码）
    CODELENS = 'codeLens',               // 来自.clang-format文件的CodeLens
    STATUS_BAR = 'statusBar',            // 来自状态栏点击
    DIRECT = 'direct'                    // 直接调用（默认）
}

export class ClangFormatVisualEditorCoordinator implements vscode.Disposable {
    private panel: vscode.WebviewPanel | undefined;
    private formatService: ClangFormatService;
    private currentConfig: Record<string, any>;
    private readonly extensionUri: vscode.Uri;
    private readonly disposables: vscode.Disposable[] = [];
    private editorOpenSource: EditorOpenSource | undefined; // 记住用户来源

    // 新增：预览相关的成员
    private previewProvider: ClangFormatPreviewProvider;
    private currentPreviewUri: vscode.Uri | undefined;
    private previewEditor: vscode.TextEditor | undefined;

    // 新增：装饰器，用于实现上下文高亮联动
    private highlightDecorationType: vscode.TextEditorDecorationType;

    constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
        this.formatService = new ClangFormatService();
        this.currentConfig = { ...DEFAULT_CLANG_FORMAT_CONFIG };

        // 初始化预览提供者
        this.previewProvider = ClangFormatPreviewProvider.getInstance();

        // 创建上下文高亮装饰器
        this.highlightDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.hoverHighlightBackground'),
            border: '1px solid',
            borderColor: new vscode.ThemeColor('focusBorder'),
            borderRadius: '3px',
            isWholeLine: false
        });

        // Register command
        this.disposables.push(
            vscode.commands.registerCommand(
                COMMANDS.OPEN_CLANG_FORMAT_EDITOR,
                (source?: EditorOpenSource) => this.showEditor(source || EditorOpenSource.COMMAND_PALETTE)
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
        // 清理装饰器
        if (this.highlightDecorationType) {
            this.highlightDecorationType.dispose();
        }
        // 清理预览编辑器
        this.cleanupPreviewEditor();
    }

    /**
     * 显示 clang-format 编辑器
     * @param source 编辑器打开来源，用于实现智能导航
     */
    async showEditor(source: EditorOpenSource = EditorOpenSource.DIRECT): Promise<void> {
        // 记录用户来源
        this.editorOpenSource = source;

        try {
            // 如果面板已存在，则聚焦
            if (this.panel && this.currentPreviewUri) {
                this.panel.reveal(vscode.ViewColumn.One);
                // 同时聚焦预览编辑器
                if (this.previewEditor) {
                    await vscode.window.showTextDocument(this.previewEditor.document, {
                        viewColumn: vscode.ViewColumn.Beside,
                        preserveFocus: true
                    });
                }
                return;
            }

            // 创建 webview 面板（左侧控制面板）
            this.panel = vscode.window.createWebviewPanel(
                'clangFormatEditor',
                'Clang-Format Editor',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        // 授权整个 webviews 目录，确保资源能访问所有必要的资源
                        vscode.Uri.joinPath(this.extensionUri, 'webviews'),
                        // 特别授权 dist 目录
                        vscode.Uri.joinPath(this.extensionUri, 'webviews', 'visual-editor', 'clang-format', 'dist')
                    ]
                }
            );

            // 设置图标
            this.panel.iconPath = {
                light: vscode.Uri.joinPath(this.extensionUri, 'resources', 'light', 'format.svg'),
                dark: vscode.Uri.joinPath(this.extensionUri, 'resources', 'dark', 'format.svg')
            };

            // 创建虚拟预览文档（右侧真正的编辑器）
            this.currentPreviewUri = this.previewProvider.createPreviewUri('macro-preview.cpp');

            // 设置初始预览内容
            const initialPreviewCode = await this.generateInitialPreview();
            this.previewProvider.updateContent(this.currentPreviewUri, initialPreviewCode);

            // 设置 HTML 内容（现在只是左侧控制面板，不再包含预览）
            this.panel.webview.html = await this.getWebviewContent();

            // 在Webview旁边打开真正的编辑器预览
            this.previewEditor = await vscode.window.showTextDocument(this.currentPreviewUri, {
                viewColumn: vscode.ViewColumn.Beside,
                preserveFocus: true, // 保持焦点在Webview上
                preview: false // 确保这不是预览模式，避免被其他文档替换
            });

            // 监听消息
            this.setupMessageHandling();

            // 监听面板销毁
            this.panel.onDidDispose(async () => {
                // 【智能导航：从哪里来，回哪里去】
                await this.handleSmartNavigation();

                this.panel = undefined;
                // 【核心修正】当Webview关闭时，自动关闭关联的预览编辑器
                await this.closePreviewEditor();
                // 清理预览编辑器资源
                this.cleanupPreviewEditor();
                // 清理来源记忆
                this.editorOpenSource = undefined;
            });

            // 监听主题变化并通知 Webview
            this.disposables.push(
                vscode.window.onDidChangeActiveColorTheme(theme => {
                    const isDarkTheme = theme.kind === vscode.ColorThemeKind.Dark ||
                        theme.kind === vscode.ColorThemeKind.HighContrast;

                    console.log('🎨 Theme Changed:', {
                        name: theme.kind,
                        isDark: isDarkTheme,
                        themeKind: vscode.ColorThemeKind[theme.kind]
                    });

                    // 通知 Webview 主题已变化
                    if (this.panel) {
                        this.panel.webview.postMessage({
                            command: 'themeChanged',
                            theme: isDarkTheme ? 'dark' : 'light',
                            kind: vscode.ColorThemeKind[theme.kind],
                            isDark: isDarkTheme
                        });
                    }
                })
            );

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
        // 注意：这里不需要调用cleanupPreviewEditor，因为onDidDispose会处理
    }

    /**
     * 智能导航处理：根据用户来源决定关闭后的导航行为
     * 实现"从哪里来，回哪里去"的用户体验
     */
    private async handleSmartNavigation(): Promise<void> {
        if (!this.editorOpenSource) {
            return; // 没有记录来源，使用默认行为
        }

        try {
            switch (this.editorOpenSource) {
                case EditorOpenSource.CODELENS:
                    // 用户从.clang-format文件的CodeLens来的，应该回到.clang-format文件
                    await this.navigateToClangFormatFile();
                    console.log('🎯 Clotho: User came from CodeLens, navigated back to .clang-format file');
                    break;

                case EditorOpenSource.COMMAND_PALETTE:
                    // 用户从命令面板来的（很可能正在编辑代码文件）
                    // VSCode会自动将焦点返回到之前的编辑器，我们什么都不做
                    console.log('🎯 Clotho: User came from command palette, letting VSCode handle focus restoration');
                    break;

                case EditorOpenSource.STATUS_BAR:
                    // 从状态栏来的，保持默认行为
                    console.log('🎯 Clotho: User came from status bar, using default behavior');
                    break;

                case EditorOpenSource.DIRECT:
                default:
                    // 直接调用或未知来源，保持默认行为
                    console.log('🎯 Clotho: Direct call or unknown source, using default behavior');
                    break;
            }
        } catch (error) {
            // 导航失败时，不应该影响编辑器的正常关闭
            console.warn('⚠️ Smart navigation failed:', error);
        }
    }

    /**
     * 导航到.clang-format文件
     */
    private async navigateToClangFormatFile(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return;
        }

        try {
            const clangFormatUri = vscode.Uri.joinPath(workspaceFolder.uri, '.clang-format');

            // 检查文件是否存在
            try {
                await vscode.workspace.fs.stat(clangFormatUri);
            } catch {
                // 文件不存在，不进行导航
                console.log('🎯 .clang-format file not found, skipping navigation');
                return;
            }

            // 打开.clang-format文件
            await vscode.window.showTextDocument(clangFormatUri, {
                viewColumn: vscode.ViewColumn.One,
                preserveFocus: false
            });
        } catch (error) {
            console.warn('⚠️ Failed to navigate to .clang-format file:', error);
        }
    }

    /**
     * 自动关闭关联的预览编辑器
     * 实现真正的"生命周期绑定"
     */
    private async closePreviewEditor(): Promise<void> {
        if (!this.currentPreviewUri) {
            return;
        }

        try {
            // 方法1：使用tabGroups API找到所有相关的标签页（VSCode 1.57+）
            if (vscode.window.tabGroups) {
                for (const tabGroup of vscode.window.tabGroups.all) {
                    for (const tab of tabGroup.tabs) {
                        if (tab.input && typeof tab.input === 'object' && 'uri' in tab.input) {
                            const tabUri = (tab.input as any).uri;
                            if (tabUri && tabUri.toString() === this.currentPreviewUri.toString()) {
                                // 关闭这个标签页
                                await vscode.window.tabGroups.close(tab);
                                console.log('🔗 Clotho: Preview tab closed automatically');
                            }
                        }
                    }
                }
            } else {
                // 方法2：回退方案 - 使用传统方法
                const allEditors = [...vscode.window.visibleTextEditors, ...vscode.workspace.textDocuments
                    .map(doc => vscode.window.visibleTextEditors.find(editor => editor.document === doc))
                    .filter(editor => editor !== undefined)] as vscode.TextEditor[];

                const previewEditors = allEditors.filter(
                    editor => editor.document.uri.toString() === this.currentPreviewUri!.toString()
                );

                // 逐个关闭这些编辑器
                for (const editor of previewEditors) {
                    // 先让这个编辑器成为活动编辑器
                    await vscode.window.showTextDocument(editor.document, {
                        viewColumn: editor.viewColumn,
                        preserveFocus: false
                    });

                    // 然后关闭当前活动的编辑器
                    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                }
            }

            console.log('🔗 Clotho: Preview editor closed automatically with webview');
        } catch (error) {
            console.warn('⚠️ Clotho: Failed to auto-close preview editor:', error);
            // 即使关闭失败，也要继续清理资源
        }
    }

    /**
     * 生成初始预览代码
     */
    private async generateInitialPreview(): Promise<string> {
        try {
            const result = await this.formatService.format(MACRO_PREVIEW_CODE, this.currentConfig);
            return result.success ? result.formattedCode : MACRO_PREVIEW_CODE;
        } catch (error) {
            console.warn('Failed to generate initial preview, using default code:', error);
            return MACRO_PREVIEW_CODE;
        }
    }

    /**
     * 清理预览编辑器资源
     */
    private cleanupPreviewEditor(): void {
        if (this.currentPreviewUri) {
            // 清理预览提供者中的内容
            this.previewProvider.clearContent(this.currentPreviewUri);
            this.currentPreviewUri = undefined;
        }
        this.previewEditor = undefined;
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

        // 【新增】尝试自动加载工作区配置
        try {
            const configPath = this.formatService.getWorkspaceConfigPath();
            if (configPath) {
                console.log('📁 Clotho: Found workspace .clang-format file, loading automatically...');
                this.currentConfig = await this.formatService.loadConfigFromFile(configPath);
                vscode.window.showInformationMessage('已自动加载工作区的 .clang-format 配置文件');
            } else {
                console.log('📁 Clotho: No workspace .clang-format file found, using default config');
                // 使用默认配置
                this.currentConfig = { ...DEFAULT_CLANG_FORMAT_CONFIG };
            }
        } catch (error) {
            console.error('❌ Clotho: Failed to auto-load workspace config:', error);
            ErrorHandler.handle(error, {
                operation: 'autoLoadWorkspaceConfig',
                module: 'ClangFormatEditorCoordinator',
                showToUser: false, // 不向用户显示错误，因为这是自动尝试
                logLevel: 'warn'
            });
            // 如果自动加载失败，使用默认配置
            this.currentConfig = { ...DEFAULT_CLANG_FORMAT_CONFIG };
        }

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

                    case WebviewMessageType.OPEN_CLANG_FORMAT_FILE:
                        await this.handleOpenClangFormatFile();
                        break;

                    case WebviewMessageType.UPDATE_SETTINGS:
                        await this.handleUpdateSettings(message.payload);
                        break;

                    case WebviewMessageType.GET_MICRO_PREVIEW:
                        await this.handleGetMicroPreview(message.payload);
                        break;

                    case WebviewMessageType.GET_MACRO_PREVIEW:
                        // 【已弃用】不再需要处理宏观预览请求，因为我们现在使用虚拟编辑器
                        // 虚拟编辑器会在配置变更时自动更新
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

    private async handleOpenClangFormatFile(): Promise<void> {
        try {
            // 获取当前工作区根目录
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder is open. Please open a workspace to access .clang-format file.');
                return;
            }

            // 构建 .clang-format 文件路径
            const clangFormatFilePath = vscode.Uri.joinPath(workspaceFolder.uri, '.clang-format');

            try {
                // 尝试打开现有的 .clang-format 文件
                await vscode.workspace.fs.stat(clangFormatFilePath);
                const document = await vscode.workspace.openTextDocument(clangFormatFilePath);
                await vscode.window.showTextDocument(document);
            } catch (error) {
                // 文件不存在，询问用户是否创建
                const choice = await vscode.window.showInformationMessage(
                    'No .clang-format file found in workspace. Would you like to create one?',
                    'Create',
                    'Cancel'
                );

                if (choice === 'Create') {
                    // 创建基本的 .clang-format 文件
                    const basicConfig = this.generateBasicClangFormatConfig();
                    await vscode.workspace.fs.writeFile(
                        clangFormatFilePath,
                        Buffer.from(basicConfig, 'utf8')
                    );

                    const document = await vscode.workspace.openTextDocument(clangFormatFilePath);
                    await vscode.window.showTextDocument(document);

                    vscode.window.showInformationMessage('.clang-format file created successfully!');
                }
            }
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'openClangFormatFile',
                module: 'ClangFormatEditorCoordinator',
                showToUser: true,
                logLevel: 'error'
            });
        }
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

    /**
     * 处理配置项hover事件 - 实现上下文高亮联动
     */
    private async handleConfigOptionHover(payload: { optionName: string }): Promise<void> {
        if (!this.previewEditor || !payload.optionName) {
            return;
        }

        // 清除之前的高亮
        this.previewEditor.setDecorations(this.highlightDecorationType, []);

        // 根据配置项类型，找到相关的代码行进行高亮
        const ranges = this.getRelevantCodeRanges(payload.optionName);
        if (ranges.length > 0) {
            this.previewEditor.setDecorations(this.highlightDecorationType, ranges);
        }
    }

    /**
     * 处理配置项focus事件 - 自动滚动到相关代码
     */
    private async handleConfigOptionFocus(payload: { optionName: string }): Promise<void> {
        if (!this.previewEditor || !payload.optionName) {
            return;
        }

        // 先执行hover高亮
        await this.handleConfigOptionHover(payload);

        // 然后滚动到第一个相关的代码行
        const ranges = this.getRelevantCodeRanges(payload.optionName);
        if (ranges.length > 0) {
            const firstRange = ranges[0];
            this.previewEditor.revealRange(firstRange, vscode.TextEditorRevealType.InCenter);
        }
    }

    /**
     * 清除所有高亮
     */
    private async handleClearHighlights(): Promise<void> {
        if (this.previewEditor) {
            this.previewEditor.setDecorations(this.highlightDecorationType, []);
        }
    }

    /**
     * 根据配置项名称，获取相关的代码范围
     * 这个方法包含了关于哪些配置项影响哪些代码部分的"领域知识"
     */
    private getRelevantCodeRanges(optionName: string): vscode.Range[] {
        if (!this.previewEditor) {
            return [];
        }

        const document = this.previewEditor.document;
        const ranges: vscode.Range[] = [];

        // 根据不同的配置项，智能识别相关的代码模式
        switch (optionName) {
            case 'IndentWidth':
            case 'TabWidth':
            case 'UseTab':
                // 缩进相关：高亮所有有缩进的行
                for (let i = 0; i < document.lineCount; i++) {
                    const line = document.lineAt(i);
                    if (line.text.match(/^[\s\t]+\S/)) { // 以空格或tab开头，后面跟非空字符
                        ranges.push(new vscode.Range(i, 0, i, line.firstNonWhitespaceCharacterIndex));
                    }
                }
                break;

            case 'BreakBeforeBraces':
            case 'Cpp11BracedListStyle':
                // 大括号相关：高亮所有大括号
                for (let i = 0; i < document.lineCount; i++) {
                    const line = document.lineAt(i);
                    const braceMatches = line.text.matchAll(/[{}]/g);
                    for (const match of braceMatches) {
                        if (match.index !== undefined) {
                            ranges.push(new vscode.Range(i, match.index, i, match.index + 1));
                        }
                    }
                }
                break;

            case 'PointerAlignment':
            case 'ReferenceAlignment':
                // 指针/引用对齐：高亮指针和引用符号
                for (let i = 0; i < document.lineCount; i++) {
                    const line = document.lineAt(i);
                    const pointerMatches = line.text.matchAll(/[*&]/g);
                    for (const match of pointerMatches) {
                        if (match.index !== undefined) {
                            ranges.push(new vscode.Range(i, match.index, i, match.index + 1));
                        }
                    }
                }
                break;

            case 'SpaceBeforeParens':
            case 'SpacesInParentheses':
                // 括号空格：高亮所有括号
                for (let i = 0; i < document.lineCount; i++) {
                    const line = document.lineAt(i);
                    const parenMatches = line.text.matchAll(/[()]/g);
                    for (const match of parenMatches) {
                        if (match.index !== undefined) {
                            ranges.push(new vscode.Range(i, match.index, i, match.index + 1));
                        }
                    }
                }
                break;

            case 'ColumnLimit':
                // 列限制：高亮超长的行
                for (let i = 0; i < document.lineCount; i++) {
                    const line = document.lineAt(i);
                    if (line.text.length > 80) { // 假设80为常见的列限制
                        ranges.push(new vscode.Range(i, 80, i, line.text.length));
                    }
                }
                break;

            case 'AlignConsecutiveAssignments':
                // 连续赋值对齐：高亮赋值符号
                for (let i = 0; i < document.lineCount; i++) {
                    const line = document.lineAt(i);
                    const assignMatch = line.text.match(/=/);
                    if (assignMatch && assignMatch.index !== undefined) {
                        ranges.push(new vscode.Range(i, assignMatch.index, i, assignMatch.index + 1));
                    }
                }
                break;

            case 'SortIncludes':
                // include排序：高亮所有include语句
                for (let i = 0; i < document.lineCount; i++) {
                    const line = document.lineAt(i);
                    if (line.text.includes('#include')) {
                        ranges.push(new vscode.Range(i, 0, i, line.text.length));
                    }
                }
                break;

            default:
                // 对于未特殊处理的选项，不进行高亮
                break;
        }

        return ranges;
    }

    private async updatePreview(changedKey?: string): Promise<void> {
        try {
            // 【核心变更】不再向Webview发送宏观预览，而是直接更新虚拟编辑器
            const macroResult = await this.formatService.format(MACRO_PREVIEW_CODE, this.currentConfig);

            if (this.currentPreviewUri && macroResult.success) {
                // 直接更新虚拟编辑器的内容！
                this.previewProvider.updateContent(this.currentPreviewUri, macroResult.formattedCode);
            }

            // 如果有特定的配置项变更，仍然需要更新微观预览（这个还是发送给Webview的）
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
        const extensionUri = this.extensionUri;

        // 【核心】检测当前VSCode的主题是亮色还是暗色
        const currentTheme = vscode.window.activeColorTheme;
        const isDarkTheme = currentTheme.kind === vscode.ColorThemeKind.Dark ||
            currentTheme.kind === vscode.ColorThemeKind.HighContrast;

        console.log('🎨 VS Code Theme Detection:', {
            name: currentTheme.kind,
            isDark: isDarkTheme,
            themeKind: vscode.ColorThemeKind[currentTheme.kind]
        });

        // 1. 【核心】定义所有需要从本地加载的资源的URI
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'webviews', 'visual-editor', 'clang-format', 'dist', 'index.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'webviews', 'visual-editor', 'clang-format', 'dist', 'index.css')
        );

        // 确保 highlight.js 能访问其所需的所有资源
        const webviewResourceRoot = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'webviews', 'visual-editor', 'clang-format', 'dist')
        );

        const nonce = this.getNonce();

        // 2. 【核心】构建一个更完善的、允许动态加载的内容安全策略
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            
            <!--
              Content Security Policy (CSP) - The Ultimate Version
              This is the key to allowing modern highlighters like highlight.js to work.
            -->
            <meta http-equiv="Content-Security-Policy" content="
                default-src 'none';
                style-src   ${webview.cspSource} 'nonce-${nonce}';
                script-src  'nonce-${nonce}';
                img-src     ${webview.cspSource} https: data:;
                font-src    ${webview.cspSource};
                worker-src  ${webview.cspSource};
                connect-src ${webview.cspSource};
            ">

            <link href="${styleUri}" rel="stylesheet">
            <title>Clang-Format Editor</title>
            
            <style nonce="${nonce}">
                /* Base styles to prevent flash of unstyled content */
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
        <body data-vscode-theme="${isDarkTheme ? 'dark' : 'light'}" data-vscode-theme-name="${currentTheme.kind}">
            <!-- 【核心】将当前主题信息，通过data属性，直接嵌入到body上 -->
            <div id="app"></div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
            
            <script nonce="${nonce}">
                // 主题信息传递给前端
                window.vscodeTheme = {
                    isDark: ${isDarkTheme},
                    kind: '${vscode.ColorThemeKind[currentTheme.kind]}',
                    name: '${currentTheme.kind}'
                };
                
                console.log('🎨 Webview Theme Info:', window.vscodeTheme);
            </script>
        </body>
        </html>`;
    }

    /**
     * 生成基本的 .clang-format 配置文件内容
     */
    private generateBasicClangFormatConfig(): string {
        return `# Clang-Format Configuration File
# Generated by Clotho VS Code Extension

# Base style to inherit from
BasedOnStyle: LLVM

# Indentation settings
IndentWidth: 4
TabWidth: 4
UseTab: Never

# Column limit
ColumnLimit: 100

# Brace settings
BreakBeforeBraces: Attach

# Pointer alignment
PointerAlignment: Left

# Space settings
SpaceBeforeParens: ControlStatements
SpacesInParentheses: false
SpacesInSquareBrackets: false

# Alignment settings
AlignConsecutiveAssignments: false
AlignConsecutiveDeclarations: false
AlignTrailingComments: true

# Other settings
SortIncludes: CaseSensitive
FixNamespaceComments: true
`;
    }

    /**
     * 生成随机nonce用于CSP安全
     */
    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
