/**
 * 验证相关类型定义
 * 统一管理所有验证相关的类型和接口
 */

import { WebviewMessage, WebviewMessageType } from "./webview";

// 验证结果接口
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

// 配置验证结果接口
export interface ConfigValidationResult extends ValidationResult {
  // 可以扩展配置特定的验证属性
}

// 验证消息接口
export interface ValidationMessage extends WebviewMessage {
  type:
    | WebviewMessageType.VALIDATION_RESULT
    | WebviewMessageType.VALIDATION_ERROR;
  payload: ValidationResult;
}

// 格式化结果接口
export interface FormatResult {
  success: boolean;
  formattedCode: string;
  error?: string;
}
