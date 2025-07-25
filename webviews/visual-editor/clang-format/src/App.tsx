/**
 * Main App Component for Clang-Format Editor
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
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
    // 初始化 webview logger
    React.useEffect(() => {
        initializeWebviewLogger(vscode, {
            enableConsoleOutput: true,
            logLevel: 'debug'
        });
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

    // 发送消息到 VS Code
    const sendMessage = useCallback((type: WebviewMessageType, payload?: any) => {
        webviewLog.debug('Sending message to VS Code', { type, payload });
        vscode.postMessage({ type, payload });
    }, [vscode]);

    // 处理配置变更
    const handleConfigChange = useCallback((key: string, value: any) => {
        setState((prev: WebviewAppState) => ({
            ...prev,
            currentConfig: { ...prev.currentConfig, [key]: value }
        }));

        sendMessage(WebviewMessageType.CONFIG_CHANGED, { key, value });
    }, [sendMessage]);

    // 设置处理已移除，预览始终显示

    // 处理动态预览请求
    const handlePreviewRequest = useCallback((optionName: string, config: Record<string, any>, previewSnippet: string) => {
        sendMessage(WebviewMessageType.GET_MICRO_PREVIEW, { optionName, config, previewSnippet });
    }, [sendMessage]);

    // 处理配置项hover事件
    const handleConfigOptionHover = useCallback((optionName: string) => {
        sendMessage(WebviewMessageType.CONFIG_OPTION_HOVER, { optionName });
    }, [sendMessage]);

    // 处理配置项focus事件
    const handleConfigOptionFocus = useCallback((optionName: string) => {
        sendMessage(WebviewMessageType.CONFIG_OPTION_FOCUS, { optionName });
    }, [sendMessage]);

    // 处理清除高亮
    const handleClearHighlights = useCallback(() => {
        sendMessage(WebviewMessageType.CLEAR_HIGHLIGHTS);
    }, [sendMessage]);

    // 处理工具栏操作
    const handleToolbarAction = useCallback((action: string) => {
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
            case 'import':
                sendMessage(WebviewMessageType.IMPORT_CONFIG);
                break;
            case 'reset':
                // 设置重置标志
                setState(prev => ({ ...prev, isConfigReset: true }));
                sendMessage(WebviewMessageType.RESET_CONFIG);
                // 3秒后清除重置标志
                setTimeout(() => {
                    setState(prev => ({ ...prev, isConfigReset: false }));
                }, 3000);
                break;
            case 'openClangFormatFile':
                sendMessage(WebviewMessageType.OPEN_CLANG_FORMAT_FILE);
                break;
        }
    }, [sendMessage]);

    // 监听来自 VS Code 的消息
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            webviewLog.debug('Received message from VS Code', {
                messageType: message.type,
                message
            });

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
                    setState((prev: WebviewAppState) => ({
                        ...prev,
                        microPreviews: {
                            ...prev.microPreviews,
                            [message.payload.key]: message.payload.formattedCode
                        }
                    }));
                    break;

                case WebviewMessageType.VALIDATION_RESULT:
                    setState((prev: WebviewAppState) => ({
                        ...prev,
                        validationState: message.payload
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
                            error: message.payload.error
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
        };

        window.addEventListener('message', handleMessage);

        // 监听webview即将卸载，这时显示占位符
        const handleBeforeUnload = () => {
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
        <div className={`app ${state.previewState.showPlaceholder ? '' : ''}`}>
            <Toolbar onAction={handleToolbarAction} />

            <div className="app-content">
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
            </div>

            <StatusBar
                validationState={state.validationState}
                configCount={Object.keys(state.currentConfig).length}
            />
        </div>
    );
};
