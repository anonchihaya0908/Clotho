/**
 * React Error Boundary Component
 * 捕获和处理 React 组件树中的错误
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        // 更新 state 使下一次渲染能够显示降级后的 UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // 记录错误信息
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        
        // 更新状态以包含错误信息
        this.setState({
            error,
            errorInfo
        });

        // 调用外部错误处理函数
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    render() {
        if (this.state.hasError) {
            // 如果提供了自定义 fallback，使用它
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // 默认错误 UI
            return (
                <div className="error-boundary">
                    <div className="error-boundary-content">
                        <h2>🚨 出现了一个错误</h2>
                        <p>很抱歉，应用程序遇到了一个意外错误。</p>
                        
                        <details className="error-details">
                            <summary>错误详情</summary>
                            <div className="error-message">
                                <strong>错误信息:</strong>
                                <pre>{this.state.error?.message}</pre>
                            </div>
                            {this.state.errorInfo && (
                                <div className="error-stack">
                                    <strong>组件堆栈:</strong>
                                    <pre>{this.state.errorInfo.componentStack}</pre>
                                </div>
                            )}
                        </details>

                        <div className="error-actions">
                            <button 
                                className="retry-button"
                                onClick={this.handleRetry}
                            >
                                🔄 重试
                            </button>
                            <button 
                                className="reload-button"
                                onClick={() => window.location.reload()}
                            >
                                🔃 重新加载页面
                            </button>
                        </div>
                    </div>

                    <style>{`
                        .error-boundary {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 200px;
                            padding: 20px;
                            background-color: var(--vscode-editor-background);
                            color: var(--vscode-foreground);
                        }

                        .error-boundary-content {
                            max-width: 600px;
                            text-align: center;
                        }

                        .error-boundary h2 {
                            color: var(--vscode-errorForeground);
                            margin-bottom: 16px;
                        }

                        .error-boundary p {
                            margin-bottom: 20px;
                            color: var(--vscode-descriptionForeground);
                        }

                        .error-details {
                            text-align: left;
                            margin: 20px 0;
                            padding: 16px;
                            background-color: var(--vscode-textCodeBlock-background);
                            border: 1px solid var(--vscode-widget-border);
                            border-radius: 4px;
                        }

                        .error-details summary {
                            cursor: pointer;
                            font-weight: bold;
                            margin-bottom: 12px;
                        }

                        .error-message, .error-stack {
                            margin: 12px 0;
                        }

                        .error-message pre, .error-stack pre {
                            background-color: var(--vscode-editor-background);
                            padding: 8px;
                            border-radius: 3px;
                            overflow-x: auto;
                            font-family: var(--vscode-editor-font-family);
                            font-size: 12px;
                            white-space: pre-wrap;
                        }

                        .error-actions {
                            display: flex;
                            gap: 12px;
                            justify-content: center;
                            margin-top: 20px;
                        }

                        .retry-button, .reload-button {
                            padding: 8px 16px;
                            border: 1px solid var(--vscode-button-border);
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                            transition: background-color 0.2s;
                        }

                        .retry-button {
                            background-color: var(--vscode-button-background);
                            color: var(--vscode-button-foreground);
                        }

                        .retry-button:hover {
                            background-color: var(--vscode-button-hoverBackground);
                        }

                        .reload-button {
                            background-color: var(--vscode-button-secondaryBackground);
                            color: var(--vscode-button-secondaryForeground);
                        }

                        .reload-button:hover {
                            background-color: var(--vscode-button-secondaryHoverBackground);
                        }
                    `}</style>
                </div>
            );
        }

        return this.props.children;
    }
}

// 高阶组件，用于包装其他组件
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
    const WrappedComponent = (props: P) => (
        <ErrorBoundary {...errorBoundaryProps}>
            <Component {...props} />
        </ErrorBoundary>
    );

    WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
    
    return WrappedComponent;
}
