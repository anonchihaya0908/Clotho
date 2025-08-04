//
// PAIR COORDINATOR
// ================
//
// Lean coordinator that orchestrates the source/header pair creation workflow.
// Uses dependency injection and delegates all implementation details to
// service and UI layers.

import * as vscode from 'vscode';

import { ERROR_MESSAGES } from '../common/constants';
import { PairingRule } from '../common/types';
import { PairingRuleService } from '../pairing-rule-manager';

import { PairCreatorService } from './service';
import { PairCreatorUI } from './ui';

// PairCoordinator orchestrates the workflow between UI and Service layers.
// It follows the single responsibility principle and uses dependency injection.
export class PairCoordinator implements vscode.Disposable {
  // Constructor with dependency injection - receives pre-configured instances
  constructor(
    private readonly service: PairCreatorService,
    private readonly ui: PairCreatorUI,
    private readonly pairingRuleService: PairingRuleService,
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
   * Get user preferences for pairing rule with header guard style
   */
  private async getUserPreferences() {
    const { language, uncertain } = await this.service.detectLanguageFromEditor();

    // Step 1 & 2: Get pairing rule (template + extensions)
    const rule = await this.ui.promptForPairingRule(language, uncertain);
    if (!rule) {
      return undefined; // User cancelled
    }

    // Step 3: Get header guard style preference
    const headerGuardStyle = await this.ui.promptForHeaderGuardStyle();
    if (!headerGuardStyle) {
      return undefined; // User cancelled
    }

    // Combine the rule with the selected header guard style
    return {
      ...rule,
      headerGuardStyle,
    };
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

    // Show success with configuration save prompt (Step 4)
    const shouldSaveConfig = await this.ui.showSuccessWithConfigPrompt(rule, headerPath, sourcePath);

    if (shouldSaveConfig) {
      await this.saveRuleToWorkspace(rule);
    }
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

  /**
   * Save pairing rule to workspace settings
   */
  private async saveRuleToWorkspace(rule: PairingRule): Promise<void> {
    try {
      // Create a clean rule for saving
      const workspaceRule: PairingRule = {
        key: `workspace_default_${Date.now()}`,
        label: `${rule.language.toUpperCase()} Pair (${rule.headerExt}/${rule.sourceExt})`,
        description: `Creates a ${rule.headerExt}/${rule.sourceExt} file pair with ${rule.headerGuardStyle === 'pragma_once' ? '#pragma once' : 'traditional header guards'}.`,
        language: rule.language,
        headerExt: rule.headerExt,
        sourceExt: rule.sourceExt,
        isClass: rule.isClass,
        isStruct: rule.isStruct,
        headerGuardStyle: rule.headerGuardStyle,
      };

      // Save to workspace settings
      await this.pairingRuleService.writeRules([workspaceRule], 'workspace');

      const guardText = rule.headerGuardStyle === 'pragma_once' ? '#pragma once' : 'traditional header guards';
      vscode.window.showInformationMessage(
        `✅ Configuration saved to workspace! Future file pairs will use ${rule.headerExt}/${rule.sourceExt} with ${guardText}.`
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
