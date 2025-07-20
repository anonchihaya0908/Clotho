/**
 * PAIRING RULE MANAGER - MODULE INDEX
 * ===================================
 * 
 * This module provides configuration management for C/C++ file pairing rules.
 * It allows users to define custom file extension pairs and templates for
 * different project structures and coding standards.
 * 
 * ARCHITECTURE:
 * - service.ts: Business logic for rule management and configuration persistence
 * - ui.ts: User interface handling for rule selection and configuration wizards
 * - coordinator.ts: Command registration and workflow orchestration
 * - index.ts: Module exports and unified API
 * 
 * FEATURES:
 * - Predefined extension combinations (.h/.cpp, .hpp/.cpp, etc.)
 * - Workspace and global configuration scopes
 * - Interactive configuration wizard
 * - Advanced rule management interface
 * - Integration with VS Code settings system
 * 
 * WORKFLOW:
 * Command triggered → Coordinator → UI (show wizard) → Service (save configuration)
 */

import { ExtensionContext } from '../extension';
import { PairingRuleCoordinator } from './coordinator';
import { PairingRuleService } from './service';
import { PairingRuleUI } from './ui';

/**
 * Registers the pairing rule management functionality with the VS Code extension context
 * Uses dependency injection to create properly configured instances
 */
export function activatePairingRuleManager(context: ExtensionContext): PairingRuleCoordinator {
    // Create instances with proper dependencies
    const service = new PairingRuleService();
    const ui = new PairingRuleUI(service);
    const coordinator = new PairingRuleCoordinator(service, ui);

    // Add to subscriptions for proper cleanup
    context.subscriptions.push(coordinator);

    console.log('Clotho: Pairing rule management functionality activated');

    return coordinator;
}

// Export main types and classes for external usage
export { PairingRuleCoordinator } from './coordinator';
export { PairingRuleService, type PairingRule } from './service';
export { PairingRuleUI } from './ui';
