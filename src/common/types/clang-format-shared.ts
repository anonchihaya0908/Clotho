/**
 * Clang-Format 共享类型定义
 * 供前后端统一使用，确保类型一致性
 */

// 配置分类枚举 - 使用中文分类
export enum ConfigCategories {
  BASIC = '基础设置',
  ALIGNMENT = '对齐设置',
  WRAPPING = '换行设置',
  BRACES = '大括号设置',
  SPACING = '空格设置',
  INDENTATION = '缩进设置',
  COMMENTS = '注释设置',
  CPP_FEATURES = 'C++特性',
  POINTERS_REFS = '指针和引用',
  EMPTY_LINES = '空行设置',
  MISC = '其他设置',
}

// 配置分类数组 - 用于前端遍历
export const CONFIG_CATEGORIES_ARRAY = Object.values(ConfigCategories);

// Clang-Format 配置选项接口
export interface ClangFormatOption {
  key: string;
  name: string;
  description: string;
  category: ConfigCategories;
  type: 'boolean' | 'number' | 'string' | 'enum';
  enumValues?: string[];
  min?: number;
  max?: number;
  defaultValue: any;
  version: string; // clang-format版本
  deprecated?: boolean;
  previewTemplate?: string;
  example?: string;
}

// Clang-Format 配置接口
export interface ClangFormatConfig {
  [key: string]: any;
}

// WebView 消息类型
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
  // 新增：数据请求相关
  GET_OPTIONS_BY_CATEGORY = 'getOptionsByCategory',
  SEARCH_OPTIONS = 'searchOptions',
  GET_ALL_OPTIONS = 'getAllOptions',
}

// 应用状态接口
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

// 消息接口
export interface WebviewMessage {
  type: WebviewMessageType;
  payload: any;
}

// 搜索请求接口
export interface SearchOptionsRequest {
  query: string;
  category?: string;
  type?: ClangFormatOption['type'];
}

// 搜索响应接口
export interface SearchOptionsResponse {
  options: ClangFormatOption[];
  totalCount: number;
  query: string;
}

// 按分类获取选项请求接口
export interface GetOptionsByCategoryRequest {
  category: ConfigCategories;
}

// 按分类获取选项响应接口
export interface GetOptionsByCategoryResponse {
  options: ClangFormatOption[];
  category: ConfigCategories;
}

// 初始化消息载荷
export interface InitializePayload {
  options: ClangFormatOption[];
  categories: string[];
  currentConfig: ClangFormatConfig;
  settings: {
    showGuideButton: boolean;
  };
}

// 工具函数类型
export type OptionFilter = (option: ClangFormatOption) => boolean;
export type OptionComparator = (a: ClangFormatOption, b: ClangFormatOption) => number;

// 常用的过滤器和比较器
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
