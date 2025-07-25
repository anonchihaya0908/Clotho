/**
 * 防抖集成模块
 * 将防抖机制集成到现有的ClangFormat coordinator中
 */

import * as vscode from 'vscode';
import { DebounceManager } from './debounce-manager';
import { TransitionManager } from './transition-manager';
import { errorHandler, ErrorHandler } from '../../../common/error-handler';
import { BaseManager, ManagerContext, ManagerStatus } from '../../../common/types';
import { PreviewEditorManager } from './preview-manager';
import { PlaceholderWebviewManager } from './placeholder-manager';

/**
 * 防抖集成器
 */
export class DebounceIntegration implements BaseManager {
  readonly name = 'DebounceIntegration';

  private debounceManager: DebounceManager;
  private transitionManager: TransitionManager;
  private isEnabled: boolean = true;
  private context!: ManagerContext;

  constructor(
    private extensionUri: vscode.Uri,
    private previewManager: PreviewEditorManager,
    private placeholderManager: PlaceholderWebviewManager,
  ) {
    this.debounceManager = new DebounceManager();
    this.transitionManager = new TransitionManager(extensionUri);
  }
  getStatus(): ManagerStatus {
    throw new Error('Method not implemented.');
  }

  async initialize(context: ManagerContext): Promise<void> {
    this.context = context;
  }

  /**
   * 防抖的预览关闭处理
   */
  createDebouncedPreviewCloseHandler(): () => Promise<void> {
    return this.debounceManager.debounce(
      'preview-close-handler',
      async () => {
        await this.previewManager.closePreview();

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

  /**
   * 防抖的预览重新打开处理
   */
  createDebouncedPreviewReopenHandler(): () => Promise<void> {
    return this.debounceManager.debounce(
      'preview-reopen-handler',
      async () => {
        console.log('[DebounceIntegration] 开始处理预览重新打开');
        this.placeholderManager.disposePanel();

        try {
          console.log('[DebounceIntegration] 尝试使用转换管理器打开预览');
          await this.transitionManager.switchToPreview(async () => {
            await this.previewManager.openPreview();
            return this.context.stateManager.getState().previewEditor!;
          });
          console.log('[DebounceIntegration] 转换管理器预览打开成功');
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
          console.log('[DebounceIntegration] 降级处理完成');
        }
      },
      {
        delay: 100,
        leading: true,
        trailing: false,
      },
    );
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
      isEnabled: this.isEnabled,
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
