/**
 * Core shared types across all modules
 * This file contains the fundamental types used throughout the extension
 */

import * as vscode from 'vscode';

// ===============================
// Core Primitive Types
// ===============================

export type Language = 'c' | 'cpp';
export type FileType = 'header' | 'source';
export type ConfigScope = 'workspace' | 'user';
export type SearchMethod =
    | 'clangd'
    | 'same-directory'
    | 'src-include'
    | 'parallel-tests'
    | 'global-search';

// ===============================
// Base Configuration Interface
// ===============================

export interface BaseConfig {
    readonly version?: string;
    readonly lastModified?: number;
}

// ===============================
// Validation Interfaces
// ===============================

export interface ValidationResult {
    isValid: boolean;
    error?: string;
    warnings?: string[];
}

export interface FileValidationResult extends ValidationResult {
    existingFilePath?: string;
}

export interface ConfigValidationResult extends ValidationResult {
    // Configuration-specific validation properties can be added here
}

export interface FormatResult {
    success: boolean;
    formattedCode: string;
    error?: string;
}

// ===============================
// Search Result Interface (Unified)
// ===============================

export interface SearchResult {
    files: vscode.Uri[];
    method: SearchMethod;
    confidence?: number;
}

// ===============================
// Editor State Interface (Unified)
// ===============================

export interface EditorState {
    // Basic state
    isInitialized: boolean;
    isVisible: boolean;

    // Configuration state
    configDirty: boolean;
    lastSaved?: number;

    // Error state
    lastError?: EditorError;
    recoveryAttempts: number;
}

// ===============================
// Error Interfaces
// ===============================

export interface EditorError {
    code: string;
    message: string;
    context: Record<string, any>;
    timestamp: number;
    recoverable: boolean;
    module?: string;
}

export interface ErrorContext {
    operation: string;
    module: string;
    instanceId?: string;
    showToUser?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    rethrow?: boolean;
}

// ===============================
// Manager Interfaces
// ===============================

export interface BaseManager {
    readonly name: string;
    initialize(context: ManagerContext): Promise<void>;
    dispose(): void;
    getStatus(): ManagerStatus;
}

export interface ManagerContext {
    extensionUri: vscode.Uri;
    stateManager?: any; // Will be properly typed in specific implementations
    errorRecovery?: any;
    eventBus?: any;
}

export interface ManagerStatus {
    isInitialized: boolean;
    isHealthy: boolean;
    lastActivity: Date;
    errorCount: number;
}

// ===============================
// Language Detection Interface
// ===============================

export interface LanguageDetectionResult {
    language: Language;
    uncertain: boolean;
    confidence: number;
}

// ===============================
// Template Interfaces
// ===============================

export interface TemplateContext {
    fileName: string;
    headerGuard: string;
    includeLine: string;
    namespace?: string;
}

export interface TemplateChoice {
    label: string;
    description: string;
    detail: string;
    headerExt: string;
    sourceExt: string;
    language: Language;
}

// ===============================
// State Change Event Interface
// ===============================

export interface StateChangeEvent {
    type: 'config' | 'error' | 'lifecycle' | 'preview';
    from: any;
    to: any;
    timestamp: number;
    source: string;
    metadata?: Record<string, any>;
}

// ===============================
// Type Guards
// ===============================

export function isValidLanguage(value: string): value is Language {
  return value === 'c' || value === 'cpp';
}

export function isValidFileType(value: string): value is FileType {
  return value === 'header' || value === 'source';
}

export function isValidSearchMethod(value: string): value is SearchMethod {
  return [
    'clangd',
    'same-directory',
    'src-include',
    'parallel-tests',
    'global-search',
  ].includes(value);
}

export function isValidConfigScope(value: string): value is ConfigScope {
  return value === 'workspace' || value === 'user';
}

// ===============================
// Instance State Interface
// ===============================

export interface InstanceState {
    id: string;
    editorState: EditorState;
    panelState: {
        isVisible: boolean;
        viewColumn: number;
    };
}

// ===============================
// Extension Context Interface
// ===============================

export interface ExtensionContext {
    workspaceFolder?: WorkspaceFolder;
    extensionContext: vscode.ExtensionContext;
}

// ===============================
// Custom Rule Selection Interface
// ===============================

export interface CustomRuleSelection {
    extensions: { headerExt: string; sourceExt: string };
    shouldCreateNew: boolean;
}

// ===============================
// Utility Types
// ===============================

export type Disposable = vscode.Disposable;
export type Uri = vscode.Uri;
export type WorkspaceFolder = vscode.WorkspaceFolder;
export type TextEditor = vscode.TextEditor;
export type TextDocument = vscode.TextDocument;
