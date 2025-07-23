/**
 * 简化版彩蛋Webview控制器
 * 只显示动漫人物和重新打开预览的提示
 */

import * as vscode from 'vscode';
import { CharacterResourceManager, CharacterInfo } from './character-resource-manager';
import { ErrorHandler } from '../../../common/error-handler';

/**
 * 简化版彩蛋Webview控制器
 */
export class SimpleEasterEggWebviewController {
    private panel: vscode.WebviewPanel | undefined;
    private currentCharacter: CharacterInfo | null = null;
    private characterManager: CharacterResourceManager;
    private disposables: vscode.Disposable[] = [];

    constructor(
        private extensionUri: vscode.Uri,
        private onReopenPreview?: () => Promise<void>
    ) {
        this.characterManager = new CharacterResourceManager(extensionUri);
    }

    /**
     * 创建简化版彩蛋webview
     */
    async createEasterEggWebview(): Promise<vscode.WebviewPanel> {
        try {
            // 如果已存在面板，先清理
            if (this.panel && !this.panel.disposed) {
                this.panel.dispose();
            }

            // 创建新的webview面板
            this.panel = vscode.window.createWebviewPanel(
                'clangFormatEasterEgg',
                '🎭 预览编辑器已关闭',
                vscode.ViewColumn.Two, // 确保在第二列显示
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        this.extensionUri,
                        vscode.Uri.joinPath(this.extensionUri, 'src', 'assets'),
                        vscode.Uri.joinPath(this.extensionUri, 'webviews')
                    ]
                }
            );

            // 强制显示在第二列
            this.panel.reveal(vscode.ViewColumn.Two, true);

            // 设置图标
            this.panel.iconPath = {
                light: vscode.Uri.joinPath(this.extensionUri, 'resources', 'light', 'format.svg'),
                dark: vscode.Uri.joinPath(this.extensionUri, 'resources', 'dark', 'format.svg')
            };

            // 加载随机角色
            await this.loadRandomCharacter();

            // 设置HTML内容
            this.panel.webview.html = await this.generateSimpleEasterEggHTML();

            // 设置消息处理
            this.setupMessageHandling();

            // 监听面板销毁
            this.disposables.push(
                this.panel.onDidDispose(() => {
                    this.cleanup();
                })
            );

            console.log('🎭 SimpleEasterEggController: Simple webview created successfully');
            return this.panel;

        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'createSimpleEasterEggWebview',
                module: 'SimpleEasterEggWebviewController',
                showToUser: true,
                logLevel: 'error'
            });
            throw error;
        }
    }

    /**
     * 切换角色
     */
    async switchCharacter(): Promise<void> {
        try {
            await this.loadRandomCharacter();
            await this.updateCharacterDisplay();
            console.log(`🎲 SimpleEasterEggController: Switched to character ${this.currentCharacter?.name}`);
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'switchCharacter',
                module: 'SimpleEasterEggWebviewController',
                showToUser: false,
                logLevel: 'error'
            });
        }
    }

    /**
     * 加载随机角色
     */
    private async loadRandomCharacter(): Promise<void> {
        try {
            this.currentCharacter = await this.characterManager.getRandomCharacter();

            if (!this.currentCharacter) {
                // 如果没有找到角色，创建一个默认角色
                this.currentCharacter = this.createDefaultCharacter();
            }
        } catch (error) {
            console.error('Failed to load random character:', error);
            this.currentCharacter = this.createDefaultCharacter();
        }
    }

    /**
     * 创建默认角色
     */
    private createDefaultCharacter(): CharacterInfo {
        const defaultEmojis = ['🎭', '🎪', '🎨', '🎯', '🎲', '🎸', '🎺', '🎻', '🎮', '🎬'];
        const randomEmoji = defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)];

        return {
            id: 'default-character',
            name: '预览编辑器已关闭',
            description: '您可以点击下方按钮重新打开预览编辑器',
            imagePath: '',
            imageUri: vscode.Uri.file(''),
            tags: ['default'],
            rarity: 'common'
        };
    }

    /**
     * 更新角色显示
     */
    private async updateCharacterDisplay(): Promise<void> {
        if (!this.panel || !this.currentCharacter) {
            return;
        }

        try {
            await this.panel.webview.postMessage({
                type: 'characterUpdated',
                payload: {
                    character: this.currentCharacter,
                    imageUri: this.currentCharacter.imagePath ?
                        this.panel.webview.asWebviewUri(vscode.Uri.file(this.currentCharacter.imagePath)).toString() :
                        null
                }
            });
        } catch (error) {
            console.error('Failed to update character display:', error);
        }
    }

    /**
     * 生成简化版彩蛋HTML
     */
    private async generateSimpleEasterEggHTML(): Promise<string> {
        const character = this.currentCharacter;
        const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;

        // 获取图片URI
        let imageUri = '';
        if (character && character.imagePath && this.panel) {
            try {
                imageUri = this.panel.webview.asWebviewUri(vscode.Uri.file(character.imagePath)).toString();
            } catch (error) {
                console.warn('Failed to generate image URI:', error);
            }
        }

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' 'unsafe-eval'; img-src data:;">
                <title>预览编辑器已关闭</title>
                <style>
                    :root {
                        --primary-color: ${isDarkTheme ? '#007acc' : '#0066cc'};
                        --text-color: var(--vscode-foreground);
                        --background-color: var(--vscode-editor-background);
                        --button-bg: var(--vscode-button-background);
                        --button-fg: var(--vscode-button-foreground);
                        --button-hover-bg: var(--vscode-button-hoverBackground);
                        --secondary-bg: var(--vscode-editor-inactiveSelectionBackground);
                    }

                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        background: var(--background-color);
                        color: var(--text-color);
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        text-align: center;
                    }

                    .character-container {
                        max-width: 350px;
                        width: 100%;
                        animation: fadeIn 0.5s ease-in-out;
                    }

                    .character-image {
                        width: 180px;
                        height: 180px;
                        border-radius: 50%;
                        object-fit: cover;
                        margin: 0 auto 20px;
                        border: 3px solid var(--primary-color);
                        transition: transform 0.3s ease;
                        cursor: pointer;
                        display: block;
                    }

                    .character-image:hover {
                        transform: scale(1.05) rotate(2deg);
                    }

                    .character-emoji {
                        font-size: 120px;
                        margin: 20px 0;
                        cursor: pointer;
                        transition: transform 0.3s ease;
                        user-select: none;
                        animation: pulse 2s ease-in-out infinite;
                    }

                    .character-emoji:hover {
                        transform: scale(1.1) rotate(10deg);
                    }

                    .main-message {
                        font-size: 20px;
                        font-weight: 600;
                        margin-bottom: 12px;
                        color: var(--primary-color);
                    }

                    .sub-message {
                        font-size: 14px;
                        opacity: 0.8;
                        margin-bottom: 30px;
                        line-height: 1.4;
                    }

                    .reopen-button {
                        padding: 12px 24px;
                        background: var(--button-bg);
                        color: var(--button-fg);
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s ease;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 20px;
                    }

                    .reopen-button:hover {
                        background: var(--button-hover-bg);
                        transform: translateY(-1px);
                    }

                    .reopen-button:active {
                        transform: translateY(0);
                    }

                    .tip {
                        font-size: 12px;
                        opacity: 0.6;
                        background: var(--secondary-bg);
                        padding: 8px 12px;
                        border-radius: 4px;
                        margin-top: 15px;
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    @keyframes pulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                    }

                    @media (max-width: 480px) {
                        .character-image {
                            width: 140px;
                            height: 140px;
                        }
                        
                        .character-emoji {
                            font-size: 80px;
                        }
                        
                        .main-message {
                            font-size: 18px;
                        }
                        
                        .reopen-button {
                            width: 100%;
                            justify-content: center;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="character-container">
                    ${imageUri ?
                `<img class="character-image" id="character-image" src="${imageUri}" alt="Character" onclick="switchCharacter()" title="点击换一个角色">` :
                `<div class="character-emoji" id="character-emoji" onclick="switchCharacter()" title="点击换一个角色">🎭</div>`
            }
                    
                    <button class="reopen-button" onclick="reopenPreview()">
                        📄 重新打开预览编辑器
                    </button>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    // 重新打开预览
                    function reopenPreview() {
                        console.log('🔄 Requesting preview reopen...');
                        vscode.postMessage({ type: 'reopenPreview' });
                    }
                    
                    // 切换角色
                    function switchCharacter() {
                        console.log('🎲 Requesting character switch...');
                        vscode.postMessage({ type: 'switchCharacter' });
                    }
                    
                    // 更新角色显示
                    function updateCharacterDisplay(character, imageUri) {
                        // 更新图片或emoji
                        const imageEl = document.getElementById('character-image');
                        const emojiEl = document.getElementById('character-emoji');
                        
                        if (imageUri && imageEl) {
                            imageEl.src = imageUri;
                            imageEl.alt = character.name;
                        } else if (emojiEl) {
                            // 如果没有图片，随机显示emoji
                            const emojis = ['🎭', '🎪', '🎨', '🎯', '🎲', '🎸', '🎺', '🎻', '🎮', '🎬'];
                            emojiEl.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                        }
                    }
                    
                    // 监听来自扩展的消息
                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        switch (message.type) {
                            case 'characterUpdated':
                                updateCharacterDisplay(message.payload.character, message.payload.imageUri);
                                break;
                        }
                    });
                    
                    // 页面加载完成
                    document.addEventListener('DOMContentLoaded', function() {
                        console.log('🎭 Simple Easter Egg webview loaded');
                        
                        // 添加键盘快捷键
                        document.addEventListener('keydown', function(e) {
                            if (e.key === 'r' || e.key === 'R') {
                                reopenPreview();
                            } else if (e.key === 's' || e.key === 'S') {
                                switchCharacter();
                            }
                        });
                    });
                </script>
            </body>
            </html>
        `;
    }

    /**
     * 设置消息处理
     */
    private setupMessageHandling(): void {
        if (!this.panel) return;

        this.disposables.push(
            this.panel.webview.onDidReceiveMessage(async (message: any) => {
                try {
                    switch (message.type) {
                        case 'switchCharacter':
                            await this.switchCharacter();
                            break;

                        case 'reopenPreview':
                            if (this.onReopenPreview) {
                                await this.onReopenPreview();
                            }
                            break;

                        default:
                            console.warn(`Unknown message type: ${message.type}`);
                    }
                } catch (error) {
                    ErrorHandler.handle(error, {
                        operation: 'handleSimpleEasterEggMessage',
                        module: 'SimpleEasterEggWebviewController',
                        showToUser: false,
                        logLevel: 'error'
                    });
                }
            })
        );
    }

    /**
     * 清理资源
     */
    private cleanup(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        this.panel = undefined;
        console.log('🧹 SimpleEasterEggController: Cleaned up');
    }

    /**
     * 销毁控制器
     */
    dispose(): void {
        if (this.panel && !this.panel.disposed) {
            this.panel.dispose();
        }
        this.cleanup();
        this.characterManager.dispose();
        console.log('SimpleEasterEggController: Disposed');
    }
}