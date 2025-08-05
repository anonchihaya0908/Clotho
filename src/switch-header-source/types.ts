/**
 * Switch Header/Source module specific types
 */

import { BaseConfig, SearchResult as CoreSearchResult } from '../common/types/core';
import { PathConfig } from '../common/config-system';

// ===============================
// Switch Module Configuration
// ===============================

/**
 *  Switch Module Configuration
 * 继承自PathConfig，获得统一的路径配置管理能力
 */
export interface SwitchConfig extends PathConfig {
    /** 源文件目录 */
    sourceDirs: string[];
    /** 头文件目录 */
    headerDirs: string[];
    /** 测试文件目录 */
    testDirs: string[];
    /** 搜索路径 */
    searchPaths: string[];
    // excludePatterns 改为 excludePaths (通过 PathConfig 继承)
}

// ===============================
// Search Pattern Interface
// ===============================

export interface SearchPattern {
    rootPath: string;
    subPath: string;
    targetDirs: string[];
}

// ===============================
// Configuration Template Interface
// ===============================

export interface ConfigTemplate {
    name: string;
    description: string;
    config: Omit<SwitchConfig, 'excludePatterns' | 'version' | 'lastModified'>;
}

// Re-export core SearchResult
export type SearchResult = CoreSearchResult;
