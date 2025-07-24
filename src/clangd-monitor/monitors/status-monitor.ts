/**
 * Status Monitor
 * Monitors clangd server status and connection state
 */

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { IMonitor, ClangdStatus } from '../types';
import { ErrorHandler } from '../../common/error-handler';

/**
 * Status monitoring implementation that tracks clangd server status
 */
export class StatusMonitor implements IMonitor {
  private running = false;
  private currentStatus: ClangdStatus = { isRunning: false };
  private updateInterval: NodeJS.Timeout | undefined;

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

      // Set up periodic status updates every 3 seconds
      this.updateInterval = setInterval(() => {
        this.updateStatus().catch((err) => {
          console.warn('Clotho StatusMonitor: Error in periodic update:', err);
        });
      }, 3000);
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'startStatusMonitor',
        module: 'StatusMonitor',
        showToUser: false,
        logLevel: 'warn',
      });
    }
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    this.running = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
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
    return 'Clangd Status Monitor';
  }

  /**
   * Clean up resources when disposing
   */
  public dispose(): void {
    this.stop();
  }

  /**
   * Reset monitor state and force status update
   */
  public async reset(): Promise<void> {
    this.currentStatus = { isRunning: false };
    await this.updateStatus();
  }

  /**
   * Update clangd status information
   */
  public async updateStatus(): Promise<void> {
    try {
      const status: ClangdStatus = { isRunning: false };

      // First, check if VS Code clangd extension is active (for isRunning status)
      const clangdExtension = vscode.extensions.getExtension(
        'llvm-vs-code-extensions.vscode-clangd',
      );

      if (clangdExtension && clangdExtension.isActive) {
        const api = clangdExtension.exports;
        if (api && typeof api.getClient === 'function') {
          const client = api.getClient();
          if (client && client.state === 2) {
            status.isRunning = true;
            status.statusMessage = 'Connected and running';

            // Try to get PID from VS Code client
            if (client._serverProcess?.pid) {
              status.pid = client._serverProcess.pid;
            }
          } else {
            status.statusMessage = `Client not running (State: ${client?.state === 1 ? 'Starting' : 'Stopped'})`;
          }
        } else {
          status.statusMessage =
            'Clangd API not available (extension may be starting)';
        }
      } else {
        status.statusMessage = 'Clangd extension not found or not active';
      }

      // Now get the backend clangd version by executing clangd --version
      try {
        const version = await this.getClangdBackendVersion();
        if (version) {
          status.version = version;
          console.debug(
            'Clotho StatusMonitor: Found backend clangd version:',
            version,
          );
        } else {
          status.version = '后端版本检测失败';
          console.debug(
            'Clotho StatusMonitor: Failed to detect backend clangd version',
          );
        }
      } catch (error) {
        status.version = '后端版本检测错误';
        console.debug(
          'Clotho StatusMonitor: Error detecting backend version:',
          error,
        );
      }

      this.currentStatus = status;
      console.debug('Clotho StatusMonitor: Updated status:', status);
    } catch (error) {
      this.currentStatus = {
        isRunning: false,
        statusMessage:
          'Error updating status: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
        version: '版本检测失败',
      };
      console.error('Clotho StatusMonitor: Error updating status:', error);
    }
  }

  /**
   * Get clangd backend version by executing clangd --version
   */
  private async getClangdBackendVersion(): Promise<string | null> {
    // Strategy 1: Try system PATH clangd first
    let version = await this.tryGetVersionFromPath('clangd');
    if (version) {
      return version;
    }

    // Strategy 2: Try VS Code settings clangd.path
    version = await this.tryGetVersionFromVSCodeSettings();
    if (version) {
      return version;
    }

    console.debug(
      'Clotho StatusMonitor: Both version detection methods failed',
    );
    return null;
  }

  /**
   * Try to get version from a specific clangd path
   */
  private async tryGetVersionFromPath(
    clangdPath: string,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const command = `"${clangdPath}" --version`;
      console.debug('Clotho StatusMonitor: Trying command:', command);

      exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
          console.debug(
            `Clotho StatusMonitor: ${clangdPath} --version failed:`,
            error.message,
          );
          resolve(null);
          return;
        }

        const version = this.parseVersionFromOutput(stdout);
        if (version) {
          console.debug(
            `Clotho StatusMonitor: Version from ${clangdPath}:`,
            version,
          );
        }
        resolve(version);
      });
    });
  }

  /**
   * Try to get clangd version from VS Code settings
   */
  private async tryGetVersionFromVSCodeSettings(): Promise<string | null> {
    try {
      // Get VS Code configuration
      const config = vscode.workspace.getConfiguration('clangd');
      const clangdPath = config.get<string>('path');

      console.debug(
        'Clotho StatusMonitor: VS Code clangd.path setting:',
        clangdPath,
      );

      if (!clangdPath) {
        console.debug('Clotho StatusMonitor: No clangd.path found in settings');
        return null;
      }

      // Try to get version from the configured path
      return await this.tryGetVersionFromPath(clangdPath);
    } catch (error) {
      console.debug(
        'Clotho StatusMonitor: Error reading VS Code settings:',
        error,
      );
      return null;
    }
  }

  /**
   * Parse version information from clangd --version output
   */
  private parseVersionFromOutput(output: string): string | null {
    const trimmedOutput = output.trim();
    console.debug(
      'Clotho StatusMonitor: Parsing version from output:',
      trimmedOutput,
    );

    // Look for version pattern like "clangd version 20.1.8"
    const versionMatch = trimmedOutput.match(/clangd version (\d+\.\d+\.\d+)/);
    if (versionMatch) {
      return `clangd ${versionMatch[1]}`;
    }

    // Look for alternative patterns like "clangd 20.1.8"
    const altMatch = trimmedOutput.match(/clangd (\d+\.\d+\.\d+)/);
    if (altMatch) {
      return `clangd ${altMatch[1]}`;
    }

    // Look for more flexible version patterns
    const flexMatch = trimmedOutput.match(/(\d+\.\d+\.\d+)/);
    if (flexMatch) {
      return `clangd ${flexMatch[1]}`;
    }

    // If we have output but can't parse version, return first line that contains clangd
    const lines = trimmedOutput.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('clangd')) {
        return line.trim();
      }
    }

    return null;
  }

  /**
   * Get the current status information
   */
  public getCurrentStatus(): ClangdStatus {
    return { ...this.currentStatus };
  }
}
