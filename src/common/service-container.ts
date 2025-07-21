/**
 * Service Container
 * =================
 *
 * A centralized dependency injection container to manage the lifecycle and
 * dependencies of all services within the extension. This promotes loose
 * coupling and simplifies service management by providing a single source for
 * service instances.
 *
 * HOW IT WORKS:
 * - Services are registered with a factory function.
 * - The container ensures that each service is created only once (singleton).
 * - When a service is requested, the container resolves its dependencies by
 *   recursively getting them from the container itself.
 *
 * BENEFITS:
 * - Manages singletons, preventing duplicate service instances.
 * - Centralizes initialization logic.
 * - Decouples modules from the specifics of service creation.
 * - Simplifies testing by allowing mock services to be injected.
 */

import { PairCoordinator, PairCreatorService, PairCreatorUI } from '../create-source-header-pair';
import { PairingRuleService, PairingRuleUI, PairingRuleCoordinator } from '../pairing-rule-manager';
import { SwitchCoordinator, SwitchService, SwitchUI } from '../switch-header-source';
import { MonitorCoordinator } from '../clangd-monitor';
import { ClangFormatVisualEditorCoordinator } from '../visual-editor';

// A collection of factory functions for creating services
type ServiceFactory<T> = (container: ServiceContainer) => T;

/**
 * Defines the complete collection of services available in the extension.
 * This interface should be updated whenever a new service is added.
 */
export interface ServiceCollection {
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
    clangFormatVisualEditorCoordinator: ClangFormatVisualEditorCoordinator;
}// A mapping of service names to their instances
type ServiceCache = Map<keyof ServiceCollection, ServiceCollection[keyof ServiceCollection]>;

/**
 * The main ServiceContainer class.
 * It holds the factories and cached instances for all services.
 */
export class ServiceContainer {
    private factories = new Map<keyof ServiceCollection, ServiceFactory<any>>();
    private cache: ServiceCache = new Map();

    /**
     * Registers a factory function for a service.
     * @param name The name of the service.
     * @param factory The function that creates the service instance.
     */
    public register<K extends keyof ServiceCollection>(
        name: K,
        factory: ServiceFactory<ServiceCollection[K]>
    ): void {
        if (this.factories.has(name)) {
            console.warn(`Service factory for "${String(name)}" is already registered.`);
        }
        this.factories.set(name, factory);
    }

    /**
     * Gets a service instance from the container.
     * If the service hasn't been created yet, it will be instantiated,
     * cached, and then returned.
     * @param name The name of the service to retrieve.
     * @returns The singleton instance of the service.
     */
    public get<K extends keyof ServiceCollection>(name: K): ServiceCollection[K] {
        if (this.cache.has(name)) {
            return this.cache.get(name) as ServiceCollection[K];
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
     * Checks if a service is registered
     * @param name The name of the service to check
     * @returns True if the service is registered
     */
    public has<K extends keyof ServiceCollection>(name: K): boolean {
        return this.factories.has(name);
    }

    /**
     * Disposes all cached services that have a `dispose` method.
     * This is useful for cleaning up resources when the extension deactivates.
     */
    public dispose(): void {
        for (const service of this.cache.values()) {
            if (service && typeof (service as any).dispose === 'function') {
                (service as any).dispose();
            }
        }
        this.cache.clear();
        this.factories.clear();
    }
}
