/**
 * Preview Panel Component - 宏观预览面板
 */

import React, { useEffect, useRef, useState } from 'react';
import hljs from 'highlight.js/lib/core';
import cpp from 'highlight.js/lib/languages/cpp';

// 注册 C++ 语言
hljs.registerLanguage('cpp', cpp);

// 配置 highlight.js 以确保最佳渲染效果
hljs.configure({
    ignoreUnescapedHTML: true,
    throwUnescapedHTML: false,
    classPrefix: 'hljs-'
});

export interface PreviewPanelProps {
    macroPreview: string;
    isValid: boolean;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
    macroPreview,
    isValid
}) => {
    const codeRef = useRef<HTMLElement>(null);
    const [currentTheme, setCurrentTheme] = useState(
        typeof window !== 'undefined' ?
            (window as any).vscodeTheme?.isDark ? 'dark' : 'light' : 'dark'
    );

    // 监听主题变化
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.command === 'themeChanged') {
                const newTheme = event.data.isDark ? 'dark' : 'light';
                setCurrentTheme(newTheme);
                document.body.setAttribute('data-vscode-theme', newTheme);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // 应用语法高亮 - 最终稳定版
    // 使用 useLayoutEffect 确保在 DOM 绘制前同步执行高亮
    React.useLayoutEffect(() => {
        if (codeRef.current) {
            if (macroPreview) {
                try {
                    const result = hljs.highlight(macroPreview, {
                        language: 'cpp',
                        ignoreIllegals: true
                    });
                    codeRef.current.innerHTML = result.value;
                } catch (error) {
                    console.error('❌ Highlight failed:', error);
                    // Fallback to plain text
                    codeRef.current.textContent = macroPreview;
                }
            } else {
                // 清空内容
                codeRef.current.innerHTML = '';
            }
        }
        // 清理函数，在下次 effect 执行前清空，防止旧内容残留
        return () => {
            if (codeRef.current) {
                codeRef.current.innerHTML = '';
            }
        };
    }, [macroPreview, currentTheme]); // 依赖项

    return (
        <div className="preview-panel">
            <div className="preview-header">
                <h3>代码预览</h3>
                <span className={`validation-indicator ${isValid ? 'valid' : 'invalid'}`}>
                    {isValid ? '✓ 有效配置' : '✗ 无效配置'}
                </span>
            </div>
            <div className="preview-content">
                <pre className="code-preview">
                    <code
                        ref={codeRef}
                        id="macro-preview-code"
                        className="language-cpp hljs"
                    />
                </pre>
            </div>
        </div>
    );
};
