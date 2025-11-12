/**
 * Search Strategies Export
 * 
 * Central export point for all search strategies and related components.
 */

// Core interfaces and types
export { SearchStrategy, SearchContext } from './search-strategy';

// Strategy Manager
export { SearchStrategyManager } from './strategy-manager';

// Directory Pattern Matcher (utility)
export { DirectoryPatternMatcher, DirectoryPattern } from './directory-pattern-matcher';

// Concrete Strategies
export { SameDirectoryStrategy } from './same-directory-strategy';
export { SrcIncludeStrategy } from './src-include-strategy';
export { TestsStrategy } from './tests-strategy';
export { GlobalSearchStrategy } from './global-search-strategy';
export { IndexingStrategy } from './indexing-strategy';
