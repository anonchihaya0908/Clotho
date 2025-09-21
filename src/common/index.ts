/**
 * Common utilities and types index
 * Re-exports all common functionality for easy importing
 */

// Type definitions
export * from './types';

//  Generic type utilities (excluding ValidationResult to avoid conflict)
export {
  Factory, AsyncFactory, ResetFunction, Selector, Predicate,
  BaseResult, DataResult, BatchResult,
  CommonStatus, LifecycleStatus, StateMachine,
  BaseStats, CountStats, PerformanceStats,
  EnhancedManager, ObservableManager,
  Cache, TTLCache, AsyncOptions, Cancellable, ProgressReporter,
  DeepReadonly, DeepPartial, RequireFields, OptionalFields,
  UnionToTuple, Awaited, If, TypeGuard, createTypeGuard,
  isSuccessfulResult, isFailedResult, isDataResult,
  safeGet, enumValues, enumKeys
} from './type-utilities';

// Constants
export * from './constants';

// Utilities
export * from './utils';

//  Structured logging and event handling
export * from './logger/unified-logger';


// Error handling
export { ClothoError, errorHandler } from './error-handler';

// Service container for dependency injection
export * from './service-container';
