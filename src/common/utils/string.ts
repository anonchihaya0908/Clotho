/**
 * String Utilities
 * Functions for string manipulation and formatting
 */

import { TEST_PATTERNS } from '../constants';

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
    if (match && match[1]) {
      return match[1];
    }
  }
  return baseName;
}
