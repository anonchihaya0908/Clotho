/**
 * 配置相关类型定义
 * 统一管理所有配置相关的类型和接口
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
