/**
 * 配置相关类型定义
 * 统一管理所有配置相关的类型和接口
 */

// 重新导出共享类型，保持向后兼容
export {
  AppState, ClangFormatConfig, ClangFormatOption, CONFIG_CATEGORIES_ARRAY, ConfigCategories, GetOptionsByCategoryRequest,
  GetOptionsByCategoryResponse,
  InitializePayload, OptionComparator, OptionComparators, OptionFilter, OptionFilters, SearchOptionsRequest,
  SearchOptionsResponse, WebviewMessage, WebviewMessageType
} from './clang-format-shared';

// 导入类型用于本地接口定义

// EditorState is now defined in core.ts - this was a duplicate
// For visual editor specific state, use VisualEditorState from visual-editor/types.ts

// Import EditorState from core
import { EditorState } from './core';

// Instance state interface
export interface InstanceState {
  id: string;
  editorState: EditorState;
  panelState: {
    isVisible: boolean;
    viewColumn: number;
  };
}
