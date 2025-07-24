/**
 * 过渡管理器
 * 处理webview切换过程中的稳定性和流畅性
 */

import * as vscode from "vscode";
import { DebounceManager } from "./debounce-manager";
import { ErrorHandler } from "../../../common/error-handler";

/**
 * 过渡状态枚举
 */
export enum TransitionState {
  IDLE = "idle",
  SWITCHING_TO_PREVIEW = "switching-to-preview",
  SWITCHING_TO_EASTER_EGG = "switching-to-easter-egg",
  CREATING_PLACEHOLDER = "creating-placeholder",
  LOADING_CONTENT = "loading-content",
}

/**
 * 过渡配置选项
 */
export interface TransitionOptions {
  placeholderDelay: number;
  contentLoadDelay: number;
  maxTransitionTime: number;
  enablePlaceholder: boolean;
}

/**
 * 过渡管理器
 */
export class TransitionManager {
  private currentState: TransitionState = TransitionState.IDLE;
  private debounceManager: DebounceManager;
  private placeholderPanel: vscode.WebviewPanel | undefined;
  private transitionStartTime: number = 0;

  private readonly defaultOptions: TransitionOptions = {
    placeholderDelay: 50, // 50ms内创建占位符
    contentLoadDelay: 200, // 200ms后加载实际内容
    maxTransitionTime: 2000, // 最大过渡时间2秒
    enablePlaceholder: true,
  };

  constructor(
    private extensionUri: vscode.Uri,
    private options: Partial<TransitionOptions> = {},
  ) {
    this.debounceManager = new DebounceManager();
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * 切换到彩蛋模式
   */
  async switchToEasterEgg(
    onContentReady: () => Promise<vscode.WebviewPanel>,
  ): Promise<vscode.WebviewPanel> {
    const switchOperation = this.debounceManager.debounce(
      "switch-to-easter-egg",
      async () => {
        return await this.debounceManager.withLock(
          "webview-transition",
          async () => {
            return await this.performEasterEggTransition(onContentReady);
          },
        );
      },
      { delay: 10, leading: true }, // 立即执行，但防止重复调用
    );

    return await switchOperation();
  }

  /**
   * 切换到预览模式
   */
  async switchToPreview(
    onPreviewReady: () => Promise<vscode.TextEditor>,
  ): Promise<vscode.TextEditor> {
    const switchOperation = this.debounceManager.debounce(
      "switch-to-preview",
      async () => {
        return await this.debounceManager.withLock(
          "webview-transition",
          async () => {
            return await this.performPreviewTransition(onPreviewReady);
          },
        );
      },
      { delay: 10, leading: true },
    );

    return await switchOperation();
  }

  /**
   * 执行彩蛋过渡
   */
  private async performEasterEggTransition(
    onContentReady: () => Promise<vscode.WebviewPanel>,
  ): Promise<vscode.WebviewPanel> {
    try {
      this.currentState = TransitionState.SWITCHING_TO_EASTER_EGG;
      this.transitionStartTime = Date.now();

      console.log("TransitionManager: Starting easter egg transition");

      // 第一步：立即创建占位符（防止真空效应）
      if (this.options.enablePlaceholder) {
        this.currentState = TransitionState.CREATING_PLACEHOLDER;
        await this.createPlaceholder();
      }

      // 第二步：异步加载实际内容
      this.currentState = TransitionState.LOADING_CONTENT;
      const contentPanel = await this.loadEasterEggContent(onContentReady);

      // 确保面板在正确的位置显示
      contentPanel.reveal(vscode.ViewColumn.Two, true);

      // 第三步：替换占位符
      await this.replacePlaceholderWithContent(contentPanel);

      this.currentState = TransitionState.IDLE;

      const transitionTime = Date.now() - this.transitionStartTime;
      console.log(
        `TransitionManager: Easter egg transition completed in ${transitionTime}ms`,
      );

      return contentPanel;
    } catch (error) {
      this.currentState = TransitionState.IDLE;
      this.cleanupPlaceholder();

      ErrorHandler.handle(error, {
        operation: "performEasterEggTransition",
        module: "TransitionManager",
        showToUser: false,
        logLevel: "error",
      });

      throw error;
    }
  }

  /**
   * 执行预览过渡
   */
  private async performPreviewTransition(
    onPreviewReady: () => Promise<vscode.TextEditor>,
  ): Promise<vscode.TextEditor> {
    try {
      this.currentState = TransitionState.SWITCHING_TO_PREVIEW;
      this.transitionStartTime = Date.now();

      console.log("TransitionManager: Starting preview transition");

      // 清理彩蛋webview
      this.cleanupPlaceholder();

      // 创建预览编辑器
      const previewEditor = await onPreviewReady();

      this.currentState = TransitionState.IDLE;

      const transitionTime = Date.now() - this.transitionStartTime;
      console.log(
        `TransitionManager: Preview transition completed in ${transitionTime}ms`,
      );

      return previewEditor;
    } catch (error) {
      this.currentState = TransitionState.IDLE;

      ErrorHandler.handle(error, {
        operation: "performPreviewTransition",
        module: "TransitionManager",
        showToUser: false,
        logLevel: "error",
      });

      throw error;
    }
  }

  /**
   * 创建占位符webview
   */
  private async createPlaceholder(): Promise<void> {
    try {
      // 如果已经有占位符，先清理
      this.cleanupPlaceholder();

      // 创建极简的占位符webview
      this.placeholderPanel = vscode.window.createWebviewPanel(
        "easterEggPlaceholder",
        "Loading Character...",
        vscode.ViewColumn.Two,
        {
          enableScripts: false,
          retainContextWhenHidden: false,
        },
      );

      // 设置占位符内容
      this.placeholderPanel.webview.html = this.generatePlaceholderHTML();

      console.log("TransitionManager: Placeholder created");
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: "createPlaceholder",
        module: "TransitionManager",
        showToUser: false,
        logLevel: "error",
      });
    }
  }

  /**
   * 加载彩蛋内容
   */
  private async loadEasterEggContent(
    onContentReady: () => Promise<vscode.WebviewPanel>,
  ): Promise<vscode.WebviewPanel> {
    // 添加最小延迟，确保占位符有时间显示
    if (this.options.contentLoadDelay! > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.options.contentLoadDelay),
      );
    }

    // 检查过渡超时
    const elapsedTime = Date.now() - this.transitionStartTime;
    if (elapsedTime > this.options.maxTransitionTime!) {
      throw new Error(`Transition timeout after ${elapsedTime}ms`);
    }

    return await onContentReady();
  }

  /**
   * 用实际内容替换占位符
   */
  private async replacePlaceholderWithContent(
    contentPanel: vscode.WebviewPanel,
  ): Promise<void> {
    try {
      // 确保内容面板在正确的位置
      contentPanel.reveal(vscode.ViewColumn.Two);

      // 清理占位符
      this.cleanupPlaceholder();

      console.log("TransitionManager: Placeholder replaced with content");
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: "replacePlaceholderWithContent",
        module: "TransitionManager",
        showToUser: false,
        logLevel: "error",
      });
    }
  }

  /**
   * 生成占位符HTML
   */
  private generatePlaceholderHTML(): string {
    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Loading Character</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                    }
                    
                    .placeholder-container {
                        text-align: center;
                        opacity: 0;
                        animation: fadeIn 0.3s ease-in-out forwards;
                    }
                    
                    .placeholder-icon {
                        font-size: 48px;
                        margin-bottom: 16px;
                        animation: pulse 1.5s ease-in-out infinite;
                    }
                    
                    .placeholder-text {
                        font-size: 16px;
                        opacity: 0.8;
                    }
                    
                    @keyframes fadeIn {
                        to { opacity: 1; }
                    }
                    
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                    }
                </style>
            </head>
            <body>
                <div class="placeholder-container">
                    <div class="placeholder-icon">🎭</div>
                    <div class="placeholder-text">Loading character...</div>
                </div>
            </body>
            </html>
        `;
  }

  /**
   * 清理占位符
   */
  private cleanupPlaceholder(): void {
    if (this.placeholderPanel && !this.placeholderPanel.disposed) {
      this.placeholderPanel.dispose();
      this.placeholderPanel = undefined;
      console.log("TransitionManager: Placeholder cleaned up");
    }
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): TransitionState {
    return this.currentState;
  }

  /**
   * 检查是否正在过渡
   */
  isTransitioning(): boolean {
    return this.currentState !== TransitionState.IDLE;
  }

  /**
   * 强制停止过渡
   */
  forceStop(): void {
    this.currentState = TransitionState.IDLE;
    this.cleanupPlaceholder();
    this.debounceManager.cancelAll();
    this.debounceManager.releaseAllLocks();

    console.log("TransitionManager: Forced stop");
  }

  /**
   * 获取过渡统计信息
   */
  getStats(): {
    currentState: TransitionState;
    isTransitioning: boolean;
    elapsedTime: number;
    debounceStatus: any;
  } {
    return {
      currentState: this.currentState,
      isTransitioning: this.isTransitioning(),
      elapsedTime:
        this.transitionStartTime > 0
          ? Date.now() - this.transitionStartTime
          : 0,
      debounceStatus: this.debounceManager.getStatus(),
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.forceStop();
    this.debounceManager.dispose();

    console.log("TransitionManager: Disposed");
  }
}
