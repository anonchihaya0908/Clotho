/**
 * Switch Header/Source module specific types
 */

import { BaseConfig, SearchResult as CoreSearchResult } from '../common/types/core';

// ===============================
// Switch Module Configuration
// ===============================

export interface SwitchConfig extends BaseConfig {
    sourceDirs: string[];
    headerDirs: string[];
    testDirs: string[];
    searchPaths: string[];
    excludePatterns: string[];
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

// Re-export core SearchResult for backward compatibility
export type SearchResult = CoreSearchResult;