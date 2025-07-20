/**
 * Coordinator for switch header/source functionality.
 * Handles command registration and orchestrates the interaction between Service and UI layers.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { SwitchService } from './switch-service';
import { SwitchUI } from './switch-ui';
import { SwitchConfigService } from './config-manager';

// Extension context interface for dependency injection
export interface ExtensionContext {
    subscriptions: vscode.Disposable[];
    extensionContext: vscode.ExtensionContext;
}

/**
 * Main coordinator class that orchestrates the switch functionality.
 */
export class SwitchCoordinator {

    /**
     * Main switch operation - orchestrates Service and UI interactions.
     */
    public static async switchHeaderSource(): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            SwitchUI.showNoActiveEditorWarning();
            return;
        }

        const currentFile = activeEditor.document.uri;
        const currentPath = currentFile.fsPath;
        const fileName = path.basename(currentPath);

        // Validate file type
        if (!SwitchService.isValidCppFile(currentPath)) {
            SwitchUI.showInvalidFileTypeWarning(fileName);
            return;
        }

        try {
            // Use the service to find partner files
            const result = await SwitchService.findPartnerFile(currentFile);

            if (!result) {
                const baseName = path.basename(currentPath, path.extname(currentPath));
                const isHeader = SwitchService.isHeaderFile(currentPath);
                SwitchUI.showNoFilesFoundMessage(baseName, isHeader);
                return;
            }

            // Let the UI handle the results
            const baseName = path.basename(currentPath, path.extname(currentPath));
            const isHeader = SwitchService.isHeaderFile(currentPath);
            await SwitchUI.handleSearchResult(result.files, baseName, isHeader, result.method);

        } catch (error) {
            SwitchUI.showSwitchError(error instanceof Error ? error : new Error('Unknown error'));
        }
    }

    /**
     * Shows the configuration template selector.
     */
    public static async showConfigTemplate(): Promise<void> {
        try {
            await SwitchConfigService.showTemplateSelector();
        } catch (error) {
            SwitchUI.showSwitchError(error instanceof Error ? error : new Error('Configuration error'));
        }
    }

    /**
     * Shows the current configuration.
     */
    public static showCurrentConfig(): void {
        try {
            SwitchConfigService.showCurrentConfig();
        } catch (error) {
            SwitchUI.showSwitchError(error instanceof Error ? error : new Error('Configuration error'));
        }
    }
}

/**
 * Activates the switch header/source functionality.
 * Registers the commands and sets up the necessary infrastructure.
 */
export function activateSwitchSourceHeader(context: ExtensionContext): void {
    // Register the main switch command
    const switchCommand = vscode.commands.registerCommand(
        'clotho.switchHeaderSource',
        async () => {
            await SwitchCoordinator.switchHeaderSource();
        }
    );

    // Register the configuration template selector command
    const configTemplateCommand = vscode.commands.registerCommand(
        'clotho.switchConfigTemplate',
        async () => {
            await SwitchCoordinator.showConfigTemplate();
        }
    );

    // Register the show current config command
    const showConfigCommand = vscode.commands.registerCommand(
        'clotho.showSwitchConfig',
        () => {
            SwitchCoordinator.showCurrentConfig();
        }
    );

    // Add to subscriptions for proper cleanup
    context.subscriptions.push(switchCommand, configTemplateCommand, showConfigCommand);

    console.log('Clotho: Switch header/source functionality activated');
}