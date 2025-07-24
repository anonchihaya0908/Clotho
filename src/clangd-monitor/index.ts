/**
 * CLANGD MONITOR - MODULE INDEX
 * =============================
 *
 * This module provides real-time monitoring of clangd server processes,
 * displaying memory usage and status information in the VS Code status bar.
 *
 * ARCHITECTURE:
 * - coordinator.ts: Central coordinator that manages all monitoring functionality
 * - monitors/memory-monitor.ts: Memory usage monitoring and status bar display
 * - monitors/status-monitor.ts: Server status and connection monitoring
 * - types.ts: Shared interfaces and type definitions
 * - index.ts: Module activation and initialization
 *
 * FEATURES:
 * - Real-time memory usage display in status bar
 * - Process ID detection through clangd extension API
 * - Cross-platform process monitoring (Windows, macOS, Linux)
 * - Configurable update intervals and warning thresholds
 * - Detailed information panel with refresh capability
 * - Smart fallback when clangd process is not found
 * - Color-coded warnings for high memory usage
 *
 * WORKFLOW:
 * Extension activation → Initialize coordinator → Start memory monitor →
 * Find clangd PID → Poll memory usage → Update status bar → Handle user clicks
 */

// Export types and classes for external usage
export { MonitorCoordinator } from './coordinator';
export { MemoryMonitor } from './monitors/memory-monitor';
export { StatusMonitor } from './monitors/status-monitor';
export type {
  IMonitor,
  MemoryUsage,
  ClangdStatus,
  MemoryMonitorConfig,
  MonitorConfig,
} from './types';
