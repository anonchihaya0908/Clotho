/**
 * Utility functions for Clotho extension
 * Common helper functions used across modules
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {
  Language,
  FileType,
  ValidationResult,
  Uri,
  ConfigScope,
} from './types';
import {
  HEADER_EXTENSIONS,
  SOURCE_EXTENSIONS,
  VALIDATION_PATTERNS,
  TEST_PATTERNS,
} from './constants';

// ===============================
// File Type Detection
// ===============================

/**
 * Checks if a file is a header file based on its extension
 */
export function isHeaderFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return HEADER_EXTENSIONS.includes(ext as any);
}

/**
 * Checks if a file is a source file based on its extension
 */
export function isSourceFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SOURCE_EXTENSIONS.includes(ext as any);
}

/**
 * Checks if a file is a valid C/C++ file
 */
export function isValidCppFile(filePath: string): boolean {
  return isHeaderFile(filePath) || isSourceFile(filePath);
}

/**
 * Gets the file type (header or source) from a file path
 */
export function getFileType(filePath: string): FileType | null {
  if (isHeaderFile(filePath)) { return 'header'; }
  if (isSourceFile(filePath)) { return 'source'; }
  return null;
}

// ===============================
// String Utilities
// ===============================

/**
 * Converts a string to PascalCase
 */
export function toPascalCase(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Converts a string to snake_case
 */
export function toSnakeCase(input: string): string {
  return input
    .replace(
      /[A-Z]/g,
      (match, offset) => (offset > 0 ? '_' : '') + match.toLowerCase(),
    )
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Converts a string to UPPER_SNAKE_CASE for header guards
 */
export function toHeaderGuardCase(input: string): string {
  return toSnakeCase(input).toUpperCase();
}

/**
 * Cleans test file basename (removes test prefixes/suffixes)
 */
export function cleanTestBaseName(baseName: string): string {
  for (const pattern of TEST_PATTERNS) {
    const match = baseName.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return baseName;
}

// ===============================
// Validation Utilities
// ===============================

/**
 * Validates if a string is a valid C/C++ identifier
 */
export function validateIdentifier(identifier: string): ValidationResult {
  if (!identifier || identifier.trim().length === 0) {
    return { isValid: false, error: 'Identifier cannot be empty' };
  }

  if (!VALIDATION_PATTERNS.IDENTIFIER.test(identifier)) {
    return {
      isValid: false,
      error:
        'Identifier must start with a letter or underscore and contain only letters, numbers, and underscores',
    };
  }

  return { isValid: true };
}

/**
 * Validates if a string is a valid file extension
 */
export function validateFileExtension(extension: string): ValidationResult {
  if (!extension || extension.trim().length === 0) {
    return { isValid: false, error: 'Extension cannot be empty' };
  }

  if (!extension.startsWith('.')) {
    return { isValid: false, error: 'Extension must start with a dot' };
  }

  if (!VALIDATION_PATTERNS.FILE_EXTENSION.test(extension)) {
    return {
      isValid: false,
      error: 'Extension must contain only letters after the dot',
    };
  }

  return { isValid: true };
}

// ===============================
// Path Utilities
// ===============================

/**
 * Normalizes a path for consistent cross-platform handling
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, '/');
}

/**
 * Gets the relative path from workspace root
 */
export function getRelativePath(uri: Uri): string {
  return vscode.workspace.asRelativePath(uri);
}

/**
 * Gets the workspace folder for a given URI
 */
export function getWorkspaceFolder(
  uri: Uri,
): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.getWorkspaceFolder(uri);
}

/**
 * Creates a file URI from a path string
 */
export function createFileUri(filePath: string): Uri {
  return vscode.Uri.file(filePath);
}

// ===============================
// File System Utilities
// ===============================

/**
 * Checks if a file exists
 */
export async function fileExists(uri: Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates directories recursively if they don't exist
 */
export async function ensureDirectoryExists(uri: Uri): Promise<void> {
  try {
    await vscode.workspace.fs.createDirectory(uri);
  } catch (error) {
    // Directory might already exist, which is fine
  }
}

// ===============================
// Configuration Utilities
// ===============================

/**
 * Gets a configuration value with type safety
 */
export function getConfigValue<T>(
  section: string,
  key: string,
  defaultValue: T,
): T {
  return vscode.workspace.getConfiguration(section).get<T>(key, defaultValue);
}

/**
 * Sets a configuration value with proper scope handling
 */
export async function setConfigValue<T>(
  section: string,
  key: string,
  value: T,
  scope: ConfigScope,
): Promise<void> {
  const target =
    scope === 'workspace'
      ? vscode.ConfigurationTarget.Workspace
      : vscode.ConfigurationTarget.Global;

  await vscode.workspace.getConfiguration(section).update(key, value, target);
}

// ===============================
// Language Detection Utilities
// ===============================

/**
 * Detects language from file extension
 */
export function detectLanguageFromExtension(filePath: string): Language | null {
  const ext = path.extname(filePath).toLowerCase();

  // C-specific extensions
  if (ext === '.c') { return 'c'; }

  // C++-specific extensions
  if (['.cpp', '.cc', '.cxx'].includes(ext)) { return 'cpp'; }

  // Ambiguous extensions (could be either)
  if (['.h', '.hpp', '.hh', '.hxx'].includes(ext)) { return null; }

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

// ===============================
// Array Utilities
// ===============================

/**
 * Removes duplicates from an array
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * Flattens an array of arrays
 */
export function flatten<T>(arrays: T[][]): T[] {
  return arrays.reduce((acc, arr) => acc.concat(arr), []);
}

/**
 * Chunks an array into smaller arrays of specified size
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// ===============================
// Performance Utilities
// ===============================

/**
 * Creates a debounced version of a function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Creates a throttled version of a function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ===============================
// Cache Utilities
// ===============================

/**
 * Simple LRU cache implementation
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // If key exists, delete it first
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // If cache is full, remove least recently used
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Generates a random nonce for Content Security Policy.
 * @returns A 32-character random string.
 */
export function getNonce(): string {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234G';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
