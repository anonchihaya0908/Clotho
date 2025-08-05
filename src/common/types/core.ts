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

import type { ValidationResult as BaseValidationResult } from '../type-utilities';

//  使用统一的ValidationResult类型
export interface ValidationResult extends BaseValidationResult {
    validatedValue?: unknown;
}

export interface FileValidationResult extends ValidationResult {
    existingFilePath?: string;
}

export interface ConfigValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    fixed?: boolean; // Whether configuration was automatically fixed
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
    context: Record<string, unknown>;
    timestamp: number;
    recoverable: boolean;
    module?: string;
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
    stateManager?: {
        updateState(state: Record<string, unknown>, reason?: string): Promise<void>;
        getState(): Record<string, unknown>;
    };
    errorRecovery?: {
        handleError(code: string, error: Error, context?: Record<string, unknown>): Promise<void>;
    };
    eventBus?: {
        emit(event: string, ...args: readonly unknown[]): void;
        on(event: string, handler: (...args: readonly unknown[]) => void): () => void;
    };
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
    from: unknown;
    to: unknown;
    timestamp: number;
    source: string;
    metadata?: Record<string, unknown>;
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
