/**
 * Visual Editor module specific types
 */

import { EditorState as CoreEditorState, BaseConfig } from '../common/types/core';
import { ClangFormatConfig } from '../common/types/clang-format-shared';

// ===============================
// Visual Editor Configuration
// ===============================

export interface VisualEditorConfig extends BaseConfig {
    showGuideButton: boolean;
    autoSave: boolean;
    previewMode: 'side' | 'bottom' | 'separate';
}

// ===============================
// Visual Editor State
// ===============================

export interface VisualEditorState extends CoreEditorState {
    // Visual editor specific state
    previewMode: 'open' | 'closed' | 'transitioning';
    previewUri?: string;

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
    instance: any;
    dispose?(): void;
}

export interface ManagerRegistration {
    name: string;
    factory: () => any;
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