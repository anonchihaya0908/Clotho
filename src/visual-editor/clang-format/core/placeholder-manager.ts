import * as vscode from 'vscode';
import { BaseManager, ManagerContext, WebviewMessage } from '../../../common/types';

// 动漫角色图片路径数组
const ALL_CHARACTER_IMAGES = [
    // MyGO 角色图片 (20张)
    'MyGO/angry.webp', 'MyGO/block.webp', 'MyGO/creating.webp', 'MyGO/crying-loudly.webp',
    'MyGO/huh.webp', 'MyGO/interesting-woman.webp', 'MyGO/just-woke-up.webp', 'MyGO/let-me-see.webp',
    'MyGO/love.webp', 'MyGO/matcha-parfait.webp', 'MyGO/melancholy.webp', 'MyGO/no-fighting.webp',
    'MyGO/no-way.webp', 'MyGO/peeking.webp', 'MyGO/please-order.webp', 'MyGO/running-away.webp',
    'MyGO/sending-message.webp', 'MyGO/shy.webp', 'MyGO/what-about-me.webp', 'MyGO/why.webp',

    // Ave-Mujica 角色图片 (20张)
    'Ave-Mujica/angry.webp', 'Ave-Mujica/buy-all-at-once.webp', 'Ave-Mujica/could-it-be.webp', 'Ave-Mujica/delicious.webp',
    'Ave-Mujica/eh.webp', 'Ave-Mujica/happy.webp', 'Ave-Mujica/hmph.webp', 'Ave-Mujica/no-way.webp',
    'Ave-Mujica/pleasant.webp', 'Ave-Mujica/pretty-good.webp', 'Ave-Mujica/remember-to-smile.webp', 'Ave-Mujica/scared.webp',
    'Ave-Mujica/scissors.webp', 'Ave-Mujica/shocked.webp', 'Ave-Mujica/sleeping.webp', 'Ave-Mujica/suddenly.webp',
    'Ave-Mujica/sulking.webp', 'Ave-Mujica/wait-a-moment.webp', 'Ave-Mujica/what-about-me.webp', 'Ave-Mujica/will-report-you.webp',

    // Girls Band Cry 角色图片 (45张)
    'Girls-Band-Cry/ah.webp', 'Girls-Band-Cry/angry.webp', 'Girls-Band-Cry/appear.webp', 'Girls-Band-Cry/being-pulled.webp',
    'Girls-Band-Cry/box-head.webp', 'Girls-Band-Cry/bye-bye.webp', 'Girls-Band-Cry/catching-box.webp', 'Girls-Band-Cry/confident.webp',
    'Girls-Band-Cry/crying.webp', 'Girls-Band-Cry/deep-sleep.webp', 'Girls-Band-Cry/depressed.webp', 'Girls-Band-Cry/driving-rupa.webp',
    'Girls-Band-Cry/driving.webp', 'Girls-Band-Cry/eating.webp', 'Girls-Band-Cry/eww.webp', 'Girls-Band-Cry/gritting-teeth.webp',
    'Girls-Band-Cry/heart-gesture.webp', 'Girls-Band-Cry/huh.webp', 'Girls-Band-Cry/joy.webp', 'Girls-Band-Cry/laughing.webp',
    'Girls-Band-Cry/love.webp', 'Girls-Band-Cry/mischievous-smile.webp', 'Girls-Band-Cry/mocking-subaru.webp', 'Girls-Band-Cry/mocking.webp',
    'Girls-Band-Cry/no-way.webp', 'Girls-Band-Cry/offering-flowers.webp', 'Girls-Band-Cry/peeking.webp', 'Girls-Band-Cry/pinching-cheek.webp',
    'Girls-Band-Cry/please.webp', 'Girls-Band-Cry/pointing.webp', 'Girls-Band-Cry/pulling-person.webp', 'Girls-Band-Cry/rock-and-roll.webp',
    'Girls-Band-Cry/scratching-head.webp', 'Girls-Band-Cry/showing-teeth.webp', 'Girls-Band-Cry/shy.webp', 'Girls-Band-Cry/sigh.webp',
    'Girls-Band-Cry/silent.webp', 'Girls-Band-Cry/stubborn.webp', 'Girls-Band-Cry/stunned.webp', 'Girls-Band-Cry/surprised.webp',
    'Girls-Band-Cry/sweating.webp', 'Girls-Band-Cry/teary-eyes.webp', 'Girls-Band-Cry/tongue-out.webp', 'Girls-Band-Cry/what-are-you-doing.webp',
    'Girls-Band-Cry/wiggling.webp'
];

/**
 * 随机选择一张角色图片
 */
function getRandomCharacterImage(): string {
    const randomIndex = Math.floor(Math.random() * ALL_CHARACTER_IMAGES.length);
    return ALL_CHARACTER_IMAGES[randomIndex];
}

/**
 * 占位符 Webview 管理器
 * 负责在代码预览关闭时创建占位符界面，维持布局稳定性
 */
export class PlaceholderWebviewManager implements BaseManager {
    readonly name = 'PlaceholderManager';

    private panel: vscode.WebviewPanel | undefined;
    private context!: ManagerContext;
    private disposables: vscode.Disposable[] = [];

    async initialize(context: ManagerContext): Promise<void> {
        this.context = context;
        this.setupEventListeners();
    }

    /**
     * 创建占位符 webview
     */
    async createPlaceholder(): Promise<void> {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Two, false); // 不激活，仅显示
            return;
        }

        try {
            this.panel = vscode.window.createWebviewPanel(
                'clangFormatPlaceholder',
                'Clang-Format 预览占位符',
                {
                    viewColumn: vscode.ViewColumn.Two,
                    preserveFocus: true
                },
                this.getWebviewOptions()
            );

            this.updatePlaceholderContent();
            this.setupPanelEventListeners();

            // 占位符被创建，意味着预览已经关闭
            await this.context.stateManager.updateState(
                {
                    previewMode: 'closed',
                    previewUri: undefined,
                    previewEditor: undefined,
                },
                'placeholder-created'
            );

        } catch (error: any) {
            await this.context.errorRecovery.handleError('placeholder-creation-failed', error);
        }
    }

    /**
     * 更新占位符内容
     */
    updatePlaceholderContent(): void {
        if (this.panel) {
            this.panel.webview.html = this.generatePlaceholderContent();
        }
    }

    /**
     * 隐藏占位符
     */
    hidePlaceholder(): void {
        // 实际上，VS Code 没有直接"隐藏"面板的 API
        // 所以这里我们不做任何操作，因为预览会在同一个位置打开
    }

    /**
     * 检查占位符是否处于活动状态
     */
    isPlaceholderActive(): boolean {
        return !!this.panel;
    }

    /**
     * 获取占位符面板
     */
    getPlaceholderPanel(): vscode.WebviewPanel | undefined {
        return this.panel;
    }

    /**
     * 处理重新打开预览的请求
     */
    async handleReopenRequest(payload?: any): Promise<void> {
        try {
            console.log('🔄 PlaceholderManager: Handling reopen preview request');

            // 【关键修复】先销毁占位符面板，避免同时存在两个面板
            if (this.panel) {
                console.log('🗑️ PlaceholderManager: Disposing placeholder panel before opening preview');
                this.panel.dispose();
                this.panel = undefined;
            }

            // 强制重置状态
            await this.context.stateManager.updateState({
                previewMode: 'closed',
                previewUri: undefined,
                previewEditor: undefined
            }, 'force-reset-before-reopen');

            // 发送重新打开预览事件
            this.context.eventBus.emit('open-preview-requested', {
                source: 'placeholder',
                forceReopen: true
            });

        } catch (error) {
            console.error('[PlaceholderManager] 处理重新打开预览请求时出错:', error);
        }
    }

    /**
     * 处理占位符被用户关闭的情况
     */
    handlePlaceholderClosed(): void {
        this.panel = undefined; // 面板被销毁，重置引用
        // 当用户手动关闭占位符时，我们认为他们希望结束整个会话
        this.context.eventBus.emit('editor-closed');
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        if (this.panel) {
            this.panel.dispose();
        }
    }

    private setupEventListeners(): void {
        this.context.eventBus.on('preview-closed', async () => {
            const state = this.context.stateManager.getState();
            if (state.isVisible && state.isInitialized) {
                await this.createPlaceholder();
            }
        });

        // 监听预览打开事件，清理占位符
        this.context.eventBus.on('preview-opened', () => {
            console.log('🔍 PlaceholderManager: Preview opened, disposing placeholder');
            if (this.panel) {
                this.panel.dispose();
                this.panel = undefined;
            }
        });
    }

    private setupPanelEventListeners(): void {
        if (!this.panel) return;

        // 监听占位符被关闭
        this.panel.onDidDispose(() => {
            this.handlePlaceholderClosed();
        });

        // 监听来自占位符的消息
        this.panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
            if (message.type === 'reopen-preview') {
                console.log('[PlaceholderManager] 收到来自占位符的消息:', message);
                await this.handleReopenRequest(message.payload);
            }
        });

        // 监听主题变化
        const themeChangeListener = vscode.window.onDidChangeActiveColorTheme(theme => {
            const isDarkTheme = theme.kind === vscode.ColorThemeKind.Dark ||
                theme.kind === vscode.ColorThemeKind.HighContrast;

            if (this.panel) {
                this.panel.webview.postMessage({
                    type: 'theme-changed',
                    payload: {
                        isDark: isDarkTheme,
                    }
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

    /**
     * 生成占位符 HTML 内容
     */
    private generatePlaceholderContent(): string {
        const currentTheme = vscode.window.activeColorTheme;
        const isDarkTheme = currentTheme.kind === vscode.ColorThemeKind.Dark ||
            currentTheme.kind === vscode.ColorThemeKind.HighContrast;

        const nonce = this.getNonce();

        // 【彩蛋功能】随机选择一张动漫角色图片
        const randomImagePath = getRandomCharacterImage();
        const imageUri = this.getStaticImageUri(randomImagePath);

        return `<!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            
            <meta http-equiv="Content-Security-Policy" content="
                default-src 'none';
                style-src 'nonce-${nonce}';
                script-src 'nonce-${nonce}';
                img-src 'self' data:;
                font-src 'self';
            ">

            <title>Clang-Format 预览占位符</title>
            
            <style nonce="${nonce}">
                :root {
                    --vscode-font-family: var(--vscode-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
                    --vscode-font-size: var(--vscode-font-size, 13px);
                    --vscode-foreground: var(--vscode-foreground, ${isDarkTheme ? '#cccccc' : '#333333'});
                    --vscode-background: var(--vscode-editor-background, ${isDarkTheme ? '#1e1e1e' : '#ffffff'});
                    --vscode-button-background: var(--vscode-button-background, ${isDarkTheme ? '#0e639c' : '#007acc'});
                    --vscode-button-foreground: var(--vscode-button-foreground, #ffffff);
                    --vscode-button-hoverBackground: var(--vscode-button-hoverBackground, ${isDarkTheme ? '#1177bb' : '#005a9e'});
                    --vscode-input-background: var(--vscode-input-background, ${isDarkTheme ? '#3c3c3c' : '#ffffff'});
                    --vscode-input-border: var(--vscode-input-border, ${isDarkTheme ? '#3c3c3c' : '#cecece'});
                    --vscode-descriptionForeground: var(--vscode-descriptionForeground, ${isDarkTheme ? '#cccccc99' : '#717171'});
                }

                * {
                    box-sizing: border-box;
                }

                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-background);
                    margin: 0;
                    padding: 0;
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }

                .placeholder-container {
                    text-align: center;
                    max-width: 400px;
                    padding: 40px 20px;
                    animation: fadeIn 0.3s ease-in-out;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .placeholder-icon {
                    width: 256px;
                    height: 256px;
                    margin: 0 auto 20px auto;
                    border-radius: 12px;
                    overflow: hidden;
                }

                .placeholder-icon img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                    border-radius: 12px;
                }

                .placeholder-title {
                    font-size: 18px;
                    font-weight: 600;
                    margin-bottom: 12px;
                    color: var(--vscode-foreground);
                }

                .placeholder-description {
                    font-size: 14px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 24px;
                    line-height: 1.5;
                }

                .reopen-button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 10px 20px;
                    font-size: 14px;
                    font-family: var(--vscode-font-family);
                    font-weight: 400;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                    min-width: 140px;
                }

                .reopen-button:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                .reopen-button:disabled {
                    background: #666;
                    cursor: not-allowed;
                }

                .placeholder-footer {
                    margin-top: 30px;
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    opacity: 0.8;
                }

                .status-indicator {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    background-color: var(--vscode-button-background);
                    border-radius: 50%;
                    margin-right: 8px;
                    animation: blink 1.5s infinite;
                }

                @keyframes blink {
                    0%, 50% {
                        opacity: 1;
                    }
                    51%, 100% {
                        opacity: 0.3;
                    }
                }

                /* 响应式设计 */
                @media (max-width: 480px) {
                    .placeholder-container {
                        padding: 20px 15px;
                        max-width: 300px;
                    }
                    
                    .placeholder-icon {
                        font-size: 36px;
                    }
                    
                    .placeholder-title {
                        font-size: 16px;
                    }
                }
            </style>
        </head>
        <body data-vscode-theme="${isDarkTheme ? 'dark' : 'light'}">
            <div class="placeholder-container">
                <div class="placeholder-icon">
                    <img src="${imageUri}" 
                         alt="动漫角色" 
                         onerror="this.style.display='none'; this.parentElement.innerHTML='📋';" />
                </div>
                
                <h2 class="placeholder-title">代码预览已关闭</h2>
                
                <p class="placeholder-description">
                    预览面板已被关闭。您可以继续在左侧配置面板中调整 clang-format 设置，
                    或者点击下方按钮重新打开代码预览。
                </p>
                
                <button class="reopen-button" id="reopenButton">
                    重新打开预览
                </button>
                
                <div class="placeholder-footer">
                    <span class="status-indicator"></span>
                    Clotho Clang-Format 编辑器 - 布局稳定模式
                </div>
            </div>

            <script nonce="${nonce}">
                // 获取 VS Code API
                const vscode = acquireVsCodeApi();
                let messageCount = 0;

                // 页面加载完成后的初始化
                document.addEventListener('DOMContentLoaded', function() {
                    // 添加按钮点击事件监听器
                    const reopenButton = document.getElementById('reopenButton');
                    if (reopenButton) {
                        reopenButton.addEventListener('click', reopenPreview);
                    }
                    
                    // 添加键盘快捷键支持
                    document.addEventListener('keydown', function(event) {
                        // Ctrl/Cmd + R 重新打开预览
                        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
                            event.preventDefault();
                            reopenPreview();
                        }
                        
                        // Enter 键重新打开预览
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            reopenPreview();
                        }
                    });
                });

                // 重新打开预览功能
                function reopenPreview() {
                    const messageId = ++messageCount;
                    console.log('用户点击了重新打开预览按钮 [' + messageId + ']');
                    
                    // 禁用按钮，防止重复点击
                    const button = document.getElementById('reopenButton');
                    button.disabled = true;
                    button.textContent = '正在打开预览...';
                    
                    // 发送消息到扩展
                    vscode.postMessage({
                        type: 'reopen-preview',
                        payload: {
                            timestamp: Date.now(),
                            messageId: messageId
                        }
                    });
                    
                    // 添加视觉反馈
                    document.querySelector('.placeholder-title').textContent = '正在打开预览...';
                }

                // 监听主题变化
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.type) {
                        case 'theme-changed':
                            document.body.setAttribute('data-vscode-theme', 
                                message.payload.isDark ? 'dark' : 'light');
                            break;
                    }
                });
            </script>
        </body>
        </html>`;
    }

    /**
     * 生成webview可用的图片URI
     */
    private getWebviewImageUri(imagePath: string): string {
        if (!this.panel) return '';

        const imageFullPath = vscode.Uri.joinPath(
            this.context.extensionUri,
            'webviews',
            'visual-editor',
            'clang-format',
            'src',
            'assets',
            'images',
            imagePath
        );

        return this.panel.webview.asWebviewUri(imageFullPath).toString();
    }



    /**
     * 生成随机 nonce 用于 CSP 安全
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