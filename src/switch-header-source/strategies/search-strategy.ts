/**
 * Search Strategy Interface
 * 
 * Defines the contract for all file search strategies.
 * Each strategy represents a different approach to finding partner files.
 */

import * as vscode from 'vscode';
import { SwitchConfig } from '../../common/constants';
import { IFileSystemService } from '../../common/interfaces/services';

/**
 * Context object passed to all search strategies
 * Contains all necessary information for performing a search
 */
export interface SearchContext {
  /** Current file URI */
  currentFile: vscode.Uri;
  
  /** Base filename without extension */
  baseName: string;
  
  /** Cleaned base filename (test prefixes/suffixes removed) */
  cleanedBaseName: string;
  
  /** Whether the current file is a header file */
  isHeader: boolean;
  
  /** Target file extensions to search for */
  targetExtensions: string[];
  
  /** Current switch configuration */
  config: SwitchConfig;
  
  /** File system service for checking file existence */
  fileSystemService: IFileSystemService;
}

/**
 * Base interface for all search strategies
 */
export interface SearchStrategy {
  /** Strategy name for logging and debugging */
  readonly name: string;
  
  /** Priority (higher = executed first) */
  readonly priority: number;
  
  /**
   * Determines if this strategy can be applied to the current context
   * @param context Search context
   * @returns true if strategy is applicable
   */
  canApply(context: SearchContext): boolean;
  
  /**
   * Performs the search using this strategy
   * @param context Search context
   * @returns Array of found file URIs (empty if none found)
   */
  search(context: SearchContext): Promise<vscode.Uri[]>;
}
