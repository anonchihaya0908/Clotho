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
import { L } from '../common/i18n';
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
  private readonly statusBar: SwitchStatusBar | undefined;

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
        const offer = L.ui.switch.noFilesFound(baseName, fileType === 'header' ? 'source' : 'header');
        const createLabel = L.ui.button.create();
        const cancelLabel = L.ui.button.cancel();
        const choice = await vscode.window.showInformationMessage(offer, createLabel, cancelLabel);
        if (choice === createLabel) {
          await vscode.commands.executeCommand('clotho.newSourcePair');
        }
        return;
      }

      // Handle the results
      const baseName = path.basename(currentPath, path.extname(currentPath));
      const isHeader = getFileType(currentPath) === 'header';
      let opened: vscode.Uri | undefined;
      if (result.files.length === 1) {
        const only = result.files[0];
        if (only) {
          opened = only;
          await this.ui.openFile(only);
        }
      } else {
        opened = await this.ui.showFileSelectionDialog(result.files, baseName, isHeader);
        if (opened) {
          await this.ui.openFile(opened);
        }
      }
      this.statusBar?.update(result.method, duration, result.files.length, opened ?? null);
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
