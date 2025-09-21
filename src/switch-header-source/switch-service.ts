/**
 * Switch Service Layer
 *
 * This module provides the core switching logic without any UI dependencies.
 * It implements the hybrid clangd + heuristic approach for finding partner files.
 */

import * as path from 'path';
import * as vscode from 'vscode';
import {
  HEADER_EXTENSIONS,
  PERFORMANCE,
  SOURCE_EXTENSIONS,
  TEST_PATTERNS,
} from '../common/constants';
import { errorHandler } from '../common/error-handler';
import { createModuleLogger } from '../common/logger/unified-logger';
import { SearchResult } from '../common/types/core';
import {
  LRUCache,
  isHeaderFile,
} from '../common/utils';

import { SwitchConfigService } from './config-manager';

// ===============================
// Interfaces and Type Definitions
// ===============================

// SearchResult and SearchMethod are now imported from core types

/**
 * Core service class for switch header/source functionality.
 * Provides pure logic without any UI dependencies.
 * Uses instance-based pattern for consistency with other modules and better testability.
 */
export class SwitchService {
  // ===============================
  // Performance Optimization Caches (Shared across all instances)
  // ===============================

  private static readonly regexCache = new LRUCache<string, RegExp>(PERFORMANCE.LRU_CACHE_MAX_SIZE);
  private static readonly fileExistsCache = new LRUCache<string, boolean>(PERFORMANCE.LRU_CACHE_MAX_SIZE * 2);
  private static readonly searchResultsCache = new LRUCache<string, SearchResult>(PERFORMANCE.LRU_CACHE_MAX_SIZE);
  private static readonly pathNormalizeCache = new LRUCache<string, string>(PERFORMANCE.LRU_CACHE_MAX_SIZE);

  private readonly logger = createModuleLogger('SwitchService');
  private configService: SwitchConfigService;

  // Cache configuration constants
  // File cache TTL removed as it's not currently used
  // Search cache TTL removed as it's not currently used

  constructor(configService?: SwitchConfigService) {
    // Allow dependency injection for testing
    this.configService = configService ?? new SwitchConfigService();

  }

  /**
   * Gets a cached regex or creates and caches a new one.
   */
  private getCachedRegex(pattern: string): RegExp {
    const cached = SwitchService.regexCache.get(pattern);
    if (cached) {
      return cached;
    }

    const regex = new RegExp(pattern);
    SwitchService.regexCache.set(pattern, regex);
    return regex;
  }

  /**
   * 缓存文件存在性检查，避免重复的文件系统调用
   */
  private async checkFileExistsCached(uri: vscode.Uri): Promise<boolean> {
    const key = uri.fsPath;
    const cached = SwitchService.fileExistsCache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    try {
      await vscode.workspace.fs.stat(uri);
      SwitchService.fileExistsCache.set(key, true);
      return true;
    } catch {
      SwitchService.fileExistsCache.set(key, false);
      return false;
    }
  }

  /**
   * 生成搜索缓存键
   */
  private generateSearchCacheKey(currentFile: vscode.Uri, baseName: string, isHeader: boolean): string {
    return `${currentFile.fsPath}:${baseName}:${isHeader}`;
  }

  /**
   *  优化的路径规范化，使用缓存避免重复计算
   */
  private getNormalizedPath(filePath: string): string {
    const cached = SwitchService.pathNormalizeCache.get(filePath);
    if (cached !== undefined) {
      return cached;
    }

    const normalized = path.normalize(filePath).replace(/\\/g, '/');
    SwitchService.pathNormalizeCache.set(filePath, normalized);
    return normalized;
  }

  /**
   *  批量文件存在性检查，优化多文件并发检查
   */
  private async checkMultipleFilesExist(uris: vscode.Uri[]): Promise<vscode.Uri[]> {
    const promises = uris.map(async (uri) => {
      const exists = await this.checkFileExistsCached(uri);
      return exists ? uri : null;
    });

    const results = await Promise.all(promises);
    return results.filter((uri): uri is vscode.Uri => uri !== null);
  }

  /**
   *  生成候选文件路径，避免重复的路径构建
   */
  private generateCandidatePaths(directory: string, baseName: string, extensions: string[]): vscode.Uri[] {
    return extensions.map(ext => vscode.Uri.file(path.join(directory, `${baseName}${ext}`)));
  }

  /**
   * 清除所有缓存 - 用于强制刷新
   */
  public clearCache(): void {
    SwitchService.regexCache.clear();
    SwitchService.fileExistsCache.clear();
    SwitchService.searchResultsCache.clear();
    SwitchService.pathNormalizeCache.clear();
  }

  // ===============================
  // Main API Methods
  // ===============================

  /**
   * Finds partner files for the given file.
   *  性能优化：添加搜索结果缓存，避免重复搜索
   * Returns null if no files found, array of URIs if found.
   */
  public async findPartnerFile(
    currentFile: vscode.Uri,
  ): Promise<SearchResult | null> {
    const currentPath = currentFile.fsPath;
    const baseName = path.basename(currentPath, path.extname(currentPath));
    const isHeader = isHeaderFile(currentPath);

    // 检查缓存的搜索结果
    const cacheKey = this.generateSearchCacheKey(currentFile, baseName, isHeader);
    const cachedResult = SwitchService.searchResultsCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Step 1: Try clangd LSP first (the "omniscient" mode)
    const clangdResult = await this.tryClangdSwitch(currentFile);
    if (clangdResult.files.length > 0) {
      SwitchService.searchResultsCache.set(cacheKey, clangdResult);
      return clangdResult;
    }

    // Step 2: Fallback to explorer mode (heuristic search)
    const explorerResult = await this.tryExplorerMode(currentFile, baseName, isHeader);
    if (explorerResult) {
      SwitchService.searchResultsCache.set(cacheKey, explorerResult);
    }
    return explorerResult;
  }

  /**
   * Checks if clangd extension is available and ready.
   * This can be used by UI components to show status information.
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
    // Use centralized test patterns from constants
    for (const pattern of TEST_PATTERNS) {
      const match = baseName.match(pattern);
      if (match) {
        return match[1] ?? ''; // Handle potential undefined
      }
    }

    return baseName;
  }

  // ===============================
  // Search Strategy: Clangd LSP
  // ===============================

  /**
   * Step 1: Attempts to use clangd LSP for precise file switching.
   * Uses a safe approach that gracefully falls back to heuristics if clangd is unavailable.
   *
   * This implementation:
   * - Checks if clangd extension is available and activated
   * - Uses the official API instead of internal methods
   * - Has comprehensive error handling
   * - Never blocks or crashes the extension
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
        this.logger.debug('clangd extension not found, using heuristic search', {
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
          this.logger.debug('Failed to activate clangd extension, using heuristic search', {
            module: 'SwitchService',
            operation: 'tryClangdSwitch',
          });
          return { files: [], method: 'clangd' };
        }
      }

      // Step 3: Check if the API is available
      const api = clangdExtension.exports;
      if (!api?.getClient) {
        this.logger.debug('clangd API not available, using heuristic search', {
          module: 'SwitchService',
          operation: 'tryClangdSwitch',
        });
        return { files: [], method: 'clangd' };
      }

      // Step 4: Get the language client
      const client = api.getClient();
      if (!client || client.state !== 2) {
        // 2 = Running state
        this.logger.debug('clangd client not running, using heuristic search', {
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
        this.logger.debug(`clangd found partner file: ${targetUri.fsPath}`, {
          module: 'SwitchService',
          operation: 'tryClangdSwitch',
        });

        // Verify the file exists
        try {
          await vscode.workspace.fs.stat(targetUri);
          this.logger.info('Successfully used clangd for precise file switching', {
            module: 'SwitchService',
            operation: 'tryClangdSwitch',
          });
          return { files: [targetUri], method: 'clangd' };
        } catch {
          this.logger.debug('clangd result file does not exist, using heuristic search', {
            module: 'SwitchService',
            operation: 'tryClangdSwitch',
          });
          return { files: [], method: 'clangd' };
        }
      }

      this.logger.debug('clangd returned no result, using heuristic search', {
        module: 'SwitchService',
        operation: 'tryClangdSwitch',
      });
      return { files: [], method: 'clangd' };
    } catch (error) {
      this.logger.debug('clangd integration failed, using heuristic search', {
        module: 'SwitchService',
        operation: 'tryClangdSwitch',
        error,
      });
      return { files: [], method: 'clangd' };
    }
  }

  // ===============================
  // Search Strategy: Heuristics (Explorer Mode)
  // ===============================

  /**
   * Step 2: Tries multiple heuristic search strategies in order of priority.
   */
  private async tryExplorerMode(
    currentFile: vscode.Uri,
    baseName: string,
    isHeader: boolean,
  ): Promise<SearchResult> {
    const currentPath = currentFile.fsPath;
    const directory = path.dirname(currentPath);
    const targetExtensions = isHeader
      ? [...SOURCE_EXTENSIONS]
      : [...HEADER_EXTENSIONS];

    // Also try with cleaned basename for test files
    const cleanedBaseName = this.cleanTestBaseName(baseName);
    const baseNames =
      baseName === cleanedBaseName ? [baseName] : [baseName, cleanedBaseName];

    //  优化策略：并行执行搜索，返回第一个成功的结果
    for (const name of baseNames) {
      // 并行启动快速搜索策略，避免序列化延迟
      const searchPromises = [
        // Strategy 1: 同目录搜索 (最快，优先级最高)
        this.searchSameDirectoryOptimized(directory, name, targetExtensions),

        // Strategy 2: src/include结构搜索
        this.searchSrcIncludeStructureOptimized(currentPath, name, targetExtensions),

        // Strategy 3: 并行测试结构搜索
        this.searchParallelTestsStructureOptimized(currentPath, name, targetExtensions),
      ];

      // 等待任意一个搜索成功
      for (const searchPromise of searchPromises) {
        const result = await searchPromise;
        if (result.files.length > 0) {
          return result;
        }
      }
    }

    // Strategy 4: Global workspace search (the last resort)
    for (const name of baseNames) {
      const globalSearchResult = await this.searchGlobal(
        name,
        targetExtensions,
      );
      if (globalSearchResult.files.length > 0) {
        return globalSearchResult;
      }
    }

    return { files: [], method: 'global-search' };
  }

  // ===============================
  // Individual Search Strategies
  // ===============================

  /* These methods are kept for future use and intentionally unused in current implementation */

  /**
   * Strategy 1: Search in the same directory - the most common case.
   */
  // @ts-expect-error: This method is kept for future use
  private async searchSameDirectory(
    directory: string,
    baseName: string,
    targetExtensions: string[],
  ): Promise<SearchResult> {
    const files: vscode.Uri[] = [];
    for (const ext of targetExtensions) {
      const candidatePath = path.join(directory, `${baseName}${ext}`);
      const candidateUri = vscode.Uri.file(candidatePath);
      try {
        await vscode.workspace.fs.stat(candidateUri);
        files.push(candidateUri);
      } catch {
        // File does not exist, continue.
      }
    }
    return { files, method: 'same-directory' };
  }

  /**
   *  优化版本：同目录搜索，使用批量文件检查和路径生成优化
   */
  private async searchSameDirectoryOptimized(
    directory: string,
    baseName: string,
    targetExtensions: string[],
  ): Promise<SearchResult> {
    // 批量生成候选路径
    const candidateUris = this.generateCandidatePaths(directory, baseName, targetExtensions);

    // 并行检查所有文件存在性
    const existingFiles = await this.checkMultipleFilesExist(candidateUris);

    return { files: existingFiles, method: 'same-directory' };
  }

  /**
   * Strategy 2: Search in classic src/include structures.
   */
  // @ts-expect-error: This method is kept for future use
  private async searchSrcIncludeStructure(
    currentPath: string,
    baseName: string,
    targetExtensions: string[],
  ): Promise<SearchResult> {
    const files: vscode.Uri[] = [];
    const normalizedPath = path.normalize(currentPath).replace(/\\/g, '/');

    const config = this.configService.getConfig();
    const { sourceDirs, headerDirs } = config;

    const patterns: Array<{
      rootPath: string;
      subPath: string;
      targetDirs: string[];
    }> = [];

    // Check if current path contains any source directory
    const sourceDirPattern = `(${sourceDirs.join('|')})`;
    const srcRegex = this.getCachedRegex(
      `^(.+?)\\/${sourceDirPattern}\\/(.*)$`,
    );
    const srcMatch = normalizedPath.match(srcRegex);
    if (srcMatch) {
      patterns.push({
        rootPath: srcMatch[1] ?? '',
        subPath: path.dirname(srcMatch[3] ?? ''),
        targetDirs: headerDirs,
      });
    }

    // Check if current path contains any header directory
    const headerDirPattern = `(${headerDirs.join('|')})`;
    const headerRegex = this.getCachedRegex(
      `^(.+?)\\/${headerDirPattern}\\/(.*)$`,
    );
    const includeMatch = normalizedPath.match(headerRegex);
    if (includeMatch) {
      patterns.push({
        rootPath: includeMatch[1] ?? '',
        subPath: path.dirname(includeMatch[3] ?? ''),
        targetDirs: sourceDirs,
      });
    }

    // Use the extracted common search logic
    const foundFiles = await this.findFilesAcrossDirs(
      patterns,
      baseName,
      targetExtensions,
    );
    files.push(...foundFiles);

    return { files, method: 'src-include' };
  }

  /**
   *  优化版本：src/include结构搜索，使用缓存的路径规范化
   */
  private async searchSrcIncludeStructureOptimized(
    currentPath: string,
    baseName: string,
    targetExtensions: string[],
  ): Promise<SearchResult> {
    const files: vscode.Uri[] = [];
    //  使用缓存的路径规范化
    const normalizedPath = this.getNormalizedPath(currentPath);

    const config = this.configService.getConfig();
    const { sourceDirs, headerDirs } = config;

    const patterns: Array<{
      rootPath: string;
      subPath: string;
      targetDirs: string[];
    }> = [];

    // Check if current path contains any source directory
    const sourceDirPattern = `(${sourceDirs.join('|')})`;
    const srcRegex = this.getCachedRegex(
      `^(.+?)\\/${sourceDirPattern}\\/(.*)$`,
    );
    const srcMatch = normalizedPath.match(srcRegex);
    if (srcMatch) {
      patterns.push({
        rootPath: srcMatch[1] ?? '',
        subPath: path.dirname(srcMatch[3] ?? ''),
        targetDirs: headerDirs,
      });
    }

    // Check if current path contains any header directory
    const headerDirPattern = `(${headerDirs.join('|')})`;
    const headerRegex = this.getCachedRegex(
      `^(.+?)\\/${headerDirPattern}\\/(.*)$`,
    );
    const includeMatch = normalizedPath.match(headerRegex);
    if (includeMatch) {
      patterns.push({
        rootPath: includeMatch[1] ?? '',
        subPath: path.dirname(includeMatch[3] ?? ''),
        targetDirs: sourceDirs,
      });
    }

    // Use the extracted common search logic
    const foundFiles = await this.findFilesAcrossDirs(
      patterns,
      baseName,
      targetExtensions,
    );
    files.push(...foundFiles);

    return { files, method: 'src-include' };
  }

  /**
   * Strategy 3: Search in parallel src/tests structures.
   */
  // @ts-expect-error: This method is kept for future use
  private async searchParallelTestsStructure(
    currentPath: string,
    baseName: string,
    targetExtensions: string[],
  ): Promise<SearchResult> {
    const files: vscode.Uri[] = [];
    const normalizedPath = path.normalize(currentPath).replace(/\\/g, '/');

    const config = this.configService.getConfig();
    const { sourceDirs, headerDirs, testDirs } = config;

    const patterns: Array<{
      rootPath: string;
      subPath: string;
      targetDirs: string[];
    }> = [];

    // Check if current path is in a test directory
    const testDirPattern = `(${testDirs.join('|')})`;
    const testRegex = this.getCachedRegex(`^(.+?)\\/${testDirPattern}\\/(.*)$`);
    const testsMatch = normalizedPath.match(testRegex);

    if (testsMatch) {
      patterns.push({
        rootPath: testsMatch[1] ?? '',
        subPath: path.dirname(testsMatch[3] ?? ''),
        targetDirs: [...sourceDirs, ...headerDirs],
      });

      // Use the extracted common search logic
      const foundFiles = await this.findFilesAcrossDirs(
        patterns,
        baseName,
        targetExtensions,
      );
      files.push(...foundFiles);
    }

    return { files, method: 'parallel-tests' };
  }

  /**
   *  优化版本：并行测试结构搜索，使用缓存的路径规范化
   */
  private async searchParallelTestsStructureOptimized(
    currentPath: string,
    baseName: string,
    targetExtensions: string[],
  ): Promise<SearchResult> {
    const files: vscode.Uri[] = [];
    //  使用缓存的路径规范化
    const normalizedPath = this.getNormalizedPath(currentPath);

    const config = this.configService.getConfig();
    const { sourceDirs, headerDirs, testDirs } = config;

    const patterns: Array<{
      rootPath: string;
      subPath: string;
      targetDirs: string[];
    }> = [];

    // Check if current path is in a test directory
    const testDirPattern = `(${testDirs.join('|')})`;
    const testRegex = this.getCachedRegex(`^(.+?)\\/${testDirPattern}\\/(.*)$`);
    const testsMatch = normalizedPath.match(testRegex);

    if (testsMatch) {
      patterns.push({
        rootPath: testsMatch[1] ?? '',
        subPath: path.dirname(testsMatch[3] ?? ''),
        targetDirs: [...sourceDirs, ...headerDirs],
      });

      // Use the extracted common search logic
      const foundFiles = await this.findFilesAcrossDirs(
        patterns,
        baseName,
        targetExtensions,
      );
      files.push(...foundFiles);
    }

    return { files, method: 'parallel-tests' };
  }

  /**
   * Strategy 4: Global workspace search - the last resort.
   */
  private async searchGlobal(
    baseName: string,
    targetExtensions: string[],
  ): Promise<SearchResult> {
    const config = this.configService.getConfig();
    const extensionPattern = `{${targetExtensions.map((ext) => ext.substring(1)).join(',')}}`;
    const searchPattern = `**/${baseName}.${extensionPattern}`;

    try {
      const foundFiles = await vscode.workspace.findFiles(
        searchPattern,
        `{${(config.excludePaths || []).join(',')}}`, //  防止undefined
        20,
      );
      return { files: foundFiles, method: 'global-search' };
    } catch (error) {
      errorHandler.handle(error, {
        module: 'SwitchService',
        operation: 'searchGlobal',
        showToUser: false, // This is a background search, so don't bother the user
      });
      return { files: [], method: 'global-search' };
    }
  }

  // ===============================
  // Helper Methods
  // ===============================

  /**
   * Common logic for finding files across multiple directory patterns.
   *  性能优化：使用缓存的文件存在性检查，减少重复的文件系统调用
   * Reduces code duplication between different search strategies.
   */
  private async findFilesAcrossDirs(
    patterns: Array<{
      rootPath: string;
      subPath: string;
      targetDirs: string[];
    }>,
    baseName: string,
    targetExtensions: string[],
  ): Promise<vscode.Uri[]> {
    const files: vscode.Uri[] = [];

    for (const pattern of patterns) {
      for (const targetDir of pattern.targetDirs) {
        for (const ext of targetExtensions) {
          const candidatePath = path.join(
            pattern.rootPath,
            targetDir,
            pattern.subPath,
            `${baseName}${ext}`,
          );
          const candidateUri = vscode.Uri.file(candidatePath);

          //  使用缓存的文件存在性检查
          const exists = await this.checkFileExistsCached(candidateUri);
          if (exists) {
            files.push(candidateUri);
          }
        }
      }
    }

    return files;
  }
}
