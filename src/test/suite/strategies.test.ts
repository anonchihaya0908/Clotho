import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { DirectoryPatternMatcher } from '../../switch-header-source/strategies/directory-pattern-matcher';
import { SameDirectoryStrategy } from '../../switch-header-source/strategies/same-directory-strategy';
import { SrcIncludeStrategy } from '../../switch-header-source/strategies/src-include-strategy';
import { IndexingStrategy } from '../../switch-header-source/strategies/indexing-strategy';
import type { SearchContext } from '../../switch-header-source/strategies/search-strategy';
import { HEADER_EXTENSIONS, SOURCE_EXTENSIONS } from '../../common/constants';
import { MockFileSystemService } from '../../dev-tools/mock-file-system';

suite('Switch Strategies', () => {
  const root = '/proj';
  const mockFs = new MockFileSystemService([
    { path: path.join(root, 'src/util/Util.cpp') },
    { path: path.join(root, 'src/util/Util.h') },
    { path: path.join(root, 'src/core/MyClass.cpp') },
    { path: path.join(root, 'include/core/MyClass.h') },
    { path: path.join(root, 'tests/core/MyClass_test.cpp') },
  ]);

  const buildContext = (current: string, isHeader: boolean, baseName: string, header: boolean): SearchContext => ({
    currentFile: vscode.Uri.file(current),
    baseName,
    cleanedBaseName: baseName,
    isHeader,
    targetExtensions: header ? (HEADER_EXTENSIONS as unknown as string[]) : (SOURCE_EXTENSIONS as unknown as string[]),
    config: {
      sourceDirs: ['src'],
      headerDirs: ['include'],
      testDirs: ['tests'],
      searchPaths: ['.'],
      excludePaths: []
    },
    fileSystemService: mockFs,
  });

  test('DirectoryPatternMatcher match include→src', () => {
    const m = new DirectoryPatternMatcher();
    const p = m.match(path.join(root, 'include/core/MyClass.h'), ['include'], ['src']);
    assert.ok(p, 'should match include path');
    assert.strictEqual(p?.subPath, 'core');
    assert.strictEqual(p?.matchedDir, 'include');
  });

  test('SameDirectoryStrategy finds Util.h', async () => {
    const ctx = buildContext(path.join(root, 'src/util/Util.cpp'), false, 'Util', true);
    const res = await new SameDirectoryStrategy().search(ctx);
    assert.ok(res.find(u => u.fsPath.endsWith(path.join('src','util','Util.h'))));
  });

  test('SrcIncludeStrategy finds include/core/MyClass.h', async () => {
    const ctx = buildContext(path.join(root, 'src/core/MyClass.cpp'), false, 'MyClass', true);
    const res = await new SrcIncludeStrategy().search(ctx);
    assert.ok(res.find(u => u.fsPath.endsWith(path.join('include','core','MyClass.h'))));
  });

  test('IndexingStrategy returns candidates by basename', async () => {
    const ctx = buildContext(path.join(root, 'src/core/MyClass.cpp'), false, 'MyClass', true);
    const res = await new IndexingStrategy().search(ctx);
    assert.ok(res.length >= 1);
  });
});

