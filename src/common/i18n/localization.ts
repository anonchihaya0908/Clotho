/**
 * 国际化 (i18n) 统一工具类
 * 
 * 基于 VS Code 官方 vscode.l10n API
 * 提供类型安全的翻译接口
 */

import * as vscode from 'vscode';

/**
 * 统一的国际化工具类
 */
export class Localization {
    // ========== 错误消息 ==========
    static readonly error = {
        noActiveEditor: (): string => vscode.l10n.t('error.noActiveEditor'),
        invalidFileType: (fileName: string): string => vscode.l10n.t('error.invalidFileType', fileName),
        noTargetDirectory: (): string => vscode.l10n.t('error.noTargetDirectory'),
        fileExists: (filePath: string): string => vscode.l10n.t('error.fileExists', filePath),
        noFilesFound: (fileName: string, fileType: string): string => vscode.l10n.t('error.noFilesFound', fileName, fileType),
        switchFailed: (error: string): string => vscode.l10n.t('error.switchFailed', error),
        unexpectedError: (): string => vscode.l10n.t('error.unexpectedError'),
        clangdNotFound: (): string => vscode.l10n.t('error.clangdNotFound'),
        clangdNotRunning: (): string => vscode.l10n.t('error.clangdNotRunning'),
        globalSearchFailed: (): string => vscode.l10n.t('error.globalSearchFailed'),
        invalidIdentifier: (): string => vscode.l10n.t('error.invalidIdentifier'),
        invalidExtension: (extension: string): string => vscode.l10n.t('error.invalidExtension', extension),
        noWorkspaceFolder: (): string => vscode.l10n.t('error.noWorkspaceFolder'),
        invalidConfiguration: (): string => vscode.l10n.t('error.invalidConfiguration'),
        multipleRulesFound: (): string => vscode.l10n.t('error.multipleRulesFound'),
        cannotOpenPreview: (): string => vscode.l10n.t('error.cannotOpenPreview'),
        operationFailed: (): string => vscode.l10n.t('error.operationFailed'),
    };

    // ========== 警告消息 ==========
    static readonly warning = {
        fileAlreadyExists: (fileName: string): string => vscode.l10n.t('warning.fileAlreadyExists', fileName),
        invalidFileType: (fileName: string): string => vscode.l10n.t('warning.invalidFileType', fileName),
        unsavedChanges: (): string => vscode.l10n.t('warning.unsavedChanges'),
        languageMismatch: (detectedLang: string, selectedLang: string): string => vscode.l10n.t('warning.languageMismatch', detectedLang, selectedLang),
        multipleRulesWorkspace: (): string => vscode.l10n.t('warning.multipleRulesWorkspace'),
        multipleRulesGlobal: (): string => vscode.l10n.t('warning.multipleRulesGlobal'),
        recoveryFailed: (): string => vscode.l10n.t('warning.recoveryFailed'),
        workspaceRuleOverride: (): string => vscode.l10n.t('warning.workspaceRuleOverride'),
    };

    // ========== 成功/信息消息 ==========
    static readonly success = {
        ruleSaved: (scope: string): string => vscode.l10n.t('success.ruleSaved', scope),
        rulesReset: (scope: string): string => vscode.l10n.t('success.rulesReset', scope),
        configApplied: (templateName: string): string => vscode.l10n.t('success.configApplied', templateName),
        filesCreated: (headerPath: string, sourcePath: string): string => vscode.l10n.t('success.filesCreated', headerPath, sourcePath),
        configSaved: (): string => vscode.l10n.t('success.configSaved'),
        ruleSetAsDefault: (ruleLabel: string, scope: string): string => vscode.l10n.t('success.ruleSetAsDefault', ruleLabel, scope),
        configSavedToWorkspace: (headerExt: string, sourceExt: string, guardStyle: string): string => vscode.l10n.t('success.configSavedToWorkspace', headerExt, sourceExt, guardStyle),
        workspaceRulesReset: (): string => vscode.l10n.t('success.workspaceRulesReset'),
        globalRulesReset: (): string => vscode.l10n.t('success.globalRulesReset'),
    };

    // ========== UI ==========
    static readonly ui = {
        button: {
            save: (): string => vscode.l10n.t('ui.button.save'),
            import: (): string => vscode.l10n.t('ui.button.import'),
            export: (): string => vscode.l10n.t('ui.button.export'),
            confirm: (): string => vscode.l10n.t('ui.button.confirm'),
            cancel: (): string => vscode.l10n.t('ui.button.cancel'),
            create: (): string => vscode.l10n.t('ui.button.create'),
            continue: (): string => vscode.l10n.t('ui.button.continue'),
            clearAndReconfigure: (): string => vscode.l10n.t('ui.button.clearAndReconfigure'),
            saveToWorkspace: (): string => vscode.l10n.t('ui.button.saveToWorkspace'),
            notNow: (): string => vscode.l10n.t('ui.button.notNow'),
            saveConfiguration: (): string => vscode.l10n.t('ui.button.saveConfiguration'),
            useOnceOnly: (): string => vscode.l10n.t('ui.button.useOnceOnly'),
        },
        quickPick: {
            selectHeaderGuardStyle: (): string => vscode.l10n.t('ui.quickPick.selectHeaderGuardStyle'),
            headerGuardTitle: (): string => vscode.l10n.t('ui.quickPick.headerGuardTitle'),
            headerGuardConfigTitle: (): string => vscode.l10n.t('ui.quickPick.headerGuardConfigTitle'),
            selectExtensionPair: (): string => vscode.l10n.t('ui.quickPick.selectExtensionPair'),
            selectFile: (): string => vscode.l10n.t('ui.quickPick.selectFile'),
            chooseFileExtensions: (): string => vscode.l10n.t('ui.quickPick.chooseFileExtensions'),
            extensionStepTitle: (): string => vscode.l10n.t('ui.quickPick.extensionStepTitle'),
            selectPairingRule: (language: string): string => vscode.l10n.t('ui.quickPick.selectPairingRule', language),
            customRulesAvailable: (): string => vscode.l10n.t('ui.quickPick.customRulesAvailable'),
            createSourceHeaderPair: (): string => vscode.l10n.t('ui.quickPick.createSourceHeaderPair'),
            saveLocation: (): string => vscode.l10n.t('ui.quickPick.saveLocation'),
            saveScope: (): string => vscode.l10n.t('ui.quickPick.saveScope'),
            selectWorkspaceFolder: (): string => vscode.l10n.t('ui.quickPick.selectWorkspaceFolder'),
            selectCorrespondingFile: (baseName: string, fileType: string): string => vscode.l10n.t('ui.quickPick.selectCorrespondingFile', baseName, fileType),
            enterFileName: (): string => vscode.l10n.t('ui.quickPick.enterFileName'),
            enterClassName: (): string => vscode.l10n.t('ui.quickPick.enterClassName'),
            enterStructName: (language: string): string => vscode.l10n.t('ui.quickPick.enterStructName', language),
            enterBaseName: (language: string): string => vscode.l10n.t('ui.quickPick.enterBaseName', language),
            advancedManagement: (): string => vscode.l10n.t('ui.quickPick.advancedManagement'),
            quickSetup: (): string => vscode.l10n.t('ui.quickPick.quickSetup'),
        },
        statusBar: {
            formatSuccess: (): string => vscode.l10n.t('ui.statusBar.formatSuccess'),
            ready: (): string => vscode.l10n.t('ui.statusBar.ready'),
        },
        headerGuard: {
            pragmaOnce: {
                label: (): string => vscode.l10n.t('ui.headerGuard.pragmaOnce.label'),
                description: (): string => vscode.l10n.t('ui.headerGuard.pragmaOnce.description'),
                detail: (): string => vscode.l10n.t('ui.headerGuard.pragmaOnce.detail'),
            },
            ifndef: {
                label: (): string => vscode.l10n.t('ui.headerGuard.ifndef.label'),
                description: (): string => vscode.l10n.t('ui.headerGuard.ifndef.description'),
                detail: (): string => vscode.l10n.t('ui.headerGuard.ifndef.detail'),
            },
        },
        extension: {
            hCpp: {
                label: (): string => vscode.l10n.t('ui.extension.hCpp.label'),
                description: (): string => vscode.l10n.t('ui.extension.hCpp.description'),
                detail: (): string => vscode.l10n.t('ui.extension.hCpp.detail'),
            },
            hhCc: {
                label: (): string => vscode.l10n.t('ui.extension.hhCc.label'),
                description: (): string => vscode.l10n.t('ui.extension.hhCc.description'),
                detail: (): string => vscode.l10n.t('ui.extension.hhCc.detail'),
            },
            hppCpp: {
                label: (): string => vscode.l10n.t('ui.extension.hppCpp.label'),
                description: (): string => vscode.l10n.t('ui.extension.hppCpp.description'),
                detail: (): string => vscode.l10n.t('ui.extension.hppCpp.detail'),
            },
            hxxCxx: {
                label: (): string => vscode.l10n.t('ui.extension.hxxCxx.label'),
                description: (): string => vscode.l10n.t('ui.extension.hxxCxx.description'),
                detail: (): string => vscode.l10n.t('ui.extension.hxxCxx.detail'),
            },
        },
        saveLocation: {
            workspace: {
                label: (): string => vscode.l10n.t('ui.saveLocation.workspace.label'),
                description: (): string => vscode.l10n.t('ui.saveLocation.workspace.description'),
            },
            global: {
                label: (): string => vscode.l10n.t('ui.saveLocation.global.label'),
                description: (): string => vscode.l10n.t('ui.saveLocation.global.description'),
            },
        },
        template: {
            categoryClass: (): string => vscode.l10n.t('ui.template.categoryClass'),
            categoryStruct: (): string => vscode.l10n.t('ui.template.categoryStruct'),
            categoryEmpty: (language: string): string => vscode.l10n.t('ui.template.categoryEmpty', language),
            customConfiguration: (): string => vscode.l10n.t('ui.template.customConfiguration'),
            builtinTemplate: (): string => vscode.l10n.t('ui.template.builtinTemplate'),
            alternativeTemplate: (language: string): string => vscode.l10n.t('ui.template.alternativeTemplate', language),
            useDefaultTemplates: {
                label: (): string => vscode.l10n.t('ui.template.useDefaultTemplates.label'),
                description: (): string => vscode.l10n.t('ui.template.useDefaultTemplates.description'),
                detail: (): string => vscode.l10n.t('ui.template.useDefaultTemplates.detail'),
            },
            createCustomRule: {
                label: (): string => vscode.l10n.t('ui.template.createCustomRule.label'),
                description: (): string => vscode.l10n.t('ui.template.createCustomRule.description'),
                detail: (): string => vscode.l10n.t('ui.template.createCustomRule.detail'),
            },
        },
        advanced: {
            editWorkspace: {
                label: (): string => vscode.l10n.t('ui.advanced.editWorkspace.label'),
                description: (): string => vscode.l10n.t('ui.advanced.editWorkspace.description'),
            },
            resetWorkspace: {
                label: (): string => vscode.l10n.t('ui.advanced.resetWorkspace.label'),
                description: (): string => vscode.l10n.t('ui.advanced.resetWorkspace.description'),
            },
            editGlobal: {
                label: (): string => vscode.l10n.t('ui.advanced.editGlobal.label'),
                description: (): string => vscode.l10n.t('ui.advanced.editGlobal.description'),
            },
            resetGlobal: {
                label: (): string => vscode.l10n.t('ui.advanced.resetGlobal.label'),
                description: (): string => vscode.l10n.t('ui.advanced.resetGlobal.description'),
            },
            advancedOptions: {
                label: (): string => vscode.l10n.t('ui.advanced.advancedOptions.label'),
                description: (): string => vscode.l10n.t('ui.advanced.advancedOptions.description'),
            },
        },
        validation: {
            invalidIdentifier: (): string => vscode.l10n.t('ui.validation.invalidIdentifier'),
            invalidExtensionFormat: (): string => vscode.l10n.t('ui.validation.invalidExtensionFormat'),
        },
        prompt: {
            enterHeaderExtension: (): string => vscode.l10n.t('ui.prompt.enterHeaderExtension'),
            enterSourceExtension: (): string => vscode.l10n.t('ui.prompt.enterSourceExtension'),
            whereToSave: (): string => vscode.l10n.t('ui.prompt.whereToSave'),
            selectTemplateType: (): string => vscode.l10n.t('ui.prompt.selectTemplateType'),
            saveCompleteConfig: (headerExt: string, sourceExt: string, guardStyle: string): string => vscode.l10n.t('ui.prompt.saveCompleteConfig', headerExt, sourceExt, guardStyle),
            configUsage: (headerExt: string, sourceExt: string, guardText: string): string => vscode.l10n.t('ui.prompt.configUsage', headerExt, sourceExt, guardText),
            filesCreatedSaveConfig: (headerExt: string, sourceExt: string, guardText: string): string => vscode.l10n.t('ui.prompt.filesCreatedSaveConfig', headerExt, sourceExt, guardText),
        },
        switch: {
            noFilesFound: (currentFileName: string, fileType: string): string => vscode.l10n.t('ui.switch.noFilesFound', currentFileName, fileType),
            multipleFilesFound: (baseName: string, fileType: string): string => vscode.l10n.t('ui.switch.multipleFilesFound', baseName, fileType),
        },
    };

    // ========== clang-format ==========
    static readonly clangFormat = {
        option: {
            getName: (key: string): string => vscode.l10n.t(`clangFormat.option.${key}.name`),
            getDescription: (key: string): string => vscode.l10n.t(`clangFormat.option.${key}.description`),
            getPreviewTemplate: (key: string): string => vscode.l10n.t(`clangFormat.option.${key}.previewTemplate`),
        },
    };
}

/**
 * 简短别名
 */
export const L = Localization;
