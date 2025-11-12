/**
 * Global Workspace Search Strategy
 *
 * Performs a workspace-wide search for partner files.
 * This is the last resort when all other strategies fail.
 *
 * Note: This is slower than other strategies as it searches the entire workspace.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { SearchStrategy, SearchContext } from './search-strategy';
import { errorHandler } from '../../common/error-handler';

export class GlobalSearchStrategy implements SearchStrategy {
  readonly name = 'global-search';
  readonly priority = 10; // Lowest priority - last resort

  canApply(_context: SearchContext): boolean {
    void _context; // avoid unused param warning
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
    const currentDir = vscode.Uri.file(path.dirname(context.currentFile.fsPath)).fsPath.replace(/\\/g, '/');
    const srcDirs = new Set((context.config.sourceDirs || []).map(s => s.toLowerCase()));
    const hdrDirs = new Set((context.config.headerDirs || []).map(s => s.toLowerCase()));
    const targetOrder = context.targetExtensions || [];
    const currentFolder = vscode.workspace.getWorkspaceFolder(context.currentFile)?.uri.fsPath.replace(/\\/g, '/');

    // Ranking weights (configurable)
    const cfg = vscode.workspace.getConfiguration('clotho');
    const sameDirBoost = cfg.get<number>('switch.ranking.sameDirBoost', 10);
    const includeSrcBoost = cfg.get<number>('switch.ranking.includeSrcBoost', 5);
    const workspaceRootBoost = cfg.get<number>('switch.ranking.workspaceRootBoost', 2);
    const extOrderBase = cfg.get<number>('switch.ranking.extOrderBase', 3);
    const depthBonusBase = cfg.get<number>('switch.ranking.depthBonusBase', 3);

    function score(candidate: vscode.Uri): number {
      const candPath = candidate.fsPath.replace(/\\/g, '/');
      const candDir = path.dirname(candPath);
      // Base similarity by common prefix length (in segments)
      const fromSeg = currentDir.split('/').filter(Boolean);
      const toSeg = candDir.split('/').filter(Boolean);
      let i = 0; while (i < fromSeg.length && i < toSeg.length && fromSeg[i] === toSeg[i]) {i++;}
      let s = i; // more shared segments → higher score
      // Same directory boost
      if (candDir === currentDir) {s += sameDirBoost;}
      // Header↔Source directory preference
      const lower = candDir.toLowerCase();
      const containsAny = (dirs: Set<string>) => Array.from(dirs).some(d => lower.includes(`/${d}/`));
      if (context.isHeader && containsAny(srcDirs)) {s += includeSrcBoost;}
      if (!context.isHeader && containsAny(hdrDirs)) {s += includeSrcBoost;}
      // Explicit include<->src mapping bonus
      const isIncludeDir = containsAny(hdrDirs);
      const isSrcDir = containsAny(srcDirs);
      if ((context.isHeader && isSrcDir) || (!context.isHeader && isIncludeDir)) {s += 3;}
      // Workspace folder priority
      if (currentFolder && candPath.startsWith(currentFolder)) {s += workspaceRootBoost;}
      // Extension preference by target order
      const ext = path.extname(candPath);
      const idx = targetOrder.indexOf(ext);
      if (idx >= 0) {s += Math.max(0, extOrderBase - idx);}
      // Shorter path (closer) slight bonus
      s += Math.max(0, depthBonusBase - Math.abs(fromSeg.length - toSeg.length));
      return s;
    }

    return files.slice().sort((a, b) => score(b) - score(a));
  }
}
