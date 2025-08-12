/**
 * Logger Service
 * 基于 tslog 的统一日志服务
 * 为 Clotho 扩展提供结构化、类型安全的日志功能
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

/**
 * 日志配置接口
 */
export interface LoggerConfig {
  name?: string;
  minLevel?: LogLevel;
  displayDateTime?: boolean;
  displayFunctionName?: boolean;
  displayFilePath?: 'hidden' | 'displayAll' | 'hideNodeModulesOnly';
  colorizePrettyLogs?: boolean;
  prettyLogTemplate?: string;
}

/**
 * 扩展的日志对象接口
 */
interface ExtendedLogObj extends ILogObj {
  module?: string;
  operation?: string;
  userId?: string;
  requestId?: string;
}

/**
 * Logger 服务类
 * 封装 tslog 并提供 VS Code 特定的功能
 */
export class LoggerService {
  private static instance: LoggerService;
  private logger: TsLogger<ExtendedLogObj>;
  private outputChannel?: vscode.OutputChannel;

  private constructor(config: LoggerConfig = {}) {
    // 默认配置
    const defaultConfig: ISettingsParam<ExtendedLogObj> = {
      name: config.name || 'Clotho',
      minLevel: config.minLevel || LogLevel.INFO,
      type: 'pretty',
      prettyLogTemplate: config.prettyLogTemplate ||
        '{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{name}}]\t{{filePathWithLine}}{{nameWithDelimiterPrefix}}\t',
    };

    this.logger = new TsLogger<ExtendedLogObj>(defaultConfig);
  }

  /**
     * 获取 Logger 服务单例
     */
  public static getInstance(config?: LoggerConfig): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService(config);
    }
    return LoggerService.instance;
  }

  /**
     * 初始化 VS Code Output Channel
     */
  public initializeOutputChannel(): void {
    if (!this.outputChannel) {
      this.outputChannel = vscode.window.createOutputChannel('Clotho Logs');

      // 重定向日志到 Output Channel
      this.logger.attachTransport((logObj) => {
        this.logToOutputChannel(logObj);
      });
    }
  }

  /**
     * 输出日志到 VS Code Output Channel
     */
  private logToOutputChannel(logObj: Record<string, unknown>): void {
    if (this.outputChannel) {
      const timestamp = new Date().toISOString();
      const level = ((logObj._meta as { logLevelName?: string })?.logLevelName || 'INFO').toUpperCase();
      const module = logObj.module ? `[${logObj.module}]` : '';
      const operation = logObj.operation ? `{${logObj.operation}}` : '';

      // 获取实际的日志消息
      const message = logObj[0] || logObj.message || 'No message';
      const logLine = `${timestamp} ${level} ${module}${operation} ${(logObj._meta as { name?: string })?.name || 'Clotho'}: ${message}`;
      this.outputChannel.appendLine(logLine);
    }
  }

  /**
     * 创建子 Logger（用于特定模块）
     */
  public createChildLogger(moduleName: string): TsLogger<ExtendedLogObj> {
    return this.logger.getSubLogger({ name: moduleName });
  }

  /**
     * 显示 Output Channel
     */
  public showOutputChannel(): void {
    this.outputChannel?.show();
  }

  /**
     * 清空日志
     */
  public clearLogs(): void {
    this.outputChannel?.clear();
  }

  // === 便捷的日志方法 ===

  /**
     * 记录调试信息
     */
  public debug(message: string, meta?: Partial<ExtendedLogObj>): void {
    this.logger.debug(message, meta);
  }

  /**
     * 记录普通信息
     */
  public info(message: string, meta?: Partial<ExtendedLogObj>): void {
    this.logger.info(message, meta);
  }

  /**
     * 记录警告信息
     */
  public warn(message: string, meta?: Partial<ExtendedLogObj>): void {
    this.logger.warn(message, meta);
  }

  /**
     * 记录错误信息
     */
  public error(message: string, error?: Error, meta?: Partial<ExtendedLogObj>): void {
    const errorMeta = error ? {
      ...meta,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    } : meta;

    this.logger.error(message, errorMeta);
  }

  /**
     * 记录致命错误
     */
  public fatal(message: string, error?: Error, meta?: Partial<ExtendedLogObj>): void {
    const errorMeta = error ? {
      ...meta,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    } : meta;

    this.logger.fatal(message, errorMeta);
  }

  /**
     * 记录模块特定的日志
     */
  public logForModule(
    level: keyof typeof LogLevel,
    module: string,
    operation: string,
    message: string,
    meta?: Partial<ExtendedLogObj>
  ): void {
    const enrichedMeta = {
      ...meta,
      module,
      operation,
    };

    switch (level.toLowerCase()) {
      case 'debug':
        this.logger.debug(message, enrichedMeta);
        break;
      case 'info':
        this.logger.info(message, enrichedMeta);
        break;
      case 'warn':
        this.logger.warn(message, enrichedMeta);
        break;
      case 'error':
        this.logger.error(message, enrichedMeta);
        break;
      case 'fatal':
        this.logger.fatal(message, enrichedMeta);
        break;
      default:
        this.logger.info(message, enrichedMeta);
    }
  }

  /**
     * 记录性能指标
     */
  public logPerformance(
    operation: string,
    duration: number,
    module?: string,
    meta?: Partial<ExtendedLogObj>
  ): void {
    this.logForModule('INFO', module || 'Performance', operation,
      `Operation completed in ${duration}ms`, {
      ...meta,
      performance: {
        duration,
        operation,
      }
    });
  }

  /**
     * 记录用户操作
     */
  public logUserAction(
    action: string,
    module: string,
    meta?: Partial<ExtendedLogObj>
  ): void {
    this.logForModule('INFO', module, 'UserAction',
      `User performed: ${action}`, {
      ...meta,
      userAction: action,
    });
  }

  /**
     * 获取底层 tslog 实例（用于高级用法）
     */
  public getLogger(): TsLogger<ExtendedLogObj> {
    return this.logger;
  }

  /**
     * 销毁 Logger 服务
     */
  public dispose(): void {
    this.outputChannel?.dispose();
  }
}

/**
 * 全局 Logger 实例
 * 可以在整个扩展中使用
 */
export const logger = LoggerService.getInstance({
  name: 'Clotho',
  minLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  displayFunctionName: true,
  displayFilePath: 'hideNodeModulesOnly',
  colorizePrettyLogs: true,
});

/**
 * 为特定模块创建 Logger 的工厂函数
 */
export function createModuleLogger(moduleName: string): TsLogger<ExtendedLogObj> {
  return logger.createChildLogger(moduleName);
}
