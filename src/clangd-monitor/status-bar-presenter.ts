/**
 * Status Bar Presenter
 * Unified status bar display for clangd monitoring to reduce visual clutter
 * Combines memory and CPU monitoring into a single, elegant status bar item
 */

import * as vscode from 'vscode';
import * as os from 'os';
import { CpuUsage, MemoryUsage } from './types';
import { HeartbeatAnimation, createInitializingHeartbeat } from '../common';

export interface StatusBarConfig {
    updateInterval?: number;
    position?: vscode.StatusBarAlignment;
    priority?: number;
    showDetailedTooltip?: boolean;
    compactMode?: boolean;
    /** Whether to normalize CPU usage by core count (default: true) */
    normalizeCpu?: boolean;
    /** Whether to show raw CPU values in tooltip (default: true) */
    showRawCpuInTooltip?: boolean;
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
        compactMode: true,
        normalizeCpu: true,  // Show normalized CPU (system-wide perspective) by default
        showRawCpuInTooltip: true  // Show raw CPU values for technical users
    };

    private statusBarItem: vscode.StatusBarItem | undefined;
    private config: Required<StatusBarConfig>;
    private lastMemoryUsage: MemoryUsage | undefined;
    private lastCpuUsage: CpuUsage | undefined;
    private isActive = false;
    private readonly coreCount: number;
    private heartbeatAnimation: HeartbeatAnimation;

    constructor(config: StatusBarConfig = {}) {
        this.config = { ...StatusBarPresenter.DEFAULT_CONFIG, ...config };
        this.coreCount = os.cpus().length;
        this.heartbeatAnimation = createInitializingHeartbeat();
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
        const wasActive = this.isActive;
        this.isActive = active;

        // 如果从非活跃变为活跃，停止心跳动画
        if (!wasActive && active) {
            this.heartbeatAnimation.stop(() => {
                // 恢复默认颜色
                if (this.statusBarItem) {
                    this.statusBarItem.color = undefined;
                }
            });
        }

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

        // 如果动画还没开始，启动心跳动画
        if (!this.heartbeatAnimation.isAnimating()) {
            this.heartbeatAnimation.start((isVisible: boolean) => {
                if (this.statusBarItem) {
                    // 文本内容永远不变，确保宽度恒定！
                    this.statusBarItem.text = `$(pulse) clangd: Initializing...`;

                    // 只改变颜色来实现闪烁效果
                    if (isVisible) {
                        // 设置为默认前景色 (可见)
                        this.statusBarItem.color = "#888888"; // Gray but visible
                    } else {
                        // 设置为更暗的颜色 (几乎不可见)
                        this.statusBarItem.color = "#333333"; // Much darker
                    }
                }
            });
        }

        this.statusBarItem.tooltip = "Clangd process not detected\nMonitoring inactive\nSearching for clangd process...";
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
            ? this.formatCpuUsage(this.lastCpuUsage, 1)  // 1 decimal place for better precision
            : '---';

        const icon = this.getStatusIcon();
        const color = this.getStatusColor();

        // Beautiful format: $(icon) clangd: 500MB | 3.1%
        this.statusBarItem.text = `${icon} clangd: ${memoryText} | ${cpuText}`;
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
            ? this.formatCpuUsage(this.lastCpuUsage, 1)  // 1 decimal place in standard mode
            : '---';

        const icon = this.getStatusIcon();
        const color = this.getStatusColor();

        // Beautiful format: $(icon) clangd: 500MB | 3.1%
        this.statusBarItem.text = `${icon} clangd: ${memoryText} | ${cpuText}`;
        this.statusBarItem.color = color;
    }

    /**
     * Get appropriate status icon based on current metrics
     */
    private getStatusIcon(): string {
        // Always use heart rate icon, color will differentiate status
        return "$(pulse)"; // Heart rate icon for all states
    }

    /**
     * Get the current status level based on metrics
     */
    private getStatusLevel(): 'error' | 'warning' | 'normal' {
        // Check CPU usage first (higher priority)
        if (this.lastCpuUsage) {
            const normalizedCpu = this.getNormalizedCpu(this.lastCpuUsage.cpu);
            if (normalizedCpu >= 80) { // 80%+ CPU
                return 'error';
            }
            if (normalizedCpu >= 50) { // 50-80% CPU
                return 'warning';
            }
        }

        // Check memory usage second
        if (this.lastMemoryUsage) {
            const memoryMB = this.lastMemoryUsage.memory / 1024 / 1024;
            if (memoryMB >= 4096) { // 4GB+ memory
                return 'error';
            }
            if (memoryMB >= 2048) { // 2-4GB memory
                return 'warning';
            }
        }

        return 'normal';
    }

    /**
     * Get appropriate status color based on current metrics
     */
    private getStatusColor(): string {
        const statusLevel = this.getStatusLevel();

        switch (statusLevel) {
            case 'error':
                return "#ff4444"; // Red for critical issues
            case 'warning':
                return "#ffaa00"; // Yellow for warnings
            default:
                return ""; // White (default) for normal operation
        }
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
                const normalizedCpu = this.getNormalizedCpu(this.lastCpuUsage.cpu);
                lines.push(`CPU Usage (System): ${normalizedCpu.toFixed(2)}%`);

                // Show raw CPU values for technical users
                if (this.config.showRawCpuInTooltip) {
                    lines.push(`CPU Usage (Cores): ${this.lastCpuUsage.cpu.toFixed(2)}%`);
                    lines.push(`  Core Count: ${this.coreCount}`);
                }

                lines.push(`  Process ID: ${this.lastCpuUsage.pid}`);
                lines.push(`  Last updated: ${new Date(this.lastCpuUsage.timestamp).toLocaleTimeString()}`);
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
     * Get appropriate CPU usage for display
     * @param rawCpu Raw CPU usage (can exceed 100% on multi-core systems)
     * @returns CPU usage for display with intelligent formatting
     */
    private getNormalizedCpu(rawCpu: number): number {
        if (this.config.normalizeCpu) {
            // Normalize by core count for system-wide perspective
            return rawCpu / this.coreCount;
        } else {
            // Return raw value, let formatting handle the display
            return rawCpu;
        }
    }

    /**
     * Format CPU usage for display with intelligent scaling
     * @param cpuUsage CPU usage object
     * @param precision Decimal places for display
     * @returns Formatted CPU string with appropriate scaling
     */
    private formatCpuUsage(cpuUsage: CpuUsage, precision: number = 1): string {
        const rawCpu = cpuUsage.cpu;

        if (this.config.normalizeCpu) {
            // Show normalized CPU (system-wide perspective)
            const normalizedCpu = rawCpu / this.coreCount;
            return `${normalizedCpu.toFixed(precision)}%`;
        } else {
            // Intelligent formatting for raw CPU
            if (rawCpu <= 100) {
                // Normal case: show percentage
                return `${rawCpu.toFixed(precision)}%`;
            } else {
                // High usage case: show both raw and core equivalent
                const coreEquivalent = rawCpu / 100;
                return `${rawCpu.toFixed(0)}% (${coreEquivalent.toFixed(1)}核)`;
            }
        }
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
        this.heartbeatAnimation.stop(() => {
            // 恢复默认颜色
            if (this.statusBarItem) {
                this.statusBarItem.color = undefined;
            }
        });
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
        this.heartbeatAnimation.dispose();
        if (this.statusBarItem) {
            this.statusBarItem.dispose();
            this.statusBarItem = undefined;
        }
    }
}
