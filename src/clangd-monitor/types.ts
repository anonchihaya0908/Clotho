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
 * 🧠 Memory Monitor Configuration
 * 继承自MonitorConfig，获得统一的监控配置管理能力
 */
export interface MemoryMonitorConfig {
  /** Update interval in milliseconds (default: 3000) */
  updateInterval?: number;
  /** Memory threshold in MB for warnings (default: 1000) */
  warningThreshold?: number;
  /** Memory threshold in MB for errors (default: 2000) */
  errorThreshold?: number;
  /** 内存使用单位 */
  unit?: 'MB' | 'GB';
  /** 配置是否启用 */
  enabled?: boolean;
  /** 是否自动启动 */
  autoStart?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
}

/**
 * ⚡ CPU Monitor Configuration
 * 继承自MonitorConfig，获得统一的监控配置管理能力
 */
export interface CpuMonitorConfig {
  /** Update interval in milliseconds (default: 3000) */
  updateInterval?: number;
  /** CPU threshold percentage for warnings (default: 50) */
  warningThreshold?: number;
  /** CPU threshold percentage for errors (default: 80) */
  errorThreshold?: number;
  /** 是否按核心数标准化CPU使用率显示 (默认: true) */
  normalizeCpu?: boolean;
  /** 是否在工具提示中显示原始CPU值 (默认: true) */
  showRawCpuInTooltip?: boolean;
  /** 配置是否启用 */
  enabled?: boolean;
  /** 是否自动启动 */
  autoStart?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
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
