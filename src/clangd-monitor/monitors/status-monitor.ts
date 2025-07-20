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

            const status: ClangdStatus = {
                isRunning: false
            };

            if (clangdExtension) {
                console.debug('Clotho StatusMonitor: Clangd extension found');

                if (!clangdExtension.isActive) {
                    try {
                        await clangdExtension.activate();
                        console.debug('Clotho StatusMonitor: Clangd extension activated');
                    } catch (error) {
                        status.statusMessage = 'Failed to activate clangd extension';
                        this.currentStatus = status;
                        return;
                    }
                }

                const api = clangdExtension.exports;
                console.debug('Clotho StatusMonitor: Extension API available:', !!api);
                console.debug('Clotho StatusMonitor: getClient method available:', !!api?.getClient);

                if (api?.getClient) {
                    const client = api.getClient();
                    console.debug('Clotho StatusMonitor: Client available:', !!client);
                    console.debug('Clotho StatusMonitor: Client state:', client?.state);

                    if (client && client.state === 2) { // 2 = Running state
                        status.isRunning = true;
                        status.statusMessage = 'Connected and running';

                        // Try to extract PID using same methods as memory monitor
                        if (client._serverProcess?.pid) {
                            status.pid = client._serverProcess.pid;
                        } else if (client._childProcess?.pid) {
                            status.pid = client._childProcess.pid;
                        } else if (client.initializeResult?.serverInfo?.processId) {
                            status.pid = client.initializeResult.serverInfo.processId;
                        }

                        // Try to get version info
                        if (client.initializeResult?.serverInfo?.version) {
                            status.version = client.initializeResult.serverInfo.version;
                        } else if (client.initializeResult?.serverInfo?.name) {
                            status.version = client.initializeResult.serverInfo.name;
                        }
                    } else if (client) {
                        status.statusMessage = `Language client state: ${client.state} (not running)`;
                    } else {
                        status.statusMessage = 'Language client not available';
                    }
                } else {
                    status.statusMessage = 'Clangd API not available';
                }
            } else {
                status.statusMessage = 'Clangd extension not found';
            }

            this.currentStatus = status;
            console.debug('Clotho StatusMonitor: Updated status:', status);

        } catch (error) {
            this.currentStatus = {
                isRunning: false,
                statusMessage: 'Error updating status: ' + (error instanceof Error ? error.message : 'Unknown error')
            };

            console.error('Clotho StatusMonitor: Error updating status:', error);
            ErrorHandler.handle(error, {
                operation: 'updateStatus',
                module: 'StatusMonitor',
                showToUser: false,
                logLevel: 'debug'
            });
        }
    }    /**
     * Get the current status information
     */
    public getCurrentStatus(): ClangdStatus {
        return { ...this.currentStatus };
    }
}
