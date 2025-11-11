/**
 * Validation Utilities
 * ====================
 *
 * 统一的输入验证工具集
 *
 * 重构记录：
 * - Phase 5: 增强验证函数，添加文件名、路径验证
 */

import { ValidationResult } from '../types';
import { VALIDATION_PATTERNS } from '../constants';

/**
 * 验证 C/C++ 标识符
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
 * 验证文件扩展名
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

/**
 * 验证文件名（不含路径）
 * 检查是否包含非法字符
 */
export function validateFileName(fileName: string): ValidationResult {
  if (!fileName || fileName.trim().length === 0) {
    return { isValid: false, error: 'File name cannot be empty' };
  }

  // Windows 非法字符：< > : " / \ | ? *
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(fileName)) {
    return {
      isValid: false,
      error: 'File name contains invalid characters: < > : " / \\ | ? *',
    };
  }

  // 检查保留名称（Windows）
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  if (reservedNames.test(fileName)) {
    return {
      isValid: false,
      error: 'File name is a reserved system name',
    };
  }

  return { isValid: true };
}

/**
 * 验证路径字符串
 */
export function validatePath(filePath: string): ValidationResult {
  if (!filePath || filePath.trim().length === 0) {
    return { isValid: false, error: 'Path cannot be empty' };
  }

  // 基本的路径验证
  if (filePath.includes('\0')) {
    return { isValid: false, error: 'Path contains null character' };
  }

  return { isValid: true };
}

/**
 * 验证是否为空或空白字符串
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 验证数组是否非空
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * 安全的字符串规范化（trim + 处理 null/undefined）
 */
export function normalizeString(value: unknown, defaultValue: string = ''): string {
  if (typeof value !== 'string') {
    return defaultValue;
  }
  return value.trim() || defaultValue;
}
