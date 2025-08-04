//
// HEADER GUARD CONFIGURATION COORDINATOR
// =====================================
//
// Thin coordinator layer for configuring header guard styles
// Handles the flow of selecting and saving header guard preferences
//

import * as vscode from 'vscode';
import { errorHandler } from '../common/error-handler';
import { PairCreatorUI } from './ui';
import { PairCreatorService } from './service';
import { PairingRuleService } from '../pairing-rule-manager';
import { HeaderGuardStyle } from '../common/types';

/**
 * Coordinator for header guard configuration
 * Provides a dedicated command to configure header guard style without creating files
 */
export class HeaderGuardCoordinator {
  constructor(
    private readonly ui: PairCreatorUI,
    private readonly service: PairCreatorService,
    private readonly pairingRuleService: PairingRuleService,
  ) {}

  /**
   * Main workflow for configuring header guard style
   * Shows current settings and allows user to update the header guard preference
   */
  public async configureHeaderGuard(): Promise<void> {
    try {
      // 1. Detect language context
      const { language } = await this.service.detectLanguageFromEditor();

      // 2. Get existing configuration
      const existingRule = this.service.getExistingConfigRule(language);

      if (!existingRule) {
        vscode.window.showWarningMessage(
          `No existing ${language.toUpperCase()} configuration found. Please create a file pair first to establish a configuration.`
        );
        return;
      }

      // 3. Get current setting and directly prompt for new one
      const currentGuard = existingRule.headerGuardStyle || 'ifndef_define';

      // 4. Prompt for new header guard style (use dedicated configuration UI)
      const newHeaderGuardStyle = await this.ui.promptForHeaderGuardConfiguration();
      if (!newHeaderGuardStyle) {
        return; // User cancelled
      }

      // 5. Check if actually changed
      if (newHeaderGuardStyle === currentGuard) {
        vscode.window.showInformationMessage('Header guard style unchanged.');
        return;
      }

      // 6. Update the configuration
      await this.updateHeaderGuardConfiguration(existingRule, newHeaderGuardStyle, language);

    } catch (error) {
      errorHandler.handle(error, {
        module: 'HeaderGuardCoordinator',
        operation: 'configureHeaderGuard',
        showToUser: true,
      });
    }
  }

  /**
   * Updates the header guard configuration for the specified language
   */
  private async updateHeaderGuardConfiguration(
    existingRule: any,
    newHeaderGuardStyle: HeaderGuardStyle,
    language: 'c' | 'cpp'
  ): Promise<void> {
    try {
      // Create updated rule with new header guard style
      const updatedRule = {
        ...existingRule,
        headerGuardStyle: newHeaderGuardStyle,
      };

      // Use service layer to save the configuration
      await this.service.saveCompleteConfigToWorkspace(updatedRule, this.pairingRuleService);

      const newText = newHeaderGuardStyle === 'pragma_once' ? '#pragma once' : '#ifndef/#define/#endif';
      vscode.window.showInformationMessage(
        `Header guard style updated to ${newText} for ${language.toUpperCase()} files.`
      );

    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to update header guard configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Cleanup method - currently no resources to dispose
   */
  dispose(): void {
    // No resources to dispose
  }
}
