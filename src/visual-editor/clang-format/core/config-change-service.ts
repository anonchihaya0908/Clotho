/**
 * 配置变化服务
 * 负责处理配置变化时的所有相关操作，实现关注点分离
 */

import { EventBus } from '../messaging/event-bus';
import { EditorStateManager } from '../state/editor-state-manager';
import { ErrorRecoveryManager } from '../error/error-recovery-manager';
import { WebviewMessageType } from '../../../common/types/webview';
import { ErrorHandler } from '../../../common/error-handler';

/**
 * 配置变化处理器接口
 */
export interface ConfigChangeHandler {
    readonly name: string;
    readonly priority: number;
    handle(context: ConfigChangeContext): Promise<void>;
}

/**
 * 配置变化上下文
 */
export interface ConfigChangeContext {
    key: string;
    value: any;
    oldConfig: Record<string, any>;
    newConfig: Record<string, any>;
    stateManager: EditorStateManager;
    eventBus: EventBus;
}

/**
 * 配置变化的结果
 */
export interface ConfigChangeResult {
    success: boolean;
    error?: Error;
    affectedHandlers: string[];
    executionTimeMs: number;
}

/**
 * 状态更新处理器
 */
class StateUpdateHandler implements ConfigChangeHandler {
    readonly name = 'StateUpdate';
    readonly priority = 100; // 最高优先级

    async handle(context: ConfigChangeContext): Promise<void> {
        await context.stateManager.updateState(
            {
                currentConfig: context.newConfig,
                configDirty: true,
            },
            'config-changed',
        );
    }
}

/**
 * Webview 通信处理器
 */
class WebviewNotificationHandler implements ConfigChangeHandler {
    readonly name = 'WebviewNotification';
    readonly priority = 90;

    async handle(context: ConfigChangeContext): Promise<void> {
        context.eventBus.emit('post-message-to-webview', {
            type: WebviewMessageType.CONFIG_LOADED,
            payload: { config: context.newConfig },
        });
    }
}

/**
 * 预览更新处理器
 */
class PreviewUpdateHandler implements ConfigChangeHandler {
    readonly name = 'PreviewUpdate';
    readonly priority = 80;

    async handle(context: ConfigChangeContext): Promise<void> {
        context.eventBus.emit('config-updated-for-preview', {
            newConfig: context.newConfig
        });
    }
}

/**
 * 配置持久化处理器（可选扩展）
 */
class ConfigPersistenceHandler implements ConfigChangeHandler {
    readonly name = 'ConfigPersistence';
    readonly priority = 70;

    async handle(context: ConfigChangeContext): Promise<void> {
        // 在这里可以添加配置持久化逻辑
        // 例如：保存到工作区设置、用户设置或云端
        // 目前为空实现，但展示了扩展性
    }
}

/**
 * 配置变化服务
 * 
 * 职责：
 * - 解耦配置变化时的多个操作
 * - 提供可扩展的处理器架构
 * - 确保处理器按优先级有序执行
 * - 提供错误恢复和详细的执行信息
 */
export class ConfigChangeService {
    private handlers: ConfigChangeHandler[] = [];
    private isInitialized = false;

    constructor(
        private stateManager: EditorStateManager,
        private eventBus: EventBus,
        private errorRecovery: ErrorRecoveryManager,
    ) {
        this.initializeDefaultHandlers();
    }

    /**
     * 初始化默认处理器
     */
    private initializeDefaultHandlers(): void {
        this.addHandler(new StateUpdateHandler());
        this.addHandler(new WebviewNotificationHandler());
        this.addHandler(new PreviewUpdateHandler());
        this.addHandler(new ConfigPersistenceHandler());
        this.isInitialized = true;
    }

    /**
     * 添加自定义配置变化处理器
     */
    addHandler(handler: ConfigChangeHandler): void {
        this.handlers.push(handler);
        // 按优先级排序（降序）
        this.handlers.sort((a, b) => b.priority - a.priority);
    }

    /**
     * 移除处理器
     */
    removeHandler(handlerName: string): boolean {
        const index = this.handlers.findIndex(h => h.name === handlerName);
        if (index !== -1) {
            this.handlers.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 处理配置变化
     */
    async handleConfigChange(payload: {
        key: string;
        value: any;
    }): Promise<ConfigChangeResult> {
        const startTime = Date.now();
        const affectedHandlers: string[] = [];

        try {
            const { key, value } = payload;

            // 获取当前配置
            const currentState = this.stateManager.getState();
            const oldConfig = { ...currentState.currentConfig };
            const newConfig = { ...oldConfig };

            // 更新配置
            if (value === 'inherit' || value === undefined || value === null) {
                delete newConfig[key];
            } else {
                newConfig[key] = value;
            }

            // 创建处理上下文
            const context: ConfigChangeContext = {
                key,
                value,
                oldConfig,
                newConfig,
                stateManager: this.stateManager,
                eventBus: this.eventBus,
            };

            // 按优先级顺序执行所有处理器
            for (const handler of this.handlers) {
                try {
                    await handler.handle(context);
                    affectedHandlers.push(handler.name);
                } catch (error: any) {
                    // 处理器错误不应该阻止其他处理器执行
                    console.warn(`ConfigChangeHandler ${handler.name} failed:`, error);

                    // 但是对于关键处理器（如状态更新），我们需要记录错误
                    if (handler.priority >= 90) {
                        await this.errorRecovery.handleError(
                            `config-change-handler-${handler.name.toLowerCase()}-failed`,
                            error,
                            { payload, handlerName: handler.name }
                        );
                    }
                }
            }

            return {
                success: true,
                affectedHandlers,
                executionTimeMs: Date.now() - startTime,
            };

        } catch (error: any) {
            const result: ConfigChangeResult = {
                success: false,
                error,
                affectedHandlers,
                executionTimeMs: Date.now() - startTime,
            };

            await this.errorRecovery.handleError('config-change-service-failed', error, {
                payload,
                result,
            });

            return result;
        }
    }

    /**
     * 获取已注册的处理器信息
     */
    getHandlerInfo(): Array<{ name: string; priority: number }> {
        return this.handlers.map(h => ({
            name: h.name,
            priority: h.priority,
        }));
    }

    /**
     * 检查服务是否已初始化
     */
    isServiceInitialized(): boolean {
        return this.isInitialized;
    }
}
