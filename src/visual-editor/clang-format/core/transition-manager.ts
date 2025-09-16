/**
 * 过渡管理器
 * 处理Webview切换的并发控制和流程编排
 */

import * as vscode from 'vscode';
import { errorHandler } from '../../../common/error-handler';
import { createModuleLogger } from '../../../common/logger/unified-logger';
import { UI_CONSTANTS } from '../../../common/constants';
import { DebounceManager } from './debounce-manager';

/**
 * 过渡状态枚举
 */
export enum TransitionState {
  IDLE = 'idle',
  SWITCHING_TO_PREVIEW = 'switching-to-preview',
  SWITCHING_TO_EASTER_EGG = 'switching-to-easter-egg',
  LOADING_CONTENT = 'loading-content',
}

/**
 * 过渡配置选项
 */
export interface TransitionOptions {
  maxTransitionTime: number;
}

/**
 * 过渡管理器
 */
export class TransitionManager {
  private currentState: TransitionState = TransitionState.IDLE;

  public getCurrentState(): TransitionState {
    return this.currentState;
  }
  private debounceManager: DebounceManager;
  private transitionStartTime: number = 0;
  private readonly logger = createModuleLogger('TransitionManager');

  private readonly defaultOptions: TransitionOptions = {
    maxTransitionTime: UI_CONSTANTS.MAX_TRANSITION_TIME, // Use centralized transition time constant
  };

  constructor(
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
    return await this.debounceManager.withLock('webview-easter-egg-transition', () => {
      return this.performEasterEggTransition(onContentReady);
    });
  }

  /**
   * 切换到预览模式
   */
  async switchToPreview(
    onPreviewReady: () => Promise<vscode.TextEditor>,
  ): Promise<vscode.TextEditor> {
    return await this.debounceManager.withLock('webview-preview-transition', () => {
      return this.performPreviewTransition(onPreviewReady);
    });
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

      this.currentState = TransitionState.LOADING_CONTENT;
      const contentPanel = await onContentReady();

      await this.waitForContentLoaded(contentPanel);

      this.currentState = TransitionState.IDLE;
      return contentPanel;
    } catch (error) {
      this.currentState = TransitionState.IDLE;

      errorHandler.handle(error, {
        operation: 'performEasterEggTransition',
        module: 'TransitionManager',
        showToUser: false,
        logLevel: 'error',
      });

      throw error;
    }
  }

  /**
   * 等待 content-ready 消息
   */
  private async waitForContentLoaded(panel: vscode.WebviewPanel): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        disposable.dispose();
        reject(new Error('Timeout waiting for webview content to be ready.'));
      }, this.options.maxTransitionTime || UI_CONSTANTS.MAX_TRANSITION_TIME);

      const disposable = panel.webview.onDidReceiveMessage((message) => {
        if (message.type === 'content-ready') {
          clearTimeout(timeout);
          disposable.dispose();
          resolve();
        }
      });
    });
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

      const previewEditor = await onPreviewReady();

      this.currentState = TransitionState.IDLE;
      return previewEditor;
    } catch (error) {
      this.currentState = TransitionState.IDLE;

      errorHandler.handle(error, {
        operation: 'performPreviewTransition',
        module: 'TransitionManager',
        showToUser: false,
        logLevel: 'error',
      });

      throw error;
    }
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
    this.debounceManager.cancelAll();
    this.debounceManager.releaseAllLocks();

    this.logger.debug('Forced stop');
  }

  /**
   * 获取过渡统计信息
   */
  getStats(): {
    currentState: TransitionState;
    isTransitioning: boolean;
    elapsedTime: number;
    debounceStatus: unknown;
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

    this.logger.debug('Disposed');
  }
}
