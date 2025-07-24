/**
 * 过渡系统集成示例
 * 展示如何将新的过渡协调器集成到现有架构中
 */

import * as vscode from 'vscode';
import { ClangFormatService } from '../format-service';
import { TransitionCoordinator, TransitionReason } from './transition-coordinator';
import { SmoothTransitionManager } from './smooth-transition-manager';
import { EventBus } from '../messaging/event-bus';
import { EditorStateManager } from '../state/editor-state-manager';

/**
 * 集成示例：展示如何修改现有的 coordinator 来使用新的过渡系统
 */
export class IntegratedClangFormatCoordinator {
    private formatService: ClangFormatService;
    private transitionCoordinator: TransitionCoordinator;
    private smoothTransition: SmoothTransitionManager;
    private eventBus: EventBus;
    private stateManager: EditorStateManager;

    constructor(private extensionUri: vscode.Uri) {
        this.formatService = ClangFormatService.getInstance(); // 使用单例
        this.eventBus = new EventBus();
        this.stateManager = new EditorStateManager(this.eventBus);
        this.smoothTransition = new SmoothTransitionManager(extensionUri);

        // 创建过渡协调器
        this.transitionCoordinator = new TransitionCoordinator(
            this.eventBus,
            this.stateManager,
            extensionUri,
            {
                crossfadeDuration: 300,
                enableAnimations: true,
                placeholderDelay: 100,
                previewTimeout: 5000,
            }
        );
    }

    /**
     * 处理配置变更的示例
     */
    async handleConfigChange(config: Record<string, any>): Promise<void> {
        try {
            // 显示加载状态
            this.eventBus.emit('show-loading', { message: 'Updating preview...' });

            // 验证配置
            const validation = await this.formatService.validateConfig(config);
            if (!validation.isValid) {
                // 显示错误占位符
                this.eventBus.emit('placeholder-show-error', {
                    error: validation.error || 'Invalid configuration',
                });
                return;
            }

            // 请求预览更新 - 过渡协调器会自动处理平滑切换
            this.eventBus.emit('preview-requested', {
                config,
                reason: TransitionReason.CONFIG_CHANGED,
            });

        } catch (error) {
            this.eventBus.emit('placeholder-show-error', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            this.eventBus.emit('hide-loading');
        }
    }

    /**
     * 处理用户手动关闭预览标签页
     */
    handlePreviewTabClosed(): void {
        console.log('IntegratedCoordinator: Preview tab was closed by user');

        // 发出预览关闭事件 - 过渡协调器会判断是否显示彩蛋占位符
        this.eventBus.emit('preview-closed', {
            reason: TransitionReason.USER_CLOSED_TAB,
            timestamp: Date.now(),
        });
    }

    /**
     * 处理编辑器关闭
     */
    handleEditorClosed(): void {
        console.log('IntegratedCoordinator: Editor was closed');

        // 发出编辑器关闭事件 - 过渡协调器会清理而不显示占位符
        this.eventBus.emit('editor-closed', {
            reason: TransitionReason.EDITOR_CLOSED,
            timestamp: Date.now(),
        });
    }

    /**
     * 处理格式化错误
     */
    handleFormatError(error: string): void {
        console.log('IntegratedCoordinator: Format error occurred', error);

        // 发出预览关闭事件，但原因是错误
        this.eventBus.emit('preview-closed', {
            reason: TransitionReason.FORMAT_ERROR,
            error,
            timestamp: Date.now(),
        });
    }

    /**
     * 手动触发预览显示
     */
    async showPreview(config: Record<string, any>): Promise<void> {
        this.eventBus.emit('preview-requested', {
            config,
            reason: TransitionReason.MANUAL_TRIGGER,
        });
    }

    /**
     * 获取当前过渡状态
     */
    getCurrentTransitionState(): any {
        return {
            currentTransition: this.transitionCoordinator.getCurrentTransition(),
            animationState: this.smoothTransition.getCurrentState(),
        };
    }

    /**
     * 更新过渡配置
     */
    updateTransitionSettings(settings: {
        enableAnimations?: boolean;
        crossfadeDuration?: number;
        placeholderDelay?: number;
    }): void {
        this.transitionCoordinator.updateConfig(settings);
        console.log('IntegratedCoordinator: Transition settings updated', settings);
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.transitionCoordinator.dispose();
        this.smoothTransition.reset();
        this.eventBus.dispose();
    }
}

/**
 * 使用示例
 */
export function createIntegratedExample(extensionUri: vscode.Uri): IntegratedClangFormatCoordinator {
    const coordinator = new IntegratedClangFormatCoordinator(extensionUri);

    // 示例配置
    const exampleConfig = {
        BasedOnStyle: 'Google',
        IndentWidth: 4,
        TabWidth: 4,
        UseTab: false,
        ColumnLimit: 100,
    };

    // 演示平滑过渡
    setTimeout(async () => {
        console.log('=== 演示开始：平滑过渡系统 ===');

        // 1. 显示预览
        console.log('1. 显示初始预览');
        await coordinator.showPreview(exampleConfig);

        // 2. 模拟配置变更
        setTimeout(() => {
            console.log('2. 配置变更 - 应该看到平滑过渡');
            coordinator.handleConfigChange({
                ...exampleConfig,
                IndentWidth: 2,
            });
        }, 2000);

        // 3. 模拟用户关闭标签页
        setTimeout(() => {
            console.log('3. 用户关闭标签页 - 应该显示彩蛋占位符');
            coordinator.handlePreviewTabClosed();
        }, 4000);

        // 4. 重新打开预览
        setTimeout(() => {
            console.log('4. 重新打开预览 - 应该从占位符平滑切换到预览');
            coordinator.showPreview(exampleConfig);
        }, 6000);

        // 5. 模拟格式化错误
        setTimeout(() => {
            console.log('5. 模拟格式化错误 - 应该显示错误占位符');
            coordinator.handleFormatError('clang-format executable not found');
        }, 8000);

        console.log('=== 演示结束：平滑过渡系统 ===');
    }, 1000);

    return coordinator;
}
