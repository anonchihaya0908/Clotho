/**
 * 多实例ClangFormat可视化编辑器协调器
 * 支持同时创建和管理多个编辑器实例
 */

import * as vscode from 'vscode';
import { ClangFormatInstanceManager } from './instance-manager';
import { ClangFormatPanelManager } from '../ui/panel-manager';
import { ErrorHandler } from '../../../common/error-handler';
import { COMMANDS } from '../../../common/constants';

/**
 * 编辑器打开来源
 */
export enum EditorOpenSource {
  COMMAND_PALETTE = 'commandPalette',
  CODELENS = 'codeLens',
  STATUS_BAR = 'statusBar',
  DIRECT = 'direct',
}

/**
 * 多实例协调器
 */
export class MultiInstanceClangFormatCoordinator implements vscode.Disposable {
  private instanceManager: ClangFormatInstanceManager;
  private panelManager: ClangFormatPanelManager;
  private disposables: vscode.Disposable[] = [];

  constructor(private extensionUri: vscode.Uri) {
    this.instanceManager = new ClangFormatInstanceManager(extensionUri);
    this.panelManager = new ClangFormatPanelManager();

    // 注册命令
    this.registerCommands();
  }

  /**
   * 显示编辑器（支持多实例）
   */
  async showEditor(
    source: EditorOpenSource = EditorOpenSource.DIRECT,
  ): Promise<void> {
    try {
      // 获取当前工作区
      const workspaceFolder = this.getCurrentWorkspaceFolder();

      // 尝试聚焦现有实例
      if (this.instanceManager.focusWorkspaceEditor(workspaceFolder)) {
        console.log(
          'MultiInstanceCoordinator: Focused existing editor instance',
        );
        return;
      }

      // 创建新实例
      const instance = this.instanceManager.createEditor(workspaceFolder);
      await instance.initialize();

      console.log(
        `MultiInstanceCoordinator: Created new editor instance for ${workspaceFolder?.name || 'default'}`,
      );
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'showEditor',
        module: 'MultiInstanceClangFormatCoordinator',
        showToUser: true,
        logLevel: 'error',
      });
    }
  }

  /**
   * 显示新的编辑器实例（强制创建新实例）
   */
  async showNewEditor(): Promise<void> {
    try {
      const workspaceFolder = this.getCurrentWorkspaceFolder();
      const instance = this.instanceManager.createEditor(workspaceFolder);
      await instance.initialize();

      console.log(
        'MultiInstanceCoordinator: Created new editor instance (forced)',
      );
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'showNewEditor',
        module: 'MultiInstanceClangFormatCoordinator',
        showToUser: true,
        logLevel: 'error',
      });
    }
  }

  /**
   * 获取活跃实例数量
   */
  getActiveInstanceCount(): number {
    return this.instanceManager.getActiveInstances().length;
  }

  /**
   * 获取总实例数量
   */
  getTotalInstanceCount(): number {
    return this.instanceManager.count();
  }

  /**
   * 关闭所有实例
   */
  async closeAllInstances(): Promise<void> {
    try {
      this.instanceManager.destroyAll();
      console.log('MultiInstanceCoordinator: All instances closed');
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'closeAllInstances',
        module: 'MultiInstanceClangFormatCoordinator',
        showToUser: false,
        logLevel: 'error',
      });
    }
  }

  /**
   * 获取实例统计信息
   */
  getStatistics(): {
    totalInstances: number;
    activeInstances: number;
    panelStatistics: any;
    } {
    return {
      totalInstances: this.instanceManager.count(),
      activeInstances: this.instanceManager.getActiveInstances().length,
      panelStatistics: this.panelManager.getStatistics(),
    };
  }

  /**
   * 注册命令
   */
  private registerCommands(): void {
    // 主要的打开编辑器命令
    this.disposables.push(
      vscode.commands.registerCommand(
        COMMANDS.OPEN_CLANG_FORMAT_EDITOR,
        async () => {
          await this.showEditor(EditorOpenSource.COMMAND_PALETTE);
        },
      ),
    );

    // 强制创建新实例的命令
    this.disposables.push(
      vscode.commands.registerCommand(
        COMMANDS.OPEN_CLANG_FORMAT_EDITOR + '.new',
        async () => {
          await this.showNewEditor();
        },
      ),
    );

    // 关闭所有实例的命令
    this.disposables.push(
      vscode.commands.registerCommand(
        COMMANDS.OPEN_CLANG_FORMAT_EDITOR + '.closeAll',
        async () => {
          await this.closeAllInstances();
        },
      ),
    );

    // 显示统计信息的命令
    this.disposables.push(
      vscode.commands.registerCommand(
        COMMANDS.OPEN_CLANG_FORMAT_EDITOR + '.stats',
        () => {
          const stats = this.getStatistics();
          vscode.window.showInformationMessage(
            `ClangFormat Editors: ${stats.activeInstances}/${stats.totalInstances} active`,
          );
        },
      ),
    );
  }

  /**
   * 获取当前工作区文件夹
   */
  private getCurrentWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    // 优先使用活跃编辑器所在的工作区
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      return vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
    }

    // 如果没有活跃编辑器，使用第一个工作区
    const workspaceFolders = vscode.workspace.workspaceFolders;
    return workspaceFolders?.[0];
  }

  /**
   * 销毁协调器
   */
  dispose(): void {
    try {
      // 销毁所有实例
      this.instanceManager.dispose();

      // 销毁面板管理器
      this.panelManager.dispose();

      // 清理命令注册
      this.disposables.forEach((d) => d.dispose());
      this.disposables = [];

      console.log('MultiInstanceClangFormatCoordinator: Coordinator disposed');
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'disposeCoordinator',
        module: 'MultiInstanceClangFormatCoordinator',
        showToUser: false,
        logLevel: 'error',
      });
    }
  }
}
