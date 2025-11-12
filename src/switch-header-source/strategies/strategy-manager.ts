/**
 * Search Strategy Manager
 *
 * Manages and coordinates all search strategies.
 * Executes strategies in priority order and returns the first successful result.
 */

import { SearchStrategy, SearchContext } from './search-strategy';
import { createModuleLogger } from '../../common/logger/unified-logger';
import { SearchResult, SearchMethod } from '../../common/types/core';

/**
 * Manages the execution of search strategies
 */
export class SearchStrategyManager {
  private strategies: SearchStrategy[] = [];
  private logger = createModuleLogger('SearchStrategyManager');

  /**
   * Registers a new search strategy
   * Strategies are automatically sorted by priority (highest first)
   */
  registerStrategy(strategy: SearchStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);

    this.logger.debug(`Registered strategy: ${strategy.name} (priority: ${strategy.priority})`, {
      module: 'SearchStrategyManager',
      operation: 'registerStrategy',
    });
  }

  /**
   * Registers multiple strategies at once
   */
  registerStrategies(strategies: SearchStrategy[]): void {
    strategies.forEach(strategy => this.registerStrategy(strategy));
  }

  /**
   * Executes strategies in priority order until one succeeds
   *
   * @param context Search context
   * @returns SearchResult with found files and the strategy that found them
   */
  async search(context: SearchContext): Promise<SearchResult> {
    this.logger.debug(`Starting search with ${this.strategies.length} strategies`, {
      module: 'SearchStrategyManager',
      operation: 'search',
      currentFile: context.currentFile.fsPath,
      baseName: context.baseName,
    });

    for (const strategy of this.strategies) {
      // Check if strategy is applicable
      if (!strategy.canApply(context)) {
        this.logger.debug(`Strategy ${strategy.name} not applicable, skipping`, {
          module: 'SearchStrategyManager',
          operation: 'search',
          strategy: strategy.name,
        });
        continue;
      }

      // Execute strategy
      const startTime = Date.now();

      try {
        const files = await strategy.search(context);
        const duration = Date.now() - startTime;

        if (files.length > 0) {
          this.logger.info(`Strategy ${strategy.name} found ${files.length} file(s)`, {
            module: 'SearchStrategyManager',
            operation: 'search',
            metadata: {
              strategy: strategy.name,
              filesFound: files.length,
              duration: duration,
            }
          });

          return {
            files,
            method: strategy.name as SearchMethod,
          };
        }

        this.logger.debug(`Strategy ${strategy.name} found no files (${duration}ms)`, {
          module: 'SearchStrategyManager',
          operation: 'search',
          metadata: {
            strategy: strategy.name,
            duration: duration,
          }
        });
      } catch (error) {
        this.logger.warn(`Strategy ${strategy.name} failed`, {
          module: 'SearchStrategyManager',
          operation: 'search',
          strategy: strategy.name,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue to next strategy
      }
    }

    // No strategy found any files
    this.logger.debug('No strategy found partner files', {
      module: 'SearchStrategyManager',
      operation: 'search',
      currentFile: context.currentFile.fsPath,
    });

    return {
      files: [],
      method: 'none',
    };
  }

  /**
   * Gets the list of registered strategies
   */
  getStrategies(): ReadonlyArray<SearchStrategy> {
    return this.strategies;
  }

  /**
   * Clears all registered strategies
   */
  clearStrategies(): void {
    this.strategies = [];
    this.logger.debug('Cleared all strategies', {
      module: 'SearchStrategyManager',
      operation: 'clearStrategies',
    });
  }
}
