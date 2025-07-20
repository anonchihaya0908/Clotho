import * as vscode from 'vscode';
import * as path from 'path';

// Extension context interface for dependency injection
export interface ExtensionContext {
  subscriptions: vscode.Disposable[];
}

// Legacy interface for compatibility (no longer using language client)
interface ClangdContext {
  subscriptions: vscode.Disposable[];
  client?: any;
}

export function activate(context: ClangdContext) {
  context.subscriptions.push(vscode.commands.registerCommand(
    'clangd.switchheadersource', () => switchSourceHeaderSimple()));
}

// New activation function for the standalone extension
export function activateSwitchSourceHeader(context: ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand(
    'clotho.switchHeaderSource', () => switchSourceHeaderSimple()));
}

// File extension mappings for C/C++ files
const HEADER_EXTENSIONS = ['.h', '.hpp', '.hh', '.hxx'];
const SOURCE_EXTENSIONS = ['.c', '.cpp', '.cc', '.cxx'];

/**
 * Simple implementation of switch header/source without language server
 */
async function switchSourceHeaderSimple(): Promise<void> {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return;
  }

  const currentFile = activeEditor.document.uri;
  const currentPath = currentFile.fsPath;
  const currentExt = path.extname(currentPath);
  const baseName = path.basename(currentPath, currentExt);
  const directory = path.dirname(currentPath);

  // Determine if current file is header or source
  const isHeader = HEADER_EXTENSIONS.includes(currentExt);
  const isSource = SOURCE_EXTENSIONS.includes(currentExt);

  if (!isHeader && !isSource) {
    vscode.window.showInformationMessage('Current file is not a C/C++ header or source file.');
    return;
  }

  // Get target extensions to search for
  const targetExtensions = isHeader ? SOURCE_EXTENSIONS : HEADER_EXTENSIONS;

  // Get additional search paths from configuration
  const config = vscode.workspace.getConfiguration('clotho');
  const searchPaths = config.get<string[]>('switchHeaderSource.searchPaths',
    ['.', '../include', '../src', './include', './src']);

  // Search for corresponding file
  const correspondingFile = await findCorrespondingFile(directory, baseName, targetExtensions, searchPaths);

  if (correspondingFile) {
    try {
      const document = await vscode.workspace.openTextDocument(correspondingFile);
      await vscode.window.showTextDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${correspondingFile.fsPath}`);
    }
  } else {
    const fileType = isHeader ? 'source' : 'header';
    vscode.window.showInformationMessage(`Didn't find a corresponding ${fileType} file for ${baseName}${currentExt}.`);
  }
}

/**
 * Find corresponding file in various search paths
 */
async function findCorrespondingFile(
  baseDirectory: string,
  baseName: string,
  targetExtensions: string[],
  searchPaths: string[]
): Promise<vscode.Uri | undefined> {

  // Normalize and resolve search paths
  const resolvedPaths = searchPaths.map(searchPath => {
    if (path.isAbsolute(searchPath)) {
      return searchPath;
    } else {
      return path.resolve(baseDirectory, searchPath);
    }
  });

  // Search in each path for each extension
  for (const searchPath of resolvedPaths) {
    for (const ext of targetExtensions) {
      const candidatePath = path.join(searchPath, `${baseName}${ext}`);
      const candidateUri = vscode.Uri.file(candidatePath);

      try {
        await vscode.workspace.fs.stat(candidateUri);
        return candidateUri;
      } catch {
        // File doesn't exist, continue searching
        continue;
      }
    }
  }

  return undefined;
}