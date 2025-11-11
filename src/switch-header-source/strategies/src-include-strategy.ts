/**
 * Src/Include Structure Search Strategy
 * 
 * Searches for partner files in src/include directory structures.
 * This is common in projects that separate headers and sources.
 * 
 * Examples:
 *   include/MyClass.h     → src/MyClass.cpp
 *   api/public/MyClass.h  → implementation/MyClass.cpp
 *   src/core/MyClass.cpp  → include/core/MyClass.h
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { SearchStrategy, SearchContext } from './search-strategy';
import { DirectoryPatternMatcher } from './directory-pattern-matcher';

export class SrcIncludeStrategy implements SearchStrategy {
  readonly name = 'src-include';
  readonly priority = 90; // High priority - very common structure

  private matcher = new DirectoryPatternMatcher();

  canApply(context: SearchContext): boolean {
    const filePath = context.currentFile.fsPath.toLowerCase();
    
    // Check if path contains any configured source or header directory
    const sourceDirs = context.config.sourceDirs.map(d => d.toLowerCase());
    const headerDirs = context.config.headerDirs.map(d => d.toLowerCase());
    
    const allDirs = [...sourceDirs, ...headerDirs];
    
    return allDirs.some(dir => 
      filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`)
    );
  }

  async search(context: SearchContext): Promise<vscode.Uri[]> {
    const files: vscode.Uri[] = [];
    const filePath = context.currentFile.fsPath;
    const { config } = context;
    
    // If current file is in a source directory, search in header directories
    const fromSource = this.matcher.match(
      filePath,
      config.sourceDirs,
      config.headerDirs
    );
    
    if (fromSource) {
      const foundFiles = await this.searchInDirectories(
        fromSource,
        context.baseName,
        context.targetExtensions,
        context
      );
      files.push(...foundFiles);
    }
    
    // If current file is in a header directory, search in source directories
    const fromHeader = this.matcher.match(
      filePath,
      config.headerDirs,
      config.sourceDirs
    );
    
    if (fromHeader) {
      const foundFiles = await this.searchInDirectories(
        fromHeader,
        context.baseName,
        context.targetExtensions,
        context
      );
      files.push(...foundFiles);
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
