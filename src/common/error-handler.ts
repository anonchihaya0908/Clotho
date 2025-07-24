/**
 * Unified error handling utilities for Clotho extension
 * Provides consistent error handling patterns across all modules
 */

import * as vscode from "vscode";

export interface ErrorContext {
  operation: string;
  module: string;
  instanceId?: string; // 新增：实例标识
  showToUser?: boolean;
  logLevel?: "debug" | "info" | "warn" | "error";
}

export class ClothoError extends Error {
  constructor(
    message: string,
    public readonly context: ErrorContext,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ClothoError";
  }
}

export class ErrorHandler {
  private static readonly LOG_PREFIX = "Clotho";

  /**
   * Handles errors with consistent logging and user notification
   */
  public static handle(error: unknown, context: ErrorContext): ClothoError {
    const clothoError = this.normalizeError(error, context);

    // Log the error
    this.logError(clothoError);

    // Show to user if needed
    if (context.showToUser) {
      this.showUserError(clothoError);
    }

    return clothoError;
  }

  /**
   * Converts any error to ClothoError with context
   */
  private static normalizeError(
    error: unknown,
    context: ErrorContext,
  ): ClothoError {
    if (error instanceof ClothoError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new ClothoError(message, context, error);
  }

  /**
   * Logs error with appropriate level
   */
  private static logError(error: ClothoError): void {
    const { operation, module, logLevel = "error" } = error.context;
    const logMessage = `${this.LOG_PREFIX}: [${module}] ${operation} failed: ${error.message}`;

    switch (logLevel) {
      case "debug":
        console.debug(logMessage, error.cause);
        break;
      case "info":
        console.info(logMessage);
        break;
      case "warn":
        console.warn(logMessage, error.cause);
        break;
      case "error":
      default:
        console.error(logMessage, error.cause);
        break;
    }
  }

  /**
   * Shows user-friendly error message
   */
  private static showUserError(error: ClothoError): void {
    const { operation, module } = error.context;
    const userMessage = `Failed to ${operation}: ${error.message}`;

    vscode.window.showErrorMessage(userMessage);
  }

  /**
   * Creates a safe async wrapper that handles errors
   */
  public static wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: ErrorContext,
  ): (...args: T) => Promise<R | undefined> {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error, context);
        return undefined;
      }
    };
  }

  /**
   * Creates a safe sync wrapper that handles errors
   */
  public static wrapSync<T extends any[], R>(
    fn: (...args: T) => R,
    context: ErrorContext,
  ): (...args: T) => R | undefined {
    return (...args: T): R | undefined => {
      try {
        return fn(...args);
      } catch (error) {
        this.handle(error, context);
        return undefined;
      }
    };
  }
}

/**
 * Decorator for automatic error handling in methods
 */
export function handleErrors(context: Partial<ErrorContext>) {
  return function <T extends any[], R>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>,
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (...args: T): Promise<R> {
      const fullContext: ErrorContext = {
        operation: propertyKey,
        module: target.constructor.name,
        showToUser: false,
        logLevel: "error",
        ...context,
      };

      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        ErrorHandler.handle(error, fullContext);
        throw error; // Re-throw to maintain original behavior
      }
    };

    return descriptor;
  };
}
