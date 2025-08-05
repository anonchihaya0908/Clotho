/**
 * Unified error handling utilities for Clotho extension
 * Provides consistent error handling patterns across all modules
 */

import * as vscode from 'vscode';
import { ERROR_HANDLING } from './constants';
import { delay as asyncDelay } from './utils/performance';
import { ErrorStrategy, ErrorStrategyResult } from './error-strategies/base-strategy';
import { logger, LoggerService } from './logger';

export interface ErrorContext {
  operation: string;
  module: string;
  instanceId?: string; // Instance identifier
  showToUser?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  rethrow?: boolean; // Whether to rethrow the error
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
  private static errorCount = 0;
  private static readonly MAX_ERROR_RATE = 10; // Max errors per minute
  private static errorTimestamps: number[] = [];

  private logger: LoggerService;
  private strategies: ErrorStrategy[] = [];

  constructor(logger: LoggerService) {
    this.logger = logger;
    // Initialize with default strategies
    this.initializeDefaultStrategies();
  }

  /**
   * Register an error handling strategy
   */
  public registerStrategy(strategy: ErrorStrategy): void {
    logger.info(`Registering error strategy: ${strategy.name}`, {
      module: 'ErrorHandler',
      operation: 'registerStrategy',
    });
    this.strategies.push(strategy);
  }

  /**
   * Remove an error handling strategy
   */
  public unregisterStrategy(strategyName: string): void {
    const index = this.strategies.findIndex(s => s.name === strategyName);
    if (index !== -1) {
      const strategy = this.strategies[index];
      strategy.dispose?.();
      this.strategies.splice(index, 1);
      logger.info(`Unregistered error strategy: ${strategyName}`, {
        module: 'ErrorHandler',
        operation: 'unregisterStrategy',
      });
    }
  }

  /**
   * Initialize default error handling strategies
   */
  private initializeDefaultStrategies(): void {
    // Default strategies will be registered here
    // Visual Editor strategy will be registered by the visual editor module
  }

  /**
   * Handles errors with consistent logging and strategy-based recovery
   */
  public async handle(error: unknown, context: ErrorContext): Promise<ClothoError> {
    const clothoError = this.normalizeError(error, context);

    // Track error frequency
    this.trackErrorRate();

    // Log the error
    this.logError(clothoError);

    // Try to handle with registered strategies
    const strategyResult = await this.tryStrategies(clothoError, context);

    // Show to user if needed and not rate limited (unless strategy handled it)
    if (context.showToUser && !this.isErrorRateLimited() && !strategyResult?.handled) {
      this.showUserError(clothoError);
    }

    // Handle retry logic
    if (strategyResult?.shouldRetry && !context.rethrow) {
      logger.info(`Strategy suggests retry for error: ${clothoError.message}`, {
        module: 'ErrorHandler',
        operation: 'handle',
        strategy: strategyResult.metadata?.strategy,
      });
    }

    if (context.rethrow && !strategyResult?.handled) {
      throw clothoError;
    }

    return clothoError;
  }

  /**
   * Try all registered strategies to handle the error
   */
  private async tryStrategies(error: ClothoError, context: ErrorContext): Promise<ErrorStrategyResult | null> {
    for (const strategy of this.strategies) {
      try {
        if (strategy.canHandle(error)) {
          logger.info(`Attempting error recovery with strategy: ${strategy.name}`, {
            module: 'ErrorHandler',
            operation: 'tryStrategies',
            errorCode: error.message,
          });

          const result = await strategy.handle(error, context);

          if (result.handled) {
            logger.info(`Error successfully handled by strategy: ${strategy.name}`, {
              module: 'ErrorHandler',
              operation: 'tryStrategies',
              result: result,
            });
            return { ...result, metadata: { ...result.metadata, strategy: strategy.name } };
          }
        }
      } catch (strategyError) {
        logger.error(`Strategy ${strategy.name} failed to handle error`, strategyError as Error, {
          module: 'ErrorHandler',
          operation: 'tryStrategies',
          originalError: error.message,
        });
      }
    }

    return null;
  }

  /**
   * Tracks error rate to prevent spam
   */
  private trackErrorRate(): void {
    const now = Date.now();
    ErrorHandler.errorCount++;
    ErrorHandler.errorTimestamps.push(now);

    // 清理超过1分钟的错误记录
    ErrorHandler.errorTimestamps = ErrorHandler.errorTimestamps.filter(
      timestamp => now - timestamp < ERROR_HANDLING.ERROR_RATE_WINDOW
    );
  }

  /**
   * Checks if error rate limit is exceeded
   */
  private isErrorRateLimited(): boolean {
    return ErrorHandler.errorTimestamps.length > ErrorHandler.MAX_ERROR_RATE;
  }

  /**
   * Gets error statistics for debugging
   */
  public getErrorStats(): {
    totalErrors: number;
    recentErrors: number;
    isRateLimited: boolean;
    } {
    return {
      totalErrors: ErrorHandler.errorCount,
      recentErrors: ErrorHandler.errorTimestamps.length,
      isRateLimited: this.isErrorRateLimited(),
    };
  }

  /**
   * Resets error tracking (useful for testing)
   */
  public resetErrorTracking(): void {
    ErrorHandler.errorCount = 0;
    ErrorHandler.errorTimestamps = [];
  }

  /**
   * Converts any error to ClothoError with context
   */
  private normalizeError(
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
  private logError(error: ClothoError): void {
    const { operation, module, logLevel = 'error' } = error.context;
    const message = `${operation} failed`;

    this.logger.logForModule(
      logLevel.toUpperCase() as 'ERROR' | 'WARN' | 'INFO' | 'DEBUG',
      module,
      operation,
      message,
      {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause,
        },
      },
    );
  }

  /**
   * Shows user-friendly error message with rate limiting
   */
  private showUserError(error: ClothoError): void {
    const { operation, module } = error.context;
    let userMessage = `Failed to ${operation}: ${error.message}`;

    // 如果错误频率过高，显示汇总信息
    if (this.isErrorRateLimited()) {
      userMessage = `Multiple errors detected in ${module}. Please check the logs for details.`;
    }

    vscode.window.showErrorMessage(userMessage);
  }

  /**
   * Enhanced async wrapper with better error recovery options
   */
  public wrapAsync<T extends readonly unknown[], R>(
    fn: (...args: T) => Promise<R>,
    context: ErrorContext,
    fallbackValue?: R,
  ): (...args: T) => Promise<R | undefined> {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        await this.handle(error, context);
        return fallbackValue;
      }
    };
  }

  /**
   * Enhanced sync wrapper with better error recovery options
   */
  public wrapSync<T extends readonly unknown[], R>(
    fn: (...args: T) => R,
    context: ErrorContext,
    fallbackValue?: R,
  ): (...args: T) => R | undefined {
    return (...args: T): R | undefined => {
      try {
        return fn(...args);
      } catch (error) {
        // Note: Sync wrapper cannot use async strategies
        this.handle(error, context).catch(() => {
          // Ignore strategy errors in sync context
        });
        return fallbackValue;
      }
    };
  }

  /**
   * Creates a retry wrapper with exponential backoff
   */
  public withRetry<T extends readonly unknown[], R>(
    fn: (...args: T) => Promise<R>,
    context: ErrorContext,
    options: {
      maxAttempts?: number;
      baseDelay?: number;
      maxDelay?: number;
    } = {},
  ): (...args: T) => Promise<R | undefined> {
    const {
      maxAttempts = ERROR_HANDLING.MAX_RETRY_ATTEMPTS,
      baseDelay = ERROR_HANDLING.BASE_RETRY_DELAY,
      maxDelay = ERROR_HANDLING.MAX_RETRY_DELAY
    } = options;

    return async (...args: T): Promise<R | undefined> => {
      // let lastError: unknown; // 保留供调试使用

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await fn(...args);
        } catch (error) {
          // lastError = error; // 保存错误信息供调试

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
          //  使用统一的延迟函数
          await asyncDelay(delay);
        }
      }

      return undefined;
    };
  }

  /**
   * Batch error handler for multiple operations
   */
  public async handleBatch<T>(
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
        errors.push(await handledError);
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
 * Global instance of ErrorHandler
 */
export const errorHandler = new ErrorHandler(logger);


/**
 * Enhanced decorator for automatic error handling in methods
 * Supports both sync and async methods with flexible error handling options
 */
export function handleErrors(context: Partial<ErrorContext> = {}) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    if (typeof originalMethod !== 'function') {
      return descriptor;
    }

    descriptor.value = function (...args: readonly unknown[]): unknown {
      const fullContext: ErrorContext = {
        operation: propertyKey,
        module: (target as { constructor: { name: string } }).constructor.name,
        showToUser: false,
        logLevel: 'error',
        rethrow: false, // Do not rethrow errors by default
        ...context,
      };

      try {
        const result = originalMethod.apply(this, args);

        if (result instanceof Promise) {
          // 异步方法处理
          return result.catch((error) => {
            const handledError = errorHandler.handle(error, fullContext);

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
        const handledError = errorHandler.handle(error, fullContext);

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
