/**
 * Language Detection Utilities
 * Functions for detecting C/C++ language from various sources
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { Language } from '../types';
import { IFileSystemService } from '../interfaces/services';
import { FileSystemService } from './file-system-service';

/**
 * Detects language from file extension
 */
export function detectLanguageFromExtension(filePath: string): Language | null {
  const ext = path.extname(filePath).toLowerCase();

  // C-specific extensions
  if (ext === '.c') {
    return 'c';
  }

  // C++-specific extensions
  if (['.cpp', '.cc', '.cxx'].includes(ext)) {
    return 'cpp';
  }

  // Ambiguous extensions (could be either)
  if (['.hpp', '.hh', '.hxx'].includes(ext)) {
    return 'cpp';
  }

  return null;
}

/**
 * Detects language from VS Code language ID
 */
export function detectLanguageFromLanguageId(
  languageId: string,
): Language | null {
  switch (languageId) {
    case 'c':
      return 'c';
    case 'cpp':
      return 'cpp';
    default:
      return null;
  }
}

/**
 * Unified language detection with companion-file check for .h headers.
 * Falls back to VS Code language ID and defaults to C++ when uncertain.
 */
export async function detectLanguage(
  languageId?: string,
  filePath?: string,
  fsService?: IFileSystemService,
): Promise<{ language: Language; uncertain: boolean }> {
  if (!filePath) {
    // No filepath context: fallback to languageId
    const fromId = languageId ? detectLanguageFromLanguageId(languageId) : null;
    return fromId ? { language: fromId, uncertain: true } : { language: 'cpp', uncertain: true };
  }

  const ext = path.extname(filePath).toLowerCase();

  // Definitive fast-paths
  if (ext === '.c') {
    return { language: 'c', uncertain: false };
  }
  if (['.cpp', '.cc', '.cxx', '.hh', '.hpp', '.hxx'].includes(ext)) {
    return { language: 'cpp', uncertain: false };
  }

  // Ambiguous .h → check companion files
  if (ext === '.h') {
    const result = await detectLanguageForHeaderFile(filePath, fsService);
    if (result) { return result; }
  }

  // Fallback to languageId
  const id = languageId ? detectLanguageFromLanguageId(languageId) : null;
  return { language: id === 'c' ? 'c' : 'cpp', uncertain: true };
}

async function detectLanguageForHeaderFile(
  filePath: string,
  fsService?: IFileSystemService,
): Promise<{ language: Language; uncertain: boolean } | null> {
  const baseName = path.basename(filePath, '.h');
  const dirPath = path.dirname(filePath);
  const fs = fsService ?? FileSystemService.getInstance();

  // Prefer C companion first
  const cFile = vscode.Uri.file(path.join(dirPath, `${baseName}.c`));
  if (await fs.fileExists(cFile)) {
    return { language: 'c', uncertain: false };
  }

  // Check C++ companions
  const cppExts = ['.cpp', '.cc', '.cxx'];
  const candidates = cppExts.map(ext => vscode.Uri.file(path.join(dirPath, `${baseName}${ext}`)));
  const existing = await fs.checkMultipleFiles(candidates);
  if (existing.length > 0) {
    return { language: 'cpp', uncertain: false };
  }

  return { language: 'cpp', uncertain: true };
}
