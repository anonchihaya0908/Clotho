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
        return this.rankResults(context, files);
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

  /**
   * Rank found files by proximity and directory semantics
   */
  private rankResults(context: SearchContext, files: vscode.Uri[]): vscode.Uri[] {
    const path = require('path') as typeof import('path');
    const currentDir = vscode.Uri.file(path.dirname(context.currentFile.fsPath)).fsPath.replace(/\\/g, '/');
    const srcDirs = new Set((context.config.sourceDirs || []).map(s => s.toLowerCase()));
    const hdrDirs = new Set((context.config.headerDirs || []).map(s => s.toLowerCase()));
    const targetOrder = context.targetExtensions || [];
    const currentFolder = vscode.workspace.getWorkspaceFolder(context.currentFile)?.uri.fsPath.replace(/\\/g, '/');

    function score(candidate: vscode.Uri): number {
      const candPath = candidate.fsPath.replace(/\\/g, '/');
      const candDir = path.dirname(candPath);
      // Base similarity by common prefix length (in segments)
      const fromSeg = currentDir.split('/').filter(Boolean);
      const toSeg = candDir.split('/').filter(Boolean);
      let i = 0; while (i < fromSeg.length && i < toSeg.length && fromSeg[i] === toSeg[i]) i++;
      let s = i; // more shared segments → higher score
      // Same directory boost
      if (candDir === currentDir) s += 10;
      // Header↔Source directory preference
      const lower = candDir.toLowerCase();
      const containsAny = (dirs: Set<string>) => Array.from(dirs).some(d => lower.includes(`/${d}/`));
      if (context.isHeader && containsAny(srcDirs)) s += 5;
      if (!context.isHeader && containsAny(hdrDirs)) s += 5;
      // Explicit include<->src mapping bonus
      const isIncludeDir = containsAny(hdrDirs);
      const isSrcDir = containsAny(srcDirs);
      if ((context.isHeader && isSrcDir) || (!context.isHeader && isIncludeDir)) s += 3;
      // Workspace folder priority
      if (currentFolder && candPath.startsWith(currentFolder)) s += 2;
      // Extension preference by target order
      const ext = path.extname(candPath);
      const idx = targetOrder.indexOf(ext);
      if (idx >= 0) s += Math.max(0, 3 - idx);
      // Shorter path (closer) slight bonus
      s += Math.max(0, 3 - Math.abs(fromSeg.length - toSeg.length));
      return s;
    }

    return files.slice().sort((a, b) => score(b) - score(a));
  }
}
