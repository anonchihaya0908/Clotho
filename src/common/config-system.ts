/**
 *  配置系统
 * 提供标准化的配置接口
 *
 * 注意：本文件已清理未使用的接口和类
 * - 已删除：ConfigurableModule, TimerConfig, MonitorConfig（为已删除的 SimpleClangdMonitor 准备的）
 * - 已删除：ConfigValidator, ConfigFactory（从未被调用）
 * - 保留：EnhancedBaseConfig, UIConfig（Visual Editor 使用）, PathConfig
 */

// ===============================
// 核心配置接口（正在使用）
// ===============================

/**
 *  增强的基础配置接口
 * 所有模块配置的基础，提供通用的配置管理能力
 */
export interface EnhancedBaseConfig {
  /** 配置版本，用于迁移和兼容性 */
  readonly version?: string;
  /** 最后修改时间戳 */
  readonly lastModified?: number;
  /** 配置是否启用 */
  enabled?: boolean;
  /** 配置作用域 */
  scope?: 'workspace' | 'user' | 'global';
  /** 调试模式 */
  debug?: boolean;
}

/**
 *  UI配置接口
 * 为UI相关模块提供标准配置
 *
 * 使用场景：
 * - Visual Editor (ClangFormat可视化编辑器)
 */
export interface UIConfig extends EnhancedBaseConfig {
  /** 主题模式 */
  theme?: 'auto' | 'light' | 'dark';
  /** 动画启用 */
  animations?: boolean;
  /** 通知显示 */
  showNotifications?: boolean;
  /** 自动保存 */
  autoSave?: boolean;
}

/**
 *  路径配置接口
 * 为需要文件/目录路径的模块提供标准配置
 *
 * 使用场景：
 * - Switch Header/Source 配置
 * - 其他需要路径配置的功能
 */
export interface PathConfig extends EnhancedBaseConfig {
  /** 包含路径 */
  includePaths?: string[];
  /** 排除路径 */
  excludePaths?: string[];
  /** 工作目录 */
  workingDirectory?: string;
}

// ===============================
// 注意事项
// ===============================

/**
 * 历史遗留说明：
 *
 * 本文件曾包含以下已删除的组件：
 *
 * 1. ConfigurableModule<TConfig> - 模块配置接口（从未被实现）
 * 2. TimerConfig - 定时器配置（为已删除的监控器准备的）
 * 3. MonitorConfig - 监控配置（为已删除的 SimpleClangdMonitor 准备的）
 * 4. ConfigValidator - 配置验证器类（从未被调用）
 * 5. ConfigFactory - 配置工厂类（从未被调用）
 *
 * 如果将来需要配置验证功能，建议：
 * - 使用 Zod 或 Joi 等成熟的验证库
 * - 只在实际需要时添加验证逻辑
 * - 避免过度设计未使用的抽象层
 *
 * 如果需要工厂模式创建配置，建议：
 * - 在实际使用的地方直接创建默认配置对象
 * - 使用 TypeScript 的默认参数语法
 * - 避免为简单对象创建专门的工厂类
 */
