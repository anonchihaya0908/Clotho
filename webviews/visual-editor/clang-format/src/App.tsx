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
        previewState: { isOpen: true, showPlaceholder: false }
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
            console.log('🔍 DEBUG: 收到消息:', message);

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

                case 'previewClosed':
                    console.log('🔍 DEBUG: 处理previewClosed消息，更新状态...');
                    setState(prev => {
                        console.log('🔍 DEBUG: 更新前状态:', prev.previewState);
                        const newState = {
                            ...prev,
                            previewState: {
                                isOpen: false,
                                showPlaceholder: true
                            }
                        };
                        console.log('🔍 DEBUG: 更新后状态:', newState.previewState);
                        return newState;
                    });
                    console.log('🔍 DEBUG: previewClosed消息处理完成');
                    break;

                default:
                    console.warn('Unknown message type:', message.type);
            }
        };

        console.log('🔍 DEBUG: 注册message事件监听器');
        window.addEventListener('message', handleMessage);
        return () => {
            console.log('🔍 DEBUG: 移除message事件监听器');
            window.removeEventListener('message', handleMessage);
        };
    }, []); // 移除sendMessage依赖，因为它不需要重新创建监听器

    // 重新打开预览编辑器
    const reopenPreview = useCallback(() => {
        console.log('🔍 DEBUG: 调用reopenPreview()...');
        sendMessage('reopenPreview');
        setState(prev => {
            console.log('🔍 DEBUG: reopenPreview - 更新前状态:', prev.previewState);
            const newState = {
                ...prev,
                previewState: {
                    isOpen: true,
                    showPlaceholder: false
                }
            };
            console.log('🔍 DEBUG: reopenPreview - 更新后状态:', newState.previewState);
            return newState;
        });
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
            {console.log('🔍 DEBUG: 渲染占位符条件:', state.previewState.showPlaceholder)}
            {state.previewState.showPlaceholder && (
                <PreviewPlaceholder onReopenPreview={reopenPreview} />
            )}

            <StatusBar
                validationState={state.validationState}
                configCount={Object.keys(state.currentConfig).length}
            />
        </div>
    );
};
