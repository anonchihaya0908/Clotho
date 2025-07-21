/**
 * Clang-Format Guide Service
 * 当用户编辑 .clang-format 文件时显示内联引导按钮到可视化编辑器
 */

import * as vscode from 'vscode';
import { COMMANDS } from '../../common/constants';

export class ClangFormatGuideService implements vscode.Disposable {
    private readonly disposables: vscode.Disposable[] = [];
    private codeLensProvider: ClangFormatCodeLensProvider;

    constructor() {
        this.codeLensProvider = new ClangFormatCodeLensProvider();
        this.initialize();
    }

    private initialize(): void {
        // 注册 CodeLens 提供者
        this.disposables.push(
            vscode.languages.registerCodeLensProvider(
                { pattern: '**/.clang-format' },
                this.codeLensProvider
            )
        );

        // 监听活动编辑器变化来更新按钮可见性
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor(() => {
                this.updateButtonVisibility();
                this.codeLensProvider.refresh();
            })
        );

        // 监听配置变化
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(event => {
                if (event.affectsConfiguration('clotho.clangFormat.showGuideButton')) {
                    this.updateButtonVisibility();
                    this.codeLensProvider.refresh();
                }
            })
        );

        // 初始化按钮可见性
        this.updateButtonVisibility();
    }

    private updateButtonVisibility(): void {
        // 检查用户设置
        const config = vscode.workspace.getConfiguration('clotho.clangFormat');
        const showGuideButton = config.get<boolean>('showGuideButton', true);

        const activeEditor = vscode.window.activeTextEditor;
        const isClangFormatFile = activeEditor && this.isClangFormatFile(activeEditor.document);

        // 使用 VS Code 的 when 条件来控制按钮显示
        // 这将通过 setContext 来控制 package.json 中定义的按钮
        vscode.commands.executeCommand('setContext', 'clotho.isClangFormatFile', isClangFormatFile && showGuideButton);
    }

    private isClangFormatFile(document: vscode.TextDocument): boolean {
        const fileName = document.fileName.toLowerCase();
        return fileName.endsWith('.clang-format') ||
            fileName.endsWith('_clang-format') ||
            fileName.includes('.clang-format');
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        // 清理上下文
        vscode.commands.executeCommand('setContext', 'clotho.isClangFormatFile', false);
    }
}

class ClangFormatCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }

    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] | undefined {
        // 检查用户设置是否启用了引导按钮
        const config = vscode.workspace.getConfiguration('clotho.clangFormat');
        const showGuideButton = config.get<boolean>('showGuideButton', true);

        if (!showGuideButton) {
            return undefined;
        }

        // 检查是否为 .clang-format 文件
        if (!this.isClangFormatFile(document)) {
            return undefined;
        }

        const codeLenses: vscode.CodeLens[] = [];

        // 在文件顶部添加主要的可视化编辑器按钮和帮助按钮 (类似 launch.json 的样式)
        const topRange = new vscode.Range(0, 0, 0, 0);

        // 主按钮：打开可视化编辑器
        const mainCodeLens = new vscode.CodeLens(topRange, {
            title: "$(edit)\u00A0Visual Editor",
            tooltip: "Open Clang-Format Visual Editor - Edit settings with a user-friendly interface",
            command: COMMANDS.OPEN_CLANG_FORMAT_EDITOR
        });
        codeLenses.push(mainCodeLens);

        // 帮助按钮：紧跟在主按钮后面
        const helpCodeLens = new vscode.CodeLens(topRange, {
            title: "$(question)\u00A0Reference",
            tooltip: "Get help with clang-format configuration options",
            command: 'vscode.open',
            arguments: [vscode.Uri.parse('https://clang.llvm.org/docs/ClangFormatStyleOptions.html')]
        });
        codeLenses.push(helpCodeLens);

        return codeLenses;
    }

    private isClangFormatFile(document: vscode.TextDocument): boolean {
        const fileName = document.fileName.toLowerCase();
        return fileName.endsWith('.clang-format') ||
            fileName.endsWith('_clang-format') ||
            fileName.includes('.clang-format');
    }
}
