/**
 * 防抖集成模块
 * 将防抖机制集成到现有的ClangFormat coordinator中
 */

import * as vscode from 'vscode';
import { DebounceManager } from './debounce-manager';
import { TransitionManager } from './transition-manager';
import { ErrorHandler } from '../../../common/error-handler';

/**
 * 防抖集成器
 */
export class DebounceIntegration {
    private debounceManager: DebounceManager;
    private transitionManager: TransitionManager;
    private isEnabled: boolean = true;

    constructor(private extensionUri: vscode.Uri) {
        this.debounceManager = new DebounceManager();
        this.transitionManager = new TransitionManager(extensionUri);
    }

    /**
     * 防抖的预览关闭处理
     */
    createDebouncedPreviewCloseHandler(
        originalHandler: () => Promise<void>
    ): () => Promise<void> {
        return this.debounceManager.debounce(
            'preview-close-handler',
            async () => {
                if (!this.isEnabled) {
                    await originalHandler();
                    return;
                }

                console.log('🎭 DebounceIntegration: Handling preview close with debounce');

                try {
                    // 使用过渡管理器创建占位符webview
                    await this.transitionManager.switchToEasterEgg(async () => {
                        // 创建一个简单的测试彩蛋webview
                        return this.createTestEasterEggWebview();
                    });

                    console.log('✅ DebounceIntegration: Easter egg transition completed');

                } catch (error) {
                    console.error('❌ DebounceIntegration: Easter egg transition failed, falling back to original handler');
                    await originalHandler();
                }
            },
            {
                delay: 50,        // 50ms防抖延迟
                leading: true,    // 立即执行第一次
                trailing: false   // 不执行尾随调用
            }
        );
    }

    /**
     * 防抖的预览重新打开处理
     */
    createDebouncedPreviewReopenHandler(
        originalHandler: () => Promise<vscode.TextEditor>
    ): () => Promise<vscode.TextEditor> {
        return this.debounceManager.debounce(
            'preview-reopen-handler',
            async () => {
                console.log('📄 DebounceIntegration: Handling preview reopen with debounce');

                try {
                    // 使用过渡管理器切换回预览模式
                    return await this.transitionManager.switchToPreview(async () => {
                        return await originalHandler();
                    });

                } catch (error) {
                    ErrorHandler.handle(error, {
                        operation: 'debouncedPreviewReopen',
                        module: 'DebounceIntegration',
                        showToUser: false,
                        logLevel: 'error'
                    });
                    throw error;
                }
            },
            {
                delay: 100,
                leading: true,
                trailing: false
            }
        );
    }

    /**
     * 创建测试用的彩蛋webview
     */
    private async createTestEasterEggWebview(): Promise<vscode.WebviewPanel> {
        const panel = vscode.window.createWebviewPanel(
            'testEasterEgg',
            '🎭 Test Easter Egg',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.generateTestEasterEggHTML();

        // 监听来自webview的消息
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'reopen-preview':
                    console.log('🔄 DebounceIntegration: Received reopen preview request');
                    // 这里可以触发预览重新打开
                    vscode.window.showInformationMessage('Preview reopen requested (test mode)');
                    break;

                case 'switch-character':
                    console.log('🎲 DebounceIntegration: Received switch character request');
                    // 这里可以切换角色
                    await this.updateTestCharacter(panel);
                    break;
            }
        });

        return panel;
    }

    /**
     * 生成测试彩蛋HTML
     */
    private generateTestEasterEggHTML(): string {
        const characters = ['🎭', '🎪', '🎨', '🎯', '🎲', '🎸', '🎺', '🎻'];
        const randomCharacter = characters[Math.floor(Math.random() * characters.length)];

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Test Easter Egg</title>
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                    }
                    
                    .character-container {
                        text-align: center;
                        animation: fadeIn 0.5s ease-in-out;
                    }
                    
                    .character-icon {
                        font-size: 120px;
                        margin-bottom: 20px;
                        cursor: pointer;
                        transition: transform 0.3s ease;
                    }
                    
                    .character-icon:hover {
                        transform: scale(1.1) rotate(10deg);
                    }
                    
                    .character-name {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 10px;
                    }
                    
                    .character-description {
                        font-size: 16px;
                        opacity: 0.8;
                        margin-bottom: 30px;
                        max-width: 300px;
                        line-height: 1.5;
                    }
                    
                    .action-buttons {
                        display: flex;
                        gap: 15px;
                        flex-wrap: wrap;
                        justify-content: center;
                    }
                    
                    .action-button {
                        padding: 10px 20px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background-color 0.2s ease;
                    }
                    
                    .action-button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    
                    .action-button.secondary {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }
                    
                    .action-button.secondary:hover {
                        background: var(--vscode-button-secondaryHoverBackground);
                    }
                    
                    .tips {
                        margin-top: 30px;
                        padding: 15px;
                        background: var(--vscode-textBlockQuote-background);
                        border-left: 4px solid var(--vscode-textBlockQuote-border);
                        border-radius: 4px;
                        max-width: 400px;
                    }
                    
                    .tips-title {
                        font-weight: bold;
                        margin-bottom: 8px;
                        color: var(--vscode-textPreformat-foreground);
                    }
                    
                    .tips-list {
                        font-size: 14px;
                        line-height: 1.4;
                        opacity: 0.9;
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
                </style>
            </head>
            <body>
                <div class="character-container">
                    <div class="character-icon pulse" onclick="switchCharacter()">${randomCharacter}</div>
                    <div class="character-name">Test Character</div>
                    <div class="character-description">
                        This is a test easter egg to demonstrate the debounce mechanism. 
                        The transition should be smooth without any flickering!
                    </div>
                    
                    <div class="action-buttons">
                        <button class="action-button" onclick="reopenPreview()">
                            📄 重新打开预览编辑器
                        </button>
                        <button class="action-button secondary" onclick="switchCharacter()">
                            🎲 换一个角色
                        </button>
                    </div>
                    
                    <div class="tips">
                        <div class="tips-title">💡 提示:</div>
                        <div class="tips-list">
                            • 数据预览编辑器会自动关闭时显示彩蛋<br>
                            • 快速切换不会造成界面抖动<br>
                            • 点击角色图标可以切换角色<br>
                            • 防抖机制确保操作流畅性
                        </div>
                    </div>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function reopenPreview() {
                        console.log('Requesting preview reopen...');
                        vscode.postMessage({
                            type: 'reopen-preview'
                        });
                    }
                    
                    function switchCharacter() {
                        console.log('Requesting character switch...');
                        vscode.postMessage({
                            type: 'switch-character'
                        });
                    }
                    
                    // 添加一些交互效果
                    document.addEventListener('DOMContentLoaded', function() {
                        console.log('Test Easter Egg loaded successfully!');
                        
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
     * 更新测试角色
     */
    private async updateTestCharacter(panel: vscode.WebviewPanel): Promise<void> {
        const characters = ['🎭', '🎪', '🎨', '🎯', '🎲', '🎸', '🎺', '🎻', '🎮', '🎬'];
        const randomCharacter = characters[Math.floor(Math.random() * characters.length)];

        // 发送更新消息到webview
        await panel.webview.postMessage({
            type: 'character-updated',
            character: randomCharacter
        });

        console.log(`🎭 DebounceIntegration: Character updated to ${randomCharacter}`);
    }

    /**
     * 启用/禁用防抖功能
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        console.log(`DebounceIntegration: ${enabled ? 'Enabled' : 'Disabled'}`);
    }

    /**
     * 获取统计信息
     */
    getStats(): any {
        return {
            debounceManager: this.debounceManager.getStatus(),
            transitionManager: this.transitionManager.getStats(),
            isEnabled: this.isEnabled
        };
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.debounceManager.dispose();
        this.transitionManager.dispose();
        console.log('DebounceIntegration: Disposed');
    }
}