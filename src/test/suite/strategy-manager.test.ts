import * as assert from 'assert';
import * as vscode from 'vscode';
import type { SearchContext, SearchStrategy } from '../../switch-header-source/strategies/search-strategy';
import { SearchStrategyManager } from '../../switch-header-source/strategies/strategy-manager';
import { MockFileSystemService } from '../../dev-tools/mock-file-system';

suite('SearchStrategyManager', () => {
  const ctxBase: Omit<SearchContext, 'currentFile'> = {
    baseName: 'Foo',
    cleanedBaseName: 'Foo',
    isHeader: false,
    targetExtensions: ['.h'],
    config: { sourceDirs: [], headerDirs: [], testDirs: [], searchPaths: ['.'], excludePaths: [] },
    fileSystemService: new MockFileSystemService(),
  };

  const mkCtx = (path: string): SearchContext => ({
    ...ctxBase,
    currentFile: vscode.Uri.file(path),
  });

  class FakeStrategy implements SearchStrategy {
    constructor(public readonly name: string, public readonly priority: number, private files: vscode.Uri[] = [], private applicable: boolean = true) {}
    canApply(ctx: SearchContext): boolean { void ctx; return this.applicable; }
    async search(ctx: SearchContext): Promise<vscode.Uri[]> { void ctx; return this.files; }
  }

  test('Executes in priority order and returns first success', async () => {
    const m = new SearchStrategyManager();
    const sLow = new FakeStrategy('low', 10, [vscode.Uri.file('/a/b/Foo.h')]);
    const sHigh = new FakeStrategy('high', 100, []);
    m.registerStrategies([sLow, sHigh]);

    const res = await m.search(mkCtx('/a/b/Foo.cpp'));
    assert.strictEqual(res.method, 'low');
    assert.strictEqual(res.files.length, 1);
  });

  test('Skips non-applicable strategies', async () => {
    const m = new SearchStrategyManager();
    const sA = new FakeStrategy('A', 50, [], false);
    const sB = new FakeStrategy('B', 40, [vscode.Uri.file('/a/Foo.h')], true);
    m.registerStrategies([sA, sB]);

    const res = await m.search(mkCtx('/a/Foo.cpp'));
    assert.strictEqual(res.method, 'B');
  });

  test('Dispose disposes strategies implementing dispose()', () => {
    let disposed = false;
    class DisposableStrategy extends FakeStrategy { dispose() { disposed = true; } }
    const m = new SearchStrategyManager();
    m.registerStrategy(new DisposableStrategy('D', 1));
    m.dispose();
    assert.ok(disposed, 'strategy should be disposed');
  });
});
