import * as vscode from 'vscode';
import { IFileSystemService } from '../common/interfaces/services';
import { normalizePathForCache } from '../common/utils/path';

/**
 * In-memory mock for IFileSystemService used by self-tests.
 */
export class MockFileSystemService implements IFileSystemService {
  private files = new Set<string>();
  private contents = new Map<string, string>();

  constructor(initialFiles: Array<{ path: string; content?: string }> = []) {
    initialFiles.forEach(({ path, content }) => this.addFile(path, content));
  }

  addFile(filePath: string, content: string = ''): void {
    const key = normalizePathForCache(filePath);
    this.files.add(key);
    if (content) {this.contents.set(key, content);}
  }

  // IFileSystemService implementation
  async fileExists(uri: vscode.Uri): Promise<boolean> {
    const key = normalizePathForCache(uri.fsPath);
    return this.files.has(key);
  }

  async checkMultipleFiles(uris: vscode.Uri[]): Promise<vscode.Uri[]> {
    const out: vscode.Uri[] = [];
    for (const uri of uris) {
      if (await this.fileExists(uri)) {out.push(uri);}
    }
    return out;
  }

  async readFile(uri: vscode.Uri): Promise<string> {
    const key = normalizePathForCache(uri.fsPath);
    return this.contents.get(key) ?? '';
  }

  async writeFile(uri: vscode.Uri, content: string): Promise<void> {
    const key = normalizePathForCache(uri.fsPath);
    this.files.add(key);
    this.contents.set(key, content);
  }

  async writeMultipleFiles(files: Array<{ uri: vscode.Uri; content: string }>): Promise<void> {
    for (const f of files) {
      await this.writeFile(f.uri, f.content);
    }
  }

  clearCache(): void { /* noop for mock */ }

  getCacheStats(): { fileExists: { size: number; maxSize: number; hitRate?: number }; fileContent: { size: number; maxSize: number } } {
    return {
      fileExists: { size: this.files.size, maxSize: this.files.size },
      fileContent: { size: this.contents.size, maxSize: this.contents.size }
    };
  }

  logCacheStats(): void { /* noop */ }

  invalidateFile(_uri: vscode.Uri): void { /* noop */ }

  dispose(): void { /* noop */ }
}

