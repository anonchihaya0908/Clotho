/**
 * Process Detector - The "Ace Detective" of Clotho Extension
 *
 * A centralized detector for finding and analyzing system processes.
 * This detector is responsible for all process detection logic, including the revolutionary
 * "parent-child DNA testing" to identify legitimate processes vs stale ones.
 */

import * as process from 'node:process';
import { errorHandler } from './error-handler';
import { logger } from './logger';
import { ProcessRunner } from './process-runner';

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
  // Debug mode control - only show detailed logs in development environment
  private static readonly DEBUG = process.env.CLOTHO_DEBUG === 'true';


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
      if (this.DEBUG) {
        logger.debug(`Starting investigation for "${processName}" processes`, { module: 'ProcessDetector', operation: 'findMainProcessByName' });
      }

      // Step 1: Get our "identity card" (VS Code extension host PID)
      const ourPid = process.pid;
      if (this.DEBUG) {
        logger.debug(`Our Identity Card: Extension Host PID ${ourPid}`, { module: 'ProcessDetector', operation: 'findMainProcessByName' });
      }

      // Step 2: Gather all target processes in the system
      const allTargetProcesses = await ProcessRunner.getProcessInfo(processName);

      if (allTargetProcesses.length === 0) {
        logger.info(`No ${processName} processes found in the system`, { module: 'ProcessDetector', operation: 'findMainProcessByName' });
        return undefined;
      }

      if (this.DEBUG) {
        logger.debug(`Found ${allTargetProcesses.length} ${processName} process(es) in the system`, { module: 'ProcessDetector', operation: 'findMainProcessByName' });
      }

      if (this.DEBUG) {
        allTargetProcesses.forEach((p) => {
          const memMB = Math.round(p.memory / 1024);
          logger.debug(`Process PID ${p.pid}: Parent=${p.ppid}, Memory=${memMB}MB`, { module: 'ProcessDetector', operation: 'findMainProcessByName' });
        });
      }

      // Step 3: Perform the "DNA Test" - identify our legitimate children
      const classification = this.classifyProcesses(ourPid, allTargetProcesses, processName);
      const result = this.selectMainProcess(classification);

      if (result) {
        logger.info(`Successfully identified main ${processName} process PID ${result.pid}`, { module: 'ProcessDetector', operation: 'findMainProcessByName' });
      } else {
        logger.warn(`Failed to identify main ${processName} process`, { module: 'ProcessDetector', operation: 'findMainProcessByName' });
      }

      return result;
    } catch (error) {
      errorHandler.handle(error, {
        operation: 'findMainProcessByName',
        module: 'ProcessDetector',
        showToUser: false,
        logLevel: 'debug',
      });
      return undefined;
    }
  }

  /**
   * Generic method for classifying process relationships
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

    if (this.DEBUG) {
      logger.debug(`DNA Analysis: ${directChildren.length} direct children, ${grandchildren.length} grandchildren, ${orphans.length} orphans`, { module: 'ProcessDetector', operation: 'classifyProcesses' });
    }

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
    if (processPpid === ourPid) {return 'direct-child';}
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
      logger.warn('No direct children found, considering orphan processes...', { module: 'ProcessDetector', operation: 'selectMainProcess' });
      candidates = orphans;
      selectedRelationship = 'orphan';
    }

    if (candidates.length === 0) {
      logger.error('No valid candidates after DNA test', undefined, { module: 'ProcessDetector', operation: 'selectMainProcess' });
      return undefined;
    }

    // Among candidate processes, select the one with highest memory usage (main server)
    candidates.sort((a, b) => b.memory - a.memory);
    const selectedProcess = candidates[0];

    const result: ProcessInfo = {
      ...selectedProcess,
      relationship: selectedRelationship,
      isMainProcess: true,
    };

    if (this.DEBUG) {
      logger.debug(`Selected PID ${selectedProcess.pid}: ${Math.round(selectedProcess.memory / 1024)}MB (${selectedRelationship})`, { module: 'ProcessDetector', operation: 'selectMainProcess' });
    }

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
        if (this.DEBUG) {
          logger.debug(`Strategy 1: Attempting API detection for ${processName}`, { module: 'ProcessDetector', operation: 'getDiagnosticInfo' });
        }
        const apiPid = await apiDetector();

        if (apiPid) {
          logger.info(`API detection successful: PID ${apiPid}`, { module: 'ProcessDetector', operation: 'getDiagnosticInfo' });
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

        logger.warn('API detection failed, falling back to DNA testing', { module: 'ProcessDetector', operation: 'getDiagnosticInfo' });
      }

      // Strategy 2: DNA testing (process scanning)
      if (this.DEBUG) {
        logger.debug(`Strategy 2: DNA testing for ${processName}`, { module: 'ProcessDetector', operation: 'getDiagnosticInfo' });
      }
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
      errorHandler.handle(error, {
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

      if (this.DEBUG) {
        logger.debug(`Getting diagnostic info for ${processName}`, { module: 'ProcessDetector', operation: 'getDiagnosticInfo' });
      }

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
      errorHandler.handle(error, {
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
