/**
 * 面板管理器
 * 专门管理VS Code WebviewPanel的创建、销毁和状态管理
 */

import * as vscode from "vscode";
import { ErrorHandler } from "../../../common/error-handler";

/**
 * 面板配置选项
 */
export interface PanelOptions {
  viewType: string;
  title: string;
  viewColumn: vscode.ViewColumn;
  options?: vscode.WebviewPanelOptions & vscode.WebviewOptions;
  iconPath?: vscode.Uri | { light: vscode.Uri; dark: vscode.Uri };
}

/**
 * 面板状态信息
 */
export interface PanelState {
  id: string;
  isVisible: boolean;
  isActive: boolean;
  viewColumn: vscode.ViewColumn;
  title: string;
  createdAt: Date;
  lastActiveAt: Date;
}

/**
 * 面板管理器接口
 */
export interface PanelManager {
  /**
   * 创建新面板
   */
  createPanel(id: string, options: PanelOptions): vscode.WebviewPanel;

  /**
   * 获取指定面板
   */
  getPanel(id: string): vscode.WebviewPanel | undefined;

  /**
   * 获取面板状态
   */
  getPanelState(id: string): PanelState | undefined;

  /**
   * 销毁指定面板
   */
  destroyPanel(id: string): boolean;

  /**
   * 聚焦指定面板
   */
  focusPanel(id: string): boolean;

  /**
   * 获取所有面板
   */
  getAllPanels(): Map<string, vscode.WebviewPanel>;

  /**
   * 获取活跃面板数量
   */
  getActivePanelCount(): number;

  /**
   * 销毁所有面板
   */
  destroyAllPanels(): void;
}

/**
 * ClangFormat面板管理器实现
 */
export class ClangFormatPanelManager
  implements PanelManager, vscode.Disposable
{
  private panels = new Map<string, vscode.WebviewPanel>();
  private panelStates = new Map<string, PanelState>();
  private disposables: vscode.Disposable[] = [];

  constructor() {
    // 监听活跃编辑器变化
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.updatePanelStates();
      }),
    );

    // 监听可见编辑器变化
    this.disposables.push(
      vscode.window.onDidChangeVisibleTextEditors(() => {
        this.updatePanelStates();
      }),
    );
  }

  /**
   * 创建新面板
   */
  createPanel(id: string, options: PanelOptions): vscode.WebviewPanel {
    try {
      // 检查是否已存在
      const existingPanel = this.panels.get(id);
      if (existingPanel && !existingPanel.disposed) {
        console.log(
          `PanelManager: Panel ${id} already exists, revealing existing panel`,
        );
        existingPanel.reveal(options.viewColumn);
        this.updatePanelState(id, { lastActiveAt: new Date() });
        return existingPanel;
      }

      // 创建新面板
      const panel = vscode.window.createWebviewPanel(
        options.viewType,
        options.title,
        options.viewColumn,
        options.options,
      );

      // 设置图标
      if (options.iconPath) {
        panel.iconPath = options.iconPath;
      }

      // 存储面板
      this.panels.set(id, panel);

      // 初始化面板状态
      const now = new Date();
      this.panelStates.set(id, {
        id,
        isVisible: panel.visible,
        isActive: panel.active,
        viewColumn: options.viewColumn,
        title: options.title,
        createdAt: now,
        lastActiveAt: now,
      });

      // 监听面板事件
      this.setupPanelEventListeners(id, panel);

      console.log(`PanelManager: Created panel ${id}`);
      return panel;
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: "createPanel",
        module: "PanelManager",
        showToUser: true,
        logLevel: "error",
      });
      throw error;
    }
  }

  /**
   * 获取指定面板
   */
  getPanel(id: string): vscode.WebviewPanel | undefined {
    const panel = this.panels.get(id);
    return panel && !panel.disposed ? panel : undefined;
  }

  /**
   * 获取面板状态
   */
  getPanelState(id: string): PanelState | undefined {
    return this.panelStates.get(id);
  }

  /**
   * 销毁指定面板
   */
  destroyPanel(id: string): boolean {
    try {
      const panel = this.panels.get(id);
      if (!panel) {
        return false;
      }

      // 销毁面板
      if (!panel.disposed) {
        panel.dispose();
      }

      // 清理状态
      this.panels.delete(id);
      this.panelStates.delete(id);

      console.log(`PanelManager: Destroyed panel ${id}`);
      return true;
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: "destroyPanel",
        module: "PanelManager",
        showToUser: false,
        logLevel: "error",
      });
      return false;
    }
  }

  /**
   * 聚焦指定面板
   */
  focusPanel(id: string): boolean {
    try {
      const panel = this.getPanel(id);
      if (!panel) {
        return false;
      }

      panel.reveal();
      this.updatePanelState(id, { lastActiveAt: new Date() });

      console.log(`PanelManager: Focused panel ${id}`);
      return true;
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: "focusPanel",
        module: "PanelManager",
        showToUser: false,
        logLevel: "error",
      });
      return false;
    }
  }

  /**
   * 获取所有面板
   */
  getAllPanels(): Map<string, vscode.WebviewPanel> {
    // 过滤掉已销毁的面板
    const activePanels = new Map<string, vscode.WebviewPanel>();

    for (const [id, panel] of this.panels) {
      if (!panel.disposed) {
        activePanels.set(id, panel);
      } else {
        // 清理已销毁的面板
        this.panels.delete(id);
        this.panelStates.delete(id);
      }
    }

    return activePanels;
  }

  /**
   * 获取活跃面板数量
   */
  getActivePanelCount(): number {
    let count = 0;
    for (const [, panel] of this.panels) {
      if (!panel.disposed && panel.visible) {
        count++;
      }
    }
    return count;
  }

  /**
   * 销毁所有面板
   */
  destroyAllPanels(): void {
    try {
      const panelIds = Array.from(this.panels.keys());
      for (const id of panelIds) {
        this.destroyPanel(id);
      }
      console.log("PanelManager: All panels destroyed");
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: "destroyAllPanels",
        module: "PanelManager",
        showToUser: false,
        logLevel: "error",
      });
    }
  }

  /**
   * 设置面板事件监听器
   */
  private setupPanelEventListeners(
    id: string,
    panel: vscode.WebviewPanel,
  ): void {
    // 监听面板可见性变化
    panel.onDidChangeViewState((e) => {
      this.updatePanelState(id, {
        isVisible: e.webviewPanel.visible,
        isActive: e.webviewPanel.active,
        lastActiveAt: new Date(),
      });
    });

    // 监听面板销毁
    panel.onDidDispose(() => {
      this.panels.delete(id);
      this.panelStates.delete(id);
      console.log(`PanelManager: Panel ${id} disposed`);
    });
  }

  /**
   * 更新面板状态
   */
  private updatePanelState(id: string, updates: Partial<PanelState>): void {
    const currentState = this.panelStates.get(id);
    if (currentState) {
      this.panelStates.set(id, {
        ...currentState,
        ...updates,
      });
    }
  }

  /**
   * 更新所有面板状态
   */
  private updatePanelStates(): void {
    for (const [id, panel] of this.panels) {
      if (!panel.disposed) {
        this.updatePanelState(id, {
          isVisible: panel.visible,
          isActive: panel.active,
        });
      }
    }
  }

  /**
   * 获取面板统计信息
   */
  getStatistics(): {
    totalPanels: number;
    activePanels: number;
    visiblePanels: number;
    oldestPanel?: { id: string; age: number };
  } {
    const allPanels = this.getAllPanels();
    const totalPanels = allPanels.size;
    let activePanels = 0;
    let visiblePanels = 0;
    let oldestPanel: { id: string; age: number } | undefined;

    const now = new Date();

    for (const [id, panel] of allPanels) {
      const state = this.panelStates.get(id);

      if (panel.active) activePanels++;
      if (panel.visible) visiblePanels++;

      if (state) {
        const age = now.getTime() - state.createdAt.getTime();
        if (!oldestPanel || age > oldestPanel.age) {
          oldestPanel = { id, age };
        }
      }
    }

    return {
      totalPanels,
      activePanels,
      visiblePanels,
      oldestPanel,
    };
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    try {
      // 销毁所有面板
      this.destroyAllPanels();

      // 清理事件监听器
      this.disposables.forEach((d) => d.dispose());
      this.disposables = [];

      console.log("PanelManager: Manager disposed");
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: "disposePanelManager",
        module: "PanelManager",
        showToUser: false,
        logLevel: "error",
      });
    }
  }
}
