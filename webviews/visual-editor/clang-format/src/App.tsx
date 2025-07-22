/**
 * Main App Component for Clang-Format Editor
 */

import React, { useState, useEffect, useCallback } from 'react';
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
        settings: { showGuideButton: true }
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
                    // 初始化时不再需要请求宏观预览，因为虚拟编辑器会自动处理
                    break;

                case 'configLoaded':
                    setState(prev => ({
                        ...prev,
                        currentConfig: message.payload.config
                    }));
                    // 配置加载后不再需要请求宏观预览，虚拟编辑器会自动更新
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

                case 'macroPreviewUpdate':
                    // 【已弃用】宏观预览现在由真正的VSCode编辑器处理
                    // 不再需要在Webview中处理宏观预览更新
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

                default:
                    console.warn('Unknown message type:', message.type);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [sendMessage]); // sendMessage 已被 useCallback 包装

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
        <div className="app">
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
