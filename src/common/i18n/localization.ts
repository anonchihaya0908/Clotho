/**
 * 国际化 (i18n) 统一工具类
 * 
 * 基于 VS Code 官方 vscode.l10n API
 * 提供类型安全的翻译接口
 * 
 * @example
 * ```typescript
 * import { Localization as L } from '@/common/i18n';
 * 
 * // 错误消息
 * vscode.window.showErrorMessage(
 *   L.error.fileNotFound('test.h', 'header')
 * );
 * 
 * // UI 文本
 * const saveButton = L.ui.button.save();
 * 
 * // clang-format 配置项
 * const optionName = L.clangFormat.option.getName('BasedOnStyle');
 * ```
 */

import * as vscode from 'vscode';
import { I18nKeys } from './keys';

/**
 * 统一的国际化工具类
 */
export class Localization {
    // ========== 错误消息 ==========
    static readonly error = {
        /**
         * 文件未找到错误
         * @param fileName 文件名
         * @param fileType 文件类型 (如 'header', 'source')
         * @returns 本地化的错误消息
         */
        fileNotFound: (fileName: string, fileType: string): string =>
            vscode.l10n.t(I18nKeys.error.fileNotFound, fileName, fileType),

        /**
         * 无效的文件扩展名
         * @param extension 扩展名
         */
        invalidExtension: (extension: string): string =>
            vscode.l10n.t(I18nKeys.error.invalidExtension, extension),

        /**
         * 无工作区文件夹
         */
        noWorkspaceFolder: (): string => vscode.l10n.t(I18nKeys.error.noWorkspaceFolder),

        /**
         * 无活动编辑器
         */
        noActiveEditor: (): string => vscode.l10n.t(I18nKeys.error.noActiveEditor),

        /**
         * 操作失败
         */
        operationFailed: (): string => vscode.l10n.t(I18nKeys.error.operationFailed),

        /**
         * 配置无效
         */
        invalidConfiguration: (): string => vscode.l10n.t(I18nKeys.error.invalidConfiguration),
    };

    // ========== 警告消息 ==========
    static readonly warning = {
        /**
         * 文件已存在警告
         * @param fileName 文件名
         */
        fileAlreadyExists: (fileName: string): string =>
            vscode.l10n.t(I18nKeys.warning.fileAlreadyExists, fileName),

        /**
         * 无效的文件类型
         */
        invalidFileType: (): string => vscode.l10n.t(I18nKeys.warning.invalidFileType),

        /**
         * 有未保存的更改
         */
        unsavedChanges: (): string => vscode.l10n.t(I18nKeys.warning.unsavedChanges),
    };

    // ========== 信息消息 ==========
    static readonly info = {
        /**
         * 操作成功
         */
        operationSuccess: (): string => vscode.l10n.t(I18nKeys.info.operationSuccess),

        /**
         * 文件已创建
         * @param fileName 文件名
         */
        fileCreated: (fileName: string): string =>
            vscode.l10n.t(I18nKeys.info.fileCreated, fileName),

        /**
         * 配置已导入
         */
        configImported: (): string => vscode.l10n.t(I18nKeys.info.configImported),

        /**
         * 配置已导出
         */
        configExported: (): string => vscode.l10n.t(I18nKeys.info.configExported),

        /**
         * 配置已保存
         */
        configSaved: (): string => vscode.l10n.t(I18nKeys.info.configSaved),
    };

    // ========== UI 文本 ==========
    static readonly ui = {
        button: {
            save: (): string => vscode.l10n.t(I18nKeys.ui.button.save),
            import: (): string => vscode.l10n.t(I18nKeys.ui.button.import),
            export: (): string => vscode.l10n.t(I18nKeys.ui.button.export),
            confirm: (): string => vscode.l10n.t(I18nKeys.ui.button.confirm),
            cancel: (): string => vscode.l10n.t(I18nKeys.ui.button.cancel),
            create: (): string => vscode.l10n.t(I18nKeys.ui.button.create),
        },

        quickPick: {
            selectHeaderGuardStyle: (): string =>
                vscode.l10n.t(I18nKeys.ui.quickPick.selectHeaderGuardStyle),

            selectExtensionPair: (): string =>
                vscode.l10n.t(I18nKeys.ui.quickPick.selectExtensionPair),

            selectFile: (): string => vscode.l10n.t(I18nKeys.ui.quickPick.selectFile),
        },

        statusBar: {
            formatSuccess: (): string => vscode.l10n.t(I18nKeys.ui.statusBar.formatSuccess),
            ready: (): string => vscode.l10n.t(I18nKeys.ui.statusBar.ready),
        },

        placeholder: {
            enterFileName: (): string => vscode.l10n.t(I18nKeys.ui.placeholder.enterFileName),
            selectOption: (): string => vscode.l10n.t(I18nKeys.ui.placeholder.selectOption),
        },
    };

    // ========== clang-format 配置项 ==========
    static readonly clangFormat = {
        option: {
            /**
             * 获取配置项的本地化名称
             * @param key 配置项键名 (如 'BasedOnStyle')
             * @returns 本地化的配置项名称
             * 
             * @example
             * ```typescript
             * const name = L.clangFormat.option.getName('BasedOnStyle');
             * // 英文: "Based On Style"
             * // 中文: "基础风格"
             * ```
             */
            getName: (key: string): string =>
                vscode.l10n.t(`clangFormat.option.${key}.name`),

            /**
             * 获取配置项的本地化描述
             * @param key 配置项键名
             * @returns 本地化的配置项描述
             */
            getDescription: (key: string): string =>
                vscode.l10n.t(`clangFormat.option.${key}.description`),

            /**
             * 获取配置项的预览模板
             * @param key 配置项键名
             * @returns 本地化的预览模板
             */
            getPreviewTemplate: (key: string): string =>
                vscode.l10n.t(`clangFormat.option.${key}.previewTemplate`),
        },
    };
}

/**
 * 简化的别名
 * @example
 * ```typescript
 * import { L } from '@/common/i18n';
 * 
 * L.error.fileNotFound('test.h', 'header');
 * ```
 */
export const L = Localization;
