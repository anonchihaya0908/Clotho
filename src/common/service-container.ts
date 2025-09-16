/**
 * Service Container - Enhanced Version
 * ===================================
 *
 * A centralized dependency injection container to manage the lifecycle and
 * dependencies of all services within the extension. This enhanced version
 * provides better type safety and automatic interface generation.
 *
 * HOW IT WORKS:
 * - Services are registered with a factory function.
 * - The container ensures that each service is created only once (singleton).
 * - When a service is requested, the container resolves its dependencies by
 *   recursively getting them from the container itself.
 * - ServiceCollection is automatically generated from ServiceMap.
 *
 * BENEFITS:
 * - Manages singletons, preventing duplicate service instances.
 * - Centralizes initialization logic.
 * - Decouples modules from the specifics of service creation.
 * - Simplifies testing by allowing mock services to be injected.
 * - Automatic type generation reduces maintenance burden.
 * - Better type safety with enhanced TypeScript inference.
 */

import { errorHandler } from './error-handler';
import { createModuleLogger } from '../logger/unified-logger';
import { Factory } from './type-utilities';
import {
  generateServiceReport,
  ServiceMap,
  ServiceName,
  ServiceValidationResult,
  validateServiceRegistration as typeValidateServiceRegistration
} from './types/service-types';

/**
 * Re-export service types for backward compatibility
 */
export type { ServiceMap, ServiceName, ServiceType } from './types/service-types';

/**
 * Automatically generated ServiceCollection from ServiceMap
 * No need to maintain this manually - it's derived from ServiceMap
 */
export type ServiceCollection = ServiceMap;

/**
 *  Type-safe service factory function using generic Factory type
 */
export type ServiceFactory<T> = Factory<T, [ServiceContainer]>; /**
 * Enhanced ServiceContainer with improved type safety and maintainability
 */
export class ServiceContainer {
  private factories = new Map<ServiceName, ServiceFactory<unknown>>();
  private cache = new Map<ServiceName, ServiceMap[ServiceName]>();

  /**
   * Registers a factory function for a service with enhanced type safety
   * @param name The name of the service (automatically type-checked against ServiceMap)
   * @param factory The function that creates the service instance
   */
  public register<K extends ServiceName>(
    name: K,
    factory: ServiceFactory<ServiceMap[K]>,
  ): void {
    if (this.factories.has(name)) {
      logger.warn(`Service factory for "${String(name)}" is already registered.`, {
        module: 'ServiceContainer',
        operation: 'register',
      });
    }
    this.factories.set(name, factory);
  }

  /**
   * Gets a service instance with full type inference
   * If the service hasn't been created yet, it will be instantiated,
   * cached, and then returned.
   * @param name The name of the service to retrieve
   * @returns The singleton instance of the service with correct type
   */
  public get<K extends ServiceName>(name: K): ServiceMap[K] {
    if (this.cache.has(name)) {
      return this.cache.get(name) as ServiceMap[K];
    }

    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service "${String(name)}" not registered.`);
    }

    const instance = factory(this);
    this.cache.set(name, instance as ServiceMap[K]);
    return instance as ServiceMap[K];
  }

  /**
   * Checks if a service is registered with type safety
   * @param name The name of the service to check
   * @returns True if the service is registered
   */
  public has<K extends ServiceName>(name: K): boolean {
    return this.factories.has(name);
  }

  /**
   * Gets all registered service names for debugging
   * @returns Array of all registered service names
   */
  public getRegisteredServices(): ServiceName[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Validates that all services in ServiceMap are registered using type-safe validation
   * Useful for development and testing to ensure no services are missing
   * @returns Comprehensive validation result with detailed information
   */
  public validateServiceRegistration(): ServiceValidationResult {
    const registered = this.getRegisteredServices();
    return typeValidateServiceRegistration(registered);
  }

  /**
   * Generate a detailed service registration report for debugging
   * @returns Human-readable report of service registration status
   */
  public generateServiceReport(): string {
    const registered = this.getRegisteredServices();
    return generateServiceReport(registered);
  }

  /**
   * Disposes all cached services that have a `dispose` method.
   * Enhanced with better error handling and logging.
   * This is useful for cleaning up resources when the extension deactivates.
   */
  public dispose(): void {
    const disposedServices: string[] = [];
    const errors: Array<{ service: string; error: Error }> = [];

    for (const [name, service] of this.cache.entries()) {
      if (service && typeof (service as { dispose?: () => void }).dispose === 'function') {
        try {
          (service as { dispose: () => void }).dispose();
          disposedServices.push(String(name));
        } catch (error) {
          errorHandler.handle(error, {
            module: 'ServiceContainer',
            operation: `dispose.${String(name)}`,
            showToUser: false, // Don't show individual disposal errors
          });
          errors.push({
            service: String(name),
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      }
    }

    // Log disposal results for debugging
    if (disposedServices.length > 0) {
      logger.info(`Disposed services: ${disposedServices.join(', ')}`, {
        module: 'ServiceContainer',
        operation: 'dispose',
      });
    }

    if (errors.length > 0) {
      // Log a summary error if any services failed to dispose
      errorHandler.handle(
        new Error('One or more services failed to dispose.'),
        {
          module: 'ServiceContainer',
          operation: 'dispose.summary',
          showToUser: true, // Show a single summary notification
          logLevel: 'warn',
        },
      );
    }

    this.cache.clear();
    this.factories.clear();
  }
}

/**
 * Type utility to ensure a service name is valid at compile time
 * Usage: ensureServiceName('someService') - will cause compile error if invalid
 */
export function ensureServiceName<T extends ServiceName>(name: T): T {
  return name;
}

/**
 * Helper to create a type-safe service factory with better IDE support
 * Usage: createServiceFactory('serviceName', (container) => new Service())
 */
export function createServiceFactory<K extends ServiceName>(
  name: K,
  factory: ServiceFactory<ServiceMap[K]>
): { name: K; factory: ServiceFactory<ServiceMap[K]> } {
  return { name, factory };
}
