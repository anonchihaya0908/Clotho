import * as vscode from 'vscode';
import { BaseManager, ManagerContext } from '../../../common/types';
import { ClangFormatPreviewProvider } from '../preview-provider';

/**
 * 预览编辑器管理器
 * 负责预览文档的创建、更新和生命周期管理
 */
export class PreviewEditorManager implements BaseManager {
    readonly name = 'PreviewManager';

    private context!: ManagerContext;
    private previewProvider: ClangFormatPreviewProvider;

    constructor() {
        this.previewProvider = ClangFormatPreviewProvider.getInstance();
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
        if (state.previewMode === 'open') {
            console.log('Preview is already open.');
            return;
        }

        try {
            await this.context.stateManager.updateState({ previewMode: 'transitioning' }, 'preview-opening');

            const previewUri = this.previewProvider.createPreviewUri(`preview-${Date.now()}.cpp`);
            const initialContent = "// Welcome to Clang-Format Preview!\n// Your formatted code will appear here.";
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

    dispose(): void {
        this.closePreview();
    }

    private setupEventListeners() {
        this.context.eventBus.on('open-preview-requested', () => this.openPreview());
        this.context.eventBus.on('close-preview-requested', () => this.closePreview());
        this.context.eventBus.on('config-updated-for-preview', ({ newConfig }) => {
            // 这里可以添加基于新配置更新预览的逻辑
            // 比如，重新格式化并更新内容
            // this.updatePreviewContent(formattedContent);
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