import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { GlobalSearchStrategy } from '../../switch-header-source/strategies/global-search-strategy';

suite('GlobalSearchStrategy ranking', () => {
  const root = '/proj';
  const mkUri = (p: string) => vscode.Uri.file(path.join(root, p));

  test('prefers same directory and target extension order', () => {
    const strategy = new GlobalSearchStrategy();
    const context: any = {
      currentFile: mkUri('src/core/MyClass.cpp'),
      baseName: 'MyClass',
      cleanedBaseName: 'MyClass',
      isHeader: false,
      targetExtensions: ['.h', '.hpp'],
      config: { sourceDirs: ['src'], headerDirs: ['include'], testDirs: [], searchPaths: [], excludePaths: [] },
    };
    const candidates = [
      mkUri('include/core/MyClass.hpp'),
      mkUri('include/core/MyClass.h'),
      mkUri('src/core/MyClass.h'),
    ];
    // Access private method via any for test purposes
    const ranked: vscode.Uri[] = (strategy as any).rankResults(context, candidates);
    assert.ok(ranked.length > 0, 'should produce ranked results');
    const first = ranked[0]!;
    assert.strictEqual(first.fsPath.endsWith(path.join('src','core','MyClass.h')), true, 'same directory header preferred');
  });
});
