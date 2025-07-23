/**
 * 配置相关类型定义
 * 统一管理所有配置相关的类型和接口
 */

// 配置分类枚举
export enum ConfigCategories {
    GENERAL = 'General',
    ALIGNMENT = 'Alignment',
    BRACES = 'Braces',
    SPACING = 'Spacing',
    INDENTATION = 'Indentation',
    WRAPPING = 'Wrapping',
    COMMENTS = 'Comments'
}

// Clang-Format 配置选项接口
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