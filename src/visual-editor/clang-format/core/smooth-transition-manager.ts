/**
 * 平滑过渡管理器
 * 提供 CSS 动画和 webview 切换的无缝体验
 */

import * as vscode from 'vscode';

/**
 * 动画配置
 */
export interface AnimationConfig {
    duration: number;
    easing: string;
    delay?: number;
}

/**
 * 过渡状态
 */
export enum AnimationState {
    IDLE = 'idle',
    FADING_IN = 'fading-in',
    FADING_OUT = 'fading-out',
    PREPARING = 'preparing',
}

/**
 * 平滑过渡管理器
 */
export class SmoothTransitionManager {
    private currentState: AnimationState = AnimationState.IDLE;
    private animationCallbacks = new Map<string, () => void>();

    constructor(private extensionUri: vscode.Uri) { }

    /**
     * 为 webview 面板添加过渡样式
     */
    public injectTransitionStyles(webview: vscode.Webview): void {
        const transitionCSS = `
      <style>
        .transition-container {
          opacity: 1;
          transition: opacity 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
          will-change: opacity;
        }
        
        .fade-out {
          opacity: 0 !important;
        }
        
        .fade-in {
          opacity: 1 !important;
        }
        
        .preparing {
          opacity: 0;
          transition: none;
        }
        
        /* 为占位符添加特殊动画 */
        .placeholder-content {
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
        }
        
        .placeholder-content.show {
          opacity: 1;
          transform: translateY(0);
        }
        
        /* 预览编辑器过渡效果 */
        .preview-container {
          opacity: 1;
          transition: opacity 0.25s ease-out;
        }
        
        .preview-container.hide {
          opacity: 0;
        }
        
        /* 加载状态动画 */
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        
        .loading {
          animation: pulse 1.5s ease-in-out infinite;
        }
      </style>
    `;

        // 注入样式到 webview
        webview.postMessage({
            type: 'inject-styles',
            styles: transitionCSS,
        });
    }

    /**
     * 淡出 webview
     */
    public async fadeOut(
        webview: vscode.Webview,
        config: AnimationConfig = { duration: 300, easing: 'ease-out' }
    ): Promise<void> {
        return new Promise((resolve) => {
            this.currentState = AnimationState.FADING_OUT;

            webview.postMessage({
                type: 'start-fadeout',
                duration: config.duration,
                easing: config.easing,
            });

            // 等待动画完成
            setTimeout(() => {
                this.currentState = AnimationState.IDLE;
                resolve();
            }, config.duration + 50);
        });
    }

    /**
     * 淡入 webview
     */
    public async fadeIn(
        webview: vscode.Webview,
        config: AnimationConfig = { duration: 300, easing: 'ease-in' }
    ): Promise<void> {
        return new Promise((resolve) => {
            this.currentState = AnimationState.FADING_IN;

            webview.postMessage({
                type: 'start-fadein',
                duration: config.duration,
                easing: config.easing,
            });

            // 等待动画完成
            setTimeout(() => {
                this.currentState = AnimationState.IDLE;
                resolve();
            }, config.duration + 50);
        });
    }

    /**
     * 准备 webview（设置为不可见状态，但不销毁）
     */
    public prepareWebview(webview: vscode.Webview): void {
        this.currentState = AnimationState.PREPARING;

        webview.postMessage({
            type: 'prepare-transition',
        });
    }

    /**
     * 执行交叉淡入淡出
     */
    public async crossfade(
        outgoingWebview: vscode.Webview,
        incomingWebview: vscode.Webview,
        duration: number = 300
    ): Promise<void> {
        // 先准备入场的 webview
        this.prepareWebview(incomingWebview);

        // 等待一帧确保准备完成
        await new Promise(resolve => setTimeout(resolve, 16));

        // 同时执行淡出和淡入
        const fadeOutPromise = this.fadeOut(outgoingWebview, { duration, easing: 'ease-out' });
        const fadeInPromise = this.fadeIn(incomingWebview, { duration, easing: 'ease-in' });

        await Promise.all([fadeOutPromise, fadeInPromise]);
    }

    /**
     * 为占位符内容添加特殊动画
     */
    public animatePlaceholder(webview: vscode.Webview, show: boolean): void {
        webview.postMessage({
            type: 'animate-placeholder',
            show,
        });
    }

    /**
     * 显示加载状态
     */
    public showLoading(webview: vscode.Webview, message?: string): void {
        webview.postMessage({
            type: 'show-loading',
            message: message || 'Preparing preview...',
        });
    }

    /**
     * 隐藏加载状态
     */
    public hideLoading(webview: vscode.Webview): void {
        webview.postMessage({
            type: 'hide-loading',
        });
    }

    /**
     * 获取当前动画状态
     */
    public getCurrentState(): AnimationState {
        return this.currentState;
    }

    /**
     * 重置状态
     */
    public reset(): void {
        this.currentState = AnimationState.IDLE;
        this.animationCallbacks.clear();
    }

    /**
     * 生成过渡 HTML 模板
     */
    public generateTransitionHTML(content: string): string {
        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Clang-Format Visual Editor</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
            overflow: hidden;
          }
          
          .transition-container {
            width: 100%;
            height: 100vh;
            opacity: 1;
            transition: opacity 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
            will-change: opacity;
          }
          
          .fade-out {
            opacity: 0 !important;
          }
          
          .fade-in {
            opacity: 1 !important;
          }
          
          .preparing {
            opacity: 0;
            transition: none;
          }
          
          .placeholder-content {
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
          }
          
          .placeholder-content.show {
            opacity: 1;
            transform: translateY(0);
          }
          
          .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            flex-direction: column;
          }
          
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--vscode-progressBar-background);
            border-top: 3px solid var(--vscode-progressBar-foreground);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .loading-message {
            margin-top: 16px;
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
          }
        </style>
      </head>
      <body>
        <div class="transition-container" id="main-container">
          ${content}
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          window.addEventListener('message', event => {
            const message = event.data;
            const container = document.getElementById('main-container');
            
            switch (message.type) {
              case 'inject-styles':
                const style = document.createElement('style');
                style.textContent = message.styles;
                document.head.appendChild(style);
                break;
                
              case 'start-fadeout':
                container.style.transition = \`opacity \${message.duration}ms \${message.easing}\`;
                container.classList.add('fade-out');
                break;
                
              case 'start-fadein':
                container.style.transition = \`opacity \${message.duration}ms \${message.easing}\`;
                container.classList.remove('fade-out');
                container.classList.add('fade-in');
                break;
                
              case 'prepare-transition':
                container.classList.add('preparing');
                break;
                
              case 'animate-placeholder':
                const placeholder = document.querySelector('.placeholder-content');
                if (placeholder) {
                  if (message.show) {
                    placeholder.classList.add('show');
                  } else {
                    placeholder.classList.remove('show');
                  }
                }
                break;
                
              case 'show-loading':
                container.innerHTML = \`
                  <div class="loading">
                    <div class="loading-spinner"></div>
                    <div class="loading-message">\${message.message}</div>
                  </div>
                \`;
                break;
                
              case 'hide-loading':
                // 恢复原内容
                break;
            }
          });
          
          // 通知扩展页面已准备就绪
          vscode.postMessage({ type: 'webview-ready' });
        </script>
      </body>
      </html>
    `;
    }
}
