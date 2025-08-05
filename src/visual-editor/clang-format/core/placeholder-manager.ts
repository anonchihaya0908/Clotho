import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { errorHandler } from '../../../common/error-handler';
import { logger } from '../../../common/logger';
import { isDarkTheme } from '../../../common/platform-utils';
import {
  BaseManager,
  ManagerContext,
} from '../../../common/types';
import { WebviewMessage, WebviewMessageType } from '../../../common/types/clang-format-shared';
import { getNonce } from '../../../common/utils';

/**
 * 占位符 Webview 管理器
 * 【重构后】只负责创建、销毁和更新占位符 Webview，不包含决策逻辑
 */
export class PlaceholderWebviewManager implements BaseManager {
  readonly name = 'PlaceholderManager';

  private panel: vscode.WebviewPanel | undefined;
  private context!: ManagerContext;
  private disposables: vscode.Disposable[] = [];
  private characterImagePaths: string[] = [];
  private readonly footerTexts: string[] = [
    'Clotho 由 Oblivionis小姐 和 丰川集团 赞助开发。',
    '丰川清告先生因重大判断失误致集团损失168亿日元，已引咎辞职并被驱逐出家族。',
    `近日，本集团不幸遭遇重大经济诈骗事件，损失金额高达168亿日元。        
    经集团审计部门与第三方调查机构联合调查确认，事件的主要责任人为丰川清告先生。
    在此次对外投资案中，丰川清告先生作为主要决策人，严重缺乏风险识别与把控能力，未能履行基本的尽职调查义务，草率推进与不明背景企业的合作，最终导致集团陷入诈骗陷阱，蒙受巨额损失。
    面对错误，丰川清告先生已正式向董事会提交引咎辞职申请，董事会一致通过并立即生效。同时，依据丰川家族章程及集团管理条例，丰川清告先生被永久驱逐出家族核心成员名单，其所持有的全部职权与权益即刻失效。
    集团管理委员会将全面加强内部治理与风控机制，杜绝任何类似事件再次发生。
    与此同时，我们已联合司法机关展开调查，依法追查涉案诈骗团伙，争取最大限度追回集团损失。
      对于本次事件对员工、合作伙伴以及公众所造成的困扰，我们深表歉意。集团将以此为沉痛教训，重整旗鼓，持续以严谨、透明、稳健的管理理念前行。    ——丰川集团管理委员会 敬启`,
    '沿着银白色的丝线，将思念，缓缓拉至身旁。',
    '就这样纠缠不清地舞动下去吧，轻纱缠裹着你我，一圈圈地旋转。',
  ];

  async initialize(context: ManagerContext): Promise<void> {
    this.context = context;
    this.loadCharacterImagePaths();
    this.setupEventListeners(); // Setup event listeners
  }

  /**
   * 创建占位符 webview (简化版) - 防止重复创建
   */
  async createPlaceholder(): Promise<vscode.WebviewPanel> {
    // 检查是否已经存在有效的面板
    if (this.panel && this.panel.visible) {
      logger.debug('Reusing existing placeholder panel', {
        module: this.name,
        operation: 'createPlaceholder',
      });
      this.panel.reveal(vscode.ViewColumn.Two, false);
      return this.panel;
    }

    // 如果面板存在但不可见，说明可能已经被销毁，清理引用
    if (this.panel && !this.panel.visible) {
      logger.debug('Cleaning up disposed placeholder panel reference', {
        module: this.name,
        operation: 'createPlaceholder',
      });
      this.panel = undefined;
    }

    logger.debug('Creating new placeholder panel', {
      module: this.name,
      operation: 'createPlaceholder',
    });

    this.panel = vscode.window.createWebviewPanel(
      'clangFormatPlaceholder',
      '实时代码预览已关闭',
      {
        viewColumn: vscode.ViewColumn.Two,
        preserveFocus: true,
      },
      this.getWebviewOptions(),
    );

    this.updatePlaceholderContent();
    this.setupPanelEventListeners();

    // 状态更新的职责已上移
    await this.context.stateManager.updateState(
      {
        previewMode: 'closed',
      },
      'placeholder-created',
    );

    return this.panel;
  }

  /**
   * 更新占位符内容
   */
  updatePlaceholderContent(): void {
    if (this.panel) {
      this.panel.webview.html = this.generatePlaceholderContent();
    }
  }

  /**
   * 【简化方案】隐藏占位符 - 直接销毁
   * 当用户切换到普通文件时，简单地销毁占位符webview
   */
  hidePlaceholder(): void {
    if (!this.panel) {
      return;
    }

    try {
      this.panel.dispose();
      this.panel = undefined;

      logger.debug('Placeholder destroyed when switching away from clang-format editor', {
        module: this.name,
        operation: 'hidePlaceholder',
      });
    } catch (error) {
      logger.warn('Failed to destroy placeholder', {
        module: this.name,
        operation: 'hidePlaceholder',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 【简化方案】显示占位符 - 仅在clang-format编辑器活跃时创建
   */
  async showPlaceholder(): Promise<void> {
    // 简化：只有在没有面板时才创建新的
    if (!this.panel) {
      await this.createPlaceholder();
    }
  }

  /**
   * 检查占位符是否处于活动状态
   */
  isPlaceholderActive(): boolean {
    return !!this.panel;
  }

  /**
   * 获取占位符面板
   */
  getPlaceholderPanel(): vscode.WebviewPanel | undefined {
    return this.panel;
  }

  /**
   * 销毁占位符面板
   */
  disposePanel(): void {
    if (this.panel) {
      this.panel.dispose();
      // onDidDispose 事件会处理 this.panel = undefined 的逻辑
    }
  }

  /**
   * 处理占位符被用户关闭的情况
   */
  handlePlaceholderClosed(): void {
    this.panel = undefined; // 面板被销毁，重置引用

    // 当用户手动关闭占位符时，我们认为他们希望结束整个会话
    this.context.eventBus.emit('editor-closed');
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.disposePanel();
  }

  private setupEventListeners(): void {
    // Preview closing is now handled by DebounceIntegration
    // this.context.eventBus.on('preview-closed', async () => { ... });

    // 监听预览打开事件，清理占位符
    this.context.eventBus.on('preview-opened', () => {
      logger.debug('Preview opened, disposing placeholder', {
        module: this.name,
        operation: 'onPreviewOpened',
      });
      this.disposePanel();
    });

    // Listen for main editor close events - destroy placeholder accordingly
    this.context.eventBus.on('editor-closed', () => {
      this.disposePanel();
    });

    // 【重新设计】监听主编辑器可见性变化事件 - 真正的收起/恢复
    this.context.eventBus.on('editor-visibility-changed', async ({ isVisible }: { isVisible: boolean }) => {
      if (isVisible) {
        // 主编辑器变为可见，请求恢复代码预览（而不是显示占位符）
        this.context.eventBus.emit('open-preview-requested', {
          source: 'editor-visibility-restored',
          forceReopen: true,
        });
      } else {
        // 主编辑器变为不可见，销毁占位符
        this.hidePlaceholder();
      }
    });

    // Listen for preview hidden due to visibility settings
    this.context.eventBus.on('preview-hidden-by-visibility', () => {
      logger.debug('Preview is hidden due to visibility settings, not creating placeholder', {
        module: this.name,
        operation: 'createPlaceholder',
      });
      // 如果有占位符，也要销毁它
      if (this.panel) {
        this.disposePanel();
      }
    });
  }

  private setupPanelEventListeners(): void {
    if (!this.panel) { return; }

    // 监听占位符被关闭
    this.panel.onDidDispose(() => {
      this.handlePlaceholderClosed();
    });

    // 监听来自占位符的消息
    this.panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      if (message.type === WebviewMessageType.REOPEN_PREVIEW) {
        // 请求重新打开的逻辑已上移到 Coordinator/MessageHandler
        this.context.eventBus.emit('open-preview-requested', {
          source: 'placeholder',
          forceReopen: true,
        });
      }
    });

    // 监听主题变化
    const themeChangeListener = vscode.window.onDidChangeActiveColorTheme(
      (theme) => {
        const dark = isDarkTheme(theme);
        if (this.panel) {
          this.panel.webview.postMessage({
            type: 'theme-changed',
            payload: {
              isDark: dark,
            },
          });
        }
      },
    );

    this.disposables.push(themeChangeListener);
  }

  private getWebviewOptions(): vscode.WebviewOptions &
    vscode.WebviewPanelOptions {
    return {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(
          this.context.extensionUri,
          'webviews',
          'visual-editor',
          'clang-format',
          'src',
          'assets',
          'images',
        ),
      ],
    };
  }

  /**
   * 生成占位符 HTML 内容
   */
  private generatePlaceholderContent(): string {
    const dark = isDarkTheme();
    const nonce = getNonce();

    // 随机选择一张角色图片
    const randomImagePath = this.getRandomCharacterImagePath();
    const randomImageUri = randomImagePath
      ? this.getWebviewImageUri(randomImagePath)
      : '';

    return `<!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            
            <meta http-equiv="Content-Security-Policy" content="
                default-src 'none';
                style-src 'nonce-${nonce}';
                script-src 'nonce-${nonce}';
                img-src ${this.panel?.webview.cspSource} https: data:;
                font-src 'self';
            ">

            <title>实时代码预览已关闭</title>
            
            <style nonce="${nonce}">
                :root {
                    --vscode-font-family: var(--vscode-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
                    --vscode-font-size: var(--vscode-font-size, 13px);
                    --vscode-foreground: var(--vscode-foreground, ${dark ? '#cccccc' : '#333333'});
                    --vscode-background: var(--vscode-editor-background, ${dark ? '#1e1e1e' : '#ffffff'});
                    --vscode-button-background: var(--vscode-button-background, ${dark ? '#0e639c' : '#007acc'});
                    --vscode-button-hoverBackground: var(--vscode-button-hoverBackground, ${dark ? '#1177bb' : '#005a9e'});
                    --vscode-descriptionForeground: var(--vscode-descriptionForeground, ${dark ? '#cccccc99' : '#717171'});
                }

                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }

                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-background);
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }

                .placeholder-container {
                    max-width: 420px;
                    padding: 20px;
                    text-align: center;
                    animation: fadeIn 0.15s ease-out;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(15px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .placeholder-icon {
                    width: 256px; /* 用户指定尺寸 */
                    height: 256px; /* 用户指定尺寸 */
                    margin: 0 auto 30px auto;
                    border-radius: 16px; /* 圆角正方形 */
                    overflow: hidden;
                }

                .placeholder-icon img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }

                .placeholder-title {
                    font-size: 22px;
                    font-weight: 600;
                    margin-bottom: 15px;
                    color: var(--vscode-foreground);
                }

                .placeholder-description {
                    font-size: 14px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 30px;
                    line-height: 1.6;
                    max-width: 380px;
                    margin-left: auto;
                    margin-right: auto;
                }

                .placeholder-description kbd {
                    background-color: rgba(128, 128, 128, 0.15);
                    border-radius: 4px;
                    padding: 2px 5px;
                    border: 1px solid rgba(128, 128, 128, 0.1);
                    font-family: var(--vscode-font-family);
                }

                .reopen-button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 10px 24px;
                    font-size: 14px;
                    font-family: var(--vscode-font-family);
                    font-weight: 500;
                    border-radius: 5px;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                    min-width: 180px;
                }

                .reopen-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }

                .reopen-button:disabled {
                    background-color: #555;
                    color: #999;
                    cursor: not-allowed;
                    opacity: 0.7;
                }

                .placeholder-footer {
                    margin-top: 35px;
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    opacity: 0.6;
                }

                .status-indicator {
                    display: inline-block;
                    width: 7px;
                    height: 7px;
                    background-color: var(--vscode-button-background);
                    border-radius: 50%;
                    margin-right: 7px;
                    animation: blink 1.8s infinite ease-in-out;
                }

                @keyframes blink {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.3;
                    }
                }
            </style>
        </head>
        <body data-vscode-theme="${dark ? 'dark' : 'light'}">
            <div class="placeholder-container">
                <div class="placeholder-icon">
                    <img src="${randomImageUri}" 
                         alt="Picture" 
                         onerror="this.style.display='none'; this.parentElement.innerHTML='';" />
                </div>
                
                <h2 class="placeholder-title">实时代码预览已关闭</h2>
                
                <p class="placeholder-description">
                    您可以在左侧调整配置，然后点击下方按钮\n（或按 <kbd id="shortcut-hint"></kbd>）以查看格式化效果。
                </p>
                
                <button class="reopen-button" id="reopenButton">
                    重新打开实时预览
                </button>
                
                <div class="placeholder-footer">
                    ${this.getRandomFooterText()}
                </div>
            </div>

            <script nonce="${nonce}">
                // 获取 VS Code API
                const vscode = acquireVsCodeApi();
                let messageCount = 0;

                // 页面加载完成后的初始化
                document.addEventListener('DOMContentLoaded', function() {
                    // 智能显示快捷键
                    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
                    const shortcutHint = document.getElementById('shortcut-hint');
                    if (shortcutHint) {
                        shortcutHint.textContent = isMac ? '⌘ R' : 'Ctrl + R';
                    }

                    // 添加按钮点击事件监听器
                    const reopenButton = document.getElementById('reopenButton');
                    if (reopenButton) {
                        reopenButton.addEventListener('click', reopenPreview);
                    }
                    
                    // 添加键盘快捷键支持
                    document.addEventListener('keydown', function(event) {
                        // Ctrl/Cmd + R 重新打开预览
                        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
                            event.preventDefault();
                            reopenPreview();
                        }
                        
                        // Enter 键重新打开预览
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            reopenPreview();
                        }
                    });
                });

                // 重新打开预览功能
                function reopenPreview() {
                    const messageId = ++messageCount;
                    // 使用logger记录用户点击事件
                    
                    // 禁用按钮，防止重复点击
                    const button = document.getElementById('reopenButton');
                    if(button) {
                        button.disabled = true;
                        button.textContent = '正在打开预览...';
                    }
                    
                    // 发送消息到扩展
                    vscode.postMessage({
                        type: 'reopen-preview',
                        payload: {
                            timestamp: Date.now(),
                            messageId: messageId
                        }
                    });
                    
                    // 添加视觉反馈
                    const title = document.querySelector('.placeholder-title');
                    if(title) {
                       title.textContent = '正在打开预览...';
                    }
                }

                // 监听主题变化
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.type) {
                        case 'theme-changed':
                            document.body.setAttribute('data-vscode-theme', 
                                message.payload.isDark ? 'dark' : 'light');
                            break;
                    }
                });

                // Notify extension that webview content is fully loaded and rendered
                window.addEventListener('load', () => {
                  vscode.postMessage({ type: 'content-ready' });
                });
            </script>
        </body>
        </html>`;
  }

  /**
   * 加载所有角色图片路径
   */
  private loadCharacterImagePaths(): void {
    const baseImagePath = path.join(
      this.context.extensionUri.fsPath,
      'webviews',
      'visual-editor',
      'clang-format',
      'src',
      'assets',
      'images',
    );
    const allImagePaths: string[] = [];
    const characterFolders = ['Ave Mujica', 'MyGO', 'Girls-Band-Cry'];

    try {
      for (const folder of characterFolders) {
        const folderPath = path.join(baseImagePath, folder);
        if (fs.existsSync(folderPath)) {
          const files = fs.readdirSync(folderPath);
          for (const file of files) {
            if (path.extname(file).toLowerCase() === '.webp') {
              // 使用 / 作为路径分隔符，以确保在 webview 中正确解析
              const relativePath = `${folder}/${file}`;
              allImagePaths.push(relativePath);
            }
          }
        }
      }
    } catch (error) {
      errorHandler.handle(error, {
        module: this.name,
        operation: 'loadCharacterImagePaths',
        showToUser: false,
      });
    }

    this.characterImagePaths = allImagePaths;
    if (this.characterImagePaths.length > 0) {
      logger.debug(
        `Successfully loaded ${this.characterImagePaths.length} character images.`,
        { module: this.name, operation: 'loadCharacterImagePaths' },
      );
    } else {
      logger.warn('No character images found.', {
        module: this.name,
        operation: 'loadCharacterImagePaths',
      });
    }
  }

  /**
   * 随机选择一张角色图片路径
   */
  private getRandomCharacterImagePath(): string {
    if (this.characterImagePaths.length === 0) {
      return '';
    }
    const randomIndex = Math.floor(
      Math.random() * this.characterImagePaths.length,
    );
    return this.characterImagePaths[randomIndex];
  }

  /**
   * 生成webview可用的图片URI
   */
  private getWebviewImageUri(imagePath: string): string {
    if (!this.panel) { return ''; }

    const imageFullPath = vscode.Uri.joinPath(
      this.context.extensionUri,
      'webviews',
      'visual-editor',
      'clang-format',
      'src',
      'assets',
      'images',
      imagePath,
    );

    return this.panel.webview.asWebviewUri(imageFullPath).toString();
  }

  private getRandomFooterText(): string {
    if (this.footerTexts.length === 0) {
      return '';
    }
    const randomIndex = Math.floor(Math.random() * this.footerTexts.length);
    return this.footerTexts[randomIndex];
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
