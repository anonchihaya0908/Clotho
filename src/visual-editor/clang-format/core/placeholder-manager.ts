/**
 * 增强版占位符管理器 - 集成平滑过渡功能
 * 演示如何将新的过渡系统集成到现有管理器中
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
    BaseManager,
    ManagerContext,
    WebviewMessage,
} from '../../../common/types';
import { SmoothTransitionManager } from './smooth-transition-manager';
import { TransitionReason } from './transition-coordinator';

/**
 * 事件数据接口
 */
interface EventData {
    reason?: TransitionReason;
    animated?: boolean;
    duration?: number;
    error?: string;
}

/**
 * 增强版占位符 Webview 管理器
 */
export class EnhancedPlaceholderManager implements BaseManager {
    readonly name = 'EnhancedPlaceholderManager';

    private panel: vscode.WebviewPanel | undefined;
    private context!: ManagerContext;
    private disposables: vscode.Disposable[] = [];
    private characterImagePaths: string[] = [];
    private transitionManager: SmoothTransitionManager;
    private isPrepared = false;

    constructor(private extensionUri: vscode.Uri) {
        this.transitionManager = new SmoothTransitionManager(extensionUri);
    }

    async initialize(context: ManagerContext): Promise<void> {
        this.context = context;
        this.loadCharacterImagePaths();
        this.setupEventListeners();
    }

    /**
     * 获取状态信息
     */
    getStatus(): { isInitialized: boolean; isHealthy: boolean; lastActivity: Date; errorCount: number } {
        return {
            isInitialized: !!this.context,
            isHealthy: true,
            lastActivity: new Date(),
            errorCount: 0,
        };
    }

    /**
     * 设置事件监听器，支持新的过渡事件
     */
    private setupEventListeners(): void {
        // 原有事件监听器
        this.context.eventBus.on('preview-closed', () => {
            this.createPlaceholder();
        });

        // 新的过渡事件监听器
        this.context.eventBus.on('placeholder-prepare-requested', (data: EventData) => {
            this.preparePlaceholder(data.reason || TransitionReason.USER_CLOSED_TAB);
        });

        this.context.eventBus.on('placeholder-show-requested', (data: EventData) => {
            this.showPlaceholder(data.reason || TransitionReason.USER_CLOSED_TAB, data.animated);
        });

        this.context.eventBus.on('placeholder-hide-requested', (data: EventData) => {
            this.hidePlaceholder(data.animated);
        });

        this.context.eventBus.on('placeholder-fadein-requested', (data: EventData) => {
            this.fadeIn(data.duration);
        });

        this.context.eventBus.on('placeholder-fadeout-requested', (data: EventData) => {
            this.fadeOut(data.duration);
        });

        this.context.eventBus.on('placeholder-cleanup-requested', () => {
            this.cleanup();
        });

        this.context.eventBus.on('placeholder-show-error', (data: EventData) => {
            this.showError(data.error || 'Unknown error');
        });
    }

    /**
     * 准备占位符（创建但不显示）
     */
    private async preparePlaceholder(reason: TransitionReason): Promise<void> {
        if (this.panel) {
            return; // 已经存在
        }

        try {
            // 创建面板但设置为不可见
            this.panel = vscode.window.createWebviewPanel(
                'clangFormatPlaceholder',
                '实时代码预览已关闭',
                {
                    viewColumn: vscode.ViewColumn.Two,
                    preserveFocus: true,
                },
                this.getWebviewOptions(),
            );

            // 注入过渡样式
            this.transitionManager.injectTransitionStyles(this.panel.webview);

            // 更新内容但保持不可见状态
            this.updatePlaceholderContent(reason, false);
            this.setupPanelEventListeners();

            // 使用过渡管理器准备 webview
            this.transitionManager.prepareWebview(this.panel.webview);
            this.isPrepared = true;

            // 通知准备完成
            this.context.eventBus.emit('placeholder-prepared');

            console.log('PlaceholderManager: Placeholder prepared (hidden)');
        } catch (error) {
            console.error('PlaceholderManager: Failed to prepare placeholder', error);
        }
    }

    /**
     * 显示占位符
     */
    private async showPlaceholder(reason: TransitionReason, animated: boolean = true): Promise<void> {
        if (!this.panel) {
            // 如果未准备，直接创建
            await this.createPlaceholder(reason, animated);
            return;
        }

        if (animated) {
            // 显示加载状态
            this.transitionManager.showLoading(this.panel.webview, 'Preparing placeholder...');

            // 启动动画
            this.transitionManager.animatePlaceholder(this.panel.webview, true);

            // 隐藏加载状态
            setTimeout(() => {
                if (this.panel) {
                    this.transitionManager.hideLoading(this.panel.webview);
                }
            }, 200);
        }

        // 显示面板
        this.panel.reveal(vscode.ViewColumn.Two, false);

        console.log('PlaceholderManager: Placeholder shown');
    }

    /**
     * 隐藏占位符
     */
    private async hidePlaceholder(animated: boolean = true): Promise<void> {
        if (!this.panel) {
            return;
        }

        if (animated) {
            this.transitionManager.animatePlaceholder(this.panel.webview, false);

            // 延迟隐藏面板
            setTimeout(() => {
                if (this.panel) {
                    this.panel.dispose();
                    this.panel = undefined;
                }
            }, 400);
        } else {
            this.panel.dispose();
            this.panel = undefined;
        }

        console.log('PlaceholderManager: Placeholder hidden');
    }

    /**
     * 淡入效果
     */
    private async fadeIn(duration: number = 300): Promise<void> {
        if (this.panel) {
            await this.transitionManager.fadeIn(this.panel.webview, { duration, easing: 'ease-in' });
        }
    }

    /**
     * 淡出效果
     */
    private async fadeOut(duration: number = 300): Promise<void> {
        if (this.panel) {
            await this.transitionManager.fadeOut(this.panel.webview, { duration, easing: 'ease-out' });
        }
    }

    /**
     * 显示错误状态
     */
    private showError(error: string): void {
        if (!this.panel) {
            // 创建错误占位符
            this.createErrorPlaceholder(error);
            return;
        }

        // 更新现有面板为错误状态
        const errorContent = this.generateErrorContent(error);
        this.panel.webview.html = this.transitionManager.generateTransitionHTML(errorContent);
    }

    /**
     * 清理占位符
     */
    private cleanup(): void {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
        this.isPrepared = false;
        this.transitionManager.reset();
    }

    /**
     * 创建占位符（兼容原有接口）
     */
    async createPlaceholder(reason?: TransitionReason, animated: boolean = true): Promise<void> {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Two, false);
            return;
        }

        try {
            this.panel = vscode.window.createWebviewPanel(
                'clangFormatPlaceholder',
                '实时代码预览已关闭',
                {
                    viewColumn: vscode.ViewColumn.Two,
                    preserveFocus: true,
                },
                this.getWebviewOptions(),
            );

            // 注入过渡样式
            this.transitionManager.injectTransitionStyles(this.panel.webview);

            this.updatePlaceholderContent(reason || TransitionReason.USER_CLOSED_TAB, animated);
            this.setupPanelEventListeners();

            if (animated) {
                // 启动入场动画
                this.transitionManager.animatePlaceholder(this.panel.webview, true);
            }

            console.log('PlaceholderManager: Placeholder created');
        } catch (error) {
            console.error('PlaceholderManager: Failed to create placeholder', error);
        }
    }

    /**
     * 创建错误占位符
     */
    private async createErrorPlaceholder(error: string): Promise<void> {
        if (this.panel) {
            this.panel.dispose();
        }

        this.panel = vscode.window.createWebviewPanel(
            'clangFormatError',
            '预览错误',
            {
                viewColumn: vscode.ViewColumn.Two,
                preserveFocus: true,
            },
            this.getWebviewOptions(),
        );

        const errorContent = this.generateErrorContent(error);
        this.panel.webview.html = this.transitionManager.generateTransitionHTML(errorContent);
        this.setupPanelEventListeners();
    }

    /**
     * 更新占位符内容
     */
    private updatePlaceholderContent(reason: TransitionReason, animated: boolean = true): void {
        if (!this.panel) return;

        const content = this.generatePlaceholderContent(reason);
        this.panel.webview.html = this.transitionManager.generateTransitionHTML(content);
    }

    /**
     * 生成占位符内容
     */
    private generatePlaceholderContent(reason: TransitionReason): string {
        const randomImage = this.getRandomCharacterImage();
        const { title, description } = this.getContentByReason(reason);

        return `
      <div class="placeholder-content">
        <div class="placeholder-container">
          <div class="placeholder-icon">
            <img src="${randomImage}" alt="Character" style="width: 120px; height: 120px; object-fit: contain;" />
          </div>
          <h2 class="placeholder-title">${title}</h2>
          <p class="placeholder-description">${description}</p>
          <button class="reopen-button" id="reopenButton">
            🔄 重新打开预览
          </button>
          <div class="placeholder-footer">
            <p>💡 提示：双击配置项可快速预览效果</p>
          </div>
        </div>
      </div>
    `;
    }

    /**
     * 生成错误内容
     */
    private generateErrorContent(error: string): string {
        return `
      <div class="error-content">
        <div class="error-container">
          <div class="error-icon">⚠️</div>
          <h2 class="error-title">预览生成失败</h2>
          <p class="error-description">${error}</p>
          <button class="retry-button" id="retryButton">
            🔄 重试
          </button>
        </div>
      </div>
    `;
    }

    /**
     * 根据关闭原因获取内容
     */
    private getContentByReason(reason: TransitionReason): { title: string; description: string } {
        switch (reason) {
            case TransitionReason.USER_CLOSED_TAB:
                return {
                    title: '实时代码预览已关闭',
                    description: '您关闭了预览标签页，但可以随时重新打开继续编辑配置。',
                };

            case TransitionReason.FORMAT_ERROR:
                return {
                    title: '预览暂时不可用',
                    description: 'clang-format 处理时发生错误，请检查配置后重试。',
                };

            case TransitionReason.CONFIG_CHANGED:
                return {
                    title: '正在准备新预览',
                    description: '配置已更新，新的预览正在生成中...',
                };

            default:
                return {
                    title: '实时代码预览已关闭',
                    description: '点击下方按钮重新打开预览，继续编辑您的 clang-format 配置。',
                };
        }
    }

    /**
     * 加载角色图片路径
     */
    private loadCharacterImagePaths(): void {
        try {
            // 模拟加载角色图片路径的逻辑
            const webviewsPath = path.join(this.extensionUri.fsPath, 'webviews');
            this.characterImagePaths = [
                'character1.png',
                'character2.png',
                'character3.png',
            ]; // 简化实现
        } catch (error) {
            console.warn('Failed to load character images:', error);
            this.characterImagePaths = [];
        }
    }

    /**
     * 获取随机角色图片
     */
    private getRandomCharacterImage(): string {
        if (this.characterImagePaths.length === 0) {
            return '🎭'; // 默认表情符号
        }

        const randomIndex = Math.floor(Math.random() * this.characterImagePaths.length);
        return this.characterImagePaths[randomIndex];
    }

    /**
     * 获取 Webview 选项
     */
    private getWebviewOptions(): vscode.WebviewOptions & vscode.WebviewPanelOptions {
        return {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'webviews'),
            ],
        };
    }

    /**
     * 设置面板事件监听器
     */
    private setupPanelEventListeners(): void {
        if (!this.panel) return;

        this.panel.onDidDispose(() => {
            this.panel = undefined;
            this.isPrepared = false;
        });

        this.panel.webview.onDidReceiveMessage(
            (message: WebviewMessage) => {
                switch (message.type) {
                    case 'reopen-preview':
                        this.context.eventBus.emit('preview-requested');
                        break;
                    case 'webview-ready':
                        console.log('PlaceholderManager: Webview ready');
                        break;
                }
            },
            undefined,
            this.disposables,
        );
    }

    /**
     * 销毁管理器
     */
    async dispose(): Promise<void> {
        this.cleanup();
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
