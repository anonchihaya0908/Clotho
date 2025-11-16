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
import { PreviewSession } from '../shared/preview-session-manager';
import { PreviewPlaceholderManager } from '../shared/placeholder-manager';

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

  const placeholderManager = new PreviewPlaceholderManager();
  const sessionId = `qt-wizard-${Date.now()}`;
  const previewSession = new PreviewSession({
    id: sessionId,
    previewUri,
    preferredColumn: vscode.ViewColumn.Two,
    onPreviewClosedByUser: () => {
      placeholderManager.showPlaceholder(
        sessionId,
        vscode.ViewColumn.Two,
        {
          title: 'Qt CMake Preview Closed',
          description:
            '你可以继续在左侧调整向导选项。若需要重新查看预览，请点击下方按钮重新打开 CMakeLists.txt 预览。',
          buttonLabel: 'Reopen Preview',
        },
        () => {
          void previewSession.ensurePreviewVisible();
          placeholderManager.hidePlaceholder(sessionId);
        },
      );
    },
    onPreviewReopened: () => {
      placeholderManager.hidePlaceholder(sessionId);
    },
  });

  await previewSession.ensurePreviewVisible();

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
        await previewSession.handleHostActivated();
      } else {
        await previewSession.handleHostHidden();
      }
    },
    null,
    disposables,
  );

  panel.onDidDispose(
    () => {
      disposables.forEach((d) => d.dispose());
      placeholderManager.disposeAll();
      previewSession.dispose();
      void previewSession.closePreviewEditors();
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
