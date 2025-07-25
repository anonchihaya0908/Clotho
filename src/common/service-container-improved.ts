/**
 * Service Container - Improved Version
 * ===================================
 *
 * An enhanced dependency injection container that uses automatic type generation
 * for better maintainability and type safety. This version eliminates the need
 * to manually maintain the ServiceCollection interface.
 *
 * IMPROVEMENTS:
 * - Automatic ServiceCollection generation from ServiceMap
 * - Better type inference and safety
 * - Reduced maintenance burden when adding new services
 * - Centralized service type definitions
 */

import {
    PairCoordinator,
    PairCreatorService,
    PairCreatorUI,
} from '../create-source-header-pair';
import {
    PairingRuleService,
    PairingRuleUI,
    PairingRuleCoordinator,
} from '../pairing-rule-manager';
import {
    SwitchCoordinator,
    SwitchService,
    SwitchUI,
} from '../switch-header-source';
import { MonitorCoordinator } from '../clangd-monitor';
import { ClangFormatEditorCoordinator } from '../visual-editor';
import { ClangFormatGuideService } from '../visual-editor/clang-format/guide-service';

/**
 * Service Map - The single source of truth for all services
 * ==========================================================
 * 
 * This is the ONLY place where service types need to be defined.
 * When adding a new service:
 * 1. Add the service type mapping here
 * 2. Register the service in bootstrap.ts
 * 3. That's it! No need to update ServiceCollection manually.
 */
export interface ServiceMap {
    // Pairing Rule Manager
    pairingRuleService: PairingRuleService;
    pairingRuleUI: PairingRuleUI;
    pairingRuleCoordinator: PairingRuleCoordinator;

    // Create Source/Header Pair
    pairCreatorService: PairCreatorService;
    pairCreatorUI: PairCreatorUI;
    pairCoordinator: PairCoordinator;

    // Switch Header/Source
    switchService: SwitchService;
    switchUI: SwitchUI;
    switchCoordinator: SwitchCoordinator;

    // Clangd Monitor
    monitorCoordinator: MonitorCoordinator;

    // Clang-Format Visual Editor
    clangFormatEditorCoordinator: ClangFormatEditorCoordinator;
    clangFormatGuideService: ClangFormatGuideService;
}

/**
 * Automatically generated ServiceCollection from ServiceMap
 * This interface is now automatically maintained and type-safe.
 */
export type ServiceCollection = ServiceMap;

/**
 * Type-safe service names - automatically derived from ServiceMap keys
 */
export type ServiceName = keyof ServiceMap;

/**
 * Type-safe service factory function
 */
export type ServiceFactory<T> = (container: ServiceContainer) => T;

/**
 * Helper type for service cache with better type inference
 */
type ServiceCache = Map<ServiceName, ServiceMap[ServiceName]>;

/**
 * Enhanced ServiceContainer with improved type safety
 */
export class ServiceContainer {
    private factories = new Map<ServiceName, ServiceFactory<any>>();
    private cache: ServiceCache = new Map();

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
            console.warn(
                `Service factory for "${String(name)}" is already registered.`,
            );
        }
        this.factories.set(name, factory);
    }

    /**
     * Gets a service instance with full type inference
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
        this.cache.set(name, instance);
        return instance;
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
     * Validates that all services in ServiceMap are registered
     * Useful for development and testing
     * @returns Object with validation results
     */
    public validateServiceRegistration(): {
        isValid: boolean;
        missing: string[];
        registered: ServiceName[];
    } {
        const registered = this.getRegisteredServices();
        const expectedServices: ServiceName[] = [
            // This list should match ServiceMap keys
            'pairingRuleService',
            'pairingRuleUI',
            'pairingRuleCoordinator',
            'pairCreatorService',
            'pairCreatorUI',
            'pairCoordinator',
            'switchService',
            'switchUI',
            'switchCoordinator',
            'monitorCoordinator',
            'clangFormatEditorCoordinator',
            'clangFormatGuideService'
        ];

        const missing = expectedServices.filter(service => !registered.includes(service));

        return {
            isValid: missing.length === 0,
            missing,
            registered
        };
    }

    /**
     * Disposes all cached services that have a `dispose` method
     * Enhanced with better error handling and logging
     */
    public dispose(): void {
        const disposedServices: string[] = [];
        const errors: Array<{ service: string; error: Error }> = [];

        for (const [name, service] of this.cache.entries()) {
            if (service && typeof (service as any).dispose === 'function') {
                try {
                    (service as any).dispose();
                    disposedServices.push(String(name));
                } catch (error) {
                    errors.push({
                        service: String(name),
                        error: error instanceof Error ? error : new Error(String(error))
                    });
                }
            }
        }

        // Log disposal results for debugging
        if (disposedServices.length > 0) {
            console.log(`Clotho: Disposed services: ${disposedServices.join(', ')}`);
        }

        if (errors.length > 0) {
            console.error('Clotho: Errors during service disposal:', errors);
        }

        this.cache.clear();
        this.factories.clear();
    }
}

/**
 * Type utility to ensure a service name is valid
 * Usage: ensureServiceName('someService') - will cause compile error if invalid
 */
export function ensureServiceName<T extends ServiceName>(name: T): T {
    return name;
}

/**
 * Helper to create a type-safe service factory
 * Usage: createServiceFactory('serviceName', (container) => new Service())
 */
export function createServiceFactory<K extends ServiceName>(
    name: K,
    factory: ServiceFactory<ServiceMap[K]>
): { name: K; factory: ServiceFactory<ServiceMap[K]> } {
    return { name, factory };
}
