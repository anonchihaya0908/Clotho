/**
 * Switch UI Layer
 * 
 * This module handles all user interface interactions for the switch header/source functionality.
 * It follows the pattern established in create-source-header-pair module.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ERROR_MESSAGES } from '../common/constants';
import { ErrorHandler } from '../common/error-handler';

/**
 * UI service class for switch header/source functionality.
 * Handles all user interactions including dialogs, messages, and file opening.
 * Uses instance-based pattern for consistency with other modules and better testability.
 */
export class SwitchUI {

    constructor() {
        // Initialize any required state here if needed
    }

    /**
     * Shows an informational message when no files are found.
     */
    public showNoFilesFoundMessage(currentFileName: string, isHeader: boolean): void {
        const fileType = isHeader ? 'source' : 'header';
        const message = `No corresponding ${fileType} file found for '${currentFileName}'. You may need to create it manually.`;
        vscode.window.showInformationMessage(message);
    }

    /**
     * Shows a warning when the current file is not a valid C/C++ file.
     */
    public showInvalidFileTypeWarning(fileName: string): void {
        vscode.window.showWarningMessage(
            `File '${fileName}' is not a recognized C/C++ source or header file.`
        );
    }

    /**
     * Shows a warning when no active editor is found.
     */
    public showNoActiveEditorWarning(): void {
        vscode.window.showWarningMessage('No active editor found. Please open a C/C++ file first.');
    }

    /**
     * Shows an error message when switching fails.
     * Uses the standardized error handling pattern.
     */
    public showSwitchError(error: Error): void {
        ErrorHandler.handle(error, {
            operation: 'switchHeaderSource',
            module: 'SwitchUI',
            showToUser: true,
            logLevel: 'error'
        });
    }

    /**
     * Shows debug information about the search method used.
     */
    public showDebugInfo(method: string, foundCount: number): void {
        console.debug(`Clotho: Found ${foundCount} file(s) using method: ${method}`);
    }

    /**
     * Displays a QuickPick dialog when multiple candidate files are found.
     */
    public async showFileSelectionDialog(
        files: vscode.Uri[],
        baseName: string,
        isHeader: boolean
    ): Promise<vscode.Uri | undefined> {
        const fileType = isHeader ? 'source' : 'header';

        interface FileQuickPickItem extends vscode.QuickPickItem {
            uri: vscode.Uri;
        }

        const items: FileQuickPickItem[] = files.map(uri => {
            const relativePath = vscode.workspace.asRelativePath(uri);
            return {
                label: `$(file-code) ${path.basename(uri.fsPath)}`,
                description: path.dirname(relativePath),
                detail: uri.fsPath, // Shows full path for clarity on hover
                uri: uri
            };
        });

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `Found multiple possible ${fileType} files for '${baseName}'. Please choose one.`,
            title: 'Select Corresponding File',
            matchOnDescription: true,
            matchOnDetail: true
        });

        return selected?.uri;
    }

    /**
     * Opens a file in the editor with improved error handling.
     */
    public async openFile(fileUri: vscode.Uri): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(document);
            console.debug(`Clotho: Successfully opened file - ${fileUri.fsPath}`);
        } catch (error) {
            console.error(`Clotho: Failed to open file ${fileUri.fsPath}:`, error);
            const relativePath = vscode.workspace.asRelativePath(fileUri);
            if (error instanceof vscode.FileSystemError) {
                vscode.window.showWarningMessage(`Could not open file: ${relativePath}. It may have been moved or deleted.`);
            } else {
                vscode.window.showErrorMessage(`An error occurred while opening: ${relativePath}`);
            }
            throw error;
        }
    }

    /**
     * Handles the result of a file search operation.
     * Decides whether to open a single file, show selection dialog, or display no results message.
     */
    public async handleSearchResult(
        files: vscode.Uri[],
        baseName: string,
        isHeader: boolean,
        method: string
    ): Promise<void> {
        this.showDebugInfo(method, files.length);

        if (files.length === 0) {
            this.showNoFilesFoundMessage(baseName, isHeader);
            return;
        }

        if (files.length === 1) {
            await this.openFile(files[0]);
            return;
        }

        // Multiple files found, let user choose
        const selectedFile = await this.showFileSelectionDialog(files, baseName, isHeader);
        if (selectedFile) {
            await this.openFile(selectedFile);
        }
    }
}
