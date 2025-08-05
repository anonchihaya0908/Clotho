import React from 'react';
import { ClangFormatOption } from '../../types';

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
    isConfigReset?: boolean; // 新增：标识配置是否被重置
}

const DynamicMicroPreview: React.FC<DynamicMicroPreviewProps> = ({
    option,
    currentConfig,
    onPreviewRequest,
    previewResult,
    isConfigReset = false
}) => {
    // 获取配置项的预览代码片段 - 直接使用数据库中的 previewTemplate
    const getPreviewSnippet = (option: ClangFormatOption): string => {
        // 优先使用数据库中的专用预览模板
        if (option.previewTemplate) {
            return option.previewTemplate;
        }

        // 如果没有专用模板，返回通用默认模板
        return `// ${option.name} 预览
void function() {
    // 此选项的效果将在这里显示
    statement;
}`;
    };

    // 获取预览代码片段
    const previewSnippet = getPreviewSnippet(option);

    // 触发预览请求
    React.useEffect(() => {
        if (onPreviewRequest && previewSnippet) {
            onPreviewRequest(option.key, currentConfig, previewSnippet);
        }
    }, [option.key, currentConfig, onPreviewRequest, previewSnippet]);

    // 如果没有预览代码片段，显示占位符（这种情况现在应该很少见）
    if (!previewSnippet) {
        return (
            <div className="dynamic-micro-preview no-preview">
                <span className="no-preview-text">No preview available</span>
            </div>
        );
    }

    const resultStatus = previewResult?.optionName === option.key ?
        (previewResult.success ? '' : '') : '⏳';

    const statusColor = previewResult?.optionName === option.key ?
        (previewResult.success ? 'green' : 'red') : 'orange';

    // 检查是否有格式化结果
    const hasFormattedResult = previewResult?.optionName === option.key && previewResult.success;
    const hasError = previewResult?.optionName === option.key && previewResult.error;

    // 检查格式化前后是否有差异
    const hasVisibleChange = hasFormattedResult &&
        previewResult.formattedCode.trim() !== previewSnippet.trim();

    // 决定显示的代码内容
    const displayCode = hasFormattedResult ? previewResult.formattedCode : previewSnippet;

    // 决定样式类名 - 如果配置被重置，则不显示修改样式
    const previewClassName = `micro-code-preview ${(hasVisibleChange && !isConfigReset) ? 'modified' : ''}`;

    return (
        <div className="dynamic-micro-preview">
            <div className="preview-header">
                <span className="preview-label">
                    微观预览 - {option.name}
                </span>
                <span className="preview-status" style={{ color: statusColor }}>
                    {resultStatus}
                </span>
            </div>

            {/* 显示当前配置值 */}
            {currentConfig[option.key] !== undefined && (
                <div className="config-value-display">
                    <span className="config-key">{option.key}:</span>
                    <span className="config-value">
                        {JSON.stringify(currentConfig[option.key])}
                    </span>
                </div>
            )}

            {/* 显示代码预览 - 统一显示一套代码，用背景色表示状态 */}
            <div className={previewClassName}>
                <div className="code-label">
                    {hasVisibleChange ? '格式化后' : '示例代码'}
                    {hasFormattedResult && !hasVisibleChange && ' (无变化)'}
                </div>
                <pre><code>{displayCode}</code></pre>
            </div>

            <div className="preview-notice">
                <p> 完整预览在VS Code编辑器中显示</p>
                {hasError && (
                    <div className="error-notice">
                         {previewResult.error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DynamicMicroPreview;
