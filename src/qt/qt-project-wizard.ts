import * as vscode from 'vscode';
import * as path from 'path';
import {
  QtWizardState,
  QtMajorVersion,
  detectQtPrefixCandidates,
  ensureTargetDirAvailable,
  createQtProjectOnDisk,
  persistQtPrefixPath,
  buildCMakeLists,
} from './qt-project-service';
import { createModuleLogger } from '../common/logger/unified-logger';

export async function runQtProjectWizard(extensionUri: vscode.Uri): Promise<void> {
  const logger = createModuleLogger('QtProjectWizardWebview');

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    void vscode.window.showErrorMessage('Please open a workspace folder before creating a Qt project.');
    return;
  }

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

  const initialState = await createInitialState(workspaceFolder);
  panel.webview.postMessage({ type: 'qtWizard/initialize', payload: initialState });

  disposables.push(
    panel.webview.onDidReceiveMessage(async (msg) => {
      try {
        if (!msg || typeof msg !== 'object') { return; }
        switch (msg.type) {
          case 'qtWizard/requestPreview': {
            const state = msg.state as QtWizardState;
            const cmakeContent = buildCMakeLists(state);
            panel.webview.postMessage({
              type: 'qtWizard/previewUpdated',
              payload: { cmakeContent },
            });
            break;
          }
          case 'qtWizard/requestDetectPrefix': {
            const major = msg.qtMajor as QtMajorVersion;
            const candidates = await detectQtPrefixCandidates(major);
            panel.webview.postMessage({
              type: 'qtWizard/prefixCandidates',
              payload: { qtMajor: major, candidates },
            });
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
              await createQtProjectOnDisk(state);
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

  panel.onDidDispose(
    () => { disposables.forEach((d) => d.dispose()); },
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
  const entries = vscode.workspace.fs; // just to keep style; actual check via fs below
  void entries; // avoid unused

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
  const fs = require('fs') as typeof import('fs');
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
    vscode.Uri.joinPath(extensionUri, 'webviews', 'qt-project-wizard', 'dist', 'index.js'),
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'webviews', 'qt-project-wizard', 'dist', 'index.css'),
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
