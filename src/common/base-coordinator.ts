/**
 * Base Coordinator Abstract Class
 * ===============================
 * 
 * Provides common functionality for all coordinator classes:
 * - Disposable pattern implementation
 * - Dependency injection support  
 * - Integrated error handling
 * - Unified logging support
 * - Performance tracking
 */

import * as vscode from 'vscode';
import { errorHandler } from './error-handler';
import { createModuleLogger, ModuleLogger } from './logger/unified-logger';

/**
 * Base coordinator class that all coordinators should extend.
 * Provides common patterns and utilities for the coordinator layer.
 */
export abstract class BaseCoordinator implements vscode.Disposable {
  protected readonly logger: ModuleLogger;
  private readonly resources: vscode.Disposable[] = [];
  private disposed = false;

  constructor() {
    // Initialize module-specific logger
    this.logger = createModuleLogger(this.getModuleName());

    // Initialize base coordinator
    this.logger.info('Coordinator initialized', {
      operation: 'constructor'
    });
  }

  /**
   * Dispose method for cleanup when extension is deactivated.
   * Automatically disposes all tracked resources.
   */
  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.logger.info('Disposing coordinator', {
      operation: 'dispose',
      resourceCount: this.resources.length
    });

    // Dispose all tracked resources
    this.resources.forEach(resource => {
      try {
        resource.dispose();
      } catch (error) {
        this.logger.warn('Error disposing resource', {
          operation: 'dispose',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    this.resources.length = 0;
    this.disposed = true;

    // Call subclass cleanup
    this.onDispose();
  }

  /**
   * Add a resource to be automatically disposed when this coordinator is disposed
   */
  protected addDisposable(resource: vscode.Disposable): void {
    if (this.disposed) {
      resource.dispose();
      return;
    }
    this.resources.push(resource);
  }

  /**
   * Execute an operation with automatic error handling and logging
   */
  protected async executeOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T | undefined> {
    try {
      return await this.logger.trackAsyncOperation(operationName, operation);
    } catch (error) {
      errorHandler.handle(error, {
        operation: operationName,
        module: this.getModuleName(),
        showToUser: true,
        logLevel: 'error'
      });
      return undefined;
    }
  }

  /**
   * Execute a synchronous operation with automatic error handling and logging
   */
  protected executeSync<T>(
    operationName: string,
    operation: () => T
  ): T | undefined {
    try {
      return this.logger.trackOperation(operationName, operation);
    } catch (error) {
      errorHandler.handle(error, {
        operation: operationName,
        module: this.getModuleName(),
        showToUser: true,
        logLevel: 'error'
      });
      return undefined;
    }
  }

  /**
   * Get the module name for logging purposes.
   * Should be implemented by subclasses.
   */
  protected abstract getModuleName(): string;

  /**
   * Override this method to provide custom cleanup logic.
   * Called during dispose after all tracked resources are disposed.
   */
  protected onDispose(): void {
    // Override in subclasses if custom cleanup is needed
  }

  /**
   * Check if the coordinator has been disposed
   */
  protected get isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Validate dependencies at construction time
   */
  protected validateDependencies(dependencies: Record<string, any>): void {
    const missing: string[] = [];

    for (const [name, dependency] of Object.entries(dependencies)) {
      if (!dependency) {
        missing.push(name);
      }
    }

    if (missing.length > 0) {
      const error = new Error(`Missing dependencies: ${missing.join(', ')}`);
      this.logger.error('Dependency validation failed', error, {
        operation: 'validateDependencies',
        missing,
        metadata: { dependencies: Object.keys(dependencies) }
      });
      throw error;
    }

    this.logger.info('Dependencies validated successfully', {
      operation: 'validateDependencies',
      metadata: { dependencies: Object.keys(dependencies) }
    });
  }
}
