/**
 * Webview Logger Adapter
 * Provides unified logging interface for webview environment
 * Sends log messages to VS Code extension main process
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
   * Send log to VS Code extension
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
            // If sending fails, at least output to console
            console.error('Failed to send log to extension:', error);
        }
    }

      /**
   * Output to console (optional)
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
   * Check log level
   */
    private shouldLog(level: string): boolean {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.config.logLevel || 'info');
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }

      /**
   * Log debug information
   */
    debug(message: string, meta?: any) {
        if (!this.shouldLog('debug')) return;
        this.sendToExtension('debug', message, meta);
        this.outputToConsole('debug', message, meta);
    }

      /**
   * Log information
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
   * Log error
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
   * Log user action
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
 * Create webview logger instance
 */
export function createWebviewLogger(vscode: any, config?: WebviewLoggerConfig): WebviewLogger {
    return new WebviewLogger(vscode, config);
}

/**
 * Default webview logger (needs to be initialized before use)
 */
let defaultLogger: WebviewLogger | null = null;

/**
 * Initialize default logger
 */
export function initializeWebviewLogger(vscode: any, config?: WebviewLoggerConfig) {
    defaultLogger = new WebviewLogger(vscode, config);
}

/**
 * Get default logger
 */
export function getWebviewLogger(): WebviewLogger {
    if (!defaultLogger) {
        throw new Error('Webview logger not initialized. Call initializeWebviewLogger first.');
    }
    return defaultLogger;
}

/**
 * Convenient logging functions (using default logger)
 */
export const webviewLog = {
    debug: (message: string, meta?: any) => getWebviewLogger().debug(message, meta),
    info: (message: string, meta?: any) => getWebviewLogger().info(message, meta),
    warn: (message: string, meta?: any) => getWebviewLogger().warn(message, meta),
    error: (message: string, error?: Error | any, meta?: any) => getWebviewLogger().error(message, error, meta),
    userAction: (action: string, component?: string, meta?: any) => getWebviewLogger().logUserAction(action, component, meta),
    performance: (operation: string, duration: number, meta?: any) => getWebviewLogger().logPerformance(operation, duration, meta),
};
