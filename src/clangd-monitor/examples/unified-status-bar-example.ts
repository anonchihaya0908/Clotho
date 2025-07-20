/**
 * Unified Status Bar Integration Example
 * Demonstrates how to integrate the StatusBarPresenter with existing monitors
 * to create a single, clean status bar display instead of multiple items
 */

import * as vscode from 'vscode';
import { StatusBarPresenter } from '../../common/status-bar-presenter';
import { MemoryMonitor } from '../monitors/memory-monitor';
import { CpuMonitor } from '../monitors/cpu-monitor';
import { MemoryUsage, CpuUsage } from '../types';

/**
 * Example coordinator that uses the unified status bar presenter
 * This shows how to integrate multiple monitors with a single status display
 */
export class UnifiedMonitorExample {
    private statusBarPresenter: StatusBarPresenter;
    private memoryMonitor: MemoryMonitor;
    private cpuMonitor: CpuMonitor;
    private updateTimer: NodeJS.Timeout | undefined;

    constructor() {
        // Create the unified status bar presenter
        this.statusBarPresenter = new StatusBarPresenter({
            compactMode: false, // Set to true for more compact display
            showDetailedTooltip: true,
            position: vscode.StatusBarAlignment.Right,
            priority: 100 // Higher priority to appear more prominently
        });

        // Create individual monitors (but hide their status bars)
        this.memoryMonitor = new MemoryMonitor();
        this.cpuMonitor = new CpuMonitor();

        // Hide individual monitor status bars to avoid clutter
        this.hideIndividualStatusBars();

        // Set up data synchronization
        this.setupDataSynchronization();
    }

    /**
     * Hide individual monitor status bars since we're using unified display
     * Note: In a real implementation, you would modify the monitors to optionally
     * hide their status bars or create them without status bars when using unified mode
     */
    private hideIndividualStatusBars(): void {
        // This is conceptual - actual implementation would require modifying
        // the monitor classes to support hiding their status bars
        console.log('Unified status bar active - individual status bars would be hidden');
    }

    /**
     * Set up data synchronization between monitors and unified presenter
     */
    private setupDataSynchronization(): void {
        // Update the unified display every 2 seconds
        this.updateTimer = setInterval(() => {
            this.updateUnifiedDisplay();
        }, 2000);

        // Initial update
        this.updateUnifiedDisplay();
    }

    /**
     * Update the unified status bar with current data from all monitors
     */
    private updateUnifiedDisplay(): void {
        // Get current data from monitors
        const memoryUsage = this.memoryMonitor.getLastMemoryUsage();
        const cpuUsage = this.cpuMonitor.getCurrentUsage();

        // Update the unified presenter
        this.statusBarPresenter.updateMemoryUsage(memoryUsage);
        this.statusBarPresenter.updateCpuUsage(cpuUsage);

        // Set active state based on whether we have any data
        const isActive = memoryUsage !== undefined || cpuUsage !== undefined;
        this.statusBarPresenter.setActive(isActive);
    }

    /**
     * Start all monitoring
     */
    public async start(): Promise<void> {
        await Promise.all([
            this.memoryMonitor.start(),
            this.cpuMonitor.start()
        ]);

        console.log('Clotho UnifiedMonitorExample: All monitors started with unified status bar');
    }

    /**
     * Stop all monitoring
     */
    public stop(): void {
        this.memoryMonitor.stop();
        this.cpuMonitor.stop();

        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = undefined;
        }

        console.log('Clotho UnifiedMonitorExample: All monitors stopped');
    }

    /**
     * Toggle compact mode
     */
    public toggleCompactMode(): void {
        const currentConfig = this.statusBarPresenter.getConfig();
        this.statusBarPresenter.setCompactMode(!currentConfig.compactMode);

        const mode = currentConfig.compactMode ? 'standard' : 'compact';
        vscode.window.showInformationMessage(`Status bar switched to ${mode} mode`);
    }

    /**
     * Show current monitoring statistics
     */
    public showStats(): void {
        const memoryUsage = this.statusBarPresenter.getCurrentMemoryUsage();
        const cpuUsage = this.statusBarPresenter.getCurrentCpuUsage();

        let message = 'Clangd Monitoring Statistics:\\n\\n';

        if (memoryUsage) {
            message += `Memory: ${this.formatBytes(memoryUsage.memory)}\\n`;
            message += `Process ID: ${memoryUsage.pid}\\n`;
            message += `Updated: ${memoryUsage.timestamp.toLocaleTimeString()}\\n\\n`;
        } else {
            message += 'Memory: Not available\\n\\n';
        }

        if (cpuUsage) {
            message += `CPU: ${cpuUsage.cpu.toFixed(1)}%\\n`;
            message += `Updated: ${new Date(cpuUsage.timestamp).toLocaleTimeString()}`;
        } else {
            message += 'CPU: Not available';
        }

        vscode.window.showInformationMessage(message);
    }

    /**
     * Format bytes in human-readable format
     */
    private formatBytes(bytes: number): string {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';

        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        const size = bytes / Math.pow(1024, i);

        return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
    }

    /**
     * Get the unified status bar presenter (for external access)
     */
    public getStatusBarPresenter(): StatusBarPresenter {
        return this.statusBarPresenter;
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        this.stop();

        this.memoryMonitor.dispose();
        this.cpuMonitor.dispose();
        this.statusBarPresenter.dispose();

        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = undefined;
        }
    }
}

/**
 * Usage Example for extension.ts:
 * 
 * export function activate(context: vscode.ExtensionContext) {
 *     // Instead of using the regular MonitorCoordinator, use the unified version
 *     const unifiedMonitor = new UnifiedMonitorExample();
 *     
 *     // Start monitoring
 *     unifiedMonitor.start();
 *     
 *     // Register commands
 *     const toggleCompactCommand = vscode.commands.registerCommand(
 *         'clotho.toggleCompactStatusBar',
 *         () => unifiedMonitor.toggleCompactMode()
 *     );
 *     
 *     const showStatsCommand = vscode.commands.registerCommand(
 *         'clotho.showClangdDetails',
 *         () => unifiedMonitor.showStats()
 *     );
 *     
 *     // Add to disposables
 *     context.subscriptions.push(
 *         unifiedMonitor,
 *         toggleCompactCommand,
 *         showStatsCommand
 *     );
 * }
 */
