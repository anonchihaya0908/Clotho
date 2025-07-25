// 静态导入highlight.js以避免CSP问题
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

// 便捷的高亮函数
export const highlightCode = async (code: string, language: string = 'cpp'): Promise<string> => {
    try {
        const hljsInstance = await loadHighlightJS();

        // 验证语言是否已注册
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
        // 降级返回HTML转义的代码
        return code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};

// 检查是否已加载
export const isHighlightJSLoaded = (): boolean => {
    return isInitialized;
};