/**
 * Status Bar Presenter
 * Unified status bar display for clangd monitoring to reduce visual clutter
 * Combines memory and CPU monitoring into a single, elegant status bar item
 */

import * as vscode from 'vscode';
import { CpuUsage, MemoryUsage } from '../clangd-monitor/types';

export interface StatusBarConfig {
    updateInterval?: number;
    position?: vscode.StatusBarAlignment;
    priority?: number;
    showDetailedTooltip?: boolean;
    compactMode?: boolean;
}

/**
 * Unified status bar presenter that combines multiple monitoring data sources
 * into a single, clean status bar display
 */
export class StatusBarPresenter {
    private static readonly DEFAULT_CONFIG: Required<StatusBarConfig> = {
        updateInterval: 2000,  // 2 seconds
        position: vscode.StatusBarAlignment.Right,
        priority: 100, // Higher priority than individual monitors
        showDetailedTooltip: true,
        compactMode: false
    };

    private statusBarItem: vscode.StatusBarItem | undefined;
    private config: Required<StatusBarConfig>;
    private lastMemoryUsage: MemoryUsage | undefined;
    private lastCpuUsage: CpuUsage | undefined;
    private isActive = false;

    constructor(config: StatusBarConfig = {}) {
        this.config = { ...StatusBarPresenter.DEFAULT_CONFIG, ...config };
        this.createStatusBarItem();
    }

    /**
     * Creates and configures the unified status bar item
     */
    private createStatusBarItem(): void {
        this.statusBarItem = vscode.window.createStatusBarItem(
            this.config.position,
            this.config.priority
        );

        this.statusBarItem.command = 'clotho.showClangdDetails';
        this.updateDisplay();
        this.statusBarItem.show();
    }

    /**
     * Update memory usage data
     */
    public updateMemoryUsage(memoryUsage: MemoryUsage | undefined): void {
        this.lastMemoryUsage = memoryUsage;
        this.updateDisplay();
    }

    /**
     * Update CPU usage data
     */
    public updateCpuUsage(cpuUsage: CpuUsage | undefined): void {
        this.lastCpuUsage = cpuUsage;
        this.updateDisplay();
    }

    /**
     * Set the active state (whether clangd is detected)
     */
    public setActive(active: boolean): void {
        this.isActive = active;
        this.updateDisplay();
    }

    /**
     * Update the status bar display based on current data
     */
    private updateDisplay(): void {
        if (!this.statusBarItem) {
            return;
        }

        if (!this.isActive) {
            this.displayInactive();
            return;
        }

        if (this.config.compactMode) {
            this.displayCompact();
        } else {
            this.displayStandard();
        }

        this.statusBarItem.tooltip = this.buildTooltip();
    }

    /**
     * Display when clangd is not detected
     */
    private displayInactive(): void {
        if (!this.statusBarItem) return;

        this.statusBarItem.text = "$(pulse) Clangd: ---";
        this.statusBarItem.color = "#888888"; // Gray
        this.statusBarItem.tooltip = "Clangd process not detected\nMonitoring inactive";
    }

    /**
     * Display in compact mode (shorter text)
     */
    private displayCompact(): void {
        if (!this.statusBarItem) return;

        const memoryText = this.lastMemoryUsage
            ? `${this.formatMemorySize(this.lastMemoryUsage.memory)}`
            : '---';

        const cpuText = this.lastCpuUsage
            ? `${this.lastCpuUsage.cpu.toFixed(0)}%`
            : '---';

        const icon = this.getStatusIcon();
        const color = this.getStatusColor();

        this.statusBarItem.text = `${icon} ${memoryText} | ${cpuText}`;
        this.statusBarItem.color = color;
    }

    /**
     * Display in standard mode (more descriptive)
     */
    private displayStandard(): void {
        if (!this.statusBarItem) return;

        const memoryText = this.lastMemoryUsage
            ? `${this.formatMemorySize(this.lastMemoryUsage.memory)}`
            : '---';

        const cpuText = this.lastCpuUsage
            ? `${this.lastCpuUsage.cpu.toFixed(1)}%`
            : '---';

        const icon = this.getStatusIcon();
        const color = this.getStatusColor();

        this.statusBarItem.text = `${icon} Clangd: ${memoryText} / ${cpuText}`;
        this.statusBarItem.color = color;
    }

    /**
     * Get appropriate status icon based on current metrics
     */
    private getStatusIcon(): string {
        // Priority: CPU warnings > Memory warnings > Normal
        if (this.lastCpuUsage && this.lastCpuUsage.cpu >= 80) {
            return "$(flame)"; // High CPU
        }

        if (this.lastCpuUsage && this.lastCpuUsage.cpu >= 50) {
            return "$(warning)"; // Medium CPU
        }

        if (this.lastMemoryUsage && this.lastMemoryUsage.memory >= 500 * 1024 * 1024) { // 500MB
            return "$(warning)"; // High memory
        }

        return "$(pulse)"; // Normal
    }

    /**
     * Get appropriate status color based on current metrics
     */
    private getStatusColor(): string {
        // Priority: CPU errors > CPU warnings > Memory warnings > Normal
        if (this.lastCpuUsage && this.lastCpuUsage.cpu >= 80) {
            return "#ff4444"; // Red for high CPU
        }

        if (this.lastCpuUsage && this.lastCpuUsage.cpu >= 50) {
            return "#ffaa00"; // Orange for medium CPU
        }

        if (this.lastMemoryUsage && this.lastMemoryUsage.memory >= 500 * 1024 * 1024) { // 500MB
            return "#ffaa00"; // Orange for high memory
        }

        return "#44ff44"; // Green for normal
    }

    /**
     * Build detailed tooltip with all available information
     */
    private buildTooltip(): string {
        if (!this.config.showDetailedTooltip) {
            return "Clangd monitoring status";
        }

        const lines: string[] = [];

        lines.push("Clangd Process Monitoring");
        lines.push("------------------------");

        if (this.isActive) {
            if (this.lastMemoryUsage) {
                lines.push(`Memory Usage: ${this.formatMemorySize(this.lastMemoryUsage.memory)}`);
                lines.push(`  Process ID: ${this.lastMemoryUsage.pid}`);
                lines.push(`  Last updated: ${this.lastMemoryUsage.timestamp.toLocaleTimeString()}`);
            } else {
                lines.push("Memory Usage: Unavailable");
            }

            if (this.lastCpuUsage) {
                lines.push(`CPU Usage: ${this.lastCpuUsage.cpu.toFixed(1)}%`);
                lines.push(`Last updated: ${new Date(this.lastCpuUsage.timestamp).toLocaleTimeString()}`);
            } else {
                lines.push("CPU Usage: Unavailable");
            }
        } else {
            lines.push("Process Status: Not detected");
            lines.push("Monitoring: Inactive");
        }

        lines.push("");
        lines.push("Click for detailed view");

        return lines.join('\n');
    }

    /**
     * Format memory size in human-readable format
     */
    private formatMemorySize(bytes: number): string {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';

        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        const size = bytes / Math.pow(1024, i);

        return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
    }

    /**
     * Update configuration
     */
    public updateConfig(newConfig: Partial<StatusBarConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // Recreate status bar item if position or priority changed
        if (newConfig.position !== undefined || newConfig.priority !== undefined) {
            this.dispose();
            this.createStatusBarItem();
        } else {
            this.updateDisplay();
        }
    }

    /**
     * Get current configuration
     */
    public getConfig(): Required<StatusBarConfig> {
        return { ...this.config };
    }

    /**
     * Enable compact mode
     */
    public setCompactMode(compact: boolean): void {
        this.config.compactMode = compact;
        this.updateDisplay();
    }

    /**
     * Get the status bar item for external access
     */
    public getStatusBarItem(): vscode.StatusBarItem | undefined {
        return this.statusBarItem;
    }

    /**
     * Check if the presenter is currently active
     */
    public isPresenterActive(): boolean {
        return this.isActive;
    }

    /**
     * Get current memory usage data
     */
    public getCurrentMemoryUsage(): MemoryUsage | undefined {
        return this.lastMemoryUsage;
    }

    /**
     * Get current CPU usage data
     */
    public getCurrentCpuUsage(): CpuUsage | undefined {
        return this.lastCpuUsage;
    }

    /**
     * Force an immediate update of the display
     */
    public forceUpdate(): void {
        this.updateDisplay();
    }

    /**
     * Reset all data and display inactive state
     */
    public reset(): void {
        this.lastMemoryUsage = undefined;
        this.lastCpuUsage = undefined;
        this.isActive = false;
        this.updateDisplay();
    }

    /**
     * Hide the status bar item
     */
    public hide(): void {
        if (this.statusBarItem) {
            this.statusBarItem.hide();
        }
    }

    /**
     * Show the status bar item
     */
    public show(): void {
        if (this.statusBarItem) {
            this.statusBarItem.show();
        }
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        if (this.statusBarItem) {
            this.statusBarItem.dispose();
            this.statusBarItem = undefined;
        }
    }
}
