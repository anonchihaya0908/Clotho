/**
 * Indexing Search Strategy
 *
 * Builds a lightweight basename → URIs index for C/C++ files to speed up fallback searches
 * in large workspaces. The index is built lazily on first use and marked dirty on file changes.
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { SearchStrategy, SearchContext } from './search-strategy';
import { createModuleLogger } from '../../common/logger/unified-logger';

export class IndexingStrategy implements SearchStrategy {
  readonly name = 'indexing';
  readonly priority = 20; // Run before global-search but after structure-based

  private logger = createModuleLogger('IndexingStrategy');
  private index: Map<string, vscode.Uri[]> | null = null;
  private dirty = true;
  private building: Promise<void> | null = null;
  private fsLinked = false;

  constructor() {
    // Mark dirty on configuration changes that affect excludes (best-effort)
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('clotho')) { this.dirty = true; }
    });
  }

  canApply(_context: SearchContext): boolean {
    return true;
  }

  async search(context: SearchContext): Promise<vscode.Uri[]> {
    this.attachFsDirtyLink(context);
    await this.ensureIndexBuilt(context);
    if (!this.index) { return []; }

    const names = new Set([context.baseName]);
    if (context.cleanedBaseName !== context.baseName) names.add(context.cleanedBaseName);

    const out: vscode.Uri[] = [];
    for (const name of names) {
      const candidates = this.index.get(name) || [];
      for (const c of candidates) {
        if (context.targetExtensions.includes(path.extname(c.fsPath))) {
          out.push(c);
        }
      }
    }

    return out;
  }

  private async ensureIndexBuilt(context: SearchContext): Promise<void> {
    if (this.index && !this.dirty) { return; }
    if (this.building) { return this.building; }

    this.building = (async () => {
      try {
        const ex = (context.config.excludePaths || []);
        const exclude = ex.length > 0 ? `{${ex.join(',')}}` : undefined;
        const pattern = '**/*.{c,cc,cpp,cxx,h,hh,hpp,hxx}';
        const files = await vscode.workspace.findFiles(pattern, exclude, 20000);
        const map = new Map<string, vscode.Uri[]>();
        for (const uri of files) {
          const base = path.basename(uri.fsPath, path.extname(uri.fsPath));
          const arr = map.get(base) || [];
          arr.push(uri);
          map.set(base, arr);
        }
        this.index = map;
        this.dirty = false;
        this.logger.info('Index built', { module: 'IndexingStrategy', operation: 'build', count: files.length });
      } catch (error) {
        this.logger.warn('Index build failed', { module: 'IndexingStrategy', operation: 'build', error: error instanceof Error ? error.message : String(error) });
        this.index = new Map();
        this.dirty = false;
      } finally {
        this.building = null;
      }
    })();

    return this.building;
  }

  /** Link to FS change events (if available) to mark index dirty */
  private attachFsDirtyLink(context: SearchContext): void {
    if (this.fsLinked) return;
    const fsAny = context.fileSystemService as unknown as { onDidAnyChange?: vscode.Event<vscode.Uri> };
    fsAny.onDidAnyChange?.(() => { this.dirty = true; });
    this.fsLinked = true;
  }
}
