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
    value: any;
    oldConfig: Record<string, any>;
    newConfig: Record<string, any>;
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
        value: any;
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
                this.eventBus.emit('preview-update-requested', {
                    reason: 'config-change',
                    key,
                });
            }

            return {
                success: true,
                affectedHandlers: ['state', 'events', 'preview'],
                executionTimeMs: Date.now() - startTime,
            };

        } catch (error: any) {
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
        // Only update preview for keys that affect formatting
        return !key.startsWith('__internal') && key !== 'BasedOnStyle';
    }

    /**
     * Check if service is ready (always true in simplified version)
     */
    isServiceInitialized(): boolean {
        return true;
    }
}
