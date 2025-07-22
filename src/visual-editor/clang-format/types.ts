/**
 * Types for Clang-Format Editor
 */

// 配置选项类型
export interface ClangFormatOption {
    key: string;
    name: string;
    description: string;
    type: 'boolean' | 'integer' | 'string' | 'enum';
    defaultValue: any;
    possibleValues?: string[];
    category: ConfigCategories;
    microPreviewCode?: string;
}

// 配置分类
export enum ConfigCategories {
    GENERAL = 'General',
    ALIGNMENT = 'Alignment',
    BRACES = 'Braces',
    SPACING = 'Spacing',
    INDENTATION = 'Indentation',
    WRAPPING = 'Wrapping',
    COMMENTS = 'Comments'
}

// Webview 消息类型
export enum WebviewMessageType {
    // 初始化
    INITIALIZE = 'initialize',

    // 配置相关
    CONFIG_CHANGED = 'configChanged',
    CONFIG_LOADED = 'configLoaded',
    CONFIG_SAVED = 'configSaved',

    // 预览相关
    MICRO_PREVIEW_UPDATE = 'microPreviewUpdate',
    MACRO_PREVIEW_UPDATE = 'macroPreviewUpdate',
    GET_MICRO_PREVIEW = 'getMicroPreview',         // 请求动态微观预览
    GET_MACRO_PREVIEW = 'getMacroPreview',         // 请求宏观预览
    UPDATE_MICRO_PREVIEW = 'updateMicroPreview',   // 返回微观预览结果

    // 操作相关
    LOAD_WORKSPACE_CONFIG = 'loadWorkspaceConfig',
    SAVE_CONFIG = 'saveConfig',
    EXPORT_CONFIG = 'exportConfig',
    IMPORT_CONFIG = 'importConfig',
    RESET_CONFIG = 'resetConfig',
    VALIDATE_CONFIG = 'validateConfig',
    OPEN_CLANG_FORMAT_FILE = 'openClangFormatFile',

    // 验证相关
    VALIDATION_RESULT = 'validationResult',
    VALIDATION_ERROR = 'validationError',

    // 设置相关
    UPDATE_SETTINGS = 'updateSettings',
    SETTINGS_UPDATED = 'settingsUpdated',

    // 交互联动相关
    CONFIG_OPTION_HOVER = 'configOptionHover',      // 配置项hover事件
    CONFIG_OPTION_FOCUS = 'configOptionFocus',      // 配置项focus事件
    CLEAR_HIGHLIGHTS = 'clearHighlights'            // 清除高亮
}

// Webview 消息接口
export interface WebviewMessage {
    type: WebviewMessageType;
    payload?: any;
}

// 特定消息类型
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
    type: WebviewMessageType.MICRO_PREVIEW_UPDATE | WebviewMessageType.MACRO_PREVIEW_UPDATE;
    payload: {
        formattedCode: string;
        success: boolean;
        error?: string;
        key?: string; // For micro preview
    };
}

export interface ValidationMessage extends WebviewMessage {
    type: WebviewMessageType.VALIDATION_RESULT | WebviewMessageType.VALIDATION_ERROR;
    payload: {
        isValid?: boolean;
        error?: string;
        warnings?: string[];
    };
}

export interface SettingsMessage extends WebviewMessage {
    type: WebviewMessageType.UPDATE_SETTINGS | WebviewMessageType.SETTINGS_UPDATED;
    payload: {
        showGuideButton?: boolean;
    };
}
