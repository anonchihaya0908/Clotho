/**
 * 管理器注册表
 * 提供自动管理器注册、初始化和清理的基础设施
 */

import * as vscode from 'vscode';
import { ManagerContext } from '../../../common/types';
import { logger } from '../../../common/logger';
import { errorHandler } from '../../../common/error-handler';

/**
 * 可管理的组件接口
 */
export interface ManagedComponent {
    readonly name: string;
    initialize?(context: ManagerContext): Promise<void>;
    dispose?(): void;
}

/**
 * 管理器注册信息
 */
export interface ManagerRegistration {
    name: string;
    instance: ManagedComponent;
    priority: number;
    initialized: boolean;
    initializationTime?: number;
}

/**
 * 初始化结果
 */
export interface InitializationResult {
    success: boolean;
    initialized: string[];
    failed: Array<{ name: string; error: Error }>;
    totalTimeMs: number;
}

/**
 * 管理器注册表
 * 
 * 职责：
 * - 自动管理组件的生命周期
 * - 按优先级有序初始化
 * - 提供统一的错误处理
 * - 支持动态添加和移除管理器
 * - 防止重复初始化
 */
export class ManagerRegistry implements vscode.Disposable {
    private registrations = new Map<string, ManagerRegistration>();
    private isInitialized = false;
    private disposables: vscode.Disposable[] = [];

    /**
     * 注册管理器
     */
    register(
        name: string,
        instance: ManagedComponent,
        priority: number = 50,
    ): void {
        if (this.registrations.has(name)) {
            logger.warn(`Manager ${name} is already registered, replacing...`, {
                module: 'ManagerRegistry',
                operation: 'register',
            });
        }

        this.registrations.set(name, {
            name,
            instance,
            priority,
            initialized: false,
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
        if (registration.initialized && registration.instance.dispose) {
            try {
                registration.instance.dispose();
            } catch (error) {
                logger.warn(`Error disposing manager ${name}:`, {
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
     * 获取管理器实例
     */
    getInstance<T extends ManagedComponent>(name: string): T | undefined {
        const registration = this.registrations.get(name);
        return registration?.instance as T;
    }

    /**
     * 批量初始化所有已注册的管理器
     */
    async initializeAll(context: ManagerContext): Promise<InitializationResult> {
        if (this.isInitialized) {
            throw new Error('Managers have already been initialized');
        }

        const startTime = Date.now();
        const initialized: string[] = [];
        const failed: Array<{ name: string; error: Error }> = [];

        // 按优先级排序（降序）
        const sortedRegistrations = Array.from(this.registrations.values())
            .sort((a, b) => b.priority - a.priority);

        for (const registration of sortedRegistrations) {
            try {
                if (registration.instance.initialize) {
                    const initStart = Date.now();
                    await registration.instance.initialize(context);
                    registration.initializationTime = Date.now() - initStart;
                }

                registration.initialized = true;
                initialized.push(registration.name);

            } catch (error: any) {
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

        // 记录初始化结果
        if (result.success) {
            logger.info(`✅ All ${initialized.length} managers initialized successfully in ${result.totalTimeMs}ms`, {
                module: 'ManagerRegistry',
                operation: 'initializeAll',
                detail: `Initialization order: ${initialized.join(' → ')}`,
            });
        } else {
            logger.warn(`⚠️ Manager initialization completed with ${failed.length} failures:`, {
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
     * 获取初始化统计信息
     */
    getInitializationStats(): Array<{
        name: string;
        priority: number;
        initialized: boolean;
        initializationTime?: number;
    }> {
        return Array.from(this.registrations.values()).map(reg => ({
            name: reg.name,
            priority: reg.priority,
            initialized: reg.initialized,
            initializationTime: reg.initializationTime,
        }));
    }

    /**
     * 清理所有管理器
     */
    dispose(): void {
        // 按相反的优先级顺序清理（先清理低优先级的）
        const sortedRegistrations = Array.from(this.registrations.values())
            .filter(reg => reg.initialized)
            .sort((a, b) => a.priority - b.priority);

        const disposedManagers: string[] = [];
        const disposalErrors: Array<{ name: string; error: Error }> = [];

        for (const registration of sortedRegistrations) {
            try {
                if (registration.instance.dispose) {
                    registration.instance.dispose();
                    disposedManagers.push(registration.name);
                }
                registration.initialized = false;
            } catch (error: any) {
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
                logger.warn('Error disposing disposable:', {
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
            logger.info(`✅ All ${disposedManagers.length} managers disposed successfully`, {
                module: 'ManagerRegistry',
                operation: 'dispose',
                detail: `Disposal order: ${disposedManagers.join(' → ')}`,
            });
        } else {
            logger.warn(`⚠️ Manager disposal completed with ${disposalErrors.length} errors:`, {
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
