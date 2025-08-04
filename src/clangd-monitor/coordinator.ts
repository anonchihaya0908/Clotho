/**
 * Monitor Coordinator
 * Central coordinator that manages all clangd monitoring functionality
 */

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { IMonitor, MonitorConfig } from './types';
import { MemoryMonitor } from './monitors/memory-monitor';
import { CpuMonitor } from './monitors/cpu-monitor';
import { StatusMonitor } from './monitors/status-monitor';
import { StatusBarPresenter } from './status-bar-presenter';
import { errorHandler } from '../common/error-handler';
import { LoggerService } from '../common/logger';
import { delay } from '../common/utils/performance';

/**
 * Central coordinator class that manages all monitoring components
 */
export class MonitorCoordinator implements vscode.Disposable {
  private readonly monitors: Map<string, IMonitor> = new Map();
  private readonly config: MonitorConfig;
  private readonly statusBarPresenter: StatusBarPresenter;
  private disposables: vscode.Disposable[] = [];
  private updateInterval: NodeJS.Timeout | undefined;
  private readonly logger = LoggerService.getInstance().createChildLogger('MonitorCoordinator');

  constructor(config: MonitorConfig = {}) {
    this.config = config;
    this.statusBarPresenter = new StatusBarPresenter({
      updateInterval: config.memory?.updateInterval || 5000,
      compactMode: true,
      normalizeCpu: true, // Show normalized CPU (system-wide perspective)
    });
    this.disposables.push(this.statusBarPresenter);
    this.initializeMonitors();
    // Commands are now registered centrally in bootstrap.ts
  }

  /**
   * Initialize all monitoring components
   */
  private initializeMonitors(): void {
    try {
      // Initialize memory monitor without status bar (we use unified presenter)
      const memoryMonitor = new MemoryMonitor(this.config.memory, true);
      this.monitors.set('memory', memoryMonitor);
      this.disposables.push(memoryMonitor);

      // Initialize CPU monitor without status bar (we use unified presenter)
      const cpuMonitor = new CpuMonitor(this.config.cpu, true);
      this.monitors.set('cpu', cpuMonitor);
      this.disposables.push(cpuMonitor);

      // Initialize status monitor (for future use)
      const statusMonitor = new StatusMonitor();
      this.monitors.set('status', statusMonitor);
      this.disposables.push(statusMonitor);

      this.logger.info(
        'All monitors initialized successfully',
      );
      this.logger.info(`  - Memory Monitor: ${memoryMonitor.getName()}`);
      this.logger.info(`  - CPU Monitor: ${cpuMonitor.getName()}`);
      this.logger.info(`  - Status Monitor: ${statusMonitor.getName()}`);
    } catch (error) {
      errorHandler.handle(error, {
        operation: 'initializeMonitors',
        module: 'MonitorCoordinator',
        showToUser: false,
        logLevel: 'error',
      });
    }
  }

  /**
   * Restarts the clangd language server by executing its restart command.
   */
  public async restartClangd(): Promise<void> {
    try {
      // First, kill all clangd processes manually to ensure clean restart
      await this.killAllClangdProcesses();

      // Wait a moment for processes to fully terminate
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Then use VS Code's restart command
      await vscode.commands.executeCommand('clangd.restart');

      // Wait for clangd to start up
              // 🚀 使用统一的延迟函数  
        await delay(2000);

      // Force all monitors to reset and re-detect PID (should now pick the main process)
      const memoryMonitor = this.getMonitor<MemoryMonitor>('memory');
      if (memoryMonitor?.reset) {
        await memoryMonitor.reset();
      }

      const cpuMonitor = this.getMonitor<CpuMonitor>('cpu');
      if (cpuMonitor?.reset) {
        await cpuMonitor.reset();
      }

      // Force status monitor to update
      const statusMonitor = this.getMonitor<StatusMonitor>('status');
      if (statusMonitor?.reset) {
        await statusMonitor.reset();
      }

      vscode.window.showInformationMessage(
        'Clangd has been restarted (all processes killed, monitors re-initialized).',
      );

      // Refresh the details panel after a delay to allow restart to complete
      setTimeout(() => this.showClangdDetails(), 3000);
    } catch (error) {
      errorHandler.handle(error, {
        operation: 'restartClangd',
        module: 'MonitorCoordinator',
        showToUser: true,
        logLevel: 'error',
      });
    }
  }

  /**
   * Kill all clangd processes on the system (cross-platform)
   */
  private async killAllClangdProcesses(): Promise<void> {
    try {
      let command: string;

      // Select command based on platform
      switch (process.platform) {
        case 'win32':
          command = 'taskkill /f /im clangd.exe';
          break;
        case 'darwin':
        case 'linux':
          command = 'pkill -f clangd';
          break;
        default:
          this.logger.warn(
            `Unsupported platform for killing clangd processes: ${process.platform}`,
          );
          return;
      }

      await new Promise<void>((resolve, reject) => {
        exec(command, (error: any, stdout: string, _stderr: string) => {
          if (
            error &&
            !error.message.includes('not found') &&
            !error.message.includes('No matching processes')
          ) {
            // Only reject if it's not a "process not found" error
            reject(error);
          } else {
            this.logger.info(
              `Killed clangd processes on ${process.platform} - ${stdout}`,
            );
            resolve();
          }
        });
      });
    } catch (error) {
      this.logger.warn('Failed to kill clangd processes:', { error });
      // Don't throw - this is not critical
    }
  }

  /**
   * Start all monitors
   */
  public async startMonitoring(): Promise<void> {
    try {
      // Start all individual monitors
      for (const [_name, monitor] of this.monitors) {
        await monitor.start();
        this.logger.info(`Started ${monitor.getName()}`);
      }

      // Start the update loop to feed data to status bar presenter
      this.startStatusBarUpdateLoop();
    } catch (error) {
      errorHandler.handle(error, {
        operation: 'startMonitoring',
        module: 'MonitorCoordinator',
        showToUser: true,
        logLevel: 'error',
      });
    }
  }

  /**
   * Start the status bar update loop
   */
  private startStatusBarUpdateLoop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    const updateFrequency = this.config.memory?.updateInterval || 5000;

    this.updateInterval = setInterval(() => {
      this.updateStatusBarData();
    }, updateFrequency);

    // Initial update
    this.updateStatusBarData();
  }

  /**
   * Update status bar with latest data from monitors
   */
  private updateStatusBarData(): void {
    try {
      const memoryMonitor = this.getMonitor<MemoryMonitor>('memory');
      const cpuMonitor = this.getMonitor<CpuMonitor>('cpu');
      const statusMonitor = this.getMonitor<StatusMonitor>('status');

      // Get latest data from monitors
      const memoryUsage = memoryMonitor?.getLastMemoryUsage();
      const cpuUsage = cpuMonitor?.getCurrentUsage();

      // Update status monitor status
      if (statusMonitor) {
        (statusMonitor as any).updateStatus();
      }
      const currentStatus = statusMonitor?.getCurrentStatus();

      // Update status bar presenter
      this.statusBarPresenter.updateMemoryUsage(memoryUsage);
      this.statusBarPresenter.updateCpuUsage(cpuUsage);

      // Set active state based on clangd running status OR whether we have monitoring data
      const isClangdRunning = currentStatus?.isRunning || false;
      const hasMonitoringData = !!(memoryUsage || cpuUsage);
      const isActive = isClangdRunning || hasMonitoringData;
      this.statusBarPresenter.setActive(isActive);
    } catch (error) {
      this.logger.warn(
        'Failed to update status bar:',
        { error },
      );
    }
  }

  /**
   * Stop all monitors
   */
  public stopMonitoring(): void {
    try {
      // Stop the status bar update loop
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = undefined;
      }

      // Stop all individual monitors
      for (const [_name, monitor] of this.monitors) {
        monitor.stop();
        this.logger.info(`Stopped ${monitor.getName()}`);
      }

      // Set status bar to inactive
      this.statusBarPresenter.setActive(false);
    } catch (error) {
      errorHandler.handle(error, {
        operation: 'stopMonitoring',
        module: 'MonitorCoordinator',
        showToUser: false,
        logLevel: 'warn',
      });
    }
  }

  /**
   * Get a specific monitor by name
   */
  public getMonitor<T extends IMonitor>(name: string): T | undefined {
    return this.monitors.get(name) as T | undefined;
  }

  /**
   * Show detailed clangd information in a dialog
   */
  public async showClangdDetails(): Promise<void> {
    try {
      const memoryMonitor = this.getMonitor<MemoryMonitor>('memory');
      const statusMonitor = this.getMonitor<StatusMonitor>('status');

      if (!memoryMonitor || !statusMonitor) {
        vscode.window.showErrorMessage('Clangd monitoring is not available');
        return;
      }

      const panel = vscode.window.createWebviewPanel(
        'clangdDetails',
        'Clangd Process Details',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        },
      );

      const updatePanelContent = async () => {
        // Ensure status is up-to-date before rendering
        await (statusMonitor as any).updateStatus();

        const lastMemoryUsage = memoryMonitor.getLastMemoryUsage();
        const currentStatus = statusMonitor.getCurrentStatus();
        const config = memoryMonitor.getConfig();

        if (panel.visible) {
          panel.webview.html = this.generateDetailsHtml(
            lastMemoryUsage,
            currentStatus,
            config,
          );
        }
      };
      // Generate HTML content
      await updatePanelContent();

      // Handle messages from webview
      panel.webview.onDidReceiveMessage(
        async (message) => {
          switch (message.command) {
            case 'refresh':
              await updatePanelContent();
              return;
            case 'restartClangd':
              await this.restartClangd();
              // After restart, poll for updates to show progress
              for (let i = 0; i < 5; i++) {
                // 🚀 使用统一的延迟函数
        await delay(1000);
                await updatePanelContent();
              }
              return;
          }
        },
        undefined,
        this.disposables,
      );
    } catch (error) {
      errorHandler.handle(error, {
        operation: 'showClangdDetails',
        module: 'MonitorCoordinator',
        showToUser: true,
        logLevel: 'error',
      });
    }
  }

  /**
   * Generate HTML content for the details panel
   */
  private generateDetailsHtml(
    memoryUsage: any,
    status: any,
    config: any,
  ): string {
    const hasData = memoryUsage && status;

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Clangd Process Details</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    line-height: 1.5;
                }
                .section {
                    margin-bottom: 20px;
                    padding: 15px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 5px;
                }
                .section h2 {
                    margin-top: 0;
                    color: var(--vscode-textLink-foreground);
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }
                .info-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 5px 0;
                }
                .info-label {
                    font-weight: bold;
                }
                .status-running {
                    color: var(--vscode-testing-iconPassed);
                }
                .status-stopped {
                    color: var(--vscode-testing-iconFailed);
                }
                .refresh-button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 3px;
                    cursor: pointer;
                    margin: 10px 0;
                }
                .refresh-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .no-data {
                    text-align: center;
                    color: var(--vscode-descriptionForeground);
                    font-style: italic;
                }
                .button-container {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                }
                .button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 10px 20px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 14px;
                }
                .button-danger {
                    background-color: var(--vscode-dangerForeground);
                    color: var(--vscode-dangerBackground);
                }
                .button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
            <h1>🔍 Clangd Process Monitor</h1>
            
            <div class="button-container">
                <button class="button" onclick="refresh()">🔄 Refresh Data</button>
                <button class="button button-danger" onclick="restartClangd()">💀 Kill All & Restart Clangd</button>
            </div>
            
            ${hasData
      ? `
                <div class="section">
                    <h2>📊 Memory Usage</h2>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Memory:</span>
                            <span>${Math.round(memoryUsage.memory / 1024 / 1024)} MB</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Process ID:</span>
                            <span>${memoryUsage.pid}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Last Updated:</span>
                            <span>${new Date(memoryUsage.timestamp).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h2>⚙️ Server Status</h2>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Status:</span>
                            <span class="${status.isRunning ? 'status-running' : 'status-stopped'}">
                                ${status.isRunning ? '✅ Running' : '❌ Not Running'}
                            </span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Message:</span>
                            <span>${status.statusMessage || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Backend Version:</span>
                            <span>${status.version || '未检测到版本信息'}</span>
                        </div>
                        ${status.pid
        ? `
                        <div class="info-item">
                            <span class="info-label">Server Process ID:</span>
                            <span>${status.pid}</span>
                        </div>
                        `
        : ''
        }
                    </div>
                </div>

                <div class="section">
                    <h2>🔧 Monitor Configuration</h2>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Update Interval:</span>
                            <span>${config.updateInterval / 1000}s</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Warning Threshold:</span>
                            <span>${config.warningThreshold} MB</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Error Threshold:</span>
                            <span>${config.errorThreshold} MB</span>
                        </div>
                    </div>
                </div>
            `
      : `
                <div class="section no-data">
                    <h2>❌ No Data Available</h2>
                    <p>Clangd process monitoring data is not available.</p>
                    <p>Please ensure:</p>
                    <ul style="text-align: left; display: inline-block;">
                        <li>Clangd extension is installed and active</li>
                        <li>A C/C++ file is open in the editor</li>
                        <li>Monitoring has been started</li>
                    </ul>
                </div>
            `
      }

            <script>
                const vscode = acquireVsCodeApi();
                
                function refresh() {
                    vscode.postMessage({ command: 'refresh' });
                }

                function restartClangd() {
                    vscode.postMessage({ command: 'restartClangd' });
                }
            </script>
        </body>
        </html>
        `;
  }

  /**
   * Clean up all resources
   */
  public dispose(): void {
    // Stop monitoring first
    this.stopMonitoring();

    // Dispose all resources
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];

    this.monitors.clear();
  }
}
