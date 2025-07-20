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
 * Events emitted by monitors
 */
export interface MonitorEvents {
    'memory-updated': MemoryUsage;
    'status-changed': ClangdStatus;
    'error': Error;
    'warning': string;
}

/**
 * Monitor configuration interface
 */
export interface MonitorConfig {
    memory?: MemoryMonitorConfig;
    // Future monitor configs can be added here
}

/**
 * Event emitter type for type-safe event handling
 */
export type MonitorEventEmitter = vscode.EventEmitter<MonitorEvents[keyof MonitorEvents]>;
