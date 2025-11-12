/**
 * Switch Header/Source module specific types
 */

import { SearchResult as CoreSearchResult } from '../common/types/core';
import { SwitchConfig as CommonSwitchConfig } from '../common/types/switch';

// ===============================
// Switch Module Configuration
// ===============================

/**
 *  Switch Module Configuration
 * 继承自PathConfig，获得统一的路径配置管理能力
 */
export type SwitchConfig = CommonSwitchConfig;

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
