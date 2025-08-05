/**
 * 🛠️ 通用类型工具集
 * 提供可复用的泛型类型定义，减少重复的类型模式
 */

// ===============================
// 工厂函数模式
// ===============================

/**
 * 🏭 通用工厂函数类型
 * 用于创建任意类型的实例
 */
export type Factory<T, TArgs extends any[] = []> = (...args: TArgs) => T;

/**
 * 🏭 异步工厂函数类型
 */
export type AsyncFactory<T, TArgs extends any[] = []> = (...args: TArgs) => Promise<T>;

/**
 * 🔧 重置函数类型
 * 用于重置对象状态，常用于对象池
 */
export type ResetFunction<T> = (obj: T) => void;

/**
 * 🎯 选择器函数类型
 * 用于从集合中选择元素
 */
export type Selector<T, R> = (item: T) => R;

/**
 * 🔍 谓词函数类型
 * 用于过滤和条件判断
 */
export type Predicate<T> = (item: T) => boolean;

// ===============================
// 结果对象模式
// ===============================

/**
 * 📊 基础结果类型
 * 所有操作结果的基础接口
 */
export interface BaseResult {
  /** 操作是否成功 */
  success: boolean;
  /** 错误信息（失败时） */
  error?: string;
  /** 警告信息 */
  warnings?: string[];
  /** 操作耗时（毫秒） */
  duration?: number;
}

/**
 * 📊 带数据的结果类型
 * 携带具体数据的操作结果
 */
export interface DataResult<T> extends BaseResult {
  /** 结果数据 */
  data?: T;
}

/**
 * 📊 验证结果类型
 * 标准化的验证结果接口，保持向后兼容
 */
export interface ValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误信息（失败时） */
  error?: string;
  /** 警告信息 */
  warnings?: string[];
  /** 修复建议 */
  fixes?: string[];
  /** 操作是否成功（可选，与isValid保持一致） */
  success?: boolean;
}

/**
 * 📊 批量操作结果
 * 用于批量处理的结果统计
 */
export interface BatchResult<TItem, TResult = any> extends BaseResult {
  /** 处理的总数 */
  total: number;
  /** 成功的数量 */
  successCount: number;
  /** 失败的数量 */
  failureCount: number;
  /** 详细结果 */
  items: Array<{
    item: TItem;
    result: TResult;
    error?: string;
  }>;
}

// ===============================
// 状态管理模式
// ===============================

/**
 * 🔄 通用状态枚举
 * 标准化的状态值
 */
export type CommonStatus = 
  | 'idle'
  | 'pending' 
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * 🔄 生命周期状态
 * 用于管理组件生命周期
 */
export type LifecycleStatus = 
  | 'created'
  | 'initializing'
  | 'ready'
  | 'disposing'
  | 'disposed';

/**
 * 🔄 状态机接口
 * 提供状态转换的标准接口
 */
export interface StateMachine<TState extends string> {
  /** 当前状态 */
  readonly currentState: TState;
  /** 转换到新状态 */
  transition(newState: TState): boolean;
  /** 检查是否可以转换到指定状态 */
  canTransition(targetState: TState): boolean;
  /** 获取状态历史 */
  getHistory(): TState[];
}

// ===============================
// 统计信息模式
// ===============================

/**
 * 📈 基础统计信息
 * 标准化的统计数据接口
 */
export interface BaseStats {
  /** 统计时间戳 */
  timestamp: number;
  /** 统计标签 */
  label?: string;
}

/**
 * 📈 计数统计
 * 用于计数类型的统计
 */
export interface CountStats extends BaseStats {
  /** 当前数量 */
  count: number;
  /** 最大容量 */
  capacity?: number;
  /** 使用率 */
  utilization?: number;
}

/**
 * 📈 性能统计
 * 用于性能监控的统计
 */
export interface PerformanceStats extends BaseStats {
  /** 平均耗时 */
  averageTime: number;
  /** 最小耗时 */
  minTime: number;
  /** 最大耗时 */
  maxTime: number;
  /** 总操作次数 */
  totalOperations: number;
  /** 成功率 */
  successRate: number;
}

/**
 * 📈 内存统计
 * 用于内存使用情况的统计
 */
export interface MemoryStats extends BaseStats {
  /** 已使用内存 */
  used: number;
  /** 总可用内存 */
  available: number;
  /** 内存单位 */
  unit: 'B' | 'KB' | 'MB' | 'GB';
  /** 使用百分比 */
  percentage: number;
}

// ===============================
// 管理器模式
// ===============================

/**
 * 🎯 增强的管理器接口
 * 为各种管理器提供统一的接口
 */
export interface EnhancedManager<TConfig = {}, TStats = BaseStats> {
  /** 管理器名称 */
  readonly name: string;
  /** 管理器状态 */
  readonly status: LifecycleStatus;
  /** 初始化管理器 */
  initialize(config?: TConfig): Promise<void>;
  /** 启动管理器 */
  start(): Promise<void>;
  /** 停止管理器 */
  stop(): Promise<void>;
  /** 获取统计信息 */
  getStats(): TStats;
  /** 重置管理器 */
  reset(): Promise<void>;
  /** 销毁管理器 */
  dispose(): void;
}

/**
 * 🎯 可观察的管理器接口
 * 支持事件监听的管理器
 */
export interface ObservableManager<TConfig = {}, TStats = BaseStats, TEvent = string> 
  extends EnhancedManager<TConfig, TStats> {
  /** 添加事件监听器 */
  on(event: TEvent, handler: (...args: any[]) => void): () => void;
  /** 移除事件监听器 */
  off(event: TEvent, handler: (...args: any[]) => void): void;
  /** 触发事件 */
  emit(event: TEvent, ...args: any[]): void;
}

// ===============================
// 缓存模式
// ===============================

/**
 * 📦 缓存接口
 * 标准化的缓存操作接口
 */
export interface Cache<K, V> {
  /** 获取缓存值 */
  get(key: K): V | undefined;
  /** 设置缓存值 */
  set(key: K, value: V): void;
  /** 检查是否存在 */
  has(key: K): boolean;
  /** 删除缓存 */
  delete(key: K): boolean;
  /** 清空缓存 */
  clear(): void;
  /** 获取缓存大小 */
  size(): number;
  /** 获取缓存统计 */
  getStats(): CountStats;
}

/**
 * 📦 带过期时间的缓存接口
 */
export interface TTLCache<K, V> extends Cache<K, V> {
  /** 设置带过期时间的缓存值 */
  setWithTTL(key: K, value: V, ttl: number): void;
  /** 获取剩余生存时间 */
  getTTL(key: K): number;
  /** 更新过期时间 */
  touch(key: K): boolean;
}

// ===============================
// 异步操作模式
// ===============================

/**
 * ⏳ 异步操作选项
 * 标准化的异步操作配置
 */
export interface AsyncOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 是否取消 */
  signal?: AbortSignal;
}

/**
 * ⏳ 可取消的操作接口
 */
export interface Cancellable {
  /** 是否已取消 */
  readonly isCancelled: boolean;
  /** 取消操作 */
  cancel(): void;
}

/**
 * ⏳ 进度报告接口
 */
export interface ProgressReporter<T = any> {
  /** 报告进度 */
  report(progress: {
    /** 进度百分比 0-100 */
    percentage: number;
    /** 进度消息 */
    message?: string;
    /** 增量数据 */
    increment?: T;
  }): void;
}

// ===============================
// 工具类型
// ===============================

/**
 * 🔧 深度只读类型
 * 递归设置所有属性为只读
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 🔧 深度部分类型
 * 递归设置所有属性为可选
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 🔧 选择性必需类型
 * 从接口中选择指定属性设为必需
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * 🔧 选择性可选类型
 * 从接口中选择指定属性设为可选
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 🔧 字符串字面量联合转数组
 * 将字符串字面量联合类型转换为数组类型
 */
export type UnionToTuple<T extends string> = T extends any ? [T] : never;

/**
 * 🔧 提取Promise类型
 * 从Promise类型中提取包装的类型
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * 🔧 条件类型帮助器
 * 根据条件选择不同的类型
 */
export type If<C extends boolean, T, F> = C extends true ? T : F;

// ===============================
// 类型守卫工具
// ===============================

/**
 * 🛡️ 类型守卫函数类型
 */
export type TypeGuard<T, U extends T = T> = (value: T) => value is U;

/**
 * 🛡️ 创建类型守卫的工厂函数
 */
export function createTypeGuard<T, U extends T = T>(
  predicate: (value: T) => boolean
): TypeGuard<T, U> {
  return (value: T): value is U => predicate(value);
}

/**
 * 🛡️ 检查是否为有效结果
 */
export const isSuccessfulResult = createTypeGuard<BaseResult>(
  (result) => result.success === true
);

/**
 * 🛡️ 检查是否为错误结果
 */
export const isFailedResult = createTypeGuard<BaseResult>(
  (result) => result.success === false
);

/**
 * 🛡️ 检查是否为数据结果
 */
export function isDataResult<T>(result: BaseResult): result is DataResult<T> {
  return 'data' in result;
}

// ===============================
// 实用工具函数
// ===============================

/**
 * 🔧 安全的对象路径访问
 */
export function safeGet<T, K extends keyof T>(obj: T, key: K): T[K] | undefined {
  try {
    return obj?.[key];
  } catch {
    return undefined;
  }
}

/**
 * 🔧 创建枚举值数组
 */
export function enumValues<T extends Record<string, string | number>>(enumObject: T): Array<T[keyof T]> {
  return Object.values(enumObject) as Array<T[keyof T]>;
}

/**
 * 🔧 创建枚举键数组  
 */
export function enumKeys<T extends Record<string, string | number>>(enumObject: T): (keyof T)[] {
  return Object.keys(enumObject);
}