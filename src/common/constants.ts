/**
 * Application constants for Clotho extension
 * Centralizes all magic numbers, strings, and configuration defaults
 */

import { SwitchConfig, TemplateContext } from './types';

// ===============================
// Extension Metadata
// ===============================

export const EXTENSION_NAME = 'Clotho';
export const EXTENSION_ID = 'your-publisher-name.clotho';

// ===============================
// File Extensions
// ===============================

export const HEADER_EXTENSIONS = ['.h', '.hpp', '.hh', '.hxx'] as const;
export const SOURCE_EXTENSIONS = ['.c', '.cpp', '.cc', '.cxx'] as const;
export const ALL_CPP_EXTENSIONS = [...HEADER_EXTENSIONS, ...SOURCE_EXTENSIONS] as const;

// ===============================
// Configuration Keys
// ===============================

export const CONFIG_KEYS = {
    CREATE_PAIR_RULES: 'createPair.rules',
    SWITCH_SOURCE_DIRS: 'switch.sourceDirs',
    SWITCH_HEADER_DIRS: 'switch.headerDirs',
    SWITCH_TEST_DIRS: 'switch.testDirs',
    SWITCH_SEARCH_PATHS: 'switchHeaderSource.searchPaths'
} as const;

// ===============================
// Command IDs
// ===============================

export const COMMANDS = {
    NEW_SOURCE_PAIR: 'clotho.newSourcePair',
    SWITCH_HEADER_SOURCE: 'clotho.switchHeaderSource',
    CONFIGURE_RULES: 'clotho.configureRules',
    SHOW_CLANGD_DETAILS: 'clotho.showClangdDetails',
    OPEN_CLANG_FORMAT_EDITOR: 'clotho.openClangFormatEditor',
    TEST_DEBOUNCE: 'clotho.testDebounce'
} as const;

// ===============================
// Default Configurations
// ===============================

export const DEFAULT_SWITCH_CONFIG: SwitchConfig = {
    sourceDirs: ['src', 'source', 'lib'],
    headerDirs: ['include', 'inc', 'headers', 'api'],
    testDirs: ['test', 'tests', 'spec', 'unittest'],
    searchPaths: ['.', '../include', '../src', './include', './src'],
    excludePatterns: ['**/node_modules/**', '**/build/**', '**/dist/**', '**/.git/**']
};

// ===============================
// Default Placeholders
// ===============================

export const DEFAULT_PLACEHOLDERS = {
    C_EMPTY: 'my_c_functions',
    C_STRUCT: 'MyStruct',
    CPP_EMPTY: 'utils',
    CPP_CLASS: 'MyClass',
    CPP_STRUCT: 'MyStruct'
} as const;

// ===============================
// Validation Patterns
// ===============================

export const VALIDATION_PATTERNS = {
    IDENTIFIER: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    FILE_EXTENSION: /^\.[a-zA-Z]+$/,
    HEADER_GUARD: /^[A-Z_][A-Z0-9_]*$/
} as const;

// ===============================
// Test Patterns for Cleaning Basenames
// ===============================

export const TEST_PATTERNS = [
    /^test_(.+)$/i,     // test_my_class -> my_class
    /^(.+)_test$/i,     // my_class_test -> my_class
    /^(.+)_tests$/i,    // my_class_tests -> my_class
    /^(.+)_spec$/i,     // my_class_spec -> my_class
    /^(.+)Test$/,       // MyClassTest -> MyClass
    /^Test(.+)$/        // TestMyClass -> MyClass
] as const;

// ===============================
// External Extension IDs
// ===============================

export const EXTERNAL_EXTENSIONS = {
    CLANGD: 'llvm-vs-code-extensions.vscode-clangd'
} as const;

// ===============================
// UI Constants
// ===============================

export const UI_CONSTANTS = {
    MAX_QUICK_PICK_ITEMS: 20,
    MAX_SEARCH_RESULTS: 20,
    FILE_PICKER_TIMEOUT: 30000, // 30 seconds
    WELCOME_MESSAGE_KEY: 'clotho.hasShownWelcome'
} as const;

// ===============================
// Error Messages
// ===============================

export const ERROR_MESSAGES = {
    NO_ACTIVE_EDITOR: 'No active editor found. Please open a C/C++ file first.',
    INVALID_FILE_TYPE: (fileName: string) => `File '${fileName}' is not a recognized C/C++ source or header file.`,
    NO_TARGET_DIRECTORY: 'Cannot determine target directory. Please open a folder or a file first.',
    FILE_EXISTS: (filePath: string) => `File already exists: ${filePath}`,
    NO_FILES_FOUND: (fileName: string, fileType: string) => `No corresponding ${fileType} file found for '${fileName}'. You may need to create it manually.`,
    SWITCH_FAILED: (error: string) => `Failed to switch header/source: ${error}`,
    UNEXPECTED_ERROR: 'An unexpected error occurred.',
    CLANGD_NOT_FOUND: 'clangd extension not found',
    CLANGD_NOT_RUNNING: 'clangd client is not running',
    GLOBAL_SEARCH_FAILED: 'Global file search failed'
} as const;

// ===============================
// Success Messages
// ===============================

export const SUCCESS_MESSAGES = {
    RULE_SAVED: (scope: string) => `Custom pairing rule saved to ${scope} settings.`,
    RULES_RESET: (scope: string) => `${scope} pairing rules have been reset.`,
    CONFIG_APPLIED: (templateName: string) => `Applied ${templateName} configuration template.`,
    FILES_CREATED: (headerPath: string, sourcePath: string) => `Successfully created ${headerPath} and ${sourcePath}`
} as const;

// ===============================
// LSP Request Types
// ===============================

export const LSP_REQUESTS = {
    SWITCH_SOURCE_HEADER: 'textDocument/switchSourceHeader'
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

    createTemplateContext: (fileName: string, headerExt: string): TemplateContext => ({
        fileName,
        headerGuard: TEMPLATE_HELPERS.generateHeaderGuard(fileName, headerExt),
        includeLine: TEMPLATE_HELPERS.generateIncludeLine(fileName, headerExt)
    })
} as const;

// ===============================
// Performance Constants
// ===============================

export const PERFORMANCE = {
    REGEX_CACHE_MAX_SIZE: 100,
    FILE_SEARCH_TIMEOUT: 5000,
    CLANGD_REQUEST_TIMEOUT: 3000
} as const;
