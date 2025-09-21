import * as vscode from 'vscode';
import { createModuleLogger } from '../../../common/logger/unified-logger';
import { StateChangeEvent } from '../../../common/types';
import { BoundedHistory } from '../../../common/utils/memory';
import { PERFORMANCE } from '../../../common/constants';
import { VisualEditorState } from '../../types';
import { DEFAULT_CLANG_FORMAT_CONFIG } from '../data/clang-format-options-database';
import { ClangFormatConfig } from '../../../common/types/clang-format-shared';
import { EventBus } from '../messaging/event-bus';

type StateSnapshot = {
  state: VisualEditorState;
  timestamp: number;
  source: string;
};

/**
 * 编辑器状态管理器
 * 负责维护、更新和通知编辑器的统一状态
 */
export class EditorStateManager implements vscode.Disposable {
  private state: VisualEditorState;
  private stateHistory = new BoundedHistory<StateSnapshot>(PERFORMANCE.STATE_HISTORY_MAX_SIZE);
  private disposables: vscode.Disposable[] = [];
  private readonly moduleName = 'VisualEditorStateManager';
  private readonly logger = createModuleLogger('EditorStateManager');

  constructor(private eventBus: EventBus) {
    this.state = this.createInitialState();
  }

  /**
   * 获取当前状态的只读副本
   */
  getState(): Readonly<VisualEditorState> {
    return Object.freeze({ ...this.state });
  }

  /**
   * 更新状态。这是一个原子操作，确保状态转换的有效性。
   * @param updates 部分状态更新
   * @param source 状态更新的来源
   */
  async updateState(
    updates: Partial<VisualEditorState>,
    source: string,
  ): Promise<void> {
    const oldState = { ...this.state };
    const newState = { ...this.state, ...updates };

    if (!this.validateStateTransition(oldState, newState)) {
      const error = new Error(
        `Invalid state transition from source: ${source}`,
      );
      this.logger.error(error.message, error, {
        module: this.moduleName,
        operation: 'updateState',
        context: { from: oldState, to: newState },
      });
      return; // 阻止无效的状态更新
    }

    // 保存历史记录
    this.saveSnapshot(oldState, source);

    // 应用新状态
    this.state = newState;

    await this.notifyStateChange(oldState, newState, source);
  }

  /**
   * 回滚到上一个稳定状态
   */
  async rollbackToPreviousState(): Promise<void> {
    const lastSnapshot = this.stateHistory.pop();
    if (lastSnapshot) {
      const oldState = { ...this.state };
      this.state = lastSnapshot.state;
      await this.notifyStateChange(oldState, this.state, 'rollback');
      this.logger.info('Rolled back to previous state.', {
        module: this.moduleName,
        operation: 'rollbackToPreviousState',
      });
    } else {
      this.logger.warn('No previous state to roll back to.', {
        module: this.moduleName,
        operation: 'rollbackToPreviousState',
      });
    }
  }

  /**
   * 重置到安全、初始的状态
   */
  async resetToSafeState(): Promise<void> {
    const oldState = { ...this.state };
    const safeState = this.createInitialState();
    this.state = safeState;

    await this.notifyStateChange(oldState, this.state, 'safety-reset');
    this.logger.info('State has been reset to a safe initial state.', {
      module: this.moduleName,
      operation: 'resetToSafeState',
    });
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.stateHistory.clear();
  }

  /**
   * 创建编辑器的初始状态
   */
  private createInitialState(): VisualEditorState {
    return {
      isInitialized: false,
      isVisible: false,
      previewMode: 'closed',
      currentConfig: (DEFAULT_CLANG_FORMAT_CONFIG || {}) as ClangFormatConfig,
      configDirty: false,
      recoveryAttempts: 0,
    };
  }

  /**
   * 验证状态转换是否有效
   */
  private validateStateTransition(from: VisualEditorState, to: VisualEditorState): boolean {
    // 例如：不允许在预览打开时直接切换到另一个预览
    if (
      from.previewMode === 'open' &&
      to.previewMode === 'open' &&
      from.previewUri?.toString() !== to.previewUri?.toString()
    ) {
      this.logger.warn(
        'State Validation: Cannot open a new preview while another is already active.',
        {
          module: this.moduleName,
          operation: 'validateStateTransition',
        },
      );
      return false;
    }
    // 可以添加更多验证规则
    return true;
  }

  /**
   * 保存状态快照，用于历史记录和回滚
   */
  private saveSnapshot(state: VisualEditorState, source: string): void {
    //  BoundedHistory 自动管理大小限制，无需手动检查
    this.stateHistory.push({
      state: { ...state },
      timestamp: Date.now(),
      source,
    });
  }

  /**
   * 检测状态变化的类型
   */
  private detectChangeType(
    from: VisualEditorState,
    to: VisualEditorState,
  ): 'preview' | 'config' | 'error' {
    if (from.previewMode !== to.previewMode) { return 'preview'; }
    if (from.configDirty !== to.configDirty) { return 'config'; }
    if (from.lastError !== to.lastError) { return 'error'; }
    return 'config'; // 默认为config变化
  }

  /**
   * 通知订阅者状态已发生变化
   */
  private async notifyStateChange(
    from: VisualEditorState,
    to: VisualEditorState,
    source: string,
  ): Promise<void> {
    const event: StateChangeEvent = {
      type: this.detectChangeType(from, to),
      from,
      to,
      timestamp: Date.now(),
      source,
    };

    // 使用Promise.resolve().then()确保事件在下一个微任务中发出，
    // 避免在状态更新的同步流程中产生副作用
    await Promise.resolve().then(() =>
      this.eventBus.emit('state-changed', event),
    );
  }
}
