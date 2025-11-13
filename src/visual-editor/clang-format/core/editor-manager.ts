import * as vscode from 'vscode';
import { errorHandler } from '../../../common/error-handler';
import { createModuleLogger } from '../../../common/logger/unified-logger';
import { isDarkTheme } from '../../../common/platform-utils';
import {
  BaseManager,
  EditorOpenSource,
  ManagerContext,
} from '../../../common/types';
import { WebviewMessage, WebviewMessageType, WebviewLogPayload } from '../../../common/types/clang-format-shared';
import { getNonce } from '../../../common/utils';
import { getStateOrDefault } from '../types/state';
import { ClangFormatConfig } from '../../../common/types/clang-format-shared';
import { EventBus } from '../messaging/event-bus';
import { onTyped } from '../messaging/typed-event-bus';

/**
 * 编辑器管理器
 * 负责主Webview面板的创建、配置、内容生成和生命周期管理
 */
export class ClangFormatEditorManager implements BaseManager {
  private readonly logger = createModuleLogger('ClangFormatEditorManager');

  readonly name = 'EditorManager';

  private panel: vscode.WebviewPanel | undefined;
  private context!: ManagerContext;
  private disposables: vscode.Disposable[] = [];

  async initialize(context: ManagerContext): Promise<void> {
    this.context = context;
    this.setupEventListeners();
    this.logger.debug('EditorManager initialized.', {
      module: this.name,
      operation: 'initialize',
    });
  }

  /**
   * 创建或显示编辑器面板
   */
  async createOrShowEditor(source: EditorOpenSource): Promise<void> {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      if (this.context.stateManager) {
        await this.context.stateManager.updateState(
          { isVisible: true },
          'editor-revealed'
        );
      }
      return;
    }

    try {
      this.panel = vscode.window.createWebviewPanel(
        'clangFormatEditor',
        'Clang-Format Editor',
        {
          viewColumn: vscode.ViewColumn.One,
          preserveFocus: false,
        },
        this.getWebviewOptions()
      );

      this.panel.webview.html = await this.generateWebviewContent();
      this.setupPanelEventListeners();

      if (this.context.stateManager) {
        await this.context.stateManager.updateState(
          {
            isVisible: true,
            isInitialized: true,
          },
          'editor-created'
        );
      }

      // 【关键】发送初始化消息到webview
      await this.sendInitializationMessage();
    } catch (error: unknown) {
      if (this.context.errorRecovery) {
        await this.context.errorRecovery.handleError(
          'editor-creation-failed',
          error as Error,
          { source }
        );
      }
    }
  }

  /**
   * 发送初始化消息到webview
   */
  private async sendInitializationMessage(): Promise<void> {
    try {
      // 导入必要的配置数据 - 这些应该从原coordinator中迁移过来
      const { CLANG_FORMAT_OPTIONS, DEFAULT_CLANG_FORMAT_CONFIG } =
        await import('../data/clang-format-options-database');
      const { ConfigCategories } = await import(
        '../../../common/types/clang-format-shared'
      );

      const currentState = getStateOrDefault(this.context.stateManager?.getState());

      // 获取设置
      const config = vscode.workspace.getConfiguration('clotho.clangFormat');
      const showGuideButton = config.get<boolean>('showGuideButton', true);
      const veCfg = vscode.workspace.getConfiguration('clotho.visualEditor');
      const macroSource = veCfg.get<'demoSnippet'|'activeFile'>('macroSource', 'demoSnippet');

      const currentConfig: ClangFormatConfig = currentState.currentConfig || (DEFAULT_CLANG_FORMAT_CONFIG as unknown as ClangFormatConfig);

      const initMessage: WebviewMessage = {
        type: WebviewMessageType.INITIALIZE,
        payload: {
          options: CLANG_FORMAT_OPTIONS,
          categories: Object.values(ConfigCategories),
          currentConfig,
          settings: { showGuideButton, macroSource },
        },
      };

      await this.postMessage(initMessage);
      this.logger.debug('Sent initialization message to webview', {
        module: this.name,
        operation: 'sendInitializationMessage',
      });
    } catch (error: unknown) {
      errorHandler.handle(error, {
        module: this.name,
        operation: 'initialization-message-failed',
        showToUser: true,
      });
    }
  }

  /**
   * 向Webview发送消息
   */
  async postMessage(message: WebviewMessage): Promise<void> {
    if (this.panel) {
      await this.panel.webview.postMessage(message);
    } else {
      this.logger.warn('Cannot post message: Editor panel is not available.', {
        module: this.name,
        operation: 'postMessage',
      });
    }
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.panel?.dispose();
  }

  private setupEventListeners() {
    if (this.context.eventBus) {
      onTyped(this.context.eventBus as unknown as EventBus, 'create-editor-requested', (source) => {
        void this.createOrShowEditor(source);
      });
    }

    if (this.context.eventBus) {
      onTyped(this.context.eventBus as unknown as EventBus, 'post-message-to-webview', (message) => {
        void this.postMessage(message);
      });
    }
  }

  private setupPanelEventListeners() {
    if (!this.panel) {
      return;
    }

    this.panel.onDidDispose(() => {
      this.panel = undefined;
      this.context.stateManager?.updateState(
        { isVisible: false },
        'editor-closed'
      );
      this.context.eventBus?.emit('editor-closed'); // 通知其他管理器
    });

    this.panel.webview.onDidReceiveMessage(async (message: unknown) => {
      const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
      const isWebviewMessage = (m: unknown): m is WebviewMessage => isObject(m) && typeof (m as { type?: unknown }).type === 'string';
      if (!isWebviewMessage(message)) {
        this.logger.warn('Dropped malformed webview message', { module: this.name, operation: 'onDidReceiveMessage' });
        return;
      }
      // 处理来自 webview 的日志消息
      if (message.type === WebviewMessageType.WEBVIEW_LOG) {
        const payload = message.payload as WebviewLogPayload;
        const { level, message: logMessage, meta } = payload ?? {};
        const ctx = meta ? { metadata: { data: meta } } : undefined;
        switch (level) {
          case 'debug': this.logger.debug(`[Webview] ${logMessage ?? ''}`, ctx); break;
          case 'warn': this.logger.warn(`[Webview] ${logMessage ?? ''}`, ctx); break;
          case 'error': this.logger.error(`[Webview] ${logMessage ?? ''}`, undefined, ctx); break;
          default: this.logger.info(`[Webview] ${logMessage ?? ''}`, ctx);
        }
        return; // 不需要进一步处理日志消息
      }

      this.logger.debug(`Received webview message: ${message.type}`, {
        module: this.name,
        operation: 'onDidReceiveMessage',
        payload: message.payload,
      });
      if (this.context.eventBus) {
        await this.context.eventBus.emit('webview-message-received', message);
      }
    });

    this.panel.onDidChangeViewState(
      async (e: vscode.WebviewPanelOnDidChangeViewStateEvent) => {
        const isVisible = e.webviewPanel.visible;
        if (this.context.stateManager) {
          await this.context.stateManager.updateState(
            { isVisible },
            'editor-visibility-changed'
          );
        }
        this.context.eventBus?.emit('editor-visibility-changed', { isVisible });
      }
    );

    // 监听主题变化
    const themeChangeListener = vscode.window.onDidChangeActiveColorTheme(
      (theme) => {
        const dark = isDarkTheme(theme);
        this.panel?.webview.postMessage({
          type: 'theme-changed',
          payload: {
            isDark: dark,
            kind: vscode.ColorThemeKind[theme.kind],
          },
        });
      }
    );

    this.disposables.push(themeChangeListener);
  }

  private getWebviewOptions(): vscode.WebviewOptions &
    vscode.WebviewPanelOptions {
    return {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'webviews'),
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
      ],
    };
  }

  private async generateWebviewContent(): Promise<string> {
    if (!this.panel) {
      throw new Error('Panel not initialized');
    }

    const webview = this.panel.webview;
    const extensionUri = this.context.extensionUri;

    const currentTheme = vscode.window.activeColorTheme;
    const dark = isDarkTheme(currentTheme);

    // 1. 【核心】定义所有需要从本地加载的资源的URI
    const scriptPath = vscode.Uri.joinPath(
      extensionUri,
      'webviews',
      'visual-editor',
      'clang-format',
      'dist',
      'index.js'
    );
    const stylePath = vscode.Uri.joinPath(
      extensionUri,
      'webviews',
      'visual-editor',
      'clang-format',
      'dist',
      'index.css'
    );

    const scriptUri = webview.asWebviewUri(scriptPath);
    const styleUri = webview.asWebviewUri(stylePath);

    this.logger.debug('Creating webview content...', {
      module: this.name,
      operation: 'generateWebviewContent',
      scriptUri: scriptUri.toString(),
      styleUri: styleUri.toString(),
    });

    const nonce = getNonce();
    const cfg = vscode.workspace.getConfiguration('clotho');
    const allowUnsafeEval = cfg.get<boolean>('webview.allowUnsafeEval', true);

    // 2. 【核心】构建一个更完善的、允许动态加载的内容安全策略
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            
            <!--
              Content Security Policy (CSP) - The Ultimate Version
              This is the key to allowing modern highlighters like highlight.js to work.
            -->
            <meta http-equiv="Content-Security-Policy" content="
                default-src 'none';
                style-src   ${webview.cspSource} 'nonce-${nonce}';
                script-src  'nonce-${nonce}'${allowUnsafeEval ? ' \'unsafe-eval\'' : ''};
                img-src     ${webview.cspSource} https: data:;
                font-src    ${webview.cspSource};
                worker-src  ${webview.cspSource};
                connect-src ${webview.cspSource};
            ">

            <link href="${styleUri}" rel="stylesheet">
            <title>Clang-Format Editor</title>
            
            <style nonce="${nonce}">
                /* Base styles to prevent flash of unstyled content */
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    font-weight: var(--vscode-font-weight);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    padding: 0;
                }
            </style>
        </head>
        <body data-vscode-theme="${dark ? 'dark' : 'light'}" data-vscode-theme-name="${currentTheme.kind}">
            <!-- 【核心】将当前主题信息，通过data属性，直接嵌入到body上 -->
            <div id="app"></div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
            
            <script nonce="${nonce}">
                // 主题信息传递给前端
                window.vscodeTheme = {
                    isDark: ${dark},
                    kind: '${vscode.ColorThemeKind[currentTheme.kind]}',
                    name: '${currentTheme.kind}'
                };
            </script>
        </body>
        </html>`;
  }

  getStatus() {
    return {
      isInitialized: !!this.context,
      isHealthy: true,
      lastActivity: new Date(),
      errorCount: 0,
    };
  }
}
