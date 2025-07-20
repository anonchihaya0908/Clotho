"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateSwitchSourceHeader = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('clangd.switchheadersource', () => switchSourceHeaderSimple()));
}
exports.activate = activate;
// New activation function for the standalone extension
function activateSwitchSourceHeader(context) {
    context.subscriptions.push(vscode.commands.registerCommand('clotho.switchHeaderSource', () => switchSourceHeaderSimple()));
}
exports.activateSwitchSourceHeader = activateSwitchSourceHeader;
// File extension mappings for C/C++ files
const HEADER_EXTENSIONS = ['.h', '.hpp', '.hh', '.hxx'];
const SOURCE_EXTENSIONS = ['.c', '.cpp', '.cc', '.cxx'];
/**
 * Simple implementation of switch header/source without language server
 */
async function switchSourceHeaderSimple() {
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
    const searchPaths = config.get('switchHeaderSource.searchPaths', ['.', '../include', '../src', './include', './src']);
    // Search for corresponding file
    const correspondingFile = await findCorrespondingFile(directory, baseName, targetExtensions, searchPaths);
    if (correspondingFile) {
        try {
            const document = await vscode.workspace.openTextDocument(correspondingFile);
            await vscode.window.showTextDocument(document);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${correspondingFile.fsPath}`);
        }
    }
    else {
        const fileType = isHeader ? 'source' : 'header';
        vscode.window.showInformationMessage(`Didn't find a corresponding ${fileType} file for ${baseName}${currentExt}.`);
    }
}
/**
 * Find corresponding file in various search paths
 */
async function findCorrespondingFile(baseDirectory, baseName, targetExtensions, searchPaths) {
    // Normalize and resolve search paths
    const resolvedPaths = searchPaths.map(searchPath => {
        if (path.isAbsolute(searchPath)) {
            return searchPath;
        }
        else {
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
            }
            catch {
                // File doesn't exist, continue searching
                continue;
            }
        }
    }
    return undefined;
}
//# sourceMappingURL=switch-source-header.js.map