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
import { activatePairingRuleManager } from './pairing-rule-manager';
import { activateClangdMonitor, deactivateClangdMonitor } from './clangd-monitor';
import { ErrorHandler } from './common/error-handler';
import { COMMANDS, UI_CONSTANTS } from './common/constants';

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

    // Register the pairing rule management functionality
    activatePairingRuleManager(clothoContext);

    // Activate clangd monitoring functionality
    const config = vscode.workspace.getConfiguration('clotho.clangdMonitor');
    const isMonitoringEnabled = config.get<boolean>('enabled', true);

    if (isMonitoringEnabled) {
      activateClangdMonitor(clothoContext, {
        memory: {
          updateInterval: config.get<number>('updateInterval', 3000),
          showCpu: config.get<boolean>('showCpu', false),
          warningThreshold: config.get<number>('warningThreshold', 1000),
          errorThreshold: config.get<number>('errorThreshold', 2000)
        }
      });
    }

    // Show welcome message on first activation
    showWelcomeMessage(context);

  } catch (error) {
    ErrorHandler.handle(error, {
      operation: 'activateExtension',
      module: 'Extension',
      showToUser: true,
      logLevel: 'error'
    });
  }
}

/**
 * Called when the extension is deactivated
 */
export function deactivate() {
  console.log('Clotho extension has been deactivated');

  // Clean up clangd monitoring
  deactivateClangdMonitor();
}

/**
 * Shows welcome message for first-time users
 */
function showWelcomeMessage(context: vscode.ExtensionContext) {
  const hasShownWelcome = context.globalState.get<boolean>(UI_CONSTANTS.WELCOME_MESSAGE_KEY, false);
  if (!hasShownWelcome) {
    vscode.window.showInformationMessage(
      'Welcome to Clotho! This is a tool that enhances C++ development efficiency, and it works even better when used with clangd.',
      'Configure Rules',
      'Don\'t Show Again'
    ).then((selection: string | undefined) => {
      if (selection === 'Configure Rules') {
        vscode.commands.executeCommand(COMMANDS.CONFIGURE_RULES);
      }
      if (selection === 'Don\'t Show Again' || selection === 'Configure Rules') {
        context.globalState.update(UI_CONSTANTS.WELCOME_MESSAGE_KEY, true);
      }
    });
  }
}
