/**
 * Visual Editor Module
 * ===================
 *
 * 这个模块包含了各种可视化编辑器，用于编辑配置文件和设置。
 *
 * 架构设计:
 * - clang-format/: clang-format 配置的可视化编辑器
 * - 将来可以扩展: clangd/, clang-tidy/, 等其他工具的编辑器
 *
 * 每个子模块都遵循相同的模式:
 * - coordinator.ts: 管理 webview 和业务逻辑
 * - service.ts: 核心业务逻辑和文件操作
 * - types.ts: TypeScript 类型定义
 * - config-options.ts: 配置选项元数据
 */

// 导出 clang-format 编辑器
export * from "./clang-format";

// 为将来的扩展预留导出位置
// export * from './clangd';
// export * from './clang-tidy';
