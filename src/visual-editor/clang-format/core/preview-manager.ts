import * as vscode from 'vscode';
import { UI_TIMING } from '../../../common/constants';
import { logger } from '../../../common/logger';
import { BaseManager, ManagerContext } from '../../../common/types';
import { MACRO_PREVIEW_CODE } from '../data/clang-format-options-database';
import { ClangFormatService } from '../format-service';
import { ClangFormatPreviewProvider } from '../preview-provider';

/**
 * 预览编辑器管理器
 * 【重构后】只负责创建、更新和关闭预览文档，不包含决策逻辑
 */
export class PreviewEditorManager implements BaseManager {
  readonly name = 'PreviewManager';

  private context!: ManagerContext;
  private previewProvider: ClangFormatPreviewProvider;
  private formatService: ClangFormatService;

  // Lifecycle state management
  private isHidden: boolean = false;
  private hiddenViewColumn: vscode.ViewColumn | undefined;

  // Prevent concurrent creation lock
  private isCreatingPreview: boolean = false;

  constructor() {
    this.previewProvider = ClangFormatPreviewProvider.getInstance();
    this.formatService = ClangFormatService.getInstance();
  }

  async initialize(context: ManagerContext): Promise<void> {
    this.context = context;
    this.setupEventListeners(); // Setup event listeners
  }

  /**
   * 打开预览编辑器 (优化版)
   * 【新增】支持复用现有预览，避免重复创建
   */
  async openPreview(): Promise<vscode.TextEditor> {
    // Prevent concurrent creation
    if (this.isCreatingPreview) {
      logger.debug('预览正在创建中，等待完成', {
        module: 'PreviewManager',
        operation: 'openPreview'
      });
      // 等待当前创建完成，然后返回结果
      while (this.isCreatingPreview) {
        await new Promise(resolve => setTimeout(resolve, UI_TIMING.PREVIEW_DEBOUNCE));
      }
      const state = this.context.stateManager.getState();
      if (state.previewEditor && !state.previewEditor.document.isClosed) {
        return state.previewEditor;
      }
    }

    const currentState = this.context.stateManager.getState();

    // 【优化】如果已有预览且未被关闭，直接复用
    if (currentState.previewUri && currentState.previewEditor) {
      try {
        // 检查编辑器是否仍然有效
        if (!currentState.previewEditor.document.isClosed) {
          // 如果预览被隐藏，恢复显示
          if (this.isHidden) {
            await this.showPreview();
          }

          return currentState.previewEditor;
        }
      } catch (error) {
        // 现有预览无效，继续创建新预览
      }
    }

          // Set creation lock
    this.isCreatingPreview = true;

    try {
      // 【完善】清理所有现有预览标签页
      await this.cleanupAllExistingPreviews();

      const previewUri = this.previewProvider.createPreviewUri(
        `preview-${Date.now()}.cpp`,
      );

      // 初始化预览内容
      const initialContent = MACRO_PREVIEW_CODE;
      this.previewProvider.updateContent(previewUri, initialContent);

      // 创建预览编辑器
      const editor = await vscode.window.showTextDocument(previewUri, {
        viewColumn: vscode.ViewColumn.Beside, // 使用 Beside 而不是 Two
        preserveFocus: false,
        preview: false,
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

      return editor;
    } catch (error) {
      logger.error('Failed to create preview editor', error as Error, {
        module: 'PreviewManager',
        operation: 'openPreview'
      });
      throw error;
    } finally {
      // Release creation lock
      this.isCreatingPreview = false;
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

    // Reset hidden state
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

      // 查找并关闭预览标签页（但不清理内容）
      for (const tabGroup of vscode.window.tabGroups.all) {
        for (const tab of tabGroup.tabs) {
          const tabInput = tab.input as { uri?: vscode.Uri };
          if (tabInput?.uri?.toString() === previewUri.toString()) {
            // Set hidden state before closing tab
            // 这样 tabGroups.onDidChangeTabs 事件处理器就能正确识别这是程序隐藏
            this.isHidden = true;

            await vscode.window.tabGroups.close(tab);

            // 【重要】不清理 previewProvider 的内容，只关闭标签页
            // 这样恢复时可以重新打开相同的内容
            return;
          }
        }
      }
    } catch (error) {
      logger.error('Failed to hide preview', error as Error, {
        module: 'PreviewManager',
        operation: 'hidePreview'
      });
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
      logger.debug('恢复预览显示', {
        module: 'PreviewManager',
        operation: 'showPreview',
        viewColumn: this.hiddenViewColumn
      });

      // Check if preview content still exists
      const hasContent = this.previewProvider.hasContent(previewUri);
      if (!hasContent) {
        logger.debug('预览内容已丢失，重新创建', {
          module: 'PreviewManager',
          operation: 'showPreview'
        });
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

      logger.debug('Preview restored successfully', {
        module: 'PreviewManager',
        operation: 'showPreview'
      });
    } catch (error) {
      logger.error('Failed to restore preview, trying to recreate', error as Error, {
        module: 'PreviewManager',
        operation: 'showPreview'
      });

      // If restore fails, try to recreate preview
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
        logger.debug('重新创建预览', {
          module: 'PreviewManager',
          operation: 'showPreview'
        });
        await this.openPreview();
      } catch (recreateError) {
        logger.error('Failed to recreate preview as well', recreateError as Error, {
          module: 'PreviewManager',
          operation: 'showPreview'
        });
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
      logger.error('Error updating preview', error as Error, {
        module: 'PreviewManager',
        operation: 'updatePreviewContent'
      });
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

    // Listen for main editor close events - close preview accordingly
    this.context.eventBus.on('editor-closed', async () => {
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
      const { previewMode } = this.context.stateManager.getState();
      if (previewMode !== 'open') {
        return; // 只有在预览打开时才处理可见性变化
      }

      if (isVisible) {
        // 主编辑器变为可见，恢复预览
        if (this.isHidden) {
          await this.showPreview();
        }
      } else {
        // 主编辑器变为不可见，真正隐藏预览（不显示占位符）
        if (!this.isHidden) {
          await this.hidePreview();

          // 【关键】阻止占位符显示
          // 通过发送特殊事件告诉占位符管理器不要创建占位符
          this.context.eventBus.emit('preview-hidden-by-visibility', {
            reason: 'editor-not-visible'
          });
        }
      }
    });

    // Listen for editor tab close events - distinguish manual vs programmatic close
    vscode.window.tabGroups.onDidChangeTabs(async (event) => {
      const state = this.context.stateManager.getState();
      if (!state.previewUri) {
        return;
      }

      // 检查是否有预览标签被关闭
      for (const tab of event.closed) {
        const tabInput = tab.input as { uri?: vscode.Uri };
        if (tabInput?.uri?.toString() === state.previewUri.toString()) {
          logger.debug('预览标签被关闭', {
            module: 'PreviewManager',
            operation: 'onTabClosed'
          });

          // If close is due to programmatic hiding, don't clear state
          if (this.isHidden) {
            logger.debug('这是程序隐藏导致的关闭，保持状态', {
              module: 'PreviewManager',
              operation: 'onTabClosed'
            });
            return; // 不处理程序隐藏导致的标签关闭
          }

          logger.debug('这是用户手动关闭', {
            module: 'PreviewManager',
            operation: 'onTabClosed'
          });

          // 检查主编辑器是否仍然活跃
          const shouldCreatePlaceholder =
            state.isVisible &&
            state.isInitialized &&
            state.previewMode === 'open';
          logger.debug('是否应创建占位符', {
            module: 'PreviewManager',
            operation: 'onTabClosed',
            shouldCreatePlaceholder
          });

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
            logger.debug('发送预览关闭事件，以创建占位符', {
              module: 'PreviewManager',
              operation: 'onTabClosed'
            });
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
