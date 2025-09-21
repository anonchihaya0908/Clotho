/**
 * Base error handling strategy interface
 * Provides a unified approach to error handling across modules
 */

import { ClothoError, ErrorContext } from '../error-handler';

// ===============================
// Strategy Interfaces
// ===============================

export interface ErrorStrategy {
  /**
   * Strategy name for identification
   */
  readonly name: string;

  /**
   * Determines if this strategy can handle the given error
   */
  canHandle(error: ClothoError): boolean;

  /**
   * Handles the error using this strategy
   */
  handle(error: ClothoError, context: ErrorContext): Promise<ErrorStrategyResult>;

  /**
   * Clean up any resources used by this strategy
   */
  dispose?(): void;
}

// ===============================
// Strategy Result Interface
// ===============================

export interface ErrorStrategyResult {
  /**
   * Whether the error was successfully handled
   */
  handled: boolean;

  /**
   * Whether the operation should be retried
   */
  shouldRetry: boolean;

  /**
   * Additional context or data from the handling process
   */
  metadata?: Record<string, unknown>;

  /**
   * Next action to take if any
   */
  nextAction?: 'reset' | 'restart' | 'ignore' | 'escalate';
}

// ===============================
// Base Strategy Implementation
// ===============================

export abstract class BaseErrorStrategy implements ErrorStrategy {
  abstract readonly name: string;

  abstract canHandle(error: ClothoError): boolean;

  abstract handle(error: ClothoError, context: ErrorContext): Promise<ErrorStrategyResult>;

  /**
   * Helper method to create a successful result
   */
  protected createSuccessResult(metadata?: Record<string, unknown>): ErrorStrategyResult {
    const result: ErrorStrategyResult = {
      handled: true,
      shouldRetry: false,
    };
    if (metadata) {
      result.metadata = metadata;
    }
    return result;
  }

  /**
   * Helper method to create a retry result
   */
  protected createRetryResult(metadata?: Record<string, unknown>): ErrorStrategyResult {
    const result: ErrorStrategyResult = {
      handled: true,
      shouldRetry: true,
    };
    if (metadata) {
      result.metadata = metadata;
    }
    return result;
  }

  /**
   * Helper method to create a failure result
   */
  protected createFailureResult(nextAction?: ErrorStrategyResult['nextAction']): ErrorStrategyResult {
    const result: ErrorStrategyResult = {
      handled: false,
      shouldRetry: false,
    };
    if (nextAction) {
      result.nextAction = nextAction;
    }
    return result;
  }

  /**
   * Default dispose implementation (no-op)
   */
  dispose(): void {
    // Override in subclasses if cleanup is needed
  }
}
