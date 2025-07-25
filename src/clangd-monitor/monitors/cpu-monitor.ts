/**
 * CPU Monitor
 * Monitors clangd process CPU usage and displays it in the status bar
 */

import * as vscode from 'vscode';
import * as os from 'os';
import { IMonitor, CpuUsage, CpuMonitorConfig } from '../types';
import { ErrorHandler } from '../../common/error-handler';
import { ProcessDetector } from '../../common/process-detector';
import { LoggerService } from '../../common/logger';

// Import pidusage with proper typing
import pidusage from 'pidusage';

/**
 * CPU monitoring implementation that tracks clangd CPU usage
 */
export class CpuMonitor implements IMonitor {
  private static readonly DEFAULT_CONFIG: Required<CpuMonitorConfig> = {
    updateInterval: 3000, // 3 seconds for responsive CPU monitoring
    warningThreshold: 50, // 50% CPU usage (yellow)
    errorThreshold: 80, // 80% CPU usage (red)
    normalizeCpu: true, // Show normalized CPU (system-wide perspective) by default
    showRawCpuInTooltip: true, // Show raw CPU values for technical users
  };

  private statusBarItem: vscode.StatusBarItem | undefined;
  private updateTimer: NodeJS.Timeout | undefined;
  private running = false;
  private currentPid: number | undefined;
  private lastCpuUsage: CpuUsage | undefined;
  private lastPidUsageStats: any | undefined; // For pidusage state tracking
  private config: Required<CpuMonitorConfig>;
  private readonly coreCount: number;
  private readonly logger = LoggerService.getInstance().createChildLogger('CpuMonitor');

  constructor(config: CpuMonitorConfig = {}, hideStatusBar = false) {
    this.config = { ...CpuMonitor.DEFAULT_CONFIG, ...config };
    this.coreCount = os.cpus().length;
    if (!hideStatusBar) {
      this.createStatusBarItem();
    }
  }

  /**
   * Creates and configures the status bar item
   */
  private createStatusBarItem(): void {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99, // Priority - slightly left of memory monitor
    );

    this.statusBarItem.text = '$(pulse) Clangd CPU: ---';
    this.statusBarItem.tooltip = 'Clangd CPU usage monitoring';
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
        this.logger.info(
          `Started monitoring PID ${this.currentPid}`,
        );
      }

      this.running = true;
      this.startUpdateLoop();
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'startCpuMonitor',
        module: 'CpuMonitor',
        showToUser: false,
        logLevel: 'warn',
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
    this.logger.info('Stopped');
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
        const mainProcess =
          await ProcessDetector.findMainProcessByName('clangd');
        this.currentPid = mainProcess?.pid;

        if (!this.currentPid) {
          this.updateStatusBarNoClangd();
          return;
        }

        this.logger.info(
          `✅ ProcessDetector found PID: ${this.currentPid}`,
        );
      }

      // Get CPU usage using pidusage
      const stats = await pidusage(this.currentPid);

      // pidusage already returns percentage, just round to 2 decimal places
      const cpuPercent = Math.round(stats.cpu * 100) / 100;

      // Create our CPU usage structure
      const cpuUsage: CpuUsage = {
        cpu: cpuPercent,
        pid: this.currentPid,
        timestamp: new Date(),
      };

      this.lastCpuUsage = cpuUsage;
      this.updateStatusBar(cpuUsage);
    } catch (error) {
      // If we get an error, the process might have died
      if (this.currentPid) {
        this.logger.info(
          `Lost PID ${this.currentPid}, will search again`,
        );
        this.currentPid = undefined;
        this.lastCpuUsage = undefined;
      }

      this.updateStatusBarNoClangd();

      // Only log if it's not a simple "process not found" error
      if (
        !(error instanceof Error && error.message.includes('No such process'))
      ) {
        ErrorHandler.handle(error, {
          operation: 'updateCpuUsage',
          module: 'CpuMonitor',
          showToUser: false,
          logLevel: 'debug',
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
    let icon = '$(pulse)';
    let color = '';

    // Set icon and color based on normalized thresholds
    if (normalizedCpuPercent >= this.config.errorThreshold) {
      // 80%+
      icon = '$(flame)';
      color = '#ff4444'; // Red
    } else if (normalizedCpuPercent >= this.config.warningThreshold) {
      // 50-80%
      icon = '$(warning)';
      color = '#ffaa00'; // Yellow
    } else {
      // <50%
      icon = '$(pulse)';
      color = ''; // White (default)
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

    this.statusBarItem.text = '$(pulse) Clangd CPU: ---';
    this.statusBarItem.color = '#888888'; // Gray
    this.statusBarItem.tooltip =
      'Clangd process not detected\nCPU monitoring inactive';
  }

  /**
   * Get appropriate CPU usage for display
   * @param rawCpu Raw CPU usage (can exceed 100% on multi-core systems)
   * @returns CPU usage for display with intelligent handling
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
   * @param rawCpu Raw CPU usage
   * @param precision Decimal places for display
   * @returns Formatted CPU string with appropriate scaling
   */
  private formatCpuUsage(rawCpu: number, precision: number = 1): string {
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
   * Build detailed tooltip for status bar
   */
  private buildTooltip(cpuUsage: CpuUsage): string {
    const normalizedCpu = this.getNormalizedCpu(cpuUsage.cpu);
    const lines = [`Clangd CPU Usage (System): ${normalizedCpu.toFixed(2)}%`];

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
      `Update interval: ${this.config.updateInterval / 1000}s`,
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
  public async reset(): Promise<void> {
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
