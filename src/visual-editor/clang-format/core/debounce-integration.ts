/**
 * 防抖集成模块
 * 将防抖机制集成到现有的ClangFormat coordinator中
 */

import { errorHandler } from '../../../common/error-handler';
import { logger } from '../../../common/logger';
import { BaseManager, ManagerContext, ManagerStatus } from '../../../common/types';
import { DebounceManager } from './debounce-manager';
import { PlaceholderWebviewManager } from './placeholder-manager';
import { PreviewEditorManager } from './preview-manager';
import { TransitionManager, TransitionState } from './transition-manager';

/**
 * 防抖集成器
 */
export class DebounceIntegration implements BaseManager {
  readonly name = 'DebounceIntegration';

  private debounceManager: DebounceManager;
  private transitionManager: TransitionManager;
  private isEnabled: boolean = true;
  private context!: ManagerContext;

  // 【新增】缓存防抖处理器，避免重复创建
  private _previewCloseHandler?: () => Promise<void>;
  private _previewReopenHandler?: () => Promise<void>;

  constructor(
    private previewManagerGetter: (() => PreviewEditorManager) | PreviewEditorManager,
    private placeholderManagerGetter: (() => PlaceholderWebviewManager) | PlaceholderWebviewManager,
  ) {
    this.debounceManager = new DebounceManager();
    this.transitionManager = new TransitionManager();
  }

  // Lazy getters for dependencies
  private get previewManager(): PreviewEditorManager {
    return typeof this.previewManagerGetter === 'function' 
      ? this.previewManagerGetter()
      : this.previewManagerGetter;
  }

  private get placeholderManager(): PlaceholderWebviewManager {
    return typeof this.placeholderManagerGetter === 'function'
      ? this.placeholderManagerGetter()
      : this.placeholderManagerGetter;
  }

  getStatus(): ManagerStatus {
    return {
      isInitialized: !!this.context,
      isHealthy: true,
      lastActivity: new Date(),
      errorCount: 0,
    };
  }

  async initialize(context: ManagerContext): Promise<void> {
    this.context = context;
  }

  /**
   * 防抖的预览关闭处理
   */
  createDebouncedPreviewCloseHandler(): () => Promise<void> {
    if (!this._previewCloseHandler) {
      this._previewCloseHandler = this.debounceManager.debounce(
        'preview-close-handler',
        async () => {
          await this.previewManager.closePreview();

          // 【新增】只有在编辑器可见且初始化完成时才创建占位符
          const state = this.context?.stateManager.getState();
          if (!state?.isVisible || !state?.isInitialized) {
            logger.debug('Editor is not visible or not initialized, skipping placeholder creation', {
              module: 'DebounceIntegration',
              operation: 'createDebouncedPreviewCloseHandler',
              isVisible: state?.isVisible,
              isInitialized: state?.isInitialized,
            });
            return;
          }

          if (!this.isEnabled) {
            await this.placeholderManager.createPlaceholder();
            return;
          }

          try {
            await this.transitionManager.switchToEasterEgg(async () => {
              await this.placeholderManager.createPlaceholder();
              return this.placeholderManager.getPlaceholderPanel()!;
            });
          } catch (error) {
            // 降级处理：直接创建占位符
            await this.placeholderManager.createPlaceholder();
          }
        },
        {
          delay: 50,
          leading: true,
          trailing: false,
        },
      );
    }
    return this._previewCloseHandler;
  }

  /**
   * 防抖的预览重新打开处理
   */
  createDebouncedPreviewReopenHandler(): () => Promise<void> {
    if (!this._previewReopenHandler) {
      this._previewReopenHandler = this.debounceManager.debounce(
        'preview-reopen-handler',
        async () => {
          // 【新增】检查预览是否已经存在，避免重复创建
          const state = this.context?.stateManager.getState();
          if (state?.previewMode === 'open' && state?.previewEditor && !state.previewEditor.document.isClosed) {
            logger.debug('Preview already exists and is open, skipping creation', {
              module: 'DebounceIntegration',
              operation: 'createDebouncedPreviewReopenHandler',
              previewMode: state.previewMode,
            });
            return;
          }

          // 【新增】额外的并发检查
          if (this.transitionManager.getCurrentState() !== TransitionState.IDLE) {
            logger.debug('Transition already in progress, skipping operation', {
              module: 'DebounceIntegration',
              operation: 'createDebouncedPreviewReopenHandler',
              currentState: this.transitionManager.getCurrentState(),
            });
            return;
          }

          this.placeholderManager.disposePanel();

          try {
            await this.transitionManager.switchToPreview(async () => {
              await this.previewManager.openPreview();
              return this.context.stateManager.getState().previewEditor!;
            });
          } catch (error) {
            console.error('[DebounceIntegration] 转换管理器失败，使用降级处理:', error);
            errorHandler.handle(error, {
              operation: 'debouncedPreviewReopen',
              module: 'DebounceIntegration',
              showToUser: false,
              logLevel: 'error',
            });
            // 降级处理
            await this.previewManager.openPreview();
          }
        },
        {
          delay: 300, // 增加延迟，避免快速重复调用
          leading: true,
          trailing: false,
        },
      );
    }
    return this._previewReopenHandler;
  }

  /**
   * 启用/禁用防抖功能
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * 获取统计信息
   */
  getStats(): any {
    return {
      debounceManager: this.debounceManager.getStatus(),
      transitionManager: this.transitionManager.getStats(),
      isEnabled: this.isEnabled,
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.debounceManager.dispose();
    this.transitionManager.dispose();
  }
}
