import * as vscode from 'vscode';
import { BaseManager, ManagerContext } from '../../../common/types';
import { ClangFormatPreviewProvider } from '../preview-provider';
import { ClangFormatService } from '../format-service';
import { MACRO_PREVIEW_CODE } from '../config-options';

/**
 * 预览编辑器管理器
 * 【重构后】只负责创建、更新和关闭预览文档，不包含决策逻辑
 */
export class PreviewEditorManager implements BaseManager {
  readonly name = 'PreviewManager';

  private context!: ManagerContext;
  private previewProvider: ClangFormatPreviewProvider;
  private formatService: ClangFormatService;

  // 【新增】生命周期状态管理
  private isHidden: boolean = false;
  private hiddenViewColumn: vscode.ViewColumn | undefined;

  constructor() {
    this.previewProvider = ClangFormatPreviewProvider.getInstance();
    this.formatService = ClangFormatService.getInstance();
  }

  async initialize(context: ManagerContext): Promise<void> {
    this.context = context;
    this.setupEventListeners(); // 【修复】重新添加事件监听器设置
  }

  /**
   * 打开预览编辑器 (简化版)
   * 不再处理状态或防抖，只负责创建
   */
  async openPreview(): Promise<vscode.TextEditor> {
    const previewUri = this.previewProvider.createPreviewUri(
      `preview-${Date.now()}.cpp`,
    );

    // 初始化预览内容
    const initialContent = MACRO_PREVIEW_CODE;
    this.previewProvider.updateContent(previewUri, initialContent);

    // 创建预览编辑器
    const editor = await vscode.window.showTextDocument(previewUri, {
      viewColumn: vscode.ViewColumn.Two,
      preserveFocus: false,
      preview: false,
    });

    // 更新状态的职责已上移
    await this.context.stateManager.updateState(
      {
        previewMode: 'open',
        previewUri,
        previewEditor: editor,
      },
      'preview-opened',
    );
    this.context.eventBus.emit('preview-opened');

    return editor;
  }

  /**
   * 关闭预览编辑器 (简化版)
   */
  async closePreview(): Promise<void> {
    const { previewUri } = this.context.stateManager.getState();
    if (!previewUri) {
      return;
    }

    // 查找并关闭对应的编辑器标签页
    for (const tabGroup of vscode.window.tabGroups.all) {
      for (const tab of tabGroup.tabs) {
        const tabInput = tab.input as { uri?: vscode.Uri };
        if (tabInput?.uri?.toString() === previewUri.toString()) {
          await vscode.window.tabGroups.close(tab);
          break; // 假设只有一个预览
        }
      }
    }

    // 【新增】重置隐藏状态
    this.isHidden = false;
    this.hiddenViewColumn = undefined;
  }

  /**
   * 【新增】隐藏预览编辑器但不销毁
   */
  async hidePreview(): Promise<void> {
    const { previewEditor } = this.context.stateManager.getState();
    if (!previewEditor || this.isHidden) {
      return;
    }

    // 记录当前的ViewColumn以便恢复
    this.hiddenViewColumn = previewEditor.viewColumn;
    this.isHidden = true;

    // 通过将焦点切换到主编辑器来"隐藏"预览
    // VS Code没有直接隐藏编辑器的API，所以我们通过焦点管理来实现
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor !== previewEditor) {
      await vscode.window.showTextDocument(activeEditor.document, {
        viewColumn: activeEditor.viewColumn,
        preserveFocus: false,
      });
    }
  }

  /**
   * 【新增】显示之前隐藏的预览编辑器
   */
  async showPreview(): Promise<void> {
    const { previewUri, previewEditor } = this.context.stateManager.getState();
    if (!previewUri || !previewEditor || !this.isHidden) {
      return;
    }

    // 恢复预览编辑器的显示
    await vscode.window.showTextDocument(previewEditor.document, {
      viewColumn: this.hiddenViewColumn || vscode.ViewColumn.Two,
      preserveFocus: true,
    });

    this.isHidden = false;
    this.hiddenViewColumn = undefined;
  }

  /**
   * 更新预览内容
   */
  async updatePreviewContent(newContent: string): Promise<void> {
    const { previewUri } = this.context.stateManager.getState();
    if (previewUri) {
      this.previewProvider.updateContent(previewUri, newContent);
    }
  }

  /**
   * 基于新配置更新预览内容
   * 集成 clang-format 实时格式化功能
   */
  public async updatePreviewWithConfig(
    newConfig: Record<string, any>,
  ): Promise<void> {
    const { previewUri } = this.context.stateManager.getState();
    if (!previewUri) {
      return;
    }

    try {
      // 使用 clang-format 格式化预览代码
      const formatResult = await this.formatService.format(
        MACRO_PREVIEW_CODE,
        newConfig,
      );

      if (formatResult.success) {
        // 添加配置注释到格式化后的代码顶部
        const configComment = this.generateConfigComment(newConfig);
        const updatedContent = `${configComment}\n\n${formatResult.formattedCode}`;

        this.previewProvider.updateContent(previewUri, updatedContent);
      } else {
        // 如果格式化失败，回退到原始代码 + 配置注释
        const configComment = this.generateConfigComment(newConfig);
        const updatedContent = `${configComment}\n\n${MACRO_PREVIEW_CODE}`;

        this.previewProvider.updateContent(previewUri, updatedContent);
      }
    } catch (error) {
      // 出错时回退到原始代码
      const configComment = this.generateConfigComment(newConfig);
      const updatedContent = `${configComment}\n\n${MACRO_PREVIEW_CODE}`;
      this.previewProvider.updateContent(previewUri, updatedContent);
    }
  }

  /**
   * 生成配置注释
   */
  private generateConfigComment(config: Record<string, any>): string {
    const configEntries = Object.entries(config)
      .filter(([key, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `//   ${key}: ${JSON.stringify(value)}`)
      .join('\n');

    return `// Clotho Clang-Format Configuration Preview
// Active configuration:
${configEntries || '//   (using base style defaults)'}
// ==========================================`;
  }

  dispose(): void {
    this.closePreview();
  }

  private setupEventListeners() {
    // 【修复】移除重复的 open-preview-requested 监听器
    // 这个事件已经在 Coordinator 中通过 DebounceIntegration 处理了
    // this.context.eventBus.on('open-preview-requested', async () => {
    //   await this.openPreview();
    // });

    this.context.eventBus.on('close-preview-requested', () =>
      this.closePreview(),
    ); // 程序关闭，不创建占位符

    this.context.eventBus.on(
      'config-updated-for-preview',
      ({ newConfig }: any) => {
        // 这里可以添加基于新配置更新预览的逻辑
        // 目前先简单地重新应用宏观预览代码，未来可以集成clang-format格式化
        this.updatePreviewWithConfig(newConfig);
      },
    );

    // 【新增】监听主编辑器关闭事件 - 联动关闭预览
    this.context.eventBus.on('editor-closed', async () => {
      console.log('[PreviewManager] 主编辑器已关闭，关闭预览');
      await this.closePreview();

      // 清理预览内容和状态
      const { previewUri } = this.context.stateManager.getState();
      if (previewUri) {
        this.previewProvider.clearContent(previewUri);
        await this.context.stateManager.updateState(
          {
            previewMode: 'closed',
            previewUri: undefined,
            previewEditor: undefined,
          },
          'preview-closed-by-editor',
        );
      }
    });

    // 【新增】监听主编辑器可见性变化事件 - 隐藏/显示预览
    this.context.eventBus.on('editor-visibility-changed', async ({ isVisible }: { isVisible: boolean }) => {
      console.log(`[PreviewManager] 主编辑器可见性变化: ${isVisible}`);

      const { previewMode } = this.context.stateManager.getState();
      if (previewMode !== 'open') {
        return; // 只有在预览打开时才处理可见性变化
      }

      if (isVisible) {
        // 主编辑器变为可见，恢复预览
        if (this.isHidden) {
          console.log('[PreviewManager] 恢复预览显示');
          await this.showPreview();
        }
      } else {
        // 主编辑器变为不可见，隐藏预览
        if (!this.isHidden) {
          console.log('[PreviewManager] 隐藏预览');
          await this.hidePreview();
        }
      }
    });

    // 【保留】监听编辑器标签关闭事件 - 更可靠的检测方式
    vscode.window.tabGroups.onDidChangeTabs(async (event) => {
      const state = this.context.stateManager.getState();
      if (!state.previewUri) {
        return;
      }

      // 检查是否有预览标签被关闭
      for (const tab of event.closed) {
        const tabInput = tab.input as { uri?: vscode.Uri };
        if (tabInput?.uri?.toString() === state.previewUri.toString()) {
          console.log('[PreviewManager] 预览标签被手动关闭');

          // 检查主编辑器是否仍然活跃
          const shouldCreatePlaceholder =
            state.isVisible &&
            state.isInitialized &&
            state.previewMode === 'open';
          console.log(
            `[PreviewManager] 是否应创建占位符: ${shouldCreatePlaceholder}`,
          );

          // 清理预览内容
          this.previewProvider.clearContent(state.previewUri);

          // 更新状态 - 无论如何都要确保状态被设置为closed
          await this.context.stateManager.updateState(
            {
              previewMode: 'closed',
              previewUri: undefined,
              previewEditor: undefined,
            },
            'preview-tab-closed',
          );

          // 重置隐藏状态
          this.isHidden = false;
          this.hiddenViewColumn = undefined;

          if (shouldCreatePlaceholder) {
            console.log('[PreviewManager] 发送预览关闭事件，以创建占位符');
            this.context.eventBus.emit('preview-closed');
          }
          break;
        }
      }
    });
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
