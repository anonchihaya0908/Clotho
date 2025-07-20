"use strict";
/**
 * Clotho - C/C++ Header Source Pair Creator
 *
 * A VS Code extension that provides intelligent C/C++ file pair creation
 * with smart language detection, customizable templates, and flexible
 * file extension configurations.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const create_source_header_pair_1 = require("./create-source-header-pair");
const switch_source_header_1 = require("./switch-source-header");
// Implementation of the extension context
class ClothoExtensionContext {
    constructor(extensionContext) {
        this.extensionContext = extensionContext;
        this.subscriptions = [];
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
function activate(context) {
    console.log('Clotho extension is now active!');
    // Create the extension context wrapper
    const clothoContext = new ClothoExtensionContext(context);
    try {
        // Register the create source/header pair functionality
        (0, create_source_header_pair_1.registerCreateSourceHeaderPairCommand)(clothoContext);
        // Register the switch header/source functionality
        (0, switch_source_header_1.activateSwitchSourceHeader)(clothoContext);
        // Show welcome message on first activation
        showWelcomeMessage(context);
    }
    catch (error) {
        console.error('Failed to activate Clotho extension:', error);
        vscode.window.showErrorMessage(`Failed to activate Clotho extension: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
exports.activate = activate;
/**
 * Called when the extension is deactivated
 */
function deactivate() {
    console.log('Clotho extension has been deactivated');
}
exports.deactivate = deactivate;
/**
 * Shows welcome message for first-time users
 */
function showWelcomeMessage(context) {
    const hasShownWelcome = context.globalState.get('clotho.hasShownWelcome', false);
    if (!hasShownWelcome) {
        vscode.window.showInformationMessage('Welcome to Clotho! Create C/C++ header/source pairs with Ctrl+Alt+N or switch between files with Alt+O.', 'Configure Rules', 'Don\'t Show Again').then((selection) => {
            if (selection === 'Configure Rules') {
                vscode.commands.executeCommand('clotho.configureRules');
            }
            if (selection === 'Don\'t Show Again' || selection === 'Configure Rules') {
                context.globalState.update('clotho.hasShownWelcome', true);
            }
        });
    }
}
//# sourceMappingURL=extension.js.map