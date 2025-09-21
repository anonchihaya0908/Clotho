/**
 * Language Detection Utilities
 * Functions for detecting C/C++ language from various sources
 */

import * as path from 'path';
import { Language } from '../types';

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
