//
// PAIR COORDINATOR
// ================
//
// Lean coordinator that orchestrates the source/header pair creation workflow.
// Uses dependency injection and delegates all implementation details to
// service and UI layers.

import * as vscode from 'vscode';

import { BaseCoordinator } from '../common/base-coordinator';
import { ERROR_MESSAGES } from '../common/constants';
import { PairingRule } from '../common/types';
import { PairingRuleService } from '../pairing-rule-manager';

import { PairCreatorService } from './service';
import { PairCreatorUI } from './ui';

// PairCoordinator orchestrates the workflow between UI and Service layers.
// It follows the single responsibility principle and uses dependency injection.
export class PairCoordinator extends BaseCoordinator {
  // Constructor with dependency injection - receives pre-configured instances
  constructor(
    private readonly service: PairCreatorService,
    private readonly ui: PairCreatorUI,
    private readonly pairingRuleService: PairingRuleService,
  ) {
    super(); // Initialize BaseCoordinator

    // Validate dependencies
    this.validateDependencies({
      service: this.service,
      ui: this.ui,
      pairingRuleService: this.pairingRuleService,
    });

    // Commands are now registered centrally in bootstrap.ts
  }

  /**
   * Get the module name for logging purposes
   */
  protected getModuleName(): string {
    return 'PairCoordinator';
  }

  // Main workflow orchestration - clean coordinator layer
  public async create(): Promise<void> {
    return this.executeOperation('create', async () => {
      // 1. Determine where to create files
      const targetDirectory = await this.getTargetDirectory();
      if (!targetDirectory) {
        this.ui.showError(ERROR_MESSAGES.NO_TARGET_DIRECTORY);
        return;
      }

      // 2. Get user preferences (delegates to service for config detection)
      const userPreferences = await this.getUserPreferences();
      if (!userPreferences) {
        return; // User cancelled
      }

      const fileName = await this.ui.promptForFileName(userPreferences.rule);
      if (!fileName) {
        return; // User cancelled
      }

      // 3. Validate and create files
      await this.createFilePair(targetDirectory, fileName, userPreferences.rule);

      // 4. Handle post-creation config save if needed
      if (userPreferences.needsSaving) {
        await this.ui.offerToSaveCompleteConfig(userPreferences.rule, this.service, this.pairingRuleService);
      }
    });
  }

  /**
   * Get user preferences - delegates to service for config detection, UI for prompts
   */
  private async getUserPreferences(): Promise<{ rule: PairingRule; needsSaving: boolean } | undefined> {
    const { language, uncertain } = await this.service.detectLanguageFromEditor();

    // Delegate config detection to service layer
    const existingRule = this.service.getExistingConfigRule(language);
    if (existingRule) {
      // Check if the existing rule has all required fields
      if (!existingRule.headerGuardStyle) {
        // Configuration is incomplete - need to ask for missing headerGuardStyle
        const headerGuardStyle = await this.ui.promptForHeaderGuardStyle();
        if (!headerGuardStyle) {
          return undefined; // User cancelled
        }

        // Return enhanced rule with flag to save after file creation
        const completeRule = {
          ...existingRule,
          headerGuardStyle
        };

        return { rule: completeRule, needsSaving: true };
      }

      // Configuration is complete - use as-is
      this.ui.showConfigUsageNotification(existingRule);
      return { rule: existingRule, needsSaving: false };
    }

    // No existing config - delegate user interaction to UI layer
    const rule = await this.ui.promptForCompleteRule(language, uncertain);
    if (!rule) {
      return undefined;
    }

    return { rule, needsSaving: false }; // UI layer handles its own saving
  }

  /**
   * Create the file pair after validation - delegates to service and UI
   */
  private async createFilePair(
    targetDirectory: vscode.Uri,
    fileName: string,
    rule: PairingRule
  ): Promise<void> {
    // Delegate file path creation and conflict check to service
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

    // Delegate file creation to service
    await this.service.generateAndWriteFiles(
      fileName,
      rule,
      headerPath,
      sourcePath,
    );

    // Delegate post-creation handling to UI layer
    await this.ui.handlePostCreationFlow(rule, headerPath, sourcePath, this.pairingRuleService);
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
