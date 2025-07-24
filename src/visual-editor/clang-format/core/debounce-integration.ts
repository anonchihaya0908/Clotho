/**
 * 防抖集成模块
 * 将防抖机制集成到现有的ClangFormat coordinator中
 */

import * as vscode from "vscode";
import { DebounceManager } from "./debounce-manager";
import { TransitionManager } from "./transition-manager";
import { ErrorHandler } from "../../../common/error-handler";

/**
 * 防抖集成器
 */
export class DebounceIntegration {
  private debounceManager: DebounceManager;
  private transitionManager: TransitionManager;
  private isEnabled: boolean = true;

  constructor(private extensionUri: vscode.Uri) {
    this.debounceManager = new DebounceManager();
    this.transitionManager = new TransitionManager(extensionUri);
  }

  /**
   * 防抖的预览关闭处理
   */
  createDebouncedPreviewCloseHandler(
    originalHandler: () => Promise<void>,
  ): () => Promise<void> {
    return this.debounceManager.debounce(
      "preview-close-handler",
      async () => {
        if (!this.isEnabled) {
          await originalHandler();
          return;
        }

        console.log(
          "🎭 DebounceIntegration: Handling preview close with debounce",
        );

        try {
          // 直接执行原始处理器，不再使用彩蛋过渡
          await originalHandler();
          console.log(
            "✅ DebounceIntegration: Direct handler execution completed",
          );
        } catch (error) {
          console.error("❌ DebounceIntegration: Handler execution failed");
          await originalHandler();
        }
      },
      {
        delay: 50, // 50ms防抖延迟
        leading: true, // 立即执行第一次
        trailing: false, // 不执行尾随调用
      },
    );
  }

  /**
   * 防抖的预览重新打开处理
   */
  createDebouncedPreviewReopenHandler(
    originalHandler: () => Promise<vscode.TextEditor>,
  ): () => Promise<void> {
    return this.debounceManager.debounce(
      "preview-reopen-handler",
      async () => {
        console.log(
          "📄 DebounceIntegration: Handling preview reopen with debounce",
        );

        try {
          // 使用过渡管理器切换回预览模式
          await this.transitionManager.switchToPreview(async () => {
            return await originalHandler();
          });
        } catch (error) {
          ErrorHandler.handle(error, {
            operation: "debouncedPreviewReopen",
            module: "DebounceIntegration",
            showToUser: false,
            logLevel: "error",
          });
          throw error;
        }
      },
      {
        delay: 100,
        leading: true,
        trailing: false,
      },
    );
  }

  /**
   * 启用/禁用防抖功能
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`DebounceIntegration: ${enabled ? "Enabled" : "Disabled"}`);
  }

  /**
   * 获取统计信息
   */
  getStats(): any {
    return {
      debounceManager: this.debounceManager.getStatus(),
      transitionManager: this.transitionManager.getStats(),
      isEnabled: this.isEnabled,
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.debounceManager.dispose();
    this.transitionManager.dispose();
    console.log("DebounceIntegration: Disposed");
  }
}
