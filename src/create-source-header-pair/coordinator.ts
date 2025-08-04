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

  // Main workflow orchestration - clean coordinator layer
  public async create(): Promise<void> {
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
      await this.offerToSaveCompleteConfig(userPreferences.rule);
    }
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
   * Offer to save complete configuration when user fills in missing fields
   */
  private async offerToSaveCompleteConfig(rule: PairingRule): Promise<void> {
    const guardText = rule.headerGuardStyle === 'pragma_once' ? '#pragma once' : 'traditional header guards';

    const choice = await vscode.window.showInformationMessage(
      `💾 Files created successfully!\n\n💡 Save complete configuration?\nYour settings: ${rule.headerExt}/${rule.sourceExt} with ${guardText}`,
      { modal: false },
      'Save Configuration',
      'Use Once Only'
    );

    if (choice === 'Save Configuration') {
      try {
        // Get existing rules and preserve other language rules
        const existingRules = this.pairingRuleService.getRules('workspace') || [];
        const otherLanguageRules = existingRules.filter(r => r.language !== rule.language);

        // Create clean rule for saving with complete configuration
        const workspaceRule: PairingRule = {
          key: `workspace_default_${Date.now()}`,
          label: `${rule.language.toUpperCase()} Pair (${rule.headerExt}/${rule.sourceExt})`,
          description: `Creates a ${rule.headerExt}/${rule.sourceExt} file pair with ${guardText}.`,
          language: rule.language,
          headerExt: rule.headerExt,
          sourceExt: rule.sourceExt,
          isClass: rule.isClass,
          isStruct: rule.isStruct,
          headerGuardStyle: rule.headerGuardStyle, // Ensure this is included
        };

        // Combine with other language rules and save
        const allRules = [...otherLanguageRules, workspaceRule];
        await this.pairingRuleService.writeRules(allRules, 'workspace');

        vscode.window.showInformationMessage(
          `✅ Complete configuration saved to workspace! Future file pairs will use ${rule.headerExt}/${rule.sourceExt} with ${guardText}.`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
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
}
