//
// TEMPLATES AND CONSTANTS
// =======================
//
// This module contains all the hardcoded data for file pair creation:
// - Template rules for different file types
// - File content templates with placeholders
// - Default placeholder names
// - Validation patterns
//

import { PairingRule, Language, HeaderGuardStyle } from '../common/types';

// Types for better type safety
export type TemplateKey =
  | 'CPP_CLASS'
  | 'CPP_STRUCT'
  | 'C_STRUCT'
  | 'C_EMPTY'
  | 'CPP_EMPTY';

// Template rules for available file pair types
export const TEMPLATE_RULES: PairingRule[] = [
  {
    key: 'cpp_empty',
    label: '$(new-file) C++ Pair',
    description: 'Creates a basic Header/Source file pair with header guards.',
    language: 'cpp' as const,
    headerExt: '.h',
    sourceExt: '.cpp',
  },
  {
    key: 'cpp_class',
    label: '$(symbol-class) C++ Class',
    description:
      'Creates a Header/Source file pair with a boilerplate class definition.',
    language: 'cpp' as const,
    headerExt: '.h',
    sourceExt: '.cpp',
    isClass: true,
  },
  {
    key: 'cpp_struct',
    label: '$(symbol-struct) C++ Struct',
    description:
      'Creates a Header/Source file pair with a boilerplate struct definition.',
    language: 'cpp' as const,
    headerExt: '.h',
    sourceExt: '.cpp',
    isStruct: true,
  },
  {
    key: 'c_empty',
    label: '$(file-code) C Pair',
    description: 'Creates a basic .h/.c file pair for function declarations.',
    language: 'c' as const,
    headerExt: '.h',
    sourceExt: '.c',
  },
  {
    key: 'c_struct',
    label: '$(symbol-struct) C Struct',
    description: 'Creates a .h/.c file pair with a boilerplate typedef struct.',
    language: 'c' as const,
    headerExt: '.h',
    sourceExt: '.c',
    isStruct: true,
  },
];

// File templates with dynamic header guard support
export const FILE_TEMPLATES = {
  CPP_CLASS: {
    header: `{{headerGuardOpen}}

class {{fileName}} {
public:
  {{fileName}}();
  ~{{fileName}}();

private:
  // Add private members here
};

{{headerGuardClose}}
`,
    source: `{{includeLine}}

{{fileName}}::{{fileName}}() {
  // Constructor implementation
}

{{fileName}}::~{{fileName}}() {
  // Destructor implementation
}
`,
  },
  CPP_STRUCT: {
    header: `{{headerGuardOpen}}

struct {{fileName}} {
  // Struct members
};

{{headerGuardClose}}
`,
    source: '{{includeLine}}',
  },
  C_STRUCT: {
    header: `{{headerGuardOpen}}

typedef struct {
  // Struct members
} {{fileName}};

{{headerGuardClose}}
`,
    source: '{{includeLine}}',
  },
  C_EMPTY: {
    header: `{{headerGuardOpen}}

// Declarations for {{fileName}}.c

{{headerGuardClose}}
`,
    source: `{{includeLine}}

// Implementations for {{fileName}}.c
`,
  },
  CPP_EMPTY: {
    header: `{{headerGuardOpen}}

// Declarations for {{fileName}}.cpp

{{headerGuardClose}}
`,
    source: '{{includeLine}}',
  },
};

// ===============================
// Header Guard Generation Utilities
// ===============================

/**
 * Generates header guard opening based on style
 */
export function generateHeaderGuardOpen(
  fileName: string,
  headerExt: string,
  style: HeaderGuardStyle = 'ifndef_define'
): string {
  switch (style) {
    case 'pragma_once':
      return '#pragma once';
    case 'ifndef_define':
    default:
      const headerGuard = generateHeaderGuardMacro(fileName, headerExt);
      return `#ifndef ${headerGuard}\n#define ${headerGuard}`;
  }
}

/**
 * Generates header guard closing based on style
 */
export function generateHeaderGuardClose(
  fileName: string,
  headerExt: string,
  style: HeaderGuardStyle = 'ifndef_define'
): string {
  switch (style) {
    case 'pragma_once':
      return '';
    case 'ifndef_define':
    default:
      const headerGuard = generateHeaderGuardMacro(fileName, headerExt);
      return `#endif  // ${headerGuard}`;
  }
}

/**
 * Generates header guard macro name in UPPERCASE format
 */
export function generateHeaderGuardMacro(fileName: string, headerExt: string): string {
  // Convert filename to uppercase and replace non-alphanumeric with underscore
  const baseName = fileName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  // Get extension without dot and convert to uppercase
  const extName = headerExt.substring(1).toUpperCase();
  return `${baseName}_${extName}_`;
}

// Re-export Language type
export { Language };
