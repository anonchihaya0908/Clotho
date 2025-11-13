import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { GlobalSearchStrategy } from '../../switch-header-source/strategies/global-search-strategy';
import { SearchContext } from '../../switch-header-source/strategies/search-strategy';
import { IFileSystemService } from '../../common/interfaces/services';

suite('GlobalSearchStrategy ranking', () => {
  const root = '/proj';
  const mkUri = (p: string) => vscode.Uri.file(path.join(root, p));

  test('prefers same directory and target extension order', () => {
    const strategy = new GlobalSearchStrategy();
    const fsMock: IFileSystemService = {
      fileExists: async () => true,
      checkMultipleFiles: async (uris) => uris,
      readFile: async () => '',
      writeFile: async () => { /* noop */ },
      writeMultipleFiles: async () => { /* noop */ },
      clearCache: () => { /* noop */ },
      getCacheStats: () => ({ fileExists: { size: 0, maxSize: 0 }, fileContent: { size: 0, maxSize: 0 } }),
      logCacheStats: () => { /* noop */ },
      invalidateFile: () => { /* noop */ },
      dispose: () => { /* noop */ },
    };

    const context: SearchContext = {
      currentFile: mkUri('src/core/MyClass.cpp'),
      baseName: 'MyClass',
      cleanedBaseName: 'MyClass',
      isHeader: false,
      targetExtensions: ['.h', '.hpp'],
      config: { sourceDirs: ['src'], headerDirs: ['include'], testDirs: [], searchPaths: [], excludePaths: [] },
      fileSystemService: fsMock,
    };
    const candidates = [
      mkUri('include/core/MyClass.hpp'),
      mkUri('include/core/MyClass.h'),
      mkUri('src/core/MyClass.h'),
    ];
    // 通过受测私有函数的形状声明访问（避免 any）
    const strategyPriv = strategy as unknown as { rankResults: (ctx: SearchContext, candidates: vscode.Uri[]) => vscode.Uri[] };
    const ranked: vscode.Uri[] = strategyPriv.rankResults(context, candidates);
    assert.ok(ranked.length > 0, 'should produce ranked results');
    const first = ranked[0]!;
    assert.strictEqual(first.fsPath.endsWith(path.join('src','core','MyClass.h')), true, 'same directory header preferred');
  });
});
