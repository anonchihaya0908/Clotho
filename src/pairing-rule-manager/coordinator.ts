/**
 * Pairing Rule Coordinator
 * Orchestrates the pairing rule management workflow between service and UI layers
 */

import * as vscode from 'vscode';
import { ErrorHandler } from '../common/error-handler';
import { COMMANDS } from '../common/constants';
import { PairingRuleService } from './service';
import { PairingRuleUI } from './ui';

/**
 * Coordinator class that orchestrates pairing rule management workflow.
 * Uses dependency injection and delegates all implementation details to
 * service and UI layers.
 */
export class PairingRuleCoordinator implements vscode.Disposable {
  private configureRulesCommand: vscode.Disposable;

  /**
   * Constructor with dependency injection - receives pre-configured instances
   */
  constructor(
    private readonly service: PairingRuleService,
    private readonly ui: PairingRuleUI,
  ) {
    // Register the configure rules command
    this.configureRulesCommand = vscode.commands.registerCommand(
      COMMANDS.CONFIGURE_RULES,
      this.configureRules,
      this,
    );
  }

  /**
   * Dispose method for cleanup when extension is deactivated
   */
  dispose(): void {
    this.configureRulesCommand.dispose();
  }

  /**
   * Opens the configuration wizard for pairing rules
   */
  public async configureRules(): Promise<void> {
    try {
      await this.ui.showConfigurationWizard();
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'configureRules',
        module: 'PairingRuleCoordinator',
        showToUser: true,
        logLevel: 'error',
      });
    }
  }
}
