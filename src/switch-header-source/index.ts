/**
 * SWITCH HEADER SOURCE - MODULE INDEX
 * ====================================
 * 
 * This module provides intelligent switching between C/C++ header and source files.
 * It implements a hybrid approach that combines clangd's precise LSP-based switching
 * with fallback heuristic search strategies.
 * 
 * ARCHITECTURE:
 * - switch-service.ts: Core switching algorithms (clangd + explorer modes)
 * - switch-ui.ts: User interface and interaction handling
 * - config-manager.ts: Configuration templates and management
 * - coordinator.ts: Command registration and layer orchestration
 * - index.ts: Module exports and unified API
 * 
 * FEATURES:
 * - Clangd integration for compile_commands.json-based projects
 * - Intelligent fallback with multiple search strategies
 * - Configurable directory structures
 * - Template-based configuration for different project types
 * - Support for test file patterns with smart basename cleaning
 * - Performance optimizations with regex caching
 * 
 * WORKFLOW:
 * Command triggered → Coordinator → Service (clangd → heuristics) → UI (display results)
 */

// Export main coordinator function
export { activateSwitchSourceHeader, SwitchCoordinator } from './coordinator';

// Export service layer
export { SwitchService, type SearchResult } from './switch-service';

// Export UI layer
export { SwitchUI } from './switch-ui';

// Export configuration management
export { SwitchConfigService, CONFIG_TEMPLATES, type SwitchConfig } from './config-manager';

// Re-export for external usage
export type { ExtensionContext } from './coordinator';
