/**
 * Preview Panel Component - 宏观预览面板
 */

import React, { useEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import cpp from 'highlight.js/lib/languages/cpp';

// 注册 C++ 语言
hljs.registerLanguage('cpp', cpp);

export interface PreviewPanelProps {
    macroPreview: string;
    isValid: boolean;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
    macroPreview,
    isValid
}) => {
    const codeRef = useRef<HTMLElement>(null);

    // 生成Markdown格式的代码
    const generateMarkdownCode = (code: string) => {
        if (!code) return '';
        return `\`\`\`cpp\n${code}\n\`\`\``;
    };

    // 应用语法高亮
    useEffect(() => {
        if (codeRef.current) {
            if (macroPreview) {
                try {
                    // 强制清除之前的内容和属性
                    codeRef.current.removeAttribute('data-highlighted');
                    codeRef.current.className = 'language-cpp hljs';

                    // 使用 highlight.js 高亮代码
                    const result = hljs.highlight(macroPreview, {
                        language: 'cpp',
                        ignoreIllegals: true
                    });

                    // 设置高亮后的 HTML
                    codeRef.current.innerHTML = result.value;

                    console.log('Preview panel highlight applied successfully');
                } catch (error) {
                    console.error('Preview panel highlight error:', error);
                    // 降级到普通文本
                    codeRef.current.textContent = macroPreview;
                }
            } else {
                // 如果没有预览内容，则清空
                codeRef.current.innerHTML = '';
            }
        }
    }, [macroPreview]);

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
                    <code
                        ref={codeRef}
                        className="language-cpp"
                    >
                        {/* 内容将通过 innerHTML 设置 */}
                    </code>
                </pre>
            </div>
        </div>
    );
};
