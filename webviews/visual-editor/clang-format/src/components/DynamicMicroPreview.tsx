import React, { useRef, useEffect, useState } from 'react';
import { ClangFormatOption } from '../data/clangFormatOptions';
import hljs from 'highlight.js/lib/core';
import cpp from 'highlight.js/lib/languages/cpp';

// 确保 C++ 语言已注册
if (!hljs.getLanguage('cpp')) {
    hljs.registerLanguage('cpp', cpp);
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

export const DynamicMicroPreview: React.FC<DynamicMicroPreviewProps> = ({
    option,
    currentConfig,
    onPreviewRequest,
    previewResult
}) => {
    const codeRef = useRef<HTMLElement>(null);
    const [formattedCode, setFormattedCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // 当配置或选项改变时，请求新的预览
    useEffect(() => {
        if (option.previewSnippet && onPreviewRequest) {
            setIsLoading(true);
            setError(null);
            onPreviewRequest(option.key, currentConfig, option.previewSnippet);
        }
    }, [option.key, option.previewSnippet, currentConfig, onPreviewRequest]);

    // 处理来自父组件的预览结果
    useEffect(() => {
        if (previewResult && previewResult.optionName === option.key) {
            setIsLoading(false);
            if (previewResult.success) {
                setFormattedCode(previewResult.formattedCode);
                setError(null);
            } else {
                setError(previewResult.error || 'Failed to generate preview');
                setFormattedCode(option.previewSnippet || '');
            }
        }
    }, [previewResult, option.key, option.previewSnippet]);

    // 高亮显示代码
    useEffect(() => {
        if (codeRef.current && formattedCode) {
            try {
                // 强制清除之前的内容和属性
                codeRef.current.removeAttribute('data-highlighted');
                codeRef.current.className = 'language-cpp hljs';

                // 使用 highlight.js 高亮代码
                const result = hljs.highlight(formattedCode, {
                    language: 'cpp',
                    ignoreIllegals: true
                });

                // 设置高亮后的 HTML
                codeRef.current.innerHTML = result.value;
            } catch (error) {
                console.error('Dynamic micro preview highlight error:', error);
                // 降级到普通文本
                codeRef.current.textContent = formattedCode;
            }
        }
    }, [formattedCode]);

    if (!option.previewSnippet) {
        return (
            <div className="micro-preview">
                <h4>Preview:</h4>
                <p className="no-preview">No preview available for this option</p>
            </div>
        );
    }

    return (
        <div className="micro-preview">
            <h4>
                Preview:
                {isLoading && <span className="loading-indicator"> ⟳</span>}
                {error && <span className="error-indicator"> ⚠️</span>}
                <button
                    className="copy-markdown-btn"
                    onClick={() => navigator.clipboard?.writeText(`\`\`\`cpp\n${formattedCode || option.previewSnippet}\n\`\`\``)}
                    title="复制Markdown代码"
                    style={{ marginLeft: '8px' }}
                >
                    📋 MD
                </button>
            </h4>
            <pre className="micro-code-preview">
                <code
                    ref={codeRef}
                    className="language-cpp"
                >
                    {/* 内容将通过 innerHTML 设置 */}
                </code>
            </pre>
            {error && (
                <div className="preview-error">
                    Error: {error}
                </div>
            )}
        </div>
    );
};

// 静态预览组件（作为后备）
export const StaticMicroPreview: React.FC<{ code: string }> = ({ code }) => {
    const codeRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (codeRef.current) {
            if (code) {
                try {
                    // 强制清除之前的内容和属性
                    codeRef.current.removeAttribute('data-highlighted');
                    codeRef.current.className = 'language-cpp hljs';

                    // 使用 highlight.js 高亮代码
                    const result = hljs.highlight(code, {
                        language: 'cpp',
                        ignoreIllegals: true
                    });

                    // 设置高亮后的 HTML
                    codeRef.current.innerHTML = result.value;
                } catch (error) {
                    console.error('Static micro preview highlight error:', error);
                    // 降级到普通文本
                    codeRef.current.textContent = code;
                }
            } else {
                codeRef.current.innerHTML = '';
            }
        }
    }, [code]);

    return (
        <div className="micro-preview">
            <h4>
                Preview:
                <button
                    className="copy-markdown-btn"
                    onClick={() => navigator.clipboard?.writeText(`\`\`\`cpp\n${code}\n\`\`\``)}
                    title="复制Markdown代码"
                    style={{ marginLeft: '8px' }}
                >
                    📋 MD
                </button>
            </h4>
            <pre className="micro-code-preview">
                <code
                    ref={codeRef}
                    className="language-cpp"
                >
                    {/* 内容将通过 innerHTML 设置 */}
                </code>
            </pre>
        </div>
    );
};
