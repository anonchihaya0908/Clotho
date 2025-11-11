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

/**
 * Unified File System Service implementation
 * Singleton pattern for consistent cache management
 */
export class FileSystemService implements IFileSystemService {
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

    this.logger.info('FileSystemService initialized', {
      module: 'FileSystemService',
      operation: 'constructor',
      cacheSize: PERFORMANCE.LRU_CACHE_MAX_SIZE,
    });
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
   */
  public static resetInstance(): void {
    if (FileSystemService.instance) {
      FileSystemService.instance.clearCache();
      FileSystemService.instance = null;
    }
  }

  /**
   * Check if a file exists (with caching)
   */
  public async fileExists(uri: vscode.Uri): Promise<boolean> {
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
    this.fileExistsCache.clear();
    this.fileContentCache.clear();
    this.fileExistsCacheHits = 0;
    this.fileExistsCacheMisses = 0;

    this.logger.info('Cleared all file system caches', {
      module: 'FileSystemService',
      operation: 'clearCache',
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
   * Ensures consistent cache keys across different path formats
   */
  private normalizePathForCache(filePath: string): string {
    // Convert to lowercase for case-insensitive file systems (Windows)
    // Replace backslashes with forward slashes for consistency
    return filePath.toLowerCase().replace(/\\/g, '/');
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
