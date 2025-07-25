/**
 * Webview Logger Adapter
 * 为 webview 环境提供统一的日志接口
 * 将日志消息发送到 VS Code 扩展主进程
 */

export interface WebviewLoggerConfig {
    enableConsoleOutput?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export class WebviewLogger {
    private vscode: any;
    private config: WebviewLoggerConfig;

    constructor(vscode: any, config: WebviewLoggerConfig = {}) {
        this.vscode = vscode;
        this.config = {
            enableConsoleOutput: true,
            logLevel: 'info',
            ...config
        };
    }

    /**
     * 发送日志到 VS Code 扩展
     */
    private sendToExtension(level: string, message: string, meta?: any) {
        try {
            this.vscode.postMessage({
                type: 'webview-log',
                payload: {
                    level,
                    message,
                    meta: {
                        timestamp: new Date().toISOString(),
                        source: 'webview',
                        ...meta
                    }
                }
            });
        } catch (error) {
            // 如果发送失败，至少在控制台输出
            console.error('Failed to send log to extension:', error);
        }
    }

    /**
     * 输出到控制台（可选）
     */
    private outputToConsole(level: string, message: string, meta?: any) {
        if (!this.config.enableConsoleOutput) return;

        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [Clotho-Webview] [${level.toUpperCase()}]`;
        
        switch (level) {
            case 'debug':
                console.debug(prefix, message, meta);
                break;
            case 'info':
                console.info(prefix, message, meta);
                break;
            case 'warn':
                console.warn(prefix, message, meta);
                break;
            case 'error':
                console.error(prefix, message, meta);
                break;
            default:
                console.log(prefix, message, meta);
        }
    }

    /**
     * 检查日志级别
     */
    private shouldLog(level: string): boolean {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.config.logLevel || 'info');
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }

    /**
     * 记录调试信息
     */
    debug(message: string, meta?: any) {
        if (!this.shouldLog('debug')) return;
        this.sendToExtension('debug', message, meta);
        this.outputToConsole('debug', message, meta);
    }

    /**
     * 记录信息
     */
    info(message: string, meta?: any) {
        if (!this.shouldLog('info')) return;
        this.sendToExtension('info', message, meta);
        this.outputToConsole('info', message, meta);
    }

    /**
     * 记录警告
     */
    warn(message: string, meta?: any) {
        if (!this.shouldLog('warn')) return;
        this.sendToExtension('warn', message, meta);
        this.outputToConsole('warn', message, meta);
    }

    /**
     * 记录错误
     */
    error(message: string, error?: Error | any, meta?: any) {
        if (!this.shouldLog('error')) return;
        
        const errorMeta = {
            ...meta,
            error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : error
        };
        
        this.sendToExtension('error', message, errorMeta);
        this.outputToConsole('error', message, errorMeta);
    }

    /**
     * 记录用户操作
     */
    logUserAction(action: string, component?: string, meta?: any) {
        this.info(`User action: ${action}`, {
            component,
            userAction: action,
            ...meta
        });
    }

    /**
     * 记录性能指标
     */
    logPerformance(operation: string, duration: number, meta?: any) {
        this.info(`Performance: ${operation} completed in ${duration}ms`, {
            performance: {
                operation,
                duration
            },
            ...meta
        });
    }
}

/**
 * 创建 webview logger 实例
 */
export function createWebviewLogger(vscode: any, config?: WebviewLoggerConfig): WebviewLogger {
    return new WebviewLogger(vscode, config);
}

/**
 * 默认的 webview logger（需要在使用前初始化）
 */
let defaultLogger: WebviewLogger | null = null;

/**
 * 初始化默认 logger
 */
export function initializeWebviewLogger(vscode: any, config?: WebviewLoggerConfig) {
    defaultLogger = new WebviewLogger(vscode, config);
}

/**
 * 获取默认 logger
 */
export function getWebviewLogger(): WebviewLogger {
    if (!defaultLogger) {
        throw new Error('Webview logger not initialized. Call initializeWebviewLogger first.');
    }
    return defaultLogger;
}

/**
 * 便捷的日志函数（使用默认 logger）
 */
export const webviewLog = {
    debug: (message: string, meta?: any) => getWebviewLogger().debug(message, meta),
    info: (message: string, meta?: any) => getWebviewLogger().info(message, meta),
    warn: (message: string, meta?: any) => getWebviewLogger().warn(message, meta),
    error: (message: string, error?: Error | any, meta?: any) => getWebviewLogger().error(message, error, meta),
    userAction: (action: string, component?: string, meta?: any) => getWebviewLogger().logUserAction(action, component, meta),
    performance: (operation: string, duration: number, meta?: any) => getWebviewLogger().logPerformance(operation, duration, meta),
};
