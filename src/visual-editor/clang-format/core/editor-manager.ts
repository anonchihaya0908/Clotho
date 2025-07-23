import * as vscode from 'vscode';
import { BaseManager, ManagerContext, EditorOpenSource, WebviewMessage } from '../../../common/types';

/**
 * 编辑器管理器
 * 负责主Webview面板的创建、配置、内容生成和生命周期管理
 */
export class ClangFormatEditorManager implements BaseManager {
    readonly name = 'EditorManager';

    private panel: vscode.WebviewPanel | undefined;
    private context!: ManagerContext;
    private disposables: vscode.Disposable[] = [];

    async initialize(context: ManagerContext): Promise<void> {
        this.context = context;
        this.setupEventListeners();
        console.log('EditorManager initialized.');
    }

    /**
     * 创建或显示编辑器面板
     */
    async createOrShowEditor(source: EditorOpenSource): Promise<void> {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
            await this.context.stateManager.updateState({ isVisible: true }, 'editor-revealed');
            return;
        }

        try {
            this.panel = vscode.window.createWebviewPanel(
                'clangFormatEditor',
                'Clang-Format Editor',
                {
                    viewColumn: vscode.ViewColumn.One,
                    preserveFocus: false
                },
                this.getWebviewOptions()
            );

            this.panel.webview.html = await this.generateWebviewContent();
            this.setupPanelEventListeners();

            await this.context.stateManager.updateState(
                {
                    isVisible: true,
                    isInitialized: true,
                },
                'editor-created'
            );

            // 【关键】发送初始化消息到webview
            await this.sendInitializationMessage();

        } catch (error: any) {
            await this.context.errorRecovery.handleError('editor-creation-failed', error, { source });
        }
    }

    /**
     * 发送初始化消息到webview
     */
    private async sendInitializationMessage(): Promise<void> {
        try {
            // 导入必要的配置数据 - 这些应该从原coordinator中迁移过来
            const { CLANG_FORMAT_OPTIONS, DEFAULT_CLANG_FORMAT_CONFIG } = await import('../config-options');
            const { ConfigCategories } = await import('../../../common/types/config');

            const currentState = this.context.stateManager.getState();

            // 获取设置
            const config = vscode.workspace.getConfiguration('clotho.clangFormat');
            const showGuideButton = config.get<boolean>('showGuideButton', true);

            const initMessage = {
                type: 'initialize',
                payload: {
                    options: CLANG_FORMAT_OPTIONS,
                    categories: Object.values(ConfigCategories),
                    currentConfig: currentState.currentConfig || DEFAULT_CLANG_FORMAT_CONFIG,
                    settings: { showGuideButton }
                }
            };

            await this.postMessage(initMessage);
            console.log('Sent initialization message to webview');

        } catch (error: any) {
            console.error('Failed to send initialization message:', error);
            await this.context.errorRecovery.handleError('initialization-message-failed', error);
        }
    }

    /**
     * 向Webview发送消息
     */
    async postMessage(message: WebviewMessage): Promise<void> {
        if (this.panel) {
            await this.panel.webview.postMessage(message);
        } else {
            console.warn('Cannot post message: Editor panel is not available.');
        }
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        this.panel?.dispose();
    }

    private setupEventListeners() {
        this.context.eventBus.on('create-editor-requested', (source: EditorOpenSource) => {
            this.createOrShowEditor(source);
        });

        this.context.eventBus.on('post-message-to-webview', (message: WebviewMessage) => {
            this.postMessage(message);
        });
    }

    private setupPanelEventListeners() {
        if (!this.panel) return;

        this.panel.onDidDispose(() => {
            this.panel = undefined;
            this.context.stateManager.updateState({ isVisible: false }, 'editor-closed');
            this.context.eventBus.emit('editor-closed'); // 通知其他管理器
        });

        this.panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
            console.log('🔍 DEBUG: Received webview message:', message.type, message.payload);
            await this.context.eventBus.emit('webview-message-received', message);
        });

        // 监听主题变化并通知 Webview
        const themeChangeListener = vscode.window.onDidChangeActiveColorTheme(theme => {
            const isDarkTheme = theme.kind === vscode.ColorThemeKind.Dark ||
                theme.kind === vscode.ColorThemeKind.HighContrast;

            // 通知 Webview 主题已变化
            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'themeChanged',
                    theme: isDarkTheme ? 'dark' : 'light',
                    kind: vscode.ColorThemeKind[theme.kind],
                    isDark: isDarkTheme
                });
            }
        });

        this.disposables.push(themeChangeListener);
    }

    private getWebviewOptions(): vscode.WebviewOptions & vscode.WebviewPanelOptions {
        return {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'webviews'),
                vscode.Uri.joinPath(this.context.extensionUri, 'dist')
            ],
        };
    }

    private async generateWebviewContent(): Promise<string> {
        if (!this.panel) {
            throw new Error('Panel not initialized');
        }

        const webview = this.panel.webview;
        const extensionUri = this.context.extensionUri;

        // 【核心】检测当前VSCode的主题是亮色还是暗色
        const currentTheme = vscode.window.activeColorTheme;
        const isDarkTheme = currentTheme.kind === vscode.ColorThemeKind.Dark ||
            currentTheme.kind === vscode.ColorThemeKind.HighContrast;

        // 1. 【核心】定义所有需要从本地加载的资源的URI
        const scriptPath = vscode.Uri.joinPath(extensionUri, 'webviews', 'visual-editor', 'clang-format', 'dist', 'index.js');
        const stylePath = vscode.Uri.joinPath(extensionUri, 'webviews', 'visual-editor', 'clang-format', 'dist', 'index.css');

        const scriptUri = webview.asWebviewUri(scriptPath);
        const styleUri = webview.asWebviewUri(stylePath);

        // 添加调试日志
        console.log('🔍 DEBUG: Creating webview content...');
        console.log('🔍 DEBUG: Script URI:', scriptUri.toString());
        console.log('🔍 DEBUG: Style URI:', styleUri.toString());

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
                script-src  'nonce-${nonce}' 'unsafe-eval';
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
            </script>
        </body>
        </html>`;
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

    getStatus() {
        return {
            isInitialized: !!this.context,
            isHealthy: true,
            lastActivity: new Date(),
            errorCount: 0,
        };
    }
} 