import * as vscode from 'vscode';

/**
 * Qt CMake Preview Provider
 * =========================
 *
 * Provides a virtual CMakeLists.txt document used as the live preview and
 * editable source of truth while the Qt project wizard is open.
 */
export class QtCMakePreviewProvider implements vscode.TextDocumentContentProvider {
  private static readonly SCHEME = 'clotho-qt-cmake-preview';
  private static instance: QtCMakePreviewProvider | undefined;

  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  private content = new Map<string, string>();

  private constructor() {}

  public static getScheme(): string {
    return QtCMakePreviewProvider.SCHEME;
  }

  public static getInstance(): QtCMakePreviewProvider {
    if (!QtCMakePreviewProvider.instance) {
      QtCMakePreviewProvider.instance = new QtCMakePreviewProvider();
    }
    return QtCMakePreviewProvider.instance;
  }

  public static register(
    context: vscode.ExtensionContext,
  ): QtCMakePreviewProvider {
    const provider = QtCMakePreviewProvider.getInstance();
    context.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider(
        QtCMakePreviewProvider.SCHEME,
        provider,
      ),
    );
    return provider;
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    const key = uri.toString();
    const value = this.content.get(key);
    if (value === undefined) {
      return '# Qt CMake Preview\n# No content available for this URI.\n';
    }
    return value;
  }

  public updateContent(uri: vscode.Uri, newContent: string): void {
    const key = uri.toString();
    this.content.set(key, newContent);
    this._onDidChange.fire(uri);
  }

  public createPreviewUri(filename: string = 'CMakeLists.txt'): vscode.Uri {
    const ts = Date.now();
    return vscode.Uri.parse(
      `${QtCMakePreviewProvider.SCHEME}://qt-wizard/${filename}?t=${ts}`,
    );
  }

  public clearContent(uri: vscode.Uri): void {
    this.content.delete(uri.toString());
  }

  public clearAllContent(): void {
    this.content.clear();
  }

  public dispose(): void {
    this._onDidChange.dispose();
    this.clearAllContent();
  }
}

