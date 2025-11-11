/**
 * Parallel Tests Structure Search Strategy
 * 
 * Searches for partner files when working with test files.
 * Handles test file naming conventions and directory structures.
 * 
 * Examples:
 *   tests/MyClassTest.cpp  → src/MyClass.cpp
 *   tests/MyClassTest.cpp  → include/MyClass.h
 *   test/unit/MyClass_test.cpp → src/MyClass.cpp
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { SearchStrategy, SearchContext } from './search-strategy';
import { DirectoryPatternMatcher } from './directory-pattern-matcher';

export class TestsStrategy implements SearchStrategy {
  readonly name = 'parallel-tests';
  readonly priority = 80; // Medium-high priority

  private matcher = new DirectoryPatternMatcher();

  canApply(context: SearchContext): boolean {
    const filePath = context.currentFile.fsPath.toLowerCase();
    
    // Check if path contains any configured test directory
    const testDirs = context.config.testDirs.map(d => d.toLowerCase());
    
    return testDirs.some(dir => 
      filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`)
    );
  }

  async search(context: SearchContext): Promise<vscode.Uri[]> {
    const files: vscode.Uri[] = [];
    const filePath = context.currentFile.fsPath;
    const { config } = context;
    
    // Match test directory pattern
    const testPattern = this.matcher.match(
      filePath,
      config.testDirs,
      [...config.sourceDirs, ...config.headerDirs] // Search in both src and include
    );
    
    if (!testPattern) {
      return files;
    }
    
    // Search with both original and cleaned base names
    const baseNames = [context.baseName];
    if (context.cleanedBaseName !== context.baseName) {
      baseNames.push(context.cleanedBaseName);
    }
    
    for (const baseName of baseNames) {
      const foundFiles = await this.searchInDirectories(
        testPattern,
        baseName,
        context.targetExtensions,
        context
      );
      files.push(...foundFiles);
      
      // If found files with cleaned name, no need to continue
      if (foundFiles.length > 0) {
        break;
      }
    }
    
    return files;
  }

  /**
   * Searches for files in the specified target directories
   */
  private async searchInDirectories(
    pattern: { rootPath: string; subPath: string; targetDirs: string[] },
    baseName: string,
    targetExtensions: string[],
    context: SearchContext
  ): Promise<vscode.Uri[]> {
    const files: vscode.Uri[] = [];
    
    for (const targetDir of pattern.targetDirs) {
      for (const ext of targetExtensions) {
        const candidatePath = path.join(
          pattern.rootPath,
          targetDir,
          pattern.subPath,
          `${baseName}${ext}`
        );
        const candidateUri = vscode.Uri.file(candidatePath);
        
        const exists = await context.fileSystemService.fileExists(candidateUri);
        if (exists) {
          files.push(candidateUri);
        }
      }
    }
    
    return files;
  }
}
