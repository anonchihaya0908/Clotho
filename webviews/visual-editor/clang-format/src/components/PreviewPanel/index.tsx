/**
 * Preview Panel Component - 宏观预览面板
 * 简化版本：直接显示VS Code预览，不需要HTML模拟
 */

import React from 'react';

export interface PreviewPanelProps {
    macroPreview: string;
    isValid: boolean;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
    macroPreview,
    isValid
}) => {
    return (
        <div className="preview-panel">
            <div className="preview-header">
                <h3>代码预览</h3>
                <span className={`validation-indicator ${isValid ? 'valid' : 'invalid'}`}>
                    {isValid ? ' 有效配置' : ' 无效配置'}
                </span>
            </div>
            <div className="preview-content">
                <div className="preview-notice">
                    <p> 代码预览已在VS Code编辑器中实时显示</p>
                    <p> 配置更改会立即应用到右侧预览编辑器</p>
                    {!isValid && (
                        <div className="error-notice">
                             当前配置无效，请检查设置
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
