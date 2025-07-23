/**
 * 彩蛋Webview控制器
 * 管理动漫角色彩蛋的显示和交互
 */

import * as vscode from 'vscode';
import { CharacterResourceManager, CharacterInfo } from './character-resource-manager';
import { ErrorHandler } from '../../../common/error-handler';

/**
 * 彩蛋消息类型
 */
export enum EasterEggMessageType {
    INITIALIZE = 'initialize',
    SWITCH_CHARACTER = 'switchCharacter',
    CHARACTER_UPDATED = 'characterUpdated',
    REOPEN_PREVIEW = 'reopenPreview',
    ADD_TO_FAVORITES = 'addToFavorites',
    REMOVE_FROM_FAVORITES = 'removeFromFavorites',
    GET_STATISTICS = 'getStatistics',
    THEME_CHANGED = 'themeChanged'
}

/**
 * 彩蛋消息接口
 */
export interface EasterEggMessage {
    type: EasterEggMessageType;
    payload?: any;
}

/**
 * 彩蛋Webview控制器
 */
export class EasterEggWebviewController {
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
     * 创建彩蛋webview
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
                '🎭 Character Gallery',
                vscode.ViewColumn.Two,
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

            // 设置图标
            this.panel.iconPath = {
                light: vscode.Uri.joinPath(this.extensionUri, 'resources', 'light', 'character.svg'),
                dark: vscode.Uri.joinPath(this.extensionUri, 'resources', 'dark', 'character.svg')
            };

            // 加载随机角色
            await this.loadRandomCharacter();

            // 设置HTML内容
            this.panel.webview.html = await this.generateEasterEggHTML();

            // 设置消息处理
            this.setupMessageHandling();

            // 监听面板销毁
            this.disposables.push(
                this.panel.onDidDispose(() => {
                    this.cleanup();
                })
            );

            // 监听主题变化
            this.disposables.push(
                vscode.window.onDidChangeActiveColorTheme(() => {
                    this.handleThemeChange();
                })
            );

            console.log('🎭 EasterEggController: Webview created successfully');
            return this.panel;

        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'createEasterEggWebview',
                module: 'EasterEggWebviewController',
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
            console.log(`🎲 EasterEggController: Switched to character ${this.currentCharacter?.name}`);
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'switchCharacter',
                module: 'EasterEggWebviewController',
                showToUser: false,
                logLevel: 'error'
            });
        }
    }

    /**
     * 获取当前角色
     */
    getCurrentCharacter(): CharacterInfo | null {
        return this.currentCharacter;
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
            name: 'Default Character',
            description: 'A friendly character waiting to meet you!',
            imagePath: '',
            imageUri: vscode.Uri.file(''),
            tags: ['default', 'friendly'],
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
                type: EasterEggMessageType.CHARACTER_UPDATED,
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
     * 生成彩蛋HTML
     */
    private async generateEasterEggHTML(): Promise<string> {
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
                <title>Character Gallery</title>
                <style>
                    :root {
                        --primary-color: ${isDarkTheme ? '#007acc' : '#0066cc'};
                        --secondary-color: ${isDarkTheme ? '#1e1e1e' : '#f3f3f3'};
                        --text-color: var(--vscode-foreground);
                        --background-color: var(--vscode-editor-background);
                        --border-color: var(--vscode-panel-border);
                        --button-bg: var(--vscode-button-background);
                        --button-fg: var(--vscode-button-foreground);
                        --button-hover-bg: var(--vscode-button-hoverBackground);
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
                        overflow: hidden;
                    }

                    .container {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        text-align: center;
                    }

                    .character-card {
                        background: var(--secondary-color);
                        border: 1px solid var(--border-color);
                        border-radius: 12px;
                        padding: 30px;
                        max-width: 400px;
                        width: 100%;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                        animation: fadeIn 0.5s ease-in-out;
                    }

                    .character-image {
                        width: 200px;
                        height: 200px;
                        border-radius: 50%;
                        object-fit: cover;
                        margin: 0 auto 20px;
                        border: 3px solid var(--primary-color);
                        transition: transform 0.3s ease, box-shadow 0.3s ease;
                        cursor: pointer;
                        display: block;
                    }

                    .character-image:hover {
                        transform: scale(1.05) rotate(2deg);
                        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
                    }

                    .character-emoji {
                        font-size: 120px;
                        margin: 20px 0;
                        cursor: pointer;
                        transition: transform 0.3s ease;
                        user-select: none;
                    }

                    .character-emoji:hover {
                        transform: scale(1.1) rotate(10deg);
                    }

                    .character-name {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 10px;
                        color: var(--primary-color);
                    }

                    .character-description {
                        font-size: 16px;
                        opacity: 0.8;
                        margin-bottom: 20px;
                        line-height: 1.5;
                    }



                    .action-buttons {
                        display: flex;
                        gap: 12px;
                        flex-wrap: wrap;
                        justify-content: center;
                        margin-top: 20px;
                    }

                    .action-button {
                        padding: 12px 20px;
                        background: var(--button-bg);
                        color: var(--button-fg);
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .action-button:hover {
                        background: var(--button-hover-bg);
                        transform: translateY(-1px);
                    }

                    .action-button:active {
                        transform: translateY(0);
                    }

                    .action-button.secondary {
                        background: transparent;
                        border: 1px solid var(--border-color);
                        color: var(--text-color);
                    }

                    .action-button.secondary:hover {
                        background: var(--secondary-color);
                    }



                    .loading {
                        display: none;
                        font-size: 18px;
                        opacity: 0.7;
                    }

                    .loading.show {
                        display: block;
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    @keyframes pulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                    }

                    .pulse {
                        animation: pulse 2s ease-in-out infinite;
                    }

                    @media (max-width: 480px) {
                        .container {
                            padding: 15px;
                        }
                        
                        .character-card {
                            padding: 20px;
                        }
                        
                        .character-image {
                            width: 150px;
                            height: 150px;
                        }
                        
                        .character-emoji {
                            font-size: 80px;
                        }
                        
                        .action-buttons {
                            flex-direction: column;
                        }
                        
                        .action-button {
                            width: 100%;
                            justify-content: center;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="character-card">
                        <div class="loading" id="loading">🎭 Loading character...</div>
                        
                        <div id="character-content">
                            ${imageUri ?
                `<img class="character-image" id="character-image" src="${imageUri}" alt="${character?.name || 'Character'}" onclick="switchCharacter()">` :
                `<div class="character-emoji pulse" id="character-emoji" onclick="switchCharacter()">🎭</div>`
            }
                            
                            <div class="character-name" id="character-name">
                                预览编辑器已关闭
                            </div>
                            
                            <div class="character-description" id="character-description">
                                您可以点击下方按钮重新打开预览编辑器，或者点击角色切换到其他角色
                            </div>
                            
                            <div class="action-buttons">
                                <button class="action-button" onclick="reopenPreview()">
                                    📄 重新打开预览编辑器
                                </button>
                                <button class="action-button secondary" onclick="switchCharacter()">
                                    🎲 换一个角色
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    let currentCharacter = ${JSON.stringify(character)};
                    
                    // 发送消息到扩展
                    function sendMessage(type, payload = {}) {
                        vscode.postMessage({ type, payload });
                    }
                    
                    // 重新打开预览
                    function reopenPreview() {
                        console.log('🔄 Requesting preview reopen...');
                        sendMessage('${EasterEggMessageType.REOPEN_PREVIEW}');
                    }
                    
                    // 切换角色
                    function switchCharacter() {
                        console.log('🎲 Requesting character switch...');
                        showLoading(true);
                        sendMessage('${EasterEggMessageType.SWITCH_CHARACTER}');
                    }
                    
                    // 添加到收藏
                    function addToFavorites() {
                        if (currentCharacter) {
                            console.log('⭐ Adding to favorites:', currentCharacter.name);
                            sendMessage('${EasterEggMessageType.ADD_TO_FAVORITES}', { 
                                characterId: currentCharacter.id 
                            });
                        }
                    }
                    
                    // 显示/隐藏加载状态
                    function showLoading(show) {
                        const loading = document.getElementById('loading');
                        const content = document.getElementById('character-content');
                        
                        if (show) {
                            loading.classList.add('show');
                            content.style.opacity = '0.5';
                        } else {
                            loading.classList.remove('show');
                            content.style.opacity = '1';
                        }
                    }
                    
                    // 更新角色显示
                    function updateCharacterDisplay(character, imageUri) {
                        currentCharacter = character;
                        
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
                        
                        // 更新文本信息
                        document.getElementById('character-name').textContent = character.name;
                        document.getElementById('character-description').textContent = character.description;
                        
                        // 更新稀有度
                        const rarityBadge = document.getElementById('rarity-badge');
                        rarityBadge.textContent = character.rarity;
                        rarityBadge.className = \`rarity-badge rarity-\${character.rarity}\`;
                        
                        // 更新标签
                        const tagsContainer = document.getElementById('character-tags');
                        tagsContainer.innerHTML = character.tags.map(tag => 
                            \`<span class="tag">\${tag}</span>\`
                        ).join('');
                        
                        showLoading(false);
                    }
                    
                    // 监听来自扩展的消息
                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        switch (message.type) {
                            case '${EasterEggMessageType.CHARACTER_UPDATED}':
                                updateCharacterDisplay(message.payload.character, message.payload.imageUri);
                                break;
                                
                            case '${EasterEggMessageType.THEME_CHANGED}':
                                // 主题变化时可以更新样式
                                console.log('🎨 Theme changed');
                                break;
                        }
                    });
                    
                    // 页面加载完成后请求统计信息
                    document.addEventListener('DOMContentLoaded', function() {
                        console.log('🎭 Easter Egg webview loaded');
                        sendMessage('${EasterEggMessageType.GET_STATISTICS}');
                        
                        // 添加键盘快捷键
                        document.addEventListener('keydown', function(e) {
                            if (e.key === 'r' || e.key === 'R') {
                                reopenPreview();
                            } else if (e.key === 's' || e.key === 'S') {
                                switchCharacter();
                            } else if (e.key === 'f' || e.key === 'F') {
                                addToFavorites();
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
            this.panel.webview.onDidReceiveMessage(async (message: EasterEggMessage) => {
                try {
                    switch (message.type) {
                        case EasterEggMessageType.SWITCH_CHARACTER:
                            await this.switchCharacter();
                            break;

                        case EasterEggMessageType.REOPEN_PREVIEW:
                            if (this.onReopenPreview) {
                                await this.onReopenPreview();
                            }
                            break;

                        case EasterEggMessageType.ADD_TO_FAVORITES:
                            if (message.payload?.characterId) {
                                this.characterManager.addToFavorites(message.payload.characterId);
                            }
                            break;

                        case EasterEggMessageType.REMOVE_FROM_FAVORITES:
                            if (message.payload?.characterId) {
                                this.characterManager.removeFromFavorites(message.payload.characterId);
                            }
                            break;

                        case EasterEggMessageType.GET_STATISTICS:
                            await this.sendStatistics();
                            break;

                        default:
                            console.warn(`Unknown easter egg message type: ${message.type}`);
                    }
                } catch (error) {
                    ErrorHandler.handle(error, {
                        operation: 'handleEasterEggMessage',
                        module: 'EasterEggWebviewController',
                        showToUser: false,
                        logLevel: 'error'
                    });
                }
            })
        );
    }

    /**
     * 发送统计信息
     */
    private async sendStatistics(): Promise<void> {
        if (!this.panel) return;

        try {
            const stats = this.characterManager.getStatistics();
            const statsText = `Characters: ${stats.totalCharacters} | Favorites: ${stats.favorites}`;

            await this.panel.webview.postMessage({
                type: 'updateStats',
                payload: { statsText }
            });
        } catch (error) {
            console.error('Failed to send statistics:', error);
        }
    }

    /**
     * 处理主题变化
     */
    private async handleThemeChange(): Promise<void> {
        if (!this.panel) return;

        try {
            await this.panel.webview.postMessage({
                type: EasterEggMessageType.THEME_CHANGED,
                payload: {
                    isDark: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
                }
            });
        } catch (error) {
            console.error('Failed to handle theme change:', error);
        }
    }

    /**
     * 清理资源
     */
    private cleanup(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        this.panel = undefined;
        console.log('🧹 EasterEggController: Cleaned up');
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
        console.log('EasterEggController: Disposed');
    }
}