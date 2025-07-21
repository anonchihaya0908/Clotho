/**
 * Memory Monitor
 * Monitors clangd process memory usage and displays it in the status bar
 */

import * as vscode from 'vscode';
import { IMonitor, MemoryUsage, MemoryMonitorConfig } from '../types';
import { ErrorHandler } from '../../common/error-handler';
import { ProcessDetector } from '../../common/process-detector';

// Import pidusage with proper typing
import pidusage from 'pidusage';

/**
 * Memory monitoring implementation that tracks clangd memory usage
 */
export class MemoryMonitor implements IMonitor {
    private static readonly DEFAULT_CONFIG: Required<MemoryMonitorConfig> = {
        updateInterval: 5000,  // 5 seconds for responsive monitoring
        warningThreshold: 2048, // 2GB (yellow)
        errorThreshold: 3072    // 3GB (red)
    };

    private statusBarItem: vscode.StatusBarItem | undefined;
    private updateTimer: NodeJS.Timeout | undefined;
    private running = false;
    private currentPid: number | undefined;
    private lastMemoryUsage: MemoryUsage | undefined;
    private config: Required<MemoryMonitorConfig>;

    constructor(config: MemoryMonitorConfig = {}, hideStatusBar = false) {
        this.config = { ...MemoryMonitor.DEFAULT_CONFIG, ...config };
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
            100 // Priority - higher means more to the right
        );

        this.statusBarItem.text = "$(pulse) Clangd: ---";
        this.statusBarItem.tooltip = "Clangd memory usage monitoring";
        this.statusBarItem.command = 'clotho.showClangdDetails';
        this.statusBarItem.show();
    }

    /**
     * Start monitoring clangd memory usage
     */
    public async start(): Promise<void> {
        if (this.running) {
            return;
        }

        try {
            // Find clangd process ID
            const pid = await this.findClangdPid();
            if (!pid) {
                this.updateStatusBarNoClangd();
                // Still start monitoring - clangd might start later
            } else {
                this.currentPid = pid;
            }

            this.running = true;
            this.startUpdateLoop();

        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'startMemoryMonitor',
                module: 'MemoryMonitor',
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
        this.updateStatusBarStopped();
    }

    /**
     * Reset PID and force re-detection on next update
     * Used when clangd is restarted or when we want to avoid stale process locks
     */
    public async reset(): Promise<void> {
        console.log('Clotho MemoryMonitor: Resetting PID and forcing re-detection (anti-stale mode)');
        this.currentPid = undefined;
        this.lastMemoryUsage = undefined;

        // If monitoring is running, trigger immediate update with fresh detection
        if (this.running) {
            console.log('Clotho MemoryMonitor: Triggering immediate smart process re-detection...');
            await this.updateMemoryUsage();
        }
    }

    /**
     * Check if the monitor is currently running
     */
    public isRunning(): boolean {
        return this.running;
    }

    /**
     * Get human-readable name for this monitor
     */
    public getName(): string {
        return 'Clangd Memory Monitor';
    }

    /**
     * Clean up resources when disposing
     */
    public dispose(): void {
        this.stop();
        if (this.statusBarItem) {
            this.statusBarItem.dispose();
            this.statusBarItem = undefined;
        }
    }

    /**
     * Find clangd process ID through VS Code's language client API
     * This method only attempts API-based detection and returns undefined if not available
     */
    private async findClangdPidViaApi(): Promise<number | undefined> {
        try {
            // Step 1: Check if clangd extension is available
            const clangdExtension = vscode.extensions.getExtension('llvm-vs-code-extensions.vscode-clangd');
            if (!clangdExtension) {
                console.debug('Clotho MemoryMonitor: clangd extension not found');
                return undefined;
            }

            // Step 2: Ensure the extension is activated
            if (!clangdExtension.isActive) {
                try {
                    await clangdExtension.activate();
                    console.debug('Clotho MemoryMonitor: clangd extension activated');
                } catch (error) {
                    console.debug('Clotho MemoryMonitor: Failed to activate clangd extension');
                    return undefined;
                }
            }

            // Step 3: Check if the API is available
            const api = clangdExtension.exports;
            if (!api?.getClient) {
                console.debug('Clotho MemoryMonitor: clangd API not available');
                return undefined;
            }

            // Step 4: Get the language client
            const client = api.getClient();
            if (!client || client.state !== 2) { // 2 = Running state
                console.debug(`Clotho MemoryMonitor: clangd client not running (state: ${client?.state})`);
                return undefined;
            }

            // Step 5: Extract PID from the client's server process
            let pid: number | undefined;

            // Debug: Log all available properties
            console.debug('Clotho MemoryMonitor: Client properties:', Object.keys(client));

            // Method 1: Check if the client has direct process information
            if (client._serverProcess?.pid) {
                pid = client._serverProcess.pid;
                console.debug(`Clotho MemoryMonitor: Found PID via _serverProcess: ${pid}`);
            }
            // Method 2: Check _childProcess (some language client implementations)
            else if (client._childProcess?.pid) {
                pid = client._childProcess.pid;
                console.debug(`Clotho MemoryMonitor: Found PID via _childProcess: ${pid}`);
            }
            // Method 3: Check the initializeResult for server info
            else if (client.initializeResult?.serverInfo?.processId) {
                pid = client.initializeResult.serverInfo.processId;
                console.debug(`Clotho MemoryMonitor: Found PID via initializeResult: ${pid}`);
            }
            // Method 4: Try accessing server options
            else if (client.clientOptions?.serverOptions?.process?.pid) {
                pid = client.clientOptions.serverOptions.process.pid;
                console.debug(`Clotho MemoryMonitor: Found PID via clientOptions: ${pid}`);
            }
            // Method 5: Check if client has a getServerProcess method
            else if (typeof client.getServerProcess === 'function') {
                const serverProcess = client.getServerProcess();
                if (serverProcess?.pid) {
                    pid = serverProcess.pid;
                    console.debug(`Clotho MemoryMonitor: Found PID via getServerProcess: ${pid}`);
                }
            }
            // Method 6: Try accessing the language client's connection
            else if (client.connection && client.connection.sendRequest) {
                console.debug('Clotho MemoryMonitor: Language client has connection but no direct PID access');
            }

            if (pid) {
                console.log(`Clotho MemoryMonitor: Successfully found clangd PID via API: ${pid}`);
                return pid;
            }

            console.debug('Clotho MemoryMonitor: Could not extract PID from clangd client');
            return undefined;

        } catch (error) {
            console.error('Clotho MemoryMonitor: Error in API-based PID detection:', error);
            ErrorHandler.handle(error, {
                operation: 'findClangdPidViaApi',
                module: 'MemoryMonitor',
                showToUser: false,
                logLevel: 'debug'
            });
            return undefined;
        }
    }

    /**
     * Main PID detection coordinator - now much simpler!
     * Leverages the "Ace Detective" ProcessDetector for all the heavy lifting
     */
    private async findClangdPid(): Promise<number | undefined> {
        // Strategy 1: Try to get PID via clangd extension API (most reliable)
        const pidFromApi = await this.findClangdPidViaApi();
        if (pidFromApi) {
            console.log(`Clotho MemoryMonitor: ✅ PID detected via API: ${pidFromApi}`);
            return pidFromApi;
        }

        console.log('Clotho MemoryMonitor: 🔄 API detection failed, delegating to ProcessDetector...');

        // Strategy 2: Delegate to ProcessDetector - our "Ace Detective"
        const mainProcess = await ProcessDetector.findMainProcessByName('clangd');
        if (mainProcess) {
            console.log(`Clotho MemoryMonitor: ✅ ProcessDetector found PID: ${mainProcess.pid}`);
            return mainProcess.pid;
        }

        console.log('Clotho MemoryMonitor: ❌ All detection strategies failed');
        return undefined;
    }    /**
     * 🧬 Perform the "DNA Test" - find our children and select the main one
     * This is the core logic that identifies legitimate children vs stale processes
     */

    /**
     * Start the update loop that periodically checks memory usage
     */
    private startUpdateLoop(): void {
        this.updateTimer = setInterval(async () => {
            await this.updateMemoryUsage();
        }, this.config.updateInterval);

        // Initial update
        this.updateMemoryUsage();
    }

    /**
     * Update memory usage information
     * Coordinates between API detection and process scanning strategies
     */
    private async updateMemoryUsage(): Promise<void> {
        if (!this.running) {
            return;
        }

        try {
            // If we don't have a PID, try to find it using coordinated detection
            if (!this.currentPid) {
                // Strategy 1: Try API detection first (most reliable)
                this.currentPid = await this.findClangdPidViaApi();

                if (!this.currentPid) {
                    console.log('Clotho MemoryMonitor: 🔄 API detection failed, delegating to ProcessDetector...');
                    // Strategy 2: Delegate to ProcessDetector
                    const mainProcess = await ProcessDetector.findMainProcessByName('clangd');
                    this.currentPid = mainProcess?.pid;
                }

                if (!this.currentPid) {
                    this.updateStatusBarNoClangd();
                    return;
                }

                console.log(`Clotho MemoryMonitor: ✅ Using PID ${this.currentPid} for monitoring`);
            }

            // Get memory usage statistics
            const stats = await pidusage(this.currentPid);

            const memoryUsage: MemoryUsage = {
                memory: stats.memory,
                pid: this.currentPid,
                timestamp: new Date()
            };

            this.lastMemoryUsage = memoryUsage;
            this.updateStatusBar(memoryUsage);

            console.debug(`Clotho MemoryMonitor: Updated - Memory: ${Math.round(memoryUsage.memory / 1024 / 1024)}MB`);

        } catch (error) {
            // The process might have died. Clear PID and usage data.
            this.currentPid = undefined;
            this.lastMemoryUsage = undefined;
            this.updateStatusBarNoClangd();

            ErrorHandler.handle(error, {
                operation: 'updateMemoryUsage',
                module: 'MemoryMonitor',
                showToUser: false,
                logLevel: 'debug'
            });
        }
    }

    /**
     * Update status bar with current memory usage
     */
    private updateStatusBar(usage: MemoryUsage): void {
        if (!this.statusBarItem) {
            return;
        }

        const memoryMB = Math.round(usage.memory / 1024 / 1024);

        let icon = "$(pulse)";
        let color: string | vscode.ThemeColor | undefined;

        // Determine icon and color based on memory usage
        if (memoryMB >= this.config.errorThreshold) { // 3GB+
            icon = "$(error)";
            color = "#ff4444"; // Red
        } else if (memoryMB >= this.config.warningThreshold) { // 2-3GB
            icon = "$(warning)";
            color = "#ffaa00"; // Yellow
        } else { // <2GB
            icon = "$(pulse)";
            color = ""; // White (default)
        }

        // Build status text
        const text = `${icon} Clangd: ${memoryMB}MB`;

        this.statusBarItem.text = text;
        this.statusBarItem.color = color;

        // Update tooltip with detailed information
        const tooltip = new vscode.MarkdownString();
        tooltip.appendMarkdown(`**Clangd Process Monitor**\n\n`);
        tooltip.appendMarkdown(`- **Memory**: ${memoryMB} MB\n`);
        tooltip.appendMarkdown(`- **PID**: ${usage.pid}\n`);
        tooltip.appendMarkdown(`- **Last Updated**: ${usage.timestamp.toLocaleTimeString()}\n\n`);
        tooltip.appendMarkdown(`*Click for more details*`);

        this.statusBarItem.tooltip = tooltip;
    }

    /**
     * Update status bar when clangd is not found
     */
    private updateStatusBarNoClangd(): void {
        if (!this.statusBarItem) {
            return;
        }

        this.statusBarItem.text = "$(circle-slash) Clangd: Not Found";
        this.statusBarItem.color = new vscode.ThemeColor('disabledForeground');
        this.statusBarItem.tooltip = "Clangd process not found. Make sure clangd extension is installed and active.";
    }

    /**
     * Update status bar when monitoring is stopped
     */
    private updateStatusBarStopped(): void {
        if (!this.statusBarItem) {
            return;
        }

        this.statusBarItem.text = "$(debug-pause) Clangd: Stopped";
        this.statusBarItem.color = undefined;
        this.statusBarItem.tooltip = "Clangd memory monitoring is stopped";
    }

    /**
     * Get the last recorded memory usage
     */
    public getLastMemoryUsage(): MemoryUsage | undefined {
        return this.lastMemoryUsage;
    }

    /**
     * Get current configuration
     */
    public getConfig(): Required<MemoryMonitorConfig> {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    public updateConfig(newConfig: Partial<MemoryMonitorConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // Restart monitoring with new interval if it changed
        if (newConfig.updateInterval && this.running) {
            this.stop();
            this.start();
        }
    }

    /**
     * Debug method to test clangd detection manually
     */
    public async debugClangdDetection(): Promise<void> {
        console.log('=== Clotho Clangd Detection Debug ===');

        // Test extension availability
        const clangdExtension = vscode.extensions.getExtension('llvm-vs-code-extensions.vscode-clangd');
        console.log('Clangd extension found:', !!clangdExtension);
        console.log('Clangd extension active:', clangdExtension?.isActive);

        if (clangdExtension && clangdExtension.isActive) {
            const api = clangdExtension.exports;
            console.log('Extension exports available:', !!api);
            console.log('getClient method available:', !!api?.getClient);

            if (api?.getClient) {
                const client = api.getClient();
                console.log('Client available:', !!client);
                console.log('Client state:', client?.state);
                console.log('Client properties:', client ? Object.keys(client) : 'N/A');

                if (client) {
                    console.log('_serverProcess:', !!client._serverProcess);
                    console.log('_childProcess:', !!client._childProcess);
                    console.log('initializeResult:', !!client.initializeResult);
                    console.log('clientOptions:', !!client.clientOptions);
                }
            }
        }

        // Test PID detection
        console.log('--- Testing PID Detection ---');
        const pid = await this.findClangdPid();
        console.log('Final detected PID:', pid);

        // Test ProcessDetector method
        console.log('--- Testing ProcessDetector Method ---');
        const fallbackProcess = await ProcessDetector.findMainProcessByName('clangd');
        console.log('ProcessDetector result:', fallbackProcess);

        // Show result to user
        if (pid) {
            vscode.window.showInformationMessage(`Clangd PID detected: ${pid}`);
        } else {
            vscode.window.showWarningMessage('Failed to detect clangd PID. Check console for debug info.');
        }

        console.log('=== Debug Complete ===');
    }
}
