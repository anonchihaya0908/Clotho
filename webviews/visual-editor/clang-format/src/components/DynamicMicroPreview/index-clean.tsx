import React, { useRef, useEffect, useState } from 'react';
import { ClangFormatOption } from '../../data/clangFormatOptions';
import { highlightCode, isHighlightJSLoaded } from '../../utils/highlight-loader';

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
    const codeRef = useRef<HTMLElement>(null);
    const [currentTheme, setCurrentTheme] = useState('dark');
    const [isLoading, setIsLoading] = useState(false);

    // 监听VS Code主题变化
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.type === 'themeChanged') {
                const newTheme = message.theme;
                setCurrentTheme(newTheme);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

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

    // 异步高亮代码
    const highlightCodeAsync = async (code: string) => {
        if (!codeRef.current) return;

        setIsLoading(true);
        try {
            codeRef.current.className = 'language-cpp hljs';
            const highlighted = await highlightCode(code, 'cpp');
            if (codeRef.current) {
                codeRef.current.innerHTML = highlighted;
            }
        } catch (error) {
            console.error('Dynamic micro preview highlight error:', error);
            if (codeRef.current) {
                codeRef.current.textContent = code;
            }
        } finally {
            setIsLoading(false);
        }
    };

    // 处理预览结果变化
    useEffect(() => {
        if (previewResult && previewResult.optionName === option.key) {
            const { formattedCode, success, error } = previewResult;

            if (success && formattedCode) {
                // 清理代码（移除多余空行和格式）
                const cleanCode = formattedCode
                    .replace(/^\s*\n/gm, '') // 移除空行
                    .replace(/\n\s*\n/g, '\n') // 合并多个空行
                    .trim();

                highlightCodeAsync(cleanCode);
            } else if (error) {
                if (codeRef.current) {
                    codeRef.current.textContent = `Error: ${error}`;
                    codeRef.current.className = 'error';
                }
            }
        }
    }, [previewResult, option.key]);

    // 初始化和配置变更时请求预览
    useEffect(() => {
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

    return (
        <div className="dynamic-micro-preview">
            <div className="preview-header">
                <span className="preview-label">Preview</span>
                {isLoading && <span className="loading-indicator">⏳</span>}
            </div>
            <div className="preview-container">
                <pre className="micro-preview-code">
                    <code ref={codeRef} className="language-cpp">
                        {/* 初始显示原始代码片段 */}
                        {getPreviewSnippet(option)}
                    </code>
                </pre>
            </div>
        </div>
    );
};

export default DynamicMicroPreview;
