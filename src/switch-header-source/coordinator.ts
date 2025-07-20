/**
 * Refactored Switch Coordinator - Example of improved architecture
 * Demonstrates best practices for error handling, type safety, and code organization
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {
    ExtensionContext,
    ErrorHandler,
    COMMANDS,
    ERROR_MESSAGES,
    isValidCppFile,
    getFileType
} from '../common';
import { SwitchService } from './switch-service';
import { SwitchUI } from './switch-ui';
import { SwitchConfigService } from './config-manager';

/**
 * Main coordinator class that orchestrates the switch functionality.
 * Uses dependency injection and comprehensive error handling.
 */
export class SwitchCoordinator {
    private readonly service: SwitchService;
    private readonly ui: SwitchUI;

    constructor(
        service?: SwitchService,
        ui?: SwitchUI
    ) {
        // Allow dependency injection for testing
        this.service = service ?? new SwitchService();
        this.ui = ui ?? new SwitchUI();
    }

    /**
     * Main switch operation with comprehensive error handling
     */
    public async switchHeaderSource(): Promise<void> {
        try {
            // Validate preconditions
            const activeEditor = this.validateActiveEditor();
            if (!activeEditor) return;

            const currentFile = activeEditor.document.uri;
            const currentPath = currentFile.fsPath;
            const fileName = path.basename(currentPath);

            // Validate file type
            if (!isValidCppFile(currentPath)) {
                this.ui.showInvalidFileTypeWarning(fileName);
                return;
            }

            // Perform the search
            const result = await this.service.findPartnerFile(currentFile);

            if (!result || result.files.length === 0) {
                const baseName = path.basename(currentPath, path.extname(currentPath));
                const fileType = getFileType(currentPath);
                this.ui.showNoFilesFoundMessage(baseName, fileType === 'header');
                return;
            }

            // Handle the results
            const baseName = path.basename(currentPath, path.extname(currentPath));
            const isHeader = getFileType(currentPath) === 'header';
            await this.ui.handleSearchResult(result.files, baseName, isHeader, result.method);
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'switchHeaderSource',
                module: 'SwitchCoordinator',
                showToUser: true,
                logLevel: 'error'
            });
        }
    }

    /**
     * Shows the configuration template selector with error handling
     */
    public async showConfigTemplate(): Promise<void> {
        try {
            await SwitchConfigService.showTemplateSelector();
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'showConfigTemplate',
                module: 'SwitchCoordinator',
                showToUser: true
            });
        }
    }

    /**
     * Shows the current configuration with error handling
     */
    public showCurrentConfig(): void {
        try {
            SwitchConfigService.showCurrentConfig();
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'showCurrentConfig',
                module: 'SwitchCoordinator',
                showToUser: true
            });
        }
    }

    /**
     * Validates that there is an active editor
     */
    private validateActiveEditor(): vscode.TextEditor | null {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            this.ui.showNoActiveEditorWarning();
            return null;
        }
        return activeEditor;
    }

    /**
     * Disposes of resources
     */
    public dispose(): void {
        // Clean up any resources if needed
    }
}

/**
 * Factory function for creating and configuring the coordinator
 */
export function createSwitchCoordinator(): SwitchCoordinator {
    return new SwitchCoordinator();
}

/**
 * Activates the switch header/source functionality with improved error handling
 */
export function activateSwitchSourceHeader(context: ExtensionContext): void {
    const errorHandler = (operation: string) => (error: unknown) => {
        ErrorHandler.handle(error, {
            operation,
            module: 'SwitchCoordinator',
            showToUser: true,
            logLevel: 'error'
        });
    };

    try {
        // Create coordinator instance
        const coordinator = createSwitchCoordinator();

        // Register the main switch command with error handling
        const switchCommand = vscode.commands.registerCommand(
            COMMANDS.SWITCH_HEADER_SOURCE,
            ErrorHandler.wrapAsync(
                () => coordinator.switchHeaderSource(),
                {
                    operation: 'switchHeaderSource command',
                    module: 'SwitchCoordinator',
                    showToUser: true
                }
            )
        );

        // Add to subscriptions for proper cleanup
        context.subscriptions.push(
            switchCommand,
            coordinator
        );

        console.log('Clotho: Switch header/source functionality activated');
    } catch (error) {
        errorHandler('activateSwitchSourceHeader')(error);
    }
}

// Re-export ExtensionContext for external usage
export type { ExtensionContext };
