/**
 * 前端类型定义 - 导入后端共享类型
 * 确保前后端类型完全一致
 */

// 导入后端共享类型
export type {
  ClangFormatOption,
  ClangFormatConfig,
  AppState as BackendAppState,
  WebviewMessage,
  SearchOptionsRequest,
  SearchOptionsResponse,
  GetOptionsByCategoryRequest,
  GetOptionsByCategoryResponse,
  InitializePayload,
  OptionFilter,
  OptionComparator,
} from '../../../../src/common/types/clang-format-shared';

// 导入枚举和常量
export {
  ConfigCategories,
  CONFIG_CATEGORIES_ARRAY,
  WebviewMessageType,
  OptionFilters,
  OptionComparators,
} from '../../../../src/common/types/clang-format-shared';

// 前端特有的AppState类型
export interface AppState {
  options: ClangFormatOption[];
  categories: string[];
  currentConfig: Record<string, any>;
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

// 前端特有的UI状态类型
export interface UIState {
  selectedCategory: string;
  searchQuery: string;
  mode: 'quick' | 'full' | 'search';
  isLoading: boolean;
  error: string | null;
}

// 组件Props类型
export interface ConfigPanelProps {
  options: ClangFormatOption[];
  categories: string[];
  microPreviews: Record<string, string>;
  settings: {
    showGuideButton?: boolean;
  };
  onConfigChange: (key: string, value: any) => void;
  onSettingsChange: (setting: string, value: any) => void;
  onPreviewRequest: (optionName: string, config: Record<string, any>, previewSnippet: string) => void;
  onOpenClangFormatFile?: () => void;
  dynamicPreviewResult?: {
    optionName: string;
    formattedCode: string;
    success: boolean;
    error?: string;
  };
  currentConfig: Record<string, any>;
  onConfigOptionHover?: (optionName: string) => void;
  onConfigOptionFocus?: (optionName: string) => void;
  onClearHighlights?: () => void;
}

export interface QuickSetupProps {
  options: ClangFormatOption[];
  config: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onOpenClangFormatFile?: () => void;
}

export interface SearchConfigProps {
  options: ClangFormatOption[];
  searchQuery: string;
  config: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export interface MainConfigInterfaceProps {
  options: ClangFormatOption[];
  categories: string[];
  currentConfig: Record<string, any>;
  onConfigChange: (key: string, value: any) => void;
  onPreviewRequest?: (optionName: string, config: Record<string, any>, previewSnippet: string) => void;
  previewResult?: {
    optionName: string;
    formattedCode: string;
    success: boolean;
    error?: string;
  };
  showGuide?: boolean;
  selectedCategory?: string;
}

export interface QuickSetupPanelProps {
  options: ClangFormatOption[];
  currentConfig: Record<string, any>;
  onConfigChange: (key: string, value: any) => void;
  onPreviewRequest?: (optionName: string, config: Record<string, any>, previewSnippet: string) => void;
  previewResult?: {
    optionName: string;
    formattedCode: string;
    success: boolean;
    error?: string;
  };
  showGuide?: boolean;
}

// 前端工具函数类型
export interface DataService {
  getAllOptions(): Promise<ClangFormatOption[]>;
  getOptionsByCategory(category: string): Promise<ClangFormatOption[]>;
  searchOptions(query: string): Promise<ClangFormatOption[]>;
  getCategories(): Promise<string[]>;
}

// 重新导入类型以便使用
import type { ClangFormatOption } from '../../../../src/common/types/clang-format-shared';
