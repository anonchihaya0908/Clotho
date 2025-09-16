/**
 * Manager Registry (Simplified)
 * Provides automatic manager registration, initialization and cleanup infrastructure
 * Simplified without complex priority system
 */

import * as vscode from 'vscode';
import { errorHandler } from '../../../common/error-handler';
import { createModuleLogger } from '../../../common/logger/unified-logger';
import { ManagerContext } from '../../../common/types';

/**
 * Manageable component interface
 */
export interface ManagedComponent {
  readonly name: string;
  initialize?(context: ManagerContext): Promise<void>;
  dispose?(): void;
}

/**
 * Manager factory function type
 */
export type ManagerFactory<T extends ManagedComponent = ManagedComponent> = () => T;

/**
 * Manager registration info (supports lazy loading)
 */
export interface ManagerRegistration {
  name: string;
  instance?: ManagedComponent; // Optional for lazy loading
  factory?: ManagerFactory; // Factory for lazy creation
  initialized: boolean;
  initializationTime?: number;
}

/**
 * Initialization result
 */
export interface InitializationResult {
  success: boolean;
  initialized: string[];
  failed: Array<{ name: string; error: Error }>;
  totalTimeMs: number;
}

/**
 * Manager Registry (Simplified)
 *
 * Responsibilities:
 * - Manage component lifecycle automatically
 * - Provide unified error handling
 * - Support dynamic adding and removing managers
 * - Prevent duplicate initialization
 * (Removed complex priority system)
 */
export class ManagerRegistry implements vscode.Disposable {
  private readonly logger = createModuleLogger('ManagerRegistry');

  private registrations = new Map<string, ManagerRegistration>();
  private isInitialized = false;
  private disposables: vscode.Disposable[] = [];
  private context?: ManagerContext; // Cache context for lazy initialization

  /**
     * Register manager instance (simplified)
     */
  register(name: string, instance: ManagedComponent): void {
    if (this.registrations.has(name)) {
      this.logger.warn(`Manager ${name} is already registered, replacing...`, {
        module: 'ManagerRegistry',
        operation: 'register',
      });
    }

    this.registrations.set(name, {
      name,
      instance,
      initialized: false,
    });
  }

  /**
     * Register manager factory for lazy loading
     */
  registerFactory<T extends ManagedComponent>(name: string, factory: ManagerFactory<T>): void {
    if (this.registrations.has(name)) {
      this.logger.warn(`Manager ${name} is already registered, replacing...`, {
        module: 'ManagerRegistry',
        operation: 'registerFactory',
      });
    }

    this.registrations.set(name, {
      name,
      factory,
      initialized: false,
    });

    this.logger.debug(`Registered manager factory: ${name}`, {
      module: 'ManagerRegistry',
      operation: 'registerFactory',
    });
  }

  /**
     * 取消注册管理器
     */
  unregister(name: string): boolean {
    const registration = this.registrations.get(name);
    if (!registration) {
      return false;
    }

    // 如果已初始化，先清理
    if (registration.initialized && registration.instance?.dispose) {
      try {
        registration.instance.dispose();
      } catch (error) {
        this.logger.warn(`Error disposing manager ${name}:`, {
          module: 'ManagerRegistry',
          operation: 'unregister',
          error,
        });
      }
    }

    return this.registrations.delete(name);
  }

  /**
     * 获取已注册的管理器
     */
  getRegistered(): string[] {
    return Array.from(this.registrations.keys());
  }

  /**
     * 检查管理器是否已注册
     */
  isRegistered(name: string): boolean {
    return this.registrations.has(name);
  }

  /**
     * 获取管理器实例（支持懒加载）
     */
  getInstance<T extends ManagedComponent>(name: string): T | undefined {
    const registration = this.registrations.get(name);
    if (!registration) {
      return undefined;
    }

    // If instance already exists, return it
    if (registration.instance) {
      return registration.instance as T;
    }

    // If factory exists, create instance lazily
    if (registration.factory) {
      this.logger.debug(`Lazy loading manager: ${name}`, {
        module: 'ManagerRegistry',
        operation: 'getInstance',
      });

      const instance = registration.factory();
      registration.instance = instance;

      // If we have context cached, initialize immediately
      if (this.context && !registration.initialized) {
        this.initializeManager(registration, this.context).catch(error => {
          this.logger.error(`Failed to initialize lazy-loaded manager ${name}`, error, {
            module: 'ManagerRegistry',
            operation: 'getInstance',
          });
        });
      }

      return instance as T;
    }

    return undefined;
  }

  /**
     * 获取或创建管理器实例（确保初始化）
     */
  async getOrCreateInstance<T extends ManagedComponent>(name: string): Promise<T | undefined> {
    const instance = this.getInstance<T>(name);
    if (!instance) {
      return undefined;
    }

    const registration = this.registrations.get(name);
    if (registration && !registration.initialized && this.context) {
      await this.initializeManager(registration, this.context);
    }

    return instance;
  }

  /**
     * 初始化单个管理器
     */
  private async initializeManager(registration: ManagerRegistration, context: ManagerContext): Promise<void> {
    if (registration.initialized || !registration.instance) {
      return;
    }

    const initStart = Date.now();
    if (registration.instance.initialize) {
      await registration.instance.initialize(context);
    }
    registration.initializationTime = Date.now() - initStart;
    registration.initialized = true;

    this.logger.debug(`Manager ${registration.name} initialized in ${registration.initializationTime}ms`, {
      module: 'ManagerRegistry',
      operation: 'initializeManager',
    });
  }

  /**
     * 批量初始化所有已注册的管理器（支持懒加载）
     */
  async initializeAll(context: ManagerContext): Promise<InitializationResult> {
    if (this.isInitialized) {
      throw new Error('Managers have already been initialized');
    }

    // Cache context for lazy-loaded managers
    this.context = context;

    const startTime = Date.now();
    const initialized: string[] = [];
    const failed: Array<{ name: string; error: Error }> = [];

    // Only initialize managers that have instances (not factory-only)
    const registrationsToInitialize = Array.from(this.registrations.values())
      .filter(reg => reg.instance);

    for (const registration of registrationsToInitialize) {
      try {
        await this.initializeManager(registration, context);
        initialized.push(registration.name);

      } catch (error: unknown) {
        const wrappedError = error instanceof Error
          ? error
          : new Error(`Unknown error: ${String(error)}`);

        failed.push({
          name: registration.name,
          error: wrappedError,
        });

        errorHandler.handle(wrappedError, {
          module: 'ManagerRegistry',
          operation: `initializeAll.${registration.name}`,
          showToUser: false, // Will be summarized below
        });
      }
    }

    this.isInitialized = true;

    const result: InitializationResult = {
      success: failed.length === 0,
      initialized,
      failed,
      totalTimeMs: Date.now() - startTime,
    };

    const factoryOnlyCount = Array.from(this.registrations.values())
      .filter(reg => reg.factory && !reg.instance).length;

    // 记录初始化结果
    if (result.success) {
      this.logger.info(` Managers initialized successfully in ${result.totalTimeMs}ms (${initialized.length} eager, ${factoryOnlyCount} lazy)`, {
        module: 'ManagerRegistry',
        operation: 'initializeAll',
        eagerCount: initialized.length,
        lazyCount: factoryOnlyCount,
        detail: `Eager: ${initialized.join(' → ')}`,
      });
    } else {
      this.logger.warn(` Manager initialization completed with ${failed.length} failures:`, {
        module: 'ManagerRegistry',
        operation: 'initializeAll',
        failed: failed.map(f => ({ name: f.name, message: f.error.message })),
      });
    }

    return result;
  }

  /**
     * 检查是否已初始化
     */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
     * Get initialization statistics (simplified)
     */
  getInitializationStats(): Array<{
    name: string;
    initialized: boolean;
    initializationTime?: number;
  }> {
    return Array.from(this.registrations.values()).map(reg => ({
      name: reg.name,
      initialized: reg.initialized,
      initializationTime: reg.initializationTime,
    }));
  }

  /**
     * 清理所有管理器
     */
  dispose(): void {
    // Simple cleanup order (no complex priority system)
    const sortedRegistrations = Array.from(this.registrations.values())
      .filter(reg => reg.initialized);

    const disposedManagers: string[] = [];
    const disposalErrors: Array<{ name: string; error: Error }> = [];

    for (const registration of sortedRegistrations) {
      try {
        if (registration.instance?.dispose) {
          registration.instance.dispose();
          disposedManagers.push(registration.name);
        }
        registration.initialized = false;
      } catch (error: unknown) {
        const wrappedError = error instanceof Error
          ? error
          : new Error(`Unknown error: ${String(error)}`);

        disposalErrors.push({
          name: registration.name,
          error: wrappedError,
        });

        errorHandler.handle(wrappedError, {
          module: 'ManagerRegistry',
          operation: `dispose.${registration.name}`,
          showToUser: false, // Will be summarized below
        });
      }
    }

    // 清理 disposables
    for (const disposable of this.disposables) {
      try {
        disposable.dispose();
      } catch (error) {
        this.logger.warn('Error disposing disposable:', {
          module: 'ManagerRegistry',
          operation: 'dispose',
          error,
        });
      }
    }
    this.disposables = [];

    // 重置状态
    this.isInitialized = false;

    // 记录清理结果
    if (disposalErrors.length === 0) {
      this.logger.info(` All ${disposedManagers.length} managers disposed successfully`, {
        module: 'ManagerRegistry',
        operation: 'dispose',
        detail: `Disposal order: ${disposedManagers.join(' → ')}`,
      });
    } else {
      this.logger.warn(` Manager disposal completed with ${disposalErrors.length} errors:`, {
        module: 'ManagerRegistry',
        operation: 'dispose',
        errors: disposalErrors.map(e => ({ name: e.name, message: e.error.message })),
      });
    }
  }

  /**
     * 添加需要在清理时处理的 disposable 对象
     */
  addDisposable(disposable: vscode.Disposable): void {
    this.disposables.push(disposable);
  }

  /**
     * 重置注册表（用于测试）
     */
  reset(): void {
    this.dispose();
    this.registrations.clear();
  }
}
