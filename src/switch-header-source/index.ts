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

// Export main coordinator and service classes
export { SwitchCoordinator } from "./coordinator";
export { SwitchService, type SearchResult } from "./switch-service";
export { SwitchUI } from "./switch-ui";
export {
  SwitchConfigService,
  CONFIG_TEMPLATES,
  type SwitchConfig,
} from "./config-manager";
