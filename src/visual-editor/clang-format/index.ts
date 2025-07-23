/**
 * Clang-Format Visual Editor Module
 * 导出 clang-format 图形化编辑器的所有功能
 */

import * as vscode from 'vscode';

export { RefactoredClangFormatEditorCoordinator as ClangFormatVisualEditorCoordinator } from './refactored-coordinator';
export { ClangFormatService } from './format-service';
export { ClangFormatPreviewProvider } from './preview-provider';
export { CLANG_FORMAT_OPTIONS, DEFAULT_CLANG_FORMAT_CONFIG, MACRO_PREVIEW_CODE } from './config-options';
// 类型定义已迁移到 src/common/types/，通过那里导入

import { RefactoredClangFormatEditorCoordinator as ClangFormatVisualEditorCoordinator } from './refactored-coordinator';
import { ClangFormatPreviewProvider } from './preview-provider';

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
