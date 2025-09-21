/**
 * Visual Editor module specific types
 */

import * as vscode from 'vscode';
import { EditorState as CoreEditorState } from '../common/types/core';
import { ClangFormatConfig } from '../common/types/clang-format-shared';
import { UIConfig } from '../common/config-system';

// ===============================
// Visual Editor Configuration
// ===============================

/**
 *  Visual Editor Configuration
 * 继承自UIConfig，获得统一的UI配置管理能力
 */
export interface VisualEditorConfig extends UIConfig {
    /** 显示指导按钮 */
    showGuideButton: boolean;
    /** 预览模式 */
    previewMode: 'side' | 'bottom' | 'separate';
    // autoSave 已通过 UIConfig 继承
}

// ===============================
// Visual Editor State
// ===============================

export interface VisualEditorState extends CoreEditorState {
    // Visual editor specific state
    previewMode: 'open' | 'closed' | 'transitioning';
    previewUri?: vscode.Uri;
    previewEditor?: vscode.TextEditor;

    // Override inherited properties to match interface requirements
    isVisible: boolean;
    isInitialized: boolean;

    // Configuration state
    currentConfig: ClangFormatConfig;

    // UI state
    selectedCategory?: string;
    searchQuery?: string;
}

// ===============================
// Instance State Interface
// ===============================

export interface InstanceState {
    id: string;
    editorState: VisualEditorState;
    panelState: {
        isVisible: boolean;
        viewColumn: number;
    };
}

// ===============================
// Panel Management
// ===============================

export interface PanelOptions {
    title: string;
    viewColumn?: number;
    preserveFocus?: boolean;
    retainContextWhenHidden?: boolean;
}

export interface PanelState {
    isVisible: boolean;
    isActive: boolean;
    viewColumn: number;
    lastActivity: Date;
}

// ===============================
// Manager Interfaces
// ===============================

export interface ManagedComponent {
    name: string;
    instance: unknown;
    dispose?(): void;
}

export interface ManagerRegistration {
    name: string;
    factory: () => unknown;
    dependencies?: string[];
}

export interface InitializationResult {
    successful: string[];
    failed: { name: string; error: Error }[];
    totalTimeMs: number;
}

// ===============================
// Transition Management
// ===============================

export interface TransitionOptions {
    duration: number;
    easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
    onStart?: () => void;
    onComplete?: () => void;
    onError?: (error: Error) => void;
}

// ===============================
// Debounce Options
// ===============================

export interface DebounceOptions {
    delay: number;
    maxWait?: number;
    leading?: boolean;
    trailing?: boolean;
}

export interface LockOptions {
    timeout?: number;
    throwOnTimeout?: boolean;
}
