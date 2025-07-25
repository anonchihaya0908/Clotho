import React from 'react';
import { ClangFormatOption } from '../../data/clangFormatOptions';

// 预览服务 - 在 webview 中的简化版本
class WebviewPreviewService {
    private static readonly PREVIEW_TEMPLATES = {
        // 对齐相关预览模板
        ALIGNMENT: {
            BRACKET_ALIGN: `function(argument1,
         argument2,
         argument3);`,

            CONSECUTIVE_ASSIGNMENTS: `int a = 1;
int bb = 2;
int ccc = 3;`,

            CONSECUTIVE_DECLARATIONS: `int a;
int bb;
int ccc;`,

            MACRO_DEFINITIONS: `#define A 1
#define BB 2
#define CCC 3`,
        },

        // 大括号相关预览模板
        BRACES: {
            BRACE_WRAPPING: `if (condition) {
  statement;
}`,

            BREAK_BEFORE_BRACES: `if (condition)
{
  statement;
}`,
        },

        // 间距相关预览模板
        SPACING: {
            SPACES_AROUND_OPERATORS: `a = b + c;
x *= y;`,

            SPACES_IN_BRACKETS: `array[index];
func(arg1, arg2);`,

            SPACES_IN_PARENTHESES: `if ( condition ) {
  func( argument );
}`,
        },

        // 缩进相关预览模板
        INDENTATION: {
            TAB_WIDTH: `function() {
\tstatement1;
\tstatement2;
}`,

            INDENT_WIDTH: `if (condition) {
  statement1;
  statement2;
}`,
        },

        // 换行相关预览模板
        WRAPPING: {
            COLUMN_LIMIT: `// This is a very long comment that might exceed the column limit
function veryLongFunctionName(parameter1, parameter2, parameter3);`,

            ALLOW_SHORT_FUNCTIONS: `int getX() { return x; }
int getLongFunctionName() {
  return value;
}`,
        },

        // 通用模板
        GENERAL: {
            DEFAULT: `void function() {
  if (condition) {
    statement;
  }
}`,
        },
    };

    public static generatePreviewCode(key: string): string {
        const keyLower = key.toLowerCase();

        // 根据特定的配置项键名获取预览代码
        if (keyLower.includes('alignafteropen')) {
            return this.PREVIEW_TEMPLATES.ALIGNMENT.BRACKET_ALIGN;
        }
        if (keyLower.includes('alignconsecutiveassignments')) {
            return this.PREVIEW_TEMPLATES.ALIGNMENT.CONSECUTIVE_ASSIGNMENTS;
        }
        if (keyLower.includes('alignconsecutivedeclarations')) {
            return this.PREVIEW_TEMPLATES.ALIGNMENT.CONSECUTIVE_DECLARATIONS;
        }
        if (keyLower.includes('alignconsecutivemacros')) {
            return this.PREVIEW_TEMPLATES.ALIGNMENT.MACRO_DEFINITIONS;
        }
        if (keyLower.includes('bracewrapping') || keyLower.includes('wrapbraces')) {
            return this.PREVIEW_TEMPLATES.BRACES.BRACE_WRAPPING;
        }
        if (keyLower.includes('breakbeforebraces')) {
            return this.PREVIEW_TEMPLATES.BRACES.BREAK_BEFORE_BRACES;
        }
        if (keyLower.includes('spacesinparentheses')) {
            return this.PREVIEW_TEMPLATES.SPACING.SPACES_IN_PARENTHESES;
        }
        if (keyLower.includes('spacesinbrackets') || keyLower.includes('spacesinsquare')) {
            return this.PREVIEW_TEMPLATES.SPACING.SPACES_IN_BRACKETS;
        }
        if (keyLower.includes('spacearound') || keyLower.includes('spacebefore') || keyLower.includes('spaceafter')) {
            return this.PREVIEW_TEMPLATES.SPACING.SPACES_AROUND_OPERATORS;
        }
        if (keyLower.includes('tabwidth')) {
            return this.PREVIEW_TEMPLATES.INDENTATION.TAB_WIDTH;
        }
        if (keyLower.includes('indentwidth') || keyLower.includes('indent')) {
            return this.PREVIEW_TEMPLATES.INDENTATION.INDENT_WIDTH;
        }
        if (keyLower.includes('columnlimit')) {
            return this.PREVIEW_TEMPLATES.WRAPPING.COLUMN_LIMIT;
        }
        if (keyLower.includes('allowshort') && keyLower.includes('function')) {
            return this.PREVIEW_TEMPLATES.WRAPPING.ALLOW_SHORT_FUNCTIONS;
        }

        // 默认预览
        return this.PREVIEW_TEMPLATES.GENERAL.DEFAULT;
    }
}

interface DynamicMicroPreviewProps {
    option: ClangFormatOption;
    currentConfig: Record<string, any>;
    onPreviewRequest?: (optionName: string, config: Record<string, any>, previewSnippet: string) => void;
    previewResult?: {
        optionName: string;
        formattedCode: string;
        success: boolean;
        error?: string;
    };
}

const DynamicMicroPreview: React.FC<DynamicMicroPreviewProps> = ({
    option,
    currentConfig,
    onPreviewRequest,
    previewResult
}) => {
    // 获取配置项的预览代码片段 - 现在使用 PreviewService
    const getPreviewSnippet = (option: ClangFormatOption): string => {
        // 使用新的 PreviewService 生成预览代码
        return WebviewPreviewService.generatePreviewCode(option.key);
    };

    // 触发预览请求
    React.useEffect(() => {
        if (onPreviewRequest) {
            const previewSnippet = getPreviewSnippet(option);
            onPreviewRequest(option.key, currentConfig, previewSnippet);
        }
    }, [option.key, currentConfig, onPreviewRequest]);

    // 如果没有预览代码片段，显示占位符
    if (!option.previewSnippet && !getPreviewSnippet(option)) {
        return (
            <div className="dynamic-micro-preview no-preview">
                <span className="no-preview-text">No preview available</span>
            </div>
        );
    }

    const resultStatus = previewResult?.optionName === option.key ?
        (previewResult.success ? '✓' : '✗') : '⏳';

    const statusColor = previewResult?.optionName === option.key ?
        (previewResult.success ? 'green' : 'red') : 'orange';

    return (
        <div className="dynamic-micro-preview">
            <div className="preview-header">
                <span className="preview-label">Preview</span>
                <span className="preview-status" style={{ color: statusColor }}>
                    {resultStatus}
                </span>
            </div>
            <div className="preview-notice">
                <p>💡 实时预览在VS Code编辑器中显示</p>
                {previewResult?.optionName === option.key && previewResult.error && (
                    <div className="error-notice">
                        ⚠️ {previewResult.error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DynamicMicroPreview;
