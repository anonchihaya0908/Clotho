/**
 * Application constants for Clotho extension
 * Centralizes all magic numbers, strings, and configuration defaults
 */

// Constants
import { SwitchConfig } from '../switch-header-source/types';
import { TemplateContext } from './types';

// Re-export types for convenience
export type { SwitchConfig, TemplateContext };

// ===============================
// Extension Metadata
// ===============================

export const EXTENSION_NAME = 'Clotho';
export const EXTENSION_ID = 'Togawa-Sakiko.clotho';

// ===============================
// File Extensions
// ===============================

export const HEADER_EXTENSIONS = ['.h', '.hpp', '.hh', '.hxx'] as const;
export const SOURCE_EXTENSIONS = ['.c', '.cpp', '.cc', '.cxx'] as const;
export const ALL_CPP_EXTENSIONS = [
  ...HEADER_EXTENSIONS,
  ...SOURCE_EXTENSIONS,
] as const;

// ===============================
// Configuration Keys
// ===============================

export const CONFIG_KEYS = {
  CREATE_PAIR_RULES: 'createPair.rules',
  SWITCH_SOURCE_DIRS: 'switch.sourceDirs',
  SWITCH_HEADER_DIRS: 'switch.headerDirs',
  SWITCH_TEST_DIRS: 'switch.testDirs',
  SWITCH_SEARCH_PATHS: 'switch.searchPaths',
} as const;

// ===============================
// Command IDs
// ===============================

export const COMMANDS = {
  NEW_SOURCE_PAIR: 'clotho.newSourcePair',
  SWITCH_HEADER_SOURCE: 'clotho.switchHeaderSource',
  CONFIGURE_RULES: 'clotho.configureRules',
  CONFIGURE_HEADER_GUARD: 'clotho.configureHeaderGuard',
  SHOW_CLANGD_DETAILS: 'clotho.showClangdDetails',
  OPEN_CLANG_FORMAT_EDITOR: 'clotho.openClangFormatEditor',
} as const;

// ===============================
// Default Configurations
// ===============================

export const DEFAULT_SWITCH_CONFIG: SwitchConfig = {
  sourceDirs: ['src', 'source', 'lib'],
  headerDirs: ['include', 'inc', 'headers', 'api'],
  testDirs: ['test', 'tests', 'spec', 'unittest'],
  searchPaths: ['.', '../include', '../src', './include', './src'],
  excludePatterns: [
    '**/node_modules/**',
    '**/build/**',
    '**/dist/**',
    '**/.git/**',
  ],
};

// ===============================
// Default Placeholders
// ===============================

export const DEFAULT_PLACEHOLDERS = {
  C_EMPTY: 'my_c_functions',
  C_STRUCT: 'MyStruct',
  CPP_EMPTY: 'utils',
  CPP_CLASS: 'MyClass',
  CPP_STRUCT: 'MyStruct',
} as const;

// ===============================
// Validation Patterns
// ===============================

export const VALIDATION_PATTERNS = {
  IDENTIFIER: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
  FILE_EXTENSION: /^\.[a-zA-Z]+$/,
  HEADER_GUARD: /^[A-Z_][A-Z0-9_]*$/,
} as const;

// ===============================
// Test Patterns for Cleaning Basenames
// ===============================

export const TEST_PATTERNS = [
  /^test_(.+)$/i, // test_my_class -> my_class
  /^(.+)_test$/i, // my_class_test -> my_class
  /^(.+)_tests$/i, // my_class_tests -> my_class
  /^(.+)_spec$/i, // my_class_spec -> my_class
  /^(.+)Test$/, // MyClassTest -> MyClass
  /^Test(.+)$/, // TestMyClass -> MyClass
] as const;

// ===============================
// External Extension IDs
// ===============================

export const EXTERNAL_EXTENSIONS = {
  CLANGD: 'llvm-vs-code-extensions.vscode-clangd',
} as const;

// ===============================
// UI Constants
// ===============================

export const UI_CONSTANTS = {
  MAX_QUICK_PICK_ITEMS: 20,
  MAX_SEARCH_RESULTS: 20,
  FILE_PICKER_TIMEOUT: 30000, // 30 seconds
  WELCOME_MESSAGE_KEY: 'clotho.hasShownWelcome',
} as const;

// ===============================
// Error Messages
// ===============================

export const ERROR_MESSAGES = {
  NO_ACTIVE_EDITOR: 'No active editor found. Please open a C/C++ file first.',
  INVALID_FILE_TYPE: (fileName: string) =>
    `File '${fileName}' is not a recognized C/C++ source or header file.`,
  NO_TARGET_DIRECTORY:
    'Cannot determine target directory. Please open a folder or a file first.',
  FILE_EXISTS: (filePath: string) => `File already exists: ${filePath}`,
  NO_FILES_FOUND: (fileName: string, fileType: string) =>
    `No corresponding ${fileType} file found for '${fileName}'. You may need to create it manually.`,
  SWITCH_FAILED: (error: string) => `Failed to switch header/source: ${error}`,
  UNEXPECTED_ERROR: 'An unexpected error occurred.',
  CLANGD_NOT_FOUND: 'clangd extension not found',
  CLANGD_NOT_RUNNING: 'clangd client is not running',
  GLOBAL_SEARCH_FAILED: 'Global file search failed',
} as const;

// ===============================
// Success Messages
// ===============================

export const SUCCESS_MESSAGES = {
  RULE_SAVED: (scope: string) =>
    `Custom pairing rule saved to ${scope} settings.`,
  RULES_RESET: (scope: string) => `${scope} pairing rules have been reset.`,
  CONFIG_APPLIED: (templateName: string) =>
    `Applied ${templateName} configuration template.`,
  FILES_CREATED: (headerPath: string, sourcePath: string) =>
    `Successfully created ${headerPath} and ${sourcePath}`,
} as const;

// ===============================
// LSP Request Types
// ===============================

export const LSP_REQUESTS = {
  SWITCH_SOURCE_HEADER: 'textDocument/switchSourceHeader',
} as const;

// ===============================
// File Template Helpers
// ===============================

export const TEMPLATE_HELPERS = {
  generateHeaderGuard: (fileName: string, headerExt: string): string => {
    const baseName = fileName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const extName = headerExt.substring(1).toUpperCase();
    return `${baseName}_${extName}`;
  },

  generateIncludeLine: (fileName: string, headerExt: string): string => {
    return `#include "${fileName}${headerExt}"`;
  },

  createTemplateContext: (
    fileName: string,
    headerExt: string,
  ): TemplateContext => ({
    fileName,
    headerGuard: TEMPLATE_HELPERS.generateHeaderGuard(fileName, headerExt),
    includeLine: TEMPLATE_HELPERS.generateIncludeLine(fileName, headerExt),
  }),
} as const;

// ===============================
// Performance Constants
// ===============================

export const PERFORMANCE = {
  REGEX_CACHE_MAX_SIZE: 100,
  LRU_CACHE_MAX_SIZE: 50,
  SIMPLE_CACHE_MAX_SIZE: 100,
  FILE_SEARCH_TIMEOUT: 5000,
  CLANGD_REQUEST_TIMEOUT: 3000,
  PROCESS_TIMEOUT: 10000, // 10 seconds
  COMMAND_EXECUTION_TIMEOUT: 10000,
  
  // 🧠 Memory management settings
  ERROR_HISTORY_MAX_SIZE: 50, // Maximum error records to keep
  STATE_HISTORY_MAX_SIZE: 15, // Reduced from 20 for better memory usage
  OBJECT_POOL_MAX_SIZE: 20, // Maximum objects in pool
} as const;

// ===============================
// UI and Animation Timing
// ===============================

export const UI_TIMING = {
  HEARTBEAT_INTERVAL: 1000, // 1 second
  PREVIEW_DEBOUNCE: 50,
  TRANSITION_MAX_TIME: 2000, // 2 seconds
  ERROR_RECOVERY_DELAY: 1500, // 1.5 seconds
  STATUS_UPDATE_INTERVAL: 2000, // 2 seconds
  CLANGD_CPU_MONITOR_INTERVAL: 3000, // 3 seconds
  CLANGD_MEMORY_MONITOR_INTERVAL: 5000, // 5 seconds
  CLANGD_STATUS_CHECK_DELAY: 3000, // 3 seconds
  UI_REFRESH_DELAY: 100, // For UI operations
} as const;

// ===============================
// Error Handling Constants
// ===============================

export const ERROR_HANDLING = {
  MAX_RETRY_ATTEMPTS: 3,
  BASE_RETRY_DELAY: 1000, // 1 second
  MAX_RETRY_DELAY: 10000, // 10 seconds
  ERROR_RATE_WINDOW: 60000, // 1 minute
  ERROR_RECOVERY_WINDOW: 300000, // 5 minutes
  CLEANUP_INTERVAL: 60000, // 1 minute
  DEBOUNCE_LOCK_TIMEOUT: 5000, // 5 seconds
  DEBOUNCE_CHECK_INTERVAL: 10, // 10ms
} as const;

// ===============================
// Cache and Storage Constants
// ===============================

export const CACHE_CONFIG = {
  TEMPLATE_CACHE_TTL: 5000, // 5 seconds
  MEMORY_THRESHOLD_WARNING: 1000, // MB
  MEMORY_THRESHOLD_ERROR: 2000, // MB
  CLANG_FORMAT_MAX_VALUE: 1000, // For clang-format numeric options
  CLANG_FORMAT_DEFAULT_LARGE: 1000000, // For large default values
} as const;
