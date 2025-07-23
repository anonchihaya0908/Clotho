/**
 * ClangFormat编辑器实例管理器
 * 专门管理ClangFormat可视化编辑器实例
 */

import * as vscode from 'vscode';
import { BaseInstanceManager, Disposable } from '../../../common/services/instance-manager';
import { ErrorHandler } from '../../../common/error-handler';
import { EditorState, InstanceState } from '../../../common/types/index';

/**
 * ClangFormat编辑器实例接口
 */
export interface ClangFormatEditorInstance extends Disposable {
    readonly id: string;
    readonly panel: vscode.WebviewPanel;
    readonly state: EditorState;

    initialize(): Promise<void>;
    sendMessage(message: any): Promise<void>;
    handleMessage(message: any): Promise<void>;
    focus(): void;
    isVisible(): boolean;
}

/**
 * ClangFormat编辑器实例状态
 */
export interface ClangFormatInstanceState extends InstanceState {
    lastActivity: Date;
    isInitialized: boolean;
}

/**
 * ClangFormat专用实例管理器
 */
export class ClangFormatInstanceManager extends BaseInstanceManager<ClangFormatEditorInstance> {
    private instanceStates = new Map<string, ClangFormatInstanceState>();
    private readonly extensionUri: vscode.Uri;

    constructor(extensionUri: vscode.Uri) {
        super({
            maxInstances: 5, // 限制最多5个编辑器实例
            autoCleanup: true,
            cleanupInterval: 300000 // 5分钟清理一次
        });
        this.extensionUri = extensionUri;
    }

    /**
     * 创建新的编辑器实例
     */
    createEditor(workspaceFolder?: vscode.WorkspaceFolder): ClangFormatEditorInstance {
        const id = this.generateInstanceId(workspaceFolder);

        return this.create(id, () => {
            const instance = new ClangFormatEditorInstanceImpl(id, this.extensionUri, workspaceFolder);

            // 初始化实例状态
            this.instanceStates.set(id, {
                id,
                editorState: {
                    config: {},
                    isPreviewOpen: true,
                    isDirty: false
                },
                panelState: {
                    isVisible: false,
                    viewColumn: vscode.ViewColumn.One
                },
                lastActivity: new Date(),
                isInitialized: false
            });

            return instance;
        });
    }

    /**
     * 获取实例状态
     */
    getInstanceState(id: string): ClangFormatInstanceState | undefined {
        return this.instanceStates.get(id);
    }

    /**
     * 更新实例状态
     */
    updateInstanceState(id: string, updates: Partial<ClangFormatInstanceState>): void {
        const currentState = this.instanceStates.get(id);
        if (currentState) {
            this.instanceStates.set(id, {
                ...currentState,
                ...updates,
                lastActivity: new Date()
            });
        }
    }

    /**
     * 获取活跃的实例
     */
    getActiveInstances(): ClangFormatEditorInstance[] {
        const activeInstances: ClangFormatEditorInstance[] = [];

        for (const [id, instance] of this.getAll()) {
            if (instance.isVisible()) {
                activeInstances.push(instance);
            }
        }

        return activeInstances;
    }

    /**
     * 聚焦到指定工作区的编辑器
     */
    focusWorkspaceEditor(workspaceFolder?: vscode.WorkspaceFolder): boolean {
        const targetId = this.generateInstanceId(workspaceFolder);
        const instance = this.get(targetId);

        if (instance) {
            instance.focus();
            this.updateInstanceState(targetId, { lastActivity: new Date() });
            return true;
        }

        return false;
    }

    /**
     * 生成实例ID
     */
    private generateInstanceId(workspaceFolder?: vscode.WorkspaceFolder): string {
        if (workspaceFolder) {
            return `clang-format-${workspaceFolder.name}`;
        }
        return `clang-format-${Date.now()}`;
    }

    /**
     * 执行清理操作
     */
    protected performCleanup(): void {
        super.performCleanup();

        const now = new Date();
        const inactiveThreshold = 30 * 60 * 1000; // 30分钟

        for (const [id, state] of this.instanceStates) {
            const instance = this.get(id);

            // 清理不可见且长时间未活动的实例
            if (instance && !instance.isVisible() &&
                (now.getTime() - state.lastActivity.getTime()) > inactiveThreshold) {

                console.log(`ClangFormatInstanceManager: Cleaning up inactive instance ${id}`);
                this.destroy(id);
            }
        }
    }

    /**
     * 销毁实例时清理状态
     */
    destroy(id: string): boolean {
        const result = super.destroy(id);
        if (result) {
            this.instanceStates.delete(id);
        }
        return result;
    }

    /**
     * 销毁所有实例时清理状态
     */
    destroyAll(): void {
        super.destroyAll();
        this.instanceStates.clear();
    }
}

/**
 * ClangFormat编辑器实例实现
 */
class ClangFormatEditorInstanceImpl implements ClangFormatEditorInstance {
    public readonly panel: vscode.WebviewPanel;
    public readonly state: EditorState;
    private disposables: vscode.Disposable[] = [];

    constructor(
        public readonly id: string,
        private extensionUri: vscode.Uri,
        private workspaceFolder?: vscode.WorkspaceFolder
    ) {
        // 创建webview面板
        this.panel = vscode.window.createWebviewPanel(
            'clangFormatEditor',
            this.getTitle(),
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'webviews'),
                    vscode.Uri.joinPath(extensionUri, 'webviews', 'visual-editor', 'clang-format', 'dist')
                ]
            }
        );

        // 初始化状态
        this.state = {
            config: {},
            isPreviewOpen: true,
            isDirty: false
        };

        // 设置面板图标
        this.panel.iconPath = {
            light: vscode.Uri.joinPath(extensionUri, 'resources', 'light', 'format.svg'),
            dark: vscode.Uri.joinPath(extensionUri, 'resources', 'dark', 'format.svg')
        };

        // 监听面板销毁
        this.disposables.push(
            this.panel.onDidDispose(() => {
                this.dispose();
            })
        );
    }

    /**
     * 初始化实例
     */
    async initialize(): Promise<void> {
        try {
            // 设置webview内容
            this.panel.webview.html = await this.getWebviewContent();

            // 设置消息处理
            this.setupMessageHandling();

            console.log(`ClangFormatEditorInstance: Initialized instance ${this.id}`);
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'initializeInstance',
                module: 'ClangFormatEditorInstance',
                showToUser: true,
                logLevel: 'error'
            });
            throw error;
        }
    }

    /**
     * 发送消息到webview
     */
    async sendMessage(message: any): Promise<void> {
        try {
            await this.panel.webview.postMessage({
                ...message,
                instanceId: this.id
            });
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'sendMessage',
                module: 'ClangFormatEditorInstance',
                showToUser: false,
                logLevel: 'error'
            });
        }
    }

    /**
     * 处理来自webview的消息
     */
    async handleMessage(message: any): Promise<void> {
        try {
            // 基础消息处理逻辑
            console.log(`ClangFormatEditorInstance: Received message ${message.type} for instance ${this.id}`);

            // 这里可以添加具体的消息处理逻辑
            // 实际实现中会根据消息类型进行不同的处理

        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'handleMessage',
                module: 'ClangFormatEditorInstance',
                showToUser: false,
                logLevel: 'error'
            });
        }
    }

    /**
     * 聚焦到此实例
     */
    focus(): void {
        this.panel.reveal(vscode.ViewColumn.One);
    }

    /**
     * 检查实例是否可见
     */
    isVisible(): boolean {
        return this.panel.visible;
    }

    /**
     * 获取标题
     */
    private getTitle(): string {
        if (this.workspaceFolder) {
            return `Clang-Format Editor - ${this.workspaceFolder.name}`;
        }
        return 'Clang-Format Editor';
    }

    /**
     * 设置消息处理
     */
    private setupMessageHandling(): void {
        this.disposables.push(
            this.panel.webview.onDidReceiveMessage(async (message) => {
                await this.handleMessage(message);
            })
        );
    }

    /**
     * 获取webview内容
     */
    private async getWebviewContent(): Promise<string> {
        // 简化的HTML内容，实际实现中会更复杂
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Clang-Format Editor</title>
            </head>
            <body>
                <div id="root">Loading Clang-Format Editor...</div>
                <script>
                    console.log('ClangFormat Editor Instance: ${this.id}');
                </script>
            </body>
            </html>
        `;
    }

    /**
     * 销毁实例
     */
    dispose(): void {
        try {
            this.disposables.forEach(d => d.dispose());
            this.disposables = [];

            if (!this.panel.disposed) {
                this.panel.dispose();
            }

            console.log(`ClangFormatEditorInstance: Disposed instance ${this.id}`);
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'disposeInstance',
                module: 'ClangFormatEditorInstance',
                showToUser: false,
                logLevel: 'error'
            });
        }
    }
}