/**
 * Unified File System Service
 * ===========================
 *
 * Centralized file system operations with caching and batch processing.
 * Consolidates file existence checks and file operations from multiple services.
 *
 * Benefits:
 * - Reduces code duplication across PairCreatorService and SwitchService
 * - Provides consistent caching strategy
 * - Enables batch operations for better performance
 * - Centralized cache management
 */

import * as vscode from 'vscode';
import { createModuleLogger } from '../logger/unified-logger';
import { errorHandler } from '../error-handler';
import { SimpleCache as LRUCache } from './security';
import { PERFORMANCE } from '../constants';
import { IFileSystemService } from '../interfaces/services';
import { getCacheManager, CacheCategory } from '../cache';
import { normalizePathForCache } from './path';

/**
 * Unified File System Service implementation
 * Singleton pattern for consistent cache management
 */
export class FileSystemService implements IFileSystemService, vscode.Disposable {
  private static instance: FileSystemService | null = null;

  // Cache for file existence checks
  private fileExistsCache: LRUCache<string, boolean>;

  // Cache for file content (optional, smaller cache)
  private fileContentCache: LRUCache<string, string>;

  // Logger instance
  private readonly logger = createModuleLogger('FileSystemService');

  // Cache hit tracking
  private fileExistsCacheHits = 0;
  private fileExistsCacheMisses = 0;

  // File system watcher for automatic cache invalidation
  private fileWatcher: vscode.FileSystemWatcher | null = null;
  private disposables: vscode.Disposable[] = [];
  private watchInitialized = false;
  private readonly anyChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  public readonly onDidAnyChange: vscode.Event<vscode.Uri> = this.anyChangeEmitter.event;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    // Larger cache for file existence (frequently checked)
    this.fileExistsCache = new LRUCache<string, boolean>(PERFORMANCE.LRU_CACHE_MAX_SIZE * 2);

    // Smaller cache for file content (less frequently needed)
    this.fileContentCache = new LRUCache<string, string>(PERFORMANCE.LRU_CACHE_MAX_SIZE);

    // Register caches with CacheManager
    const cacheManager = getCacheManager();
    cacheManager.registerCache(
      'fs:fileExists',
      this.fileExistsCache,
      CacheCategory.FileSystem,
      'File existence check cache'
    );
    cacheManager.registerCache(
      'fs:fileContent',
      this.fileContentCache,
      CacheCategory.FileSystem,
      'File content cache'
    );

    // Defer watcher setup until first use (lazy init)

    this.logger.info('FileSystemService initialized', {
      module: 'FileSystemService',
      operation: 'constructor',
      cacheSize: PERFORMANCE.LRU_CACHE_MAX_SIZE,
    });
  }

  /**
   * Set up file system watcher for automatic cache invalidation
   * Monitors file changes and updates cache accordingly
   */
  private setupFileWatcher(): void {
    if (this.watchInitialized) { return; }
    const enable = vscode.workspace.getConfiguration('clotho').get<boolean>('fs.enableWatcher', true);
    if (!enable) { return; }
    try {
      // Watch only relevant files per workspace root to reduce overhead
      const defaultGlobs = [
        '**/*.{c,cc,cpp,cxx,h,hh,hpp,hxx}',
        '**/.clang-format',
        '**/_clang-format',
      ];
      const cfgGlobs = vscode.workspace.getConfiguration('clotho').get<string[]>('fs.watchGlobs', []);
      const globs = (cfgGlobs && cfgGlobs.length > 0) ? cfgGlobs : defaultGlobs;
      const folders = vscode.workspace.workspaceFolders || [];
      const watchers: vscode.FileSystemWatcher[] = [];
      for (const folder of folders) {
        for (const g of globs) {
          const pattern = new vscode.RelativePattern(folder, g);
          watchers.push(vscode.workspace.createFileSystemWatcher(pattern));
        }
      }
      if (watchers.length === 0) {
        // Fallback to workspace-wide patterns if no folders
        globs.forEach(g => watchers.push(vscode.workspace.createFileSystemWatcher(g)));
      }

      // Aggregate into a composite disposable
      this.fileWatcher = {
        onDidCreate: (listener: (e: vscode.Uri) => void) => {
          const subs = watchers.map((w) => w.onDidCreate(listener));
          subs.forEach((d) => this.disposables.push(d));
          return { dispose: () => subs.forEach((d) => d.dispose()) } as vscode.Disposable;
        },
        onDidChange: (listener: (e: vscode.Uri) => void) => {
          const subs = watchers.map((w) => w.onDidChange(listener));
          subs.forEach((d) => this.disposables.push(d));
          return { dispose: () => subs.forEach((d) => d.dispose()) } as vscode.Disposable;
        },
        onDidDelete: (listener: (e: vscode.Uri) => void) => {
          const subs = watchers.map((w) => w.onDidDelete(listener));
          subs.forEach((d) => this.disposables.push(d));
          return { dispose: () => subs.forEach((d) => d.dispose()) } as vscode.Disposable;
        },
        dispose: () => watchers.forEach((w) => w.dispose()),
      } as unknown as vscode.FileSystemWatcher;

      // File created: mark as existing in cache
      this.fileWatcher.onDidCreate((uri) => {
        const key = this.normalizePathForCache(uri.fsPath);
        this.fileExistsCache.set(key, true);
        this.anyChangeEmitter.fire(uri);
        this.logger.debug('File created, updating cache', {
          module: 'FileSystemService',
          operation: 'onDidCreate',
          path: uri.fsPath,
        });
      });

      // File deleted: mark as non-existing in cache
      this.fileWatcher.onDidDelete((uri) => {
        const key = this.normalizePathForCache(uri.fsPath);
        this.fileExistsCache.set(key, false);
        this.fileContentCache.delete(key);
        this.anyChangeEmitter.fire(uri);
        this.logger.debug('File deleted, invalidating cache', {
          module: 'FileSystemService',
          operation: 'onDidDelete',
          path: uri.fsPath,
        });
      });

      // File changed: invalidate content cache but keep existence
      this.fileWatcher.onDidChange((uri) => {
        const key = this.normalizePathForCache(uri.fsPath);
        this.fileContentCache.delete(key);
        this.anyChangeEmitter.fire(uri);
        this.logger.debug('File changed, invalidating content cache', {
          module: 'FileSystemService',
          operation: 'onDidChange',
          path: uri.fsPath,
        });
      });

      this.disposables.push(this.fileWatcher);
      this.watchInitialized = true;

      this.logger.info('File system watcher initialized successfully', {
        module: 'FileSystemService',
        operation: 'setupFileWatcher',
      });
    } catch (error) {
      errorHandler.handle(error, {
        module: 'FileSystemService',
        operation: 'setupFileWatcher',
        showToUser: false,
        logLevel: 'warn',
      });
    }
  }

  /** Ensure file watcher is set up (lazy) */
  private ensureWatcher(): void {
    if (!this.watchInitialized) {
      this.setupFileWatcher();
    }
  }

  /**
   * Dispose of the service and clean up resources
   * Implements vscode.Disposable interface
   */
  public dispose(): void {
    this.logger.info('Disposing FileSystemService', {
      module: 'FileSystemService',
      operation: 'dispose',
      disposableCount: this.disposables.length,
    });

    // Dispose all tracked resources
    this.disposables.forEach((disposable) => {
      try {
        disposable.dispose();
      } catch (error) {
        this.logger.warn('Error disposing resource', {
          module: 'FileSystemService',
          operation: 'dispose',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.disposables = [];
    this.fileWatcher = null;

    // Clear caches
    this.clearCache();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): FileSystemService {
    if (!FileSystemService.instance) {
      FileSystemService.instance = new FileSystemService();
    }
    return FileSystemService.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   * Properly disposes of resources before resetting
   */
  public static resetInstance(): void {
    if (FileSystemService.instance) {
      FileSystemService.instance.dispose();
      FileSystemService.instance = null;
    }
  }

  /**
   * Check if a file exists (with caching)
   */
  public async fileExists(uri: vscode.Uri): Promise<boolean> {
    this.ensureWatcher();
    const key = this.normalizePathForCache(uri.fsPath);

    // Check cache first
    const cached = this.fileExistsCache.get(key);
    if (cached !== undefined) {
      this.fileExistsCacheHits++;
      return cached;
    }

    this.fileExistsCacheMisses++;

    // Perform file system check
    try {
      await vscode.workspace.fs.stat(uri);
      this.fileExistsCache.set(key, true);
      return true;
    } catch {
      this.fileExistsCache.set(key, false);
      return false;
    }
  }

  /**
   * Check multiple files in parallel
   * Returns only the URIs of files that exist
   */
  public async checkMultipleFiles(uris: vscode.Uri[]): Promise<vscode.Uri[]> {
    this.ensureWatcher();
    if (uris.length === 0) {
      return [];
    }

    this.logger.debug(`Checking ${uris.length} files in parallel`, {
      module: 'FileSystemService',
      operation: 'checkMultipleFiles',
      count: uris.length,
    });

    // Parallel execution for better performance
    const promises = uris.map(async (uri) => {
      const exists = await this.fileExists(uri);
      return exists ? uri : null;
    });

    const results = await Promise.all(promises);
    const existingFiles = results.filter((uri): uri is vscode.Uri => uri !== null);

    this.logger.debug(`Found ${existingFiles.length} existing files`, {
      module: 'FileSystemService',
      operation: 'checkMultipleFiles',
      found: existingFiles.length,
      total: uris.length,
    });

    return existingFiles;
  }

  /**
   * Read file content
   * Note: Content caching is optional and should be used carefully
   */
  public async readFile(uri: vscode.Uri): Promise<string> {
    this.ensureWatcher();
    const key = this.normalizePathForCache(uri.fsPath);

    // Check cache (optional, can be disabled for always-fresh reads)
    const cached = this.fileContentCache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // Read from file system
    const readOperation = errorHandler.wrapAsync(
      async () => {
        const content = await vscode.workspace.fs.readFile(uri);
        const text = Buffer.from(content).toString('utf8');
        this.fileContentCache.set(key, text);
        return text;
      },
      {
        operation: 'readFile',
        module: 'FileSystemService',
        showToUser: false,
      }
    );

    const result = await readOperation();
    return result ?? '';
  }

  /**
   * Write file content
   */
  public async writeFile(uri: vscode.Uri, content: string): Promise<void> {
    this.ensureWatcher();
    const writeOperation = errorHandler.wrapAsync(
      async () => {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));

        // Invalidate caches for this file
        const key = this.normalizePathForCache(uri.fsPath);
        this.fileExistsCache.set(key, true); // Update existence cache
        this.fileContentCache.delete(key); // Invalidate content cache
      },
      {
        operation: 'writeFile',
        module: 'FileSystemService',
        showToUser: true,
      }
    );

    await writeOperation();
  }

  /**
   * Write multiple files in parallel
   */
  public async writeMultipleFiles(
    files: Array<{ uri: vscode.Uri; content: string }>
  ): Promise<void> {
    if (files.length === 0) {
      return;
    }

    this.logger.debug(`Writing ${files.length} files in parallel`, {
      module: 'FileSystemService',
      operation: 'writeMultipleFiles',
      count: files.length,
    });

    const writePromises = files.map(({ uri, content }) => this.writeFile(uri, content));

    await Promise.all(writePromises);

    this.logger.info(`Successfully wrote ${files.length} files`, {
      module: 'FileSystemService',
      operation: 'writeMultipleFiles',
      count: files.length,
    });
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    const stats = this.getCacheStats();

    this.fileExistsCache.clear();
    this.fileContentCache.clear();
    this.fileExistsCacheHits = 0;
    this.fileExistsCacheMisses = 0;

    this.logger.info('Cleared all file system caches', {
      module: 'FileSystemService',
      operation: 'clearCache',
      previousStats: {
        fileExistsSize: stats.fileExists.size,
        fileContentSize: stats.fileContent.size,
        hitRate: stats.fileExists.hitRate,
      },
    });
  }

  /**
   * Log current cache statistics
   * Useful for monitoring cache performance
   */
  public logCacheStats(): void {
    const stats = this.getCacheStats();
    const detailedStats = this.getDetailedCacheInfo();

    this.logger.info('File System Cache Statistics', {
      module: 'FileSystemService',
      operation: 'logCacheStats',
      metadata: {
        fileExists: {
          size: stats.fileExists.size,
          maxSize: stats.fileExists.maxSize,
          hitRate: `${((stats.fileExists.hitRate || 0) * 100).toFixed(2)}%`,
          hits: detailedStats.fileExists.hits,
          misses: detailedStats.fileExists.misses,
        },
        fileContent: {
          size: stats.fileContent.size,
          maxSize: stats.fileContent.maxSize,
        },
      },
    });
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    fileExists: { size: number; maxSize: number; hitRate?: number };
    fileContent: { size: number; maxSize: number };
    } {
    const totalRequests = this.fileExistsCacheHits + this.fileExistsCacheMisses;
    const hitRate = totalRequests > 0 ? this.fileExistsCacheHits / totalRequests : 0;

    const fileExistsStats = this.fileExistsCache.getStats();
    const fileContentStats = this.fileContentCache.getStats();

    return {
      fileExists: {
        size: fileExistsStats.size,
        maxSize: fileExistsStats.capacity,
        hitRate,
      },
      fileContent: {
        size: fileContentStats.size,
        maxSize: fileContentStats.capacity,
      },
    };
  }

  /**
   * Normalize file path for cache key
   * Delegates to unified path utility
   *
   * @deprecated Use normalizePathForCache from utils/path.ts directly
   */
  private normalizePathForCache(filePath: string): string {
    return normalizePathForCache(filePath);
  }

  /**
   * Invalidate cache for a specific file
   * Useful when external file changes are detected
   */
  public invalidateFile(uri: vscode.Uri): void {
    const key = this.normalizePathForCache(uri.fsPath);
    this.fileExistsCache.delete(key);
    this.fileContentCache.delete(key);
  }

  /**
   * Get detailed cache information for debugging
   */
  public getDetailedCacheInfo(): {
    fileExists: { size: number; maxSize: number; hitRate?: number; hits: number; misses: number };
    fileContent: { size: number; maxSize: number };
    } {
    const stats = this.getCacheStats();
    return {
      fileExists: {
        ...stats.fileExists,
        hits: this.fileExistsCacheHits,
        misses: this.fileExistsCacheMisses,
      },
      fileContent: stats.fileContent,
    };
  }
}

/**
 * Export singleton instance for convenience
 */
export const fileSystemService = FileSystemService.getInstance();
