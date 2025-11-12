import * as vscode from 'vscode';

export class SwitchStatusBar implements vscode.Disposable {
  private item: vscode.StatusBarItem;
  private lastText = '';

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 9);
    this.item.name = 'Clotho Switch Status';
  }

  update(method: string, durationMs: number, foundCount: number): void {
    this.lastText = `$(link-external) Switch: ${method} (${foundCount}) ${durationMs}ms`;
    this.item.text = this.lastText;
    this.item.tooltip = 'Clotho: last header/source switch';
    this.item.show();
  }

  hide(): void {
    this.item.hide();
  }

  dispose(): void {
    this.item.dispose();
  }
}

