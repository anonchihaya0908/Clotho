/**
 * CPU Monitor
 * Monitors clangd process CPU usage and displays it in the status bar
 */

import * as vscode from 'vscode';
import * as os from 'os';
import { IMonitor, CpuUsage, CpuMonitorConfig } from '../types';
import { ErrorHandler } from '../../common/error-handler';
import { ProcessDetector } from '../../common/process-detector';

// Import pidusage with proper typing
import pidusage from 'pidusage';

/**
 * CPU monitoring implementation that tracks clangd CPU usage
 */
export class CpuMonitor implements IMonitor {
    private static readonly DEFAULT_CONFIG: Required<CpuMonitorConfig> = {
        updateInterval: 3000,  // 3 seconds for responsive CPU monitoring
        warningThreshold: 50,  // 50% CPU usage
        errorThreshold: 80,    // 80% CPU usage
        normalizeCpu: true,    // Normalize CPU by core count for user-friendly display
        showRawCpuInTooltip: true  // Show raw CPU values for technical users
    };

    private statusBarItem: vscode.StatusBarItem | undefined;
    private updateTimer: NodeJS.Timeout | undefined;
    private running = false;
    private currentPid: number | undefined;
    private lastCpuUsage: CpuUsage | undefined;
    private lastPidUsageStats: any | undefined; // For pidusage state tracking
    private config: Required<CpuMonitorConfig>;
    private readonly coreCount: number;

    constructor(config: CpuMonitorConfig = {}) {
        this.config = { ...CpuMonitor.DEFAULT_CONFIG, ...config };
        this.coreCount = os.cpus().length;
        this.createStatusBarItem();
    }

    /**
     * Creates and configures the status bar item
     */
    private createStatusBarItem(): void {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            99 // Priority - slightly left of memory monitor
        );

        this.statusBarItem.text = "$(pulse) Clangd CPU: ---";
        this.statusBarItem.tooltip = "Clangd CPU usage monitoring";
        this.statusBarItem.command = 'clotho.showClangdDetails';
        this.statusBarItem.show();
    }

    /**
     * Start monitoring clangd CPU usage
     */
    public async start(): Promise<void> {
        if (this.running) {
            return;
        }

        try {
            // Try to find clangd process initially
            const mainProcess = await ProcessDetector.findMainProcessByName('clangd');
            if (!mainProcess) {
                this.updateStatusBarNoClangd();
                // Still start monitoring - clangd might start later
            } else {
                this.currentPid = mainProcess.pid;
                console.log(`Clotho CpuMonitor: Started monitoring PID ${this.currentPid}`);
            }

            this.running = true;
            this.startUpdateLoop();

        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'startCpuMonitor',
                module: 'CpuMonitor',
                showToUser: false,
                logLevel: 'warn'
            });
        }
    }

    /**
     * Stop monitoring and clean up resources
     */
    public stop(): void {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = undefined;
        }

        this.running = false;
        this.currentPid = undefined;
        this.lastCpuUsage = undefined;
        this.lastPidUsageStats = undefined;

        // Update status bar to show stopped state
        this.updateStatusBarNoClangd();
        console.log('Clotho CpuMonitor: Stopped');
    }

    /**
     * Start the periodic update loop
     */
    private startUpdateLoop(): void {
        this.updateTimer = setInterval(async () => {
            await this.updateCpuUsage();
        }, this.config.updateInterval);

        // Initial update
        this.updateCpuUsage();
    }

    /**
     * Update CPU usage information
     */
    private async updateCpuUsage(): Promise<void> {
        try {
            // If we don't have a PID, use ProcessDetector to find it
            if (!this.currentPid) {
                const mainProcess = await ProcessDetector.findMainProcessByName('clangd');
                this.currentPid = mainProcess?.pid;

                if (!this.currentPid) {
                    this.updateStatusBarNoClangd();
                    return;
                }

                console.log(`Clotho CpuMonitor: ✅ ProcessDetector found PID: ${this.currentPid}`);
            }

            // Get CPU usage using pidusage
            const stats = await pidusage(this.currentPid);

            // pidusage returns percentage directly
            const cpuPercent = Math.round(stats.cpu * 100) / 100; // Round to 2 decimal places

            // Create our CPU usage structure
            const cpuUsage: CpuUsage = {
                cpu: cpuPercent,
                pid: this.currentPid,
                timestamp: new Date()
            };

            this.lastCpuUsage = cpuUsage;
            this.updateStatusBar(cpuUsage);

        } catch (error) {
            // If we get an error, the process might have died
            if (this.currentPid) {
                console.log(`Clotho CpuMonitor: Lost PID ${this.currentPid}, will search again`);
                this.currentPid = undefined;
                this.lastCpuUsage = undefined;
            }

            this.updateStatusBarNoClangd();

            // Only log if it's not a simple "process not found" error
            if (!(error instanceof Error && error.message.includes('No such process'))) {
                ErrorHandler.handle(error, {
                    operation: 'updateCpuUsage',
                    module: 'CpuMonitor',
                    showToUser: false,
                    logLevel: 'debug'
                });
            }
        }
    }

    /**
     * Update status bar with current CPU usage
     */
    private updateStatusBar(cpuUsage: CpuUsage): void {
        if (!this.statusBarItem) {
            return;
        }

        const rawCpuPercent = cpuUsage.cpu;
        const normalizedCpuPercent = this.getNormalizedCpu(rawCpuPercent);
        let icon = "$(pulse)";
        let color = "";

        // Set icon and color based on normalized thresholds
        if (normalizedCpuPercent >= this.config.errorThreshold) {
            icon = "$(flame)";
            color = "#ff4444"; // Red
        } else if (normalizedCpuPercent >= this.config.warningThreshold) {
            icon = "$(warning)";
            color = "#ffaa00"; // Orange
        } else {
            icon = "$(pulse)";
            color = "#44ff44"; // Green
        }

        // Display normalized CPU value for user-friendly experience
        this.statusBarItem.text = `${icon} Clangd CPU: ${this.formatCpuUsage(rawCpuPercent, 1)}`;
        this.statusBarItem.color = color;
        this.statusBarItem.tooltip = this.buildTooltip(cpuUsage);
    }

    /**
     * Update status bar when clangd is not detected
     */
    private updateStatusBarNoClangd(): void {
        if (!this.statusBarItem) {
            return;
        }

        this.statusBarItem.text = "$(pulse) Clangd CPU: ---";
        this.statusBarItem.color = "#888888"; // Gray
        this.statusBarItem.tooltip = "Clangd process not detected\nCPU monitoring inactive";
    }

    /**
     * Get normalized CPU usage for display
     * @param rawCpu Raw CPU usage (can exceed 100% on multi-core systems)
     * @returns Normalized CPU usage relative to total system capacity
     */
    private getNormalizedCpu(rawCpu: number): number {
        if (!this.config.normalizeCpu) {
            return rawCpu;
        }
        return rawCpu / this.coreCount;
    }

    /**
     * Format CPU usage for display
     * @param rawCpu Raw CPU usage
     * @param precision Decimal places for display
     * @returns Formatted CPU string
     */
    private formatCpuUsage(rawCpu: number, precision: number = 1): string {
        const cpu = this.getNormalizedCpu(rawCpu);
        return `${cpu.toFixed(precision)}%`;
    }

    /**
     * Build detailed tooltip for status bar
     */
    private buildTooltip(cpuUsage: CpuUsage): string {
        const normalizedCpu = this.getNormalizedCpu(cpuUsage.cpu);
        const lines = [
            `Clangd CPU Usage (System): ${normalizedCpu.toFixed(2)}%`,
        ];

        // Show raw CPU values for technical users
        if (this.config.showRawCpuInTooltip) {
            lines.push(`Clangd CPU Usage (Cores): ${cpuUsage.cpu.toFixed(2)}%`);
            lines.push(`Core Count: ${this.coreCount}`);
        }

        lines.push(
            `Process ID: ${this.currentPid}`,
            `Last updated: ${new Date(cpuUsage.timestamp).toLocaleTimeString()}`,
            '',
            `Warning threshold: ${this.config.warningThreshold}%`,
            `Error threshold: ${this.config.errorThreshold}%`,
            `Update interval: ${this.config.updateInterval / 1000}s`
        );

        return lines.join('\n');
    }

    /**
     * Get current CPU usage data
     */
    public getCurrentUsage(): CpuUsage | undefined {
        return this.lastCpuUsage;
    }

    /**
     * Check if monitoring is currently active
     */
    public isRunning(): boolean {
        return this.running;
    }

    /**
     * Get current configuration
     */
    public getConfig(): Required<CpuMonitorConfig> {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    public updateConfig(newConfig: Partial<CpuMonitorConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // Restart timer if interval changed and we're running
        if (newConfig.updateInterval && this.running) {
            this.stop();
            this.start();
        }
    }

    /**
     * Force an immediate update of CPU usage
     */
    public async forceUpdate(): Promise<void> {
        await this.updateCpuUsage();
    }

    /**
     * Clean up resources when the monitor is disposed
     */
    public dispose(): void {
        this.stop();

        if (this.statusBarItem) {
            this.statusBarItem.dispose();
            this.statusBarItem = undefined;
        }
    }

    /**
     * Get status bar item for external access
     */
    public getStatusBarItem(): vscode.StatusBarItem | undefined {
        return this.statusBarItem;
    }

    /**
     * Reset all internal state (useful for testing)
     */
    public reset(): void {
        this.currentPid = undefined;
        this.lastCpuUsage = undefined;
        this.lastPidUsageStats = undefined;
        this.updateStatusBarNoClangd();
    }

    /**
     * Check if clangd process is currently detected
     */
    public hasActiveProcess(): boolean {
        return this.currentPid !== undefined;
    }

    /**
     * Get the current clangd process PID being monitored
     */
    public getCurrentPid(): number | undefined {
        return this.currentPid;
    }

    /**
     * Manually set a PID to monitor (useful for testing or advanced usage)
     */
    public setCurrentPid(pid: number | undefined): void {
        this.currentPid = pid;
        this.lastCpuUsage = undefined;
        this.lastPidUsageStats = undefined;

        if (!pid) {
            this.updateStatusBarNoClangd();
        }
    }

    /**
     * Get a human-readable name for this monitor
     */
    public getName(): string {
        return 'CPU Monitor';
    }
}
