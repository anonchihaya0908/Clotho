/**
 * Clotho Extension Entry Point
 * C/C++ clangd enhancer with visual configuration editor
 */

import * as vscode from 'vscode';
import { bootstrap } from './bootstrap';
import { createModuleLogger, unifiedLogger } from './common/logger/unified-logger';

// Global reference to track activation state
let isActivated = false;
let activationPromise: Promise<void> | null = null;

// Create logger instance for this module
const logger = createModuleLogger('Extension');

/**
 * Extension activation function
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Prevent multiple activations
  if (isActivated) {
    logger.warn('Extension already activated, skipping duplicate activation', {
      module: 'Extension',
      operation: 'activate'
    });
    return;
  }

  // If activation is in progress, wait for it
  if (activationPromise) {
    logger.info('Extension activation already in progress, waiting...', {
      module: 'Extension',
      operation: 'activate'
    });
    return activationPromise;
  }

  // Start activation process
  activationPromise = performActivation(context);

  try {
    await activationPromise;
    isActivated = true;
  } catch (error) {
    activationPromise = null; // Reset on failure
    throw error;
  } finally {
    activationPromise = null;
  }
}

/**
 * Perform the actual activation logic
 */
async function performActivation(context: vscode.ExtensionContext): Promise<void> {
  const startTime = Date.now();

  try {
    // Logger output channel is automatically initialized by the unified logger
    logger.info('Clotho extension is activating...', {
      module: 'Extension',
      operation: 'activate',
      version: context.extension.packageJSON.version,
      vscodeVersion: vscode.version,
      extensionPath: context.extensionPath
    });

    // Initialize the extension
    await bootstrap(context);

    const activationTime = Date.now() - startTime;
    logger.info('Clotho extension activated successfully', {
      module: 'Extension',
      operation: 'activate',
      activationTime: `${activationTime}ms`
    });

    // Performance tracking is handled automatically by the unified logger

  } catch (error) {
    const activationTime = Date.now() - startTime;

    logger.error('Failed to activate Clotho extension',
      error instanceof Error ? error : new Error(String(error)),
      {
        module: 'Extension',
        operation: 'activate',
        activationTime: `${activationTime}ms`
      }
    );

    // Show user-friendly error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    const userMessage = `Clotho extension failed to activate: ${errorMessage}`;

    vscode.window.showErrorMessage(userMessage, 'Show Logs', 'Report Issue')
      .then(selection => {
        if (selection === 'Show Logs') {
          unifiedLogger.showOutputChannel();
        } else if (selection === 'Report Issue') {
          vscode.env.openExternal(vscode.Uri.parse(
            'https://github.com/anonchihaya0908/Clotho/issues/new'
          ));
        }
      });

    throw error;
  }
}

/**
 * Extension deactivation function
 */
export async function deactivate(): Promise<void> {
  if (!isActivated) {
    return;
  }

  const startTime = Date.now();

  try {
    logger.info('Clotho extension is deactivating...', {
      module: 'Extension',
      operation: 'deactivate'
    });

    // Note: Service cleanup is handled by bootstrap/coordinators
    // No explicit service container cleanup needed here

    const deactivationTime = Date.now() - startTime;
    logger.info('Clotho extension deactivated successfully', {
      module: 'Extension',
      operation: 'deactivate',
      deactivationTime: `${deactivationTime}ms`
    });

    isActivated = false;

  } catch (error) {
    logger.error('Error during extension deactivation',
      error instanceof Error ? error : new Error(String(error)),
      {
        module: 'Extension',
        operation: 'deactivate'
      }
    );

    // Don't throw during deactivation to avoid VS Code issues
    isActivated = false;
  }
}
