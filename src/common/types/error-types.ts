/**
 * 标准化的错误类型定义
 * 替代错误处理中的 any 类型
 */

// ===============================
// 基础错误类型
// ===============================

/**
 * 类似错误的对象类型
 * 替代 catch 块中的 any 类型
 */
export type ErrorLike = Error | { message: string;[key: string]: unknown };

/**
 * 未知错误类型
 * 用于 catch 块的类型安全处理
 */
export type UnknownError = unknown;

/**
 * 错误构造器类型
 */
export type ErrorConstructor<T extends Error = Error> = new (message?: string) => T;

// ===============================
// 错误上下文类型
// ===============================

/**
 * 错误上下文信息
 */
export interface ErrorContext {
  operation?: string;
  module?: string;
  showToUser?: boolean;
  logLevel?: 'error' | 'warn' | 'info';
  rethrow?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * 扩展错误上下文
 */
export interface ExtendedErrorContext extends ErrorContext {
  timestamp?: number;
  correlationId?: string;
  instanceId?: string;
  retryCount?: number;
}

// ===============================
// 错误恢复类型
// ===============================

/**
 * 错误恢复策略结果
 */
export interface ErrorRecoveryResult {
  handled: boolean;
  shouldRetry: boolean;
  recoveryAction?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 错误恢复策略接口
 */
export interface ErrorRecoveryStrategy {
  canHandle(error: ErrorLike): boolean;
  handle(error: ErrorLike, context: ErrorContext): Promise<ErrorRecoveryResult>;
  getName(): string;
}

// ===============================
// 应用特定错误类型
// ===============================

/**
 * Clotho 应用错误
 */
export interface ClothoError extends Error {
  code: string;
  context: Record<string, unknown>;
  recoverable: boolean;
  timestamp: number;
}

/**
 * 编辑器错误
 */
export interface EditorError {
  code: string;
  message: string;
  context: Record<string, unknown>;
  timestamp: number;
  recoverable: boolean;
  module?: string;
}

/**
 * 验证错误
 */
export interface ValidationError extends Error {
  field: string;
  value: unknown;
  constraint: string;
}

// ===============================
// 错误工厂函数
// ===============================

/**
 * 创建标准化错误的工厂函数
 */
export type ErrorFactory<T extends Error = Error> = (message: string, context?: Record<string, unknown>) => T;

/**
 * 错误转换函数类型
 */
export type ErrorTransform = (error: UnknownError) => ErrorLike;

// ===============================
// 错误处理器类型
// ===============================

/**
 * 错误处理器函数
 */
export type ErrorHandler<TResult = void> = (error: ErrorLike, context?: ErrorContext) => TResult | Promise<TResult>;

/**
 * 错误捕获装饰器选项
 */
export interface ErrorCatchOptions extends ErrorContext {
  transform?: ErrorTransform;
  onError?: ErrorHandler;
}

// ===============================
// 类型守护函数
// ===============================

/**
 * 检查是否为 Error 实例
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * 检查是否为类似错误的对象
 */
export function isErrorLike(value: unknown): value is ErrorLike {
  return isError(value) || (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as Record<string, unknown>)['message'] === 'string'
  );
}

/**
 * 安全地将未知错误转换为 ErrorLike
 */
export function toErrorLike(error: UnknownError): ErrorLike {
  if (isErrorLike(error)) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error(`Unknown error: ${String(error)}`);
}

/**
 * 创建 ClothoError 的工厂函数
 */
export function createClothoError(
  code: string,
  message: string,
  context: Record<string, unknown> = {},
  recoverable: boolean = true
): ClothoError {
  const error = new Error(message) as ClothoError;
  error.code = code;
  error.context = context;
  error.recoverable = recoverable;
  error.timestamp = Date.now();
  return error;
}
