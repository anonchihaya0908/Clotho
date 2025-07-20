/**
 * Status Monitor
 * Monitors clangd server status and connection state
 */

import * as vscode from 'vscode';
import { IMonitor, ClangdStatus } from '../types';
import { ErrorHandler } from '../../common/error-handler';

/**
 * Status monitoring implementation that tracks clangd server status
 */
export class StatusMonitor implements IMonitor {
    private running = false;
    private currentStatus: ClangdStatus = { isRunning: false };

    constructor() {
        // Initialize status monitor
    }

    /**
     * Start monitoring clangd status
     */
    public async start(): Promise<void> {
        if (this.running) {
            return;
        }

        try {
            this.running = true;
            await this.updateStatus();
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'startStatusMonitor',
                module: 'StatusMonitor',
                showToUser: false,
                logLevel: 'warn'
            });
        }
    }

    /**
     * Stop monitoring
     */
    public stop(): void {
        this.running = false;
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
        return 'Clangd Status Monitor';
    }

    /**
     * Clean up resources when disposing
     */
    public dispose(): void {
        this.stop();
    }

    /**
     * Update clangd status information
     */
    private async updateStatus(): Promise<void> {
        try {
            const clangdExtension = vscode.extensions.getExtension('llvm-vs-code-extensions.vscode-clangd');
            const status: ClangdStatus = { isRunning: false };

            if (!clangdExtension) {
                status.statusMessage = 'Clangd extension not found';
                this.currentStatus = status;
                return;
            }

            // If the extension is not active, it cannot have an API.
            // We can try to activate it, but we won't wait.
            if (!clangdExtension.isActive) {
                status.statusMessage = 'Clangd extension is not active';
                // Attempt to activate it for the next check
                clangdExtension.activate().then(
                    () => { console.debug('Clotho: Clangd extension activation requested.'); },
                    (err: any) => { console.error("Clotho: Failed to activate clangd extension", err); }
                );
                this.currentStatus = status;
                return;
            }

            const api = clangdExtension.exports;
            if (!api || typeof api.getClient !== 'function') {
                status.statusMessage = 'Clangd API not available (extension may be starting)';
                this.currentStatus = status;
                return;
            }

            const client = api.getClient();
            if (!client) {
                status.statusMessage = 'Language client not available';
                this.currentStatus = status;
                return;
            }

            // State 2 is 'Running'
            if (client.state === 2) {
                status.isRunning = true;
                status.statusMessage = 'Connected and running';

                // Try to get version info from the initializeResult
                if (client.initializeResult?.serverInfo?.version) {
                    status.version = client.initializeResult.serverInfo.version;
                } else if (client.initializeResult?.serverInfo?.name) {
                    status.version = client.initializeResult.serverInfo.name;
                }

                // Try to extract PID
                if (client._serverProcess?.pid) {
                    status.pid = client._serverProcess.pid;
                }
            } else {
                status.statusMessage = `Client not running (State: ${client.state === 1 ? 'Starting' : 'Stopped'})`;
            }

            this.currentStatus = status;
            console.debug('Clotho StatusMonitor: Updated status:', status);

        } catch (error) {
            this.currentStatus = {
                isRunning: false,
                statusMessage: 'Error updating status: ' + (error instanceof Error ? error.message : 'Unknown error')
            };
            console.error('Clotho StatusMonitor: Error updating status:', error);
        }
    }

    /**
     * Get the current status information
     */
    public getCurrentStatus(): ClangdStatus {
        return { ...this.currentStatus };
    }
}
