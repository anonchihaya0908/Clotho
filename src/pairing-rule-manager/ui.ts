/**
 * Pairing Rule UI
 * Handles all user interface interactions for pairing rule management
 */

import * as vscode from 'vscode';
import { PairingRule, PairingRuleService } from './service';

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

        await this.service.writeRules([rule], selection.scope as 'workspace' | 'user');
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
        const quickPick =
            vscode.window.createQuickPick<RuleQuickPickItem | ActionQuickPickItem>();
        quickPick.title = 'Quick Setup: Choose File Extensions';
        quickPick.placeholder =
            'Choose file extension combination for this workspace, or go to advanced options.';
        quickPick.items = [
            ...this.createRuleChoices(),
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
}
