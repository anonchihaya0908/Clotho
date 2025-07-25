import * as vscode from 'vscode';
import { BaseManager, ManagerContext } from '../../../common/types';
import { ClangFormatPreviewProvider } from '../preview-provider';
import { ClangFormatService } from '../format-service';
import { MACRO_PREVIEW_CODE } from '../data/clang-format-options-database';

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
   * 打开预览编辑器 (优化版)
   * 【新增】支持复用现有预览，避免重复创建
   */
  async openPreview(): Promise<vscode.TextEditor> {
    console.log('[PreviewManager] openPreview() 开始执行');
    const currentState = this.context.stateManager.getState();
    console.log('[PreviewManager] 当前状态:', {
      hasPreviewUri: !!currentState.previewUri,
      hasPreviewEditor: !!currentState.previewEditor,
      previewMode: currentState.previewMode
    });

    // 【优化】如果已有预览且未被关闭，直接复用
    if (currentState.previewUri && currentState.previewEditor) {
      try {
        // 检查编辑器是否仍然有效
        if (!currentState.previewEditor.document.isClosed) {
          console.log('[PreviewManager] 复用现有预览文档');

          // 如果预览被隐藏，恢复显示
          if (this.isHidden) {
            await this.showPreview();
          }

          return currentState.previewEditor;
        }
      } catch (error) {
        console.log('[PreviewManager] 现有预览无效，创建新预览:', error);
      }
    }

    // 【完善】清理所有现有预览标签页
    await this.cleanupAllExistingPreviews();

    const previewUri = this.previewProvider.createPreviewUri(
      `preview-${Date.now()}.cpp`,
    );
    console.log('[PreviewManager] 创建预览URI:', previewUri.toString());

    // 初始化预览内容
    const initialContent = MACRO_PREVIEW_CODE;
    this.previewProvider.updateContent(previewUri, initialContent);
    console.log('[PreviewManager] 预览内容已设置，长度:', initialContent.length);

    console.log(`[PreviewManager] 准备打开预览文档: ${previewUri.toString()}`);

    try {
      // 确保有足够的编辑器列
      console.log('[PreviewManager] 当前活动编辑器:', vscode.window.activeTextEditor?.viewColumn);
      console.log('[PreviewManager] 可见编辑器数量:', vscode.window.visibleTextEditors.length);

      // 创建预览编辑器
      const editor = await vscode.window.showTextDocument(previewUri, {
        viewColumn: vscode.ViewColumn.Beside, // 使用 Beside 而不是 Two
        preserveFocus: false,
        preview: false,
      });
      console.log('[PreviewManager] 预览编辑器创建成功:', {
        viewColumn: editor.viewColumn,
        documentUri: editor.document.uri.toString(),
        scheme: editor.document.uri.scheme
      });

      // 重置隐藏状态
      this.isHidden = false;
      this.hiddenViewColumn = undefined;

      // 更新状态
      await this.context.stateManager.updateState(
        {
          previewMode: 'open',
          previewUri,
          previewEditor: editor,
        },
        'preview-opened',
      );
      this.context.eventBus.emit('preview-opened');
      console.log('[PreviewManager] 预览状态已更新，事件已发送');

      return editor;
    } catch (error) {
      console.error('[PreviewManager] 创建预览编辑器失败:', error);
      throw error;
    }
  }

  /**
   * 【新增】清理所有现有的预览标签页
   */
  private async cleanupAllExistingPreviews(): Promise<void> {
    const previewScheme = 'clotho-clang-format-preview';
    const tabsToClose: vscode.Tab[] = [];

    // 查找所有预览标签页
    for (const tabGroup of vscode.window.tabGroups.all) {
      for (const tab of tabGroup.tabs) {
        const tabInput = tab.input as { uri?: vscode.Uri };
        if (tabInput?.uri?.scheme === previewScheme) {
          tabsToClose.push(tab);
        }
      }
    }

    // 批量关闭
    if (tabsToClose.length > 0) {
      console.log(`[PreviewManager] 清理 ${tabsToClose.length} 个现有预览标签页`);
      await vscode.window.tabGroups.close(tabsToClose);
    }
  }

  /**
   * 关闭预览编辑器 (优化版)
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
   * 【优化】隐藏预览编辑器（真正关闭标签页但保留内容）
   */
  async hidePreview(): Promise<void> {
    const { previewEditor, previewUri } = this.context.stateManager.getState();
    if (!previewEditor || !previewUri || this.isHidden) {
      return;
    }

    try {
      // 记录当前的ViewColumn以便恢复
      this.hiddenViewColumn = previewEditor.viewColumn;

      console.log(`[PreviewManager] 隐藏预览，记录位置: ${this.hiddenViewColumn}`);
      console.log(`[PreviewManager] 预览内容存在: ${this.previewProvider.hasContent(previewUri)}`);

      // 查找并关闭预览标签页（但不清理内容）
      for (const tabGroup of vscode.window.tabGroups.all) {
        for (const tab of tabGroup.tabs) {
          const tabInput = tab.input as { uri?: vscode.Uri };
          if (tabInput?.uri?.toString() === previewUri.toString()) {
            // 【关键修复】在关闭标签页之前设置隐藏状态
            // 这样 tabGroups.onDidChangeTabs 事件处理器就能正确识别这是程序隐藏
            this.isHidden = true;
            console.log('[PreviewManager] 设置隐藏状态，准备关闭标签页');

            await vscode.window.tabGroups.close(tab);
            console.log('[PreviewManager] 预览标签页已隐藏（内容保留）');

            // 【重要】不清理 previewProvider 的内容，只关闭标签页
            // 这样恢复时可以重新打开相同的内容
            return;
          }
        }
      }
    } catch (error) {
      console.error('[PreviewManager] 隐藏预览失败:', error);
    }
  }

  /**
   * 【优化】显示之前隐藏的预览编辑器（智能恢复策略）
   */
  async showPreview(): Promise<void> {
    const { previewUri } = this.context.stateManager.getState();
    if (!previewUri || !this.isHidden) {
      return;
    }

    try {
      console.log(`[PreviewManager] 恢复预览显示，位置: ${this.hiddenViewColumn}`);

      // 【修复】检查预览内容是否仍然存在
      const hasContent = this.previewProvider.hasContent(previewUri);
      if (!hasContent) {
        console.log('[PreviewManager] 预览内容已丢失，重新创建');
        // 重新创建预览内容
        const initialContent = MACRO_PREVIEW_CODE;
        this.previewProvider.updateContent(previewUri, initialContent);
      }

      // 重新打开预览编辑器
      const editor = await vscode.window.showTextDocument(previewUri, {
        viewColumn: this.hiddenViewColumn || vscode.ViewColumn.Two,
        preserveFocus: true,
        preview: false,
      });

      // 更新状态中的编辑器引用
      await this.context.stateManager.updateState(
        { previewEditor: editor },
        'preview-restored',
      );

      this.isHidden = false;
      this.hiddenViewColumn = undefined;

      console.log('[PreviewManager] 预览恢复成功');
    } catch (error) {
      console.error('[PreviewManager] 恢复预览失败，尝试重新创建:', error);

      // 【修复】如果恢复失败，尝试重新创建预览
      try {
        this.isHidden = false;
        this.hiddenViewColumn = undefined;

        // 清理旧状态
        await this.context.stateManager.updateState(
          {
            previewMode: 'closed',
            previewUri: undefined,
            previewEditor: undefined,
          },
          'preview-recovery-failed',
        );

        // 重新创建预览
        console.log('[PreviewManager] 重新创建预览');
        await this.openPreview();
      } catch (recreateError) {
        console.error('[PreviewManager] 重新创建预览也失败:', recreateError);
        // 完全重置状态
        this.isHidden = false;
        this.hiddenViewColumn = undefined;
      }
    }
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
      .filter(([, value]) => value !== undefined && value !== null)
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
    // 注意：不再直接监听 'open-preview-requested' 事件
    // 该事件现在由 Coordinator 统一处理，通过防抖集成调用 openPreview()
    // 这样避免了重复执行的问题

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

    // 【重新设计】监听主编辑器可见性变化事件 - 真正的收起/恢复
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
        // 主编辑器变为不可见，真正隐藏预览（不显示占位符）
        if (!this.isHidden) {
          console.log('[PreviewManager] 收起预览（不显示占位符）');
          await this.hidePreview();

          // 【关键】阻止占位符显示
          // 通过发送特殊事件告诉占位符管理器不要创建占位符
          this.context.eventBus.emit('preview-hidden-by-visibility', {
            reason: 'editor-not-visible'
          });
        }
      }
    });

    // 【修复】监听编辑器标签关闭事件 - 区分手动关闭和程序隐藏
    vscode.window.tabGroups.onDidChangeTabs(async (event) => {
      const state = this.context.stateManager.getState();
      if (!state.previewUri) {
        return;
      }

      // 检查是否有预览标签被关闭
      for (const tab of event.closed) {
        const tabInput = tab.input as { uri?: vscode.Uri };
        if (tabInput?.uri?.toString() === state.previewUri.toString()) {
          console.log('[PreviewManager] 预览标签被关闭');

          // 【关键修复】如果是程序隐藏导致的关闭，不要清理状态
          if (this.isHidden) {
            console.log('[PreviewManager] 这是程序隐藏导致的关闭，保持状态');
            return; // 不处理程序隐藏导致的标签关闭
          }

          console.log('[PreviewManager] 这是用户手动关闭');

          // 检查主编辑器是否仍然活跃
          const shouldCreatePlaceholder =
            state.isVisible &&
            state.isInitialized &&
            state.previewMode === 'open';
          console.log(
            `[PreviewManager] 是否应创建占位符: ${shouldCreatePlaceholder}`,
          );

          // 清理预览内容（只有用户手动关闭时才清理）
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
