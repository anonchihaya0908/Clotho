import * as assert from 'assert';
import * as path from 'path';
import { detectLanguage } from '../../common/utils/language';
import { MockFileSystemService } from '../../dev-tools/mock-file-system';

suite('Language Detection (Unified)', () => {
  const root = '/proj';
  test('.h with .c companion → C', async () => {
    const fs = new MockFileSystemService([
      { path: path.join(root, 'mylib', 'util.c') },
    ]);
    const file = path.join(root, 'mylib', 'util.h');
    const res = await detectLanguage(undefined, file, fs);
    assert.strictEqual(res.language, 'c');
    assert.strictEqual(res.uncertain, false);
  });

  test('.h with .cpp companion → C++', async () => {
    const fs = new MockFileSystemService([
      { path: path.join(root, 'core', 'Foo.cpp') },
    ]);
    const file = path.join(root, 'core', 'Foo.h');
    const res = await detectLanguage(undefined, file, fs);
    assert.strictEqual(res.language, 'cpp');
    assert.strictEqual(res.uncertain, false);
  });

  test('No filePath but languageId=cpp → C++ uncertain', async () => {
    const res = await detectLanguage('cpp', undefined, new MockFileSystemService());
    assert.strictEqual(res.language, 'cpp');
    assert.strictEqual(res.uncertain, true);
  });
});
