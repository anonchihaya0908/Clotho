import * as vscode from 'vscode';

export interface PreviewSessionConfig {
  readonly id: string;
  readonly previewUri: vscode.Uri;
  readonly preferredColumn?: vscode.ViewColumn;
  readonly onPreviewClosedByUser?: () => void;
  readonly onPreviewReopened?: () => void;
}

export class PreviewSession {
  private readonly config: PreviewSessionConfig;
  private readonly disposables: vscode.Disposable[] = [];
  private suppressCloseEvents = false;

  constructor(config: PreviewSessionConfig) {
    this.config = config;
    this.disposables.push(
      vscode.workspace.onDidCloseTextDocument((doc) => {
        if (this.suppressCloseEvents) {
          return;
        }
        if (doc.uri.toString() !== this.config.previewUri.toString()) {
          return;
        }
        this.config.onPreviewClosedByUser?.();
      }),
    );
  }

  async ensurePreviewVisible(): Promise<void> {
    const column = this.config.preferredColumn ?? vscode.ViewColumn.Two;
    try {
      const doc = await vscode.workspace.openTextDocument(this.config.previewUri);
      await vscode.window.showTextDocument(doc, {
        viewColumn: column,
        preserveFocus: false,
        preview: false,
      });
      this.config.onPreviewReopened?.();
    } catch {
      // Let callers handle logging; keep core minimal.
    }
  }

  async closePreviewEditors(): Promise<void> {
    const uriString = this.config.previewUri.toString();
    const tabsToClose: vscode.Tab[] = [];
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        const input = tab.input;
        if (input instanceof vscode.TabInputText && input.uri.toString() === uriString) {
          tabsToClose.push(tab);
        }
      }
    }
    if (tabsToClose.length === 0) {
      return;
    }

    this.suppressCloseEvents = true;
    try {
      await vscode.window.tabGroups.close(tabsToClose);
    } finally {
      this.suppressCloseEvents = false;
    }
  }

  async handleHostActivated(): Promise<void> {
    const uriString = this.config.previewUri.toString();
    const hasPreviewTab = vscode.window.tabGroups.all.some((group) =>
      group.tabs.some(
        (tab) =>
          tab.input instanceof vscode.TabInputText &&
          tab.input.uri.toString() === uriString,
      ),
    );
    if (!hasPreviewTab) {
      await this.ensurePreviewVisible();
    }
  }

  async handleHostHidden(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.uri.toString() === this.config.previewUri.toString()) {
      return;
    }
    await this.closePreviewEditors();
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables.length = 0;
  }
}
