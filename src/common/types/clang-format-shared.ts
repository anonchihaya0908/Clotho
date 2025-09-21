/**
 * Clang-Format shared type definitions
 * Used by both frontend and backend to ensure type consistency
 */

import { ConfigValue } from './event-types';
export type { ConfigValue };

// Configuration category enumeration - using English categories
export enum ConfigCategories {
  BASIC = 'Basic Settings',
  ALIGNMENT = 'Alignment Settings',
  WRAPPING = 'Line Breaking',
  BRACES = 'Brace Settings',
  SPACING = 'Spacing Settings',
  INDENTATION = 'Indentation Settings',
  COMMENTS = 'Comment Settings',
  CPP_FEATURES = 'C++ Features',
  POINTERS_REFS = 'Pointers and References',
  EMPTY_LINES = 'Empty Lines',
  MISC = 'Miscellaneous',
}

// Configuration categories array - for frontend iteration
export const CONFIG_CATEGORIES_ARRAY = Object.values(ConfigCategories);

// Clang-Format configuration option interface
export interface ClangFormatOption {
  key: string;
  name: string;
  description: string;
  category: ConfigCategories;
  type: 'boolean' | 'number' | 'string' | 'enum';
  enumValues?: string[];
  min?: number;
  max?: number;
  defaultValue: ConfigValue;
  version: string; // clang-format version
  deprecated?: boolean;
  previewTemplate?: string;
  example?: string;
}

// Clang-Format configuration interface
export interface ClangFormatConfig {
  [key: string]: ConfigValue;
}

// WebView message types
export enum WebviewMessageType {
  INITIALIZE = 'initialize',
  CONFIG_CHANGED = 'configChanged',
  CONFIG_LOADED = 'configLoaded',
  MICRO_PREVIEW_UPDATE = 'microPreviewUpdate',
  VALIDATION_RESULT = 'validationResult',
  GET_MICRO_PREVIEW = 'getMicroPreview',
  GET_MACRO_PREVIEW = 'getMacroPreview',
  LOAD_WORKSPACE_CONFIG = 'loadWorkspaceConfig',
  SAVE_CONFIG = 'saveConfig',
  EXPORT_CONFIG = 'exportConfig',
  IMPORT_CONFIG = 'importConfig',
  RESET_CONFIG = 'resetConfig',
  UPDATE_SETTINGS = 'updateSettings',
  CONFIG_OPTION_HOVER = 'configOptionHover',
  CONFIG_OPTION_FOCUS = 'configOptionFocus',
  CLEAR_HIGHLIGHTS = 'clearHighlights',
  OPEN_CLANG_FORMAT_FILE = 'openClangFormatFile',
  VALIDATION_ERROR = 'validationError',
  SETTINGS_UPDATED = 'settingsUpdated',
  UPDATE_MICRO_PREVIEW = 'updateMicroPreview',
  PREVIEW_OPENED = 'previewOpened',
  PREVIEW_CLOSED = 'previewClosed',
  PREVIEW_REOPENED = 'previewReopened',
  PREVIEW_REOPEN_FAILED = 'previewReopenFailed',
  WEBVIEW_READY = 'webviewReady',
  WEBVIEW_LOG = 'webview-log',
  REOPEN_PREVIEW = 'reopen-preview',
  // Data request related
  GET_OPTIONS_BY_CATEGORY = 'getOptionsByCategory',
  SEARCH_OPTIONS = 'searchOptions',
  GET_ALL_OPTIONS = 'getAllOptions',
}

// Application state interface
export interface AppState {
  options: ClangFormatOption[];
  categories: string[];
  currentConfig: ClangFormatConfig;
  microPreviews: Record<string, string>;
  isLoading: boolean;
  error: string | null;
  validationState: {
    isValid: boolean;
    errors: string[];
  };
  settings: {
    showGuideButton: boolean;
  };
  previewState: {
    isOpen: boolean;
    showPlaceholder: boolean;
    isReopening: boolean;
  };
  dynamicPreviewResult?: {
    optionName: string;
    formattedCode: string;
    success: boolean;
    error?: string;
  };
}

// Message interface
export interface WebviewMessage {
  type: WebviewMessageType;
  payload: unknown;
}

// Search request interface
export interface SearchOptionsRequest {
  query: string;
  category?: string;
  type?: ClangFormatOption['type'];
}

// Search response interface
export interface SearchOptionsResponse {
  options: ClangFormatOption[];
  totalCount: number;
  query: string;
}

// Get options by category request interface
export interface GetOptionsByCategoryRequest {
  category: ConfigCategories;
}

// Get options by category response interface
export interface GetOptionsByCategoryResponse {
  options: ClangFormatOption[];
  category: ConfigCategories;
}

// Initialize message payload
export interface InitializePayload {
  options: ClangFormatOption[];
  categories: string[];
  currentConfig: ClangFormatConfig;
  settings: {
    showGuideButton: boolean;
  };
}

// Utility function types
export type OptionFilter = (option: ClangFormatOption) => boolean;
export type OptionComparator = (a: ClangFormatOption, b: ClangFormatOption) => number;

// Common filters and comparators
export const OptionFilters = {
  byCategory: (category: ConfigCategories): OptionFilter =>
    (option) => option.category === category,

  byType: (type: ClangFormatOption['type']): OptionFilter =>
    (option) => option.type === type,

  bySearch: (query: string): OptionFilter => {
    const lowerQuery = query.toLowerCase();
    return (option) =>
      option.key.toLowerCase().includes(lowerQuery) ||
      option.name.toLowerCase().includes(lowerQuery) ||
      option.description.toLowerCase().includes(lowerQuery);
  },

  notDeprecated: (option: ClangFormatOption) => !option.deprecated,
};

export const OptionComparators = {
  byKey: (a: ClangFormatOption, b: ClangFormatOption) => a.key.localeCompare(b.key),
  byName: (a: ClangFormatOption, b: ClangFormatOption) => a.name.localeCompare(b.name),
  byCategory: (a: ClangFormatOption, b: ClangFormatOption) => a.category.localeCompare(b.category),
};
