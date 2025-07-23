/**
 * Clang-Format Visual Editor Module
 * 导出 clang-format 图形化编辑器的所有功能
 */

import * as vscode from 'vscode';

export { ClangFormatService } from './format-service';
export { ClangFormatPreviewProvider } from './preview-provider';
export { GuideService } from './guide-service';

// 导出新的、重构后的视觉编辑器协调器
export { ClangFormatEditorCoordinator as ClangFormatVisualEditorCoordinator } from './coordinator';

// =========================================================================
//  旧版协调器（保留用于调试和比较）
// =========================================================================
import { ClangFormatEditorCoordinator as ClangFormatVisualEditorCoordinator } from './coordinator';
import { EasterEggManager } from './core/easter-egg-manager';
// =========================================================================

/**
 * 激活 Clang-Format 可视化编辑器模块
 * @param context 扩展上下文
 */
export function activate(context: vscode.ExtensionContext): void {
    // 注册虚拟文档内容提供者
    ClangFormatPreviewProvider.register(context);
}

// 便利函数：创建并显示 clang-format 编辑器
export async function createClangFormatEditor(extensionUri: vscode.Uri): Promise<ClangFormatVisualEditorCoordinator> {
    const coordinator = new ClangFormatVisualEditorCoordinator(extensionUri);
    await coordinator.showEditor();
    return coordinator;
}
