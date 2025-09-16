/**
 *  统一配置管理系统
 * 提供标准化的配置接口、验证和管理机制
 */

import * as vscode from 'vscode';
import { createModuleLogger } from '../logger/unified-logger';
import { ConfigValidationResult } from './types/core';

// ===============================
// 基础配置接口系统
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
 *  可配置的模块接口
 * 为需要定期配置的模块提供标准接口
 */
export interface ConfigurableModule<TConfig extends EnhancedBaseConfig> {
  /** 获取当前配置 */
  getConfig(): TConfig;
  /** 更新配置 */
  updateConfig(config: Partial<TConfig>): Promise<void>;
  /** 重置为默认配置 */
  resetConfig(): Promise<void>;
  /** 验证配置 */
  validateConfig(config: Partial<TConfig>): ConfigValidationResult;
}

/**
 * 定时器配置接口
 * 为需要定期更新的模块提供标准配置
 */
export interface TimerConfig extends EnhancedBaseConfig {
  /** 更新间隔（毫秒） */
  updateInterval?: number;
  /** 是否自动启动 */
  autoStart?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
}

/**
 *  UI配置接口
 * 为UI相关模块提供标准配置
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
 *  监控配置接口
 * 为监控模块提供标准配置
 */
export interface MonitorConfig extends TimerConfig {
  /** 警告阈值 */
  warningThreshold?: number;
  /** 错误阈值 */
  errorThreshold?: number;
  /** 显示详细信息 */
  showDetails?: boolean;
}

/**
 *  路径配置接口
 * 为需要文件/目录路径的模块提供标准配置
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
// 配置验证系统
// ===============================


/**
 *  配置验证器
 * 提供标准的配置验证逻辑
 */
export class ConfigValidator {
  /**
   * 验证基础配置
   */
  static validateBaseConfig(config: EnhancedBaseConfig): ConfigValidationResult {
    const result: ConfigValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // 验证版本格式
    if (config.version && !/^\d+\.\d+\.\d+$/.test(config.version)) {
      result.warnings.push('Invalid version format, expected semantic version (x.y.z)');
    }

    // 验证时间戳
    if (config.lastModified && config.lastModified > Date.now()) {
      result.warnings.push('lastModified timestamp is in the future');
    }

    // 验证作用域
    if (config.scope && !['workspace', 'user', 'global'].includes(config.scope)) {
      result.errors.push('Invalid scope, must be one of: workspace, user, global');
      result.isValid = false;
    }

    return result;
  }

  /**
   * 验证定时器配置
   */
  static validateTimerConfig(config: TimerConfig): ConfigValidationResult {
    const result = this.validateBaseConfig(config);

    // 验证更新间隔
    if (config.updateInterval !== undefined) {
      if (config.updateInterval < 100) {
        result.errors.push('updateInterval must be at least 100ms');
        result.isValid = false;
      } else if (config.updateInterval > 300000) { // 5 minutes
        result.warnings.push('updateInterval is very high (>5 minutes), may affect responsiveness');
      }
    }

    // 验证重试次数
    if (config.maxRetries !== undefined && config.maxRetries < 0) {
      result.errors.push('maxRetries cannot be negative');
      result.isValid = false;
    }

    return result;
  }

  /**
   * 验证监控配置
   */
  static validateMonitorConfig(config: MonitorConfig): ConfigValidationResult {
    const result = this.validateTimerConfig(config);

    // 验证阈值逻辑
    if (config.warningThreshold !== undefined && config.errorThreshold !== undefined) {
      if (config.warningThreshold >= config.errorThreshold) {
        result.errors.push('warningThreshold must be less than errorThreshold');
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * 验证路径配置
   */
  static validatePathConfig(config: PathConfig): ConfigValidationResult {
    const result = this.validateBaseConfig(config);

    // 验证路径存在性（异步操作，这里只做基本检查）
    const allPaths = [
      ...(config.includePaths || []),
      ...(config.excludePaths || []),
      ...(config.workingDirectory ? [config.workingDirectory] : []),
    ];

    for (const path of allPaths) {
      if (!path || typeof path !== 'string') {
        result.errors.push(`Invalid path: ${path}`);
        result.isValid = false;
      }
    }

    return result;
  }
}

// ===============================
// 配置管理器
// ===============================

/**
 *  统一配置管理器
 * 管理所有模块的配置，提供统一的接口
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private configCache = new Map<string, unknown>();
  private readonly configPrefix = 'clotho';

  private constructor() { }

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * 获取配置
   */
  getConfig<T extends EnhancedBaseConfig>(
    key: string,
    defaultConfig: T
  ): T {
    const cacheKey = `${this.configPrefix}.${key}`;

    // 检查缓存
    if (this.configCache.has(cacheKey)) {
      const cachedConfig = this.configCache.get(cacheKey) as Partial<T>;
      return { ...defaultConfig, ...(cachedConfig || {}) };
    }

    // 从VS Code配置中读取
    const config = vscode.workspace.getConfiguration(this.configPrefix);
    const userConfig = config.get<Partial<T>>(key, {});

    const finalConfig = {
      ...defaultConfig,
      ...userConfig,
      lastModified: Date.now(),
    };

    // 缓存配置
    this.configCache.set(cacheKey, finalConfig);

    return finalConfig;
  }

  /**
   * 更新配置
   */
  async updateConfig<T extends EnhancedBaseConfig>(
    key: string,
    config: Partial<T>,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace
  ): Promise<void> {
    const cacheKey = `${this.configPrefix}.${key}`;

    try {
      const vsConfig = vscode.workspace.getConfiguration(this.configPrefix);
      await vsConfig.update(key, config, target);

      // 更新缓存
      const currentConfig = this.configCache.get(cacheKey) || {};
      this.configCache.set(cacheKey, {
        ...currentConfig,
        ...config,
        lastModified: Date.now(),
      });

      logger.info(`Configuration updated for ${key}`, {
        module: 'ConfigurationManager',
        operation: 'updateConfig',
        key,
        target: vscode.ConfigurationTarget[target],
      });
    } catch (error) {
      logger.error(`Failed to update configuration for ${key}`, error as Error, {
        module: 'ConfigurationManager',
        operation: 'updateConfig',
        key,
      });
      throw error;
    }
  }

  /**
   * 验证并获取配置
   */
  getValidatedConfig<T extends EnhancedBaseConfig>(
    key: string,
    defaultConfig: T,
    validator: (config: T) => ConfigValidationResult
  ): { config: T; validation: ConfigValidationResult } {
    const config = this.getConfig(key, defaultConfig);
    const validation = validator(config);

    if (!validation.isValid) {
      logger.warn(`Configuration validation failed for ${key}`, {
        module: 'ConfigurationManager',
        operation: 'getValidatedConfig',
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    return { config, validation };
  }

  /**
   * 清除配置缓存
   */
  clearCache(key?: string): void {
    if (key) {
      const cacheKey = `${this.configPrefix}.${key}`;
      this.configCache.delete(cacheKey);
    } else {
      this.configCache.clear();
    }
  }

  /**
   * 监听配置变化
   */
  onConfigurationChanged(
    key: string,
    callback: (config: unknown) => void
  ): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      const configKey = `${this.configPrefix}.${key}`;
      if (event.affectsConfiguration(configKey)) {
        // 清除缓存
        this.clearCache(key);
        // 获取新配置并回调
        const newConfig = vscode.workspace.getConfiguration(this.configPrefix).get(key);
        callback(newConfig);
      }
    });
  }
}

// ===============================
// 便捷工厂函数
// ===============================

/**
 *  配置工厂函数
 * 为不同类型的配置提供便捷的创建方法
 */
export class ConfigFactory {
  /**
   * 创建定时器配置
   */
  static createTimerConfig(overrides: Partial<TimerConfig> = {}): TimerConfig {
    return {
      enabled: true,
      version: '1.0.0',
      updateInterval: 3000,
      autoStart: true,
      maxRetries: 3,
      ...overrides,
    };
  }

  /**
   * 创建UI配置
   */
  static createUIConfig(overrides: Partial<UIConfig> = {}): UIConfig {
    return {
      enabled: true,
      version: '1.0.0',
      theme: 'auto',
      animations: true,
      showNotifications: true,
      autoSave: false,
      ...overrides,
    };
  }

  /**
   * 创建监控配置
   */
  static createMonitorConfig(overrides: Partial<MonitorConfig> = {}): MonitorConfig {
    return {
      enabled: true,
      version: '1.0.0',
      updateInterval: 3000,
      autoStart: true,
      maxRetries: 3,
      warningThreshold: 80,
      errorThreshold: 95,
      showDetails: false,
      ...overrides,
    };
  }

  /**
   * 创建路径配置
   */
  static createPathConfig(overrides: Partial<PathConfig> = {}): PathConfig {
    return {
      enabled: true,
      version: '1.0.0',
      includePaths: [],
      excludePaths: [],
      ...overrides,
    };
  }
}

// 导出全局配置管理器实例
export const configManager = ConfigurationManager.getInstance();
