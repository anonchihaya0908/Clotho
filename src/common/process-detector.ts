/**
 * Process Detector - The "Ace Detective" of Clotho Extension
 *
 * A centralized detector for finding and analyzing system processes.
 * This detector is responsible for all process detection logic, including the revolutionary
 * "parent-child DNA testing" to identify legitimate processes vs stale ones.
 */

import { ProcessRunner } from './process-runner';
import { ErrorHandler, handleErrors } from './error-handler';
import * as process from 'node:process';

/**
 * Extended process information with metadata
 */
export interface ProcessInfo {
  pid: number;
  ppid: number;
  memory: number; // in KB
  name: string;
  relationship?: 'direct-child' | 'grandchild' | 'orphan';
  isMainProcess?: boolean;
}

/**
 * Process detection strategy result
 */
export interface ProcessDetectionResult {
  success: boolean;
  processInfo?: ProcessInfo;
  method: 'api' | 'dna-test' | 'failed';
  candidateCount: number;
  debugInfo?: string;
}

/**
 * 详细的进程诊断信息
 */
export interface ProcessDiagnostics {
  timestamp: number;
  ourPid: number;
  processCount: number;
  classification: {
    directChildren: ProcessInfo[];
    grandchildren: ProcessInfo[];
    orphans: ProcessInfo[];
  };
  recommendations: string[];
  performanceMetrics: {
    detectionTimeMs: number;
    memoryUsageKB: number;
  };
}

/**
 * 进程分类结果
 */
interface ProcessClassification {
  directChildren: ProcessInfo[];
  grandchildren: ProcessInfo[];
  orphans: ProcessInfo[];
  all: ProcessInfo[];
}

/**
 * A detector for finding and analyzing system processes.
 * The "Ace Detective" of our extension - specializes in process identification and analysis.
 */
export class ProcessDetector {
  // 调试模式控制 - 只在开发环境显示详细日志
  private static readonly DEBUG = process.env.CLOTHO_DEBUG === 'true';

  /**
   * 分级日志输出
   */
  private static log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (level === 'debug' && !this.DEBUG) return;

    const prefix = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    }[level];

    console[level](`${prefix} ProcessDetector: ${message}`, data || '');
  }
  /**
   * 🧬 Finds the main process for a given application name using "DNA testing".
   * This method identifies legitimate child processes and selects the main one based on memory usage.
   *
   * @param processName The name of the process to find (e.g., 'clangd')
   * @returns Promise resolving to ProcessInfo of the main process, or undefined if not found
   */
  public static async findMainProcessByName(
    processName: string,
  ): Promise<ProcessInfo | undefined> {
    try {
      this.log('debug', `Starting investigation for "${processName}" processes`);

      // Step 1: Get our "identity card" (VS Code extension host PID)
      const ourPid = process.pid;
      this.log('debug', `Our Identity Card: Extension Host PID ${ourPid}`);

      // Step 2: Gather all target processes in the system
      const allTargetProcesses = await ProcessRunner.getProcessInfo(processName);

      if (allTargetProcesses.length === 0) {
        this.log('info', `No ${processName} processes found in the system`);
        return undefined;
      }

      this.log('debug', `Found ${allTargetProcesses.length} ${processName} process(es) in the system`);

      if (this.DEBUG) {
        allTargetProcesses.forEach((p) => {
          const memMB = Math.round(p.memory / 1024);
          this.log('debug', `Process PID ${p.pid}: Parent=${p.ppid}, Memory=${memMB}MB`);
        });
      }

      // Step 3: Perform the "DNA Test" - identify our legitimate children
      const classification = this.classifyProcesses(ourPid, allTargetProcesses, processName);
      const result = this.selectMainProcess(classification);

      if (result) {
        this.log('info', `Successfully identified main ${processName} process PID ${result.pid}`);
      } else {
        this.log('warn', `Failed to identify main ${processName} process`);
      }

      return result;
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'findMainProcessByName',
        module: 'ProcessDetector',
        showToUser: false,
        logLevel: 'debug',
      });
      return undefined;
    }
  }

  /**
   * 分类进程关系的通用方法
   */
  private static classifyProcesses(
    ourPid: number,
    processes: Array<{ pid: number; ppid: number; memory: number }>,
    processName: string
  ): ProcessClassification {
    const all: ProcessInfo[] = processes.map((p) => ({
      pid: p.pid,
      ppid: p.ppid,
      memory: p.memory,
      name: processName,
      relationship: this.determineRelationship(ourPid, p.ppid),
      isMainProcess: false,
    }));

    const directChildren = all.filter(p => p.relationship === 'direct-child');
    const grandchildren = all.filter(p => p.relationship === 'grandchild');
    const orphans = all.filter(p => p.relationship === 'orphan');

    this.log('debug', `DNA Analysis: ${directChildren.length} direct children, ${grandchildren.length} grandchildren, ${orphans.length} orphans`);

    return {
      directChildren,
      grandchildren,
      orphans,
      all,
    };
  }

  /**
   * 确定进程关系
   */
  private static determineRelationship(
    ourPid: number,
    processPpid: number
  ): 'direct-child' | 'grandchild' | 'orphan' {
    if (processPpid === ourPid) return 'direct-child';
    // 可以添加更复杂的逻辑来检测 grandchild
    return 'orphan';
  }

  /**
   * 从分类结果中选择主进程
   */
  private static selectMainProcess(classification: ProcessClassification): ProcessInfo | undefined {
    const { directChildren, orphans } = classification;

    // 优先选择直接子进程
    let candidates = [...directChildren];
    let selectedRelationship: 'direct-child' | 'grandchild' | 'orphan' = 'direct-child';

    // 如果没有直接子进程，考虑孤立进程（可靠性较低）
    if (candidates.length === 0) {
      this.log('warn', 'No direct children found, considering orphan processes...');
      candidates = orphans;
      selectedRelationship = 'orphan';
    }

    if (candidates.length === 0) {
      this.log('error', 'No valid candidates after DNA test');
      return undefined;
    }

    // 在候选进程中，选择内存使用最高的（主服务器）
    candidates.sort((a, b) => b.memory - a.memory);
    const selectedProcess = candidates[0];

    const result: ProcessInfo = {
      ...selectedProcess,
      relationship: selectedRelationship,
      isMainProcess: true,
    };

    this.log('debug', `Selected PID ${selectedProcess.pid}: ${Math.round(selectedProcess.memory / 1024)}MB (${selectedRelationship})`);

    return result;
  }

  /**
   *  Advanced process detection with multiple strategies
   * This method combines API detection with DNA testing for maximum reliability
   *
   * @param processName The name of the process to find
   * @param apiDetector Optional API-based detection function
   * @returns Detailed detection result with metadata
   */
  public static async detectProcessWithStrategy(
    processName: string,
    apiDetector?: () => Promise<number | undefined>,
  ): Promise<ProcessDetectionResult> {
    try {
      let candidateCount = 0;

      // Strategy 1: Try API detection first (if provided)
      if (apiDetector) {
        this.log('debug', `Strategy 1: Attempting API detection for ${processName}`);
        const apiPid = await apiDetector();

        if (apiPid) {
          this.log('info', `API detection successful: PID ${apiPid}`);
          return {
            success: true,
            processInfo: {
              pid: apiPid,
              ppid: 0, // Unknown via API
              memory: 0, // Unknown via API
              name: processName,
              relationship: 'direct-child',
              isMainProcess: true,
            },
            method: 'api',
            candidateCount: 1,
            debugInfo: `API detected PID ${apiPid}`,
          };
        }

        this.log('warn', 'API detection failed, falling back to DNA testing');
      }

      // Strategy 2: DNA testing (process scanning)
      this.log('debug', `Strategy 2: DNA testing for ${processName}`);
      const allProcesses = await ProcessRunner.getProcessInfo(processName);
      candidateCount = allProcesses.length;

      const classification = this.classifyProcesses(process.pid, allProcesses, processName);
      const mainProcess = this.selectMainProcess(classification);

      if (mainProcess) {
        return {
          success: true,
          processInfo: mainProcess,
          method: 'dna-test',
          candidateCount,
          debugInfo: `DNA test selected PID ${mainProcess.pid} from ${candidateCount} candidates`,
        };
      }

      // Both strategies failed
      return {
        success: false,
        method: 'failed',
        candidateCount,
        debugInfo: `All strategies failed. Found ${candidateCount} candidates but none were legitimate children.`,
      };
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'detectProcessWithStrategy',
        module: 'ProcessDetector',
        showToUser: false,
        logLevel: 'warn',
      });

      return {
        success: false,
        method: 'failed',
        candidateCount: 0,
        debugInfo: `Detection failed with error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 📊 Get detailed diagnostic information about all processes of a given name
   * Useful for debugging and troubleshooting process detection issues
   *
   * @param processName The name of the process to analyze
   * @returns Detailed diagnostic information with recommendations
   */
  public static async getDiagnosticInfo(processName: string): Promise<ProcessDiagnostics> {
    try {
      const startTime = Date.now();
      const ourPid = process.pid;

      this.log('debug', `Getting diagnostic info for ${processName}`);

      const allProcesses = await ProcessRunner.getProcessInfo(processName);
      const classification = this.classifyProcesses(ourPid, allProcesses, processName);

      const recommendations = this.generateRecommendations(classification);

      const detectionTime = Date.now() - startTime;

      return {
        timestamp: Date.now(),
        ourPid,
        processCount: allProcesses.length,
        classification,
        recommendations,
        performanceMetrics: {
          detectionTimeMs: detectionTime,
          memoryUsageKB: this.calculateTotalMemory(classification.all),
        },
      };
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'getDiagnosticInfo',
        module: 'ProcessDetector',
        showToUser: false,
        logLevel: 'warn',
      });

      // 返回错误状态的诊断信息
      return {
        timestamp: Date.now(),
        ourPid: process.pid,
        processCount: 0,
        classification: {
          directChildren: [],
          grandchildren: [],
          orphans: [],
        },
        recommendations: ['❌ 无法获取进程信息，请检查系统权限'],
        performanceMetrics: {
          detectionTimeMs: 0,
          memoryUsageKB: 0,
        },
      };
    }
  }

  /**
   * 生成基于诊断结果的智能推荐
   */
  private static generateRecommendations(classification: {
    directChildren: ProcessInfo[];
    grandchildren: ProcessInfo[];
    orphans: ProcessInfo[];
  }): string[] {
    const recommendations: string[] = [];
    const { directChildren, grandchildren, orphans } = classification;

    // 分析直接子进程
    if (directChildren.length === 0) {
      if (orphans.length > 0) {
        recommendations.push('🔄 检测到孤立进程，建议重启 VS Code 清理陈旧进程');
      } else {
        recommendations.push('ℹ️ 未发现任何相关进程，服务可能未启动');
      }
    } else if (directChildren.length > 3) {
      recommendations.push('⚠️ 检测到过多直接子进程，可能存在进程泄漏');
    } else {
      recommendations.push('✅ 进程状态正常');
    }

    // 分析内存使用
    const totalMemory = directChildren.reduce((sum, p) => sum + p.memory, 0);
    if (totalMemory > 500 * 1024) { // 500MB
      recommendations.push('🧠 高内存使用，建议监控进程性能');
    }

    // 分析进程健康状态
    if (orphans.length > directChildren.length * 2) {
      recommendations.push('🧹 孤立进程过多，建议清理系统环境');
    }

    // 分析祖父进程
    if (grandchildren.length > 0) {
      recommendations.push('🔍 检测到间接子进程，可能是正常的进程层次结构');
    }

    return recommendations.length > 0 ? recommendations : ['✅ 系统状态良好'];
  }

  /**
   * 计算总内存使用量
   */
  private static calculateTotalMemory(processes: ProcessInfo[]): number {
    return processes.reduce((total, process) => total + process.memory, 0);
  }
}
