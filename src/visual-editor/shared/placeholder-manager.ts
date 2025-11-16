import * as vscode from 'vscode';
import { getNonce } from '../../common/utils/security';

export interface PreviewPlaceholderConfig {
  readonly title: string;
  readonly description: string;
  readonly buttonLabel: string;
}

export type PreviewPlaceholderReopenHandler = () => void;

export class PreviewPlaceholderManager {
  private readonly panels = new Map<string, vscode.WebviewPanel>();

  showPlaceholder(
    sessionId: string,
    viewColumn: vscode.ViewColumn,
    config: PreviewPlaceholderConfig,
    onReopen: PreviewPlaceholderReopenHandler,
  ): void {
    const existing = this.panels.get(sessionId);
    if (existing) {
      existing.reveal(viewColumn, true);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'clothoPreviewPlaceholder',
      config.title,
      { viewColumn, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: false },
    );

    const nonce = getNonce();
    const cspSource = panel.webview.cspSource;

    panel.webview.html = this.buildHtml(cspSource, nonce, config);

    panel.webview.onDidReceiveMessage(
      (message) => {
        if (message && message.type === 'previewPlaceholder/reopen') {
          onReopen();
        }
      },
      undefined,
      [],
    );

    panel.onDidDispose(
      () => {
        this.panels.delete(sessionId);
      },
      undefined,
      [],
    );

    this.panels.set(sessionId, panel);
  }

  hidePlaceholder(sessionId: string): void {
    const panel = this.panels.get(sessionId);
    if (panel) {
      panel.dispose();
      this.panels.delete(sessionId);
    }
  }

  disposeAll(): void {
    for (const [, panel] of this.panels) {
      panel.dispose();
    }
    this.panels.clear();
  }

  private buildHtml(
    cspSource: string,
    nonce: string,
    config: PreviewPlaceholderConfig,
  ): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; img-src ${cspSource} https: data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${config.title}</title>
    <style nonce="${nonce}">
      :root {
        --ve-bg: var(--vscode-editor-background);
        --ve-fg: var(--vscode-foreground);
        --ve-muted: var(--vscode-descriptionForeground);
        --ve-btn-bg: var(--vscode-button-background);
        --ve-btn-bg-hover: var(--vscode-button-hoverBackground);
        --ve-btn-fg: var(--vscode-button-foreground);
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        font-family: var(--vscode-font-family, system-ui, sans-serif);
        font-size: var(--vscode-font-size, 13px);
        background-color: var(--ve-bg);
        color: var(--ve-fg);
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .container {
        max-width: 420px;
        padding: 20px;
        text-align: center;
      }
      .title {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .description {
        font-size: 12px;
        color: var(--ve-muted);
        margin-bottom: 16px;
      }
      button {
        padding: 6px 14px;
        border-radius: 4px;
        border: 1px solid transparent;
        background-color: var(--ve-btn-bg);
        color: var(--ve-btn-fg);
        cursor: pointer;
        font-size: 12px;
      }
      button:hover {
        background-color: var(--ve-btn-bg-hover);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="title">${config.title}</div>
      <div class="description">${config.description}</div>
      <button id="reopen">${config.buttonLabel}</button>
    </div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const btn = document.getElementById('reopen');
      if (btn) {
        btn.addEventListener('click', () => {
          vscode.postMessage({ type: 'previewPlaceholder/reopen' });
        });
      }
    </script>
  </body>
</html>`;
  }
}

