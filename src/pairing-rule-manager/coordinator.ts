/**
 * Pairing Rule Coordinator
 * Orchestrates the pairing rule management workflow between service and UI layers
 */

import * as vscode from 'vscode';
import { errorHandler } from '../common/error-handler';
import { PairingRuleUI } from './ui';

/**
 * Coordinator class that orchestrates pairing rule management workflow.
 * Uses dependency injection and delegates all implementation details to
 * service and UI layers.
 */
export class PairingRuleCoordinator implements vscode.Disposable {
  /**
   * Constructor with dependency injection - receives pre-configured instances
   */
  constructor(
    private readonly ui: PairingRuleUI,
  ) {
    // Commands are now registered centrally in bootstrap.ts
  }

  /**
   * Dispose method for cleanup when extension is deactivated
   */
  dispose(): void {
    // No resources to dispose since commands are managed centrally
  }

  /**
   * Opens the configuration wizard for pairing rules
   */
  public async configureRules(): Promise<void> {
    try {
      await this.ui.showConfigurationWizard();
    } catch (error) {
      errorHandler.handle(error, {
        operation: 'configureRules',
        module: 'PairingRuleCoordinator',
        showToUser: true,
        logLevel: 'error',
      });
    }
  }
}
