/**
 * Preview Panel Component - 宏观预览面板
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
                <h3>Macro Preview</h3>
                <div className={`validation-indicator ${isValid ? 'valid' : 'invalid'}`}>
                    {isValid ? '✓ Valid' : '⚠ Invalid'}
                </div>
            </div>

            <div className="preview-content">
                <pre className="code-preview">
                    <code>{macroPreview}</code>
                </pre>
            </div>
        </div>
    );
};
