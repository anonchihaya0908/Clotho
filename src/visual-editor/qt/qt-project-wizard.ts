import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  QtWizardState,
  QtMajorVersion,
  detectQtPrefixCandidates,
  ensureTargetDirAvailable,
  persistQtPrefixPath,
  buildCMakeLists,
  createQtProjectOnDisk,
} from './qt-project-service';
import { createModuleLogger } from '../../common/logger/unified-logger';
import { QtCMakePreviewProvider } from './qt-cmake-preview-provider';
import { getNonce } from '../../common/utils/security';

export async function runQtProjectWizard(extensionUri: vscode.Uri): Promise<void> {
  const logger = createModuleLogger('QtProjectWizardWebview');

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    void vscode.window.showErrorMessage('Please open a workspace folder before creating a Qt project.');
    return;
  }

  // Setup native preview document
  const previewProvider = QtCMakePreviewProvider.getInstance();
  const previewUri = previewProvider.createPreviewUri('CMakeLists.txt');
  const initialState = await createInitialState(workspaceFolder);
  const initialCmake = buildCMakeLists(initialState.state);
  previewProvider.updateContent(previewUri, initialCmake);

  const previewDoc = await vscode.workspace.openTextDocument(previewUri);
  await vscode.window.showTextDocument(previewDoc, vscode.ViewColumn.Two);

  let placeholderPanel: vscode.WebviewPanel | undefined;
  let suppressPlaceholder = false;

  const showPreview = async (): Promise<void> => {
    try {
      const doc = await vscode.workspace.openTextDocument(previewUri);
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.Two);
      if (placeholderPanel) {
        placeholderPanel.dispose();
        placeholderPanel = undefined;
      }
    } catch (error) {
      logger.error('Failed to show Qt CMake preview editor', error as Error, {
        module: 'QtProjectWizardWebview',
        operation: 'showPreview',
      });
    }
  };

  const closePreviewTabs = async (): Promise<void> => {
    const tabsToClose: vscode.Tab[] = [];
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        const input = tab.input;
        if (input instanceof vscode.TabInputText && input.uri.toString() === previewUri.toString()) {
          tabsToClose.push(tab);
        }
      }
    }
    if (tabsToClose.length === 0) {
      return;
    }

    suppressPlaceholder = true;
    try {
      await vscode.window.tabGroups.close(tabsToClose);
    } catch (error) {
      logger.warn('Failed to close Qt CMake preview tabs', {
        module: 'QtProjectWizardWebview',
        operation: 'closePreviewTabs',
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      suppressPlaceholder = false;
    }
  };

  const showPreviewPlaceholder = (): void => {
    if (placeholderPanel) {
      placeholderPanel.reveal(vscode.ViewColumn.Two, true);
      return;
    }

    placeholderPanel = vscode.window.createWebviewPanel(
      'clothoQtPreviewPlaceholder',
      'Qt CMake Preview Closed',
      {
        viewColumn: vscode.ViewColumn.Two,
        preserveFocus: true,
      },
      {
        enableScripts: true,
        retainContextWhenHidden: false,
      },
    );

    const nonce = getNonce();
    const cspSource = placeholderPanel.webview.cspSource;

    placeholderPanel.webview.html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; img-src ${cspSource} https: data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Qt CMake Preview Closed</title>
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
      <div class="title">Qt CMake 预览已关闭</div>
      <div class="description">
        你可以继续在左侧调整向导选项。若需要重新查看预览，请点击下方按钮重新打开 CMakeLists.txt 预览。
      </div>
      <button id="reopen">Reopen Preview</button>
    </div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const btn = document.getElementById('reopen');
      if (btn) {
        btn.addEventListener('click', () => {
          vscode.postMessage({ type: 'qtPreview/reopen' });
        });
      }
    </script>
  </body>
</html>`;

    placeholderPanel.webview.onDidReceiveMessage(
      (message) => {
        if (message && message.type === 'qtPreview/reopen') {
          void showPreview();
        }
      },
      undefined,
      [],
    );

    placeholderPanel.onDidDispose(
      () => {
        placeholderPanel = undefined;
      },
      undefined,
      [],
    );
  };

  const panel = vscode.window.createWebviewPanel(
    'clothoQtWizard',
    'Clotho: Qt Project Wizard',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );

  panel.webview.html = buildWebviewHtml(panel.webview, extensionUri);

  const disposables: vscode.Disposable[] = [];

  const closeDocDisposable = vscode.workspace.onDidCloseTextDocument((doc) => {
    if (doc.uri.toString() !== previewUri.toString()) {
      return;
    }
    if (suppressPlaceholder) {
      return;
    }
    if (panel.visible) {
      showPreviewPlaceholder();
    }
  });
  disposables.push(closeDocDisposable);

  panel.webview.postMessage({ type: 'qtWizard/initialize', payload: initialState });

  disposables.push(
    panel.webview.onDidReceiveMessage(async (msg) => {
      try {
        if (!msg || typeof msg !== 'object') { return; }
        switch (msg.type) {
          case 'qtWizard/requestDetectPrefix': {
            const major = msg.qtMajor as QtMajorVersion;
            const candidates = await detectQtPrefixCandidates(major);
            panel.webview.postMessage({
              type: 'qtWizard/prefixCandidates',
              payload: { qtMajor: major, candidates },
            });
            break;
          }
          case 'qtWizard/requestPickPrefixFolder': {
            const result = await vscode.window.showOpenDialog({
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
              openLabel: 'Select Qt prefix folder',
            });
            if (!result || result.length === 0) {
              panel.webview.postMessage({
                type: 'qtWizard/pickPrefixFolderResult',
                payload: { canceled: true },
              });
            } else {
              panel.webview.postMessage({
                type: 'qtWizard/pickPrefixFolderResult',
                payload: { canceled: false, path: result?.[0]?.fsPath ?? '' },
              });
            }
            break;
          }
          case 'qtWizard/requestCreateProject': {
            const state = msg.state as QtWizardState;
            const ok = await validateStateBeforeCreate(state);
            if (!ok) {
              panel.webview.postMessage({
                type: 'qtWizard/createResult',
                payload: { success: false, error: 'Invalid project settings.' },
              });
              return;
            }

            try {
              await persistQtPrefixPath(state.qtMajor, state.qtPrefixPath);
              const doc = await vscode.workspace.openTextDocument(previewUri);
              const cmakeContent = doc.getText();
              await createQtProjectOnDisk(state, cmakeContent);
              panel.webview.postMessage({
                type: 'qtWizard/createResult',
                payload: { success: true },
              });
              panel.dispose();
            } catch (error) {
              logger.error('Failed to create Qt project via webview wizard', error as Error, {
                module: 'QtProjectWizardWebview',
                operation: 'createProject',
              });
              panel.webview.postMessage({
                type: 'qtWizard/createResult',
                payload: {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
              });
            }
            break;
          }
          case 'qtWizard/requestRegeneratePreview': {
            const state = msg.state as QtWizardState;
            const cmakeContent = buildCMakeLists(state);
            previewProvider.updateContent(previewUri, cmakeContent);
            break;
          }
          default:
            break;
        }
      } catch (error) {
        logger.error('Unhandled error in Qt wizard webview message handler', error as Error, {
          module: 'QtProjectWizardWebview',
          operation: 'onDidReceiveMessage',
        });
      }
    }),
  );

  panel.onDidChangeViewState(
    async (e) => {
      if (e.webviewPanel.active) {
        const hasPreviewTab = vscode.window.tabGroups.all.some((group) =>
          group.tabs.some(
            (tab) =>
              tab.input instanceof vscode.TabInputText &&
              tab.input.uri.toString() === previewUri.toString(),
          ),
        );
        if (!hasPreviewTab && !placeholderPanel) {
          await showPreview();
        }
      } else {
        const activeEditor = vscode.window.activeTextEditor;
        // 如果只是把焦点切到右侧预览，不关闭预览
        if (activeEditor && activeEditor.document.uri.toString() === previewUri.toString()) {
          return;
        }
        await closePreviewTabs();
      }
    },
    null,
    disposables,
  );

  panel.onDidDispose(
    () => {
      disposables.forEach((d) => d.dispose());
      placeholderPanel?.dispose();
      void closePreviewTabs();
      previewProvider.clearContent(previewUri);
    },
    null,
    disposables,
  );
}

async function createInitialState(
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<{ state: QtWizardState; prefixCandidates: QtPrefixCandidatePayload[] }> {
  const workspacePath = workspaceFolder.uri.fsPath;
  const projectName = workspaceFolder.name || 'QtApp1';

  const targetDir = chooseDefaultTargetDirectory(workspacePath, projectName);
  const config = vscode.workspace.getConfiguration('clotho');
  const defaultStd = config.get<'17' | '20' | '23' | '26'>('qt.defaultCppStandard', '20');

  const defaultQtMajor: QtMajorVersion = 6;
  const candidates = await detectQtPrefixCandidates(defaultQtMajor);
  const firstCandidate = candidates[0]?.path ?? '';

  const state: QtWizardState = {
    projectName,
    targetDir,
    projectType: 'widgets',
    cppStandard: Number(defaultStd) as 17 | 20 | 23 | 26,
    qtMajor: defaultQtMajor,
    qtPrefixPath: firstCandidate,
  };

  return {
    state,
    prefixCandidates: candidates.map((c) => ({ path: c.path, source: c.source })),
  };
}

function chooseDefaultTargetDirectory(workspacePath: string, projectName: string): string {
  if (!workspacePath) {
    return projectName;
  }

  try {
    const nonHidden = fsReaddirNonHidden(workspacePath);
    if (nonHidden.length === 0) {
      return workspacePath;
    }
  } catch {
    // ignore and fall back
  }

  return path.join(workspacePath, projectName);
}

function fsReaddirNonHidden(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir).filter((name: string) => !name.startsWith('.'));
}

async function validateStateBeforeCreate(state: QtWizardState): Promise<boolean> {
  if (!state.projectName.trim()) {
    void vscode.window.showErrorMessage('项目名称不能为空。');
    return false;
  }
  if (!state.targetDir.trim()) {
    void vscode.window.showErrorMessage('目标目录不能为空。');
    return false;
  }
  if (!ensureTargetDirAvailable(state.targetDir)) {
    return false;
  }
  if (!state.qtPrefixPath.trim()) {
    void vscode.window.showWarningMessage('未选择 Qt CMake 前缀路径，后续 CMake 可能无法找到 Qt。');
  }
  return true;
}

interface QtPrefixCandidatePayload {
  path: string;
  source: 'config' | 'env' | 'scan';
}

function buildWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      extensionUri,
      'webviews',
      'visual-editor',
      'qt-project-wizard',
      'dist',
      'index.js',
    ),
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      extensionUri,
      'webviews',
      'visual-editor',
      'qt-project-wizard',
      'dist',
      'index.css',
    ),
  );

  const cspSource = webview.cspSource;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; img-src ${cspSource} data:; script-src ${cspSource}; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource};" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" type="text/css" href="${styleUri}">
    <title>Clotho Qt Project Wizard</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="${scriptUri}"></script>
  </body>
</html>`;
}
