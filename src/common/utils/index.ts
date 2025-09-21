/**
 * Utilities Index
 * Unified export for all utility modules
 *
 * This replaces the monolithic utils.ts file with a modular approach
 * Each category of utilities is now in its own focused module
 */

// File type detection utilities
export * from './file-type';

// String manipulation utilities
export * from './string';

// Validation utilities
export * from './validation';

// Path handling utilities
export * from './path';

// File system utilities
export * from './file-system';

// Configuration utilities
export * from './config';

// Language detection utilities
export * from './language';


// Performance optimization utilities
export * from './performance';

// Security utilities (replaces manual implementations)
export * from './security';

// Memory management utilities
export * from './memory';

// Re-export alias
export { SimpleCache as LRUCache } from './security';
