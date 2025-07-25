/**
 * Webview相关类型定义
 * 统一管理所有Webview消息类型和接口
 *
 * 注意：WebviewMessageType 枚举已移至 clang-format-shared.ts 以避免重复定义
 * 请从 clang-format-shared.ts 导入 WebviewMessageType
 */

// 重新导出 WebviewMessageType 以保持向后兼容
export { WebviewMessageType } from './clang-format-shared';

// 重新导出 WebviewMessage 接口以保持向后兼容
export type { WebviewMessage } from './clang-format-shared';

// 重新导入 WebviewMessageType 以确保类型一致性
import { WebviewMessageType, WebviewMessage } from './clang-format-shared';

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
  | WebviewMessageType.UPDATE_MICRO_PREVIEW;
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
