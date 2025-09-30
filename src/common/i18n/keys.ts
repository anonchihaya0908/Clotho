/**
 * 国际化翻译键常量
 * 
 * 使用分层命名规范: {category}.{subcategory}.{identifier}.{field}
 */

/**
 * 翻译键命名空间
 */
export const I18nKeys = {
    // ========== 错误消息 ==========
    error: {
        // 文件操作错误
        noActiveEditor: 'error.noActiveEditor',
        invalidFileType: 'error.invalidFileType',
        noTargetDirectory: 'error.noTargetDirectory',
        fileExists: 'error.fileExists',
        noFilesFound: 'error.noFilesFound',
        switchFailed: 'error.switchFailed',
        unexpectedError: 'error.unexpectedError',
        clangdNotFound: 'error.clangdNotFound',
        clangdNotRunning: 'error.clangdNotRunning',
        globalSearchFailed: 'error.globalSearchFailed',

        // 验证错误
        invalidIdentifier: 'error.invalidIdentifier',
        invalidExtension: 'error.invalidExtension',

        // 配置错误
        noWorkspaceFolder: 'error.noWorkspaceFolder',
        invalidConfiguration: 'error.invalidConfiguration',
        multipleRulesFound: 'error.multipleRulesFound',

        // Visual editor错误
        cannotOpenPreview: 'error.cannotOpenPreview',
        operationFailed: 'error.operationFailed',
    },

    // ========== 警告消息 ==========
    warning: {
        fileAlreadyExists: 'warning.fileAlreadyExists',
        invalidFileType: 'warning.invalidFileType',
        unsavedChanges: 'warning.unsavedChanges',
        languageMismatch: 'warning.languageMismatch',
        multipleRulesWorkspace: 'warning.multipleRulesWorkspace',
        multipleRulesGlobal: 'warning.multipleRulesGlobal',
        recoveryFailed: 'warning.recoveryFailed',
        workspaceRuleOverride: 'warning.workspaceRuleOverride',
    },

    // ========== 成功/信息消息 ==========
    success: {
        ruleSaved: 'success.ruleSaved',
        rulesReset: 'success.rulesReset',
        configApplied: 'success.configApplied',
        filesCreated: 'success.filesCreated',
        configSaved: 'success.configSaved',
        ruleSetAsDefault: 'success.ruleSetAsDefault',
        configSavedToWorkspace: 'success.configSavedToWorkspace',
        workspaceRulesReset: 'success.workspaceRulesReset',
        globalRulesReset: 'success.globalRulesReset',
    },

    // ========== UI QuickPick 选项 ==========
    ui: {
        // 按钮
        button: {
            save: 'ui.button.save',
            import: 'ui.button.import',
            export: 'ui.button.export',
            confirm: 'ui.button.confirm',
            cancel: 'ui.button.cancel',
            create: 'ui.button.create',
            continue: 'ui.button.continue',
            clearAndReconfigure: 'ui.button.clearAndReconfigure',
            saveToWorkspace: 'ui.button.saveToWorkspace',
            notNow: 'ui.button.notNow',
            saveConfiguration: 'ui.button.saveConfiguration',
            useOnceOnly: 'ui.button.useOnceOnly',
        },

        // QuickPick 标题和占位符
        quickPick: {
            // Header guard选择
            selectHeaderGuardStyle: 'ui.quickPick.selectHeaderGuardStyle',
            headerGuardTitle: 'ui.quickPick.headerGuardTitle',
            headerGuardConfigTitle: 'ui.quickPick.headerGuardConfigTitle',

            // 文件扩展名选择
            selectExtensionPair: 'ui.quickPick.selectExtensionPair',
            selectFile: 'ui.quickPick.selectFile',
            chooseFileExtensions: 'ui.quickPick.chooseFileExtensions',
            extensionStepTitle: 'ui.quickPick.extensionStepTitle',

            // Pairing rule选择
            selectPairingRule: 'ui.quickPick.selectPairingRule',
            customRulesAvailable: 'ui.quickPick.customRulesAvailable',
            createSourceHeaderPair: 'ui.quickPick.createSourceHeaderPair',
            saveLocation: 'ui.quickPick.saveLocation',
            saveScope: 'ui.quickPick.saveScope',
            selectWorkspaceFolder: 'ui.quickPick.selectWorkspaceFolder',
            selectCorrespondingFile: 'ui.quickPick.selectCorrespondingFile',

            // 文件名输入
            enterFileName: 'ui.quickPick.enterFileName',
            enterClassName: 'ui.quickPick.enterClassName',
            enterStructName: 'ui.quickPick.enterStructName',
            enterBaseName: 'ui.quickPick.enterBaseName',

            // 高级选项
            advancedManagement: 'ui.quickPick.advancedManagement',
            quickSetup: 'ui.quickPick.quickSetup',
        },

        // 状态栏
        statusBar: {
            formatSuccess: 'ui.statusBar.formatSuccess',
            ready: 'ui.statusBar.ready',
        },

        // Header Guard 样式
        headerGuard: {
            pragmaOnce: {
                label: 'ui.headerGuard.pragmaOnce.label',
                description: 'ui.headerGuard.pragmaOnce.description',
                detail: 'ui.headerGuard.pragmaOnce.detail',
            },
            ifndef: {
                label: 'ui.headerGuard.ifndef.label',
                description: 'ui.headerGuard.ifndef.description',
                detail: 'ui.headerGuard.ifndef.detail',
            },
        },

        // 扩展名选项
        extension: {
            hCpp: {
                label: 'ui.extension.hCpp.label',
                description: 'ui.extension.hCpp.description',
                detail: 'ui.extension.hCpp.detail',
            },
            hhCc: {
                label: 'ui.extension.hhCc.label',
                description: 'ui.extension.hhCc.description',
                detail: 'ui.extension.hhCc.detail',
            },
            hppCpp: {
                label: 'ui.extension.hppCpp.label',
                description: 'ui.extension.hppCpp.description',
                detail: 'ui.extension.hppCpp.detail',
            },
            hxxCxx: {
                label: 'ui.extension.hxxCxx.label',
                description: 'ui.extension.hxxCxx.description',
                detail: 'ui.extension.hxxCxx.detail',
            },
        },

        // 保存位置
        saveLocation: {
            workspace: {
                label: 'ui.saveLocation.workspace.label',
                description: 'ui.saveLocation.workspace.description',
            },
            global: {
                label: 'ui.saveLocation.global.label',
                description: 'ui.saveLocation.global.description',
            },
        },

        // 模板选项描述
        template: {
            categoryClass: 'ui.template.categoryClass',
            categoryStruct: 'ui.template.categoryStruct',
            categoryEmpty: 'ui.template.categoryEmpty',
            customConfiguration: 'ui.template.customConfiguration',
            builtinTemplate: 'ui.template.builtinTemplate',
            alternativeTemplate: 'ui.template.alternativeTemplate',
            useDefaultTemplates: {
                label: 'ui.template.useDefaultTemplates.label',
                description: 'ui.template.useDefaultTemplates.description',
                detail: 'ui.template.useDefaultTemplates.detail',
            },
            createCustomRule: {
                label: 'ui.template.createCustomRule.label',
                description: 'ui.template.createCustomRule.description',
                detail: 'ui.template.createCustomRule.detail',
            },
        },

        // 高级管理选项
        advanced: {
            editWorkspace: {
                label: 'ui.advanced.editWorkspace.label',
                description: 'ui.advanced.editWorkspace.description',
            },
            resetWorkspace: {
                label: 'ui.advanced.resetWorkspace.label',
                description: 'ui.advanced.resetWorkspace.description',
            },
            editGlobal: {
                label: 'ui.advanced.editGlobal.label',
                description: 'ui.advanced.editGlobal.description',
            },
            resetGlobal: {
                label: 'ui.advanced.resetGlobal.label',
                description: 'ui.advanced.resetGlobal.description',
            },
            advancedOptions: {
                label: 'ui.advanced.advancedOptions.label',
                description: 'ui.advanced.advancedOptions.description',
            },
        },

        // 输入验证提示
        validation: {
            invalidIdentifier: 'ui.validation.invalidIdentifier',
            invalidExtensionFormat: 'ui.validation.invalidExtensionFormat',
        },

        // 提示信息
        prompt: {
            enterHeaderExtension: 'ui.prompt.enterHeaderExtension',
            enterSourceExtension: 'ui.prompt.enterSourceExtension',
            whereToSave: 'ui.prompt.whereToSave',
            selectTemplateType: 'ui.prompt.selectTemplateType',
            saveCompleteConfig: 'ui.prompt.saveCompleteConfig',
            configUsage: 'ui.prompt.configUsage',
            filesCreatedSaveConfig: 'ui.prompt.filesCreatedSaveConfig',
        },

        // Switch相关消息
        switch: {
            noFilesFound: 'ui.switch.noFilesFound',
            multipleFilesFound: 'ui.switch.multipleFilesFound',
        },
    },

    // ========== clang-format 配置项 ==========
    clangFormat: {
        option: {
            // 动态生成: clangFormat.option.{key}.{name|description|previewTemplate}
        },
    },

    // ========== 命令 (package.json) ==========
    command: {
        switchHeaderSource: {
            title: 'command.switchHeaderSource.title',
        },
        createSourceHeaderPair: {
            title: 'command.createSourceHeaderPair.title',
        },
        managePairingRules: {
            title: 'command.managePairingRules.title',
        },
        openClangFormatEditor: {
            title: 'command.openClangFormatEditor.title',
        },
    },

    // ========== 配置项描述 (package.json) ==========
    config: {
        pairingRules: {
            description: 'config.pairingRules.description',
        },
        defaultHeaderGuardStyle: {
            description: 'config.defaultHeaderGuardStyle.description',
        },
    },
} as const;

/**
 * 翻译键类型
 */
export type I18nKey = typeof I18nKeys;
