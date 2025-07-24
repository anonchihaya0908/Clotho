/**
 * Process Detector - The "Ace Detective" of Clotho Extension
 *
 * A centralized detector for finding and analyzing system processes.
 * This detector is responsible for all process detection logic, including the revolutionary
 * "parent-child DNA testing" to identify legitimate processes vs stale ones.
 */

import { ProcessRunner } from './process-runner';
import { ErrorHandler } from './error-handler';
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
 * A detector for finding and analyzing system processes.
 * The "Ace Detective" of our extension - specializes in process identification and analysis.
 */
export class ProcessDetector {
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
      console.log(
        `🕵️ ProcessDetector: Starting investigation for "${processName}" processes...`,
      );

      // Step 1: Get our "identity card" (VS Code extension host PID)
      const ourPid = process.pid;
      console.log(`📋 Our Identity Card: Extension Host PID ${ourPid}`);

      // Step 2: Gather all target processes in the system
      const allTargetProcesses =
        await ProcessRunner.getProcessInfo(processName);

      if (allTargetProcesses.length === 0) {
        console.log(`❌ No ${processName} processes found in the system`);
        return undefined;
      }

      console.log(
        `📊 Found ${allTargetProcesses.length} ${processName} process(es) in the system:`,
      );
      allTargetProcesses.forEach((p) => {
        const memMB = Math.round(p.memory / 1024);
        console.log(
          `   Process PID ${p.pid}: Parent=${p.ppid}, Memory=${memMB}MB`,
        );
      });

      // Step 3: Perform the "DNA Test" - identify our legitimate children
      const result = ProcessDetector.performDnaTest(
        ourPid,
        allTargetProcesses,
        processName,
      );

      if (result) {
        console.log(
          `✅ ProcessDetector: Successfully identified main ${processName} process!`,
        );
        console.log(
          `   🎯 Selected PID ${result.pid}: ${Math.round(result.memory / 1024)}MB (${result.relationship})`,
        );
      } else {
        console.log(
          `❌ ProcessDetector: Failed to identify main ${processName} process`,
        );
      }

      return result;
    } catch (error) {
      console.error(
        `ProcessDetector: Failed to find main process for ${processName}:`,
        error,
      );
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
   * 🧬 Performs the revolutionary "DNA Test" to identify legitimate child processes
   * This is the core algorithm that prevents "stale process lock" issues
   *
   * @param ourPid The PID of our VS Code extension host (our "identity card")
   * @param allProcesses All processes found for the target application
   * @param processName Name of the process for logging purposes
   * @returns The main legitimate process, or undefined if none found
   */
  private static performDnaTest(
    ourPid: number,
    allProcesses: Array<{ pid: number; ppid: number; memory: number }>,
    processName: string,
  ): ProcessInfo | undefined {
    console.log('🧬 Performing DNA Test (parent-child verification)...');

    // Classify processes by relationship to us
    const directChildren = allProcesses.filter((p) => p.ppid === ourPid);
    const potentialGrandchildren = allProcesses.filter(
      (p) => p.ppid !== ourPid,
    );

    console.log('🔬 DNA Analysis Results:');
    console.log(
      `   Direct children (PPID=${ourPid}): ${directChildren.length}`,
    );
    console.log(
      `   Potential grandchildren/orphans: ${potentialGrandchildren.length}`,
    );

    // Display our direct children (100% legitimate)
    if (directChildren.length > 0) {
      console.log('👶 Our direct children (100% legitimate):');
      directChildren.forEach((p) => {
        const memMB = Math.round(p.memory / 1024);
        console.log(`   ✅ PID ${p.pid}: ${memMB}MB (Direct child)`);
      });
    }

    // Display potential grandchildren (may include stale processes)
    if (potentialGrandchildren.length > 0) {
      console.log('❓ Potential grandchildren/orphans (needs verification):');
      potentialGrandchildren.forEach((p) => {
        const memMB = Math.round(p.memory / 1024);
        console.log(
          `   ⚠️ PID ${p.pid}: Parent=${p.ppid}, ${memMB}MB (Unknown relationship)`,
        );
      });
    }

    // Select the best candidate
    let candidates = [...directChildren];
    let selectedRelationship: 'direct-child' | 'grandchild' = 'direct-child';

    // If no direct children, consider grandchildren (less reliable)
    if (candidates.length === 0) {
      console.log(
        '⚠️ No direct children found, considering potential grandchildren...',
      );
      candidates = potentialGrandchildren;
      selectedRelationship = 'grandchild';
    }

    if (candidates.length === 0) {
      console.log('❌ No valid candidates after DNA test');
      return undefined;
    }

    // Among candidates, choose the one with highest memory (main server)
    candidates.sort((a, b) => b.memory - a.memory);
    const selectedProcess = candidates[0];

    const result: ProcessInfo = {
      pid: selectedProcess.pid,
      ppid: selectedProcess.ppid,
      memory: selectedProcess.memory,
      name: processName,
      relationship: selectedRelationship,
      isMainProcess: true,
    };

    const memMB = Math.round(selectedProcess.memory / 1024);
    console.log('👑 DNA TEST RESULT:');
    console.log(
      `   🎯 Selected PID ${selectedProcess.pid}: ${memMB}MB (${selectedRelationship})`,
    );
    console.log(`   📋 Relationship verified: PPID=${selectedProcess.ppid}`);

    return result;
  }

  /**
   * 🔍 Advanced process detection with multiple strategies
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
        console.log(
          `🎯 Strategy 1: Attempting API detection for ${processName}...`,
        );
        const apiPid = await apiDetector();

        if (apiPid) {
          console.log(`✅ API detection successful: PID ${apiPid}`);
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

        console.log('⚠️ API detection failed, falling back to DNA testing...');
      }

      // Strategy 2: DNA testing (process scanning)
      console.log(`🧬 Strategy 2: DNA testing for ${processName}...`);
      const allProcesses = await ProcessRunner.getProcessInfo(processName);
      candidateCount = allProcesses.length;

      const mainProcess = ProcessDetector.performDnaTest(
        process.pid,
        allProcesses,
        processName,
      );

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
      console.error(
        `ProcessDetector: Advanced detection failed for ${processName}:`,
        error,
      );
      return {
        success: false,
        method: 'failed',
        candidateCount: 0,
        debugInfo: `Detection failed with error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 📊 Get diagnostic information about all processes of a given name
   * Useful for debugging and troubleshooting process detection issues
   *
   * @param processName The name of the process to analyze
   * @returns Detailed diagnostic information
   */
  public static async getDiagnosticInfo(processName: string): Promise<{
    ourPid: number;
    processCount: number;
    processes: ProcessInfo[];
    directChildren: ProcessInfo[];
    orphans: ProcessInfo[];
    recommendations: string[];
  }> {
    const ourPid = process.pid;
    const allProcesses = await ProcessRunner.getProcessInfo(processName);

    const processInfos: ProcessInfo[] = allProcesses.map((p) => ({
      pid: p.pid,
      ppid: p.ppid,
      memory: p.memory,
      name: processName,
      relationship: p.ppid === ourPid ? 'direct-child' : 'orphan',
    }));

    const directChildren = processInfos.filter(
      (p) => p.relationship === 'direct-child',
    );
    const orphans = processInfos.filter((p) => p.relationship === 'orphan');

    const recommendations: string[] = [];

    if (directChildren.length === 0 && orphans.length > 0) {
      recommendations.push(
        'No direct children found - orphan processes may be stale from previous sessions',
      );
      recommendations.push(
        'Consider restarting VS Code to clean up stale processes',
      );
    }

    if (directChildren.length > 1) {
      recommendations.push(
        'Multiple direct children found - this is normal for clangd',
      );
      recommendations.push(
        'The process with highest memory usage will be selected as main',
      );
    }

    return {
      ourPid,
      processCount: allProcesses.length,
      processes: processInfos,
      directChildren,
      orphans,
      recommendations,
    };
  }
}
