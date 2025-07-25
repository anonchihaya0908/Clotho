/**
 * Unified error handling utilities for Clotho extension
 * Provides consistent error handling patterns across all modules
 */

import * as vscode from 'vscode';

export interface ErrorContext {
  operation: string;
  module: string;
  instanceId?: string; // 新增：实例标识
  showToUser?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  rethrow?: boolean; // 新增：是否重新抛出错误
}

export class ClothoError extends Error {
  constructor(
    message: string,
    public readonly context: ErrorContext,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ClothoError';
  }
}

export class ErrorHandler {
  private static readonly LOG_PREFIX = 'Clotho';
  private static errorCount = 0;
  private static readonly MAX_ERROR_RATE = 10; // 每分钟最大错误数
  private static errorTimestamps: number[] = [];

  /**
   * Handles errors with consistent logging and user notification
   */
  public static handle(error: unknown, context: ErrorContext): ClothoError {
    const clothoError = this.normalizeError(error, context);

    // 错误频率检查
    this.trackErrorRate();

    // Log the error
    this.logError(clothoError);

    // Show to user if needed and not rate limited
    if (context.showToUser && !this.isErrorRateLimited()) {
      this.showUserError(clothoError);
    }

    return clothoError;
  }

  /**
   * Tracks error rate to prevent spam
   */
  private static trackErrorRate(): void {
    const now = Date.now();
    this.errorCount++;
    this.errorTimestamps.push(now);

    // 清理超过1分钟的错误记录
    this.errorTimestamps = this.errorTimestamps.filter(
      timestamp => now - timestamp < 60000
    );
  }

  /**
   * Checks if error rate limit is exceeded
   */
  private static isErrorRateLimited(): boolean {
    return this.errorTimestamps.length > this.MAX_ERROR_RATE;
  }

  /**
   * Gets error statistics for debugging
   */
  public static getErrorStats(): {
    totalErrors: number;
    recentErrors: number;
    isRateLimited: boolean;
  } {
    return {
      totalErrors: this.errorCount,
      recentErrors: this.errorTimestamps.length,
      isRateLimited: this.isErrorRateLimited(),
    };
  }

  /**
   * Resets error tracking (useful for testing)
   */
  public static resetErrorTracking(): void {
    this.errorCount = 0;
    this.errorTimestamps = [];
  }

  /**
   * Converts any error to ClothoError with context
   */
  private static normalizeError(
    error: unknown,
    context: ErrorContext,
  ): ClothoError {
    if (error instanceof ClothoError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new ClothoError(message, context, error);
  }

  /**
   * Logs error with appropriate level
   */
  private static logError(error: ClothoError): void {
    const { operation, module, logLevel = 'error' } = error.context;
    const logMessage = `${this.LOG_PREFIX}: [${module}] ${operation} failed: ${error.message}`;

    switch (logLevel) {
      case 'debug':
        console.debug(logMessage, error.cause);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'warn':
        console.warn(logMessage, error.cause);
        break;
      case 'error':
      default:
        console.error(logMessage, error.cause);
        break;
    }
  }

  /**
   * Shows user-friendly error message with rate limiting
   */
  private static showUserError(error: ClothoError): void {
    const { operation, module } = error.context;
    let userMessage = `Failed to ${operation}: ${error.message}`;

    // 如果错误频率过高，显示汇总信息
    if (this.isErrorRateLimited()) {
      userMessage = `Multiple errors detected in ${module}. Please check the developer console for details.`;
    }

    vscode.window.showErrorMessage(userMessage);
  }

  /**
   * Enhanced async wrapper with better error recovery options
   */
  public static wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: ErrorContext,
    fallbackValue?: R,
  ): (...args: T) => Promise<R | undefined> {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error, context);
        return fallbackValue;
      }
    };
  }

  /**
   * Enhanced sync wrapper with better error recovery options
   */
  public static wrapSync<T extends any[], R>(
    fn: (...args: T) => R,
    context: ErrorContext,
    fallbackValue?: R,
  ): (...args: T) => R | undefined {
    return (...args: T): R | undefined => {
      try {
        return fn(...args);
      } catch (error) {
        this.handle(error, context);
        return fallbackValue;
      }
    };
  }

  /**
   * Creates a retry wrapper with exponential backoff
   */
  public static withRetry<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: ErrorContext,
    options: {
      maxAttempts?: number;
      baseDelay?: number;
      maxDelay?: number;
    } = {},
  ): (...args: T) => Promise<R | undefined> {
    const { maxAttempts = 3, baseDelay = 1000, maxDelay = 10000 } = options;

    return async (...args: T): Promise<R | undefined> => {
      let lastError: unknown;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await fn(...args);
        } catch (error) {
          lastError = error;

          if (attempt === maxAttempts) {
            // 最后一次尝试失败，处理错误
            this.handle(error, {
              ...context,
              operation: `${context.operation} (after ${maxAttempts} attempts)`,
            });
            return undefined;
          }

          // 计算延迟时间（指数退避）
          const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

          // 记录重试信息
          this.handle(error, {
            ...context,
            operation: `${context.operation} (attempt ${attempt}/${maxAttempts})`,
            showToUser: false,
            logLevel: 'warn',
          });

          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      return undefined;
    };
  }

  /**
   * Batch error handler for multiple operations
   */
  public static async handleBatch<T>(
    operations: Array<() => Promise<T>>,
    context: Omit<ErrorContext, 'operation'>,
  ): Promise<{
    results: Array<T | undefined>;
    errors: ClothoError[];
    successCount: number;
  }> {
    const results: Array<T | undefined> = [];
    const errors: ClothoError[] = [];
    let successCount = 0;

    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await operations[i]();
        results.push(result);
        successCount++;
      } catch (error) {
        const handledError = this.handle(error, {
          ...context,
          operation: `batch operation ${i + 1}`,
          showToUser: false, // 批量操作不直接显示给用户
        });
        results.push(undefined);
        errors.push(handledError);
      }
    }

    // 如果有错误且需要显示给用户，显示汇总信息
    if (errors.length > 0 && context.showToUser) {
      vscode.window.showErrorMessage(
        `Batch operation completed with ${successCount}/${operations.length} successes. ${errors.length} operations failed.`
      );
    }

    return { results, errors, successCount };
  }
}

/**
 * Enhanced decorator for automatic error handling in methods
 * Supports both sync and async methods with flexible error handling options
 */
export function handleErrors(context: Partial<ErrorContext> = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    if (typeof originalMethod !== 'function') {
      return descriptor;
    }

    descriptor.value = function (...args: any[]): any {
      const fullContext: ErrorContext = {
        operation: propertyKey,
        module: target.constructor.name,
        showToUser: false,
        logLevel: 'error',
        rethrow: false, // 默认不重新抛出错误
        ...context,
      };

      try {
        const result = originalMethod.apply(this, args);

        if (result instanceof Promise) {
          // 异步方法处理
          return result.catch((error) => {
            const handledError = ErrorHandler.handle(error, fullContext);

            if (fullContext.rethrow) {
              throw handledError;
            }

            // 返回 undefined 表示操作失败但不抛出错误
            return undefined;
          });
        } else {
          // 同步方法成功，直接返回结果
          return result;
        }
      } catch (error) {
        // 同步方法出错
        const handledError = ErrorHandler.handle(error, fullContext);

        if (fullContext.rethrow) {
          throw handledError;
        }

        // 返回 undefined 表示操作失败但不抛出错误
        return undefined;
      }
    };

    return descriptor;
  };
}

/**
 * Enhanced decorator specifically for async methods with better type safety
 * @deprecated Use handleErrors instead, which now supports both sync and async
 */
export function handleAsyncErrors(context: Partial<ErrorContext> = {}) {
  return handleErrors({ ...context, rethrow: false });
}

/**
 * Enhanced decorator for methods that should always rethrow errors
 * Useful for critical operations where error propagation is required
 */
export function handleErrorsWithRethrow(context: Partial<ErrorContext> = {}) {
  return handleErrors({ ...context, rethrow: true });
}

/**
 * Decorator for methods that should silently handle errors
 * Perfect for non-critical operations like UI updates, logging, etc.
 */
export function handleErrorsSilently(context: Partial<ErrorContext> = {}) {
  return handleErrors({
    ...context,
    rethrow: false,
    showToUser: false,
    logLevel: 'warn'
  });
}
