// 懒加载的highlight.js模块
import type { HLJSApi } from 'highlight.js';

let hljs: HLJSApi | null = null;
let isLoading = false;
let loadPromise: Promise<HLJSApi> | null = null;

export const loadHighlightJS = async (): Promise<HLJSApi> => {
    // 如果已经加载，直接返回
    if (hljs) {
        return hljs;
    }

    // 如果正在加载，返回加载Promise
    if (isLoading && loadPromise) {
        return loadPromise;
    }

    // 开始加载
    isLoading = true;
    loadPromise = (async () => {
        try {
            // 动态导入highlight.js
            const [hljsCore, cpp] = await Promise.all([
                import('highlight.js/lib/core'),
                import('highlight.js/lib/languages/cpp')
            ]);

            const hljsInstance = hljsCore.default;

            // 注册C++语言支持（如果还未注册）
            if (!hljsInstance.getLanguage('cpp')) {
                hljsInstance.registerLanguage('cpp', cpp.default);
            }

            hljs = hljsInstance;
            isLoading = false;
            return hljsInstance;
        } catch (error) {
            isLoading = false;
            throw new Error(`Failed to load highlight.js: ${error}`);
        }
    })();

    return loadPromise;
};

// 便捷的高亮函数
export const highlightCode = async (code: string, language: string = 'cpp'): Promise<string> => {
    try {
        const hljsInstance = await loadHighlightJS();
        const result = hljsInstance.highlight(code, { language });
        return result.value;
    } catch (error) {
        console.warn('Failed to highlight code:', error);
        // 降级返回原始代码
        return code;
    }
};

// 检查是否已加载
export const isHighlightJSLoaded = (): boolean => {
    return hljs !== null;
};
