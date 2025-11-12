import * as path from 'path';
import * as vscode from 'vscode';
import { createModuleLogger } from '../common/logger/unified-logger';
import { HEADER_EXTENSIONS, SOURCE_EXTENSIONS } from '../common/constants';
import { DirectoryPatternMatcher } from '../switch-header-source/strategies/directory-pattern-matcher';
import { SrcIncludeStrategy } from '../switch-header-source/strategies/src-include-strategy';
import { SameDirectoryStrategy } from '../switch-header-source/strategies/same-directory-strategy';
import { MockFileSystemService } from './mock-file-system';
import { SearchContext } from '../switch-header-source/strategies/search-strategy';

const logger = createModuleLogger('SelfTests');

export async function runStrategySelfTests(): Promise<string> {
  let passed = 0; let failed = 0;
  const details: string[] = [];

  const root = '/proj';
  const fs = new MockFileSystemService([
    { path: path.join(root, 'src/util/Util.cpp') },
    { path: path.join(root, 'src/util/Util.h') },
    { path: path.join(root, 'src/core/MyClass.cpp') },
    { path: path.join(root, 'include/core/MyClass.h') },
    { path: path.join(root, 'tests/core/MyClass_test.cpp') },
  ]);

  const matcher = new DirectoryPatternMatcher();

  // Test 1: DirectoryPatternMatcher
  try {
    const pat = matcher.match(path.join(root, 'include/core/MyClass.h'), ['include'], ['src']);
    if (pat && pat.rootPath.endsWith('/proj') && pat.subPath === 'core' && pat.matchedDir === 'include' && pat.targetDirs.includes('src')) {
      passed++; details.push('T1 ok');
    } else { failed++; details.push('T1 fail'); }
  } catch (e) { failed++; details.push('T1 error: ' + (e as Error).message); }

  // Helper to build context
  const buildContext = (current: string, isHeader: boolean, baseName: string, header: boolean): SearchContext => ({
    currentFile: vscode.Uri.file(current),
    baseName,
    cleanedBaseName: baseName,
    isHeader,
    targetExtensions: header ? HEADER_EXTENSIONS.slice() as unknown as string[] : SOURCE_EXTENSIONS.slice() as unknown as string[],
    config: {
      sourceDirs: ['src'],
      headerDirs: ['include'],
      testDirs: ['tests'],
      searchPaths: ['.'],
      excludePaths: []
    },
    fileSystemService: fs,
  });

  // Test 2: SameDirectoryStrategy finds Util.h for Util.cpp
  try {
    const ctx = buildContext(path.join(root, 'src/util/Util.cpp'), false, 'Util', true);
    const files = await new SameDirectoryStrategy().search(ctx);
    if (files.find(u => u.fsPath.endsWith(path.join('src','util','Util.h')))) {
      passed++; details.push('T2 ok');
    } else { failed++; details.push('T2 fail'); }
  } catch (e) { failed++; details.push('T2 error: ' + (e as Error).message); }

  // Test 3: SrcIncludeStrategy finds include/core/MyClass.h for src/core/MyClass.cpp
  try {
    const ctx = buildContext(path.join(root, 'src/core/MyClass.cpp'), false, 'MyClass', true);
    const files = await new SrcIncludeStrategy().search(ctx);
    if (files.find(u => u.fsPath.endsWith(path.join('include','core','MyClass.h')))) {
      passed++; details.push('T3 ok');
    } else { failed++; details.push('T3 fail'); }
  } catch (e) { failed++; details.push('T3 error: ' + (e as Error).message); }

  const report = `Strategy Self-Tests: passed=${passed}, failed=${failed}\n${details.join('\n')}`;
  logger.info(report);
  return report;
}

