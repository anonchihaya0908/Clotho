/**
 * 过渡协调器
 * 统一管理预览与占位符之间的平滑过渡，解决竞态条件和闪烁问题
 */

import * as vscode from 'vscode';
import { EventBus } from '../messaging/event-bus';
import { EditorStateManager } from '../state/editor-state-manager';
import { ErrorHandler } from '../../../common/error-handler';

/**
 * 过渡类型枚举
 */
export enum TransitionType {
    PREVIEW_TO_PLACEHOLDER = 'preview-to-placeholder',
    PLACEHOLDER_TO_PREVIEW = 'placeholder-to-preview',
    DIRECT_PREVIEW = 'direct-preview',
    DIRECT_PLACEHOLDER = 'direct-placeholder',
}

/**
 * 过渡原因枚举
 */
export enum TransitionReason {
    USER_CLOSED_TAB = 'user-closed-tab',
    EDITOR_CLOSED = 'editor-closed',
    CONFIG_CHANGED = 'config-changed',
    FORMAT_ERROR = 'format-error',
    MANUAL_TRIGGER = 'manual-trigger',
}

/**
 * 过渡命令接口
 */
export interface TransitionCommand {
    type: TransitionType;
    reason: TransitionReason;
    timestamp: number;
    metadata?: Record<string, any>;
}

/**
 * 过渡配置
 */
export interface TransitionConfig {
    /** 交叉淡入淡出持续时间（毫秒） */
    crossfadeDuration: number;
    /** 预览准备超时时间（毫秒） */
    previewTimeout: number;
    /** 是否启用平滑动画 */
    enableAnimations: boolean;
    /** 占位符显示延迟（毫秒） */
    placeholderDelay: number;
}

/**
 * 过渡协调器 - 负责统一管理所有过渡逻辑
 */
export class TransitionCoordinator {
    private commandQueue: TransitionCommand[] = [];
    private isProcessing = false;
    private currentTransition: TransitionCommand | null = null;

    private readonly config: TransitionConfig = {
        crossfadeDuration: 300,
        previewTimeout: 5000,
        enableAnimations: true,
        placeholderDelay: 100,
    };

    constructor(
        private eventBus: EventBus,
        private stateManager: EditorStateManager,
        private extensionUri: vscode.Uri,
        config?: Partial<TransitionConfig>
    ) {
        this.config = { ...this.config, ...config };
        this.setupEventListeners();
    }

    /**
     * 设置事件监听器
     */
    private setupEventListeners(): void {
        // 监听预览关闭事件
        this.eventBus.on('preview-closed', (data) => {
            this.enqueueTransition({
                type: TransitionType.PREVIEW_TO_PLACEHOLDER,
                reason: data.reason || TransitionReason.USER_CLOSED_TAB,
                timestamp: Date.now(),
                metadata: data,
            });
        });

        // 监听预览请求事件
        this.eventBus.on('preview-requested', (data) => {
            this.enqueueTransition({
                type: TransitionType.PLACEHOLDER_TO_PREVIEW,
                reason: TransitionReason.CONFIG_CHANGED,
                timestamp: Date.now(),
                metadata: data,
            });
        });

        // 监听编辑器关闭事件
        this.eventBus.on('editor-closed', () => {
            this.enqueueTransition({
                type: TransitionType.DIRECT_PLACEHOLDER,
                reason: TransitionReason.EDITOR_CLOSED,
                timestamp: Date.now(),
            });
        });
    }

    /**
     * 将过渡命令加入队列
     */
    private enqueueTransition(command: TransitionCommand): void {
        // 去重相同类型的连续命令
        if (this.commandQueue.length > 0) {
            const lastCommand = this.commandQueue[this.commandQueue.length - 1];
            if (lastCommand.type === command.type &&
                command.timestamp - lastCommand.timestamp < 50) {
                // 更新最后一个命令而不是添加新命令
                this.commandQueue[this.commandQueue.length - 1] = command;
                return;
            }
        }

        this.commandQueue.push(command);
        this.processQueue();
    }

    /**
     * 处理命令队列
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.commandQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            while (this.commandQueue.length > 0) {
                const command = this.commandQueue.shift()!;
                await this.executeTransition(command);
            }
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'processQueue',
                module: 'TransitionCoordinator',
                showToUser: false,
                logLevel: 'error',
            });
        } finally {
            this.isProcessing = false;
            this.currentTransition = null;
        }
    }

    /**
     * 执行具体的过渡操作
     */
    private async executeTransition(command: TransitionCommand): Promise<void> {
        this.currentTransition = command;

        console.log(`TransitionCoordinator: Executing ${command.type} (reason: ${command.reason})`);

        try {
            switch (command.type) {
                case TransitionType.PREVIEW_TO_PLACEHOLDER:
                    await this.executePreviewToPlaceholder(command);
                    break;

                case TransitionType.PLACEHOLDER_TO_PREVIEW:
                    await this.executePlaceholderToPreview(command);
                    break;

                case TransitionType.DIRECT_PREVIEW:
                    await this.executeDirectPreview(command);
                    break;

                case TransitionType.DIRECT_PLACEHOLDER:
                    await this.executeDirectPlaceholder(command);
                    break;
            }
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: `executeTransition-${command.type}`,
                module: 'TransitionCoordinator',
                showToUser: false,
                logLevel: 'error',
            });
        }
    }

    /**
     * 执行预览到占位符的过渡
     */
    private async executePreviewToPlaceholder(command: TransitionCommand): Promise<void> {
        const shouldShowPlaceholder = this.shouldShowPlaceholder(command.reason);

        if (!shouldShowPlaceholder) {
            // 直接关闭，不显示占位符
            this.eventBus.emit('preview-close-requested', { animated: false });
            return;
        }

        if (this.config.enableAnimations) {
            await this.performCrossfadeToPlaceholder(command);
        } else {
            // 简单切换：先关闭预览，再显示占位符
            this.eventBus.emit('preview-close-requested', { animated: false });

            // 延迟显示占位符，避免闪烁
            setTimeout(() => {
                this.eventBus.emit('placeholder-show-requested', {
                    reason: command.reason,
                    animated: true,
                });
            }, this.config.placeholderDelay);
        }
    }

    /**
     * 执行占位符到预览的过渡
     */
    private async executePlaceholderToPreview(command: TransitionCommand): Promise<void> {
        if (this.config.enableAnimations) {
            await this.performCrossfadeToPreview(command);
        } else {
            // 简单切换：先隐藏占位符，再显示预览
            this.eventBus.emit('placeholder-hide-requested', { animated: false });
            this.eventBus.emit('preview-show-requested', {
                config: command.metadata?.config,
                animated: true,
            });
        }
    }

    /**
     * 执行直接预览
     */
    private async executeDirectPreview(command: TransitionCommand): Promise<void> {
        this.eventBus.emit('preview-show-requested', {
            config: command.metadata?.config,
            animated: this.config.enableAnimations,
        });
    }

    /**
     * 执行直接占位符
     */
    private async executeDirectPlaceholder(command: TransitionCommand): Promise<void> {
        this.eventBus.emit('placeholder-show-requested', {
            reason: command.reason,
            animated: this.config.enableAnimations,
        });
    }

    /**
     * 执行交叉淡入淡出到占位符
     */
    private async performCrossfadeToPlaceholder(command: TransitionCommand): Promise<void> {
        // 1. 预创建占位符（但不显示）
        this.eventBus.emit('placeholder-prepare-requested', {
            reason: command.reason,
        });

        // 2. 等待占位符准备完成
        await this.waitForEvent('placeholder-prepared', 1000);

        // 3. 同时开始淡出预览和淡入占位符
        this.eventBus.emit('preview-fadeout-requested', {
            duration: this.config.crossfadeDuration,
        });
        this.eventBus.emit('placeholder-fadein-requested', {
            duration: this.config.crossfadeDuration,
        });

        // 4. 等待动画完成后清理预览
        setTimeout(() => {
            this.eventBus.emit('preview-cleanup-requested');
        }, this.config.crossfadeDuration + 50);
    }

    /**
     * 执行交叉淡入淡出到预览
     */
    private async performCrossfadeToPreview(command: TransitionCommand): Promise<void> {
        // 1. 预创建预览编辑器（但不显示）
        this.eventBus.emit('preview-prepare-requested', {
            config: command.metadata?.config,
        });

        // 2. 等待预览准备完成或超时
        const previewReady = await this.waitForEvent('preview-prepared', this.config.previewTimeout);

        if (!previewReady) {
            // 预览准备超时，显示错误占位符
            this.eventBus.emit('placeholder-show-error', {
                error: 'Preview preparation timeout',
            });
            return;
        }

        // 3. 同时开始淡出占位符和淡入预览
        this.eventBus.emit('placeholder-fadeout-requested', {
            duration: this.config.crossfadeDuration,
        });
        this.eventBus.emit('preview-fadein-requested', {
            duration: this.config.crossfadeDuration,
        });

        // 4. 等待动画完成后清理占位符
        setTimeout(() => {
            this.eventBus.emit('placeholder-cleanup-requested');
        }, this.config.crossfadeDuration + 50);
    }

    /**
     * 判断是否应该显示占位符
     */
    private shouldShowPlaceholder(reason: TransitionReason): boolean {
        switch (reason) {
            case TransitionReason.USER_CLOSED_TAB:
                return true; // 用户主动关闭标签页，显示彩蛋

            case TransitionReason.EDITOR_CLOSED:
                return false; // 编辑器关闭，不显示占位符

            case TransitionReason.FORMAT_ERROR:
                return true; // 格式化错误，显示错误占位符

            default:
                return true;
        }
    }

    /**
     * 等待特定事件触发
     */
    private waitForEvent(eventName: string, timeout: number): Promise<boolean> {
        return new Promise((resolve) => {
            let resolved = false;

            const timer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve(false);
                }
            }, timeout);

            this.eventBus.once(eventName, () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    resolve(true);
                }
            });
        });
    }

    /**
     * 获取当前过渡状态
     */
    public getCurrentTransition(): TransitionCommand | null {
        return this.currentTransition;
    }

    /**
     * 强制清空命令队列
     */
    public clearQueue(): void {
        this.commandQueue.length = 0;
        console.log('TransitionCoordinator: Command queue cleared');
    }

    /**
     * 更新配置
     */
    public updateConfig(newConfig: Partial<TransitionConfig>): void {
        Object.assign(this.config, newConfig);
        console.log('TransitionCoordinator: Configuration updated', this.config);
    }

    /**
     * 销毁协调器
     */
    public dispose(): void {
        this.clearQueue();
        this.eventBus.dispose();
    }
}
