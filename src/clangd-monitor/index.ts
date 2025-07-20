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

import { ExtensionContext } from '../extension';
import { MonitorCoordinator } from './coordinator';
import { MonitorConfig } from './types';

let monitorCoordinator: MonitorCoordinator | undefined;

/**
 * Activates the clangd monitoring functionality
 * @param context The extension context for registering disposables
 * @param config Optional configuration for the monitors
 */
export function activateClangdMonitor(
    context: ExtensionContext,
    config: MonitorConfig = {}
): MonitorCoordinator {

    console.log('Clotho: Activating clangd monitor...');

    try {
        // Create the monitor coordinator
        monitorCoordinator = new MonitorCoordinator(config);

        // Register for cleanup when extension is deactivated
        context.subscriptions.push(monitorCoordinator);

        // Start monitoring
        monitorCoordinator.startMonitoring().then(() => {
            console.log('Clotho: Clangd monitoring started successfully');
        }).catch((error) => {
            console.error('Clotho: Failed to start clangd monitoring:', error);
        });

        return monitorCoordinator;

    } catch (error) {
        console.error('Clotho: Failed to activate clangd monitor:', error);
        throw error;
    }
}

/**
 * Deactivates the clangd monitoring functionality
 */
export function deactivateClangdMonitor(): void {
    if (monitorCoordinator) {
        monitorCoordinator.stopMonitoring();
        monitorCoordinator = undefined;
        console.log('Clotho: Clangd monitor deactivated');
    }
}

/**
 * Gets the current monitor coordinator instance
 */
export function getMonitorCoordinator(): MonitorCoordinator | undefined {
    return monitorCoordinator;
}

// Export types and classes for external usage
export { MonitorCoordinator } from './coordinator';
export { MemoryMonitor } from './monitors/memory-monitor';
export { StatusMonitor } from './monitors/status-monitor';
export type {
    IMonitor,
    MemoryUsage,
    ClangdStatus,
    MemoryMonitorConfig,
    MonitorConfig
} from './types';
