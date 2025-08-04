/**
 * 通用实例管理器
 * 提供实例的创建、获取、销毁和生命周期管理
 */

import * as vscode from 'vscode';
import { errorHandler } from '../error-handler';
import { LoggerService } from '../logger';

/**
 * 通用实例管理器接口
 */
export interface InstanceManager<T extends Disposable> {
  /**
   * 创建新实例
   * @param id 实例唯一标识
   * @param factory 实例工厂函数
   * @returns 创建的实例
   */
  create(id: string, factory: () => T): T;

  /**
   * 获取指定实例
   * @param id 实例标识
   * @returns 实例或undefined
   */
  get(id: string): T | undefined;

  /**
   * 获取所有实例
   * @returns 实例映射表
   */
  getAll(): Map<string, T>;

  /**
   * 销毁指定实例
   * @param id 实例标识
   * @returns 是否成功销毁
   */
  destroy(id: string): boolean;

  /**
   * 销毁所有实例
   */
  destroyAll(): void;

  /**
   * 获取实例数量
   */
  count(): number;

  /**
   * 检查实例是否存在
   * @param id 实例标识
   */
  has(id: string): boolean;
}

/**
 * 可销毁的实例接口
 */
export interface Disposable {
  dispose(): void;
}

/**
 * 实例管理器配置
 */
export interface InstanceManagerConfig {
  maxInstances?: number;
  autoCleanup?: boolean;
  cleanupInterval?: number;
}

/**
 * 通用实例管理器实现
 */
export class BaseInstanceManager<T extends Disposable>
implements InstanceManager<T>, vscode.Disposable {
  private instances = new Map<string, T>();
  private config: InstanceManagerConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private disposables: vscode.Disposable[] = [];
  private readonly logger = LoggerService.getInstance().createChildLogger('InstanceManager');

  constructor(config: InstanceManagerConfig = {}) {
    this.config = {
      maxInstances: 10,
      autoCleanup: false,
      cleanupInterval: 60000, // 1分钟
      ...config,
    };

    if (this.config.autoCleanup && this.config.cleanupInterval) {
      this.startAutoCleanup();
    }
  }

  /**
   * 创建新实例
   */
  create(id: string, factory: () => T): T {
    try {
      // 检查是否已存在
      if (this.instances.has(id)) {
        const existing = this.instances.get(id)!;
        this.logger.debug(
          `Instance ${id} already exists, returning existing instance`,
        );
        return existing;
      }

      // 检查实例数量限制
      if (
        this.config.maxInstances &&
        this.instances.size >= this.config.maxInstances
      ) {
        throw new Error(
          `Maximum number of instances (${this.config.maxInstances}) reached`,
        );
      }

      // 创建新实例
      const instance = factory();
      this.instances.set(id, instance);

      this.logger.info(`Created instance ${id}, total: ${this.instances.size}`);
      return instance;
    } catch (error) {
      errorHandler.handle(error, {
        operation: 'createInstance',
        module: 'InstanceManager',
        showToUser: false,
        logLevel: 'error',
      });
      throw error;
    }
  }

  /**
   * 获取指定实例
   */
  get(id: string): T | undefined {
    return this.instances.get(id);
  }

  /**
   * 获取所有实例
   */
  getAll(): Map<string, T> {
    return new Map(this.instances);
  }

  /**
   * 销毁指定实例
   */
  destroy(id: string): boolean {
    try {
      const instance = this.instances.get(id);
      if (!instance) {
        return false;
      }

      // 销毁实例
      instance.dispose();
      this.instances.delete(id);

      this.logger.info(`Destroyed instance ${id}, remaining: ${this.instances.size}`);
      return true;
    } catch (error) {
      errorHandler.handle(error, {
        operation: 'destroyInstance',
        module: 'InstanceManager',
        showToUser: false,
        logLevel: 'error',
      });
      return false;
    }
  }

  /**
   * 销毁所有实例
   */
  destroyAll(): void {
    try {
      const instanceIds = Array.from(this.instances.keys());
      for (const id of instanceIds) {
        this.destroy(id);
      }
      this.logger.info('All instances destroyed');
    } catch (error) {
      errorHandler.handle(error, {
        operation: 'destroyAllInstances',
        module: 'InstanceManager',
        showToUser: false,
        logLevel: 'error',
      });
    }
  }

  /**
   * 获取实例数量
   */
  count(): number {
    return this.instances.size;
  }

  /**
   * 检查实例是否存在
   */
  has(id: string): boolean {
    return this.instances.has(id);
  }

  /**
   * 启动自动清理
   */
  private startAutoCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval!);

    this.disposables.push({
      dispose: () => {
        if (this.cleanupTimer) {
          clearInterval(this.cleanupTimer);
          this.cleanupTimer = undefined;
        }
      },
    });
  }

  /**
   * 执行清理操作
   * 子类可以重写此方法实现自定义清理逻辑
   */
  protected performCleanup(): void {
    // 基础实现：检查实例是否仍然有效
    // 子类可以重写此方法添加更复杂的清理逻辑
    this.logger.debug(`Performing cleanup, current instances: ${this.instances.size}`);
  }

  /**
   * 销毁管理器本身
   */
  dispose(): void {
    try {
      // 销毁所有实例
      this.destroyAll();

      // 清理定时器和其他资源
      this.disposables.forEach((d) => d.dispose());
      this.disposables = [];

      this.logger.info('Manager disposed');
    } catch (error) {
      errorHandler.handle(error, {
        operation: 'disposeManager',
        module: 'InstanceManager',
        showToUser: false,
        logLevel: 'error',
      });
    }
  }
}
