/**
 * Clotho - C/C++ Header Source Pair Creator
 *
 * A VS Code extension that provides intelligent C/C++ file pair creation
 * with smart language detection, customizable templates, and flexible
 * file extension configurations.
 */

import * as vscode from 'vscode';
import { bootstrap, cleanup } from './bootstrap';
import { ErrorHandler } from './common/error-handler';
import { COMMANDS, UI_CONSTANTS } from './common/constants';

/**
 * Called when the extension is activated
 * This happens when VS Code determines that your extension should be loaded
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('Clotho extension is now active!');

  try {
    // Initialize the service container and all services
    await bootstrap(context);

    // Show welcome message on first activation
    showWelcomeMessage(context);
  } catch (error) {
    ErrorHandler.handle(error, {
      operation: 'activateExtension',
      module: 'Extension',
      showToUser: true,
      logLevel: 'error',
    });
  }
}

/**
 * Called when the extension is deactivated
 */
export function deactivate() {
  console.log('Clotho extension has been deactivated');

  // Clean up all services through the service container
  cleanup();
}

/**
 * Shows welcome message for first-time users
 */
function showWelcomeMessage(context: vscode.ExtensionContext) {
  const hasShownWelcome = context.globalState.get<boolean>(
    UI_CONSTANTS.WELCOME_MESSAGE_KEY,
    false,
  );
  if (!hasShownWelcome) {
    vscode.window
      .showInformationMessage(
        'Welcome to Clotho! This is a tool that enhances C++ development efficiency, and it works even better when used with clangd.',
        'Configure Rules',
        'Don\'t Show Again',
      )
      .then((selection: string | undefined) => {
        if (selection === 'Configure Rules') {
          vscode.commands.executeCommand(COMMANDS.CONFIGURE_RULES);
        }
        if (
          selection === 'Don\'t Show Again' ||
          selection === 'Configure Rules'
        ) {
          context.globalState.update(UI_CONSTANTS.WELCOME_MESSAGE_KEY, true);
        }
      });
  }
}
