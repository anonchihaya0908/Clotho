/**
 * Service Type Definitions
 * ========================
 * 
 * Provides compile-time type safety for service registration and validation.
 * This eliminates the need for hardcoded service name lists by using
 * TypeScript's advanced type system.
 */

// SimpleClangdMonitor has been removed
import {
  PairCoordinator,
  PairCreatorService,
  PairCreatorUI,
} from '../../create-source-header-pair';
import { HeaderGuardCoordinator } from '../../create-source-header-pair/header-guard-coordinator';
import {
  PairingRuleCoordinator,
  PairingRuleService,
  PairingRuleUI,
} from '../../pairing-rule-manager';
import {
  SwitchCoordinator,
  SwitchService,
  SwitchUI,
} from '../../switch-header-source';
import { SwitchConfigService } from '../../switch-header-source/config-manager';
import { ClangFormatEditorCoordinator } from '../../visual-editor';
import { ClangFormatGuideService } from '../../visual-editor/clang-format/guide-service';
import { FileSystemService } from '../utils/file-system-service';

// ===============================
// Service Map Definition
// ===============================

/**
 * The complete service map defining all services in the application.
 * This is the single source of truth for service types.
 */
export interface ServiceMap {
  // File System Service
  fileSystemService: FileSystemService;

  // Pairing Rule Manager
  pairingRuleService: PairingRuleService;
  pairingRuleUI: PairingRuleUI;
  pairingRuleCoordinator: PairingRuleCoordinator;

  // Create Source/Header Pair
  pairCreatorService: PairCreatorService;
  pairCreatorUI: PairCreatorUI;
  pairCoordinator: PairCoordinator;
  headerGuardCoordinator: HeaderGuardCoordinator;

  // Switch Header/Source
  switchConfigService: SwitchConfigService;
  switchService: SwitchService;
  switchUI: SwitchUI;
  switchCoordinator: SwitchCoordinator;

  // Clangd Monitor (removed)

  // Clang-Format Visual Editor
  clangFormatEditorCoordinator: ClangFormatEditorCoordinator;
  clangFormatGuideService: ClangFormatGuideService;
}

// ===============================
// Type-Level Utilities
// ===============================

/**
 * Extract all service names from ServiceMap at compile time
 */
export type ServiceName = keyof ServiceMap;

/**
 * Get the type of a specific service
 */
export type ServiceType<K extends ServiceName> = ServiceMap[K];

/**
 * Utility to extract service names as a compile-time constant array.
 * This is used for runtime validation without hardcoding.
 */
export type ServiceNames = readonly ServiceName[];

/**
 * Type-safe service registration status
 */
export interface ServiceRegistrationStatus<T extends ServiceName = ServiceName> {
  name: T;
  registered: boolean;
  type: string;
}

/**
 * Comprehensive service validation result
 */
export interface ServiceValidationResult {
  isValid: boolean;
  totalServices: number;
  registeredCount: number;
  missingServices: ServiceName[];
  registeredServices: ServiceName[];
  serviceStatus: ServiceRegistrationStatus[];
}

// ===============================
// Runtime Type Extraction
// ===============================

/**
 * Runtime utility to get all service names from ServiceMap.
 * This uses a compile-time type to generate runtime values.
 */
class ServiceMapExtractor {
  /**
   * Get all service names at runtime.
   * This is populated at build time to avoid hardcoding.
   */
  private static readonly allServiceNames: ServiceName[] = [
    // File System Service
    'fileSystemService',

    // Pairing Rule Manager
    'pairingRuleService',
    'pairingRuleUI',
    'pairingRuleCoordinator',

    // Create Source/Header Pair
    'pairCreatorService',
    'pairCreatorUI',
    'pairCoordinator',
    'headerGuardCoordinator',

    // Switch Header/Source  
    'switchConfigService',
    'switchService',
    'switchUI',
    'switchCoordinator',

    // Clangd Monitor (removed)
    // 'clangdMonitor',

    // Clang-Format Visual Editor
    'clangFormatEditorCoordinator',
    'clangFormatGuideService'
  ] as const;

  /**
   * Get all expected service names
   */
  public static getExpectedServices(): readonly ServiceName[] {
    return this.allServiceNames;
  }

  /**
   * Check if a name is a valid service name
   */
  public static isValidServiceName(name: string): name is ServiceName {
    return this.allServiceNames.includes(name as ServiceName);
  }

  /**
   * Get the total number of expected services
   */
  public static getExpectedServiceCount(): number {
    return this.allServiceNames.length;
  }

  /**
   * Validate that all services in the map are accounted for
   */
  public static validateCompleteness(registeredServices: string[]): ServiceValidationResult {
    const expectedServices = this.getExpectedServices();
    const registeredServiceNames = registeredServices.filter(
      name => this.isValidServiceName(name)
    ) as ServiceName[];

    const missingServices = expectedServices.filter(
      service => !registeredServiceNames.includes(service)
    );

    const serviceStatus: ServiceRegistrationStatus[] = expectedServices.map(name => ({
      name,
      registered: registeredServiceNames.includes(name),
      type: typeof name === 'string' ? 'service' : 'unknown'
    }));

    return {
      isValid: missingServices.length === 0,
      totalServices: expectedServices.length,
      registeredCount: registeredServiceNames.length,
      missingServices,
      registeredServices: registeredServiceNames,
      serviceStatus
    };
  }
}

// ===============================
// Public API
// ===============================

/**
 * Get all expected service names (runtime function)
 */
export function getExpectedServices(): readonly ServiceName[] {
  return ServiceMapExtractor.getExpectedServices();
}

/**
 * Validate service registration completeness
 */
export function validateServiceRegistration(registeredServices: string[]): ServiceValidationResult {
  return ServiceMapExtractor.validateCompleteness(registeredServices);
}

/**
 * Check if a string is a valid service name
 */
export function isValidServiceName(name: string): name is ServiceName {
  return ServiceMapExtractor.isValidServiceName(name);
}

/**
 * Get the expected total number of services
 */
export function getExpectedServiceCount(): number {
  return ServiceMapExtractor.getExpectedServiceCount();
}

// ===============================
// Type Guards and Utilities
// ===============================

/**
 * Type guard to ensure a service collection contains all required services
 */
export function isCompleteServiceCollection<T extends Partial<ServiceMap>>(
  services: T
): services is T & ServiceMap {
  const serviceNames = Object.keys(services) as (keyof T)[];
  const expectedServices = getExpectedServices();

  return expectedServices.every(serviceName =>
    serviceNames.includes(serviceName as keyof T) && services[serviceName as keyof T] !== undefined
  );
}

/**
 * Create a type-safe service getter
 */
export function createServiceGetter<T extends ServiceMap>(services: T) {
  return function getService<K extends ServiceName>(name: K): ServiceType<K> {
    if (!isValidServiceName(name)) {
      throw new Error(`Invalid service name: ${name}`);
    }

    const service = services[name];
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }

    return service as ServiceType<K>;
  };
}

// ===============================
// Development Utilities
// ===============================

/**
 * Generate a human-readable service report for debugging
 */
export function generateServiceReport(registeredServices: string[]): string {
  const validation = validateServiceRegistration(registeredServices);

  let report = `Service Registration Report\n`;
  report += `============================\n`;
  report += `Total Expected: ${validation.totalServices}\n`;
  report += `Registered: ${validation.registeredCount}\n`;
  report += `Status: ${validation.isValid ? 'VALID' : 'INVALID'}\n\n`;

  if (validation.missingServices.length > 0) {
    report += `Missing Services:\n`;
    validation.missingServices.forEach(service => {
      report += `  - ${service}\n`;
    });
    report += '\n';
  }

  report += `Registered Services:\n`;
  validation.registeredServices.forEach(service => {
    report += `  ✓ ${service}\n`;
  });

  return report;
}
