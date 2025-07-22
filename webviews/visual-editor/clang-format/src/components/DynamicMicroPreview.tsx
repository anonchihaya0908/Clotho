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
    const [currentTheme, setCurrentTheme] = useState(
        typeof window !== 'undefined' ?
            (window as any).vscodeTheme?.isDark ? 'dark' : 'light' : 'dark'
    );

    // 监听主题变化
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.command === 'themeChanged') {
                const newTheme = event.data.isDark ? 'dark' : 'light';
                console.log('🎨 DynamicMicroPreview received theme change:', newTheme);
                setCurrentTheme(newTheme);

                // 重新应用高亮
                if (codeRef.current && (formattedCode || option.previewSnippet)) {
                    forceHighlight();
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [formattedCode, option.previewSnippet]);

    // 强制重新高亮
    const forceHighlight = () => {
        if (codeRef.current) {
            const codeToHighlight = formattedCode || option.previewSnippet || '';
            if (codeToHighlight) {
                try {
                    // 1. 彻底清理之前的状态
                    codeRef.current.removeAttribute('data-highlighted');
                    codeRef.current.className = 'language-cpp hljs micro-preview-code';
                    codeRef.current.innerHTML = '';

                    // 2. 设置新的文本内容
                    codeRef.current.textContent = codeToHighlight;

                    // 3. 应用高亮
                    hljs.highlightElement(codeRef.current);

                    console.log('🎨 DynamicMicroPreview force highlight completed for theme:', currentTheme);
                } catch (error) {
                    console.error('❌ DynamicMicroPreview force highlight failed:', error);
                }
            }
        }
    };

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

    // 高亮显示代码 - 增强版
    useEffect(() => {
        console.log('🎨 DynamicMicroPreview useEffect triggered');
        console.log('📝 Option:', option.key);
        console.log('📊 formattedCode length:', formattedCode?.length || 0);
        console.log('🔧 highlight.js available:', !!hljs);
        console.log('💡 C++ language registered:', hljs.getLanguage('cpp') !== undefined);

        if (codeRef.current && formattedCode) {
            try {
                // 1. 彻底清理之前的状态
                codeRef.current.removeAttribute('data-highlighted');
                codeRef.current.className = 'language-cpp hljs micro-preview-code';
                codeRef.current.innerHTML = '';

                // 2. 预处理代码
                const cleanCode = formattedCode.trim();
                console.log(`🧹 Cleaning code for ${option.key}:`, cleanCode.substring(0, 50) + '...');

                // 3. 执行语法高亮
                const result = hljs.highlight(cleanCode, {
                    language: 'cpp',
                    ignoreIllegals: true
                });

                console.log(`✨ ${option.key} highlight result:`, result.language);
                console.log(`🎨 ${option.key} highlighted classes:`, (result.value.match(/class="hljs-\w+"/g) || []).length);

                // 4. 应用高亮结果
                codeRef.current.innerHTML = result.value;

                // 5. 验证应用结果
                const highlightedElements = codeRef.current.querySelectorAll('[class*="hljs-"]');
                console.log(`🌈 ${option.key} total highlighted elements:`, highlightedElements.length);

                console.log(`✅ ${option.key} micro preview highlight applied successfully`);
            } catch (error) {
                console.error(`❌ ${option.key} micro preview highlight error:`, error);
                // 降级到普通文本
                if (codeRef.current) {
                    codeRef.current.textContent = formattedCode;
                    codeRef.current.className = 'language-cpp hljs hljs-fallback micro-preview-code';
                }
            }
        } else if (codeRef.current) {
            // 清空内容
            codeRef.current.innerHTML = '';
            console.log(`🧽 ${option.key} micro preview cleared`);
        }
    }, [formattedCode, option.key]);

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
            </h4>
            <pre className="micro-code-preview">
                <code
                    ref={codeRef}
                    id={`micro-preview-code-${option.name}`}
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
            <h4>Preview:</h4>
            <pre className="micro-code-preview">
                <code
                    ref={codeRef}
                    id={`micro-preview-code-static-${Math.random().toString(36).substr(2, 9)}`}
                    className="language-cpp"
                >
                    {/* 内容将通过 innerHTML 设置 */}
                </code>
            </pre>
        </div>
    );
};
