/**
 * Main App Component for Clang-Format Editor
 */

import React, { useState, useEffect, useCallback } from 'react';
import { WebviewMessageType } from '../../../../src/common/types/webview'; // 导入消息类型
import { ConfigPanel } from './components/ConfigPanel';

import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';

export interface AppProps {
    vscode: any;
}

export interface AppState {
    options: any[];
    categories: string[];
    currentConfig: Record<string, any>;
    microPreviews: Record<string, string>;
    isLoading: boolean;
    error: string | null;
    validationState: {
        isValid: boolean;
        error?: string;
        warnings?: string[];
    };
    settings: {
        showGuideButton: boolean;
    };
    dynamicPreviewResult?: {
        optionName: string;
        formattedCode: string;
        success: boolean;
        error?: string;
    };
    previewState: {
        isOpen: boolean;
        showPlaceholder: boolean;
        isReopening: boolean;
    };
}

export const App: React.FC<AppProps> = ({ vscode }) => {
    const [state, setState] = useState<AppState>({
        options: [],
        categories: [],
        currentConfig: {},
        microPreviews: {},
        isLoading: true,
        error: null,
        validationState: { isValid: true },
        settings: { showGuideButton: true },
        previewState: { isOpen: true, showPlaceholder: false, isReopening: false }
    });

    // 发送消息到 VS Code
    const sendMessage = useCallback((type: WebviewMessageType, payload?: any) => {
        console.log('🔍 DEBUG: Sending message to VS Code:', type, payload);
        vscode.postMessage({ type, payload });
    }, [vscode]);

    // 处理配置变更
    const handleConfigChange = useCallback((key: string, value: any) => {
        setState(prev => ({
            ...prev,
            currentConfig: { ...prev.currentConfig, [key]: value }
        }));

        sendMessage(WebviewMessageType.CONFIG_CHANGED, { key, value });
    }, [sendMessage]);

    // 处理设置变更
    const handleSettingsChange = useCallback((setting: string, value: any) => {
        setState(prev => ({
            ...prev,
            settings: { ...prev.settings, [setting]: value }
        }));

        sendMessage(WebviewMessageType.UPDATE_SETTINGS, { [setting]: value });
    }, [sendMessage]);

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
                sendMessage(WebviewMessageType.RESET_CONFIG);
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

            switch (message.type) {
                case WebviewMessageType.INITIALIZE:
                    setState(prev => ({
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
                    setState(prev => ({
                        ...prev,
                        currentConfig: message.payload.config
                    }));
                    break;

                case WebviewMessageType.MICRO_PREVIEW_UPDATE:
                    setState(prev => ({
                        ...prev,
                        microPreviews: {
                            ...prev.microPreviews,
                            [message.payload.key]: message.payload.formattedCode
                        }
                    }));
                    break;

                case WebviewMessageType.VALIDATION_RESULT:
                    setState(prev => ({
                        ...prev,
                        validationState: message.payload
                    }));
                    break;

                case WebviewMessageType.VALIDATION_ERROR:
                    setState(prev => ({
                        ...prev,
                        validationState: {
                            isValid: false,
                            error: message.payload.error
                        }
                    }));
                    break;

                case WebviewMessageType.SETTINGS_UPDATED:
                    setState(prev => ({
                        ...prev,
                        settings: {
                            ...prev.settings,
                            ...message.payload
                        }
                    }));
                    break;

                case WebviewMessageType.UPDATE_MICRO_PREVIEW:
                    setState(prev => ({
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
                    console.log('🔍 DEBUG: Received previewOpened message');
                    setState(prev => ({
                        ...prev,
                        previewState: {
                            isOpen: true,
                            showPlaceholder: false,
                            isReopening: false
                        }
                    }));
                    break;

                case WebviewMessageType.PREVIEW_CLOSED:
                    console.log('🔍 DEBUG: Received previewClosed message');
                    setState(prev => ({
                        ...prev,
                        previewState: {
                            isOpen: false,
                            showPlaceholder: true,
                            isReopening: false
                        }
                    }));
                    break;

                case WebviewMessageType.PREVIEW_REOPENED:
                    setState(prev => ({
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
                    setState(prev => ({
                        ...prev,
                        previewState: {
                            isOpen: false,
                            showPlaceholder: true,
                            isReopening: false
                        }
                    }));
                    break;

                default:
                    console.warn('Unknown message type:', message.type);
            }
        };

        window.addEventListener('message', handleMessage);

        // 监听webview即将卸载，这时显示占位符
        const handleBeforeUnload = () => {
            console.log('🔍 DEBUG: Webview is about to unload, showing placeholder');
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
        console.log('🔍 Preview state changed:', state.previewState);
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
                    microPreviews={state.microPreviews}
                    settings={state.settings}
                    onConfigChange={handleConfigChange}
                    onSettingsChange={handleSettingsChange}
                    onPreviewRequest={handlePreviewRequest}
                    onOpenClangFormatFile={() => handleToolbarAction('openClangFormatFile')}
                    dynamicPreviewResult={state.dynamicPreviewResult}
                    currentConfig={state.currentConfig}
                    onConfigOptionHover={handleConfigOptionHover}
                    onConfigOptionFocus={handleConfigOptionFocus}
                    onClearHighlights={handleClearHighlights}
                />
            </div>

            <StatusBar
                validationState={state.validationState}
                configCount={Object.keys(state.currentConfig).length}
            />
        </div>
    );
};
