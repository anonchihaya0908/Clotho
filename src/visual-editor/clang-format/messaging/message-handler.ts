import { LoggerService } from '../../../common/logger';
import { BaseManager, ManagerContext } from '../../../common/types';
import {
  WebviewMessage,
  WebviewMessageType,
} from '../../../common/types/clang-format-shared';
import { UI_CONSTANTS } from '../../../common/constants';

type MessageHandlerFunction = (
  payload: any,
  context: ManagerContext,
) => Promise<void>;

/**
 * Webview 消息处理器
 * 负责路由、验证和处理所有来自webview的消息
 */
export class MessageHandler implements BaseManager {
  readonly name = 'MessageHandler';

  private context!: ManagerContext;
  private messageHandlers = new Map<string, MessageHandlerFunction>();
  private readonly logger = LoggerService.getInstance().createChildLogger('MessageHandler');

  constructor() {
    this.setupMessageHandlers();
    this.logger.debug('MessageHandler constructed. Handlers are now set up.');
  }

  async initialize(context: ManagerContext): Promise<void> {
    this.context = context;
    this.logger.debug('MessageHandler initialized.');
  }

  /**
   * 处理从Webview接收到的消息
   * @param message 消息对象
   */
  async handleMessage(message: WebviewMessage): Promise<void> {
    this.logger.debug('Processing message:', { type: message.type, payload: message.payload });

    if (!this.validateMessage(message)) {
      const error = new Error(
        `Invalid message format: ${JSON.stringify(message)}`,
      );
      await this.context.errorRecovery.handleError(
        'message-validation-failed',
        error,
        { message },
      );
      return;
    }

    const handler = this.messageHandlers.get(message.type);
    if (!handler) {
      this.logger.warn(`No handler found for message type: ${message.type}`);
      this.logger.debug('Available handlers:', Array.from(this.messageHandlers.keys()));
      return;
    }

    try {
      this.logger.debug(`Handling message: ${message.type}`);
      await handler(message.payload, this.context);
    } catch (error: any) {
      await this.context.errorRecovery.handleError(
        'message-handling-failed',
        error,
        {
          messageType: message.type,
          payload: message.payload,
        },
      );
    }
  }

  /**
   * 创建配置操作处理函数（带按需初始化）
   */
  private createConfigActionHandler(eventName: string) {
    return async (payload: any, context: ManagerContext) => {
      this.logger.info(`Processing ${eventName}...`);

      // 先发送事件以确保 ConfigActionManager 被初始化
      context.eventBus.emit('ensure-config-manager-ready');

      // Use centralized delay constant for message processing
      setTimeout(() => {
        context.eventBus.emit(eventName, payload);
      }, UI_CONSTANTS.MESSAGE_HANDLER_DELAY);
    };
  }

  /**
   * 注册不同消息类型的处理函数
   */
  private setupMessageHandlers(): void {
    // 配置变更处理函数
    const handleConfigChange = async (
      payload: any,
      context: ManagerContext,
    ) => {
      this.logger.debug('Config changed, delegating to coordinator:', payload);
      // 不直接处理，而是触发事件让 coordinator 统一处理
      context.eventBus.emit('config-change-requested', payload);
    };

    // 配置变更 - 支持两种消息类型格式
    this.messageHandlers.set(
      WebviewMessageType.CONFIG_CHANGED,
      handleConfigChange,
    );

    // 工具栏按钮：Load（快速设置/加载工作区配置）
    this.messageHandlers.set(
      WebviewMessageType.LOAD_WORKSPACE_CONFIG,
      this.createConfigActionHandler('load-workspace-config-requested'),
    );

    // 工具栏按钮：Save
    this.messageHandlers.set(
      WebviewMessageType.SAVE_CONFIG,
      this.createConfigActionHandler('save-config-requested'),
    );

    // 工具栏按钮：Import
    this.messageHandlers.set(
      WebviewMessageType.IMPORT_CONFIG,
      this.createConfigActionHandler('import-config-requested'),
    );

    // 工具栏按钮：Export
    this.messageHandlers.set(
      WebviewMessageType.EXPORT_CONFIG,
      this.createConfigActionHandler('export-config-requested'),
    );

    // 工具栏按钮：Reset
    this.messageHandlers.set(
      WebviewMessageType.RESET_CONFIG,
      this.createConfigActionHandler('reset-config-requested'),
    );

    // Edit as Text按钮
    this.messageHandlers.set(
      WebviewMessageType.OPEN_CLANG_FORMAT_FILE,
      this.createConfigActionHandler('open-clang-format-file-requested'),
    );

    // 重新打开预览
    this.messageHandlers.set(
      WebviewMessageType.REOPEN_PREVIEW,
      async (payload, context) => {
        context.eventBus.emit('open-preview-requested', payload);
      },
    );

    // 微观预览请求
    this.messageHandlers.set(
      WebviewMessageType.GET_MICRO_PREVIEW,
      async (payload, context) => {
        this.logger.debug('Micro preview requested:', payload);
        context.eventBus.emit('micro-preview-requested', payload);
      },
    );

    // 宏观预览请求
    this.messageHandlers.set(
      WebviewMessageType.GET_MACRO_PREVIEW,
      async (payload, context) => {
        this.logger.debug('Macro preview requested:', payload);
        context.eventBus.emit('macro-preview-requested', payload);
      },
    );

    // 设置更新
    this.messageHandlers.set(
      WebviewMessageType.UPDATE_SETTINGS,
      async (payload, context) => {
        this.logger.debug('Settings updated:', payload);
        // 这里可以处理应用程序设置的更新
        // 比如显示/隐藏指南按钮等
        context.eventBus.emit('settings-updated', payload);
      },
    );

    // 配置选项悬停
    this.messageHandlers.set(
      WebviewMessageType.CONFIG_OPTION_HOVER,
      async (payload, context) => {
        this.logger.debug('Config option hover:', payload);
        // 这里可以处理选项悬停时的预览高亮
        context.eventBus.emit('config-option-hover', payload);
      },
    );

    // 配置选项焦点
    this.messageHandlers.set(
      WebviewMessageType.CONFIG_OPTION_FOCUS,
      async (payload, context) => {
        this.logger.debug('Config option focus:', payload);
        // 这里可以处理选项获得焦点时的操作
        context.eventBus.emit('config-option-focus', payload);
      },
    );

    // 清除高亮
    this.messageHandlers.set(
      WebviewMessageType.CLEAR_HIGHLIGHTS,
      async (payload, context) => {
        this.logger.debug('Clear highlights');
        // 这里可以处理清除预览高亮的操作
        context.eventBus.emit('clear-highlights', payload);
      },
    );

    // Webview 准备就绪
    this.messageHandlers.set(
      WebviewMessageType.WEBVIEW_READY,
      async (payload, context) => {
        this.logger.info('Webview is ready, triggering editor-fully-ready event');
        context.eventBus.emit('editor-fully-ready', payload);
      },
    );
  }

  /**
   * 验证消息基本格式
   */
  private validateMessage(message: any): message is WebviewMessage {
    return message && typeof message.type === 'string';
  }

  dispose(): void {
    this.messageHandlers.clear();
  }

  getStatus() {
    return {
      isInitialized: !!this.context,
      isHealthy: true,
      lastActivity: new Date(),
      errorCount: 0, // 可以在这里集成错误计数
    };
  }
}
