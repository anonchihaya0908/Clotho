import * as vscode from 'vscode';
import { createModuleLogger } from '../../../common/logger/unified-logger';
import { BaseManager, ManagerContext } from '../../../common/types';
import { MACRO_PREVIEW_CODE } from '../data/clang-format-options-database';
import { ClangFormatService } from '../format-service';
import { ClangFormatPreviewProvider } from '../preview-provider';
import { getStateOrDefault } from '../types/state';
import { EventBus } from '../messaging/event-bus';
import { onTyped, emitTyped } from '../messaging/typed-event-bus';
import { getOptionSnippet } from '../data/snippets-metadata';

/**
 * 预览编辑器管理器
 * 【重构后】只负责创建、更新和关闭预览文档，不包含决策逻辑
 */
export class PreviewEditorManager implements BaseManager {
  private readonly logger = createModuleLogger('PreviewEditorManager');

  readonly name = 'PreviewManager';

  private context!: ManagerContext;
  private previewProvider: ClangFormatPreviewProvider;
  private formatService: ClangFormatService;

  // Lifecycle state management
  private isHidden: boolean = false;
  private hiddenViewColumn: vscode.ViewColumn | undefined;

  // Prevent concurrent creation - use Promise instead of boolean lock
  private creationPromise: Promise<vscode.TextEditor> | null = null;

  // Disposables tracking for proper cleanup
  private readonly disposables: vscode.Disposable[] = [];
  private hoverDecorationType: vscode.TextEditorDecorationType;
  private focusDecorationType: vscode.TextEditorDecorationType;
  private lastHighlightRange: { startLine: number; endLine: number } | null = null;

  constructor() {
    this.previewProvider = ClangFormatPreviewProvider.getInstance();
    this.formatService = ClangFormatService.getInstance();
    this.hoverDecorationType = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      backgroundColor: new vscode.ThemeColor('editor.wordHighlightBackground'),
      overviewRulerColor: new vscode.ThemeColor('editor.wordHighlightBackground'),
      overviewRulerLane: vscode.OverviewRulerLane.Center,
    });
    this.focusDecorationType = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
      border: '1px solid',
      borderColor: new vscode.ThemeColor('editor.findMatchBorder'),
      overviewRulerColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
      overviewRulerLane: vscode.OverviewRulerLane.Full,
    });
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
    // Prevent concurrent creation - return existing promise if already creating
    if (this.creationPromise) {
      this.logger.debug('预览正在创建中，返回现有Promise', {
        module: 'PreviewManager',
        operation: 'openPreview'
      });
      return this.creationPromise;
    }

    const currentState = getStateOrDefault(this.context.stateManager?.getState());

    // 【优化】如果已有预览且未被关闭，直接复用
    if (currentState.previewUri && currentState.previewEditor) {
      try {
        // 检查编辑器是否仍然有效
        const doc = currentState.previewEditor.document;
        if (doc && !doc.isClosed) {
          // 如果预览被隐藏，恢复显示
          if (this.isHidden) {
            await this.showPreview();
          }

          return currentState.previewEditor;
        }
      } catch {
        // 现有预览无效，继续创建新预览
      }
    }

    // Set creation promise
    this.creationPromise = this.performPreviewCreation();

    try {
      const editor = await this.creationPromise;
      return editor;
    } finally {
      this.creationPromise = null;
    }
  }

  /**
   * 执行预览创建的实际逻辑
   */
  private async performPreviewCreation(): Promise<vscode.TextEditor> {
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
      if (this.context.stateManager) {
        await this.context.stateManager.updateState(
          {
            previewMode: 'open',
            previewUri,
            previewEditor: editor,
          },
          'preview-opened',
        );
      }
      this.context.eventBus?.emit('preview-opened');

      return editor;
    } catch (error) {
      this.logger.error('Failed to create preview editor', error as Error, {
        module: 'PreviewManager',
        operation: 'performPreviewCreation'
      });
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
      await vscode.window.tabGroups.close(tabsToClose);
    }
  }

  /**
   * 关闭预览编辑器 (优化版)
   */
  async closePreview(): Promise<void> {
    const state = this.context.stateManager?.getState() || {};
    const { previewUri } = state;
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
    const state = getStateOrDefault(this.context.stateManager?.getState());
    const { previewEditor, previewUri } = state;
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
      this.logger.error('Failed to hide preview', error as Error, {
        module: 'PreviewManager',
        operation: 'hidePreview'
      });
    }
  }

  /**
   * 【优化】显示之前隐藏的预览编辑器（智能恢复策略）
   */
  async showPreview(): Promise<void> {
    const state = getStateOrDefault(this.context.stateManager?.getState());
    const { previewUri } = state;
    if (!previewUri || !this.isHidden) {
      return;
    }

    try {
      this.logger.debug('恢复预览显示', {
        module: 'PreviewManager',
        operation: 'showPreview',
        metadata: { viewColumn: this.hiddenViewColumn }
      });

      // Check if preview content still exists
      const hasContent = this.previewProvider.hasContent(previewUri);
      if (!hasContent) {
        this.logger.debug('预览内容已丢失，重新创建', {
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
      if (this.context.stateManager) {
        await this.context.stateManager.updateState(
          { previewEditor: editor },
          'preview-restored',
        );
      }

      this.isHidden = false;
      this.hiddenViewColumn = undefined;

      this.logger.debug('Preview restored successfully', {
        module: 'PreviewManager',
        operation: 'showPreview'
      });
    } catch (error) {
      this.logger.error('Failed to restore preview, trying to recreate', error as Error, {
        module: 'PreviewManager',
        operation: 'showPreview'
      });

      // If restore fails, try to recreate preview
      try {
        this.isHidden = false;
        this.hiddenViewColumn = undefined;

        // 清理旧状态
        if (this.context.stateManager) {
          await this.context.stateManager.updateState(
            {
              previewMode: 'closed',
              previewUri: undefined,
              previewEditor: undefined,
            },
            'preview-recovery-failed',
          );
        }

        // 重新创建预览
        this.logger.debug('重新创建预览', {
          module: 'PreviewManager',
          operation: 'showPreview'
        });
        await this.openPreview();
      } catch (recreateError) {
        this.logger.error('Failed to recreate preview as well', recreateError as Error, {
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
    const state = getStateOrDefault(this.context.stateManager?.getState());
    const { previewUri } = state;
    if (previewUri) {
      this.previewProvider.updateContent(previewUri, newContent);
    }
  }

  /**
   * 基于新配置更新预览内容
   * 集成 clang-format 实时格式化功能
   */
  public async updatePreviewWithConfig(
    newConfig: import('../../../common/types/clang-format-shared').ClangFormatConfig,
  ): Promise<void> {
    const state = getStateOrDefault(this.context.stateManager?.getState());
    const { previewUri } = state;
    if (!previewUri) {
      return;
    }

    try {
      // 使用 clang-format 格式化预览代码
      const formatResult = await this.formatService.format(
        MACRO_PREVIEW_CODE,
        newConfig as unknown as Record<string, unknown>,
        this.lastHighlightRange ?? undefined,
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
      this.logger.error('Error updating preview', error as Error, {
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
  private generateConfigComment(config: Record<string, unknown>): string {
    const configEntries = Object.entries(config)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `//   ${key}: ${JSON.stringify(value)}`)
      .join('\n');

    return `// Clotho Clang-Format Configuration Preview
// Active configuration:
${configEntries || '//   (using base style defaults)'}
// ==========================================`;
  }

  private applyHighlightsForOption(optionKey: string, kind: 'hover' | 'focus' = 'hover'): void {
    const state = getStateOrDefault(this.context.stateManager?.getState());
    const editor = state.previewEditor;
    if (!editor) { return; }

    const doc = editor.document;
    const text = doc.getText();
    const lines = text.split(/\r?\n/);
    const snippet = getOptionSnippet(optionKey);
    const ranges: vscode.Range[] = [];
    if (snippet?.anchors && snippet.anchors.length > 0) {
      for (const a of snippet.anchors) {
        let lineIdx = (a.startLine ?? 1) - 1;
        if (a.token) {
          const found = lines.findIndex(l => l.includes(a.token!));
          if (found >= 0) { lineIdx = found; }
        }
        const safeLine = Math.max(0, Math.min(lines.length - 1, lineIdx));
        const endLine = a.endLine ? Math.min(lines.length - 1, a.endLine - 1) : safeLine;
        ranges.push(new vscode.Range(new vscode.Position(safeLine, 0), new vscode.Position(endLine, lines[endLine]?.length ?? 0)));
      }
    } else {
      const endLine = Math.min(3, lines.length - 1);
      ranges.push(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(endLine, lines[endLine]?.length ?? 0)));
    }

    // hover 使用弱高亮，focus 使用强高亮。两者互斥显示
    editor.setDecorations(this.hoverDecorationType, kind === 'hover' ? ranges : []);
    editor.setDecorations(this.focusDecorationType, kind === 'focus' ? ranges : []);

    // 记录最近的高亮范围（首个 range），用于局部格式化试点
    if (ranges.length > 0) {
      const r = ranges[0]!;
      this.lastHighlightRange = { startLine: r.start.line + 1, endLine: r.end.line + 1 };
    }
  }

  private clearHighlights(): void {
    const state = getStateOrDefault(this.context.stateManager?.getState());
    const editor = state.previewEditor;
    if (!editor) { return; }
    editor.setDecorations(this.hoverDecorationType, []);
    editor.setDecorations(this.focusDecorationType, []);
  }

  dispose(): void {
    // Clean up all disposables
    this.disposables.forEach(d => d.dispose());
    this.disposables.length = 0;
    this.hoverDecorationType.dispose();
    this.focusDecorationType.dispose();
    this.closePreview();
  }

  private setupEventListeners() {
    // 不再直接监听 open-preview-requested（由 Coordinator 统一处理）
    this.context.eventBus?.on('close-preview-requested', () => this.closePreview());

    // 预览配置更新
    if (this.context.eventBus) {
      onTyped(this.context.eventBus as unknown as EventBus, 'config-updated-for-preview', ({ newConfig }) => {
        this.updatePreviewWithConfig(newConfig);
      });
    }

    // 主编辑器关闭 → 关闭预览并清理状态
    this.context.eventBus?.on('editor-closed', async () => {
      await this.closePreview();
      const state = getStateOrDefault(this.context.stateManager?.getState());
      const { previewUri } = state;
      if (previewUri) {
        this.previewProvider.clearContent(previewUri);
        if (this.context.stateManager) {
          await this.context.stateManager.updateState({
            previewMode: 'closed',
            previewUri: undefined,
            previewEditor: undefined,
          }, 'preview-closed-by-editor');
        }
      }
    });

    // 可见性变化 → 真正隐藏/恢复预览（不显示占位符）
    if (this.context.eventBus) {
      onTyped(this.context.eventBus as unknown as EventBus, 'editor-visibility-changed', async ({ isVisible }) => {
        const state = getStateOrDefault(this.context.stateManager?.getState());
        const { previewMode } = state;
        if (previewMode !== 'open') { return; }
        if (isVisible) {
          if (this.isHidden) { await this.showPreview(); }
        } else {
          if (!this.isHidden) {
            await this.hidePreview();
            emitTyped(this.context.eventBus as unknown as EventBus, 'preview-hidden-by-visibility');
          }
        }
      });
    }

    // 悬停/聚焦高亮 & 清除
    if (this.context.eventBus) {
      onTyped(this.context.eventBus as unknown as EventBus, 'config-option-hover', ({ key }) => { this.applyHighlightsForOption(String(key), 'hover'); });
      onTyped(this.context.eventBus as unknown as EventBus, 'config-option-focus', ({ key }) => { this.applyHighlightsForOption(String(key), 'focus'); });
      onTyped(this.context.eventBus as unknown as EventBus, 'clear-highlights', () => { this.clearHighlights(); });
    }

    // 宏预览源切换（demoSnippet / activeFile）
    if (this.context.eventBus) {
      onTyped(this.context.eventBus as unknown as EventBus, 'macro-preview-requested', async ({ source }) => {
        const state = getStateOrDefault(this.context.stateManager?.getState());
        const { previewUri, currentConfig } = state;
        if (!previewUri) { return; }
        try {
          let baseContent = MACRO_PREVIEW_CODE;
          if (source === 'activeFile') {
            const active = vscode.window.activeTextEditor;
            if (active && active.document && !active.document.isClosed) { baseContent = active.document.getText(); }
          }
          const formatResult = await this.formatService.format(baseContent, currentConfig as unknown as Record<string, unknown>);
          const header = this.generateConfigComment(currentConfig as unknown as Record<string, unknown>);
          const updatedContent = `${header}\n\n${formatResult.success ? formatResult.formattedCode : baseContent}`;
          this.previewProvider.updateContent(previewUri, updatedContent);
        } catch (error) {
          this.logger.error('Macro preview update failed', error as Error, { module: 'PreviewManager', operation: 'macro-preview-requested' });
        }
      });
    }

    // 监听标签页关闭，区分手动/程序关闭
    const tabChangeListener = vscode.window.tabGroups.onDidChangeTabs(async (event: vscode.TabChangeEvent) => {
      const state = getStateOrDefault(this.context.stateManager?.getState());
      if (!state.previewUri) { return; }
      for (const tab of event.closed) {
        const tabInput = tab.input as { uri?: vscode.Uri };
        if (tabInput?.uri?.toString() === state.previewUri?.toString()) {
          this.logger.debug('预览标签被关闭', { module: 'PreviewManager', operation: 'onTabClosed' });
          if (this.isHidden) {
            this.logger.debug('这是程序隐藏导致的关闭，保持状态', { module: 'PreviewManager', operation: 'onTabClosed' });
            return;
          }
          this.logger.debug('这是用户手动关闭', { module: 'PreviewManager', operation: 'onTabClosed' });
          const shouldCreatePlaceholder = state.isVisible && state.isInitialized && state.previewMode === 'open';
          this.logger.debug('是否应创建占位符', { module: 'PreviewManager', operation: 'onTabClosed', metadata: { shouldCreatePlaceholder } });
          if (state.previewUri) { this.previewProvider.clearContent(state.previewUri); }
          if (this.context.stateManager) {
            await this.context.stateManager.updateState({ previewMode: 'closed', previewUri: undefined, previewEditor: undefined }, 'preview-tab-closed');
            this.isHidden = false; this.hiddenViewColumn = undefined;
            if (shouldCreatePlaceholder) {
              this.context.eventBus?.emit('preview-closed');
            }
          }
          break;
        }
      }
    });
    this.disposables.push(tabChangeListener);
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
