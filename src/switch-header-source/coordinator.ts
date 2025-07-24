/**
 * Switch Coordinator - Example of improved architecture
 * Demonstrates best practices for error handling, type safety, and code organization
 */

import * as vscode from "vscode";
import * as path from "path";
import {
  ErrorHandler,
  COMMANDS,
  ERROR_MESSAGES,
  isValidCppFile,
  getFileType,
} from "../common";
import { SwitchService } from "./switch-service";
import { SwitchUI } from "./switch-ui";
import { SwitchConfigService } from "./config-manager";

/**
 * Main coordinator class that orchestrates the switch functionality.
 * Uses dependency injection and comprehensive error handling.
 */
export class SwitchCoordinator implements vscode.Disposable {
  private readonly service: SwitchService;
  private readonly ui: SwitchUI;
  private readonly switchCommand: vscode.Disposable;

  constructor(service?: SwitchService, ui?: SwitchUI) {
    // Allow dependency injection for testing
    this.service = service ?? new SwitchService();
    this.ui = ui ?? new SwitchUI();

    // Register the switch command
    this.switchCommand = vscode.commands.registerCommand(
      COMMANDS.SWITCH_HEADER_SOURCE,
      ErrorHandler.wrapAsync(() => this.switchHeaderSource(), {
        operation: "switchHeaderSource command",
        module: "SwitchCoordinator",
        showToUser: true,
      }),
    );
  }

  /**
   * Main switch operation
   */
  public async switchHeaderSource(): Promise<void> {
    // Validate preconditions
    const activeEditor = this.validateActiveEditor();
    if (!activeEditor) return;

    const currentFile = activeEditor.document.uri;
    const currentPath = currentFile.fsPath;
    const fileName = path.basename(currentPath);

    // Validate file type
    if (!isValidCppFile(currentPath)) {
      this.ui.showInvalidFileTypeWarning(fileName);
      return;
    }

    // Perform the search
    const result = await this.service.findPartnerFile(currentFile);

    if (!result || result.files.length === 0) {
      const baseName = path.basename(currentPath, path.extname(currentPath));
      const fileType = getFileType(currentPath);
      this.ui.showNoFilesFoundMessage(baseName, fileType === "header");
      return;
    }

    // Handle the results
    const baseName = path.basename(currentPath, path.extname(currentPath));
    const isHeader = getFileType(currentPath) === "header";
    await this.ui.handleSearchResult(
      result.files,
      baseName,
      isHeader,
      result.method,
    );
  }

  /**
   * Shows the configuration template selector with error handling
   */
  public async showConfigTemplate(): Promise<void> {
    try {
      await SwitchConfigService.showTemplateSelector();
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: "showConfigTemplate",
        module: "SwitchCoordinator",
        showToUser: true,
      });
    }
  }

  /**
   * Shows the current configuration with error handling
   */
  public showCurrentConfig(): void {
    try {
      SwitchConfigService.showCurrentConfig();
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: "showCurrentConfig",
        module: "SwitchCoordinator",
        showToUser: true,
      });
    }
  }

  /**
   * Validates that there is an active editor
   */
  private validateActiveEditor(): vscode.TextEditor | null {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      this.ui.showNoActiveEditorWarning();
      return null;
    }
    return activeEditor;
  }

  /**
   * Disposes of resources
   */
  public dispose(): void {
    // Clean up command registration
    this.switchCommand.dispose();
  }
}
