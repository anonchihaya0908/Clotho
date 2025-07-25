/**
 * Logger 使用演示
 * 展示如何在 Clotho 扩展中使用新的 Logger 服务
 */

import { logger, createModuleLogger, LoggerService } from '../common/logger';

/**
 * 演示 Logger 基本用法的服务类
 */
export class LoggerDemoService {
    // 为这个模块创建专用的 logger
    private moduleLogger = createModuleLogger('LoggerDemo');

    /**
     * 演示基本的日志记录
     */
    public demonstrateBasicLogging(): void {
        console.log('=== Logger 基本用法演示 ===\n');

        // 1. 使用全局 logger
        logger.info('这是一条信息日志');
        logger.warn('这是一条警告日志');
        logger.error('这是一条错误日志', new Error('示例错误'));

        // 2. 使用模块专用 logger
        this.moduleLogger.debug('模块调试信息');
        this.moduleLogger.info('模块操作完成');

        // 3. 带有元数据的日志
        logger.info('用户执行了操作', {
            module: 'UserInterface',
            operation: 'buttonClick',
            userId: 'user123',
            requestId: 'req-456',
        });
    }

    /**
     * 演示结构化日志记录
     */
    public demonstrateStructuredLogging(): void {
        console.log('\n=== 结构化日志演示 ===\n');

        // 记录用户操作
        logger.logUserAction('打开可视化编辑器', 'VisualEditor', {
            fileName: 'test.cpp',
            configType: 'clang-format',
        });

        // 记录性能指标
        const startTime = Date.now();
        
        // 模拟一些操作
        setTimeout(() => {
            const duration = Date.now() - startTime;
            logger.logPerformance('配置文件解析', duration, 'ConfigParser', {
                fileSize: 1024,
                configCount: 25,
            });
        }, 100);

        // 记录模块特定的操作
        logger.logForModule('INFO', 'ClangdMonitor', 'processRestart', 
            'Clangd 进程重启成功', {
                processId: 12345,
                memoryUsage: '128MB',
                restartReason: 'user_request',
            });
    }

    /**
     * 演示错误处理和日志记录
     */
    public async demonstrateErrorLogging(): Promise<void> {
        console.log('\n=== 错误日志演示 ===\n');

        try {
            // 模拟一个可能失败的操作
            await this.simulateFailingOperation();
        } catch (error) {
            // 详细的错误日志记录
            logger.error('操作执行失败', error as Error, {
                module: 'FileProcessor',
                operation: 'processConfigFile',
                fileName: 'invalid-config.json',
                attemptNumber: 3,
            });
        }

        // 记录致命错误
        try {
            throw new Error('系统关键组件初始化失败');
        } catch (error) {
            logger.fatal('扩展无法继续运行', error as Error, {
                module: 'Bootstrap',
                operation: 'initialization',
                component: 'ServiceContainer',
            });
        }
    }

    /**
     * 演示日志级别和过滤
     */
    public demonstrateLogLevels(): void {
        console.log('\n=== 日志级别演示 ===\n');

        // 不同级别的日志
        this.moduleLogger.silly('极详细的调试信息（通常在生产环境中被过滤）');
        this.moduleLogger.trace('追踪信息');
        this.moduleLogger.debug('调试信息');
        this.moduleLogger.info('普通信息');
        this.moduleLogger.warn('警告信息');
        this.moduleLogger.error('错误信息');
        this.moduleLogger.fatal('致命错误');

        console.log('注意：根据当前日志级别设置，某些日志可能不会显示');
    }

    /**
     * 演示与 VS Code Output Channel 的集成
     */
    public demonstrateVSCodeIntegration(): void {
        console.log('\n=== VS Code 集成演示 ===\n');

        // 初始化 Output Channel（通常在扩展激活时执行）
        logger.initializeOutputChannel();

        // 这些日志会同时显示在控制台和 VS Code 的 Output Channel 中
        logger.info('这条日志会出现在 VS Code 的 "Clotho Logs" Output Channel 中');
        logger.warn('您可以通过 View > Output > Clotho Logs 查看所有日志');

        // 显示 Output Channel
        setTimeout(() => {
            logger.showOutputChannel();
        }, 1000);
    }

    /**
     * 模拟一个失败的操作
     */
    private async simulateFailingOperation(): Promise<void> {
        // 记录操作开始
        logger.debug('开始执行可能失败的操作', {
            module: 'LoggerDemo',
            operation: 'simulateFailingOperation',
        });

        // 模拟异步操作
        await new Promise(resolve => setTimeout(resolve, 50));

        // 抛出错误
        throw new Error('模拟的操作失败：文件不存在');
    }

    /**
     * 演示日志清理
     */
    public demonstrateLogCleanup(): void {
        console.log('\n=== 日志清理演示 ===\n');

        logger.info('这是清理前的日志');
        logger.warn('这也是清理前的日志');

        // 清空日志
        setTimeout(() => {
            logger.clearLogs();
            logger.info('日志已清空，这是清空后的第一条日志');
        }, 2000);
    }
}

/**
 * 演示如何在现有的 ErrorHandler 中集成 Logger
 */
export class EnhancedErrorHandler {
    private static logger = createModuleLogger('ErrorHandler');

    /**
     * 增强的错误处理方法
     */
    public static handleError(
        error: Error,
        context: {
            operation: string;
            module: string;
            showToUser?: boolean;
            logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
        }
    ): void {
        const { operation, module, showToUser = false, logLevel = 'error' } = context;

        // 使用结构化日志记录错误
        this.logger[logLevel](
            `操作失败: ${operation}`,
            {
                module,
                operation,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
                showToUser,
            }
        );

        // 如果需要显示给用户
        if (showToUser) {
            import('vscode').then(vscode => {
                vscode.window.showErrorMessage(`${module}: ${error.message}`);
            });
        }
    }

    /**
     * 记录操作成功
     */
    public static logSuccess(
        operation: string,
        module: string,
        duration?: number,
        meta?: Record<string, any>
    ): void {
        const message = duration 
            ? `操作成功完成: ${operation} (耗时: ${duration}ms)`
            : `操作成功完成: ${operation}`;

        this.logger.info(message, {
            module,
            operation,
            duration,
            ...meta,
        });
    }
}

/**
 * 运行所有演示
 */
export async function runLoggerDemo(): Promise<void> {
    const demo = new LoggerDemoService();

    console.log('🚀 开始 Logger 功能演示...\n');

    // 基本用法
    demo.demonstrateBasicLogging();

    // 结构化日志
    demo.demonstrateStructuredLogging();

    // 错误处理
    await demo.demonstrateErrorLogging();

    // 日志级别
    demo.demonstrateLogLevels();

    // VS Code 集成
    demo.demonstrateVSCodeIntegration();

    // 日志清理
    demo.demonstrateLogCleanup();

    console.log('\n✅ Logger 演示完成！');
    console.log('💡 提示：在 VS Code 中打开 "Output" 面板并选择 "Clotho Logs" 查看完整日志');
}

// 导出一个简单的使用示例
export const quickLoggerExample = {
    // 快速记录信息
    logInfo: (message: string, module?: string) => {
        logger.info(message, { module });
    },

    // 快速记录错误
    logError: (error: Error, module?: string, operation?: string) => {
        logger.error(error.message, error, { module, operation });
    },

    // 快速记录性能
    logPerformance: (operation: string, startTime: number, module?: string) => {
        const duration = Date.now() - startTime;
        logger.logPerformance(operation, duration, module);
    },
};
