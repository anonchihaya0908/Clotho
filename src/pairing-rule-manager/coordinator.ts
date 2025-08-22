/**
 * Pairing Rule Coordinator
 * Orchestrates the pairing rule management workflow between service and UI layers
 */

import { BaseCoordinator } from '../common/base-coordinator';
import { PairingRuleUI } from './ui';

/**
 * Coordinator class that orchestrates pairing rule management workflow.
 * Uses dependency injection and delegates all implementation details to
 * service and UI layers.
 */
export class PairingRuleCoordinator extends BaseCoordinator {
  /**
   * Constructor with dependency injection - receives pre-configured instances
   */
  constructor(
    private readonly ui: PairingRuleUI,
  ) {
    super(); // Initialize BaseCoordinator

    // Validate dependencies
    this.validateDependencies({
      ui: this.ui,
    });

    // Commands are now registered centrally in bootstrap.ts
  }

  /**
   * Get the module name for logging purposes
   */
  protected getModuleName(): string {
    return 'PairingRuleCoordinator';
  }

  /**
   * Opens the configuration wizard for pairing rules
   */
  public async configureRules(): Promise<void> {
    return this.executeOperation('configureRules', async () => {
      await this.ui.showConfigurationWizard();
    });
  }
}
