/**
 * Switch Coordinator - Example of improved architecture
 * Demonstrates best practices for error handling, type safety, and code organization
 */

import * as path from 'path';
import * as vscode from 'vscode';
import {
  getFileType,
  isValidCppFile
} from '../common';
import { BaseCoordinator } from '../common/base-coordinator';
import { SwitchConfigService } from './config-manager';
import { ISwitchService } from '../common/interfaces/services';
import { SwitchUI } from './switch-ui';

/**
 * Main coordinator class that orchestrates the switch functionality.
 * Uses dependency injection and comprehensive error handling.
 */
export class SwitchCoordinator extends BaseCoordinator {
  private readonly service: ISwitchService;
  private readonly ui: SwitchUI;
  private readonly configService: SwitchConfigService;

  constructor(
    service: ISwitchService,
    ui: SwitchUI,
    configService?: SwitchConfigService
  ) {
    super(); // Initialize BaseCoordinator

    // Dependencies should be injected by the service container
    this.service = service;
    this.ui = ui;
    this.configService = configService ?? new SwitchConfigService();

    // Validate dependencies
    this.validateDependencies({
      service: this.service,
      ui: this.ui,
      configService: this.configService,
    });

    // Commands are now registered centrally in bootstrap.ts
  }

  /**
   * Get the module name for logging purposes
   */
  protected getModuleName(): string {
    return 'SwitchCoordinator';
  }

  /**
   * Main switch operation
   */
  public async switchHeaderSource(): Promise<void> {
    return this.executeOperation('switchHeaderSource', async () => {
      // Validate preconditions
      const activeEditor = this.validateActiveEditor();
      if (!activeEditor) { return; }

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
        this.ui.showNoFilesFoundMessage(baseName, fileType === 'header');
        return;
      }

      // Handle the results
      const baseName = path.basename(currentPath, path.extname(currentPath));
      const isHeader = getFileType(currentPath) === 'header';
      await this.ui.handleSearchResult(
        result.files,
        baseName,
        isHeader,
        result.method,
      );
    });
  }

  /**
   * Shows the configuration template selector with error handling
   */
  public async showConfigTemplate(): Promise<void> {
    return this.executeOperation('showConfigTemplate', async () => {
      await this.configService.showTemplateSelector();
    });
  }

  /**
   * Shows the current configuration with error handling
   */
  public showCurrentConfig(): void {
    return this.executeSync('showCurrentConfig', () => {
      this.configService.showCurrentConfig();
    });
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


}
