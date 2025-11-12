/**
 * Switch Service Layer (Refactored with Strategy Pattern)
 *
 * This module provides the core switching logic without any UI dependencies.
 * It implements a hybrid clangd + heuristic approach using the Strategy Pattern.
 *
 * Architecture:
 * - SearchStrategyManager: Manages and executes search strategies
 * - PerformanceMonitor: Tracks metrics and performance
 * - Strategies: Individual search algorithms (same-dir, src/include, tests, global)
 */

import * as path from 'path';
import * as vscode from 'vscode';
import {
  HEADER_EXTENSIONS,
  PERFORMANCE,
  SOURCE_EXTENSIONS,
  TEST_PATTERNS,
} from '../common/constants';
import { createModuleLogger } from '../common/logger/unified-logger';
import { SearchResult } from '../common/types/core';
import { SimpleCache as LRUCache } from '../common/utils/security';
import {
  isHeaderFile,
  FileSystemService,
} from '../common/utils';
import { ISwitchService, IFileSystemService } from '../common/interfaces/services';
import { getCacheManager, CacheCategory } from '../common/cache';

import { SwitchConfigService } from './config-manager';
import {
  SearchStrategyManager,
  SearchContext,
  SameDirectoryStrategy,
  SrcIncludeStrategy,
  TestsStrategy,
  GlobalSearchStrategy,
  IndexingStrategy,
} from './strategies';
import { PerformanceMonitor } from './performance-monitor';
import { isClangdAvailable as helperIsClangdAvailable, trySwitchSourceHeader as helperTrySwitch } from '../common/utils/clangd-client-helper';

/**
 * Core service class for switch header/source functionality.
 * Refactored to use Strategy Pattern for cleaner, more maintainable code.
 */
export class SwitchService implements ISwitchService {
  // ===============================
  // Static Caches (Shared across all instances)
  // ===============================

  private static _searchResultsCache: LRUCache<string, { result: SearchResult; ts: number }> | undefined;
  private static _cachesRegistered = false;

  private static get searchResultsCache(): LRUCache<string, { result: SearchResult; ts: number }> {
    if (!this._searchResultsCache) {
      this._searchResultsCache = new LRUCache<string, { result: SearchResult; ts: number }>(PERFORMANCE.LRU_CACHE_MAX_SIZE);
      this.registerStaticCaches();
    }
    return this._searchResultsCache;
  }

  /**
   * Register static caches with CacheManager (called once)
   */
  private static registerStaticCaches(): void {
    if (this._cachesRegistered) {
      return;
    }

    const cacheManager = getCacheManager();

    if (this._searchResultsCache) {
      cacheManager.registerCache(
        'switch:searchResults',
        this._searchResultsCache as unknown as LRUCache<string, any>,
        CacheCategory.Search,
        'Search results cache for file switching'
      );
    }

    this._cachesRegistered = true;
  }

  // ===============================
  // Instance Properties
  // ===============================

  private readonly logger = createModuleLogger('SwitchService');
  private readonly configService: SwitchConfigService;
  private readonly fileSystemService: IFileSystemService;
  private readonly strategyManager: SearchStrategyManager;
  private readonly performanceMonitor: PerformanceMonitor;
  private cacheTTLms: number;

  constructor(
    configService?: SwitchConfigService,
    fileSystemService?: IFileSystemService,
  ) {
    // Allow dependency injection for testing
    this.configService = configService ?? new SwitchConfigService();
    this.fileSystemService = fileSystemService ?? FileSystemService.getInstance();

    // Initialize strategy manager
    this.strategyManager = new SearchStrategyManager();
    this.registerStrategies();

    // Initialize performance monitor
    this.performanceMonitor = new PerformanceMonitor();
    // Read cache TTL from settings
    this.cacheTTLms = vscode.workspace.getConfiguration('clotho').get<number>('switch.cacheTTLms', 60000);
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('clotho.switch.cacheTTLms')) {
        this.cacheTTLms = vscode.workspace.getConfiguration('clotho').get<number>('switch.cacheTTLms', 60000);
        this.logger.info('Updated switch cache TTL', { module: 'SwitchService', operation: 'configChange', ttl: this.cacheTTLms });
      }
    });
    // Invalidate search cache on any file change
    try {
      const fsAny = this.fileSystemService as unknown as { onDidAnyChange?: vscode.Event<vscode.Uri> };
      fsAny.onDidAnyChange?.(() => {
        if (SwitchService._searchResultsCache) {
          SwitchService._searchResultsCache.clear();
        }
      });
    } catch { /* noop */ }

    this.logger.info('SwitchService initialized with Strategy Pattern', {
      module: 'SwitchService',
      operation: 'constructor',
    });
  }

  /**
   * Registers all search strategies in priority order
   */
  private registerStrategies(): void {
    this.strategyManager.registerStrategies([
      new SameDirectoryStrategy(),
      new SrcIncludeStrategy(),
      new TestsStrategy(),
      new IndexingStrategy(),
      new GlobalSearchStrategy(),
    ]);

    this.logger.debug('Registered all search strategies', {
      module: 'SwitchService',
      operation: 'registerStrategies',
      count: this.strategyManager.getStrategies().length,
    });
  }

  // ===============================
  // Cache Management
  // ===============================

  /**
   * Generates search cache key
   */
  private generateSearchCacheKey(currentFile: vscode.Uri, baseName: string, isHeader: boolean): string {
    return `${currentFile.fsPath}:${baseName}:${isHeader}`;
  }

  /**
   * Clears all caches - used for manual refresh
   */
  public clearCache(): void {
    if (SwitchService._searchResultsCache) {
      SwitchService._searchResultsCache.clear();
    }
    this.fileSystemService.clearCache();

    this.logger.info('All caches cleared', {
      module: 'SwitchService',
      operation: 'clearCache',
    });
  }

  // ===============================
  // Main API Methods
  // ===============================

  /**
   * Finds partner files for the given file.
   * Uses caching and strategy pattern for optimal performance.
   *
   * @param currentFile Current file URI
   * @returns SearchResult with found files and method used, or null if not found
   */
  public async findPartnerFile(
    currentFile: vscode.Uri,
  ): Promise<SearchResult | null> {
    const startTime = Date.now();
    const currentPath = currentFile.fsPath;
    const baseName = path.basename(currentPath, path.extname(currentPath));
    const isHeader = isHeaderFile(currentPath);

    // Check cache first
    const cacheKey = this.generateSearchCacheKey(currentFile, baseName, isHeader);
    const cachedEntry = SwitchService.searchResultsCache.get(cacheKey);
    if (cachedEntry) {
      if (this.cacheTTLms > 0 && (Date.now() - cachedEntry.ts) > this.cacheTTLms) {
        // Expired entry
        SwitchService.searchResultsCache.delete(cacheKey);
      } else {
        const duration = Date.now() - startTime;
        this.performanceMonitor.recordSearch(
          cachedEntry.result.method,
          duration,
          cachedEntry.result.files.length > 0,
          true // from cache
        );

        this.logger.debug('Returned cached search result', {
          module: 'SwitchService',
          operation: 'findPartnerFile',
          metadata: {
            method: cachedEntry.result.method,
            filesFound: cachedEntry.result.files.length,
            duration: duration,
            fromCache: true,
          }
        });

        return cachedEntry.result;
      }
    }

    // Step 1: Try clangd LSP first (the "omniscient" mode)
    const clangdResult = await this.tryClangdSwitch(currentFile);
    if (clangdResult.files.length > 0) {
      const duration = Date.now() - startTime;
      SwitchService.searchResultsCache.set(cacheKey, { result: clangdResult, ts: Date.now() });
      this.performanceMonitor.recordSearch('clangd', duration, true, false);
      return clangdResult;
    }

    // Step 2: Use strategy manager for heuristic search
    const targetExtensions = isHeader
      ? [...SOURCE_EXTENSIONS]
      : [...HEADER_EXTENSIONS];

    const cleanedBaseName = this.cleanTestBaseName(baseName);

    const context: SearchContext = {
      currentFile,
      baseName,
      cleanedBaseName,
      isHeader,
      targetExtensions,
      config: this.configService.getConfig(),
      fileSystemService: this.fileSystemService,
    };

    const result = await this.strategyManager.search(context);
    const duration = Date.now() - startTime;

    // Record performance metrics
    this.performanceMonitor.recordSearch(
      result.method,
      duration,
      result.files.length > 0,
      false
    );

    // Cache the result
    if (result.files.length > 0) {
      SwitchService.searchResultsCache.set(cacheKey, { result, ts: Date.now() });
    }

    this.logger.info('Search completed', {
      module: 'SwitchService',
      operation: 'findPartnerFile',
      metadata: {
        method: result.method,
        filesFound: result.files.length,
        duration: duration,
      }
    });

    return result.files.length > 0 ? result : null;
  }

  /**
   * Checks if clangd extension is available and ready.
   */
  public isClangdAvailable(): boolean {
    return helperIsClangdAvailable();
  }

  /**
   * Cleans test file basename (removes test prefixes/suffixes).
   */
  public cleanTestBaseName(baseName: string): string {
    for (const pattern of TEST_PATTERNS) {
      const match = baseName.match(pattern);
      if (match) {
        return match[1] ?? '';
      }
    }
    return baseName;
  }

  /**
   * Gets performance metrics
   */
  public getPerformanceMetrics() {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Gets performance report
   */
  public getPerformanceReport(): string {
    return this.performanceMonitor.getReport();
  }

  /**
   * Logs performance report
   */
  public logPerformanceReport(): void {
    this.performanceMonitor.logReport();
  }

  /**
   * Resets performance metrics
   */
  public resetPerformanceMetrics(): void {
    this.performanceMonitor.reset();
  }

  // ===============================
  // clangd LSP Integration
  // ===============================

  /**
   * Attempts to use clangd LSP for precise file switching.
   * This is the preferred method when available.
   */
  private async tryClangdSwitch(
    currentFile: vscode.Uri,
  ): Promise<SearchResult> {
    const target = await helperTrySwitch(currentFile);
    if (target) {
      this.logger.info('clangd found partner file', {
        module: 'SwitchService',
        operation: 'tryClangdSwitch',
        targetFile: target.fsPath,
      });
      return { files: [target], method: 'clangd' };
    }
    return { files: [], method: 'clangd' };
  }
}
