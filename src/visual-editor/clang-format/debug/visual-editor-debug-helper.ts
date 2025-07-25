/**
 * Visual Editor 调试助手
 * 帮助诊断预览功能问题
 */

import * as vscode from 'vscode';

export class VisualEditorDebugHelper {

    /**
     * 诊断预览状态
     * 现在作为公共静态方法供 bootstrap 调用
     */
    static async diagnosePreviewState(): Promise<void> {
        const outputChannel = vscode.window.createOutputChannel('Clotho Visual Editor Debug');
        outputChannel.show();

        outputChannel.appendLine('🔍 Visual Editor 预览状态诊断');
        outputChannel.appendLine('=====================================');
        outputChannel.appendLine('');

        // 检查打开的编辑器
        const editors = vscode.window.visibleTextEditors;
        outputChannel.appendLine(`📝 当前打开的编辑器数量: ${editors.length}`);

        editors.forEach((editor, index) => {
            outputChannel.appendLine(`  编辑器 ${index + 1}:`);
            outputChannel.appendLine(`    - URI: ${editor.document.uri.toString()}`);
            outputChannel.appendLine(`    - 语言: ${editor.document.languageId}`);
            outputChannel.appendLine(`    - 视图列: ${editor.viewColumn}`);
        });
        outputChannel.appendLine('');

        // 检查是否有 clang-format 相关的编辑器
        const clangFormatEditors = editors.filter(editor =>
            editor.document.uri.scheme === 'clotho-clang-format' ||
            editor.document.uri.path.includes('clang-format') ||
            editor.document.uri.path.includes('preview')
        );

        outputChannel.appendLine(`🎯 Clang-Format 相关编辑器数量: ${clangFormatEditors.length}`);
        clangFormatEditors.forEach((editor, index) => {
            outputChannel.appendLine(`  相关编辑器 ${index + 1}:`);
            outputChannel.appendLine(`    - URI: ${editor.document.uri.toString()}`);
            outputChannel.appendLine(`    - 内容长度: ${editor.document.getText().length} 字符`);
        });
        outputChannel.appendLine('');

        // 检查工作区配置
        const workspaceConfig = vscode.workspace.getConfiguration('clotho');
        outputChannel.appendLine('⚙️ 工作区配置:');
        outputChannel.appendLine(`  - 配置对象存在: ${workspaceConfig ? '是' : '否'}`);
        outputChannel.appendLine('');

        // 检查扩展状态
        const extension = vscode.extensions.getExtension('anonchihaya0908.clotho');
        if (extension) {
            outputChannel.appendLine('🔌 扩展状态:');
            outputChannel.appendLine(`  - 是否激活: ${extension.isActive ? '是' : '否'}`);
            outputChannel.appendLine(`  - 扩展 ID: ${extension.id}`);
            outputChannel.appendLine(`  - 版本: ${extension.packageJSON.version}`);
        } else {
            outputChannel.appendLine('❌ 扩展未找到');
        }
        outputChannel.appendLine('');

        // 提供解决建议
        outputChannel.appendLine('💡 故障排除建议:');
        outputChannel.appendLine('  1. 尝试运行命令: "Clotho: 强制重启 Visual Editor"');
        outputChannel.appendLine('  2. 检查是否有错误输出在开发者控制台');
        outputChannel.appendLine('  3. 重新打开 .clang-format 可视化编辑器');
        outputChannel.appendLine('  4. 重启 VS Code');
        outputChannel.appendLine('');

        vscode.window.showInformationMessage('预览状态诊断完成，请查看输出面板');
    }

    /**
     * 强制重启预览
     * 现在作为公共静态方法供 bootstrap 调用
     */
    static async forceRestartPreview(): Promise<void> {
        try {
            // 关闭所有相关的编辑器
            const editors = vscode.window.visibleTextEditors;
            const clangFormatEditors = editors.filter(editor =>
                editor.document.uri.scheme === 'clotho-clang-format' ||
                editor.document.uri.path.includes('clang-format') ||
                editor.document.uri.path.includes('preview')
            );

            for (const editor of clangFormatEditors) {
                await vscode.window.showTextDocument(editor.document, { preview: false });
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            }

            // 等待一下让编辑器完全关闭
            await new Promise(resolve => setTimeout(resolve, 500));

            // 重新打开 clang-format 编辑器
            await vscode.commands.executeCommand('clotho.showClangFormatEditor');

            vscode.window.showInformationMessage('Visual Editor 已重启');

        } catch (error) {
            vscode.window.showErrorMessage(`重启失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 监听配置变化的调试
     */
    static enableConfigChangeDebugging(): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('clotho')) {
                // 使用输出通道而非console.log进行调试
                const outputChannel = vscode.window.createOutputChannel('Clotho Debug');
                outputChannel.appendLine(`🔧 [DEBUG] Clotho 配置发生变化: ${JSON.stringify(event)}`);
            }
        });
    }
}
