/**
 * Switch module shared types (moved to common to avoid upward deps)
 */

import { PathConfig } from '../config-system';

/**
 * Switch Module Configuration
 * Extends PathConfig to include common include/exclude path settings
 */
export interface SwitchConfig extends PathConfig {
  /** Source directories */
  sourceDirs: string[];
  /** Header directories */
  headerDirs: string[];
  /** Test directories */
  testDirs: string[];
  /** Additional search paths */
  searchPaths: string[];
}

