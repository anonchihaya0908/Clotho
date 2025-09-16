/**
 * Visual Editor Error Strategy
 * Handles errors specific to the visual editor module
 */

import { ClothoError, ErrorContext } from '../error-handler';
import { createModuleLogger } from '../logger/unified-logger';
import { BaseErrorStrategy, ErrorStrategyResult } from './base-strategy';

// ===============================
// Visual Editor Recovery Strategy
// ===============================

export class VisualEditorErrorStrategy extends BaseErrorStrategy {
  readonly name = 'VisualEditorErrorStrategy';

  private maxRecoveryAttempts = 3;
  private errorHistory: Array<{ code: string; timestamp: number }> = [];
  private readonly logger = createModuleLogger('VisualEditorErrorStrategy');

  constructor(
    private stateManager?: { updateState?: (state: unknown, reason?: string) => Promise<void>; getState?: () => { recoveryAttempts?: number } }, // Will be properly typed when imported
    private eventBus?: { emit?: (event: string, ...args: readonly unknown[]) => void },
  ) {
    super();
  }

  canHandle(error: ClothoError): boolean {
    // Handle errors from visual editor modules
    return error.context.module === 'VisualEditor' ||
      error.context.module === 'ClangFormatEditor' ||
      error.context.module === 'ErrorRecoveryManager' ||
      error.context.module.startsWith('visual-editor');
  }

  async handle(error: ClothoError, _context: ErrorContext): Promise<ErrorStrategyResult> { // eslint-disable-line @typescript-eslint/no-unused-vars
    this.logger.info(`Handling visual editor error: ${error.message}`, {
      module: this.name,
      operation: 'handle',
      errorCode: error.message,
    });

    // Track error frequency
    this.trackError(error.message);

    // Check if we've exceeded retry attempts
    if (this.getRecentErrorCount(error.message) > this.maxRecoveryAttempts) {
      this.logger.warn(`Max recovery attempts exceeded for error: ${error.message}`, {
        module: this.name,
        operation: 'handle',
      });
      return this.createFailureResult('reset');
    }

    try {
      // Attempt recovery based on error type
      const recovered = await this.attemptRecovery(error);

      if (recovered) {
        this.logger.info(`Successfully recovered from error: ${error.message}`, {
          module: this.name,
          operation: 'handle',
        });
        return this.createSuccessResult({
          recoveryMethod: this.getRecoveryMethod(error.message),
        });
      } else {
        return this.createRetryResult({
          attempt: this.getRecentErrorCount(error.message),
        });
      }
    } catch (recoveryError) {
      this.logger.error(`Failed to recover from error: ${error.message}`, recoveryError as Error, {
        module: this.name,
        operation: 'handle',
      });
      return this.createFailureResult('escalate');
    }
  }

  private trackError(errorCode: string): void {
    this.errorHistory.push({
      code: errorCode,
      timestamp: Date.now(),
    });

    // Clean up old entries (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.errorHistory = this.errorHistory.filter(
      entry => entry.timestamp > fiveMinutesAgo
    );
  }

  private getRecentErrorCount(errorCode: string): number {
    const oneMinuteAgo = Date.now() - 60 * 1000;
    return this.errorHistory.filter(
      entry => entry.code === errorCode && entry.timestamp > oneMinuteAgo
    ).length;
  }

  private async attemptRecovery(error: ClothoError): Promise<boolean> {
    const errorCode = error.message;

    switch (errorCode) {
      case 'preview-open-failed':
        return this.recoverPreviewOpen();

      case 'config-load-failed':
        return this.recoverConfigLoad();

      case 'validation-failed':
        return this.recoverValidation();

      case 'webview-communication-failed':
        return this.recoverWebviewCommunication();

      default:
        return this.defaultRecovery();
    }
  }

  private async recoverPreviewOpen(): Promise<boolean> {
    try {
      // Attempt to reset preview state
      if (this.stateManager?.updateState) {
        await this.stateManager.updateState(
          { previewMode: 'closed' }
        );
      }
      return true;
    } catch {
      return false;
    }
  }

  private async recoverConfigLoad(): Promise<boolean> {
    try {
      // Reset to default configuration
      if (this.stateManager?.updateState) {
        await this.stateManager.updateState(
          { currentConfig: {} }
        );
      }
      return true;
    } catch {
      return false;
    }
  }

  private async recoverValidation(): Promise<boolean> {
    // Validation errors are usually not recoverable automatically
    return false;
  }

  private async recoverWebviewCommunication(): Promise<boolean> {
    try {
      // Restart the webview communication
      if (this.eventBus) {
        this.eventBus?.emit?.('restart-communication');
      }
      return true;
    } catch {
      return false;
    }
  }

  private async defaultRecovery(): Promise<boolean> {
    // Default recovery: reset state
    try {
      if (this.stateManager?.updateState) {
        const currentState = this.stateManager.getState?.() || {};
        await this.stateManager.updateState(
          {
            isInitialized: false,
            configDirty: false,
            recoveryAttempts: (currentState.recoveryAttempts || 0) + 1,
          }
        );
      }
      return true;
    } catch {
      return false;
    }
  }

  private getRecoveryMethod(errorCode: string): string {
    switch (errorCode) {
      case 'preview-open-failed': return 'preview-reset';
      case 'config-load-failed': return 'config-reset';
      case 'validation-failed': return 'validation-skip';
      case 'webview-communication-failed': return 'communication-restart';
      default: return 'state-reset';
    }
  }

  override dispose(): void {
    this.errorHistory = [];
  }
}
