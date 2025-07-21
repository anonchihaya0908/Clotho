/**
 * Clang-Format Editor Frontend Entry Point
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/index.css';

// 获取 VS Code API
declare global {
    interface Window {
        acquireVsCodeApi(): any;
    }
}

const vscode = window.acquireVsCodeApi();

// 创建 React 应用
const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(<App vscode={vscode} />);
} else {
    console.error('Could not find app container');
}
