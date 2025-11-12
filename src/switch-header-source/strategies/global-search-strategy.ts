/**
 * Global Workspace Search Strategy
 * 
 * Performs a workspace-wide search for partner files.
 * This is the last resort when all other strategies fail.
 * 
 * Note: This is slower than other strategies as it searches the entire workspace.
 */

import * as vscode from 'vscode';
import { SearchStrategy, SearchContext } from './search-strategy';
import { errorHandler } from '../../common/error-handler';

export class GlobalSearchStrategy implements SearchStrategy {
  readonly name = 'global-search';
  readonly priority = 10; // Lowest priority - last resort

  canApply(_context: SearchContext): boolean {
    // Always applicable as a fallback
    return true;
  }

  async search(context: SearchContext): Promise<vscode.Uri[]> {
    const { baseName, cleanedBaseName, targetExtensions, config } = context;
    
    // Try with both original and cleaned base names
    const baseNames = [baseName];
    if (cleanedBaseName !== baseName) {
      baseNames.push(cleanedBaseName);
    }
    
    for (const name of baseNames) {
      const files = await this.searchWorkspace(name, targetExtensions, config.excludePaths || []);
      if (files.length > 0) {
        return files;
      }
    }
    
    return [];
  }

  /**
   * Searches the entire workspace for files matching the pattern
   */
  private async searchWorkspace(
    baseName: string,
    targetExtensions: string[],
    excludePaths: string[]
  ): Promise<vscode.Uri[]> {
    // Create file extension pattern: {cpp,cc,c}
    const extensionPattern = `{${targetExtensions.map(ext => ext.substring(1)).join(',')}}`;
    const searchPattern = `**/${baseName}.${extensionPattern}`;
    
    try {
      const excludeGlob = excludePaths && excludePaths.length > 0
        ? `{${excludePaths.join(',')}}`
        : undefined;
      const foundFiles = await vscode.workspace.findFiles(
        searchPattern,
        excludeGlob,
        20 // Limit results to prevent performance issues
      );
      
      return foundFiles;
    } catch (error) {
      errorHandler.handle(error, {
        module: 'GlobalSearchStrategy',
        operation: 'searchWorkspace',
        showToUser: false, // Background search, don't bother user
        logLevel: 'warn',
      });
      
      return [];
    }
  }
}
