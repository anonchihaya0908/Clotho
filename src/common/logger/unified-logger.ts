/**
 * Unified Logger System
 * =====================
 * 
 * Combines the functionality of LoggerService and StructuredLogger
 * into a single, comprehensive logging solution that supports:
 * - Structured logging with metadata
 * - Performance tracking and monitoring
 * - Operation context tracking
 * - Decorator-friendly API
 * - VS Code output channel integration
 */

import { ILogObj, ISettingsParam, Logger as TsLogger } from 'tslog';
import * as vscode from 'vscode';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  SILLY = 0,
  TRACE = 1,
  DEBUG = 2,
  INFO = 3,
  WARN = 4,
  ERROR = 5,
  FATAL = 6,
}

// ===============================
// Types and Interfaces
// ===============================

/**
 * Extended log object with operation context
 */
export interface LogContext extends ILogObj {
  module?: string;
  operation?: string;
  correlationId?: string;
  instanceId?: string;
  userId?: string;
  sessionId?: string;
  duration?: number;
  success?: boolean;
  performance?: 'slow' | 'normal' | 'fast' | 'failed';
  startTime?: number;
  endTime?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Performance statistics for operations
 */
export interface PerformanceStats {
  operationName: string;
  moduleName: string;
  totalCalls: number;
  successRate: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  recentErrors: string[];
  lastUpdated: number;
}

/**
 * Configuration for the unified logger
 */
export interface UnifiedLoggerConfig {
  name?: string;
  minLevel?: LogLevel;
  enablePerformanceTracking?: boolean;
  enableOutputChannel?: boolean;
  slowOperationThreshold?: number;
  maxRecentErrors?: number;
}

// ===============================
// Unified Logger Class
// ===============================

/**
 * Unified Logger that combines structured logging with performance tracking
 */
export class UnifiedLogger {
  private static instance: UnifiedLogger;
  private logger: TsLogger<LogContext>;
  private outputChannel?: vscode.OutputChannel;
  private performanceStats = new Map<string, PerformanceStats>();
  private config: Required<UnifiedLoggerConfig>;

  private constructor(config: UnifiedLoggerConfig = {}) {
    this.config = {
      name: config.name || 'Clotho',
      minLevel: config.minLevel || LogLevel.INFO,
      enablePerformanceTracking: config.enablePerformanceTracking ?? true,
      enableOutputChannel: config.enableOutputChannel ?? true,
      slowOperationThreshold: config.slowOperationThreshold || 1000,
      maxRecentErrors: config.maxRecentErrors || 10,
    };

    // Initialize tslog instance
    const loggerConfig: ISettingsParam<LogContext> = {
      name: this.config.name,
      minLevel: this.config.minLevel,
      type: 'pretty',
      prettyLogTemplate:
        '{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{name}}]\t{{filePathWithLine}}{{nameWithDelimiterPrefix}}\t',
    };

    this.logger = new TsLogger<LogContext>(loggerConfig);

    // Initialize output channel if enabled
    if (this.config.enableOutputChannel) {
      this.initializeOutputChannel();
    }
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(config?: UnifiedLoggerConfig): UnifiedLogger {
    if (!UnifiedLogger.instance) {
      UnifiedLogger.instance = new UnifiedLogger(config);
    }
    return UnifiedLogger.instance;
  }

  /**
   * Initialize VS Code output channel
   */
  private initializeOutputChannel(): void {
    if (!this.outputChannel) {
      this.outputChannel = vscode.window.createOutputChannel(`${this.config.name} Logs`);

      this.logger.attachTransport((logObj) => {
        this.writeToOutputChannel(logObj);
      });
    }
  }

  /**
   * Write log to VS Code output channel
   */
  private writeToOutputChannel(logObj: Record<string, unknown>): void {
    if (!this.outputChannel) return;

    const timestamp = new Date().toISOString();
    const level = ((logObj._meta as { logLevelName?: string })?.logLevelName || 'INFO').toUpperCase();
    const module = logObj.module ? `[${logObj.module}]` : '';
    const operation = logObj.operation ? `{${logObj.operation}}` : '';
    const correlationId = logObj.correlationId ? `<${logObj.correlationId}>` : '';
    const duration = logObj.duration ? ` (${logObj.duration}ms)` : '';

    const message = logObj[0] || logObj.message || 'No message';
    const logLine = `${timestamp} ${level} ${module}${operation}${correlationId}${duration} ${this.config.name}: ${message}`;

    this.outputChannel.appendLine(logLine);
  }

  // ===============================
  // Basic Logging Methods
  // ===============================

  /**
   * Log debug message
   */
  public debug(message: string, context?: Partial<LogContext>): void {
    this.logger.debug(message, context);
  }

  /**
   * Log info message
   */
  public info(message: string, context?: Partial<LogContext>): void {
    this.logger.info(message, context);
  }

  /**
   * Log warning message
   */
  public warn(message: string, context?: Partial<LogContext>): void {
    this.logger.warn(message, context);
  }

  /**
   * Log error message
   */
  public error(message: string, error?: Error, context?: Partial<LogContext>): void {
    const enrichedContext = error ? {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    } : context;

    this.logger.error(message, enrichedContext);
  }

  /**
   * Log fatal error message
   */
  public fatal(message: string, error?: Error, context?: Partial<LogContext>): void {
    const enrichedContext = error ? {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    } : context;

    this.logger.fatal(message, enrichedContext);
  }

  // ===============================
  // Operation Tracking Methods
  // ===============================

  /**
   * Execute and track a synchronous operation
   */
  public trackOperation<T>(
    module: string,
    operation: string,
    fn: () => T,
    metadata?: Record<string, unknown>
  ): T {
    const startTime = Date.now();
    const correlationId = this.generateCorrelationId(module, operation);
    const context: LogContext = {
      module,
      operation,
      correlationId,
      startTime,
      metadata,
    };

    this.info(`Starting operation: ${operation}`, context);

    try {
      const result = fn();
      const endTime = Date.now();
      const duration = endTime - startTime;

      this.logOperationComplete(module, operation, duration, true, correlationId, metadata);

      if (this.config.enablePerformanceTracking) {
        this.updatePerformanceStats(module, operation, duration, true);
      }

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logOperationError(module, operation, duration, error as Error, correlationId, metadata);

      if (this.config.enablePerformanceTracking) {
        this.updatePerformanceStats(module, operation, duration, false, errorMessage);
      }

      throw error;
    }
  }

  /**
   * Execute and track an asynchronous operation
   */
  public async trackAsyncOperation<T>(
    module: string,
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();
    const correlationId = this.generateCorrelationId(module, operation);
    const context: LogContext = {
      module,
      operation,
      correlationId,
      startTime,
      metadata,
    };

    this.info(`Starting async operation: ${operation}`, context);

    try {
      const result = await fn();
      const endTime = Date.now();
      const duration = endTime - startTime;

      this.logOperationComplete(module, operation, duration, true, correlationId, metadata);

      if (this.config.enablePerformanceTracking) {
        this.updatePerformanceStats(module, operation, duration, true);
      }

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logOperationError(module, operation, duration, error as Error, correlationId, metadata);

      if (this.config.enablePerformanceTracking) {
        this.updatePerformanceStats(module, operation, duration, false, errorMessage);
      }

      throw error;
    }
  }

  // ===============================
  // Performance Tracking
  // ===============================

  /**
   * Get performance statistics for operations
   */
  public getPerformanceStats(operationKey?: string): PerformanceStats[] {
    if (operationKey) {
      const stats = this.performanceStats.get(operationKey);
      return stats ? [stats] : [];
    }
    return Array.from(this.performanceStats.values());
  }

  /**
   * Clear performance statistics
   */
  public clearPerformanceStats(operationKey?: string): void {
    if (operationKey) {
      this.performanceStats.delete(operationKey);
    } else {
      this.performanceStats.clear();
    }
  }

  /**
   * Generate performance report
   */
  public generatePerformanceReport(): {
    totalOperations: number;
    avgDuration: number;
    slowestOperation: string;
    fastestOperation: string;
    topErrors: { error: string; count: number }[];
    operationStats: PerformanceStats[];
  } {
    const stats = this.getPerformanceStats();
    const totalOperations = stats.reduce((sum, stat) => sum + stat.totalCalls, 0);
    const avgDuration = stats.reduce((sum, stat) => sum + stat.averageDuration, 0) / (stats.length || 1);

    // Find slowest and fastest operations
    const sortedByDuration = [...stats].sort((a, b) => b.averageDuration - a.averageDuration);
    const slowestOperation = sortedByDuration[0]?.operationName || 'N/A';
    const fastestOperation = sortedByDuration[sortedByDuration.length - 1]?.operationName || 'N/A';

    // Collect top errors
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

    return {
      totalOperations,
      avgDuration,
      slowestOperation,
      fastestOperation,
      topErrors,
      operationStats: stats,
    };
  }

  // ===============================
  // Utility Methods
  // ===============================

  /**
   * Create a child logger for a specific module
   */
  public createModuleLogger(moduleName: string): ModuleLogger {
    return new ModuleLogger(this, moduleName);
  }

  /**
   * Show the output channel
   */
  public showOutputChannel(): void {
    this.outputChannel?.show();
  }

  /**
   * Clear the output channel
   */
  public clearOutputChannel(): void {
    this.outputChannel?.clear();
  }

  /**
   * Dispose of the logger resources
   */
  public dispose(): void {
    this.outputChannel?.dispose();
    this.performanceStats.clear();
  }

  // ===============================
  // Private Helper Methods
  // ===============================

  private generateCorrelationId(module: string, operation: string): string {
    return `${module}-${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private logOperationComplete(
    module: string,
    operation: string,
    duration: number,
    success: boolean,
    correlationId: string,
    metadata?: Record<string, unknown>
  ): void {
    const performance = this.getPerformanceCategory(duration);
    const context: LogContext = {
      module,
      operation,
      correlationId,
      duration,
      success,
      performance,
      metadata,
    };

    if (performance === 'slow') {
      this.warn(`Slow operation completed: ${operation} (${duration}ms)`, context);
    } else {
      this.info(`Operation completed: ${operation} (${duration}ms)`, context);
    }
  }

  private logOperationError(
    module: string,
    operation: string,
    duration: number,
    error: Error,
    correlationId: string,
    metadata?: Record<string, unknown>
  ): void {
    const context: LogContext = {
      module,
      operation,
      correlationId,
      duration,
      success: false,
      performance: 'failed',
      metadata,
    };

    this.error(`Operation failed: ${operation} (${duration}ms)`, error, context);
  }

  private getPerformanceCategory(duration: number): 'fast' | 'normal' | 'slow' {
    if (duration > this.config.slowOperationThreshold) {
      return 'slow';
    } else if (duration < this.config.slowOperationThreshold / 4) {
      return 'fast';
    }
    return 'normal';
  }

  private updatePerformanceStats(
    module: string,
    operation: string,
    duration: number,
    success: boolean,
    error?: string
  ): void {
    const key = `${module}.${operation}`;
    let stats = this.performanceStats.get(key);

    if (!stats) {
      stats = {
        operationName: operation,
        moduleName: module,
        totalCalls: 1,
        successRate: success ? 1 : 0,
        averageDuration: duration,
        minDuration: duration,
        maxDuration: duration,
        recentErrors: error ? [error] : [],
        lastUpdated: Date.now(),
      };
    } else {
      const newTotal = stats.totalCalls + 1;
      stats.averageDuration = (stats.averageDuration * stats.totalCalls + duration) / newTotal;
      stats.minDuration = Math.min(stats.minDuration, duration);
      stats.maxDuration = Math.max(stats.maxDuration, duration);
      stats.totalCalls = newTotal;
      stats.successRate = (stats.successRate * (newTotal - 1) + (success ? 1 : 0)) / newTotal;
      stats.lastUpdated = Date.now();

      if (error) {
        stats.recentErrors.unshift(error);
        if (stats.recentErrors.length > this.config.maxRecentErrors) {
          stats.recentErrors = stats.recentErrors.slice(0, this.config.maxRecentErrors);
        }
      }
    }

    this.performanceStats.set(key, stats);
  }
}

// ===============================
// Module-Specific Logger
// ===============================

/**
 * Module-specific logger that automatically includes module context
 */
export class ModuleLogger {
  constructor(
    private unifiedLogger: UnifiedLogger,
    private moduleName: string
  ) { }

  public debug(message: string, context?: Partial<LogContext>): void {
    this.unifiedLogger.debug(message, { ...context, module: this.moduleName });
  }

  public info(message: string, context?: Partial<LogContext>): void {
    this.unifiedLogger.info(message, { ...context, module: this.moduleName });
  }

  public warn(message: string, context?: Partial<LogContext>): void {
    this.unifiedLogger.warn(message, { ...context, module: this.moduleName });
  }

  public error(message: string, error?: Error, context?: Partial<LogContext>): void {
    this.unifiedLogger.error(message, error, { ...context, module: this.moduleName });
  }

  public fatal(message: string, error?: Error, context?: Partial<LogContext>): void {
    this.unifiedLogger.fatal(message, error, { ...context, module: this.moduleName });
  }

  public trackOperation<T>(
    operation: string,
    fn: () => T,
    metadata?: Record<string, unknown>
  ): T {
    return this.unifiedLogger.trackOperation(this.moduleName, operation, fn, metadata);
  }

  public async trackAsyncOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    return this.unifiedLogger.trackAsyncOperation(this.moduleName, operation, fn, metadata);
  }
}

// ===============================
// Global Instance and Exports
// ===============================

/**
 * Global unified logger instance
 */
export const unifiedLogger = UnifiedLogger.getInstance({
  name: 'Clotho',
  minLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enablePerformanceTracking: true,
  enableOutputChannel: true,
  slowOperationThreshold: 1000,
  maxRecentErrors: 10,
});

/**
 * Factory function for creating module loggers
 */
export function createModuleLogger(moduleName: string): ModuleLogger {
  return unifiedLogger.createModuleLogger(moduleName);
}

/**
 * Note: UnifiedLogger class is already exported at line 74
 * No need for duplicate export here
 */
