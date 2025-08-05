/**
 * 防抖管理器
 * 处理快速操作和并发控制，确保界面稳定性
 */

import { ERROR_HANDLING } from '../../../common/constants';
import { errorHandler } from '../../../common/error-handler';
import { logger } from '../../../common/logger';

/**
 * 防抖配置选项
 */
export interface DebounceOptions {
  delay: number;
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * 操作锁配置
 */
export interface LockOptions {
  timeout?: number;
  throwOnTimeout?: boolean;
}

/**
 * 防抖管理器
 */
export class DebounceManager {
  private timers = new Map<string, NodeJS.Timeout>();
  private locks = new Set<string>();
  private lockTimers = new Map<string, NodeJS.Timeout>();
  private pendingOperations = new Map<string, Array<() => Promise<void>>>();

  /**
   * 防抖执行函数
   */
  debounce<T, A extends readonly unknown[]>(
    key: string,
    fn: (...args: A) => Promise<T>,
    options: DebounceOptions = { delay: 100 },
  ): (...args: A) => Promise<T | undefined> {
    return async (...args: A) => {
      try {
        // 清除之前的定时器
        const existingTimer = this.timers.get(key);
        if (existingTimer) {
          clearTimeout(existingTimer);
          this.timers.delete(key);
        }

        // 如果设置了leading，立即执行一次
        if (options.leading && !this.timers.has(key)) {
          return await fn(...args);
        }

        // 设置新的防抖定时器
        return new Promise<T | undefined>((resolve, reject) => {
          const timer = setTimeout(async () => {
            try {
              this.timers.delete(key);

              if (options.trailing !== false) {
                const result = await fn(...args);
                resolve(result);
              } else {
                resolve(undefined);
              }
            } catch (error) {
              this.timers.delete(key);
              reject(error);
            }
          }, options.delay);

          this.timers.set(key, timer);

          // 设置最大等待时间
          if (options.maxWait) {
            setTimeout(async () => {
              if (this.timers.has(key)) {
                clearTimeout(timer);
                this.timers.delete(key);
                try {
                  const result = await fn(...args);
                  resolve(result);
                } catch (error) {
                  reject(error);
                }
              }
            }, options.maxWait);
          }
        });
      } catch (error) {
        errorHandler.handle(error, {
          operation: 'debounceExecution',
          module: 'DebounceManager',
          showToUser: false,
          logLevel: 'error',
        });
        throw error;
      }
    };
  }

  /**
   * 带锁的操作执行
   */
  async withLock<T>(
    key: string,
    operation: () => Promise<T>,
    options: LockOptions = {},
  ): Promise<T> {
    try {
      // 检查是否已经被锁定
      if (this.locks.has(key)) {
        if (options.throwOnTimeout !== false) {
          // 使用更友好的日志级别
          logger.debug('Operation already in progress, skipping duplicate call', {
            module: 'DebounceManager',
            operation: key,
          });
          throw new Error(`Operation ${key} is already in progress`);
        }

        // 等待锁释放
        await this.waitForLock(key, options.timeout || ERROR_HANDLING.DEBOUNCE_LOCK_TIMEOUT);
      }

      // 获取锁
      this.locks.add(key);

      // 设置锁超时
      if (options.timeout) {
        const lockTimer = setTimeout(() => {
          this.locks.delete(key);
          this.lockTimers.delete(key);
          logger.warn('Lock timed out', {
            module: 'DebounceManager',
            operation: key,
            timeout: options.timeout
          });
        }, options.timeout);

        this.lockTimers.set(key, lockTimer);
      }

      try {
        const result = await operation();
        return result;
      } finally {
        // 释放锁
        this.locks.delete(key);

        const lockTimer = this.lockTimers.get(key);
        if (lockTimer) {
          clearTimeout(lockTimer);
          this.lockTimers.delete(key);
        }
      }
    } catch (error) {
      errorHandler.handle(error, {
        operation: 'withLock',
        module: 'DebounceManager',
        showToUser: false,
        logLevel: 'error',
      });
      throw error;
    }
  }

  /**
   * 等待锁释放
   */
  private async waitForLock(key: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkLock = () => {
        if (!this.locks.has(key)) {
          resolve();
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for lock ${key}`));
          return;
        }

        setTimeout(checkLock, ERROR_HANDLING.DEBOUNCE_CHECK_INTERVAL);
      };

      checkLock();
    });
  }

  /**
   * 队列化操作
   */
  async queueOperation(
    key: string,
    operation: () => Promise<void>,
  ): Promise<void> {
    if (!this.pendingOperations.has(key)) {
      this.pendingOperations.set(key, []);
    }

    const queue = this.pendingOperations.get(key)!;
    queue.push(operation);

    // 如果队列中只有一个操作，立即执行
    if (queue.length === 1) {
      await this.processQueue(key);
    }
  }

  /**
   * 处理操作队列
   */
  private async processQueue(key: string): Promise<void> {
    const queue = this.pendingOperations.get(key);
    if (!queue || queue.length === 0) {
      return;
    }

    try {
      while (queue.length > 0) {
        const operation = queue.shift()!;
        await operation();
      }
    } catch (error) {
      errorHandler.handle(error, {
        operation: 'processQueue',
        module: 'DebounceManager',
        showToUser: false,
        logLevel: 'error',
      });
    } finally {
      // 清理空队列
      if (queue.length === 0) {
        this.pendingOperations.delete(key);
      }
    }
  }

  /**
   * 取消防抖操作
   */
  cancel(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  /**
   * 取消所有防抖操作
   */
  cancelAll(): void {
    for (const [, timer] of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  /**
   * 强制释放锁
   */
  releaseLock(key: string): void {
    this.locks.delete(key);

    const lockTimer = this.lockTimers.get(key);
    if (lockTimer) {
      clearTimeout(lockTimer);
      this.lockTimers.delete(key);
    }
  }

  /**
   * 释放所有锁
   */
  releaseAllLocks(): void {
    this.locks.clear();

    for (const [, timer] of this.lockTimers) {
      clearTimeout(timer);
    }
    this.lockTimers.clear();
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    activeTimers: string[];
    activeLocks: string[];
    pendingQueues: string[];
    } {
    return {
      activeTimers: Array.from(this.timers.keys()),
      activeLocks: Array.from(this.locks),
      pendingQueues: Array.from(this.pendingOperations.keys()),
    };
  }

  /**
   * 清理所有资源
   */
  dispose(): void {
    this.cancelAll();
    this.releaseAllLocks();
    this.pendingOperations.clear();

    logger.info('All resources disposed', {
      module: 'DebounceManager',
      operation: 'dispose'
    });
  }
}
