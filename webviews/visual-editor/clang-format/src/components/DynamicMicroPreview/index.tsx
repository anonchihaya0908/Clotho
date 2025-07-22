import React from 'react';
import { ClangFormatOption } from '../../data/clangFormatOptions';

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
    // 获取配置项的预览代码片段
    const getPreviewSnippet = (option: ClangFormatOption): string => {
        if (option.previewSnippet) {
            return option.previewSnippet;
        }

        // 根据配置项类型生成合适的预览代码
        switch (option.key) {
            case 'IndentWidth':
            case 'TabWidth':
                return `int function() {\n    if (condition) {\n        return value;\n    }\n}`;
            case 'BreakBeforeBraces':
                return `class MyClass {\npublic:\n    void method() {\n        if (true) {\n            statement;\n        }\n    }\n};`;
            case 'ColumnLimit':
                return `void function(int param1, int param2, int param3, int param4, int param5) { return; }`;
            case 'PointerAlignment':
                return `int* ptr;\nchar* buffer;\nvoid function(int* param);`;
            case 'SpaceBeforeParens':
                return `if (condition) {\n    function();\n    while (true) continue;\n}`;
            default:
                return `// Preview for ${option.key}\nint example() {\n    return 0;\n}`;
        }
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
