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
        fileNotFound: 'error.fileNotFound',
        invalidExtension: 'error.invalidExtension',
        noWorkspaceFolder: 'error.noWorkspaceFolder',
        noActiveEditor: 'error.noActiveEditor',
        operationFailed: 'error.operationFailed',
        invalidConfiguration: 'error.invalidConfiguration',
    },

    // ========== 警告消息 ==========
    warning: {
        fileAlreadyExists: 'warning.fileAlreadyExists',
        invalidFileType: 'warning.invalidFileType',
        unsavedChanges: 'warning.unsavedChanges',
    },

    // ========== 信息消息 ==========
    info: {
        operationSuccess: 'info.operationSuccess',
        fileCreated: 'info.fileCreated',
        configImported: 'info.configImported',
        configExported: 'info.configExported',
        configSaved: 'info.configSaved',
    },

    // ========== UI 文本 ==========
    ui: {
        button: {
            save: 'ui.button.save',
            import: 'ui.button.import',
            export: 'ui.button.export',
            confirm: 'ui.button.confirm',
            cancel: 'ui.button.cancel',
            create: 'ui.button.create',
        },
        quickPick: {
            selectHeaderGuardStyle: 'ui.quickPick.selectHeaderGuardStyle',
            selectExtensionPair: 'ui.quickPick.selectExtensionPair',
            selectFile: 'ui.quickPick.selectFile',
        },
        statusBar: {
            formatSuccess: 'ui.statusBar.formatSuccess',
            ready: 'ui.statusBar.ready',
        },
        placeholder: {
            enterFileName: 'ui.placeholder.enterFileName',
            selectOption: 'ui.placeholder.selectOption',
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
