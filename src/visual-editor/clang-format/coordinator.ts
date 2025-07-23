import * as vscode from 'vscode';
import { EditorOpenSource, ManagerContext } from '../../common/types';
import { EventBus } from './messaging/event-bus';
import { EditorStateManager } from './state/editor-state-manager';
import { ErrorRecoveryManager } from './error/error-recovery-manager';
import { MessageHandler } from './messaging/message-handler';
import { ClangFormatEditorManager } from './core/editor-manager';
import { PreviewEditorManager } from './core/preview-manager';
import { ClangFormatService } from './format-service';
import { DEFAULT_CLANG_FORMAT_CONFIG } from './config-options';
import { WebviewMessageType } from '../../common/types/webview';
/**
 * 重构后的轻量级主协调器
 * 只负责初始化和协调各个管理器，不包含具体的业务逻辑
 */
export class ClangFormatEditorCoordinator implements vscode.Disposable {
    private eventBus: EventBus;
    private stateManager: EditorStateManager;
    private errorRecovery: ErrorRecoveryManager;
    private messageHandler: MessageHandler;
    private editorManager: ClangFormatEditorManager;
    private previewManager: PreviewEditorManager;
    private formatService: ClangFormatService;

    private disposables: vscode.Disposable[] = [];
    private isInitialized = false;

    constructor(private extensionUri: vscode.Uri) {
        // 1. 初始化核心服务
        this.eventBus = new EventBus();
        this.stateManager = new EditorStateManager(this.eventBus);
        this.errorRecovery = new ErrorRecoveryManager(this.stateManager, this.eventBus);

        // 2. 初始化管理器
        this.messageHandler = new MessageHandler();
        this.editorManager = new ClangFormatEditorManager();
        this.previewManager = new PreviewEditorManager();
        this.formatService = new ClangFormatService();

        // 3. 设置事件监听
        this.setupEventListeners();

        // 4. 注册VS Code命令
        this.registerCommands();
    }

    /**
     * 显示编辑器的主入口点
     */
    async showEditor(source: EditorOpenSource = EditorOpenSource.DIRECT): Promise<void> {
        try {
            // 确保只初始化一次
            if (!this.isInitialized) {
                const context: ManagerContext = {
                    extensionUri: this.extensionUri,
                    stateManager: this.stateManager,
                    errorRecovery: this.errorRecovery,
                    eventBus: this.eventBus,
                };
                await this.initializeManagers(context);
                this.isInitialized = true;
            }

            // 触发事件来创建编辑器
            this.eventBus.emit('create-editor-requested', source);
            // 移除这里的预览打开请求，改由 'editor-fully-ready' 事件触发

        } catch (error: any) {
            await this.errorRecovery.handleError('coordinator-startup-failed', error);
        }
    }

    /**
     * 统一的资源清理
     */
    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.eventBus.dispose();
        this.stateManager.dispose();
        this.errorRecovery.dispose();
        this.messageHandler.dispose();
        this.editorManager.dispose();
        this.previewManager.dispose();
        console.log('ClangFormatEditorCoordinator disposed.');
    }

    /**
     * 设置管理器之间的事件监听和响应
     */
    private setupEventListeners(): void {
        // Webview消息路由
        this.eventBus.on('webview-message-received', (message) => {
            this.messageHandler.handleMessage(message);
        });

        // 监听主编辑器关闭事件，联动关闭所有
        this.eventBus.on('editor-closed', () => {
            this.eventBus.emit('close-preview-requested');
        });

        // 监听状态变化并打印日志
        this.eventBus.on('state-changed', (event) => {
            console.log(`[StateChange] Type: ${event.type}, Source: ${event.source}`);
        });

        // 监听 webview 完全准备就绪事件，自动加载配置并打开预览
        this.eventBus.on('editor-fully-ready', async () => {
            console.log('🔔 Event: editor-fully-ready - automatically loading workspace config and opening preview');
            await this.autoLoadWorkspaceConfig();
            this.eventBus.emit('open-preview-requested');
        });

        // 监听并处理来自Webview的配置操作请求
        this.eventBus.on('load-workspace-config-requested', () => this.handleLoadWorkspaceConfig());
        this.eventBus.on('save-config-requested', () => this.handleSaveConfig());
        this.eventBus.on('import-config-requested', () => this.handleImportConfig());
        this.eventBus.on('export-config-requested', () => this.handleExportConfig());
        this.eventBus.on('reset-config-requested', () => this.handleResetConfig());
        this.eventBus.on('open-clang-format-file-requested', () => this.handleOpenClangFormatFile());

        // 监听配置变更请求
        this.eventBus.on('config-change-requested', (payload) => this.handleConfigChange(payload));
    }

    /**
     * 初始化所有管理器
     */
    private async initializeManagers(context: ManagerContext): Promise<void> {
        const managers = [
            this.messageHandler,
            this.editorManager,
            this.previewManager,
        ];

        for (const manager of managers) {
            try {
                await manager.initialize(context);
            } catch (error: any) {
                console.error(`Failed to initialize manager: ${manager.name}`, error);
                throw error;
            }
        }
        console.log('All managers initialized.');
    }

    /**
     * 注册需要在VS Code中使用的命令
     */
    private registerCommands(): void {
        const showCommand = vscode.commands.registerCommand('clotho.showClangFormatEditor', () => {
            this.showEditor(EditorOpenSource.COMMAND);
        });
        this.disposables.push(showCommand);
    }

    /**
     * 如果工作区存在 .clang-format 文件，则自动静默加载。
     */
    private async autoLoadWorkspaceConfig(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            // 没有打开工作区，静默失败
            return;
        }
        const fileUri = vscode.Uri.joinPath(workspaceFolders[0].uri, '.clang-format');

        try {
            // 检查文件是否存在
            await vscode.workspace.fs.stat(fileUri);
            // 文件存在，执行加载
            console.log('Found .clang-format file in workspace, auto-loading...');
            await this.loadConfigFromFile(fileUri);
        } catch (error) {
            // 文件不存在，这是一个正常情况，使用默认配置即可，静默处理
            console.log('.clang-format file not found in workspace. Using default settings.');
        }
    }

    // --- 配置操作处理方法 ---

    /**
     * 处理来自 WebView 的配置变更请求
     */
    private async handleConfigChange(payload: any): Promise<void> {
        const { key, value } = payload;
        const currentState = this.stateManager.getState();
        const newConfig = { ...currentState.currentConfig };

        if (value === 'inherit' || value === undefined || value === null) {
            delete newConfig[key];
        } else {
            newConfig[key] = value;
        }

        console.log(`🔄 Config changed: ${key} = ${value}`);
        await this.updateConfigState(newConfig, 'config-changed');
    }

    /**
     * 获取工作区根目录的 .clang-format 文件 URI
     */
    private async getWorkspaceClangFormatUri(): Promise<vscode.Uri | undefined> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showWarningMessage('Please open a workspace to manage .clang-format files.');
            return undefined;
        }
        // 默认使用第一个工作区
        const workspaceRoot = workspaceFolders[0].uri;
        return vscode.Uri.joinPath(workspaceRoot, '.clang-format');
    }

    /**
     * 从文件加载配置并更新状态和Webview
     */
    private async loadConfigFromFile(fileUri: vscode.Uri): Promise<void> {
        try {
            const fileContentBytes = await vscode.workspace.fs.readFile(fileUri);
            const fileContent = Buffer.from(fileContentBytes).toString('utf-8');
            const newConfig = this.formatService.parse(fileContent);
            await this.updateConfigState(newConfig, 'config-loaded-from-file');
            vscode.window.showInformationMessage(`Configuration loaded from ${vscode.workspace.asRelativePath(fileUri)}.`);
        } catch (error: any) {
            await this.errorRecovery.handleError('config-load-failed', error, { file: fileUri.toString() });
            vscode.window.showErrorMessage(`Failed to read or parse configuration file: ${error.message}`);
        }
    }

    /**
     * 将当前配置写入文件
     */
    private async writeConfigToFile(fileUri: vscode.Uri): Promise<void> {
        try {
            const currentConfig = this.stateManager.getState().currentConfig;
            console.log('Clotho-Debug: Attempting to save config:', JSON.stringify(currentConfig, null, 2));

            const fileContent = this.formatService.stringify(currentConfig);
            console.log('Clotho-Debug: Stringified file content to write:\n---\n' + fileContent + '\n---');

            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(fileContent, 'utf-8'));
            await this.stateManager.updateState({ configDirty: false }, 'config-saved');
            vscode.window.showInformationMessage(`Configuration saved to ${vscode.workspace.asRelativePath(fileUri)}.`);
        } catch (error: any) {
            console.error('Clotho-Debug: Error during writeConfigToFile:', error);
            await this.errorRecovery.handleError('config-save-failed', error, { file: fileUri.toString() });
            vscode.window.showErrorMessage(`Failed to save configuration file: ${error.message}`);
        }
    }

    /**
     * 处理 "Load" 按钮点击
     */
    private async handleLoadWorkspaceConfig(): Promise<void> {
        const fileUri = await this.getWorkspaceClangFormatUri();
        if (fileUri) {
            await this.loadConfigFromFile(fileUri);
        }
    }

    /**
     * 处理 "Save" 按钮点击
     */
    private async handleSaveConfig(): Promise<void> {
        const fileUri = await this.getWorkspaceClangFormatUri();
        console.log(`Clotho-Debug: handleSaveConfig triggered. Target URI: ${fileUri?.toString()}`);
        if (fileUri) {
            await this.writeConfigToFile(fileUri);
        }
    }

    /**
     * 处理 "Import" 按钮点击
     */
    private async handleImportConfig(): Promise<void> {
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            openLabel: 'Import',
            filters: {
                'Clang-Format Config': ['clang-format', ''],
            }
        };

        const fileUris = await vscode.window.showOpenDialog(options);
        if (fileUris && fileUris.length > 0) {
            await this.loadConfigFromFile(fileUris[0]);
        }
    }

    /**
     * 处理 "Export" 按钮点击
     */
    private async handleExportConfig(): Promise<void> {
        const options: vscode.SaveDialogOptions = {
            saveLabel: 'Export',
            defaultUri: await this.getWorkspaceClangFormatUri()
        };

        const fileUri = await vscode.window.showSaveDialog(options);
        if (fileUri) {
            await this.writeConfigToFile(fileUri);
        }
    }

    /**
     * 处理 "Reset" 按钮点击
     */
    private async handleResetConfig(): Promise<void> {
        await this.updateConfigState(DEFAULT_CLANG_FORMAT_CONFIG, 'config-reset');
        vscode.window.showInformationMessage('Configuration has been reset to default.');
    }

    /**
     * 处理 "Edit as Text" 按钮点击
     */
    private async handleOpenClangFormatFile(): Promise<void> {
        const fileUri = await this.getWorkspaceClangFormatUri();
        if (!fileUri) return;

        try {
            // 检查文件是否存在
            await vscode.workspace.fs.stat(fileUri);
        } catch (error) {
            // 文件不存在，先创建
            const result = await vscode.window.showInformationMessage(
                '.clang-format file not found. Do you want to create it with the current configuration?',
                'Yes', 'No'
            );
            if (result === 'Yes') {
                await this.writeConfigToFile(fileUri);
            } else {
                return;
            }
        }

        // 打开文件
        await vscode.window.showTextDocument(fileUri);
    }

    /**
     * 更新配置状态并通知Webview
     */
    private async updateConfigState(newConfig: Record<string, any>, source: string): Promise<void> {
        // 1. 更新核心状态
        await this.stateManager.updateState(
            { currentConfig: newConfig, configDirty: source !== 'config-saved' },
            source
        );
        // 2. 通知Webview更新其UI
        this.eventBus.emit('post-message-to-webview', {
            type: WebviewMessageType.CONFIG_LOADED,
            payload: { config: newConfig }
        });
        // 3. 同时触发预览更新
        this.eventBus.emit('config-updated-for-preview', { newConfig });
    }
} 