/**
 * Clangd Monitor Types
 * Shared interfaces and types for the clangd monitoring functionality
 */

import * as vscode from 'vscode';

/**
 * Basic monitor interface that all monitors should implement
 */
export interface IMonitor extends vscode.Disposable {
  /**
   * Start the monitoring process
   */
  start(): Promise<void>;

  /**
   * Stop the monitoring process
   */
  stop(): void;

  /**
   * Get the current status of the monitor
   */
  isRunning(): boolean;

  /**
   * Get a human-readable name for this monitor
   */
  getName(): string;

  /**
   * Reset the monitor state (optional)
   * Used when processes need to be re-detected or state cleared
   */
  reset?(): Promise<void>;
}

/**
 * Memory usage statistics for a process
 */
export interface MemoryUsage {
  /** Memory usage in bytes */
  memory: number;
  /** Process ID */
  pid: number;
  /** Timestamp when the data was collected */
  timestamp: Date;
}

/**
 * CPU usage statistics for a process
 */
export interface CpuUsage {
  /** CPU usage percentage (0-100) */
  cpu: number;
  /** Process ID */
  pid: number;
  /** Timestamp when the data was collected */
  timestamp: Date;
}

/**
 * Clangd server status information
 */
export interface ClangdStatus {
  /** Whether clangd is currently running */
  isRunning: boolean;
  /** Process ID if running */
  pid?: number;
  /** Server version if available */
  version?: string;
  /** Current status message */
  statusMessage?: string;
}

/**
 * Configuration options for memory monitoring
 */
export interface MemoryMonitorConfig {
  /** Update interval in milliseconds (default: 3000) */
  updateInterval?: number;
  /** Memory threshold in MB for warnings (default: 1000) */
  warningThreshold?: number;
  /** Memory threshold in MB for errors (default: 2000) */
  errorThreshold?: number;
}

/**
 * Configuration options for CPU monitoring
 */
export interface CpuMonitorConfig {
  /** Update interval in milliseconds (default: 3000) */
  updateInterval?: number;
  /** CPU threshold percentage for warnings (default: 50) */
  warningThreshold?: number;
  /** CPU threshold percentage for errors (default: 80) */
  errorThreshold?: number;
  /** Whether to normalize CPU usage by core count for display (default: true) */
  normalizeCpu?: boolean;
  /** Whether to show raw CPU values in tooltip (default: true) */
  showRawCpuInTooltip?: boolean;
}

/**
 * Events emitted by monitors
 */
export interface MonitorEvents {
  'memory-updated': MemoryUsage;
  'cpu-updated': CpuUsage;
  'status-changed': ClangdStatus;
  error: Error;
  warning: string;
}

/**
 * Monitor configuration interface
 */
export interface MonitorConfig {
  memory?: MemoryMonitorConfig;
  cpu?: CpuMonitorConfig;
  // Future monitor configs can be added here
}

/**
 * Event emitter type for type-safe event handling
 */
export type MonitorEventEmitter = vscode.EventEmitter<
  MonitorEvents[keyof MonitorEvents]
>;
