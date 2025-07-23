import * as vscode from 'vscode';
import { EditorOpenSource, ManagerContext } from '../../common/types';
import { EventBus } from './messaging/event-bus';
import { EditorStateManager } from './state/editor-state-manager';
import { ErrorRecoveryManager } from './error/error-recovery-manager';
import { MessageHandler } from './messaging/message-handler';
import { ClangFormatEditorManager } from './core/editor-manager';
import { PreviewEditorManager } from './core/preview-manager';
import { ConfigActionManager } from './core/config-action-manager';
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
    private configActionManager: ConfigActionManager;

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
        this.configActionManager = new ConfigActionManager();

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

        // 监听配置变化请求
        this.eventBus.on('config-change-requested', async (payload: { key: string; value: any }) => {
            await this.handleConfigChange(payload);
        });

        // 监听主编辑器关闭事件，联动关闭所有
        this.eventBus.on('editor-closed', () => {
            this.eventBus.emit('close-preview-requested');
        });

        // 监听状态变化并打印日志
        this.eventBus.on('state-changed', (event) => {
            console.log(`[StateChange] Type: ${event.type}, Source: ${event.source}`);
        });

        // 监听 webview 完全准备就绪事件，自动打开预览
        this.eventBus.on('editor-fully-ready', async () => {
            console.log('🔔 Event: editor-fully-ready - opening preview');
            // 自动加载逻辑已移至 ConfigActionManager
            this.eventBus.emit('open-preview-requested');
        });

        // Webview 的消息现在由 MessageHandler 统一处理，它会把消息转换为 EventBus 上的具体事件
        // 其他 Manager (如 ConfigActionManager) 会监听这些具体事件并作出响应
    }

    /**
     * 处理配置变化请求
     */
    private async handleConfigChange(payload: { key: string; value: any }): Promise<void> {
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

            await this.stateManager.updateState({
                currentConfig: newConfig,
                configDirty: true
            }, 'config-changed');

            // 通知webview配置已更新
            this.eventBus.emit('post-message-to-webview', {
                type: WebviewMessageType.CONFIG_LOADED,
                payload: { config: newConfig }
            });

            // 通知预览更新
            this.eventBus.emit('config-updated-for-preview', { newConfig });

        } catch (error: any) {
            await this.errorRecovery.handleError('config-change-failed', error, { payload });
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
} 