/**
 * Pairing Rule Service
 * Handles all business logic related to pairing rule management
 */

import * as vscode from 'vscode';
import { errorHandler } from '../common/error-handler';
import { CONFIG_KEYS } from '../common/constants';
import { PairingRule } from '../common/types';
import { IPairingRuleService } from '../common/interfaces/services';

/**
 * Service class for managing pairing rules configuration
 * Handles all interactions with VS Code configuration system
 */
export class PairingRuleService implements IPairingRuleService {
  /**
   * Validate a single pairing rule to ensure it has all required fields
   */
  validateRule(rule: PairingRule): void {
    if (!rule.key || !rule.language || !rule.headerExt || !rule.sourceExt) {
      // Log via error handler for consistency, then throw a synchronous error
      // Note: errorHandler.handle is async; do not throw its Promise
      void errorHandler.handle(
        new Error(`Invalid rule: ${JSON.stringify(rule)}`),
        {
          operation: 'validateRule',
          module: 'PairingRuleService',
          showToUser: true,
        },
      );
      throw new Error(`Invalid rule: ${JSON.stringify(rule)}`);
    }
  }

  /**
   * Get the currently active pairing rules from configuration
   */
  getActiveRules(): ReadonlyArray<PairingRule> {
    return vscode.workspace
      .getConfiguration('clotho')
      .get<PairingRule[]>(CONFIG_KEYS.CREATE_PAIR_RULES, []);
  }

  /**
   * Check if custom rules exist for the specified scope (workspace or user)
   */
  hasCustomRules(scope: 'workspace' | 'user'): boolean {
    const inspection = vscode.workspace
      .getConfiguration('clotho')
      .inspect<PairingRule[]>(CONFIG_KEYS.CREATE_PAIR_RULES);
    const value =
      scope === 'workspace'
        ? inspection?.workspaceValue
        : inspection?.globalValue;
    return Array.isArray(value);
  }

  /**
   * Get pairing rules for a specific scope (workspace or user)
   */
  getRules(scope: 'workspace' | 'user'): PairingRule[] | undefined {
    const inspection = vscode.workspace
      .getConfiguration('clotho')
      .inspect<PairingRule[]>(CONFIG_KEYS.CREATE_PAIR_RULES);
    return scope === 'workspace'
      ? inspection?.workspaceValue
      : inspection?.globalValue;
  }

  /**
   * Write pairing rules to the specified scope (workspace or user)
   */
  async writeRules(
    rules: PairingRule[],
    scope: 'workspace' | 'user',
  ): Promise<void> {
    const saveRules = errorHandler.wrapAsync(
      async () => {
        if (!Array.isArray(rules)) {
          throw new Error('Rules must be an array');
        }
        rules.forEach((rule) => this.validateRule(rule));

        const target =
          scope === 'workspace'
            ? vscode.ConfigurationTarget.Workspace
            : vscode.ConfigurationTarget.Global;
        await vscode.workspace
          .getConfiguration('clotho')
          .update(CONFIG_KEYS.CREATE_PAIR_RULES, rules, target);
      },
      {
        operation: 'writeRules',
        module: 'PairingRuleService',
        showToUser: true,
      },
    );

    await saveRules();
  }

  /**
   * Update only file extensions for a specific language, preserving all other settings
   * This is the clean solution: only touch what the command is supposed to configure
   */
  async updateRuleExtensions(
    newRule: PairingRule,
    scope: 'workspace' | 'user'
  ): Promise<void> {
    const updateExtensions = errorHandler.wrapAsync(
      async () => {
        const existingRules = this.getRules(scope) || [];
        const otherLanguageRules = existingRules.filter(r => r.language !== newRule.language);
        const existingRuleForLanguage = existingRules.find(r => r.language === newRule.language);

        let updatedRule: PairingRule;

        if (existingRuleForLanguage) {
          // Preserve all existing settings, only update extensions
          updatedRule = {
            ...existingRuleForLanguage,
            headerExt: newRule.headerExt,
            sourceExt: newRule.sourceExt,
            label: newRule.label, // Update label to reflect new extensions
            // Keep headerGuardStyle and all other fields unchanged
          };
        } else {
          // No existing rule, use the new rule but ensure backward compatibility
          updatedRule = {
            ...newRule,
            // Ensure headerGuardStyle has a default value for backward compatibility
            headerGuardStyle: newRule.headerGuardStyle || 'ifndef_define'
          };
        }

        const allRules = [...otherLanguageRules, updatedRule];
        await this.writeRules(allRules, scope);
      },
      {
        operation: 'updateRuleExtensions',
        module: 'PairingRuleService',
        showToUser: true,
      },
    );

    await updateExtensions();
  }

  /**
   * Reset pairing rules for the specified scope (remove custom rules)
   */
  async resetRules(scope: 'workspace' | 'user'): Promise<void> {
    const resetRules = errorHandler.wrapAsync(
      async () => {
        const target =
          scope === 'workspace'
            ? vscode.ConfigurationTarget.Workspace
            : vscode.ConfigurationTarget.Global;
        await vscode.workspace
          .getConfiguration('clotho')
          .update(CONFIG_KEYS.CREATE_PAIR_RULES, undefined, target);
      },
      {
        operation: 'resetRules',
        module: 'PairingRuleService',
        showToUser: true,
      },
    );

    await resetRules();
  }
}
