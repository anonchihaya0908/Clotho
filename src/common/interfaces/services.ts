/**
 * Service Interfaces
 * ==================
 *
 * 定义所有核心服务的接口契约
 *
 * 优点：
 * - 提高类型安全性
 * - 便于单元测试（可以创建 mock 实现）
 * - 明确服务的公共 API
 * - 支持依赖注入的接口编程
 *
 * 设计原则：
 * - 接口只包含公共方法，不包含私有实现
 * - 参数和返回值类型明确
 * - 避免使用 any 或 unknown
 */

import * as vscode from 'vscode';
import { PairingRule } from '../../pairing-rule-manager';
import { Language } from '../types';
import { SearchResult } from '../types/core';

// ===============================
// File System Service
// ===============================

/**
 * 文件系统服务接口
 * 提供统一的文件操作和缓存管理
 */
export interface IFileSystemService {
  /**
   * 检查文件是否存在（带缓存）
   * @param uri 文件 URI
   * @returns 文件是否存在
   */
  fileExists(uri: vscode.Uri): Promise<boolean>;

  /**
   * 批量检查多个文件
   * @param uris 文件 URI 数组
   * @returns 存在的文件 URI 数组
   */
  checkMultipleFiles(uris: vscode.Uri[]): Promise<vscode.Uri[]>;

  /**
   * 读取文件内容
   * @param uri 文件 URI
   * @returns 文件内容
   */
  readFile(uri: vscode.Uri): Promise<string>;

  /**
   * 写入文件
   * @param uri 文件 URI
   * @param content 文件内容
   */
  writeFile(uri: vscode.Uri, content: string): Promise<void>;

  /**
   * 批量写入多个文件
   * @param files 文件数组（URI + 内容）
   */
  writeMultipleFiles(files: Array<{ uri: vscode.Uri; content: string }>): Promise<void>;

  /**
   * 清除所有缓存
   */
  clearCache(): void;

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    fileExists: { size: number; maxSize: number; hitRate?: number };
    fileContent: { size: number; maxSize: number };
  };

  /**
   * 记录当前缓存统计信息到日志
   * 用于监控缓存性能
   */
  logCacheStats(): void;

  /**
   * 使特定文件的缓存失效
   * 当检测到外部文件变更时使用
   * @param uri 文件 URI
   */
  invalidateFile(uri: vscode.Uri): void;

  /**
   * 清理服务资源
   * 释放文件监听器和缓存
   */
  dispose(): void;
}

// ===============================
// Pair Creator Service
// ===============================

/**
 * 文件对创建服务接口
 * 处理头文件/源文件对的创建逻辑
 */
export interface IPairCreatorService {
  /**
   * 创建文件对的路径
   * @param targetDirectory 目标目录
   * @param fileName 文件名（不含扩展名）
   * @param rule 配对规则
   * @returns 头文件和源文件的 URI
   */
  createFilePaths(
    targetDirectory: vscode.Uri,
    fileName: string,
    rule: PairingRule,
  ): { headerPath: vscode.Uri; sourcePath: vscode.Uri };

  /**
   * 从编辑器上下文检测编程语言
   * @returns 语言类型和不确定性标志
   */
  detectLanguageFromEditor(): Promise<{ language: Language; uncertain: boolean }>;

  /**
   * 检测编程语言
   * @param languageId VS Code 语言 ID
   * @param filePath 文件路径（可选）
   * @returns 语言类型和不确定性标志
   */
  detectLanguage(
    languageId?: string,
    filePath?: string,
  ): Promise<{ language: Language; uncertain: boolean }>;

  /**
   * 生成文件内容
   * @param fileName 文件名
   * @param eol 行结束符
   * @param rule 配对规则
   * @returns 头文件和源文件内容
   */
  generateFileContent(
    fileName: string,
    eol: string,
    rule: PairingRule,
  ): { headerContent: string; sourceContent: string };

  /**
   * 检查文件是否存在
   * @param headerPath 头文件路径
   * @param sourcePath 源文件路径
   * @returns 已存在的文件路径，或 null
   */
  checkFileExistence(
    headerPath: vscode.Uri,
    sourcePath: vscode.Uri,
  ): Promise<string | null>;

  /**
   * 写入文件
   * @param headerPath 头文件路径
   * @param sourcePath 源文件路径
   * @param headerContent 头文件内容
   * @param sourceContent 源文件内容
   */
  writeFiles(
    headerPath: vscode.Uri,
    sourcePath: vscode.Uri,
    headerContent: string,
    sourceContent: string,
  ): Promise<void>;

  /**
   * 获取所有配对规则
   * @returns 所有可用的配对规则
   */
  getAllPairingRules(): PairingRule[];

  /**
   * 生成并写入文件
   * @param fileName 文件名（不含扩展名）
   * @param rule 配对规则
   * @param headerPath 头文件路径
   * @param sourcePath 源文件路径
   */
  generateAndWriteFiles(
    fileName: string,
    rule: PairingRule,
    headerPath: vscode.Uri,
    sourcePath: vscode.Uri,
  ): Promise<void>;

  /**
   * 获取默认占位符内容
   * @param rule 配对规则
   * @returns 默认占位符字符串
   */
  getDefaultPlaceholder(rule: PairingRule): string;

  /**
   * 判断是否应该显示语言不匹配警告
   * @param language 当前语言
   * @param result 选中的配对规则
   * @param currentDir 当前目录
   * @param activeFilePath 活动文件路径
   * @returns 是否应该显示警告
   */
  shouldShowLanguageMismatchWarning(
    language: Language,
    result: PairingRule,
    currentDir?: string,
    activeFilePath?: string,
  ): Promise<boolean>;

  /**
   * 获取自定义 C++ 扩展名配置
   * @returns 自定义扩展名对象，如果没有则返回 null
   */
  getCustomCppExtensions(): { headerExt: string; sourceExt: string } | null;

  /**
   * 获取现有的配置规则
   * @param language 编程语言
   * @returns 现有规则，如果没有则返回 undefined
   */
  getExistingConfigRule(language: 'c' | 'cpp'): PairingRule | undefined;

  /**
   * 获取目标目录
   * @param activeDocumentPath 活动文档路径
   * @param workspaceFolders 工作区文件夹
   * @returns 目标目录 URI
   */
  getTargetDirectory(
    activeDocumentPath?: string,
    workspaceFolders?: readonly vscode.WorkspaceFolder[],
  ): Promise<vscode.Uri | undefined>;

  /**
   * 保存完整配置规则到工作区
   * @param rule 配对规则
   * @param pairingRuleService 配对规则服务
   */
  saveCompleteConfigToWorkspace(rule: PairingRule, pairingRuleService: IPairingRuleService): Promise<void>;
}

// ===============================
// Switch Service
// ===============================

/**
 * 头文件/源文件切换服务接口
 * 处理文件切换逻辑
 */
export interface ISwitchService {
  /**
   * 查找配对文件
   * @param currentFile 当前文件 URI
   * @returns 搜索结果，包含找到的文件和搜索方法
   */
  findPartnerFile(currentFile: vscode.Uri): Promise<SearchResult | null>;

  /**
   * 检查 clangd 是否可用
   * @returns clangd 是否可用
   */
  isClangdAvailable(): boolean;

  /**
   * 清理测试文件的基础名称
   * @param baseName 文件基础名
   * @returns 清理后的基础名
   */
  cleanTestBaseName(baseName: string): string;

  /**
   * 清除所有缓存
   */
  clearCache(): void;
}

// ===============================
// Pairing Rule Service
// ===============================

/**
 * 配对规则服务接口
 * 管理文件配对规则的存储和检索
 */
export interface IPairingRuleService {
  /**
   * 验证单个配对规则
   * @param rule 配对规则
   */
  validateRule(rule: PairingRule): void;

  /**
   * 获取当前激活的配对规则
   * @returns 只读配对规则数组
   */
  getActiveRules(): ReadonlyArray<PairingRule>;

  /**
   * 检查是否存在自定义规则
   * @param scope 作用域（workspace 或 user）
   * @returns 是否存在自定义规则
   */
  hasCustomRules(scope: 'workspace' | 'user'): boolean;

  /**
   * 获取指定作用域的规则
   * @param scope 作用域（workspace 或 user）
   * @returns 配对规则数组，如果不存在则返回 undefined
   */
  getRules(scope: 'workspace' | 'user'): PairingRule[] | undefined;

  /**
   * 写入规则到指定作用域
   * @param rules 配对规则数组
   * @param scope 作用域（workspace 或 user）
   */
  writeRules(rules: PairingRule[], scope: 'workspace' | 'user'): Promise<void>;

  /**
   * 更新规则的扩展名
   * @param newRule 新规则（只更新扩展名，保留其他设置）
   * @param scope 作用域（workspace 或 user）
   */
  updateRuleExtensions(newRule: PairingRule, scope: 'workspace' | 'user'): Promise<void>;

  /**
   * 重置指定作用域的规则（移除自定义规则）
   * @param scope 作用域（workspace 或 user）
   */
  resetRules(scope: 'workspace' | 'user'): Promise<void>;
}

// ===============================
// Type Utilities
// ===============================

/**
 * 提取接口的方法名类型
 */
export type MethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

/**
 * 提取接口的方法类型
 */
export type Methods<T> = Pick<T, MethodNames<T>>;
