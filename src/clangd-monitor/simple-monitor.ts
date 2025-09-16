/**
 * 简化的 Clangd 监控器
 * 只负责状态栏显示，移除复杂的HTML界面和多重依赖
 */

import * as vscode from 'vscode';
import { UI_TIMING } from '../common/constants';
import { createModuleLogger } from '../common/logger/unified-logger';
import { ProcessDetector } from '../common/process-detector';

// 导入 pidusage 用于内存和CPU监控
import pidusage from 'pidusage';

interface ClangdInfo {
  pid: number;
  memory: number; // bytes
  cpu: number; // percentage
  version?: string;
  isRunning: boolean;
  lastUpdate: Date;
}

export class SimpleClangdMonitor implements vscode.Disposable {
  private readonly logger = createModuleLogger('SimpleClangdMonitor');

  private statusBarItem: vscode.StatusBarItem;
  private updateTimer: NodeJS.Timeout | undefined;
  private currentInfo: ClangdInfo | undefined;
  private readonly updateInterval = UI_TIMING.CLANGD_MEMORY_MONITOR_INTERVAL;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.name = 'Clangd Monitor';
    this.statusBarItem.tooltip = 'Clangd Process Monitor';
    this.statusBarItem.show();
    this.updateStatusBar();
  }

  /**
     * 开始监控
     */
  public start(): void {
    if (this.updateTimer) {
      return;
    }

    this.updateTimer = setInterval(() => {
      this.updateClangdInfo();
    }, this.updateInterval);

    // 立即更新一次
    this.updateClangdInfo();
  }

  /**
     * 停止监控
     */
  public stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
  }

  /**
   * 更新 Clangd 信息
   */
  private async updateClangdInfo(): Promise<void> {
    try {
      // 1. 查找 clangd 进程
      this.logger.debug('Searching for clangd process...', {
        module: 'SimpleClangdMonitor',
        operation: 'updateClangdInfo',
      });

      const pid = await this.findClangdPid();
      if (!pid) {
        this.logger.debug('No clangd process found', {
          module: 'SimpleClangdMonitor',
          operation: 'updateClangdInfo',
        });
        this.currentInfo = undefined;
        this.updateStatusBar();
        return;
      }

      this.logger.debug(`Found clangd process: ${pid}`, {
        module: 'SimpleClangdMonitor',
        operation: 'updateClangdInfo',
        pid,
      });

      // 2. 获取进程统计信息
      const stats = await pidusage(pid);

      // 3. 获取 clangd 版本（如果还没有获取过）
      let version = this.currentInfo?.version;
      if (!version) {
        version = await this.getClangdVersion();
      }

      // 4. 更新信息
      this.currentInfo = {
        pid,
        memory: stats.memory,
        cpu: stats.cpu,
        version,
        isRunning: true,
        lastUpdate: new Date(),
      };

      this.updateStatusBar();
    } catch (error) {
      this.logger.debug('Failed to update clangd info', {
        module: 'SimpleClangdMonitor',
        error: error instanceof Error ? error.message : String(error),
      });

      // 进程可能已经结束
      this.currentInfo = undefined;
      this.updateStatusBar();
    }
  }

  /**
   * 查找 clangd PID
   */
  private async findClangdPid(): Promise<number | undefined> {
    try {
      // 1. 尝试通过 VS Code API 获取
      const apiPid = await this.findClangdPidViaApi();
      if (apiPid) {
        this.logger.info(`Using API-detected PID: ${apiPid}`, {
          module: 'SimpleClangdMonitor',
          operation: 'findClangdPid',
          pid: apiPid,
        });
        return apiPid;
      }

      // 2. 通过进程名查找
      this.logger.debug('API detection failed, trying process name detection...', {
        module: 'SimpleClangdMonitor',
        operation: 'findClangdPid',
      });

      const process = await ProcessDetector.findMainProcessByName('clangd');
      if (process?.pid) {
        this.logger.info(`Using process-detected PID: ${process.pid}`, {
          module: 'SimpleClangdMonitor',
          operation: 'findClangdPid',
          pid: process.pid,
        });
        return process.pid;
      }

      this.logger.warn('No clangd process found by any method', {
        module: 'SimpleClangdMonitor',
        operation: 'findClangdPid',
      });

      return undefined;
    } catch (error) {
      this.logger.error('Error finding clangd PID', error as Error, {
        module: 'SimpleClangdMonitor',
        operation: 'findClangdPid',
      });
      return undefined;
    }
  }

  /**
   * 通过 VS Code API 查找 clangd PID
   */
  private async findClangdPidViaApi(): Promise<number | undefined> {
    try {
      this.logger.debug('Attempting API-based PID detection...', {
        module: 'SimpleClangdMonitor',
        operation: 'findClangdPidViaApi',
      });

      const clangdExtension = vscode.extensions.getExtension(
        'llvm-vs-code-extensions.vscode-clangd'
      );

      if (!clangdExtension) {
        this.logger.debug('Clangd extension not found', {
          module: 'SimpleClangdMonitor',
          operation: 'findClangdPidViaApi',
        });
        return undefined;
      }

      if (!clangdExtension.isActive) {
        this.logger.debug('Clangd extension not active', {
          module: 'SimpleClangdMonitor',
          operation: 'findClangdPidViaApi',
        });
        return undefined;
      }

      const api = clangdExtension.exports;
      if (!api?.getClient) {
        this.logger.debug('Clangd API getClient not available', {
          module: 'SimpleClangdMonitor',
          operation: 'findClangdPidViaApi',
        });
        return undefined;
      }

      const client = api.getClient();
      if (!client) {
        this.logger.debug('Clangd client not available', {
          module: 'SimpleClangdMonitor',
          operation: 'findClangdPidViaApi',
        });
        return undefined;
      }

      this.logger.debug(`Clangd client state: ${client.state}`, {
        module: 'SimpleClangdMonitor',
        operation: 'findClangdPidViaApi',
        clientState: client.state,
      });

      if (client.state !== 2) { // 2 = Running state
        this.logger.debug('Clangd client not in running state', {
          module: 'SimpleClangdMonitor',
          operation: 'findClangdPidViaApi',
          clientState: client.state,
        });
        return undefined;
      }

      // 尝试多种方式获取 PID
      const pid = (
        client._serverProcess?.pid ||
        client._childProcess?.pid ||
        client.initializeResult?.serverInfo?.processId ||
        undefined
      );

      if (pid) {
        this.logger.info(`Found clangd PID via API: ${pid}`, {
          module: 'SimpleClangdMonitor',
          operation: 'findClangdPidViaApi',
          pid,
        });
      } else {
        this.logger.debug('Could not extract PID from clangd client', {
          module: 'SimpleClangdMonitor',
          operation: 'findClangdPidViaApi',
        });
      }

      return pid;
    } catch (error) {
      this.logger.debug('Error in API-based PID detection', {
        module: 'SimpleClangdMonitor',
        operation: 'findClangdPidViaApi',
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  /**
     * 获取 clangd 版本
     */
  private async getClangdVersion(): Promise<string | undefined> {
    try {
      const clangdExtension = vscode.extensions.getExtension(
        'llvm-vs-code-extensions.vscode-clangd'
      );

      if (!clangdExtension?.isActive) {
        return undefined;
      }

      const api = clangdExtension.exports;
      const client = api?.getClient?.();

      if (client?.initializeResult?.serverInfo?.version) {
        return client.initializeResult.serverInfo.version;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
     * 更新状态栏显示
     */
  private updateStatusBar(): void {
    if (!this.currentInfo) {
      this.statusBarItem.text = '$(circle-slash) Clangd: Offline';
      this.statusBarItem.color = new vscode.ThemeColor('disabledForeground');
      this.statusBarItem.tooltip = 'Clangd is not running';
      return;
    }

    const { memory, cpu, version, pid } = this.currentInfo;
    const memoryMB = Math.round(memory / 1024 / 1024);
    const cpuPercent = Math.round(cpu);

    // 根据内存使用情况设置图标和颜色
    let icon = '$(pulse)';
    let color: string | undefined;

    if (memoryMB >= 4096) { // 4GB+
      icon = '$(error)';
      color = '#ff4444';
    } else if (memoryMB >= 2048) { // 2-4GB
      icon = '$(warning)';
      color = '#ffaa00';
    } else {
      icon = '$(pulse)';
      color = undefined;
    }

    // 简洁的状态栏文本
    this.statusBarItem.text = `${icon} Clangd: ${memoryMB}MB ${cpuPercent}%`;
    this.statusBarItem.color = color;

    // 详细的工具提示
    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown('**Clangd Process Monitor**\n\n');
    tooltip.appendMarkdown(`- **Memory**: ${memoryMB} MB\n`);
    tooltip.appendMarkdown(`- **CPU**: ${cpuPercent}%\n`);
    tooltip.appendMarkdown(`- **PID**: ${pid}\n`);
    if (version) {
      tooltip.appendMarkdown(`- **Version**: ${version}\n`);
    }
    tooltip.appendMarkdown(`- **Last Update**: ${this.currentInfo.lastUpdate.toLocaleTimeString()}\n`);

    this.statusBarItem.tooltip = tooltip;
  }

  /**
   * 调试信息 - 手动检查clangd状态
   */
  public async debugClangdStatus(): Promise<void> {
    this.logger.info('=== Clangd Monitor Debug Info ===', {
      module: 'SimpleClangdMonitor',
      operation: 'debugClangdStatus',
    });

    // 检查监控器状态
    this.logger.info(`Monitor running: ${!!this.updateTimer}`, {
      module: 'SimpleClangdMonitor',
      operation: 'debugClangdStatus',
    });

    this.logger.info(`Current info: ${JSON.stringify(this.currentInfo)}`, {
      module: 'SimpleClangdMonitor',
      operation: 'debugClangdStatus',
    });

    // 手动尝试查找PID
    const pid = await this.findClangdPid();
    this.logger.info(`Manual PID search result: ${pid}`, {
      module: 'SimpleClangdMonitor',
      operation: 'debugClangdStatus',
      pid,
    });

    // 检查clangd扩展状态
    const clangdExtension = vscode.extensions.getExtension(
      'llvm-vs-code-extensions.vscode-clangd'
    );
    this.logger.info(`Clangd extension found: ${!!clangdExtension}`, {
      module: 'SimpleClangdMonitor',
      operation: 'debugClangdStatus',
    });
    this.logger.info(`Clangd extension active: ${clangdExtension?.isActive}`, {
      module: 'SimpleClangdMonitor',
      operation: 'debugClangdStatus',
    });

    if (clangdExtension?.isActive) {
      const api = clangdExtension.exports;
      this.logger.info(`Clangd API available: ${!!api}`, {
        module: 'SimpleClangdMonitor',
        operation: 'debugClangdStatus',
      });
      this.logger.info(`Clangd getClient available: ${!!api?.getClient}`, {
        module: 'SimpleClangdMonitor',
        operation: 'debugClangdStatus',
      });

      if (api?.getClient) {
        const client = api.getClient();
        this.logger.info(`Clangd client available: ${!!client}`, {
          module: 'SimpleClangdMonitor',
          operation: 'debugClangdStatus',
        });
        if (client) {
          this.logger.info(`Clangd client state: ${client.state}`, {
            module: 'SimpleClangdMonitor',
            operation: 'debugClangdStatus',
            clientState: client.state,
          });
        }
      }
    }

    vscode.window.showInformationMessage(
      'Clangd debug info logged to Output panel. Check "Clotho Logs" channel.'
    );
  }

  /**
   * 重启 clangd
   */
  public async restartClangd(): Promise<void> {
    try {
      // 执行 clangd 重启命令
      await vscode.commands.executeCommand('clangd.restart');

      // 清除当前信息，等待重新检测
      this.currentInfo = undefined;
      this.updateStatusBar();

      // 等待一段时间后重新检测
      setTimeout(() => {
        this.updateClangdInfo();
      }, 2000);

      vscode.window.showInformationMessage('Clangd restarted successfully');
    } catch (error) {
      this.logger.error('Failed to restart clangd', error as Error, {
        module: 'SimpleClangdMonitor',
        operation: 'restartClangd',
      });

      vscode.window.showErrorMessage('Failed to restart clangd');
    }
  }

  /**
     * 清理资源
     */
  public dispose(): void {
    this.stop();
    this.statusBarItem.dispose();
  }
}

