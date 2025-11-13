/**
 * Main App Component for Clang-Format Editor
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useDebounce, useMultiKeyDebounce, useIsMounted } from './hooks/useDebounce';
import { initializeWebviewLogger, webviewLog } from './utils/webview-logger';
import {
    ClangFormatOption,
    CONFIG_CATEGORIES_ARRAY,
    WebviewMessageType,
    AppState as WebviewAppState
} from './types';

import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';

export interface AppProps {
    vscode: any;
}

// 使用从types.ts导入的WebviewAppState

export const App: React.FC<AppProps> = ({ vscode }) => {
    // 组件挂载状态检查
    const isMountedRef = useIsMounted();

    // 初始化 webview logger - 使用 useMemo 避免重复初始化
    const loggerInitialized = useMemo(() => {
        initializeWebviewLogger(vscode, {
            enableConsoleOutput: true,
            logLevel: 'debug'
        });
        return true;
    }, [vscode]);

    const [state, setState] = useState<WebviewAppState>({
        options: [],
        categories: CONFIG_CATEGORIES_ARRAY,
        currentConfig: {},
        microPreviews: {},
        isLoading: true,
        error: null,
        validationState: { isValid: true, errors: [] },
        settings: { showGuideButton: true },
        previewState: { isOpen: true, showPlaceholder: false, isReopening: false },
        isConfigReset: false
    });

    // 发送消息到 VS Code - 优化依赖
    const sendMessage = useCallback((type: WebviewMessageType, payload?: any) => {
        webviewLog.debug('Sending message to VS Code', { type, payload });
        vscode.postMessage({ type, payload });
    }, [vscode]);

    // 立即更新配置状态（UI 响应）
    const updateConfigState = useCallback((key: string, value: any) => {
        if (!isMountedRef.current) return;

        setState((prev: WebviewAppState) => ({
            ...prev,
            currentConfig: { ...prev.currentConfig, [key]: value }
        }));
    }, [isMountedRef]);

    // 发送配置变更到后端（防抖）
    const sendConfigChange = useCallback((key: string, value: any) => {
        sendMessage(WebviewMessageType.CONFIG_CHANGED, { key, value });
    }, [sendMessage]);

    // 使用防抖 Hook 处理配置变更
    const debouncedSendConfigChange = useDebounce(sendConfigChange, 300);

    // 处理配置变更 - 立即更新 UI，防抖发送到后端
    const handleConfigChange = useCallback((key: string, value: any) => {
        updateConfigState(key, value);
        debouncedSendConfigChange(key, value);
    }, [updateConfigState, debouncedSendConfigChange]);

    // 设置处理已移除，预览始终显示

    // 发送预览请求到后端 - 修正函数签名以匹配 useMultiKeyDebounce
    const sendPreviewRequest = useCallback((key: string, config: Record<string, any>, previewSnippet: string) => {
        sendMessage(WebviewMessageType.GET_MICRO_PREVIEW, { optionName: key, config, previewSnippet });
    }, [sendMessage]);

    // 使用多键防抖 Hook 处理预览请求
    const debouncedSendPreviewRequest = useMultiKeyDebounce(sendPreviewRequest, 200);

    // 处理动态预览请求 - 使用防抖优化
    const handlePreviewRequest = useCallback((optionName: string, config: Record<string, any>, previewSnippet: string) => {
        debouncedSendPreviewRequest(optionName, config, previewSnippet);
    }, [debouncedSendPreviewRequest]);

    // 处理配置项hover事件
    const handleConfigOptionHover = useCallback((optionName: string) => {
        // 与 Host 侧契约保持一致：使用 key 字段
        sendMessage(WebviewMessageType.CONFIG_OPTION_HOVER, { key: optionName });
    }, [sendMessage]);

    // 处理配置项focus事件
    const handleConfigOptionFocus = useCallback((optionName: string) => {
        sendMessage(WebviewMessageType.CONFIG_OPTION_FOCUS, { key: optionName });
    }, [sendMessage]);

    // 处理清除高亮
    const handleClearHighlights = useCallback(() => {
        sendMessage(WebviewMessageType.CLEAR_HIGHLIGHTS);
    }, [sendMessage]);

    // 存储重置计时器引用以便清理
    const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

    // 处理工具栏操作 - 添加日志和错误处理
    const handleToolbarAction = useCallback((action: string) => {
        webviewLog.debug('Toolbar action triggered', { action });

        try {
            switch (action) {
                case 'load':
                    sendMessage(WebviewMessageType.LOAD_WORKSPACE_CONFIG);
                    break;
                case 'save':
                    sendMessage(WebviewMessageType.SAVE_CONFIG);
                    break;
                case 'export':
                    sendMessage(WebviewMessageType.EXPORT_CONFIG);
                    break;
                case 'validate':
                    sendMessage(WebviewMessageType.VALIDATE_REQUEST);
                    break;
                case 'dryRun':
                    sendMessage(WebviewMessageType.APPLY_ACTIVE_TEXT_PREVIEW);
                    break;
                case 'import':
                    sendMessage(WebviewMessageType.IMPORT_CONFIG);
                    break;
                case 'reset':
                    // 清理之前的计时器
                    if (resetTimerRef.current) {
                        clearTimeout(resetTimerRef.current);
                    }

                    // 设置重置标志
                    setState(prev => ({ ...prev, isConfigReset: true }));
                    sendMessage(WebviewMessageType.RESET_CONFIG);

                    // 3秒后清除重置标志 - 确保组件仍然挂载
                    resetTimerRef.current = setTimeout(() => {
                        if (isMountedRef.current) {
                            setState(prev => ({ ...prev, isConfigReset: false }));
                        }
                        resetTimerRef.current = null;
                    }, 3000);
                    break;
                case 'openClangFormatFile':
                    sendMessage(WebviewMessageType.OPEN_CLANG_FORMAT_FILE);
                    break;
                case 'previewSourceDemo':
                    sendMessage(WebviewMessageType.GET_MACRO_PREVIEW, { source: 'demoSnippet' }); sendMessage(WebviewMessageType.UPDATE_SETTINGS, { macroSource: 'demoSnippet' });
                    break;
                case 'previewSourceActive':
                    sendMessage(WebviewMessageType.GET_MACRO_PREVIEW, { source: 'activeFile' }); sendMessage(WebviewMessageType.UPDATE_SETTINGS, { macroSource: 'activeFile' });
                    break;
                default:
                    webviewLog.warn('Unknown toolbar action', { action });
            }
        } catch (error) {
            webviewLog.error('Error handling toolbar action', { action, error });
        }
    }, [sendMessage, isMountedRef]);

    // 监听来自 VS Code 的消息 - 添加内存泄漏防护
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // 检查组件是否仍然挂载
            if (!isMountedRef.current) {
                webviewLog.debug('Message received after component unmount, ignoring');
                return;
            }

            const message = event.data;
            if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
                webviewLog.warn('Malformed message from host, ignoring', { message });
                return;
            }
            webviewLog.debug('Received message from VS Code', {
                messageType: message.type,
                message
            });

            try {
                switch (message.type) {
                    case WebviewMessageType.INITIALIZE:
                        setState((prev: WebviewAppState) => ({
                            ...prev,
                            options: message.payload.options,
                            categories: message.payload.categories,
                            currentConfig: message.payload.currentConfig,
                            settings: message.payload.settings || prev.settings,
                            isLoading: false
                        }));
                        // 初始化完成后，不再使用 setTimeout，改由 useEffect 触发
                        break;

                    case WebviewMessageType.CONFIG_LOADED:
                        setState((prev: WebviewAppState) => ({
                            ...prev,
                            currentConfig: message.payload.config
                        }));
                        break;

                    case WebviewMessageType.MICRO_PREVIEW_UPDATE:
                        // 轻量校验
                        if (!message?.payload || typeof message.payload.optionName !== 'string') {
                            webviewLog.warn('MICRO_PREVIEW_UPDATE payload malformed', { payload: message?.payload });
                            break;
                        }
                        setState((prev: WebviewAppState) => ({
                            ...prev,
                            microPreviews: {
                                ...prev.microPreviews,
                                [message.payload.optionName]: message.payload.formattedCode
                            }
                        }));
                        break;

                    case WebviewMessageType.VALIDATION_RESULT:
                        if (!message?.payload || typeof message.payload.isValid !== 'boolean') {
                            webviewLog.warn('VALIDATION_RESULT payload malformed', { payload: message?.payload });
                            break;
                        }
                        setState((prev: WebviewAppState) => ({
                            ...prev,
                            validationState: {
                                isValid: !!message.payload.isValid,
                                errors: Array.isArray(message.payload.errors) ? message.payload.errors : []
                            }
                        }));
                        break;

                    case WebviewMessageType.VALIDATION_ERROR:
                        setState((prev: WebviewAppState) => ({
                            ...prev,
                            validationState: {
                                isValid: false,
                                errors: [message.payload.error]
                            }
                        }));
                        break;

                    case WebviewMessageType.SETTINGS_UPDATED:
                        if (!message?.payload || typeof message.payload !== 'object') {
                            webviewLog.warn('SETTINGS_UPDATED payload malformed', { payload: message?.payload });
                            break;
                        }
                        setState((prev: WebviewAppState) => ({
                            ...prev,
                            settings: {
                                ...prev.settings,
                                ...message.payload
                            }
                        }));
                        break;

                    case WebviewMessageType.UPDATE_MICRO_PREVIEW:
                        setState((prev: WebviewAppState) => ({
                            ...prev,
                            dynamicPreviewResult: {
                                optionName: message.payload.optionName,
                                formattedCode: message.payload.formattedCode,
                                success: message.payload.success,
                                error: message.payload.error,
                                matchType: message.payload.matchType
                            }
                        }));
                        break;

                    case WebviewMessageType.PREVIEW_OPENED:
                        webviewLog.debug('Received previewOpened message');
                        setState((prev: WebviewAppState) => ({
                            ...prev,
                            previewState: {
                                isOpen: true,
                                showPlaceholder: false,
                                isReopening: false
                            }
                        }));
                        break;

                    case WebviewMessageType.PREVIEW_CLOSED:
                        webviewLog.debug('Received previewClosed message');
                        setState((prev: WebviewAppState) => ({
                            ...prev,
                            previewState: {
                                isOpen: false,
                                showPlaceholder: true,
                                isReopening: false
                            }
                        }));
                        break;

                    case WebviewMessageType.PREVIEW_REOPENED:
                        setState((prev: WebviewAppState) => ({
                            ...prev,
                            previewState: {
                                isOpen: true,
                                showPlaceholder: false,
                                isReopening: false
                            }
                        }));
                        break;

                    case WebviewMessageType.PREVIEW_REOPEN_FAILED:
                        // 重新打开失败时，保持占位符显示
                        setState((prev: WebviewAppState) => ({
                            ...prev,
                            previewState: {
                                isOpen: false,
                                showPlaceholder: true,
                                isReopening: false
                            }
                        }));
                        break;

                    default:
                        webviewLog.warn('Unknown message type received', {
                            messageType: message.type,
                            message
                        });
                }
            } catch (error) {
                webviewLog.error('Error handling message', { message, error });
            }
        };

        window.addEventListener('message', handleMessage);

        // 监听webview即将卸载，这时显示占位符
        const handleBeforeUnload = () => {
            if (!isMountedRef.current) return;

            webviewLog.debug('Webview is about to unload, showing placeholder');
            setState(prev => ({
                ...prev,
                previewState: {
                    isOpen: false,
                    showPlaceholder: true,
                    isReopening: false
                }
            }));
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('message', handleMessage);
            window.removeEventListener('beforeunload', handleBeforeUnload);

            // 清理计时器
            if (resetTimerRef.current) {
                clearTimeout(resetTimerRef.current);
                resetTimerRef.current = null;
            }
        };
    }, [sendMessage]); // 依赖中加入 sendMessage

    // 当初始化加载完成后，向扩展发送 webview-ready 消息
    useEffect(() => {
        if (!state.isLoading) {
            sendMessage(WebviewMessageType.WEBVIEW_READY);
        }
    }, [state.isLoading, sendMessage]);

    // 调试：监听预览状态变化
    useEffect(() => {
        webviewLog.debug('Preview state changed', { previewState: state.previewState });
    }, [state.previewState]);

    if (state.isLoading) {
        return (
            <div className="app loading">
                <div className="loading-spinner">Loading...</div>
            </div>
        );
    }

    if (state.error) {
        return (
            <div className="app error">
                <div className="error-message">{state.error}</div>
            </div>
        );
    }

    return (
        <ErrorBoundary
            onError={(error, errorInfo) => {
                webviewLog.error('React Error Boundary caught error', { error, errorInfo });
            }}
        >
            <div className={`app ${state.previewState.showPlaceholder ? '' : ''}`}>
                <ErrorBoundary fallback={<div className="toolbar-error">工具栏加载失败</div>}>
                    <Toolbar onAction={handleToolbarAction} />
                </ErrorBoundary>

                <div className="app-content">
                    <ErrorBoundary fallback={<div className="config-panel-error">配置面板加载失败</div>}>
                        <ConfigPanel
                            options={state.options}
                            categories={state.categories}
                            microPreviews={state.microPreviews}
                            settings={state.settings}
                            onConfigChange={handleConfigChange}
                            onSettingsChange={() => { }} // 空函数，设置已移除
                            onPreviewRequest={handlePreviewRequest}
                            onOpenClangFormatFile={() => handleToolbarAction('openClangFormatFile')}
                            dynamicPreviewResult={state.dynamicPreviewResult}
                            currentConfig={state.currentConfig}
                            onConfigOptionHover={handleConfigOptionHover}
                            onConfigOptionFocus={handleConfigOptionFocus}
                            onClearHighlights={handleClearHighlights}
                            isConfigReset={state.isConfigReset}
                        />
                    </ErrorBoundary>
                </div>

                <ErrorBoundary fallback={<div className="status-bar-error">状态栏加载失败</div>}>
                    <StatusBar
                        validationState={state.validationState}
                        configCount={Object.keys(state.currentConfig).length}
                    />
                </ErrorBoundary>
            </div>
        </ErrorBoundary>
    );
};



