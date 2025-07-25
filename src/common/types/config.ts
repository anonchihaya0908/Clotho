/**
 * 配置相关类型定义
 * 统一管理所有配置相关的类型和接口
 */

// 重新导出共享类型，保持向后兼容
export {
  ConfigCategories,
  CONFIG_CATEGORIES_ARRAY,
  ClangFormatOption,
  ClangFormatConfig,
  WebviewMessageType,
  AppState,
  WebviewMessage,
  SearchOptionsRequest,
  SearchOptionsResponse,
  GetOptionsByCategoryRequest,
  GetOptionsByCategoryResponse,
  InitializePayload,
  OptionFilter,
  OptionComparator,
  OptionFilters,
  OptionComparators,
} from './clang-format-shared';

// 导入类型用于本地接口定义
import { ClangFormatConfig } from './clang-format-shared';

// 编辑器状态接口
export interface EditorState {
  config: ClangFormatConfig;
  isPreviewOpen: boolean;
  previewUri?: string;
  isDirty: boolean;
}

// 实例状态接口
export interface InstanceState {
  id: string;
  editorState: EditorState;
  panelState: {
    isVisible: boolean;
    viewColumn: number;
  };
}
