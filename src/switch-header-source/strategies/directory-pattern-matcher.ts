/**
 * Directory Pattern Matcher
 * 
 * Unified logic for matching file paths against directory patterns.
 * Eliminates code duplication between src/include and tests strategies.
 */

import * as path from 'path';
import { SimpleCache as LRUCache } from '../../common/utils/security';
import { PERFORMANCE } from '../../common/constants';

/**
 * Represents a matched directory pattern
 */
export interface DirectoryPattern {
  /** Root path before the matched directory */
  rootPath: string;
  
  /** Sub-path after the matched directory */
  subPath: string;
  
  /** The directory that was matched */
  matchedDir: string;
  
  /** Target directories to search in */
  targetDirs: string[];
}

/**
 * Helper class for matching and extracting directory patterns from file paths
 */
export class DirectoryPatternMatcher {
  private static regexCache: LRUCache<string, RegExp> = 
    new LRUCache<string, RegExp>(PERFORMANCE.LRU_CACHE_MAX_SIZE);
    
  private static pathNormalizeCache: LRUCache<string, string> = 
    new LRUCache<string, string>(PERFORMANCE.LRU_CACHE_MAX_SIZE);

  /**
   * Matches a file path against a set of source directories
   * and returns information about the match
   * 
   * @param filePath File path to match
   * @param sourceDirs Source directory patterns to match against
   * @param targetDirs Target directories to search in when matched
   * @returns DirectoryPattern if matched, null otherwise
   */
  match(
    filePath: string,
    sourceDirs: string[],
    targetDirs: string[]
  ): DirectoryPattern | null {
    const normalized = this.getNormalizedPath(filePath);
    
    // Try to match each source directory pattern
    for (const sourceDir of sourceDirs) {
      const pattern = `^(.+?)\\/${this.escapeRegex(sourceDir)}\\/(.*)$`;
      const regex = this.getCachedRegex(pattern);
      const match = normalized.match(regex);
      
      if (match) {
        return {
          rootPath: match[1] ?? '',
          subPath: path.dirname(match[2] ?? ''),
          matchedDir: sourceDir,
          targetDirs: targetDirs
        };
      }
    }
    
    return null;
  }

  /**
   * Gets a cached regex or creates and caches a new one
   */
  private getCachedRegex(pattern: string): RegExp {
    const cached = DirectoryPatternMatcher.regexCache.get(pattern);
    if (cached) {
      return cached;
    }
    
    const regex = new RegExp(pattern);
    DirectoryPatternMatcher.regexCache.set(pattern, regex);
    return regex;
  }

  /**
   * Gets normalized path with caching
   */
  private getNormalizedPath(filePath: string): string {
    const cached = DirectoryPatternMatcher.pathNormalizeCache.get(filePath);
    if (cached !== undefined) {
      return cached;
    }
    
    const normalized = path.normalize(filePath).replace(/\\/g, '/');
    DirectoryPatternMatcher.pathNormalizeCache.set(filePath, normalized);
    return normalized;
  }

  /**
   * Escapes special regex characters in a string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Clears all caches (for testing or manual refresh)
   */
  static clearCache(): void {
    DirectoryPatternMatcher.regexCache.clear();
    DirectoryPatternMatcher.pathNormalizeCache.clear();
  }
}
