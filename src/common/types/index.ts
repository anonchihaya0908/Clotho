/**
 * Unified type definitions export hub
 * Provides centralized export for all type definitions
 */

// Export all core types
export * from './core';

// Export shared clang-format types for backward compatibility
export * from './clang-format-shared';

// Import types for local interface definitions (already exported above)
import type { WebviewMessage, WebviewMessageType } from './clang-format-shared';
import type { ValidationResult } from './core';

export interface ConfigChangedMessage extends WebviewMessage {
    type: WebviewMessageType.CONFIG_CHANGED;
    payload: {
        key: string;
        value: any;
    };
}

export interface ConfigLoadedMessage extends WebviewMessage {
    type: WebviewMessageType.CONFIG_LOADED;
    payload: {
        config: Record<string, any>;
    };
}

export interface PreviewUpdateMessage extends WebviewMessage {
    type:
        | WebviewMessageType.MICRO_PREVIEW_UPDATE
        | WebviewMessageType.UPDATE_MICRO_PREVIEW;
    payload: {
        formattedCode: string;
        success: boolean;
        error?: string;
        key?: string; // For micro preview
    };
}

export interface SettingsMessage extends WebviewMessage {
    type:
        | WebviewMessageType.UPDATE_SETTINGS
        | WebviewMessageType.SETTINGS_UPDATED;
    payload: {
        showGuideButton?: boolean;
    };
}

export interface ValidationMessage extends WebviewMessage {
    type:
        | WebviewMessageType.VALIDATION_RESULT
        | WebviewMessageType.VALIDATION_ERROR;
    payload: ValidationResult;
}
