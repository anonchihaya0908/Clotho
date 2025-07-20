/**
 * Pairing Rule UI
 * Handles all user interface interactions for pairing rule management
 */

import * as vscode from 'vscode';
import { ErrorHandler } from '../common/error-handler';
import { PairingRule } from '../common/types';
import { PairingRuleService } from './service';

// Type aliases for QuickPick items
type RuleQuickPickItem = vscode.QuickPickItem & { rule: PairingRule };
type ActionQuickPickItem = vscode.QuickPickItem & { key: string };

/**
 * UI class for managing pairing rule user interactions
 * Handles all dialogs, quick picks, and user input related to pairing rules
 */
export class PairingRuleUI {
    // Predefined extension combinations for C++ file pairs
    private static readonly EXTENSION_OPTIONS = [
        {
            label: '$(file-code) .h / .cpp',
            description: 'Standard C++ extensions',
            detail: 'Widely used, compatible with most tools and IDEs.',
            headerExt: '.h',
            sourceExt: '.cpp',
            language: 'cpp' as const,
        },
        {
            label: '$(file-code) .hh / .cc',
            description: 'Alternative C++ extensions',
            detail: 'Used by Google style guide and some projects.',
            headerExt: '.hh',
            sourceExt: '.cc',
            language: 'cpp' as const,
        },
        {
            label: '$(file-code) .hpp / .cpp',
            description: 'Header Plus Plus style',
            detail: 'Explicitly indicates C++ headers.',
            headerExt: '.hpp',
            sourceExt: '.cpp',
            language: 'cpp' as const,
        },
        {
            label: '$(file-code) .hxx / .cxx',
            description: 'Extended C++ extensions',
            detail: 'Less common but explicit C++ indicator.',
            headerExt: '.hxx',
            sourceExt: '.cxx',
            language: 'cpp' as const,
        },
    ];

    constructor(private readonly service: PairingRuleService) { }

    /**
     * Create rule choices from extension options for QuickPick display
     */
    private createRuleChoices(): RuleQuickPickItem[] {
        return PairingRuleUI.EXTENSION_OPTIONS.map(
            (option, index) => ({
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

    /**
     * Create advanced options separator and menu item for advanced management
     */
    private createAdvancedOptions(): ActionQuickPickItem[] {
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

    /**
     * Create advanced menu items based on current settings and available actions
     */
    private createAdvancedMenuItems(): ActionQuickPickItem[] {
        const items: ActionQuickPickItem[] = [
            {
                label: '$(edit) Edit Workspace Rules...',
                description: 'Opens .vscode/settings.json',
                key: 'edit_workspace',
            },
        ];

        if (this.service.hasCustomRules('workspace')) {
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
        },
            {
                label: '$(edit) Edit Global Rules...',
                description: 'Opens your global settings.json',
                key: 'edit_global',
            });

        if (this.service.hasCustomRules('user')) {
            items.push({
                label: '$(clear-all) Reset Global Rules',
                description: 'Use the extension default rules instead',
                key: 'reset_global',
            });
        }

        return items;
    }

    /**
     * Handle rule selection and ask for save scope (workspace or global)
     */
    private async handleRuleSelection(rule: PairingRule): Promise<void> {
        const selection = await vscode.window.showQuickPick(
            [
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
            ],
            {
                placeHolder: 'Where would you like to save this rule?',
                title: 'Save Configuration Scope',
            });

        if (!selection) { return; }

        const scope = selection.scope as 'workspace' | 'user';
        const existingRules = this.service.getRules(scope) || [];
        const otherLanguageRules = existingRules.filter(r => r.language !== rule.language);
        const newRules = [...otherLanguageRules, rule];

        await this.service.writeRules(newRules, scope);
        vscode.window.showInformationMessage(
            `Successfully set '${rule.label}' as the default extension for the ${selection.scope}.`
        );
    }

    /**
     * Handle advanced menu selection and execute the corresponding action
     */
    private async handleAdvancedMenuSelection(key: string): Promise<void> {
        const actions = {
            edit_workspace: () => vscode.commands.executeCommand(
                'workbench.action.openWorkspaceSettingsFile'),
            edit_global: () =>
                vscode.commands.executeCommand('workbench.action.openSettingsJson'),
            reset_workspace: async () => {
                await this.service.resetRules('workspace');
                vscode.window.showInformationMessage(
                    'Workspace pairing rules have been reset.');
            },
            reset_global: async () => {
                await this.service.resetRules('user');
                vscode.window.showInformationMessage(
                    'Global pairing rules have been reset.');
            },
        };

        const action = actions[key as keyof typeof actions];
        if (action) {
            await action();
        }
    }

    /**
     * Public method to prompt for file extensions only
     */
    async promptForFileExtensions(): Promise<{ headerExt: string, sourceExt: string } | undefined> {
        const selected = await vscode.window.showQuickPick(
            PairingRuleUI.EXTENSION_OPTIONS.map(option => ({
                label: option.label,
                description: option.description,
                detail: option.detail,
                headerExt: option.headerExt,
                sourceExt: option.sourceExt
            })),
            {
                placeHolder: 'Choose file extensions for your C++ files',
                title: 'Step 1 of 2: Select File Extensions',
                matchOnDescription: true,
                matchOnDetail: true
            });

        return selected
            ? { headerExt: selected.headerExt, sourceExt: selected.sourceExt }
            : undefined;
    }

    /**
     * Main configuration wizard - entry point for setting up pairing rules
     */
    async showConfigurationWizard(): Promise<void> {
        const workspaceRules = this.service.getRules('workspace') || [];
        const globalRules = this.service.getRules('user') || [];

        const cppWorkspaceRules = workspaceRules.filter(r => r.language === 'cpp');
        const cppGlobalRules = globalRules.filter(r => r.language === 'cpp');

        if (cppWorkspaceRules.length > 1) {
            const choice = await vscode.window.showWarningMessage(
                `Multiple C++ pairing rules were found in your workspace settings. This can cause unexpected behavior.`,
                { modal: false },
                'Clear and Reconfigure',
                'Cancel'
            );

            if (choice === 'Clear and Reconfigure') {
                await this.service.resetRules('workspace');
                await new Promise(resolve => setTimeout(resolve, 100));
                await this.showConfigurationWizard();
            }
            return;
        }

        if (cppGlobalRules.length > 1) {
            const choice = await vscode.window.showWarningMessage(
                `Multiple C++ pairing rules were found in your global settings. This can cause unexpected behavior.`,
                { modal: false },
                'Clear and Reconfigure',
                'Cancel'
            );

            if (choice === 'Clear and Reconfigure') {
                await this.service.resetRules('user');
                await new Promise(resolve => setTimeout(resolve, 100));
                await this.showConfigurationWizard();
            }
            return;
        }

        // If a workspace rule exists, it overrides the global one. This is a valid state.
        // Inform the user and proceed with the wizard.
        if (cppWorkspaceRules.length === 1 && cppGlobalRules.length === 1) {
            vscode.window.showInformationMessage(
                'A workspace-specific C++ rule is active and overrides the global setting.'
            );
        }

        const quickPick =
            vscode.window.createQuickPick<RuleQuickPickItem | ActionQuickPickItem>();
        quickPick.title = 'Quick Setup: Choose File Extensions';
        quickPick.placeholder =
            'Choose file extension combination for this workspace, or go to advanced options.';
        quickPick.items = [
            ...this.createRuleChoices(),
            {
                label: '$(add) Create New Custom Rule...',
                key: 'create_custom_rule',
                description: 'Define your own header/source extension pair',
                detail: 'Manually enter your desired header and source file extensions.'
            },
            ...this.createAdvancedOptions()
        ];

        quickPick.onDidChangeSelection(async (selection) => {
            if (!selection[0]) { return; }
            quickPick.hide();

            const item = selection[0];
            if ('rule' in item) {
                await this.handleRuleSelection(item.rule);
            } else if (item.key === 'advanced_options') {
                await this.showAdvancedManagementMenu();
            } else if (item.key === 'create_custom_rule') {
                await this.createCustomRules('cpp');
            }
        });

        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();
    }
    /**
     * Advanced management menu for editing and resetting pairing rules
     */
    async showAdvancedManagementMenu(): Promise<void> {
        const selection = await vscode.window.showQuickPick(
            this.createAdvancedMenuItems(), {
            title: 'Advanced Rule Management',
        });

        if (selection?.key) {
            await this.handleAdvancedMenuSelection(selection.key);
        }
    }

    /**
     * Guides the user through creating custom pairing rules for C++
     * Offers common extension combinations or allows custom input
     * Saves the rule to workspace or global settings
     * Returns the created custom rule or undefined if cancelled
     */
    public async createCustomRules(language: 'c' |
        'cpp'): Promise<PairingRule | undefined> {
        if (language === 'c') { return undefined; }

        const validateExt = (text: string) =>
            (!text || !text.startsWith('.') || text.length < 2)
                ? 'Please enter a valid file extension starting with a dot (e.g., .h)'
                : null;

        const headerExt = await vscode.window.showInputBox({
            prompt: 'Enter header file extension (e.g., .h, .hh, .hpp)',
            placeHolder: '.h',
            value: '', // Ensure the input box is empty initially
            validateInput: validateExt
        }) || '';

        if (!headerExt) { return undefined; }

        const sourceExt = await vscode.window.showInputBox({
            prompt: 'Enter source file extension for C++ (e.g., .cpp, .cc, .cxx)',
            placeHolder: '.cpp',
            value: '', // Ensure the input box is empty initially
            validateInput: validateExt
        }) || '';

        if (!sourceExt) { return undefined; }

        const customRule: PairingRule = {
            key: `custom_cpp_${Date.now()}`,
            label: `$(new-file) C++ Pair (${headerExt}/${sourceExt})`,
            description:
                `Creates a ${headerExt}/${sourceExt} file pair with header guards.`,
            language: 'cpp',
            headerExt,
            sourceExt
        };

        const saveLocation = await vscode.window.showQuickPick(
            [
                {
                    label: 'Workspace Settings',
                    description: 'Save to current workspace only',
                    value: 'workspace'
                },
                {
                    label: 'Global Settings',
                    description: 'Save to user settings (available in all workspaces)',
                    value: 'user'
                }
            ],
            {
                placeHolder: 'Where would you like to save this custom rule?',
                title: 'Save Location'
            });

        if (!saveLocation) { return undefined; }

        const saveRule = ErrorHandler.wrapAsync(async () => {
            const scope = saveLocation.value as 'workspace' | 'user';
            const existingRules = this.service.getRules(scope) || [];
            const otherLanguageRules = existingRules.filter(r => r.language !== customRule.language);
            const newRules = [...otherLanguageRules, customRule];

            await this.service.writeRules(newRules, scope);

            const locationText =
                saveLocation.value === 'workspace' ? 'workspace' : 'global';
            vscode.window.showInformationMessage(
                `Custom pairing rule saved to ${locationText} settings.`);

            return customRule;
        }, {
            operation: 'saveCustomRule',
            module: 'PairingRuleUI',
            showToUser: true
        });

        try {
            return await saveRule();
        } catch {
            return undefined;
        }
    }
}
