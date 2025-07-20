/**
 * Common type definitions for Clotho extension
 * Centralizes all shared types and interfaces
 */

import * as vscode from 'vscode';

// ===============================
// Core Types
// ===============================

export type Language = 'c' | 'cpp';
export type FileType = 'header' | 'source';
export type SearchMethod = 'clangd' | 'same-directory' | 'src-include' | 'parallel-tests' | 'global-search';
export type TemplateKey = 'CPP_CLASS' | 'CPP_STRUCT' | 'C_STRUCT' | 'C_EMPTY' | 'CPP_EMPTY';
export type ConfigScope = 'workspace' | 'user';

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

export interface SwitchConfig {
    sourceDirs: string[];
    headerDirs: string[];
    testDirs: string[];
    searchPaths: string[];
    excludePatterns: string[];
}

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

export interface SearchResult {
    files: vscode.Uri[];
    method: SearchMethod;
}

export interface LanguageDetectionResult {
    language: Language;
    uncertain: boolean;
}

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

export interface TemplateChoice {
    label: string;
    description: string;
    detail: string;
    headerExt: string;
    sourceExt: string;
    language: Language;
}

// ===============================
// Extension Context Interface
// ===============================

export interface ExtensionContext {
    subscriptions: vscode.Disposable[];
    extensionContext: vscode.ExtensionContext;
}

// ===============================
// Configuration Template Interface
// ===============================

export interface ConfigTemplate {
    name: string;
    description: string;
    config: Omit<SwitchConfig, 'excludePatterns'>;
}

// ===============================
// Validation Interfaces
// ===============================

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export interface FileValidationResult extends ValidationResult {
    existingFilePath?: string;
}

// ===============================
// Pattern Interfaces for Directory Searching
// ===============================

export interface SearchPattern {
    rootPath: string;
    subPath: string;
    targetDirs: string[];
}

// ===============================
// Template Context Interface
// ===============================

export interface TemplateContext {
    fileName: string;
    headerGuard: string;
    includeLine: string;
}

// ===============================
// Custom Rule Selection Interface
// ===============================

export interface CustomRuleSelection {
    rule: PairingRule | undefined;
    shouldCreateNew: boolean;
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
    return ['clangd', 'same-directory', 'src-include', 'parallel-tests', 'global-search'].includes(value);
}

export function isValidConfigScope(value: string): value is ConfigScope {
    return value === 'workspace' || value === 'user';
}

// ===============================
// Utility Types
// ===============================

export type Disposable = vscode.Disposable;
export type Uri = vscode.Uri;
export type WorkspaceFolder = vscode.WorkspaceFolder;
export type TextEditor = vscode.TextEditor;
export type TextDocument = vscode.TextDocument;
