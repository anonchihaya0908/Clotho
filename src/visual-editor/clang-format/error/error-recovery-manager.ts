import * as vscode from "vscode";
import { EditorError } from "../../../common/types";
import { EditorStateManager } from "../state/editor-state-manager";
import { EventBus } from "../messaging/event-bus";

/**
 * 恢复策略接口
 */
interface RecoveryStrategy {
  recover(
    error: EditorError,
    stateManager: EditorStateManager,
    eventBus: EventBus,
  ): Promise<void>;
}

/**
 * 错误恢复管理器
 * 提供统一的错误处理和自动恢复机制
 */
export class ErrorRecoveryManager implements vscode.Disposable {
  private recoveryStrategies = new Map<string, RecoveryStrategy>();
  private errorHistory: EditorError[] = [];
  private maxRecoveryAttempts = 3;

  constructor(
    private stateManager: EditorStateManager,
    private eventBus: EventBus,
  ) {
    this.setupRecoveryStrategies();
  }

  /**
   * 处理错误，记录并尝试恢复
   * @param errorCode 错误码，用于查找恢复策略
   * @param error 原生错误对象
   * @param context 额外的上下文信息
   */
  async handleError(
    errorCode: string,
    error: any,
    context?: Record<string, any>,
  ): Promise<void> {
    const editorError: EditorError = {
      code: errorCode,
      message: error.message || String(error),
      context: { ...context, stack: error.stack },
      timestamp: Date.now(),
      recoverable: this.isRecoverable(errorCode),
    };

    this.errorHistory.push(editorError);
    console.error(
      `[ErrorRecovery] Code: ${errorCode}. Message: ${editorError.message}`,
      { error: editorError },
    );

    await this.stateManager.updateState(
      {
        lastError: editorError,
      },
      "error-occurred",
    );

    if (editorError.recoverable) {
      await this.attemptRecovery(errorCode, editorError);
    } else {
      await this.handleUnrecoverableError(editorError);
    }
  }

  /**
   * 处理不可恢复的错误，通常是重置到安全状态
   */
  private async handleUnrecoverableError(error: EditorError): Promise<void> {
    console.error(
      `Unrecoverable error occurred: ${error.code}. Resetting to safe state.`,
    );
    await this.stateManager.resetToSafeState();
    vscode.window.showErrorMessage(
      `Clang-Format Editor遇到严重错误，已重置到安全状态。详情请查看日志。`,
    );
  }

  /**
   * 尝试根据策略恢复
   */
  private async attemptRecovery(
    errorCode: string,
    error: EditorError,
  ): Promise<void> {
    const strategy = this.recoveryStrategies.get(errorCode);
    const currentState = this.stateManager.getState();

    if (!strategy) {
      console.warn(`No recovery strategy found for error code: ${errorCode}.`);
      await this.handleUnrecoverableError(error); // 没有策略则视为不可恢复
      return;
    }

    if (currentState.recoveryAttempts >= this.maxRecoveryAttempts) {
      console.error(
        `Maximum recovery attempts reached for error: ${errorCode}. Resetting to safe state.`,
      );
      await this.stateManager.resetToSafeState();
      vscode.window.showWarningMessage(
        `插件多次尝试恢复失败，已重置到安全状态。`,
      );
      return;
    }

    console.log(
      `Attempting recovery for ${errorCode} (Attempt ${currentState.recoveryAttempts + 1})`,
    );

    try {
      await this.stateManager.updateState(
        {
          recoveryAttempts: currentState.recoveryAttempts + 1,
        },
        "recovery-attempt",
      );

      await strategy.recover(error, this.stateManager, this.eventBus);

      // 恢复成功，重置错误状态和尝试次数
      await this.stateManager.updateState(
        {
          lastError: undefined,
          recoveryAttempts: 0,
        },
        "recovery-successful",
      );
      console.log(`Recovery successful for ${errorCode}.`);
    } catch (recoveryError: any) {
      console.error(`Recovery attempt failed for ${errorCode}:`, recoveryError);
      // 恢复策略本身失败，错误会继续在下一次handleError中被捕获并增加尝试次数
      // 为避免无限循环，这里可以增加更复杂的逻辑，但目前保持简单
    }
  }

  /**
   * 定义不同错误码的恢复策略
   */
  private setupRecoveryStrategies(): void {
    // 预览创建失败：现在只记录错误，因为没有彩蛋可以回退
    this.recoveryStrategies.set("preview-creation-failed", {
      async recover(error, stateManager, eventBus) {
        console.error(
          "Recovery: Preview creation failed and no fallback is available.",
          error,
        );
        await stateManager.updateState(
          { previewMode: "closed" },
          "preview-creation-failed",
        );
        vscode.window.showErrorMessage("无法打开预览窗口。");
      },
    });

    // 编辑器主面板创建失败：延迟重试
    this.recoveryStrategies.set("editor-creation-failed", {
      async recover(error, stateManager, eventBus) {
        console.log("Recovery: Retrying editor creation after a delay.");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        eventBus.emit("create-editor-requested"); // 通知协调器重试
      },
    });

    // 消息处理失败：通常忽略，只记录
    this.recoveryStrategies.set("message-handling-failed", {
      async recover(error, stateManager) {
        console.warn(`Ignoring message handling error: ${error.message}`);
        // 清除错误状态，因为这是一个非关键错误
        await stateManager.updateState(
          { lastError: undefined },
          "ignore-message-error",
        );
      },
    });
  }

  /**
   * 判断一个错误码是否被认为是可恢复的
   */
  private isRecoverable(errorCode: string): boolean {
    return this.recoveryStrategies.has(errorCode);
  }

  dispose(): void {
    this.errorHistory = [];
    this.recoveryStrategies.clear();
  }
}
