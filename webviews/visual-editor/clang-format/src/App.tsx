/**
 * Main App Component for Clang-Format Editor
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { PreviewPlaceholder } from './components/PreviewPlaceholder';
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
    const sendMessage = useCallback((type: string, payload?: any) => {
        vscode.postMessage({ type, payload });
    }, [vscode]);

    // 处理配置变更
    const handleConfigChange = useCallback((key: string, value: any) => {
        setState(prev => ({
            ...prev,
            currentConfig: { ...prev.currentConfig, [key]: value }
        }));

        sendMessage('configChanged', { key, value });
    }, [sendMessage]);

    // 处理设置变更
    const handleSettingsChange = useCallback((setting: string, value: any) => {
        setState(prev => ({
            ...prev,
            settings: { ...prev.settings, [setting]: value }
        }));

        sendMessage('updateSettings', { [setting]: value });
    }, [sendMessage]);

    // 处理动态预览请求
    const handlePreviewRequest = useCallback((optionName: string, config: Record<string, any>, previewSnippet: string) => {
        sendMessage('getMicroPreview', { optionName, config, previewSnippet });
    }, [sendMessage]);

    // 处理配置项hover事件
    const handleConfigOptionHover = useCallback((optionName: string) => {
        sendMessage('configOptionHover', { optionName });
    }, [sendMessage]);

    // 处理配置项focus事件
    const handleConfigOptionFocus = useCallback((optionName: string) => {
        sendMessage('configOptionFocus', { optionName });
    }, [sendMessage]);

    // 处理清除高亮
    const handleClearHighlights = useCallback(() => {
        sendMessage('clearHighlights');
    }, [sendMessage]);

    // 处理工具栏操作
    const handleToolbarAction = useCallback((action: string) => {
        switch (action) {
            case 'load':
                sendMessage('loadWorkspaceConfig');
                break;
            case 'save':
                sendMessage('saveConfig');
                break;
            case 'export':
                sendMessage('exportConfig');
                break;
            case 'import':
                sendMessage('importConfig');
                break;
            case 'reset':
                sendMessage('resetConfig');
                break;
            case 'validate':
                sendMessage('validateConfig');
                break;
            case 'openClangFormatFile':
                sendMessage('openClangFormatFile');
                break;
        }
    }, [sendMessage]);

    // 监听来自 VS Code 的消息
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;

            switch (message.type) {
                case 'initialize':
                    setState(prev => ({
                        ...prev,
                        options: message.payload.options,
                        categories: message.payload.categories,
                        currentConfig: message.payload.currentConfig,
                        settings: message.payload.settings || prev.settings,
                        isLoading: false
                    }));
                    break;

                case 'configLoaded':
                    setState(prev => ({
                        ...prev,
                        currentConfig: message.payload.config
                    }));
                    break;

                case 'microPreviewUpdate':
                    setState(prev => ({
                        ...prev,
                        microPreviews: {
                            ...prev.microPreviews,
                            [message.payload.key]: message.payload.formattedCode
                        }
                    }));
                    break;

                case 'validationResult':
                    setState(prev => ({
                        ...prev,
                        validationState: message.payload
                    }));
                    break;

                case 'validationError':
                    setState(prev => ({
                        ...prev,
                        validationState: {
                            isValid: false,
                            error: message.payload.error
                        }
                    }));
                    break;

                case 'settingsUpdated':
                    setState(prev => ({
                        ...prev,
                        settings: {
                            ...prev.settings,
                            ...message.payload
                        }
                    }));
                    break;

                case 'updateMicroPreview':
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

                case 'previewOpened':
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

                case 'previewClosed':
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

                case 'previewReopened':
                    setState(prev => ({
                        ...prev,
                        previewState: {
                            isOpen: true,
                            showPlaceholder: false,
                            isReopening: false
                        }
                    }));
                    break;

                case 'previewReopenFailed':
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
    }, []); // 移除sendMessage依赖，因为它不需要重新创建监听器

    // 重新打开预览编辑器
    const reopenPreview = useCallback(() => {
        // 设置重新打开状态
        setState(prev => ({
            ...prev,
            previewState: {
                ...prev.previewState,
                isReopening: true
            }
        }));

        // 发送重新打开消息
        sendMessage('reopenPreview');
    }, [sendMessage]);

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
        <div className={`app ${state.previewState.showPlaceholder ? 'with-placeholder' : ''}`}>
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

            {/* 当预览编辑器关闭时显示占位符 */}
            {state.previewState.showPlaceholder && (
                <PreviewPlaceholder
                    onReopenPreview={reopenPreview}
                    isReopening={state.previewState.isReopening}
                />
            )}

            <StatusBar
                validationState={state.validationState}
                configCount={Object.keys(state.currentConfig).length}
            />
        </div>
    );
};
