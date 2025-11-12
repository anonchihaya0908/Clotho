import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { MockFileSystemService } from '../../dev-tools/mock-file-system';

suite('MockFileSystemService', () => {
  test('checkMultipleFiles returns existing only', async () => {
    const root = '/r';
    const fs = new MockFileSystemService([
      { path: path.join(root, 'a.h') },
      { path: path.join(root, 'b.cpp') },
    ]);
    const uris = [
      vscode.Uri.file(path.join(root, 'a.h')),
      vscode.Uri.file(path.join(root, 'missing.h')),
      vscode.Uri.file(path.join(root, 'b.cpp')),
    ];
    const res = await fs.checkMultipleFiles(uris);
    const files = new Set(res.map(u => u.fsPath));
    assert.ok(files.has(path.join(root, 'a.h')));
    assert.ok(files.has(path.join(root, 'b.cpp')));
    assert.ok(!files.has(path.join(root, 'missing.h')));
  });
});

