/**
 * 防抖集成模块
 * 将防抖机制集成到现有的ClangFormat coordinator中
 */

import { errorHandler } from '../../../common/error-handler';
import { createModuleLogger } from '../../../common/logger/unified-logger';
import { BaseManager, ManagerContext, ManagerStatus } from '../../../common/types';
import { UI_CONSTANTS } from '../../../common/constants';
import { DebounceManager } from './debounce-manager';
import { PreviewEditorManager } from './preview-manager';

/**
 * 防抖集成器
 */
export class DebounceIntegration implements BaseManager {
  private readonly logger = createModuleLogger('DebounceIntegration');

  readonly name = 'DebounceIntegration';

  private debounceManager: DebounceManager;
  private isEnabled: boolean = true;
  private context!: ManagerContext;

  // Cache debounce handlers to avoid recreation
  private _previewCloseHandler?: () => Promise<void>;
  private _previewReopenHandler?: () => Promise<void>;

  constructor(
    private previewManagerGetter: (() => PreviewEditorManager) | PreviewEditorManager,
  ) {
    this.debounceManager = new DebounceManager();
  }

  // Lazy getters for dependencies
  private get previewManager(): PreviewEditorManager {
    return typeof this.previewManagerGetter === 'function'
      ? this.previewManagerGetter()
      : this.previewManagerGetter;
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
        },
        {
          delay: UI_CONSTANTS.QUICK_DEBOUNCE_DELAY, // Use centralized quick debounce delay
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
          // Check if preview already exists to avoid duplication
          const state = this.context?.stateManager?.getState();
          const previewMode = state?.['previewMode'];
          const previewEditorVal = state?.['previewEditor'];
          const isEditorOpen = (() => {
            if (!previewEditorVal || typeof previewEditorVal !== 'object') { return false; }
            const doc = (previewEditorVal as { document?: { isClosed?: boolean } }).document;
            return !!(doc && doc.isClosed === false);
          })();
          if (previewMode === 'open' && isEditorOpen) {
            this.logger.debug('Preview already exists and is open, skipping creation', {
              module: 'DebounceIntegration',
              operation: 'createDebouncedPreviewReopenHandler',
              previewMode: previewMode,
            });
            return;
          }

          try {
            await this.previewManager.openPreview();
          } catch (error) {
            this.logger.error('Transition manager failed, using fallback', error as Error, {
              module: 'DebounceIntegration',
              operation: 'debouncedPreviewReopen'
            });
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
          delay: UI_CONSTANTS.DEBOUNCE_DELAY, // Use centralized debounce delay
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
  getStats(): { debounceManager: unknown; isEnabled: boolean } {
    return {
      debounceManager: this.debounceManager.getStatus(),
      isEnabled: this.isEnabled,
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.debounceManager.dispose();
  }
}
