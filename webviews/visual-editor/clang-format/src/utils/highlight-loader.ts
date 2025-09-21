// Static import of highlight.js to avoid CSP issues
import hljs from 'highlight.js/lib/core';
import cpp from 'highlight.js/lib/languages/cpp';
import { webviewLog } from './webview-logger';

// 注册C++语言支持
hljs.registerLanguage('cpp', cpp);

let isInitialized = false;

export const loadHighlightJS = async (): Promise<typeof hljs> => {
    if (!isInitialized) {
        // 确保语言已注册
        if (!hljs.getLanguage('cpp')) {
            hljs.registerLanguage('cpp', cpp);
        }
        isInitialized = true;
    }
    return hljs;
};

// Convenient highlight function
export const highlightCode = async (code: string, language: string = 'cpp'): Promise<string> => {
    try {
        const hljsInstance = await loadHighlightJS();

        // Verify if language is registered
        if (!hljsInstance.getLanguage(language)) {
            webviewLog.warn('Language not registered, falling back to auto detection', {
                language,
                component: 'HighlightLoader'
            });
            const result = hljsInstance.highlightAuto(code);
            return result.value;
        }

        const result = hljsInstance.highlight(code, { language });
        return result.value;
    } catch (error) {
        webviewLog.warn('Failed to highlight code', {
            language,
            component: 'HighlightLoader',
            error: error instanceof Error ? error.message : String(error)
        });
        // Fallback to HTML-escaped code
        return code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};

// Check if already loaded
export const isHighlightJSLoaded = (): boolean => {
    return isInitialized;
};