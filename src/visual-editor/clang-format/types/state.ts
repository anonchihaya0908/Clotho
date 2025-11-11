/**
 * Visual Editor State Type Definitions
 * 提供类型安全的状态管理接口
 */

import * as vscode from 'vscode';

/**
 * 预览模式枚举
 */
export type PreviewMode = 'open' | 'closed' | 'hidden';

/**
 * Visual Editor 完整状态接口
 */
export interface VisualEditorState {
  // 编辑器状态
  isVisible: boolean;
  isInitialized: boolean;

  // 预览相关
  previewMode: PreviewMode;
  previewUri?: vscode.Uri;
  previewEditor?: vscode.TextEditor;

  // 配置状态
  currentConfig: Record<string, unknown>;

  // 错误状态
  lastError?: {
    code: string;
    message: string;
    timestamp: number;
  };
}

/**
 * 状态更新的部分接口
 */
export type PartialVisualEditorState = Partial<VisualEditorState>;

/**
 * 类型守卫：检查是否为有效的 VisualEditorState
 */
export function isVisualEditorState(state: unknown): state is VisualEditorState {
  if (!state || typeof state !== 'object') {
    return false;
  }

  const s = state as Partial<VisualEditorState>;

  // 检查必需字段
  return (
    typeof s.isVisible === 'boolean' &&
    typeof s.isInitialized === 'boolean' &&
    (s.previewMode === undefined ||
     s.previewMode === 'open' ||
     s.previewMode === 'closed' ||
     s.previewMode === 'hidden')
  );
}

/**
 * 创建默认状态
 */
export function createDefaultState(): VisualEditorState {
  return {
    isVisible: false,
    isInitialized: false,
    previewMode: 'closed',
    currentConfig: {},
  };
}

/**
 * 安全地获取状态
 */
export function getStateOrDefault(state: unknown): VisualEditorState {
  if (isVisualEditorState(state)) {
    return state;
  }
  return createDefaultState();
}
