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
        console.log('PreviewManager initialized.');
    }

    /**
     * 打开预览编辑器
     */
    async openPreview(): Promise<void> {
        const state = this.context.stateManager.getState();
        // 如果不是关闭状态，就直接返回，防止重复打开
        if (state.previewMode !== 'closed') {
            console.log(`Preview is already ${state.previewMode}.`);
            return;
        }

        try {
            await this.context.stateManager.updateState({ previewMode: 'transitioning' }, 'preview-opening');

            const previewUri = this.previewProvider.createPreviewUri(`preview-${Date.now()}.cpp`);
            // 初始化预览内容
            // 示例代码
            const initialContent = MACRO_PREVIEW_CODE;
            this.previewProvider.updateContent(previewUri, initialContent);

            const editor = await vscode.window.showTextDocument(previewUri, {
                viewColumn: vscode.ViewColumn.Two,
                preserveFocus: true,
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
        } catch (error: any) {
            await this.context.errorRecovery.handleError('preview-creation-failed', error);
        }
    }

    /**
     * 关闭预览编辑器
     */
    async closePreview(): Promise<void> {
        const { previewUri } = this.context.stateManager.getState();
        if (!previewUri) return;

        try {
            // 查找并关闭对应的编辑器标签页
            for (const tabGroup of vscode.window.tabGroups.all) {
                for (const tab of tabGroup.tabs) {
                    const tabInput = tab.input as { uri?: vscode.Uri };
                    if (tabInput?.uri?.toString() === previewUri.toString()) {
                        await vscode.window.tabGroups.close(tab);
                        break;
                    }
                }
            }
        } catch (error: any) {
            await this.context.errorRecovery.handleError('preview-close-failed', error);
        } finally {
            // 无论关闭tab是否成功，都清理状态
            this.previewProvider.clearContent(previewUri);
            await this.context.stateManager.updateState(
                {
                    previewMode: 'closed',
                    previewUri: undefined,
                    previewEditor: undefined,
                },
                'preview-closed'
            );
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
            console.log('No preview URI available for config update');
            return;
        }

        try {
            // 使用 clang-format 格式化预览代码
            console.log('🔄 Formatting preview code with clang-format...');
            const formatResult = await this.formatService.format(MACRO_PREVIEW_CODE, newConfig);

            if (formatResult.success) {
                // 添加配置注释到格式化后的代码顶部
                const configComment = this.generateConfigComment(newConfig);
                const updatedContent = `${configComment}\n\n${formatResult.formattedCode}`;

                this.previewProvider.updateContent(previewUri, updatedContent);
                console.log('✅ Preview content updated with clang-format formatting');
            } else {
                // 如果格式化失败，回退到原始代码 + 配置注释
                console.warn('⚠️ clang-format failed, using original code:', formatResult.error);
                const configComment = this.generateConfigComment(newConfig);
                const updatedContent = `${configComment}\n\n${MACRO_PREVIEW_CODE}`;

                this.previewProvider.updateContent(previewUri, updatedContent);
            }
        } catch (error) {
            console.error('Failed to update preview with config:', error);
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
        this.context.eventBus.on('open-preview-requested', () => this.openPreview());
        this.context.eventBus.on('close-preview-requested', () => this.closePreview());
        this.context.eventBus.on('config-updated-for-preview', ({ newConfig }: any) => {
            console.log('🔍 DEBUG: Received config update for preview:', newConfig);
            // 这里可以添加基于新配置更新预览的逻辑
            // 目前先简单地重新应用宏观预览代码，未来可以集成clang-format格式化
            this.updatePreviewWithConfig(newConfig);
        });

        // 监听主编辑器的可视状态变化
        this.context.eventBus.on('editor-visibility-changed', ({ isVisible }: { isVisible: boolean }) => {
            if (isVisible) {
                console.log('Editor is visible again, reopening preview.');
                this.openPreview();
            } else {
                console.log('Editor is no longer visible, closing preview.');
                this.closePreview();
            }
        });

        // 监听文档关闭事件，以处理用户手动关闭预览的情况
        vscode.workspace.onDidCloseTextDocument(async (doc) => {
            const state = this.context.stateManager.getState();
            if (doc.uri.toString() === state.previewUri?.toString()) {
                console.log('Preview document was closed manually.');
                await this.context.stateManager.updateState({
                    previewMode: 'closed',
                    previewUri: undefined,
                    previewEditor: undefined
                }, 'preview-closed-manually');
                this.context.eventBus.emit('preview-closed');
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