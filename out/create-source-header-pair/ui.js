"use strict";
//
// PAIR CREATOR UI
// ===============
//
// User interface layer for file pair creation functionality.
// Handles all user interactions, input validation, dialogs,
// and template selection.
//
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
exports.PairCreatorUI = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const pairing_rule_manager_1 = require("../pairing-rule-manager");
const templates_1 = require("./templates");
// This type clearly expresses three distinct user intents:
// - 'rule': User selected a specific pairing rule and it should be used
// - 'use_default': User explicitly chose to use default templates and should
// proceed to the default template selection flow
// - 'cancelled': User pressed ESC to cancel and the entire flow should be
// terminated
// PairCreatorUI handles all user interface interactions for file pair creation.
// It manages dialogs, input validation, and user choices.
class PairCreatorUI {
    constructor(service) { this.service = service; }
    adaptRuleForTemplateDisplay(rule) {
        const categoryDesc = rule.isClass ? 'Includes constructor, destructor, and basic structure'
            : rule.isStruct
                ? 'Simple data structure with member variables'
                : `Basic ${rule.language.toUpperCase()} file pair with header guards`;
        return { ...rule, description: categoryDesc, detail: rule.description };
    }
    // Converts a PairingRule to a QuickPickItem for custom rules selection
    adaptRuleForCustomRulesDisplay(rule, category) {
        const categoryMap = {
            custom: 'Custom configuration for this workspace',
            builtin: 'Built-in template with custom extensions',
            alternative: `Alternative ${rule.language.toUpperCase()} template option`
        };
        return {
            ...rule,
            description: categoryMap[category],
            detail: rule.description
        };
    }
    // Creates the special "Use Default Templates" option
    createUseDefaultOption() {
        return {
            key: 'use_default',
            label: '$(list-unordered) Use Default Templates',
            description: 'Ignore custom settings and use built-in defaults',
            detail: 'Standard .h/.cpp extensions',
            isSpecial: true
        };
    }
    // Gets custom rules for the specified language
    getCustomRulesForLanguage(allRules, language) {
        return allRules.filter((rule) => rule.language === language);
    }
    // Gets adapted built-in templates with custom extensions
    getAdaptedBuiltinTemplates(customRules, language) {
        const customExt = customRules.length > 0 ? customRules[0] : null;
        if (customExt && language === 'cpp') {
            return templates_1.TEMPLATE_RULES
                .filter(template => template.language === 'cpp' &&
                !customRules.some(customRule => customRule.isClass === template.isClass &&
                    customRule.isStruct === template.isStruct &&
                    (customRule.isClass || customRule.isStruct ||
                        (!customRule.isClass && !customRule.isStruct &&
                            !template.isClass && !template.isStruct))))
                .map(template => ({
                ...template,
                key: `${template.key}_adapted`,
                headerExt: customExt.headerExt,
                sourceExt: customExt.sourceExt,
                description: template.description
                    .replace(/Header\/Source/g, `${customExt.headerExt}/${customExt.sourceExt}`)
                    .replace(/\.h\/\.cpp/g, `${customExt.headerExt}/${customExt.sourceExt}`)
                    .replace(/basic \.h\/\.cpp/g, `basic ${customExt.headerExt}/${customExt.sourceExt}`)
                    .replace(/Creates a \.h\/\.cpp/g, `Creates a ${customExt.headerExt}/${customExt.sourceExt}`)
            }));
        }
        else {
            return templates_1.TEMPLATE_RULES
                .filter(template => template.language === language &&
                !customRules.some(customRule => customRule.headerExt === template.headerExt &&
                    customRule.sourceExt === template.sourceExt &&
                    customRule.isClass === template.isClass &&
                    customRule.isStruct === template.isStruct))
                .map(template => this.adaptRuleForDisplay(template));
        }
    }
    // Gets cross-language template options
    getCrossLanguageTemplates(language) {
        return templates_1.TEMPLATE_RULES.filter(template => template.language !== language)
            .map(template => this.adaptRuleForDisplay(template));
    }
    // Cleans up custom rules with proper labels and descriptions
    cleanCustomRules(rules) {
        return rules.map(rule => ({
            ...rule,
            label: rule.label.includes('$(')
                ? rule.label
                : `$(new-file) ${rule.language === 'cpp' ? 'C++' : 'C'} Pair (${rule.headerExt}/${rule.sourceExt})`,
            description: rule.description.startsWith('Creates a')
                ? rule.description
                : `Creates a ${rule.headerExt}/${rule.sourceExt} file pair with header guards.`
        }));
    }
    // Gets placeholder name for input dialog, considering active file context
    getPlaceholder(rule) {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor?.document && !activeEditor.document.isUntitled) {
            const fileName = path.basename(activeEditor.document.fileName, path.extname(activeEditor.document.fileName));
            return rule.language === 'c' ? fileName
                : this.service.toPascalCase(fileName);
        }
        return this.service.getDefaultPlaceholder(rule);
    }
    // Checks if language mismatch warning should be shown with UI context
    async shouldShowLanguageMismatchWarning(language, result) {
        const activeEditor = vscode.window.activeTextEditor;
        const currentDir = activeEditor?.document && !activeEditor.document.isUntitled
            ? path.dirname(activeEditor.document.uri.fsPath)
            : undefined;
        const activeFilePath = activeEditor?.document && !activeEditor.document.isUntitled
            ? activeEditor.document.uri.fsPath
            : undefined;
        return this.service.shouldShowLanguageMismatchWarning(language, result, currentDir, activeFilePath);
    }
    // Adapts template rules for display in UI based on custom extensions
    adaptRuleForDisplay(rule) {
        if (rule.language !== 'cpp') {
            return rule;
        }
        const customExtensions = this.service.getCustomCppExtensions();
        if (!customExtensions) {
            return rule;
        }
        const { headerExt, sourceExt } = customExtensions;
        // Adapt description for display
        const replacementPattern = /Header\/Source|\.h(?:h|pp|xx)?\/\.c(?:pp|c|xx)?/g;
        const newDescription = rule.description.replace(replacementPattern, `${headerExt}/${sourceExt}`);
        return { ...rule, description: newDescription, headerExt, sourceExt };
    }
    // Prepares template choices for UI display with proper ordering and
    // adaptation
    prepareTemplateChoices(language, uncertain) {
        const desiredOrder = uncertain
            ? ['cpp_empty', 'c_empty', 'cpp_class', 'cpp_struct', 'c_struct']
            : language === 'c'
                ? ['c_empty', 'c_struct', 'cpp_empty', 'cpp_class', 'cpp_struct']
                : ['cpp_empty', 'cpp_class', 'cpp_struct', 'c_empty', 'c_struct'];
        return [...templates_1.TEMPLATE_RULES]
            .sort((a, b) => desiredOrder.indexOf(a.key) - desiredOrder.indexOf(b.key))
            .map(rule => this.adaptRuleForDisplay(rule));
    }
    // Simplified function that delegates to smaller, focused functions
    prepareCustomRulesChoices(allRules, language) {
        const languageRules = this.getCustomRulesForLanguage(allRules, language);
        const adaptedDefaultTemplates = this.getAdaptedBuiltinTemplates(languageRules, language);
        const otherLanguageTemplates = this.getCrossLanguageTemplates(language);
        const cleanedCustomRules = this.cleanCustomRules(allRules);
        return {
            languageRules,
            adaptedDefaultTemplates,
            otherLanguageTemplates,
            cleanedCustomRules
        };
    }
    // - Returns 'cancelled' if the user presses ESC to cancel, and the operation
    // should be terminated
    // - Returns 'use_default' if the user selects "Use Default Templates", and
    // should proceed to the default template flow
    // - Returns 'rule' if the user selects a specific rule, and that rule should
    // be used directly
    async selectFromCustomRules(allRules, language) {
        const { cleanedCustomRules, adaptedDefaultTemplates, otherLanguageTemplates } = this.prepareCustomRulesChoices(allRules, language);
        // Use adapters to create consistent UI items
        const choices = [
            ...cleanedCustomRules.map(rule => this.adaptRuleForCustomRulesDisplay(rule, 'custom')),
            ...adaptedDefaultTemplates.map(rule => this.adaptRuleForCustomRulesDisplay(rule, 'builtin')),
            ...otherLanguageTemplates.map(rule => this.adaptRuleForCustomRulesDisplay(rule, 'alternative')),
            this.createUseDefaultOption()
        ];
        const result = await vscode.window.showQuickPick(choices, {
            placeHolder: `Select a ${language.toUpperCase()} pairing rule`,
            title: 'Custom Pairing Rules Available',
            matchOnDescription: true,
            matchOnDetail: true
        });
        if (!result)
            return { type: 'cancelled' }; // User pressed ESC or cancelled
        if ('isSpecial' in result && result.isSpecial)
            return { type: 'use_default' }; // User chose "Use Default Templates"
        return {
            type: 'rule',
            rule: result
        }; // User selected a specific rule
    }
    // Shows a dialog offering to create custom pairing rules for C++.
    // Only applicable for C++ since C uses standard .c/.h extensions.
    // Returns true to create rules, false to dismiss, or null if cancelled.
    async offerToCreateCustomRules(language) {
        if (language === 'c')
            return false;
        const result = await vscode.window.showInformationMessage(`No custom pairing rules found for C++. Would you like to create custom rules to use different file extensions (e.g., .cc/.hh instead of .cpp/.h)?`, { modal: false }, 'Create Custom Rules', 'Dismiss');
        return result === 'Create Custom Rules' ? true
            : result === 'Dismiss' ? false
                : null;
    }
    // Guides the user through creating custom pairing rules for C++
    // Offers common extension combinations or allows custom input
    // Saves the rule to workspace or global settings
    // Returns the created custom rule or undefined if cancelled
    async createCustomRules(language) {
        if (language === 'c')
            return undefined;
        const commonExtensions = [
            { label: '.h / .cpp (Default)', headerExt: '.h', sourceExt: '.cpp' },
            { label: '.hh / .cc (Alternative)', headerExt: '.hh', sourceExt: '.cc' }, {
                label: '.hpp / .cpp (Header Plus Plus)',
                headerExt: '.hpp',
                sourceExt: '.cpp'
            },
            { label: '.hxx / .cxx (Extended)', headerExt: '.hxx', sourceExt: '.cxx' },
            { label: 'Custom Extensions', headerExt: '', sourceExt: '' }
        ];
        const selectedExtension = await vscode.window.showQuickPick(commonExtensions, {
            placeHolder: `Select file extensions for C++ files`,
            title: 'Choose File Extensions'
        });
        if (!selectedExtension)
            return undefined;
        let { headerExt, sourceExt } = selectedExtension;
        if (!headerExt || !sourceExt) {
            const validateExt = (text) => (!text || !text.startsWith('.') || text.length < 2)
                ? 'Please enter a valid file extension starting with a dot (e.g., .h)'
                : null;
            headerExt = await vscode.window.showInputBox({
                prompt: 'Enter header file extension (e.g., .h, .hh, .hpp)',
                placeHolder: '.h',
                validateInput: validateExt
            }) || '';
            if (!headerExt)
                return undefined;
            sourceExt = await vscode.window.showInputBox({
                prompt: `Enter source file extension for C++ (e.g., .cpp, .cc, .cxx)`,
                placeHolder: '.cpp',
                validateInput: validateExt
            }) || '';
            if (!sourceExt)
                return undefined;
        }
        const customRule = {
            key: `custom_cpp_${Date.now()}`,
            label: `$(new-file) C++ Pair (${headerExt}/${sourceExt})`,
            description: `Creates a ${headerExt}/${sourceExt} file pair with header guards.`,
            language: 'cpp',
            headerExt,
            sourceExt
        };
        const saveLocation = await vscode.window.showQuickPick([
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
        ], {
            placeHolder: 'Where would you like to save this custom rule?',
            title: 'Save Location'
        });
        if (!saveLocation)
            return undefined;
        try {
            const existingRules = pairing_rule_manager_1.PairingRuleService.getRules(saveLocation.value) ||
                [];
            await pairing_rule_manager_1.PairingRuleService.writeRules([...existingRules, customRule], saveLocation.value);
            const locationText = saveLocation.value === 'workspace' ? 'workspace' : 'global';
            vscode.window.showInformationMessage(`Custom pairing rule saved to ${locationText} settings.`);
            return customRule;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to save custom rule: ${errorMessage}`);
            return undefined;
        }
    }
    // Prompts the user to select a pairing rule from available options
    // IMPROVED FLOW:
    // 1. Check for existing custom rules first
    // 2. If no custom rules, show template choice (C/C++ types)
    // 3. If C++ selected, then choose extensions
    // 4. After successful creation, offer to save as default
    // Returns selected pairing rule or undefined if cancelled
    async promptForPairingRule(language, uncertain) {
        // First check if there are existing custom rules
        if (language === 'cpp') {
            const allRules = this.service.getAllPairingRules();
            const languageRules = allRules.filter((rule) => rule.language === language);
            if (languageRules.length > 0) {
                // Use existing flow for custom rules with clear intent handling
                const result = await this.selectFromCustomRules(allRules, language);
                if (result.type === 'cancelled')
                    return undefined; // 用户明确取消操作
                if (result.type === 'use_default') {
                    // 用户选择使用默认模板，继续到常规流程（不return，让代码继续执行）
                }
                else if (result.type === 'rule') {
                    return result.rule; // 用户选择了具体的自定义规则
                }
            }
        }
        // New improved flow: Choose template type first (C/C++ language and type)
        const templateChoice = await this.promptForTemplateTypeFirst(language, uncertain);
        if (!templateChoice)
            return undefined;
        // If C++ template was selected and no custom rules exist, ask for
        // extensions
        if (templateChoice.language === 'cpp') {
            const allRules = this.service.getAllPairingRules();
            const cppRules = allRules.filter((rule) => rule.language === 'cpp');
            if (cppRules.length === 0) {
                // No custom C++ rules, let user choose extensions
                const extensionChoice = await pairing_rule_manager_1.PairingRuleUI.promptForFileExtensions();
                if (!extensionChoice)
                    return undefined;
                // Apply the chosen extensions to the template
                return {
                    ...templateChoice,
                    key: `${templateChoice.key}_custom`,
                    headerExt: extensionChoice.headerExt,
                    sourceExt: extensionChoice.sourceExt,
                    description: templateChoice.description.replace(/\.h\/\.cpp/g, `${extensionChoice.headerExt}/${extensionChoice.sourceExt}`)
                };
            }
        }
        return templateChoice;
    }
    // Simplified template selection with adapter pattern
    async promptForTemplateTypeFirst(language, uncertain) {
        const choices = this.prepareTemplateChoices(language, uncertain);
        const enhancedChoices = choices.map(rule => this.adaptRuleForTemplateDisplay(rule));
        const result = await vscode.window.showQuickPick(enhancedChoices, {
            placeHolder: 'Please select the type of file pair to create.',
            title: 'Create Source/Header Pair',
            matchOnDescription: true,
            matchOnDetail: true
        });
        if (!result)
            return null; // User cancelled
        if (result && !uncertain && language !== result.language) {
            const shouldShowWarning = await this.shouldShowLanguageMismatchWarning(language, result);
            if (shouldShowWarning) {
                const detectedLangName = language === 'c' ? 'C' : 'C++';
                const selectedLangName = result.language === 'c' ? 'C' : 'C++';
                const shouldContinue = await vscode.window.showWarningMessage(`You're working in a ${detectedLangName} file but selected a ${selectedLangName} template. This may create files with incompatible extensions or content.`, 'Continue', 'Cancel');
                if (shouldContinue !== 'Continue')
                    return null;
            }
        }
        return result;
    }
    // Shows workspace folder picker when multiple folders are available
    async showWorkspaceFolderPicker() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length <= 1) {
            return undefined;
        }
        const selected = await vscode.window.showQuickPick(workspaceFolders.map(folder => ({
            label: folder.name,
            description: folder.uri.fsPath,
            folder: folder
        })), { placeHolder: 'Select workspace folder for new files' });
        return selected?.folder.uri;
    }
    // Prompts the user to enter a name for the new file pair
    // Validates input as a valid C/C++ identifier and provides
    // context-appropriate prompts Returns the entered file name or undefined if
    // cancelled
    async promptForFileName(rule) {
        const prompt = rule.isClass ? 'Please enter the name for the new C++ class.'
            : rule.isStruct
                ? `Please enter the name for the new ${rule.language.toUpperCase()} struct.`
                : `Please enter the base name for the new ${rule.language.toUpperCase()} file pair.`;
        return vscode.window.showInputBox({
            prompt,
            placeHolder: this.getPlaceholder(rule),
            validateInput: (text) => templates_1.VALIDATION_PATTERNS.IDENTIFIER.test(text?.trim() || '')
                ? null
                : 'Invalid C/C++ identifier.',
            title: 'Create Source/Header Pair'
        });
    }
    // Shows success message and opens the newly created header file
    async showSuccessAndOpenFile(headerPath, sourcePath) {
        try {
            const document = await vscode.workspace.openTextDocument(headerPath);
            // Use setTimeout to make this non-blocking and avoid hanging
            setTimeout(async () => {
                try {
                    await vscode.window.showTextDocument(document);
                }
                catch (error) {
                    // Silently handle file opening errors
                }
            }, 100);
            // Show success message with slight delay to allow other dialogs to appear
            setTimeout(() => {
                vscode.window.showInformationMessage(`Successfully created ${path.basename(headerPath.fsPath)} and ${path.basename(sourcePath.fsPath)}.`);
            }, 50);
        }
        catch (error) {
            // Still show success message even if file opening fails
            setTimeout(() => {
                vscode.window.showInformationMessage(`Successfully created ${path.basename(headerPath.fsPath)} and ${path.basename(sourcePath.fsPath)}.`);
            }, 50);
        }
    }
}
exports.PairCreatorUI = PairCreatorUI;
//# sourceMappingURL=ui.js.map