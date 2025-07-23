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


// ===============================
// Visual Editor specific Types
// ===============================

/**
 * 编辑器打开来源
 */
export enum EditorOpenSource {
    DIRECT = 'direct',
    COMMAND = 'command',
    CODE_LENS = 'code_lens'
}

/**
 * 角色信息
 */
// export interface CharacterInfo { ... } // Temporarily commented out

/**
 * 编辑器状态定义
 */
export interface EditorState {
    // 基础状态
    isInitialized: boolean;
    isVisible: boolean;
    
    // 预览状态
    previewMode: 'open' | 'closed' | 'transitioning';
    previewUri?: vscode.Uri;
    previewEditor?: vscode.TextEditor;
    
    // 配置状态
    currentConfig: Record<string, any>;
    configDirty: boolean;
    
    // 错误状态
    lastError?: EditorError;
    recoveryAttempts: number;
}

/**
 * 状态变化事件
 */
export interface StateChangeEvent {
    type: 'preview' | 'config' | 'error';
    from: any;
    to: any;
    timestamp: number;
    source: string;
}

/**
 * 编辑器错误信息
 */
export interface EditorError {
    code: string;
    message: string;
    context: Record<string, any>;
    timestamp: number;
    recoverable: boolean;
}

/**
 * 基础管理器接口
 */
export interface BaseManager {
    readonly name: string;
    initialize(context: ManagerContext): Promise<void>;
    dispose(): void;
    getStatus(): ManagerStatus;
}

/**
 * 管理器上下文
 */
export interface ManagerContext {
    extensionUri: vscode.Uri;
    stateManager: any; // Using any to avoid circular dependency, will be typed in consuming files
    errorRecovery: any;
    eventBus: any;
}

/**
 * 管理器状态
 */
export interface ManagerStatus {
    isInitialized: boolean;
    isHealthy: boolean;
    lastActivity: Date;
    errorCount: number;
}

/**
 * Webview 消息
 */
export interface WebviewMessage {
    type: string;
    payload?: any;
}

/**
 * Webview 消息类型
 */
export enum WebviewMessageType {
    // 配置
    CONFIG_CHANGED = 'config-changed',
    APPLY_CONFIG = 'apply-config',
    RESET_CONFIG = 'reset-config',
    EXPORT_CONFIG = 'export-config',
    IMPORT_CONFIG = 'import-config',
    
    // 预览
    REOPEN_PREVIEW = 'reopen-preview',
    UPDATE_PREVIEW = 'update-preview',
    
    // 通用
    GET_STATE = 'get-state',
    SHOW_MESSAGE = 'show-message',
}
