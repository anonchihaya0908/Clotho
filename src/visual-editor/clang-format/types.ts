/**
 * Types for Clang-Format Editor
 * @deprecated 这个文件将被逐步迁移到 src/common/types/
 * 请使用 src/common/types/ 中的统一类型定义
 */

// 重新导出统一类型定义，保持向后兼容
export {
    ClangFormatOption,
    ConfigCategories,
    WebviewMessageType,
    WebviewMessage,
    ConfigChangedMessage,
    ConfigLoadedMessage,
    PreviewUpdateMessage,
    ValidationMessage,
    SettingsMessage
} from '../../common/types';
