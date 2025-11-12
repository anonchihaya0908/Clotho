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
import { SwitchStatusBar } from './status-bar';
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
  private readonly statusBar?: SwitchStatusBar;

  constructor(
    service: ISwitchService,
    ui: SwitchUI,
    configService?: SwitchConfigService,
    statusBar?: SwitchStatusBar
  ) {
    super(); // Initialize BaseCoordinator

    // Dependencies should be injected by the service container
    this.service = service;
    this.ui = ui;
    this.configService = configService ?? new SwitchConfigService();
    this.statusBar = statusBar;

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
      const t0 = Date.now();
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
      const duration = Date.now() - t0;

      if (!result || result.files.length === 0) {
        const baseName = path.basename(currentPath, path.extname(currentPath));
        const fileType = getFileType(currentPath);
        this.ui.showNoFilesFoundMessage(baseName, fileType === 'header');
        // Offer to create pair when nothing found
        const choice = await vscode.window.showInformationMessage(
          `No corresponding ${fileType === 'header' ? 'source' : 'header'} file found for '${baseName}'. Create a new pair?`,
          'Create Pair',
          'Cancel'
        );
        if (choice === 'Create Pair') {
          const pairCoordinator = serviceContainer.get('pairCoordinator');
          await pairCoordinator.create();
        }
        return;
      }

      // Handle the results
      const baseName = path.basename(currentPath, path.extname(currentPath));
      if (result) {
        this.statusBar?.update(result.method, duration, result.files.length);
      }
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
