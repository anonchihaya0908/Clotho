/**
 * Clang-Format Visual Editor Module
 * 导出 clang-format 图形化编辑器的所有功能
 */

import * as vscode from "vscode";
import { ClangFormatEditorCoordinator } from "./coordinator";
import { ClangFormatPreviewProvider } from "./preview-provider";

export { ClangFormatService } from "./format-service";
export { ClangFormatPreviewProvider } from "./preview-provider";
export { ClangFormatGuideService } from "./guide-service";

// 导出新的、重构后的视觉编辑器协调器
export { ClangFormatEditorCoordinator as ClangFormatVisualEditorCoordinator } from "./coordinator";

/**
 * 激活 Clang-Format 可视化编辑器模块
 * @param context 扩展上下文
 */
export function activate(context: vscode.ExtensionContext): void {
  // 注册虚拟文档内容提供者
  ClangFormatPreviewProvider.register(context);
}

// 便利函数：创建并显示 clang-format 编辑器
export async function createClangFormatEditor(
  extensionUri: vscode.Uri,
): Promise<ClangFormatEditorCoordinator> {
  const coordinator = new ClangFormatEditorCoordinator(extensionUri);
  await coordinator.showEditor();
  return coordinator;
}
