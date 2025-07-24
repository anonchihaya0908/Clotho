/**
 * Webview相关类型定义
 * 统一管理所有Webview消息类型和接口
 */

// Webview 消息类型枚举
export enum WebviewMessageType {
  // 初始化
  INITIALIZE = "initialize",

  // 配置相关
  CONFIG_CHANGED = "configChanged",
  CONFIG_LOADED = "configLoaded",
  CONFIG_SAVED = "configSaved",

  // 预览相关
  MICRO_PREVIEW_UPDATE = "microPreviewUpdate",
  MACRO_PREVIEW_UPDATE = "macroPreviewUpdate",
  GET_MICRO_PREVIEW = "getMicroPreview", // 请求动态微观预览
  GET_MACRO_PREVIEW = "getMacroPreview", // 请求宏观预览
  UPDATE_MICRO_PREVIEW = "updateMicroPreview", // 返回微观预览结果

  // 操作相关
  LOAD_WORKSPACE_CONFIG = "loadWorkspaceConfig",
  SAVE_CONFIG = "saveConfig",
  EXPORT_CONFIG = "exportConfig",
  IMPORT_CONFIG = "importConfig",
  RESET_CONFIG = "resetConfig",
  VALIDATE_CONFIG = "validateConfig",
  OPEN_CLANG_FORMAT_FILE = "openClangFormatFile",

  // 验证相关
  VALIDATION_RESULT = "validationResult",
  VALIDATION_ERROR = "validationError",

  // 设置相关
  UPDATE_SETTINGS = "updateSettings",
  SETTINGS_UPDATED = "settingsUpdated",

  // 预览编辑器状态相关
  PREVIEW_OPENED = "previewOpened", // 预览编辑器已打开
  PREVIEW_CLOSED = "previewClosed", // 预览编辑器被关闭
  REOPEN_PREVIEW = "reopenPreview", // 重新打开预览编辑器
  PREVIEW_REOPENED = "previewReopened", // 预览编辑器已成功重新打开
  PREVIEW_REOPEN_FAILED = "previewReopenFailed", // 预览编辑器重新打开失败

  // 交互联动相关
  CONFIG_OPTION_HOVER = "configOptionHover", // 配置项hover事件
  CONFIG_OPTION_FOCUS = "configOptionFocus", // 配置项focus事件
  CLEAR_HIGHLIGHTS = "clearHighlights", // 清除高亮

  // 调试相关
  TEST_PLACEHOLDER = "testPlaceholder", // 调试功能：测试占位符

  // 生命周期
  WEBVIEW_READY = "webview-ready", // Webview 已准备就绪
}

// 基础 Webview 消息接口
export interface WebviewMessage {
  type: WebviewMessageType;
  payload?: any;
  instanceId?: string; // 实例标识，支持多实例
}

// 配置变更消息
export interface ConfigChangedMessage extends WebviewMessage {
  type: WebviewMessageType.CONFIG_CHANGED;
  payload: {
    key: string;
    value: any;
  };
}

// 配置加载消息
export interface ConfigLoadedMessage extends WebviewMessage {
  type: WebviewMessageType.CONFIG_LOADED;
  payload: {
    config: Record<string, any>;
  };
}

// 预览更新消息
export interface PreviewUpdateMessage extends WebviewMessage {
  type:
    | WebviewMessageType.MICRO_PREVIEW_UPDATE
    | WebviewMessageType.MACRO_PREVIEW_UPDATE;
  payload: {
    formattedCode: string;
    success: boolean;
    error?: string;
    key?: string; // For micro preview
  };
}

// 设置消息
export interface SettingsMessage extends WebviewMessage {
  type:
    | WebviewMessageType.UPDATE_SETTINGS
    | WebviewMessageType.SETTINGS_UPDATED;
  payload: {
    showGuideButton?: boolean;
  };
}
