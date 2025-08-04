/**
 * Common type definitions for Clotho extension
 * This file serves as the main export hub for all types
 */

import * as vscode from 'vscode';

// Re-export core types
export {
  BaseConfig, BaseManager, ConfigScope, Disposable, EditorError, EditorState, ErrorContext, FileType, FileValidationResult, isValidConfigScope, isValidFileType, isValidLanguage, isValidSearchMethod, Language, LanguageDetectionResult, ManagerContext,
  ManagerStatus, SearchMethod, SearchResult, StateChangeEvent, TemplateChoice, TemplateContext, TextDocument, TextEditor, Uri, ValidationResult, WorkspaceFolder
} from './types/core';

// Import for local use
import { Language } from './types/core';

// ===============================
// Extension Specific Types
// ===============================

export type TemplateKey =
  | 'CPP_CLASS'
  | 'CPP_STRUCT'
  | 'C_STRUCT'
  | 'C_EMPTY'
  | 'CPP_EMPTY';

// ===============================
// Configuration Interfaces
// ===============================

export interface PairingRule {
  key: string;
  label: string;
  description: string;
  language: Language;
  headerExt: string;
  sourceExt: string;
  isClass?: boolean;
  isStruct?: boolean;
}

// Module-specific configurations now in their respective modules
// SwitchConfig is in switch-header-source/types.ts

export interface ExtensionConfig {
  createPair: {
    rules: PairingRule[];
  };
  switch: {
    sourceDirs: string[];
    headerDirs: string[];
    testDirs: string[];
    searchPaths: string[];
  };
}

// ===============================
// Service Result Interfaces
// ===============================

export interface FileCreationResult {
  headerPath: vscode.Uri;
  sourcePath: vscode.Uri;
  headerContent: string;
  sourceContent: string;
}

// ===============================
// UI Interfaces
// ===============================

export interface QuickPickRule extends vscode.QuickPickItem {
  rule: PairingRule;
}

export interface QuickPickAction extends vscode.QuickPickItem {
  key: string;
}

export interface QuickPickFile extends vscode.QuickPickItem {
  uri: vscode.Uri;
}

// TemplateChoice is now re-exported from core types

// ===============================
// Extension Context Interface
// ===============================

export interface ExtensionContext {
  subscriptions: vscode.Disposable[];
  extensionContext: vscode.ExtensionContext;
}

// ===============================
// Module-specific types (for backward compatibility)
// ===============================

// These are now handled by module-specific type files
// Import them from respective modules when needed

// SearchPattern and TemplateContext are now in module-specific files

// ===============================
// Custom Rule Selection Interface
// ===============================

export interface CustomRuleSelection {
  rule: PairingRule | undefined;
  shouldCreateNew: boolean;
}

// Type Guards and Utility Types are now re-exported from core types

// ===============================
// Visual Editor specific Types
// ===============================

/**
 * Editor open source enumeration
 */
export enum EditorOpenSource {
  DIRECT = 'direct',
  COMMAND = 'command',
  CODE_LENS = 'code_lens',
  ERROR_RECOVERY = 'error_recovery',
}

// Visual Editor types are now in src/visual-editor/types.ts

// Note: WebviewMessage and WebviewMessageType are in clang-format-shared.ts
// Import from clang-format-shared.ts when needed
