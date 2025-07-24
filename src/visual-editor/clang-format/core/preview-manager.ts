import * as vscode from 'vscode';
import { BaseManager, ManagerContext } from '../../../common/types';
import { ClangFormatPreviewProvider } from '../preview-provider';
import { ClangFormatService } from '../format-service';
import { MACRO_PREVIEW_CODE } from '../config-options';

/**
 * 预览编辑器管理器
 * 负责预览文档的创建、更新和生命周期管理
 */
export class PreviewEditorManager implements BaseManager {
    readonly name = 'PreviewManager';

    private context!: ManagerContext;
    private previewProvider: ClangFormatPreviewProvider;
    private formatService: ClangFormatService;

    constructor() {
        this.previewProvider = ClangFormatPreviewProvider.getInstance();
        this.formatService = new ClangFormatService();
    }

    async initialize(context: ManagerContext): Promise<void> {
        this.context = context;
        this.setupEventListeners();
    }

    /**
     * 打开预览编辑器
     */
    async openPreview(source?: string, options?: { forceReopen?: boolean }): Promise<void> {
        const forceReopen = options?.forceReopen === true;
        const state = this.context.stateManager.getState();

        console.log(`[PreviewManager] 打开预览 (source: ${source}, forceReopen: ${forceReopen})`);

        // 如果强制重新打开，则跳过状态检查
        if (forceReopen) {
            // 继续执行打开逻辑
        }
        // 如果预览已打开，则仅激活它
        else if (state.previewMode === 'open' && state.previewEditor) {
            vscode.window.showTextDocument(state.previewEditor.document, {
                viewColumn: vscode.ViewColumn.Two,
                preserveFocus: false
            });
            return;
        }
        // 如果不是关闭状态，就直接返回，防止重复打开
        else if (state.previewMode !== 'closed') {
            return;
        }

        try {
            await this.context.stateManager.updateState({ previewMode: 'transitioning' }, 'preview-opening');

            const previewUri = this.previewProvider.createPreviewUri(`preview-${Date.now()}.cpp`);
            // 初始化预览内容
            const initialContent = MACRO_PREVIEW_CODE;
            this.previewProvider.updateContent(previewUri, initialContent);

            // 创建预览编辑器
            const editor = await vscode.window.showTextDocument(previewUri, {
                viewColumn: vscode.ViewColumn.Two,
                preserveFocus: false,
                preview: false,
            });

            await this.context.stateManager.updateState(
                {
                    previewMode: 'open',
                    previewUri,
                    previewEditor: editor,
                },
                'preview-opened'
            );

            // 通知占位符预览已打开
            this.context.eventBus.emit('preview-opened');

            console.log('[PreviewManager] 预览打开成功');
        } catch (error: any) {
            console.error('[PreviewManager] 预览打开失败:', error);
            await this.context.errorRecovery.handleError('preview-creation-failed', error);

            // 如果打开失败，确保状态被重置为关闭
            await this.context.stateManager.updateState({
                previewMode: 'closed',
                previewUri: undefined,
                previewEditor: undefined
            }, 'preview-open-failed');
        }
    }

    /**
     * 关闭预览编辑器
     * @param shouldCreatePlaceholder 是否应该创建占位符（默认false，用于程序关闭）
     */
    async closePreview(shouldCreatePlaceholder: boolean = false): Promise<void> {
        console.log(`[PreviewManager] 关闭预览 (shouldCreatePlaceholder: ${shouldCreatePlaceholder})`);
        const { previewUri } = this.context.stateManager.getState();
        if (!previewUri) {
            console.log('[PreviewManager] 没有预览URI，无需关闭');
            return;
        }

        try {
            // 查找并关闭对应的编辑器标签页
            for (const tabGroup of vscode.window.tabGroups.all) {
                for (const tab of tabGroup.tabs) {
                    const tabInput = tab.input as { uri?: vscode.Uri };
                    if (tabInput?.uri?.toString() === previewUri.toString()) {
                        console.log('[PreviewManager] 找到预览标签，正在关闭');
                        await vscode.window.tabGroups.close(tab);
                        break;
                    }
                }
            }
        } catch (error: any) {
            console.error('[PreviewManager] 关闭预览失败:', error);
            await this.context.errorRecovery.handleError('preview-close-failed', error);
        } finally {
            // 无论关闭tab是否成功，都清理状态
            console.log('[PreviewManager] 清理预览内容并更新状态');
            this.previewProvider.clearContent(previewUri);
            await this.context.stateManager.updateState(
                {
                    previewMode: 'closed',
                    previewUri: undefined,
                    previewEditor: undefined,
                },
                'preview-closed'
            );

            // 【关键修复】只有在应该创建占位符时才发送事件
            if (shouldCreatePlaceholder) {
                console.log('[PreviewManager] 发送预览关闭事件，以创建占位符');
                this.context.eventBus.emit('preview-closed');
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
    private async updatePreviewWithConfig(newConfig: Record<string, any>): Promise<void> {
        const { previewUri } = this.context.stateManager.getState();
        if (!previewUri) {
            return;
        }

        try {
            // 使用 clang-format 格式化预览代码
            const formatResult = await this.formatService.format(MACRO_PREVIEW_CODE, newConfig);

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
        this.closePreview(false); // dispose时关闭，不创建占位符
    }

    private setupEventListeners() {
        this.context.eventBus.on('open-preview-requested', (data?: any) => {
            const source = data?.source || 'unknown';
            const forceReopen = data?.forceReopen === true;
            this.openPreview(source, { forceReopen });
        });

        this.context.eventBus.on('close-preview-requested', () => this.closePreview(false)); // 程序关闭，不创建占位符
        this.context.eventBus.on('config-updated-for-preview', ({ newConfig }: any) => {
            // 这里可以添加基于新配置更新预览的逻辑
            // 目前先简单地重新应用宏观预览代码，未来可以集成clang-format格式化
            this.updatePreviewWithConfig(newConfig);
        });

        // 【新增】监听编辑器标签关闭事件 - 更可靠的检测方式
        vscode.window.tabGroups.onDidChangeTabs(async (event) => {
            const state = this.context.stateManager.getState();
            if (!state.previewUri) return;

            // 检查是否有预览标签被关闭
            for (const tab of event.closed) {
                const tabInput = tab.input as { uri?: vscode.Uri };
                if (tabInput?.uri?.toString() === state.previewUri.toString()) {
                    console.log('[PreviewManager] 预览标签被手动关闭');

                    // 检查主编辑器是否仍然活跃
                    const shouldCreatePlaceholder = state.isVisible && state.isInitialized && state.previewMode === 'open';
                    console.log(`[PreviewManager] 是否应创建占位符: ${shouldCreatePlaceholder}`);

                    // 清理预览内容
                    this.previewProvider.clearContent(state.previewUri);

                    // 更新状态 - 无论如何都要确保状态被设置为closed
                    await this.context.stateManager.updateState({
                        previewMode: 'closed',
                        previewUri: undefined,
                        previewEditor: undefined
                    }, 'preview-tab-closed');

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