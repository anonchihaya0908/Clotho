/**
 * Performance Monitor
 * 
 * Tracks and reports performance metrics for the switch service.
 * Provides insights into strategy effectiveness and search performance.
 */

import { SearchMethod } from '../common/types/core';
import { createModuleLogger } from '../common/logger/unified-logger';

/**
 * Performance metrics for the switch service
 */
export interface PerformanceMetrics {
  /** Total number of searches performed */
  totalSearches: number;
  
  /** Number of successful searches */
  successfulSearches: number;
  
  /** Number of clangd successes */
  clangdSuccesses: number;
  
  /** Number of clangd failures */
  clangdFailures: number;
  
  /** Success count per strategy */
  strategySuccesses: Map<SearchMethod, number>;
  
  /** Total search time per strategy (ms) */
  strategyTotalTime: Map<SearchMethod, number>;
  
  /** Average search time across all searches (ms) */
  averageSearchTime: number;
  
  /** Cache hit rate (0-1) */
  cacheHitRate: number;
  
  /** Number of cache hits */
  cacheHits: number;
  
  /** Number of cache misses */
  cacheMisses: number;
}

/**
 * Monitors and tracks performance metrics
 */
export class PerformanceMonitor {
  private logger = createModuleLogger('PerformanceMonitor');
  
  private metrics: PerformanceMetrics = {
    totalSearches: 0,
    successfulSearches: 0,
    clangdSuccesses: 0,
    clangdFailures: 0,
    strategySuccesses: new Map(),
    strategyTotalTime: new Map(),
    averageSearchTime: 0,
    cacheHitRate: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  /**
   * Records a search operation
   * 
   * @param method Search method used
   * @param duration Search duration in milliseconds
   * @param success Whether files were found
   * @param fromCache Whether result came from cache
   */
  recordSearch(
    method: SearchMethod,
    duration: number,
    success: boolean,
    fromCache: boolean = false
  ): void {
    this.metrics.totalSearches++;
    
    // Update cache statistics
    if (fromCache) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
    
    // Update cache hit rate
    const totalCacheAttempts = this.metrics.cacheHits + this.metrics.cacheMisses;
    this.metrics.cacheHitRate = totalCacheAttempts > 0 
      ? this.metrics.cacheHits / totalCacheAttempts 
      : 0;
    
    // Don't count cached results in strategy statistics
    if (!fromCache) {
      // Update clangd statistics
      if (method === 'clangd') {
        if (success) {
          this.metrics.clangdSuccesses++;
        } else {
          this.metrics.clangdFailures++;
        }
      }
      
      // Update strategy-specific statistics
      if (success) {
        this.metrics.successfulSearches++;
        
        const currentCount = this.metrics.strategySuccesses.get(method) || 0;
        this.metrics.strategySuccesses.set(method, currentCount + 1);
      }
      
      // Update timing statistics
      const currentTime = this.metrics.strategyTotalTime.get(method) || 0;
      this.metrics.strategyTotalTime.set(method, currentTime + duration);
      
      // Update average search time
      const totalTime = Array.from(this.metrics.strategyTotalTime.values())
        .reduce((sum, time) => sum + time, 0);
      this.metrics.averageSearchTime = totalTime / this.metrics.totalSearches;
    }
  }

  /**
   * Gets the current metrics
   */
  getMetrics(): Readonly<PerformanceMetrics> {
    return { ...this.metrics };
  }

  /**
   * Generates a human-readable performance report
   */
  getReport(): string {
    const { metrics } = this;
    
    const clangdTotal = metrics.clangdSuccesses + metrics.clangdFailures;
    const clangdSuccessRate = clangdTotal > 0
      ? ((metrics.clangdSuccesses / clangdTotal) * 100).toFixed(1)
      : 'N/A';
    
    const overallSuccessRate = metrics.totalSearches > 0
      ? ((metrics.successfulSearches / metrics.totalSearches) * 100).toFixed(1)
      : 'N/A';
    
    const lines: string[] = [
      '='.repeat(60),
      'Switch Service Performance Report',
      '='.repeat(60),
      '',
      'Overall Statistics:',
      `  Total Searches:        ${metrics.totalSearches}`,
      `  Successful Searches:   ${metrics.successfulSearches} (${overallSuccessRate}%)`,
      `  Average Search Time:   ${metrics.averageSearchTime.toFixed(0)}ms`,
      `  Cache Hit Rate:        ${(metrics.cacheHitRate * 100).toFixed(1)}% (${metrics.cacheHits}/${metrics.cacheHits + metrics.cacheMisses})`,
      '',
      'clangd LSP Statistics:',
      `  Successes:  ${metrics.clangdSuccesses}`,
      `  Failures:   ${metrics.clangdFailures}`,
      `  Success Rate: ${clangdSuccessRate}%`,
      '',
      'Strategy Statistics:',
    ];
    
    // Sort strategies by success count
    const sortedStrategies = Array.from(metrics.strategySuccesses.entries())
      .sort((a, b) => b[1] - a[1]);
    
    for (const [method, count] of sortedStrategies) {
      const totalTime = metrics.strategyTotalTime.get(method) || 0;
      const avgTime = count > 0 ? (totalTime / count).toFixed(0) : '0';
      const percentage = metrics.successfulSearches > 0
        ? ((count / metrics.successfulSearches) * 100).toFixed(1)
        : '0.0';
      
      lines.push(
        `  ${method.padEnd(20)} - ${count} successes (${percentage}%), avg ${avgTime}ms`
      );
    }
    
    lines.push('='.repeat(60));
    
    return lines.join('\n');
  }

  /**
   * Resets all metrics
   */
  reset(): void {
    this.metrics = {
      totalSearches: 0,
      successfulSearches: 0,
      clangdSuccesses: 0,
      clangdFailures: 0,
      strategySuccesses: new Map(),
      strategyTotalTime: new Map(),
      averageSearchTime: 0,
      cacheHitRate: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
    
    this.logger.info('Performance metrics reset', {
      module: 'PerformanceMonitor',
      operation: 'reset',
    });
  }

  /**
   * Logs the current performance report
   */
  logReport(): void {
    const report = this.getReport();
    this.logger.info('Performance Report:\n' + report, {
      module: 'PerformanceMonitor',
      operation: 'logReport',
    });
  }
}
