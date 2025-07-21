/**
 * Clang-Format Visual Editor Module
 * 导出 clang-format 图形化编辑器的所有功能
 */

import * as vscode from 'vscode';

export { ClangFormatVisualEditorCoordinator } from './coordinator';
export { ClangFormatService } from './format-service';
export { CLANG_FORMAT_OPTIONS, DEFAULT_CLANG_FORMAT_CONFIG, MACRO_PREVIEW_CODE } from './config-options';
export * from './types';

import { ClangFormatVisualEditorCoordinator } from './coordinator';

// 便利函数：创建并显示 clang-format 编辑器
export async function createClangFormatEditor(extensionUri: vscode.Uri): Promise<ClangFormatVisualEditorCoordinator> {
    const coordinator = new ClangFormatVisualEditorCoordinator(extensionUri);
    await coordinator.showEditor();
    return coordinator;
}
