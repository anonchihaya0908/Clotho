//
// HEADER GUARD CONFIGURATION COORDINATOR
// =====================================
//
// Thin coordinator layer for configuring header guard styles
// Handles the flow of selecting and saving header guard preferences
//

import * as vscode from 'vscode';
import { BaseCoordinator } from '../common/base-coordinator';
import { PairCreatorUI } from './ui';
import { IPairCreatorService, IPairingRuleService } from '../common/interfaces/services';
import { HeaderGuardStyle, PairingRule } from '../common/types';

/**
 * Coordinator for header guard configuration
 * Provides a dedicated command to configure header guard style without creating files
 */
export class HeaderGuardCoordinator extends BaseCoordinator {
  constructor(
    private readonly ui: PairCreatorUI,
    private readonly service: IPairCreatorService,
    private readonly pairingRuleService: IPairingRuleService,
  ) {
    super();
    this.validateDependencies({ ui, service, pairingRuleService });
  }

  protected getModuleName(): string {
    return 'HeaderGuardCoordinator';
  }

  /**
   * Main workflow for configuring header guard style
   * Shows current settings and allows user to update the header guard preference
   */
  public async configureHeaderGuard(): Promise<void> {
    return this.executeOperation('configureHeaderGuard', async () => {
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
    });
  }

  /**
   * Updates the header guard configuration for the specified language
   */
  private async updateHeaderGuardConfiguration(
    existingRule: PairingRule,
    newHeaderGuardStyle: HeaderGuardStyle,
    language: 'c' | 'cpp'
  ): Promise<void> {
    // Create updated rule with new header guard style
    const updatedRule: PairingRule = {
      ...existingRule,
      headerGuardStyle: newHeaderGuardStyle,
    };

    // Use service layer to save the configuration
    await this.service.saveCompleteConfigToWorkspace(updatedRule, this.pairingRuleService);

    const newText = newHeaderGuardStyle === 'pragma_once' ? '#pragma once' : '#ifndef/#define/#endif';
    vscode.window.showInformationMessage(
      `Header guard style updated to ${newText} for ${language.toUpperCase()} files.`
    );
  }

  /**
   * Override dispose method from BaseCoordinator
   * Currently no additional resources to clean up
   */
  protected override onDispose(): void {
    // No additional resources to dispose
    this.logger.debug('HeaderGuardCoordinator disposed', {
      operation: 'dispose'
    });
  }
}
