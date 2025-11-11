/**
 * Same Directory Search Strategy
 * 
 * Searches for partner files in the same directory as the current file.
 * This is the fastest and most common case.
 * 
 * Example:
 *   /path/to/MyClass.h → /path/to/MyClass.cpp
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { SearchStrategy, SearchContext } from './search-strategy';

export class SameDirectoryStrategy implements SearchStrategy {
  readonly name = 'same-directory';
  readonly priority = 100; // Highest priority - fastest and most common

  canApply(_context: SearchContext): boolean {
    // Always applicable - every file has a directory
    return true;
  }

  async search(context: SearchContext): Promise<vscode.Uri[]> {
    const directory = path.dirname(context.currentFile.fsPath);
    
    // Generate candidate file paths
    const candidateUris = this.generateCandidatePaths(
      directory,
      context.baseName,
      context.targetExtensions
    );
    
    // Check all files in parallel
    const existingFiles = await context.fileSystemService.checkMultipleFiles(candidateUris);
    
    return existingFiles;
  }

  /**
   * Generates candidate file paths for all target extensions
   */
  private generateCandidatePaths(
    directory: string,
    baseName: string,
    extensions: string[]
  ): vscode.Uri[] {
    return extensions.map(ext => 
      vscode.Uri.file(path.join(directory, `${baseName}${ext}`))
    );
  }
}
