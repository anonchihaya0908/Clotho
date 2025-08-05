/**
 * 统一的事件类型定义
 * 为整个应用提供类型安全的事件处理
 */

// ===============================
// 基础事件类型
// ===============================

/**
 * 基础事件处理器类型
 * 替代原有的 (...args: any[]) => void 模式
 */
export type EventHandler<TArgs extends readonly unknown[] = readonly unknown[]> = (...args: TArgs) => void;

/**
 * 通用事件处理器类型（用于兼容性）
 */
export type GenericEventHandler = (...args: readonly unknown[]) => void | Promise<void>;

/**
 * 异步事件处理器类型
 */
export type AsyncEventHandler<TArgs extends readonly unknown[] = readonly unknown[]> = (...args: TArgs) => Promise<void>;

/**
 * 事件取消订阅函数类型
 */
export type UnsubscribeFunction = () => void;

// ===============================
// 特定事件载荷类型
// ===============================

/**
 * 配置变更事件载荷
 */
export interface ConfigChangeEventPayload {
    key: string;
    value: ConfigValue;
    oldValue?: ConfigValue;
}

/**
 * 状态变更事件载荷
 */
export interface StateChangeEventPayload {
    type: string;
    data?: Record<string, unknown>;
}

/**
 * 错误事件载荷
 */
export interface ErrorEventPayload {
    error: Error;
    context?: Record<string, unknown>;
    recoverable: boolean;
}

/**
 * 性能事件载荷
 */
export interface PerformanceEventPayload {
    operation: string;
    duration: number;
    metadata?: Record<string, unknown>;
}

// ===============================
// 配置值类型
// ===============================

/**
 * 配置值的所有可能类型
 * 替代配置系统中的 any 类型
 */
export type ConfigValue =
    | string
    | number
    | boolean
    | null
    | undefined
    | string[]
    | number[]
    | Record<string, unknown>
    | ConfigValue[];

// ===============================
// 事件映射类型
// ===============================

/**
 * 标准事件映射接口
 * 用于类型安全的事件发射器
 */
export interface StandardEventMap extends Record<string, readonly unknown[]> {
    'config-change': [ConfigChangeEventPayload];
    'state-change': [StateChangeEventPayload];
    'error': [ErrorEventPayload];
    'performance': [PerformanceEventPayload];
    'dispose': [];
}

/**
 * 扩展事件映射的工具类型
 */
export type ExtendEventMap<T extends Record<string, readonly unknown[]>> = StandardEventMap & T;

// ===============================
// 事件发射器接口
// ===============================

/**
 * 类型安全的事件发射器接口
 */
export interface TypeSafeEventEmitter<TEventMap extends Record<string, readonly unknown[]> = StandardEventMap> {
    on<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): UnsubscribeFunction;
    once<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): UnsubscribeFunction;
    off<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): void;
    emit<K extends keyof TEventMap>(event: K, ...args: TEventMap[K]): void;
    dispose(): void;
}

// ===============================
// 可观察对象接口
// ===============================

/**
 * 可观察对象的标准接口
 */
export interface Observable<TEventMap extends Record<string, readonly unknown[]> = StandardEventMap> {
    addEventListener<K extends keyof TEventMap>(
        event: K,
        handler: EventHandler<TEventMap[K]>
    ): UnsubscribeFunction;

    removeEventListener<K extends keyof TEventMap>(
        event: K,
        handler: EventHandler<TEventMap[K]>
    ): void;
}
