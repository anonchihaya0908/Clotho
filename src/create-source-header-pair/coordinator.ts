//
// PAIR COORDINATOR
// ================
//
// Lean coordinator that orchestrates the source/header pair creation workflow.
// Uses dependency injection and delegates all implementation details to
// service and UI layers.

import * as vscode from 'vscode';

import { COMMANDS, ERROR_MESSAGES } from '../common/constants';
import { ErrorHandler } from '../common/error-handler';
import { PairingRule } from '../common/types';

import { PairCreatorService } from './service';
import { PairCreatorUI } from './ui';

// PairCoordinator orchestrates the workflow between UI and Service layers.
// It follows the single responsibility principle and uses dependency injection.
export class PairCoordinator implements vscode.Disposable {
  // Constructor with dependency injection - receives pre-configured instances
  constructor(
    private readonly service: PairCreatorService,
    private readonly ui: PairCreatorUI,
  ) {
    // Commands are now registered centrally in bootstrap.ts
  }

  // Dispose method for cleanup when extension is deactivated
  dispose() {
    // No resources to dispose since commands are managed centrally
  }

  // Main workflow orchestration - refactored into smaller methods
  public async create(): Promise<void> {
    // 1. Determine where to create files
    const targetDirectory = await this.getTargetDirectory();
    if (!targetDirectory) {
      this.ui.showError(ERROR_MESSAGES.NO_TARGET_DIRECTORY);
      return;
    }

    // 2. Get user preferences for what to create
    const rule = await this.getUserPreferences();
    if (!rule) {
      return; // User cancelled
    }

    const fileName = await this.ui.promptForFileName(rule);
    if (!fileName) {
      return; // User cancelled
    }

    // 3. Validate and create files
    await this.createFilePair(targetDirectory, fileName, rule);
  }

  /**
   * Get user preferences for pairing rule
   */
  private async getUserPreferences() {
    const { language, uncertain } = await this.service.detectLanguageFromEditor();
    return await this.ui.promptForPairingRule(language, uncertain);
  }

  /**
   * Create the file pair after validation
   */
  private async createFilePair(
    targetDirectory: vscode.Uri,
    fileName: string,
    rule: PairingRule
  ): Promise<void> {
    // Prepare file paths and check for conflicts
    const { headerPath, sourcePath } = this.service.createFilePaths(
      targetDirectory,
      fileName,
      rule,
    );

    const existingFilePath = await this.service.checkFileExistence(
      headerPath,
      sourcePath,
    );

    if (existingFilePath) {
      this.ui.showError(ERROR_MESSAGES.FILE_EXISTS(existingFilePath));
      return;
    }

    // Create the files
    await this.service.generateAndWriteFiles(
      fileName,
      rule,
      headerPath,
      sourcePath,
    );

    // Show success and handle post-creation tasks
    await this.ui.showSuccessAndOpenFile(headerPath, sourcePath);
    await this.service.handleOfferToSaveAsDefault(rule, await this.service.detectLanguageFromEditor().then(r => r.language));
  }

  /**
   * Determine target directory with fallback to workspace picker
   */
  private async getTargetDirectory(): Promise<vscode.Uri | undefined> {
    return (
      (await this.service.getTargetDirectory(
        vscode.window.activeTextEditor?.document?.uri.fsPath,
        vscode.workspace.workspaceFolders,
      )) ?? (await this.ui.showWorkspaceFolderPicker())
    );
  }
}
