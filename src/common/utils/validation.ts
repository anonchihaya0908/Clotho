/**
 * Validation Utilities
 * Functions for validating user input and data
 */

import { ValidationResult } from '../types';
import { VALIDATION_PATTERNS } from '../constants';

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
