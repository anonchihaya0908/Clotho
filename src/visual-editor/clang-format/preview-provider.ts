/**
 * Clang-Format Preview Provider
 * 虚拟文档内容提供者，实现真正的VSCode编辑器预览
 * 这是VSCode扩展开发中的"黑魔法"，让我们能够在Webview旁边展示
 * 一个真正的、具有完整语义高亮和clangd支持的编辑器
 */

import * as vscode from 'vscode';

export class ClangFormatPreviewProvider
implements vscode.TextDocumentContentProvider {
  private static readonly SCHEME = 'clotho-preview';
  private static instance: ClangFormatPreviewProvider | undefined;

  // onDidChange事件，用来通知VSCode"我的内容更新了，请重新渲染"
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  // 这个Map用来存储我们动态生成的代码内容
  private content = new Map<string, string>();

  // 当前活跃的预览URI
  private currentPreviewUri: vscode.Uri | undefined;

  private constructor() { }

  /**
   * 获取单例实例
   */
  public static getInstance(): ClangFormatPreviewProvider {
    if (!ClangFormatPreviewProvider.instance) {
      ClangFormatPreviewProvider.instance = new ClangFormatPreviewProvider();
    }
    return ClangFormatPreviewProvider.instance;
  }

  /**
   * 获取方案名
   */
  public static getScheme(): string {
    return ClangFormatPreviewProvider.SCHEME;
  }

  /**
   * VSCode会调用这个方法，来询问"这个虚拟文件的内容是什么？"
   */
  provideTextDocumentContent(uri: vscode.Uri): string {
    const content = this.content.get(uri.toString());
    if (!content) {
      return `// Error: No content found for ${uri.toString()}\n// This should not happen - please report this bug.`;
    }
    return content;
  }

  /**
   * 更新虚拟文件的内容
   * @param uri 虚拟文件的URI
   * @param newContent 新的内容
   */
  public updateContent(uri: vscode.Uri, newContent: string): void {
    this.content.set(uri.toString(), newContent);
    this._onDidChange.fire(uri); // <== 通知VSCode更新！
  }

  /**
   * 创建一个新的预览URI
   * @param filename 文件名（将显示在标签页上）
   * @returns 新的预览URI
   */
  public createPreviewUri(filename: string = 'macro-preview.cpp'): vscode.Uri {
    // 使用时间戳确保URI的唯一性
    const timestamp = Date.now();
    const uri = vscode.Uri.parse(
      `${ClangFormatPreviewProvider.SCHEME}://clang-format/${filename}?t=${timestamp}`,
    );
    this.currentPreviewUri = uri;
    return uri;
  }

  /**
   * 获取当前活跃的预览URI
   */
  public getCurrentPreviewUri(): vscode.Uri | undefined {
    return this.currentPreviewUri;
  }

  /**
   * 检查指定URI是否有内容
   */
  public hasContent(uri: vscode.Uri): boolean {
    return this.content.has(uri.toString());
  }

  /**
   * 清理指定URI的内容
   */
  public clearContent(uri: vscode.Uri): void {
    this.content.delete(uri.toString());
  }

  /**
   * 清理所有内容
   */
  public clearAllContent(): void {
    this.content.clear();
    this.currentPreviewUri = undefined;
  }

  /**
   * 注册内容提供者到VSCode
   * @param context 扩展上下文
   */
  public static register(
    context: vscode.ExtensionContext,
  ): ClangFormatPreviewProvider {
    const provider = ClangFormatPreviewProvider.getInstance();

    // 注册我们的内容提供者
    context.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider(
        ClangFormatPreviewProvider.SCHEME,
        provider,
      ),
    );

    return provider;
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this._onDidChange.dispose();
    this.clearAllContent();
  }
}
