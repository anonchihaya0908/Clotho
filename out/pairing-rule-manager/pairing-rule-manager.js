"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showConfigurationWizard = exports.PairingRuleUI = exports.PairingRuleService = void 0;
const vscode = __importStar(require("vscode"));
// Configuration management service class
class PairingRuleService {
    // Validate a single pairing rule to ensure it has all required fields
    static validateRule(rule) {
        if (!rule.key || !rule.language || !rule.headerExt || !rule.sourceExt) {
            throw new Error(`Invalid rule: ${JSON.stringify(rule)}`);
        }
    }
    // Show error message and re-throw the error for proper error handling
    static handleError(error, operation, scope) {
        const message = `Failed to ${operation} pairing rules for ${scope}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        vscode.window.showErrorMessage(message);
        throw error;
    }
    // Get the currently active pairing rules from configuration
    static getActiveRules() {
        return vscode.workspace.getConfiguration('clotho').get(PairingRuleService.CONFIG_KEY, []);
    }
    // Check if custom rules exist for the specified scope (workspace or user)
    static hasCustomRules(scope) {
        const inspection = vscode.workspace.getConfiguration('clotho').inspect(PairingRuleService.CONFIG_KEY);
        const value = scope === 'workspace' ? inspection?.workspaceValue
            : inspection?.globalValue;
        return Array.isArray(value);
    }
    // Get pairing rules for a specific scope (workspace or user)
    static getRules(scope) {
        const inspection = vscode.workspace.getConfiguration('clotho').inspect(PairingRuleService.CONFIG_KEY);
        return scope === 'workspace' ? inspection?.workspaceValue
            : inspection?.globalValue;
    }
    // Write pairing rules to the specified scope (workspace or user)
    static async writeRules(rules, scope) {
        try {
            if (!Array.isArray(rules))
                throw new Error('Rules must be an array');
            rules.forEach(PairingRuleService.validateRule);
            const target = scope === 'workspace'
                ? vscode.ConfigurationTarget.Workspace
                : vscode.ConfigurationTarget.Global;
            await vscode.workspace.getConfiguration('clotho').update(PairingRuleService.CONFIG_KEY, rules, target);
        }
        catch (error) {
            PairingRuleService.handleError(error, 'save', scope);
        }
    }
    // Reset pairing rules for the specified scope (remove custom rules)
    static async resetRules(scope) {
        try {
            const target = scope === 'workspace'
                ? vscode.ConfigurationTarget.Workspace
                : vscode.ConfigurationTarget.Global;
            await vscode.workspace.getConfiguration('clotho').update(PairingRuleService.CONFIG_KEY, undefined, target);
        }
        catch (error) {
            PairingRuleService.handleError(error, 'reset', scope);
        }
    }
}
exports.PairingRuleService = PairingRuleService;
PairingRuleService.CONFIG_KEY = 'createPair.rules';
// User interface management class
class PairingRuleUI {
    // Create rule choices from extension options for QuickPick display
    static createRuleChoices() {
        return PairingRuleUI.EXTENSION_OPTIONS.map((option, index) => ({
            label: option.label,
            description: option.description,
            detail: option.detail,
            rule: {
                key: `custom_${option.language}_${index}`,
                label: `${option.language.toUpperCase()} Pair (${option.headerExt}/${option.sourceExt})`,
                description: `Creates a ${option.headerExt}/${option.sourceExt} file pair with header guards.`,
                language: option.language,
                headerExt: option.headerExt,
                sourceExt: option.sourceExt,
            },
        }));
    }
    // Create advanced options separator and menu item for advanced management
    static createAdvancedOptions() {
        return [
            {
                label: 'Advanced Management',
                kind: vscode.QuickPickItemKind.Separator,
                key: 'separator',
            },
            {
                label: '$(settings-gear) Advanced Options...',
                description: 'Edit or reset rules manually',
                key: 'advanced_options',
            },
        ];
    }
    // Create advanced menu items based on current settings and available actions
    static createAdvancedMenuItems() {
        const items = [
            {
                label: '$(edit) Edit Workspace Rules...',
                description: 'Opens .vscode/settings.json',
                key: 'edit_workspace',
            },
        ];
        if (PairingRuleService.hasCustomRules('workspace')) {
            items.push({
                label: '$(clear-all) Reset Workspace Rules',
                description: 'Use global or default rules instead',
                key: 'reset_workspace',
            });
        }
        items.push({
            label: 'Global (User) Settings',
            kind: vscode.QuickPickItemKind.Separator,
            key: 'separator_global',
        }, {
            label: '$(edit) Edit Global Rules...',
            description: 'Opens your global settings.json',
            key: 'edit_global',
        });
        if (PairingRuleService.hasCustomRules('user')) {
            items.push({
                label: '$(clear-all) Reset Global Rules',
                description: 'Use the extension default rules instead',
                key: 'reset_global',
            });
        }
        return items;
    }
    // Handle rule selection and ask for save scope (workspace or global)
    static async handleRuleSelection(rule) {
        const selection = await vscode.window.showQuickPick([
            {
                label: 'Save for this Workspace',
                description: 'Recommended. Creates a .vscode/settings.json file.',
                scope: 'workspace',
            },
            {
                label: 'Save for all my Projects (Global)',
                description: 'Modifies your global user settings.',
                scope: 'user',
            },
        ], {
            placeHolder: 'Where would you like to save this rule?',
            title: 'Save Configuration Scope',
        });
        if (!selection)
            return;
        await PairingRuleService.writeRules([rule], selection.scope);
        vscode.window.showInformationMessage(`Successfully set '${rule.label}' as the default extension for the ${selection.scope}.`);
    }
    // Handle advanced menu selection and execute the corresponding action
    static async handleAdvancedMenuSelection(key) {
        const actions = {
            edit_workspace: () => vscode.commands.executeCommand('workbench.action.openWorkspaceSettingsFile'),
            edit_global: () => vscode.commands.executeCommand('workbench.action.openSettingsJson'),
            reset_workspace: async () => {
                await PairingRuleService.resetRules('workspace');
                vscode.window.showInformationMessage('Workspace pairing rules have been reset.');
            },
            reset_global: async () => {
                await PairingRuleService.resetRules('user');
                vscode.window.showInformationMessage('Global pairing rules have been reset.');
            },
        };
        const action = actions[key];
        if (action)
            await action();
    }
    // Public method to prompt for file extensions only
    static async promptForFileExtensions() {
        const selected = await vscode.window.showQuickPick(PairingRuleUI.EXTENSION_OPTIONS.map(option => ({
            label: option.label,
            description: option.description,
            detail: option.detail,
            headerExt: option.headerExt,
            sourceExt: option.sourceExt
        })), {
            placeHolder: 'Choose file extensions for your C++ files',
            title: 'Step 1 of 2: Select File Extensions',
            matchOnDescription: true,
            matchOnDetail: true
        });
        return selected
            ? { headerExt: selected.headerExt, sourceExt: selected.sourceExt }
            : undefined;
    }
    // Main configuration wizard - entry point for setting up pairing rules
    static async showConfigurationWizard() {
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = 'Quick Setup: Choose File Extensions';
        quickPick.placeholder =
            'Choose file extension combination for this workspace, or go to advanced options.';
        quickPick.items = [
            ...PairingRuleUI.createRuleChoices(),
            ...PairingRuleUI.createAdvancedOptions()
        ];
        quickPick.onDidChangeSelection(async (selection) => {
            if (!selection[0])
                return;
            quickPick.hide();
            const item = selection[0];
            if ('rule' in item) {
                await PairingRuleUI.handleRuleSelection(item.rule);
            }
            else if (item.key === 'advanced_options') {
                await PairingRuleUI.showAdvancedManagementMenu();
            }
        });
        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();
    }
    // Advanced management menu for editing and resetting pairing rules
    static async showAdvancedManagementMenu() {
        const selection = await vscode.window.showQuickPick(PairingRuleUI.createAdvancedMenuItems(), {
            title: 'Advanced Rule Management',
        });
        if (selection?.key) {
            await PairingRuleUI.handleAdvancedMenuSelection(selection.key);
        }
    }
}
exports.PairingRuleUI = PairingRuleUI;
// Predefined extension combinations for C++ file pairs
PairingRuleUI.EXTENSION_OPTIONS = [
    {
        label: '$(file-code) .h / .cpp',
        description: 'Standard C++ extensions',
        detail: 'Widely used, compatible with most tools and IDEs.',
        headerExt: '.h',
        sourceExt: '.cpp',
        language: 'cpp',
    },
    {
        label: '$(file-code) .hh / .cc',
        description: 'Alternative C++ extensions',
        detail: 'Used by Google style guide and some projects.',
        headerExt: '.hh',
        sourceExt: '.cc',
        language: 'cpp',
    },
    {
        label: '$(file-code) .hpp / .cpp',
        description: 'Header Plus Plus style',
        detail: 'Explicitly indicates C++ headers.',
        headerExt: '.hpp',
        sourceExt: '.cpp',
        language: 'cpp',
    },
    {
        label: '$(file-code) .hxx / .cxx',
        description: 'Extended C++ extensions',
        detail: 'Less common but explicit C++ indicator.',
        headerExt: '.hxx',
        sourceExt: '.cxx',
        language: 'cpp',
    },
];
// Backward compatibility export for the main configuration wizard
exports.showConfigurationWizard = PairingRuleUI.showConfigurationWizard;
//# sourceMappingURL=pairing-rule-manager.js.map