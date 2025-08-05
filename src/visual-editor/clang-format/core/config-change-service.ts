/**
 * Configuration Change Service (Simplified)
 * Handles configuration changes with direct method calls instead of complex handler pattern
 */

import { ErrorRecoveryManager } from '../error/error-recovery-manager';
import { EventBus } from '../messaging/event-bus';
import { EditorStateManager } from '../state/editor-state-manager';

/**
 * Configuration change context (simplified)
 */
export interface ConfigChangeContext {
  key: string;
  value: unknown;
  oldConfig: Record<string, unknown>;
  newConfig: Record<string, unknown>;
}

/**
 * 配置变化的结果
 */
export interface ConfigChangeResult {
  success: boolean;
  error?: Error;
  affectedHandlers: string[];
  executionTimeMs: number;
}

// Removed complex handler classes - using direct method calls instead

/**
 * Configuration Change Service (Simplified)
 *
 * Responsibilities:
 * - Handle configuration changes with direct method calls
 * - Update state and notify components
 * - Provide error recovery
 */
export class ConfigChangeService {
  constructor(
    private stateManager: EditorStateManager,
    private eventBus: EventBus,
    private errorRecovery: ErrorRecoveryManager,
  ) {
    // No complex initialization needed
  }

  /**
     * Handle configuration changes (Simplified)
     */
  async handleConfigChange(payload: {
    key: string;
    value: unknown;
  }): Promise<ConfigChangeResult> {
    const startTime = Date.now();

    try {
      const { key, value } = payload;

      // Get current configuration
      const currentState = this.stateManager.getState();
      const oldConfig = { ...currentState.currentConfig };
      const newConfig = { ...oldConfig };

      // Update configuration
      if (value === 'inherit' || value === undefined || value === null) {
        delete newConfig[key];
      } else {
        newConfig[key] = value;
      }

      // Direct operations instead of complex handler pattern:

      // 1. Update state
      await this.stateManager.updateState(
        {
          currentConfig: newConfig,
          configDirty: true
        },
        'config-changed'
      );

      // 2. Emit events for components to react
      this.eventBus.emit('config-changed', {
        key,
        value,
        oldConfig,
        newConfig,
        timestamp: Date.now(),
      });

      // 3. Trigger preview update if needed
      if (this.shouldUpdatePreview(key)) {
        this.eventBus.emit('config-updated-for-preview', {
          newConfig,
          reason: 'config-change',
          key,
        });
      }

      return {
        success: true,
        affectedHandlers: ['state', 'events', 'preview'],
        executionTimeMs: Date.now() - startTime,
      };

    } catch (error: unknown) {
      const result: ConfigChangeResult = {
        success: false,
        error,
        affectedHandlers: [],
        executionTimeMs: Date.now() - startTime,
      };

      await this.errorRecovery.handleError('config-change-failed', error, {
        payload,
        result,
      });

      return result;
    }
  }

  /**
     * Simple check if key should trigger preview update
     */
  private shouldUpdatePreview(key: string): boolean {
    // Only skip internal keys and metadata
    // BasedOnStyle is an important config option that should trigger preview updates
    return !key.startsWith('__internal') &&
      !key.startsWith('__metadata') &&
      key !== '__comment';
  }

  /**
     * Check if service is ready (always true in simplified version)
     */
  isServiceInitialized(): boolean {
    return true;
  }
}
