import * as vscode from 'vscode';
import { EditorState, StateChangeEvent } from '../../../common/types';
import { EventBus } from '../messaging/event-bus';
import { DEFAULT_CLANG_FORMAT_CONFIG } from '../config-options';

type StateSnapshot = {
    state: EditorState;
    timestamp: number;
    source: string;
};

/**
 * 编辑器状态管理器
 * 负责维护、更新和通知编辑器的统一状态
 */
export class EditorStateManager implements vscode.Disposable {
    private state: EditorState;
    private stateHistory: StateSnapshot[] = [];
    private disposables: vscode.Disposable[] = [];

    constructor(private eventBus: EventBus) {
        this.state = this.createInitialState();
    }

    /**
     * 获取当前状态的只读副本
     */
    getState(): Readonly<EditorState> {
        return Object.freeze({ ...this.state });
    }

    /**
     * 更新状态。这是一个原子操作，确保状态转换的有效性。
     * @param updates 部分状态更新
     * @param source 状态更新的来源
     */
    async updateState(updates: Partial<EditorState>, source: string): Promise<void> {
        const oldState = { ...this.state };
        const newState = { ...this.state, ...updates };

        if (!this.validateStateTransition(oldState, newState)) {
            const error = new Error(`Invalid state transition from source: ${source}`);
            console.error(error.message, { from: oldState, to: newState });
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
            console.log('Rolled back to previous state.');
        } else {
            console.warn('No previous state to roll back to.');
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
        console.log('State has been reset to a safe initial state.');
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.stateHistory = [];
    }

    /**
     * 创建编辑器的初始状态
     */
    private createInitialState(): EditorState {
        return {
            isInitialized: false,
            isVisible: false,
            previewMode: 'closed',
            currentConfig: DEFAULT_CLANG_FORMAT_CONFIG || {},
            configDirty: false,
            recoveryAttempts: 0,
        };
    }

    /**
     * 验证状态转换是否有效
     */
    private validateStateTransition(from: EditorState, to: EditorState): boolean {
        // 例如：不允许在预览打开时直接切换到另一个预览
        if (from.previewMode === 'open' && to.previewMode === 'open' && from.previewUri?.toString() !== to.previewUri?.toString()) {
            console.warn('State Validation: Cannot open a new preview while another is already active.');
            return false;
        }
        // 可以添加更多验证规则
        return true;
    }

    /**
     * 保存状态快照，用于历史记录和回滚
     */
    private saveSnapshot(state: EditorState, source: string): void {
        if (this.stateHistory.length > 20) { // 限制历史记录大小
            this.stateHistory.shift();
        }

        this.stateHistory.push({
            state: { ...state },
            timestamp: Date.now(),
            source
        });
    }

    /**
     * 检测状态变化的类型
     */
    private detectChangeType(from: EditorState, to: EditorState): 'preview' | 'config' | 'error' {
        if (from.previewMode !== to.previewMode) return 'preview';
        if (from.configDirty !== to.configDirty) return 'config';
        if (from.lastError !== to.lastError) return 'error';
        return 'config'; // 默认为config变化
    }

    /**
     * 通知订阅者状态已发生变化
     */
    private async notifyStateChange(from: EditorState, to: EditorState, source: string): Promise<void> {
        const event: StateChangeEvent = {
            type: this.detectChangeType(from, to),
            from,
            to,
            timestamp: Date.now(),
            source
        };

        // 使用Promise.resolve().then()确保事件在下一个微任务中发出，
        // 避免在状态更新的同步流程中产生副作用
        await Promise.resolve().then(() => this.eventBus.emit('state-changed', event));
    }
} 