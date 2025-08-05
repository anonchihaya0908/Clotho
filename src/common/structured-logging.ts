/**
 * 📝 结构化日志工具
 * 提供统一的日志记录、操作追踪和事件处理模式
 */

import { logger } from './logger';
import { errorHandler } from './error-handler';
import { 
  BaseResult, 
  DataResult, 
  AsyncOptions, 
  PerformanceStats, 
  Factory 
} from './type-utilities';

// ===============================
// 日志上下文接口
// ===============================

/**
 * 📊 操作上下文信息
 */
export interface OperationContext {
  /** 模块名称 */
  module: string;
  /** 操作名称 */
  operation: string;
  /** 实例ID（可选） */
  instanceId?: string;
  /** 用户ID（可选） */
  userId?: string;
  /** 会话ID（可选） */
  sessionId?: string;
  /** 关联ID（用于追踪相关操作） */
  correlationId?: string;
  /** 额外的上下文数据 */
  metadata?: Record<string, any>;
}

/**
 * 📊 操作结果信息
 */
export interface OperationResult extends DataResult<any> {
  /** 操作开始时间 */
  startTime: number;
  /** 操作结束时间 */
  endTime: number;
  /** 结果元数据 */
  metadata?: Record<string, any>;
}

/**
 * 📊 操作统计信息
 */
export interface OperationStats extends PerformanceStats {
  /** 操作名称 */
  operationName: string;
  /** 模块名称 */
  moduleName: string;
  /** 最近的错误信息 */
  recentErrors: string[];
}

// ===============================
// 结构化日志记录器
// ===============================

/**
 * 📝 结构化日志记录器
 * 提供自动化的操作追踪和性能监控
 */
export class StructuredLogger {
  private static operationStats = new Map<string, OperationStats>();
  private static readonly MAX_RECENT_ERRORS = 5;

  /**
   * 🎯 记录并执行操作（同步版本）
   * 自动记录操作开始、结束、耗时和结果
   */
  static operation<T>(
    context: OperationContext,
    operation: () => T
  ): T {
    const startTime = Date.now();
    const operationKey = `${context.module}.${context.operation}`;

    // 记录操作开始
    logger.info(`🚀 Starting operation: ${context.operation}`, {
      module: context.module,
      operation: context.operation,
      instanceId: context.instanceId,
      correlationId: context.correlationId,
      startTime,
      metadata: context.metadata,
    });

    try {
      // 执行操作
      const result = operation();
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 记录成功
      logger.info(`✅ Operation completed: ${context.operation}`, {
        module: context.module,
        operation: context.operation,
        instanceId: context.instanceId,
        correlationId: context.correlationId,
        duration,
        success: true,
        metadata: context.metadata,
      });

      // 更新统计信息
      this.updateStats(operationKey, context, duration, true);

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 记录错误
      logger.error(`❌ Operation failed: ${context.operation}`, error as Error, {
        module: context.module,
        operation: context.operation,
        instanceId: context.instanceId,
        correlationId: context.correlationId,
        duration,
        success: false,
        error: errorMessage,
        metadata: context.metadata,
      });

      // 更新统计信息
      this.updateStats(operationKey, context, duration, false, errorMessage);

      throw error;
    }
  }

  /**
   * 🎯 记录并执行异步操作
   * 自动记录操作开始、结束、耗时和结果
   */
  static async asyncOperation<T>(
    context: OperationContext,
    operation: () => Promise<T>,
    options?: AsyncOptions
  ): Promise<T> {
    const startTime = Date.now();
    const operationKey = `${context.module}.${context.operation}`;

    // 记录操作开始
    logger.info(`🚀 Starting async operation: ${context.operation}`, {
      module: context.module,
      operation: context.operation,
      instanceId: context.instanceId,
      correlationId: context.correlationId,
      startTime,
      timeout: options?.timeout,
      metadata: context.metadata,
    });

    try {
      // 设置超时处理
      let result: T;
      if (options?.timeout) {
        result = await Promise.race([
          operation(),
          this.createTimeoutPromise<T>(options.timeout, context)
        ]);
      } else {
        result = await operation();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 记录成功
      logger.info(`✅ Async operation completed: ${context.operation}`, {
        module: context.module,
        operation: context.operation,
        instanceId: context.instanceId,
        correlationId: context.correlationId,
        duration,
        success: true,
        metadata: context.metadata,
      });

      // 更新统计信息
      this.updateStats(operationKey, context, duration, true);

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 记录错误
      logger.error(`❌ Async operation failed: ${context.operation}`, error as Error, {
        module: context.module,
        operation: context.operation,
        instanceId: context.instanceId,
        correlationId: context.correlationId,
        duration,
        success: false,
        error: errorMessage,
        metadata: context.metadata,
      });

      // 更新统计信息
      this.updateStats(operationKey, context, duration, false, errorMessage);

      throw error;
    }
  }

  /**
   * 🎯 记录并执行带结果的操作
   * 返回包含详细信息的操作结果
   */
  static async operationWithResult<T>(
    context: OperationContext,
    operation: () => Promise<T>
  ): Promise<OperationResult> {
    const startTime = Date.now();
    
    try {
      const data = await this.asyncOperation(context, operation);
      const endTime = Date.now();
      
      return {
        success: true,
        data,
        duration: endTime - startTime,
        startTime,
        endTime,
      };
    } catch (error) {
      const endTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        success: false,
        error: errorMessage,
        duration: endTime - startTime,
        startTime,
        endTime,
      };
    }
  }

  /**
   * 📊 获取操作统计信息
   */
  static getOperationStats(operationKey?: string): OperationStats[] {
    if (operationKey) {
      const stats = this.operationStats.get(operationKey);
      return stats ? [stats] : [];
    }
    return Array.from(this.operationStats.values());
  }

  /**
   * 🧹 清理操作统计
   */
  static clearStats(operationKey?: string): void {
    if (operationKey) {
      this.operationStats.delete(operationKey);
    } else {
      this.operationStats.clear();
    }
  }

  /**
   * 📈 生成操作报告
   */
  static generateReport(): {
    totalOperations: number;
    operationStats: OperationStats[];
    topErrors: { error: string; count: number }[];
    performanceSummary: {
      averageTime: number;
      slowestOperation: string;
      fastestOperation: string;
    };
  } {
    const stats = this.getOperationStats();
    const totalOperations = stats.reduce((sum, stat) => sum + stat.totalOperations, 0);
    
    // 收集所有错误
    const errorMap = new Map<string, number>();
    stats.forEach(stat => {
      stat.recentErrors.forEach(error => {
        errorMap.set(error, (errorMap.get(error) || 0) + 1);
      });
    });

    const topErrors = Array.from(errorMap.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 性能摘要
    const sortedByTime = [...stats].sort((a, b) => b.averageTime - a.averageTime);
    const slowestOperation = sortedByTime[0]?.operationName || 'N/A';
    const fastestOperation = sortedByTime[sortedByTime.length - 1]?.operationName || 'N/A';
    const averageTime = stats.reduce((sum, stat) => sum + stat.averageTime, 0) / (stats.length || 1);

    return {
      totalOperations,
      operationStats: stats,
      topErrors,
      performanceSummary: {
        averageTime,
        slowestOperation,
        fastestOperation,
      },
    };
  }

  /**
   * 🔄 更新操作统计信息
   */
  private static updateStats(
    operationKey: string,
    context: OperationContext,
    duration: number,
    success: boolean,
    error?: string
  ): void {
    let stats = this.operationStats.get(operationKey);
    
    if (!stats) {
      stats = {
        operationName: context.operation,
        moduleName: context.module,
        timestamp: Date.now(),
        averageTime: duration,
        minTime: duration,
        maxTime: duration,
        totalOperations: 1,
        successRate: success ? 1 : 0,
        recentErrors: error ? [error] : [],
      };
    } else {
      // 更新统计信息
      const newTotal = stats.totalOperations + 1;
      stats.averageTime = (stats.averageTime * stats.totalOperations + duration) / newTotal;
      stats.minTime = Math.min(stats.minTime, duration);
      stats.maxTime = Math.max(stats.maxTime, duration);
      stats.totalOperations = newTotal;
      stats.successRate = (stats.successRate * (newTotal - 1) + (success ? 1 : 0)) / newTotal;
      stats.timestamp = Date.now();

      // 更新错误列表
      if (error) {
        stats.recentErrors.unshift(error);
        if (stats.recentErrors.length > this.MAX_RECENT_ERRORS) {
          stats.recentErrors = stats.recentErrors.slice(0, this.MAX_RECENT_ERRORS);
        }
      }
    }

    this.operationStats.set(operationKey, stats);
  }

  /**
   * ⏰ 创建超时Promise
   */
  private static createTimeoutPromise<T>(timeout: number, context: OperationContext): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation ${context.operation} timed out after ${timeout}ms`));
      }, timeout);
    });
  }
}

// ===============================
// 日志装饰器
// ===============================

/**
 * 🎨 自动日志记录装饰器
 * 为方法添加自动的日志记录功能
 */
export function LogOperation(context?: Partial<OperationContext>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    if (typeof originalMethod !== 'function') {
      return descriptor;
    }

    descriptor.value = function (...args: any[]) {
      const operationContext: OperationContext = {
        module: target.constructor.name,
        operation: propertyKey,
        instanceId: (this as any).id || (this as any).name,
        ...context,
      };

      const result = originalMethod.apply(this, args);

      if (result instanceof Promise) {
        // 异步方法
        return StructuredLogger.asyncOperation(operationContext, () => result);
      } else {
        // 同步方法
        return StructuredLogger.operation(operationContext, () => result);
      }
    };

    return descriptor;
  };
}

/**
 * 🎨 性能监控装饰器
 * 专门用于性能敏感的操作监控
 */
export function MonitorPerformance(
  warningThreshold: number = 1000, // ms
  errorThreshold: number = 5000    // ms
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    if (typeof originalMethod !== 'function') {
      return descriptor;
    }

    descriptor.value = function (...args: any[]) {
      const startTime = Date.now();
      const context: OperationContext = {
        module: target.constructor.name,
        operation: propertyKey,
        instanceId: (this as any).id || (this as any).name,
      };

      const result = originalMethod.apply(this, args);

      const handleCompletion = (duration: number, error?: Error) => {
        const logContext = {
          module: context.module,
          operation: context.operation,
          instanceId: context.instanceId,
          duration,
        };

        if (error) {
          logger.error(`🐌 Operation ${propertyKey} failed after ${duration}ms`, error, logContext);
        } else if (duration > errorThreshold) {
          logger.error(`🐌 Operation ${propertyKey} took ${duration}ms (exceeds error threshold)`, 
            new Error(`Performance threshold exceeded`), logContext);
        } else if (duration > warningThreshold) {
          logger.warn(`⚠️ Operation ${propertyKey} took ${duration}ms (exceeds warning threshold)`, logContext);
        } else {
          logger.debug(`✅ Operation ${propertyKey} completed in ${duration}ms`, logContext);
        }
      };

      if (result instanceof Promise) {
        return result
          .then((value) => {
            handleCompletion(Date.now() - startTime);
            return value;
          })
          .catch((error) => {
            handleCompletion(Date.now() - startTime, error);
            throw error;
          });
      } else {
        handleCompletion(Date.now() - startTime);
        return result;
      }
    };

    return descriptor;
  };
}

// ===============================
// 事件模式工具
// ===============================

/**
 * 🎪 标准化事件发射器
 * 提供类型安全的事件处理
 */
export class TypedEventEmitter<TEvents extends Record<string, any[]>> {
  private listeners = new Map<keyof TEvents, Set<(...args: any[]) => void>>();
  private onceListeners = new Map<keyof TEvents, Set<(...args: any[]) => void>>();

  /**
   * 添加事件监听器
   */
  on<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // 返回取消订阅函数
    return () => this.off(event, listener);
  }

  /**
   * 添加一次性事件监听器
   */
  once<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): () => void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event)!.add(listener);

    // 返回取消订阅函数
    return () => this.onceListeners.get(event)?.delete(listener);
  }

  /**
   * 移除事件监听器
   */
  off<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): void {
    this.listeners.get(event)?.delete(listener);
    this.onceListeners.get(event)?.delete(listener);
  }

  /**
   * 发射事件
   */
  emit<K extends keyof TEvents>(event: K, ...args: TEvents[K]): void {
    // 记录事件发射
    logger.debug(`🎪 Event emitted: ${String(event)}`, {
      module: 'TypedEventEmitter',
      operation: 'emit',
      event: String(event),
      argsCount: args.length,
    });

    // 触发普通监听器
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          logger.error(`Event listener error for ${String(event)}`, error as Error, {
            module: 'TypedEventEmitter',
            operation: 'emit',
            event: String(event),
          });
        }
      });
    }

    // 触发一次性监听器
    const onceListeners = this.onceListeners.get(event);
    if (onceListeners) {
      const listenersArray = Array.from(onceListeners);
      onceListeners.clear(); // 清除一次性监听器

      listenersArray.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          logger.error(`Once event listener error for ${String(event)}`, error as Error, {
            module: 'TypedEventEmitter',
            operation: 'emit',
            event: String(event),
          });
        }
      });
    }
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    const regular = this.listeners.get(event)?.size || 0;
    const once = this.onceListeners.get(event)?.size || 0;
    return regular + once;
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): (keyof TEvents)[] {
    const events = new Set<keyof TEvents>();
    this.listeners.forEach((_, event) => events.add(event));
    this.onceListeners.forEach((_, event) => events.add(event));
    return Array.from(events);
  }
}

// ===============================
// 导出便捷函数
// ===============================

/**
 * 🎯 快速创建日志上下文
 */
export function createContext(
  module: string,
  operation: string,
  metadata?: Record<string, any>
): OperationContext {
  return {
    module,
    operation,
    correlationId: `${module}-${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    metadata,
  };
}

/**
 * 🎯 快速记录操作
 */
export function logOperation<T>(
  module: string,
  operation: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  return StructuredLogger.operation(createContext(module, operation, metadata), fn);
}

/**
 * 🎯 快速记录异步操作
 */
export function logAsyncOperation<T>(
  module: string,
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return StructuredLogger.asyncOperation(createContext(module, operation, metadata), fn);
}