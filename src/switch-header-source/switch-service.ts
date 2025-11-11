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
} from './strategies';
import { PerformanceMonitor } from './performance-monitor';

/**
 * Core service class for switch header/source functionality.
 * Refactored to use Strategy Pattern for cleaner, more maintainable code.
 */
export class SwitchService implements ISwitchService {
  // ===============================
  // Static Caches (Shared across all instances)
  // ===============================

  private static _searchResultsCache: LRUCache<string, SearchResult> | undefined;
  private static _cachesRegistered = false;

  private static get searchResultsCache(): LRUCache<string, SearchResult> {
    if (!this._searchResultsCache) {
      this._searchResultsCache = new LRUCache<string, SearchResult>(PERFORMANCE.LRU_CACHE_MAX_SIZE);
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
        this._searchResultsCache,
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
    const cachedResult = SwitchService.searchResultsCache.get(cacheKey);
    if (cachedResult) {
      const duration = Date.now() - startTime;
      this.performanceMonitor.recordSearch(
        cachedResult.method,
        duration,
        cachedResult.files.length > 0,
        true // from cache
      );
      
      this.logger.debug('Returned cached search result', {
        module: 'SwitchService',
        operation: 'findPartnerFile',
        metadata: {
          method: cachedResult.method,
          filesFound: cachedResult.files.length,
          duration: duration,
          fromCache: true,
        }
      });
      
      return cachedResult;
    }

    // Step 1: Try clangd LSP first (the "omniscient" mode)
    const clangdResult = await this.tryClangdSwitch(currentFile);
    if (clangdResult.files.length > 0) {
      const duration = Date.now() - startTime;
      SwitchService.searchResultsCache.set(cacheKey, clangdResult);
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
      SwitchService.searchResultsCache.set(cacheKey, result);
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
    const clangdExtension = vscode.extensions.getExtension(
      'llvm-vs-code-extensions.vscode-clangd',
    );
    if (!clangdExtension?.isActive) {
      return false;
    }

    const api = clangdExtension.exports;
    if (!api?.getClient) {
      return false;
    }

    const client = api.getClient();
    return client && client.state === 2; // 2 = Running state
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
    try {
      // Step 1: Check if clangd extension is available
      const clangdExtension = vscode.extensions.getExtension(
        'llvm-vs-code-extensions.vscode-clangd',
      );
      if (!clangdExtension) {
        this.logger.debug('clangd extension not found', {
          module: 'SwitchService',
          operation: 'tryClangdSwitch',
        });
        return { files: [], method: 'clangd' };
      }

      // Step 2: Ensure the extension is activated
      if (!clangdExtension.isActive) {
        try {
          await clangdExtension.activate();
          this.logger.debug('clangd extension activated', {
            module: 'SwitchService',
            operation: 'tryClangdSwitch',
          });
        } catch {
          this.logger.debug('Failed to activate clangd extension', {
            module: 'SwitchService',
            operation: 'tryClangdSwitch',
          });
          return { files: [], method: 'clangd' };
        }
      }

      // Step 3: Check if the API is available
      const api = clangdExtension.exports;
      if (!api?.getClient) {
        this.logger.debug('clangd API not available', {
          module: 'SwitchService',
          operation: 'tryClangdSwitch',
        });
        return { files: [], method: 'clangd' };
      }

      // Step 4: Get the language client
      const client = api.getClient();
      if (!client || client.state !== 2) {
        this.logger.debug('clangd client not running', {
          module: 'SwitchService',
          operation: 'tryClangdSwitch',
        });
        return { files: [], method: 'clangd' };
      }

      // Step 5: Send the switch request with timeout
      const textDocument = { uri: currentFile.toString() };
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('clangd request timeout')), PERFORMANCE.CLANGD_REQUEST_TIMEOUT),
      );

      const result = await Promise.race([
        client.sendRequest('textDocument/switchSourceHeader', textDocument),
        timeoutPromise,
      ]);

      if (result && typeof result === 'string') {
        const targetUri = vscode.Uri.parse(result);
        
        // Verify the file exists
        try {
          await vscode.workspace.fs.stat(targetUri);
          this.logger.info('clangd found partner file', {
            module: 'SwitchService',
            operation: 'tryClangdSwitch',
            targetFile: targetUri.fsPath,
          });
          return { files: [targetUri], method: 'clangd' };
        } catch {
          this.logger.debug('clangd result file does not exist', {
            module: 'SwitchService',
            operation: 'tryClangdSwitch',
          });
          return { files: [], method: 'clangd' };
        }
      }

      this.logger.debug('clangd returned no result', {
        module: 'SwitchService',
        operation: 'tryClangdSwitch',
      });
      return { files: [], method: 'clangd' };
    } catch (error) {
      this.logger.debug('clangd integration failed', {
        module: 'SwitchService',
        operation: 'tryClangdSwitch',
        error: error instanceof Error ? error.message : String(error),
      });
      return { files: [], method: 'clangd' };
    }
  }
}
