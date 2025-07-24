/**
 * Switch Service Layer
 *
 * This module provides the core switching logic without any UI dependencies.
 * It implements the hybrid clangd + heuristic approach for finding partner files.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { SwitchConfigService } from './config-manager';
import { ErrorHandler } from '../common/error-handler';
import {
  HEADER_EXTENSIONS,
  SOURCE_EXTENSIONS,
  TEST_PATTERNS,
} from '../common/constants';
import {
  LRUCache,
  isHeaderFile,
  isSourceFile,
  isValidCppFile,
} from '../common/utils';

// ===============================
// Interfaces and Type Definitions
// ===============================

/**
 * Represents the result of a file search operation.
 */
export interface SearchResult {
  files: vscode.Uri[];
  method:
  | 'clangd'
  | 'same-directory'
  | 'src-include'
  | 'parallel-tests'
  | 'global-search';
}

/**
 * Core service class for switch header/source functionality.
 * Provides pure logic without any UI dependencies.
 * Uses instance-based pattern for consistency with other modules and better testability.
 */
export class SwitchService {
  // ===============================
  // RegEx Cache for Performance Optimization
  // ===============================

  private regexCache = new LRUCache<string, RegExp>(50); // Limit cache size

  constructor() {
    // Initialize any required state here if needed
  }

  /**
   * Gets a cached regex or creates and caches a new one.
   */
  private getCachedRegex(pattern: string): RegExp {
    const cached = this.regexCache.get(pattern);
    if (cached) {
      return cached;
    }

    const regex = new RegExp(pattern);
    this.regexCache.set(pattern, regex);
    return regex;
  }

  // ===============================
  // Main API Methods
  // ===============================

  /**
   * Finds partner files for the given file.
   * Returns null if no files found, array of URIs if found.
   */
  public async findPartnerFile(
    currentFile: vscode.Uri,
  ): Promise<SearchResult | null> {
    const currentPath = currentFile.fsPath;
    const baseName = path.basename(currentPath, path.extname(currentPath));
    const isHeader = isHeaderFile(currentPath);

    // Step 1: Try clangd LSP first (the "omniscient" mode)
    const clangdResult = await this.tryClangdSwitch(currentFile);
    if (clangdResult.files.length > 0) {
      return clangdResult;
    }

    // Step 2: Fallback to explorer mode (heuristic search)
    return await this.tryExplorerMode(currentFile, baseName, isHeader);
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
        return match[1];
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
        console.debug(
          'Clotho: clangd extension not found, using heuristic search',
        );
        return { files: [], method: 'clangd' };
      }

      // Step 2: Ensure the extension is activated
      if (!clangdExtension.isActive) {
        try {
          await clangdExtension.activate();
          console.debug('Clotho: clangd extension activated');
        } catch (error) {
          console.debug(
            'Clotho: Failed to activate clangd extension, using heuristic search',
          );
          return { files: [], method: 'clangd' };
        }
      }

      // Step 3: Check if the API is available
      const api = clangdExtension.exports;
      if (!api?.getClient) {
        console.debug(
          'Clotho: clangd API not available, using heuristic search',
        );
        return { files: [], method: 'clangd' };
      }

      // Step 4: Get the language client
      const client = api.getClient();
      if (!client || client.state !== 2) {
        // 2 = Running state
        console.debug(
          'Clotho: clangd client not running, using heuristic search',
        );
        return { files: [], method: 'clangd' };
      }

      // Step 5: Send the switch request with timeout
      const textDocument = { uri: currentFile.toString() };
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('clangd request timeout')), 3000),
      );

      const result = await Promise.race([
        client.sendRequest('textDocument/switchSourceHeader', textDocument),
        timeoutPromise,
      ]);

      if (result && typeof result === 'string') {
        const targetUri = vscode.Uri.parse(result);
        console.debug(`Clotho: clangd found partner file: ${targetUri.fsPath}`);

        // Verify the file exists
        try {
          await vscode.workspace.fs.stat(targetUri);
          console.info(
            'Clotho: Successfully used clangd for precise file switching',
          );
          return { files: [targetUri], method: 'clangd' };
        } catch {
          console.debug(
            'Clotho: clangd result file does not exist, using heuristic search',
          );
          return { files: [], method: 'clangd' };
        }
      }

      console.debug(
        'Clotho: clangd returned no result, using heuristic search',
      );
      return { files: [], method: 'clangd' };
    } catch (error) {
      console.debug(
        'Clotho: clangd integration failed, using heuristic search:',
        error,
      );
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

    // Strategy 1: Search in the same directory (covers 80% of simple projects)
    for (const name of baseNames) {
      const sameDirectoryResult = await this.searchSameDirectory(
        directory,
        name,
        targetExtensions,
      );
      if (sameDirectoryResult.files.length > 0) {
        return sameDirectoryResult;
      }
    }

    // Strategy 2: Search in classic src/include structures
    for (const name of baseNames) {
      const srcIncludeResult = await this.searchSrcIncludeStructure(
        currentPath,
        name,
        targetExtensions,
      );
      if (srcIncludeResult.files.length > 0) {
        return srcIncludeResult;
      }
    }

    // Strategy 3: Search in parallel src/tests structures
    for (const name of baseNames) {
      const parallelTestsResult = await this.searchParallelTestsStructure(
        currentPath,
        name,
        targetExtensions,
      );
      if (parallelTestsResult.files.length > 0) {
        return parallelTestsResult;
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

  /**
   * Strategy 1: Search in the same directory - the most common case.
   */
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
   * Strategy 2: Search in classic src/include structures.
   */
  private async searchSrcIncludeStructure(
    currentPath: string,
    baseName: string,
    targetExtensions: string[],
  ): Promise<SearchResult> {
    const files: vscode.Uri[] = [];
    const normalizedPath = path.normalize(currentPath).replace(/\\/g, '/');

    const config = SwitchConfigService.getConfig();
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
        rootPath: srcMatch[1],
        subPath: path.dirname(srcMatch[3]),
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
        rootPath: includeMatch[1],
        subPath: path.dirname(includeMatch[3]),
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
  private async searchParallelTestsStructure(
    currentPath: string,
    baseName: string,
    targetExtensions: string[],
  ): Promise<SearchResult> {
    const files: vscode.Uri[] = [];
    const normalizedPath = path.normalize(currentPath).replace(/\\/g, '/');

    const config = SwitchConfigService.getConfig();
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
        rootPath: testsMatch[1],
        subPath: path.dirname(testsMatch[3]),
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
    const config = SwitchConfigService.getConfig();
    const extensionPattern = `{${targetExtensions.map((ext) => ext.substring(1)).join(',')}}`;
    const searchPattern = `**/${baseName}.${extensionPattern}`;

    try {
      const foundFiles = await vscode.workspace.findFiles(
        searchPattern,
        `{${config.excludePatterns.join(',')}}`,
        20,
      );
      return { files: foundFiles, method: 'global-search' };
    } catch (error) {
      console.error('Clotho: Global file search failed:', error);
      return { files: [], method: 'global-search' };
    }
  }

  // ===============================
  // Helper Methods
  // ===============================

  /**
   * Common logic for finding files across multiple directory patterns.
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
          try {
            await vscode.workspace.fs.stat(candidateUri);
            files.push(candidateUri);
          } catch {
            // File does not exist, continue
          }
        }
      }
    }

    return files;
  }
}
