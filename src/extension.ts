/**
 * Clotho - C/C++ Header Source Pair Creator
 * 
 * A VS Code extension that provides intelligent C/C++ file pair creation
 * with smart language detection, customizable templates, and flexible
 * file extension configurations.
 */

import * as vscode from 'vscode';
import { registerCreateSourceHeaderPairCommand } from './create-source-header-pair';
import { activateSwitchSourceHeader } from './switch-header-source';

// Extension context interface for dependency injection
export interface ExtensionContext {
  subscriptions: vscode.Disposable[];
  extensionContext: vscode.ExtensionContext;
}

// Implementation of the extension context
class ClothoExtensionContext implements ExtensionContext {
  public subscriptions: vscode.Disposable[] = [];

  constructor(public extensionContext: vscode.ExtensionContext) {
    // Automatically dispose all subscriptions when extension is deactivated
    this.extensionContext.subscriptions.push({
      dispose: () => {
        for (const subscription of this.subscriptions) {
          subscription.dispose();
        }
      }
    });
  }
}

/**
 * Called when the extension is activated
 * This happens when VS Code determines that your extension should be loaded
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Clotho extension is now active!');

  // Create the extension context wrapper
  const clothoContext = new ClothoExtensionContext(context);

  try {
    // Register the create source/header pair functionality
    registerCreateSourceHeaderPairCommand(clothoContext);

    // Register the switch header/source functionality
    activateSwitchSourceHeader(clothoContext);

    // Show welcome message on first activation
    showWelcomeMessage(context);

  } catch (error) {
    console.error('Failed to activate Clotho extension:', error);
    vscode.window.showErrorMessage(
      `Failed to activate Clotho extension: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Called when the extension is deactivated
 */
export function deactivate() {
  console.log('Clotho extension has been deactivated');
}

/**
 * Shows welcome message for first-time users
 */
function showWelcomeMessage(context: vscode.ExtensionContext) {
  const hasShownWelcome = context.globalState.get<boolean>('clotho.hasShownWelcome', false);
  if (!hasShownWelcome) {
    vscode.window.showInformationMessage(
      'Welcome to Clotho! This is a tool that enhances C++ development efficiency, and it works even better when used with clangd.',
      'Configure Rules',
      'Don\'t Show Again'
    ).then((selection: string | undefined) => {
      if (selection === 'Configure Rules') {
        vscode.commands.executeCommand('clotho.configureRules');
      }
      if (selection === 'Don\'t Show Again' || selection === 'Configure Rules') {
        context.globalState.update('clotho.hasShownWelcome', true);
      }
    });
  }
}
