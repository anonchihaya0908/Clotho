/**
 * Main App Component for Clang-Format Editor
 */

import React, { useState, useEffect, useCallback } from 'react';
import hljs from 'highlight.js/lib/core';
import { ConfigPanel } from './components/ConfigPanel';
import { PreviewPanel } from './components/PreviewPanel';
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
    macroPreview: string;
    isLoading: boolean;
    error: string | null;
    validationState: {
        isValid: boolean;
        error?: string;
        warnings?: string[];
    };
}

export const App: React.FC<AppProps> = ({ vscode }) => {
    const [state, setState] = useState<AppState>({
        options: [],
        categories: [],
        currentConfig: {},
        microPreviews: {},
        macroPreview: '',
        isLoading: true,
        error: null,
        validationState: { isValid: true }
    });

    // 发送消息到 VS Code
    const sendMessage = useCallback((type: string, payload?: any) => {
        vscode.postMessage({ type, payload });
    }, [vscode]);

    // 调试：检查 CSS 变量是否可用
    useEffect(() => {
        console.log('App initialized, checking CSS variables...');
        const testElement = document.createElement('div');
        testElement.style.color = 'var(--vscode-editor-foreground)';
        document.body.appendChild(testElement);
        const computedColor = getComputedStyle(testElement).color;
        console.log('VS Code theme variable test:', computedColor);
        document.body.removeChild(testElement);

        // 检查 highlight.js 是否加载
        console.log('Highlight.js available:', typeof hljs !== 'undefined');
    }, []);

    // 处理配置变更
    const handleConfigChange = useCallback((key: string, value: any) => {
        setState(prev => ({
            ...prev,
            currentConfig: { ...prev.currentConfig, [key]: value }
        }));

        sendMessage('configChanged', { key, value });
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

                case 'macroPreviewUpdate':
                    setState(prev => ({
                        ...prev,
                        macroPreview: message.payload.formattedCode
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

                default:
                    console.warn('Unknown message type:', message.type);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

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
                <div className="left-panel">
                    <ConfigPanel
                        options={state.options}
                        categories={state.categories}
                        currentConfig={state.currentConfig}
                        microPreviews={state.microPreviews}
                        onConfigChange={handleConfigChange}
                    />
                </div>

                <div className="right-panel">
                    <PreviewPanel
                        macroPreview={state.macroPreview}
                        isValid={state.validationState.isValid}
                    />
                </div>
            </div>

            <StatusBar
                validationState={state.validationState}
                configCount={Object.keys(state.currentConfig).length}
            />
        </div>
    );
};
