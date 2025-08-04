/**
 * Process Runner
 * Centralized module for executing system commands and child processes
 * Provides consistent error handling, logging, and timeout management
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { PERFORMANCE } from './constants';
import { errorHandler } from './error-handler';
import { logger } from './logger';

// 执行选项的明确类型定义
interface ExecOptions {
  timeout: number;
  encoding: BufferEncoding;
  cwd?: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface CommandOptions {
  timeout?: number; // Timeout in milliseconds
  cwd?: string; // Working directory
  encoding?: BufferEncoding;
  logCommand?: boolean; // Whether to log the command being executed
}

/**
 * Centralized command execution utility
 * Handles all child_process operations with consistent error handling and logging
 */
export class ProcessRunner {
  private static readonly DEFAULT_OPTIONS: Required<
    Omit<CommandOptions, 'cwd'>
  > = {
      timeout: PERFORMANCE.PROCESS_TIMEOUT,
      encoding: 'utf8',
      logCommand: false,
    };

  // 调试模式控制
  private static readonly DEBUG = process.env.CLOTHO_DEBUG === 'true';

  // 异步执行器，避免重复 promisify
  private static readonly execAsync = promisify(exec);


  /**
   * 通用的命令执行核心方法（消除代码重复）
   */
  private static async executeCommand(
    command: string,
    options: CommandOptions
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };

    if (this.DEBUG) {
      logger.debug(`Executing command: ${command}`, { module: 'ProcessRunner', operation: 'executeCommand' });
    }

    // 使用明确类型而非 any
    const execOptions: ExecOptions = {
      timeout: mergedOptions.timeout,
      encoding: mergedOptions.encoding,
    };

    if (options.cwd) {
      execOptions.cwd = options.cwd;
    }

    try {
      const { stdout, stderr } = await this.execAsync(command, execOptions);

      if (stderr && this.DEBUG) {
        logger.debug(`Command stderr: ${stderr}`, { module: 'ProcessRunner', operation: 'executeCommand' });
      }

      return { stdout, stderr, exitCode: 0 };
    } catch (error: any) {
      // 对于失败的命令，返回错误信息而不是抛出异常
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
      };
    }
  }

  /**
   * Execute a shell command and return the output
   * @param command The command to execute
   * @param options Execution options
   * @returns Promise resolving to stdout content
   * @throws Error if command fails or times out
   */
  public static async runCommand(
    command: string,
    options: CommandOptions = {},
  ): Promise<string> {
    try {
      const result = await this.executeCommand(command, options);

      if (result.exitCode !== 0) {
        throw new Error(`Command failed with exit code ${result.exitCode}: ${result.stderr}`);
      }

      return result.stdout;
    } catch (error: any) {
      const errorMessage = `Command failed: ${command}`;

      errorHandler.handle(error, {
        operation: 'runCommand',
        module: 'ProcessRunner',
        showToUser: false,
        logLevel: 'debug',
      });

      // Re-throw with more context
      throw new Error(`${errorMessage} - ${error.message}`);
    }
  }

  /**
   * Execute a command and return full result including exit code
   * @param command The command to execute
   * @param options Execution options
   * @returns Promise resolving to full command result
   */
  public static async runCommandWithDetails(
    command: string,
    options: CommandOptions = {},
  ): Promise<CommandResult> {
    if (this.DEBUG) {
      logger.debug(`Executing command with details: ${command}`, { module: 'ProcessRunner', operation: 'executeWithDetails' });
    }

    // 使用通用执行方法，消除代码重复
    const result = await this.executeCommand(command, options);

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  }

  /**
   * Check if a command exists in the system PATH
   * @param command Command name to check
   * @returns Promise resolving to true if command exists
   */
  public static async commandExists(command: string): Promise<boolean> {
    try {
      const checkCommand =
        process.platform === 'win32' ? `where ${command}` : `which ${command}`;

      await ProcessRunner.runCommand(checkCommand, { logCommand: false });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get process information using platform-specific commands
   * @param processName Name of the process to search for
   * @returns Promise resolving to process information
   */
  public static async getProcessInfo(
    processName: string,
  ): Promise<Array<{ pid: number; ppid: number; memory: number }>> {
    try {
      if (process.platform === 'win32') {
        return await ProcessRunner.getWindowsProcessInfo(processName);
      } else {
        return await ProcessRunner.getUnixProcessInfo(processName);
      }
    } catch (error) {
      errorHandler.handle(error, {
        operation: 'getProcessInfo',
        module: 'ProcessRunner',
        showToUser: false,
        logLevel: 'debug',
      });
      return [];
    }
  }

  /**
   * Windows-specific process information gathering
   */
  private static async getWindowsProcessInfo(
    processName: string,
  ): Promise<Array<{ pid: number; ppid: number; memory: number }>> {
    const processes: Array<{ pid: number; ppid: number; memory: number }> = [];

    try {
      // Try WMIC first
      const wmicCommand = `wmic process where "name='${processName}.exe'" get processid,parentprocessid,workingsetsize /format:csv`;
      const stdout = await ProcessRunner.runCommand(wmicCommand);

      if (!stdout || stdout.includes('No Instance')) {
        throw new Error('WMIC returned no instances');
      }

      // Parse WMIC CSV output
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes(`${processName}.exe`)) {
          const parts = line.split(',');
          if (parts.length >= 4) {
            // CSV format: Node,Name,ParentProcessId,ProcessId,WorkingSetSize
            const ppid = parseInt(parts[2]?.trim());
            const pid = parseInt(parts[3]?.trim());
            const memory = parseInt(parts[4]?.trim()) / 1024; // Convert to KB

            if (!isNaN(pid) && !isNaN(ppid) && !isNaN(memory)) {
              processes.push({ pid, ppid, memory });
            }
          }
        }
      }

      return processes;
    } catch (wmicError) {
      if (this.DEBUG) {
        logger.debug('WMIC failed, trying PowerShell fallback', { module: 'ProcessRunner', operation: 'getProcessInfo', error: wmicError });
      }

      // PowerShell fallback
      const psCommand = `powershell "Get-WmiObject -Class Win32_Process -Filter \\"name='${processName}.exe'\\" | Select-Object ProcessId,ParentProcessId,WorkingSetSize | ConvertTo-Json"`;
      const psOutput = await ProcessRunner.runCommand(psCommand);

      if (!psOutput.trim()) {
        return [];
      }

      let psProcesses = JSON.parse(psOutput);
      if (!Array.isArray(psProcesses)) {
        psProcesses = [psProcesses];
      }

      return psProcesses.map((p: any) => ({
        pid: p.ProcessId,
        ppid: p.ParentProcessId,
        memory: (p.WorkingSetSize || 0) / 1024, // Convert to KB
      }));
    }
  }

  /**
   * Unix/Linux/Mac-specific process information gathering
   */
  private static async getUnixProcessInfo(
    processName: string,
  ): Promise<Array<{ pid: number; ppid: number; memory: number }>> {
    const command = `ps -eo pid,ppid,rss,comm | grep ${processName} | grep -v grep`;
    const stdout = await ProcessRunner.runCommand(command);

    const lines = stdout.trim().split('\n');
    if (lines.length === 0 || lines[0] === '') {
      return [];
    }

    const processes: Array<{ pid: number; ppid: number; memory: number }> = [];

    // Parse ps output
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 4) {
        const pid = parseInt(parts[0]);
        const ppid = parseInt(parts[1]);
        const memory = parseInt(parts[2]); // RSS in KB

        if (!isNaN(pid) && !isNaN(ppid) && !isNaN(memory)) {
          processes.push({ pid, ppid, memory });
        }
      }
    }

    return processes;
  }
}
