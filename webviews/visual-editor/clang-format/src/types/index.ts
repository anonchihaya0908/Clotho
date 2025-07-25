/**
 * Webview 类型定义
 * 与后端保持一致的类型定义
 */

export interface ClangFormatOption {
    key: string;
    name: string;
    description: string;
    category: string;
    type: 'boolean' | 'number' | 'string' | 'enum';
    enumValues?: string[];
    min?: number;
    max?: number;
    defaultValue: any;
    version: string;
    deprecated?: boolean;
    previewTemplate?: string;
    example?: string;
}

// 配置分类
export const CLANG_FORMAT_CATEGORIES = [
    '基础设置',
    '对齐设置',
    '换行设置',
    '大括号设置',
    '空格设置',
    '缩进设置',
    '注释设置',
    'C++特性',
    '指针和引用',
    '空行设置',
    '其他设置'
];

// 获取指定类别的选项
export function getOptionsByCategory(options: ClangFormatOption[], category: string): ClangFormatOption[] {
    return options.filter(option => option.category === category);
}

// 根据关键词搜索选项
export function searchOptions(options: ClangFormatOption[], query: string): ClangFormatOption[] {
    const lowerQuery = query.toLowerCase();
    return options.filter(option =>
        option.key.toLowerCase().includes(lowerQuery) ||
        option.name.toLowerCase().includes(lowerQuery) ||
        option.description.toLowerCase().includes(lowerQuery)
    );
}

// 根据语言确定哪些选项应该被禁用（仅支持 C++）
export function getDisabledOptionsForLanguage(_language: string): string[] {
    // C++ 支持所有选项
    return [];
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
    CONFIG_OPTION_HOVER = 'configOptionHover'
}

// 应用状态接口
export interface AppState {
    options: ClangFormatOption[];
    categories: string[];
    currentConfig: Record<string, any>;
    settings: {
        showGuideButton: boolean;
    };
    microPreviews: Record<string, string>;
    validationState: {
        isValid: boolean;
        errors: string[];
    };
    isLoading: boolean;
}

// 消息接口
export interface WebviewMessage {
    type: WebviewMessageType;
    payload: any;
}
