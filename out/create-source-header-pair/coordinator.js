"use strict";
//
// PAIR COORDINATOR
// ================
//
// Lean coordinator that orchestrates the source/header pair creation workflow.
// Uses dependency injection and delegates all implementation details to
// service and UI layers.
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PairCoordinator = void 0;
const vscode = __importStar(require("vscode"));
const pairing_rule_manager_1 = require("../pairing-rule-manager");
// PairCoordinator orchestrates the workflow between UI and Service layers.
// It follows the single responsibility principle and uses dependency injection.
class PairCoordinator {
    service;
    ui;
    static ERROR_MESSAGES = {
        NO_TARGET_DIRECTORY: 'Cannot determine target directory. Please open a folder or a file first.',
        FILE_EXISTS: (filePath) => `File already exists: ${filePath}`,
        UNEXPECTED_ERROR: 'An unexpected error occurred.'
    };
    newPairCommand;
    configureRulesCommand;
    // Constructor with dependency injection - receives pre-configured instances
    constructor(service, ui) {
        this.service = service;
        this.ui = ui;
        // Register commands
        this.newPairCommand = vscode.commands.registerCommand('clotho.newSourcePair', this.create, this);
        this.configureRulesCommand = vscode.commands.registerCommand('clotho.configureRules', this.configureRules, this);
    }
    // Dispose method for cleanup when extension is deactivated
    dispose() {
        this.newPairCommand.dispose();
        this.configureRulesCommand.dispose();
    }
    // Main workflow orchestration
    async create() {
        try {
            // 1. Determine where to create files
            const targetDirectory = await this.getTargetDirectory();
            if (!targetDirectory) {
                vscode.window.showErrorMessage(PairCoordinator.ERROR_MESSAGES.NO_TARGET_DIRECTORY);
                return;
            }
            // 2. Get user preferences for what to create
            const { language, uncertain } = await this.service.detectLanguageFromEditor();
            const rule = await this.ui.promptForPairingRule(language, uncertain);
            if (!rule) {
                return;
            }
            const fileName = await this.ui.promptForFileName(rule);
            if (!fileName) {
                return;
            }
            // 3. Prepare file paths and check for conflicts
            const { headerPath, sourcePath } = this.service.createFilePaths(targetDirectory, fileName, rule);
            const existingFilePath = await this.service.checkFileExistence(headerPath, sourcePath);
            if (existingFilePath) {
                vscode.window.showErrorMessage(PairCoordinator.ERROR_MESSAGES.FILE_EXISTS(existingFilePath));
                return;
            }
            // 4. Create the files
            await this.service.generateAndWriteFiles(fileName, rule, headerPath, sourcePath);
            // 5. Show success and handle post-creation tasks
            await this.ui.showSuccessAndOpenFile(headerPath, sourcePath);
            await this.service.handleOfferToSaveAsDefault(rule, language);
        }
        catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : PairCoordinator.ERROR_MESSAGES.UNEXPECTED_ERROR;
            vscode.window.showErrorMessage(errorMessage);
        }
    }
    // Determine target directory with fallback to workspace picker
    async getTargetDirectory() {
        return await this.service.getTargetDirectory(vscode.window.activeTextEditor?.document?.uri.fsPath, vscode.workspace.workspaceFolders) ??
            await this.ui.showWorkspaceFolderPicker();
    }
    // Opens the configuration wizard for pairing rules
    async configureRules() {
        await (0, pairing_rule_manager_1.showConfigurationWizard)();
    }
}
exports.PairCoordinator = PairCoordinator;
//# sourceMappingURL=coordinator.js.map