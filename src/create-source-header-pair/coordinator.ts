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
    const { language } = await this.service.detectLanguageFromEditor();
    const existingRule = this.getExistingConfigRule(language);
    const isUsingExistingConfig = !!existingRule;

    const rule = await this.getUserPreferences();
    if (!rule) {
      return; // User cancelled
    }

    const fileName = await this.ui.promptForFileName(rule);
    if (!fileName) {
      return; // User cancelled
    }

    // 3. Validate and create files
    await this.createFilePair(targetDirectory, fileName, rule, isUsingExistingConfig);
  }

  /**
   * Get user preferences for pairing rule with header guard style
   * Automatically uses existing configuration if available, otherwise prompts user
   */
  private async getUserPreferences() {
    const { language, uncertain } = await this.service.detectLanguageFromEditor();

    // Try to get existing configuration first
    const existingRule = this.getExistingConfigRule(language);
    if (existingRule) {
      // Show a brief notification that we're using existing config
      const guardText = existingRule.headerGuardStyle === 'pragma_once' ? '#pragma once' : 'traditional header guards';
      vscode.window.showInformationMessage(
        `📋 Using workspace configuration: ${existingRule.headerExt}/${existingRule.sourceExt} with ${guardText}`,
        { modal: false }
      );
      return existingRule;
    }

    // No existing config found, proceed with manual selection
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
    rule: PairingRule,
    isUsingExistingConfig: boolean = false
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

    if (isUsingExistingConfig) {
      // If using existing config, just show success message without save prompt
      await this.ui.showSuccessAndOpenFile(headerPath, sourcePath);
    } else {
      // If manually configured, show success with configuration save prompt (Step 4)
      const shouldSaveConfig = await this.ui.showSuccessWithConfigPrompt(rule, headerPath, sourcePath);

      if (shouldSaveConfig) {
        await this.saveRuleToWorkspace(rule);
      }
    }
  }

  /**
   * Get existing configuration rule that matches the detected language
   * @param language Detected programming language
   * @returns Existing rule or undefined if no suitable config found
   */
  private getExistingConfigRule(language: 'c' | 'cpp'): PairingRule | undefined {
    // Check workspace rules first (higher priority)
    const workspaceRules = this.pairingRuleService.getRules('workspace') || [];
    const matchingWorkspaceRules = workspaceRules.filter(rule => rule.language === language);

    if (matchingWorkspaceRules.length > 0) {
      return this.selectBestRule(matchingWorkspaceRules);
    }

    // Check global rules if no workspace rules found
    const globalRules = this.pairingRuleService.getRules('user') || [];
    const matchingGlobalRules = globalRules.filter(rule => rule.language === language);

    if (matchingGlobalRules.length > 0) {
      return this.selectBestRule(matchingGlobalRules);
    }

    return undefined;
  }

  /**
   * Select the best rule from multiple matching rules
   * Priority: general rules > class rules > struct rules
   */
  private selectBestRule(rules: PairingRule[]): PairingRule {
    // Sort by priority: general rules first, then class, then struct
    const sortedRules = [...rules].sort((a, b) => {
      // General rules (no isClass, no isStruct) have highest priority
      const aIsGeneral = !a.isClass && !a.isStruct;
      const bIsGeneral = !b.isClass && !b.isStruct;

      if (aIsGeneral && !bIsGeneral) {
        return -1;
      }
      if (!aIsGeneral && bIsGeneral) {
        return 1;
      }

      // Among specific rules, prefer class over struct
      if (a.isClass && b.isStruct) {
        return -1;
      }
      if (a.isStruct && b.isClass) {
        return 1;
      }

      return 0;
    });

    const selectedRule = sortedRules[0];

    // Ensure backward compatibility by setting default headerGuardStyle
    return {
      ...selectedRule,
      headerGuardStyle: selectedRule.headerGuardStyle || 'ifndef_define'
    };
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
