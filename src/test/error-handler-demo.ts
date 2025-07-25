/**
 * 测试和演示 ErrorHandler 增强功能的示例文件
 * 这个文件展示了如何使用改进后的错误处理装饰器和方法
 */

import {
    handleErrors,
    handleErrorsSilently,
    handleErrorsWithRethrow,
    ErrorHandler
} from '../common/error-handler';

/**
 * 示例服务类，展示不同的错误处理策略
 */
export class ExampleService {

    /**
     * 使用默认的 handleErrors 装饰器
     * 不重新抛出错误，返回 undefined
     */
    @handleErrors({ showToUser: true })
    public async performNonCriticalOperation(): Promise<string> {
        // 模拟可能失败的操作
        if (Math.random() < 0.5) {
            throw new Error('Random failure in non-critical operation');
        }
        return 'Operation successful';
    }

    /**
     * 使用 handleErrorsSilently 装饰器
     * 静默处理错误，不显示给用户
     */
    @handleErrorsSilently()
    public updateUI(): void {
        // 模拟 UI 更新失败
        throw new Error('UI update failed');
        // 这个错误会被静默处理，不会影响主流程
    }

    /**
     * 使用 handleErrorsWithRethrow 装饰器
     * 关键操作，需要重新抛出错误
     */
    @handleErrorsWithRethrow({ showToUser: true })
    public async saveCriticalData(data: any): Promise<void> {
        // 模拟关键数据保存
        if (!data) {
            throw new Error('Critical data is null');
        }
        // 保存逻辑...
    }

    /**
     * 同步方法的错误处理
     */
    @handleErrors({ logLevel: 'warn' })
    public calculateSomething(value: number): number {
        if (value < 0) {
            throw new Error('Negative values not supported');
        }
        return value * 2;
    }

    /**
     * 使用 withRetry 包装器的示例
     */
    public async performWithRetry() {
        const retryableOperation = ErrorHandler.withRetry(
            async () => {
                // 模拟不稳定的网络操作
                if (Math.random() < 0.7) {
                    throw new Error('Network error');
                }
                return 'Success';
            },
            {
                operation: 'networkCall',
                module: 'ExampleService',
                showToUser: true,
            },
            {
                maxAttempts: 3,
                baseDelay: 1000,
                maxDelay: 5000,
            }
        );

        return await retryableOperation();
    }

    /**
     * 批量操作的错误处理示例
     */
    public async processBatchData(items: any[]) {
        const operations = items.map(item => async () => {
            if (!item) {
                throw new Error('Invalid item');
            }
            // 处理单个项目
            return `processed: ${item}`;
        });

        const result = await ErrorHandler.handleBatch(operations, {
            module: 'ExampleService',
            showToUser: true,
        });

        console.log(`Batch processing: ${result.successCount}/${items.length} succeeded`);
        return result;
    }

    /**
     * 使用包装器方法的示例
     */
    public setupWrappedMethods() {
        // 异步包装器，带有回退值
        const safeAsyncMethod = ErrorHandler.wrapAsync(
            async (value: string) => {
                if (!value) throw new Error('Empty value');
                return value.toUpperCase();
            },
            {
                operation: 'stringTransform',
                module: 'ExampleService',
                showToUser: false,
            },
            'DEFAULT_VALUE' // 回退值
        );

        // 同步包装器，带有回退值
        const safeSyncMethod = ErrorHandler.wrapSync(
            (numbers: number[]) => {
                if (numbers.length === 0) throw new Error('Empty array');
                return numbers.reduce((a, b) => a + b, 0);
            },
            {
                operation: 'arraySum',
                module: 'ExampleService',
                logLevel: 'warn',
            },
            0 // 回退值
        );

        return { safeAsyncMethod, safeSyncMethod };
    }
}

/**
 * 使用示例和测试
 */
export async function demonstrateErrorHandling() {
    const service = new ExampleService();

    console.log('=== ErrorHandler 增强功能演示 ===\n');

    // 1. 非关键操作（不重新抛出错误）
    console.log('1. 非关键操作测试:');
    const result1 = await service.performNonCriticalOperation();
    console.log('Result:', result1 || 'Operation failed but handled gracefully');

    // 2. 静默错误处理
    console.log('\n2. 静默错误处理测试:');
    service.updateUI(); // 不会抛出错误
    console.log('UI update attempted (errors handled silently)');

    // 3. 关键操作（重新抛出错误）
    console.log('\n3. 关键操作测试:');
    try {
        await service.saveCriticalData(null);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log('Critical operation failed and error was re-thrown:', errorMessage);
    }

    // 4. 同步方法错误处理
    console.log('\n4. 同步方法测试:');
    const result4 = service.calculateSomething(-5);
    console.log('Calculation result:', result4 || 'Failed but handled');

    // 5. 重试机制演示
    console.log('\n5. 重试机制测试:');
    const retryResult = await service.performWithRetry();
    console.log('Retry result:', retryResult || 'Failed after retries');

    // 6. 批量处理演示
    console.log('\n6. 批量处理测试:');
    const batchResult = await service.processBatchData(['item1', null, 'item3', 'item4']);
    console.log('Batch result:', batchResult);

    // 7. 包装器方法演示
    console.log('\n7. 包装器方法测试:');
    const { safeAsyncMethod, safeSyncMethod } = service.setupWrappedMethods();

    const asyncResult = await safeAsyncMethod('');
    console.log('Safe async result:', asyncResult);

    const syncResult = safeSyncMethod([]);
    console.log('Safe sync result:', syncResult);

    // 8. 错误统计信息
    console.log('\n8. 错误统计信息:');
    const stats = ErrorHandler.getErrorStats();
    console.log('Error statistics:', stats);
}
