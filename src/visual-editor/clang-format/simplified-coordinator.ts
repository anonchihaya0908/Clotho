/**
 * 🏗️ Simplified ClangFormat Editor Coordinator
 * 重构为与其他协调器一致的简洁架构模式
 */

import * as vscode from 'vscode';
import { errorHandler } from '../../common/error-handler';
import { logger } from '../../common/logger';
import { logAsyncOperation } from '../../common/structured-logging';
import { EditorOpenSource } from '../../common/types';
import { WebviewMessageType } from '../../common/types/clang-format-shared';

// 核心服务导入
import { ClangFormatService } from './format-service';
import { ClangFormatGuideService } from './guide-service';

// UI 管理器导入
import { ClangFormatEditorManager } from './core/editor-manager';
import { PreviewEditorManager } from './core/preview-manager';
import { PlaceholderWebviewManager } from './core/placeholder-manager';

// 配置和状态管理
import { ConfigActionManager } from './core/config-action-manager';
import { EditorStateManager } from './state/editor-state-manager';

// 事件和错误处理
import { EventBus } from './messaging/event-bus';
import { MessageHandler } from './messaging/message-handler';
import { ErrorRecoveryManager } from './error/error-recovery-manager';
import { ConfigChangeService } from './core/config-change-service';

/**
 * 🎯 简化的 ClangFormat 编辑器协调器
 * 
 * 遵循统一的协调器架构模式：
 * - 简洁的依赖注入
 * - 清晰的职责分离
 * - 标准的错误处理
 * - 最小化的直接依赖
 */
export class SimplifiedClangFormatCoordinator implements vscode.Disposable {
  // 🏗️ 核心服务（通过依赖注入）
  private readonly formatService: ClangFormatService;
  private readonly guideService: ClangFormatGuideService;
  
  // 🎨 UI 管理器（通过依赖注入）  
  private readonly editorManager: ClangFormatEditorManager;
  private readonly previewManager: PreviewEditorManager;
  private readonly placeholderManager: PlaceholderWebviewManager;
  
  // 🔧 配置和状态管理
  private readonly configActionManager: ConfigActionManager;
  private readonly stateManager: EditorStateManager;
  
  // 🎪 事件和错误处理
  private readonly eventBus: EventBus;
  private readonly messageHandler: MessageHandler;
  private readonly errorRecovery: ErrorRecoveryManager;
  private readonly configChangeService: ConfigChangeService;

  private isInitialized = false;

  constructor(
    extensionUri: vscode.Uri,
    // 🚀 依赖注入：所有依赖通过构造函数注入
    formatService?: ClangFormatService,
    guideService?: ClangFormatGuideService,
    editorManager?: ClangFormatEditorManager,
    previewManager?: PreviewEditorManager,
    placeholderManager?: PlaceholderWebviewManager
  ) {
    // 🏗️ 初始化核心架构组件
    this.eventBus = new EventBus();
    this.stateManager = new EditorStateManager(this.eventBus);
    this.errorRecovery = new ErrorRecoveryManager(this.stateManager, this.eventBus);
    
    // 🔧 初始化配置管理
    this.configChangeService = new ConfigChangeService(
      this.stateManager,
      this.eventBus,
      this.errorRecovery
    );

    // 🎪 初始化消息处理
    this.messageHandler = new MessageHandler();

    // 🚀 依赖注入（服务由服务容器提供）
    if (!formatService) {
      throw new Error('ClangFormatService must be provided via dependency injection');
    }
    this.formatService = formatService;
    this.guideService = guideService ?? new ClangFormatGuideService();
    this.editorManager = editorManager ?? new ClangFormatEditorManager();
    this.previewManager = previewManager ?? new PreviewEditorManager();
    this.placeholderManager = placeholderManager ?? new PlaceholderWebviewManager();
    this.configActionManager = new ConfigActionManager();
  }

  /**
   * 🚀 初始化协调器
   * 统一的初始化入口点
   */
  async initialize(): Promise<void> {
    return logAsyncOperation('SimplifiedClangFormatCoordinator', 'initialize', async () => {
    if (this.isInitialized) {
      return;
    }

    try {
      // 🏗️ 准备管理器上下文
      const context = this.createManagerContext();

      // ✅ 按依赖顺序初始化组件
      await this.initializeInOrder(context);

      // 🎪 设置事件监听
      this.setupEventListeners();

      this.isInitialized = true;

      logger.info('SimplifiedClangFormatCoordinator initialized successfully', {
        module: 'SimplifiedClangFormatCoordinator',
        operation: 'initialize',
      });
    } catch (error) {
      await errorHandler.handle(error, {
        operation: 'initialize',
        module: 'SimplifiedClangFormatCoordinator',
        showToUser: true,
        logLevel: 'error',
      });
      throw error;
    }
    }); // 结束logAsyncOperation
  }

  /**
   * 🎯 打开编辑器的主要入口点
   */
  async openEditor(source: EditorOpenSource = EditorOpenSource.COMMAND): Promise<void> {
    return logAsyncOperation('SimplifiedClangFormatCoordinator', 'openEditor', async () => {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 🎯 委托给编辑器管理器
      // TODO: 需要实现具体的编辑器打开逻辑
      logger.info('Opening clang-format editor', {
        module: 'SimplifiedClangFormatCoordinator',
        operation: 'openEditor',
        source,
      });
      
      // 📊 更新状态
      await this.stateManager.updateState(
        { 
          // 更新基本状态
        },
        'editor-opened'
      );

    } catch (error) {
      await this.errorRecovery.handleError('editor-open-failed', error, { source });
    }
    }); // 结束logAsyncOperation
  }

  /**
   * 🔄 打开预览
   */
  async openPreview(): Promise<void> {
    return logAsyncOperation('SimplifiedClangFormatCoordinator', 'openPreview', async () => {
      if (!this.isInitialized) {
        await this.initialize();
      }

      try {
        await this.previewManager.openPreview();
      } catch (error) {
        await this.errorRecovery.handleError('preview-open-failed', error);
      }
    });
  }

  /**
   * 📝 处理Webview消息
   */
  async handleWebviewMessage(
    message: { type: WebviewMessageType; payload?: any },
    panel: vscode.WebviewPanel
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const context = this.createManagerContext();
      // TODO: 实现消息处理逻辑
      logger.debug('Processing webview message', {
        module: 'SimplifiedClangFormatCoordinator',
        operation: 'handleWebviewMessage',
        messageType: message.type,
      });
    } catch (error) {
      await this.errorRecovery.handleError('message-handling-failed', error, {
        messageType: message.type,
      });
    }
  }

  /**
   * 🧹 销毁协调器
   */
  dispose(): void {
    // 🗑️ 按相反顺序销毁组件
    this.disposeInReverseOrder();
    
    logger.info('SimplifiedClangFormatCoordinator disposed', {
      module: 'SimplifiedClangFormatCoordinator',
      operation: 'dispose',
    });
  }

  // ===============================
  // 私有辅助方法
  // ===============================

  /**
   * 🏗️ 创建管理器上下文
   */
  private createManagerContext() {
    return {
      extensionUri: vscode.Uri.file(''), // 会由service container提供
      stateManager: this.stateManager,
      errorRecovery: this.errorRecovery,
      eventBus: this.eventBus,
    };
  }

  /**
   * 🔄 按依赖顺序初始化组件
   */
  private async initializeInOrder(context: any): Promise<void> {
    const initTasks = [
      // 🔧 先初始化配置管理
      { name: 'configActionManager', manager: this.configActionManager },
      
      // 🎪 初始化消息处理
      { name: 'messageHandler', manager: this.messageHandler },
      
      // 🎨 初始化UI管理器
      { name: 'editorManager', manager: this.editorManager },
      { name: 'previewManager', manager: this.previewManager },
      { name: 'placeholderManager', manager: this.placeholderManager },
    ];

    for (const task of initTasks) {
      try {
        if (task.manager.initialize) {
          await task.manager.initialize(context);
        }
        logger.debug(`Initialized ${task.name}`, {
          module: 'SimplifiedClangFormatCoordinator',
          operation: 'initializeInOrder',
          component: task.name,
        });
      } catch (error) {
        logger.error(`Failed to initialize ${task.name}`, error as Error, {
          module: 'SimplifiedClangFormatCoordinator',
          operation: 'initializeInOrder',
          component: task.name,
        });
        throw error;
      }
    }
  }

  /**
   * 🎪 设置事件监听器
   */
  private setupEventListeners(): void {
    // 📝 配置变化监听
    this.eventBus.on('config-changed', async (changes) => {
      try {
        await this.configChangeService.handleConfigChange(changes);
      } catch (error) {
        await this.errorRecovery.handleError('config-change-failed', error);
      }
    });

    // 🔄 状态变化监听
    this.eventBus.on('state-changed', (event) => {
      logger.debug('State changed', {
        module: 'SimplifiedClangFormatCoordinator',
        operation: 'setupEventListeners',
        changeType: event.changeType,
      });
    });

    // ❌ 错误恢复事件
    this.eventBus.on('retry-editor-creation-requested', async () => {
      try {
        // 重新尝试打开编辑器
        await this.openEditor(EditorOpenSource.ERROR_RECOVERY);
      } catch (error) {
        logger.error('Retry editor creation failed', error as Error, {
          module: 'SimplifiedClangFormatCoordinator',
          operation: 'setupEventListeners',
        });
      }
    });
  }

  /**
   * 🗑️ 按相反顺序销毁组件
   */
  private disposeInReverseOrder(): void {
    const managers = [
      this.placeholderManager,
      this.previewManager,
      this.editorManager,
      this.messageHandler,
      this.configActionManager,
      this.configChangeService,
      this.errorRecovery,
      this.stateManager,
      this.eventBus,
    ];

    managers.forEach((manager) => {
      try {
        if (manager && typeof (manager as any).dispose === 'function') {
          (manager as any).dispose();
        }
      } catch (error) {
        logger.error('Error disposing manager', error as Error, {
          module: 'SimplifiedClangFormatCoordinator',
          operation: 'disposeInReverseOrder',
        });
      }
    });
  }

  // ===============================
  // 公共查询方法
  // ===============================

  /**
   * 📊 获取协调器状态
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      editorState: this.stateManager.getState(),
      managerCount: 5, // editorManager, previewManager, placeholderManager, configActionManager, messageHandler
      lastActivity: new Date(),
    };
  }

  /**
   * 🔍 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}