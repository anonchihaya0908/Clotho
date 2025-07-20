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
import { ErrorHandler } from '../common/error-handler';

/**
 * Central coordinator class that manages all monitoring components
 */
export class MonitorCoordinator implements vscode.Disposable {
    private readonly monitors: Map<string, IMonitor> = new Map();
    private readonly config: MonitorConfig;
    private showDetailsCommand: vscode.Disposable | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(config: MonitorConfig = {}) {
        this.config = config;
        this.initializeMonitors();
        this.registerCommands();
    }

    /**
     * Initialize all monitoring components
     */
    private initializeMonitors(): void {
        try {
            // Initialize memory monitor
            const memoryMonitor = new MemoryMonitor(this.config.memory);
            this.monitors.set('memory', memoryMonitor);

            // Initialize CPU monitor - now powered by ProcessDetector!
            const cpuMonitor = new CpuMonitor(this.config.cpu);
            this.monitors.set('cpu', cpuMonitor);

            // Initialize status monitor (for future use)
            const statusMonitor = new StatusMonitor();
            this.monitors.set('status', statusMonitor);

            console.log('Clotho MonitorCoordinator: All monitors initialized successfully');
            console.log(`  - Memory Monitor: ${memoryMonitor.getName()}`);
            console.log(`  - CPU Monitor: ${cpuMonitor.getName()}`);
            console.log(`  - Status Monitor: ${statusMonitor.getName()}`);

        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'initializeMonitors',
                module: 'MonitorCoordinator',
                showToUser: false,
                logLevel: 'error'
            });
        }
    }

    /**
     * Register VS Code commands for monitor interaction
     */
    private registerCommands(): void {
        this.showDetailsCommand = vscode.commands.registerCommand(
            'clotho.showClangdDetails',
            this.showClangdDetails,
            this
        );

        vscode.commands.registerCommand(
            'clotho.restartClangd',
            () => this.restartClangd()
        );
    }

    /**
     * Restarts the clangd language server by executing its restart command.
     */
    private async restartClangd(): Promise<void> {
        try {
            // First, kill all clangd processes manually to ensure clean restart
            await this.killAllClangdProcesses();

            // Wait a moment for processes to fully terminate
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Then use VS Code's restart command
            await vscode.commands.executeCommand('clangd.restart');

            // Wait for clangd to start up
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Force all monitors to reset and re-detect PID (should now pick the main process)
            const memoryMonitor = this.getMemoryMonitor();
            if (memoryMonitor) {
                await (memoryMonitor as any).resetPid();
            }

            const cpuMonitor = this.getCpuMonitor();
            if (cpuMonitor) {
                await (cpuMonitor as any).resetPid();
            }

            // Force status monitor to update
            const statusMonitor = this.getStatusMonitor();
            if (statusMonitor) {
                await (statusMonitor as any).updateStatus();
            }

            vscode.window.showInformationMessage('Clangd has been restarted (all processes killed, monitors re-initialized).');

            // Refresh the details panel after a delay to allow restart to complete
            setTimeout(() => this.showClangdDetails(), 3000);
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'restartClangd',
                module: 'MonitorCoordinator',
                showToUser: true,
                logLevel: 'error'
            });
        }
    }

    /**
     * Kill all clangd processes on the system (Windows-specific)
     */
    private async killAllClangdProcesses(): Promise<void> {
        try {
            // Use Windows taskkill command to forcefully terminate all clangd processes
            await new Promise<void>((resolve, reject) => {
                exec('taskkill /f /im clangd.exe', (error: any, stdout: string, stderr: string) => {
                    if (error && !error.message.includes('not found')) {
                        // Only reject if it's not a "process not found" error
                        reject(error);
                    } else {
                        console.log(`Clotho: Killed clangd processes - ${stdout}`);
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.warn('Clotho: Failed to kill clangd processes:', error);
            // Don't throw - this is not critical
        }
    }

    /**
     * Start all monitors
     */
    public async startMonitoring(): Promise<void> {
        try {
            for (const [name, monitor] of this.monitors) {
                await monitor.start();
                console.log(`Clotho: Started ${monitor.getName()}`);
            }
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'startMonitoring',
                module: 'MonitorCoordinator',
                showToUser: true,
                logLevel: 'error'
            });
        }
    }

    /**
     * Stop all monitors
     */
    public stopMonitoring(): void {
        try {
            for (const [name, monitor] of this.monitors) {
                monitor.stop();
                console.log(`Clotho: Stopped ${monitor.getName()}`);
            }
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'stopMonitoring',
                module: 'MonitorCoordinator',
                showToUser: false,
                logLevel: 'warn'
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
     * Get memory monitor specifically
     */
    public getMemoryMonitor(): MemoryMonitor | undefined {
        return this.getMonitor<MemoryMonitor>('memory');
    }

    /**
     * Get CPU monitor specifically
     */
    public getCpuMonitor(): CpuMonitor | undefined {
        return this.getMonitor<CpuMonitor>('cpu');
    }

    /**
     * Get status monitor specifically
     */
    public getStatusMonitor(): StatusMonitor | undefined {
        return this.getMonitor<StatusMonitor>('status');
    }

    /**
     * Show detailed clangd information in a dialog
     */
    private async showClangdDetails(): Promise<void> {
        try {
            const memoryMonitor = this.getMemoryMonitor();
            const statusMonitor = this.getStatusMonitor();

            if (!memoryMonitor || !statusMonitor) {
                vscode.window.showErrorMessage('Clangd monitoring is not available');
                return;
            }

            const lastMemoryUsage = memoryMonitor.getLastMemoryUsage();
            const currentStatus = statusMonitor.getCurrentStatus();

            // Create detailed information panel
            const panel = vscode.window.createWebviewPanel(
                'clangdDetails',
                'Clangd Process Details',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            // Generate HTML content
            panel.webview.html = this.generateDetailsHtml(lastMemoryUsage, currentStatus, memoryMonitor.getConfig());

            // Handle messages from webview
            panel.webview.onDidReceiveMessage(
                async (message) => {
                    switch (message.command) {
                        case 'refresh':
                            // Re-generate and set the HTML content
                            panel.webview.html = await this.getGeneratedHtml();
                            return;
                        case 'restartClangd':
                            await this.restartClangd();
                            // After restart, refresh the panel multiple times to show progress
                            setTimeout(async () => {
                                panel.webview.html = await this.getGeneratedHtml();
                            }, 1000);
                            setTimeout(async () => {
                                panel.webview.html = await this.getGeneratedHtml();
                            }, 3000);
                            setTimeout(async () => {
                                panel.webview.html = await this.getGeneratedHtml();
                            }, 5000);
                            return;
                    }
                },
                undefined,
                this.disposables
            );

        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'showClangdDetails',
                module: 'MonitorCoordinator',
                showToUser: true,
                logLevel: 'error'
            });
        }
    }

    private async getGeneratedHtml(): Promise<string> {
        const memoryMonitor = this.getMemoryMonitor();
        const statusMonitor = this.getStatusMonitor();

        if (!memoryMonitor || !statusMonitor) {
            return this.generateDetailsHtml(null, null, {});
        }

        // Ensure status is up-to-date before rendering
        await (statusMonitor as any).updateStatus();

        const lastMemoryUsage = memoryMonitor.getLastMemoryUsage();
        const currentStatus = statusMonitor.getCurrentStatus();
        const config = memoryMonitor.getConfig();

        return this.generateDetailsHtml(lastMemoryUsage, currentStatus, config);
    }

    /**
     * Generate HTML content for the details panel
     */
    private generateDetailsHtml(memoryUsage: any, status: any, config: any): string {
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
            
            ${hasData ? `
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
                        ${status.version ? `
                        <div class="info-item">
                            <span class="info-label">Version:</span>
                            <span>${status.version}</span>
                        </div>
                        ` : ''}
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
            ` : `
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
            `}

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
     * Debug clangd detection for troubleshooting
     */
    private async debugClangdDetection(): Promise<void> {
        try {
            const memoryMonitor = this.getMemoryMonitor();
            if (memoryMonitor) {
                await memoryMonitor.debugClangdDetection();
            } else {
                vscode.window.showErrorMessage('Memory monitor not available');
            }
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'debugClangdDetection',
                module: 'MonitorCoordinator',
                showToUser: true,
                logLevel: 'error'
            });
        }
    }

    /**
     * Clean up all resources
     */
    public dispose(): void {
        // Dispose all monitors
        for (const monitor of this.monitors.values()) {
            monitor.dispose();
        }
        this.monitors.clear();

        // Dispose commands
        if (this.showDetailsCommand) {
            this.showDetailsCommand.dispose();
        }

        // Dispose debug command
        const debugCommand = (this as any).debugCommand;
        if (debugCommand) {
            debugCommand.dispose();
        }
    }
}
