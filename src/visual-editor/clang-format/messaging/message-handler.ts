import { createModuleLogger } from '../../../common/logger/unified-logger';
import { BaseManager, ManagerContext } from '../../../common/types';
import { WebviewMessage, WebviewMessageType, GetOptionsByCategoryRequest, SearchOptionsRequest, ConfigValue } from '../../../common/types/clang-format-shared';
import { UI_CONSTANTS } from '../../../common/constants';

// Type guards for common payloads
function isSettingsPayload(p: unknown): p is Record<string, unknown> {
  return !!p && typeof p === 'object';
}

type MessageHandlerFunction = (
  payload: unknown,
  context: ManagerContext,
) => Promise<void>;

/**
 * Webview 消息处理器
 * 负责路由、验证和处理所有来自webview的消息
 */
export class MessageHandler implements BaseManager {
  readonly name = 'MessageHandler';

  private context!: ManagerContext;
  private messageHandlers = new Map<string, MessageHandlerFunction>(); // kept for backward compatibility (not used in new switch-based handler)
  private readonly logger = createModuleLogger('MessageHandler');

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

    try {
      switch (message.type) {
        case WebviewMessageType.WEBVIEW_READY: {
          this.logger.info('Webview is ready, triggering editor initialization sequence', {
            module: 'MessageHandler',
            operation: 'webview-ready',
          });
          this.context.eventBus?.emit('editor-fully-ready', message.payload);
          break;
        }
        case WebviewMessageType.WEBVIEW_LOG: {
          const { level, message: logMessage, meta } = message.payload ?? {};
          const ctx = { metadata: meta ? { data: meta } : undefined } as Record<string, unknown>;
          switch (level) {
            case 'debug': this.logger.debug(`[Webview] ${logMessage || ''}`, ctx); break;
            case 'warn': this.logger.warn(`[Webview] ${logMessage || ''}`, ctx); break;
            case 'error': this.logger.error(`[Webview] ${logMessage || ''}`, undefined, ctx); break;
            default: this.logger.info(`[Webview] ${logMessage || ''}`, ctx);
          }
          break;
        }
        case WebviewMessageType.CONFIG_CHANGED: {
          const p = message.payload as { key?: unknown; value?: unknown };
          if (typeof p?.key === 'string') {
            this.context.eventBus?.emit('config-change-requested', { key: p.key, value: p.value as ConfigValue });
          } else {
            this.logger.warn('CONFIG_CHANGED payload missing key', { payload: p });
          }
          break;
        }
        case WebviewMessageType.LOAD_WORKSPACE_CONFIG: {
          this.context.eventBus?.emit('ensure-config-manager-ready');
          setTimeout(() => {
            this.context.eventBus?.emit('load-workspace-config-requested');
          }, UI_CONSTANTS.MESSAGE_HANDLER_DELAY);
          break;
        }
        case WebviewMessageType.SAVE_CONFIG: {
          this.context.eventBus?.emit('ensure-config-manager-ready');
          setTimeout(() => {
            this.context.eventBus?.emit('save-config-requested');
          }, UI_CONSTANTS.MESSAGE_HANDLER_DELAY);
          break;
        }
        case WebviewMessageType.EXPORT_CONFIG: {
          this.context.eventBus?.emit('ensure-config-manager-ready');
          setTimeout(() => {
            this.context.eventBus?.emit('export-config-requested');
          }, UI_CONSTANTS.MESSAGE_HANDLER_DELAY);
          break;
        }
        case WebviewMessageType.IMPORT_CONFIG: {
          this.context.eventBus?.emit('ensure-config-manager-ready');
          setTimeout(() => {
            this.context.eventBus?.emit('import-config-requested');
          }, UI_CONSTANTS.MESSAGE_HANDLER_DELAY);
          break;
        }
        case WebviewMessageType.RESET_CONFIG: {
          this.context.eventBus?.emit('ensure-config-manager-ready');
          setTimeout(() => {
            this.context.eventBus?.emit('reset-config-requested');
          }, UI_CONSTANTS.MESSAGE_HANDLER_DELAY);
          break;
        }
        case WebviewMessageType.OPEN_CLANG_FORMAT_FILE: {
          this.context.eventBus?.emit('ensure-config-manager-ready');
          setTimeout(() => {
            this.context.eventBus?.emit('open-clang-format-file-requested');
          }, UI_CONSTANTS.MESSAGE_HANDLER_DELAY);
          break;
        }
        case WebviewMessageType.REOPEN_PREVIEW: {
          this.context.eventBus?.emit('open-preview-requested', message.payload ?? { source: 'webview' });
          break;
        }
        case WebviewMessageType.GET_MICRO_PREVIEW: {
          this.logger.debug('Micro preview requested:', { payload: message.payload });
          this.context.eventBus?.emit('micro-preview-requested', message.payload);
          break;
        }
        case WebviewMessageType.GET_MACRO_PREVIEW: {
          this.logger.debug('Macro preview requested:', { payload: message.payload });
          this.context.eventBus?.emit('macro-preview-requested', message.payload ?? {});
          break;
        }
        case WebviewMessageType.UPDATE_SETTINGS: {
          this.logger.debug('Settings updated:', { payload: message.payload });
          this.context.eventBus?.emit('settings-updated', message.payload);
          break;
        }
        case WebviewMessageType.CONFIG_OPTION_HOVER: {
          this.context.eventBus?.emit('config-option-hover', message.payload);
          break;
        }
        case WebviewMessageType.CONFIG_OPTION_FOCUS: {
          this.context.eventBus?.emit('config-option-focus', message.payload);
          break;
        }
        case WebviewMessageType.CLEAR_HIGHLIGHTS: {
      this.context.eventBus?.emit('clear-highlights', message.payload);
      break;
    }
        case WebviewMessageType.GET_OPTIONS_BY_CATEGORY: {
          this.context.eventBus?.emit('get-options-by-category', message.payload as GetOptionsByCategoryRequest);
          break;
        }
        case WebviewMessageType.SEARCH_OPTIONS: {
          this.context.eventBus?.emit('search-options', message.payload as SearchOptionsRequest);
          break;
        }
    case WebviewMessageType.GET_ALL_OPTIONS: {
      this.context.eventBus?.emit('get-all-options');
      break;
    }
    default: {
      this.logger.warn(`Unhandled webview message: ${message.type}`);
    }
  }
    } catch (error: unknown) {
      if (this.context.errorRecovery) {
        await this.context.errorRecovery.handleError('message-handling-failed', error as Error, {
          messageType: message.type,
          payload: message.payload,
        });
      }
    }
  }

  /**
   * 创建配置操作处理函数（带按需初始化）
   */
  private createConfigActionHandler(eventName: string) {
    return async (payload: unknown, context: ManagerContext) => {
      this.logger.info(`Processing ${eventName}...`);

      // 先发送事件以确保 ConfigActionManager 被初始化
      context.eventBus?.emit('ensure-config-manager-ready');

      // Use centralized delay constant for message processing
      setTimeout(() => {
        context.eventBus?.emit(eventName, payload);
      }, UI_CONSTANTS.MESSAGE_HANDLER_DELAY);
    };
  }

  /**
   * 注册不同消息类型的处理函数
   */
  private setupMessageHandlers(): void {
    // 配置变更处理函数
    const handleConfigChange = async (
      payload: unknown,
      context: ManagerContext,
    ) => {
      this.logger.debug('Config changed, delegating to coordinator:', { payload });
      // 不直接处理，而是触发事件让 coordinator 统一处理
      context.eventBus?.emit('config-change-requested', payload);
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
        context.eventBus?.emit('open-preview-requested', payload);
      },
    );

    // 微观预览请求
    this.messageHandlers.set(
      WebviewMessageType.GET_MICRO_PREVIEW,
      async (payload, context) => {
        this.logger.debug('Micro preview requested:', { payload });
        context.eventBus?.emit('micro-preview-requested', payload);
      },
    );

    // 宏观预览请求
    this.messageHandlers.set(
      WebviewMessageType.GET_MACRO_PREVIEW,
      async (payload, context) => {
        this.logger.debug('Macro preview requested:', { payload });
        context.eventBus?.emit('macro-preview-requested', payload);
      },
    );

    // 设置更新
    this.messageHandlers.set(
      WebviewMessageType.UPDATE_SETTINGS,
      async (payload, context) => {
        if (isSettingsPayload(payload)) {
          this.logger.debug('Settings updated:', { payload });
        } else {
          this.logger.warn('Settings payload malformed', { payload });
        }
        // 这里可以处理应用程序设置的更新
        // 比如显示/隐藏指南按钮等
        context.eventBus?.emit('settings-updated', payload);
      },
    );

    // 配置选项悬停
    this.messageHandlers.set(
      WebviewMessageType.CONFIG_OPTION_HOVER,
      async (payload, context) => {
        this.logger.debug('Config option hover:', { payload });
        // 这里可以处理选项悬停时的预览高亮
        context.eventBus?.emit('config-option-hover', payload);
      },
    );

    // 配置选项焦点
    this.messageHandlers.set(
      WebviewMessageType.CONFIG_OPTION_FOCUS,
      async (payload, context) => {
        this.logger.debug('Config option focus:', { payload });
        // 这里可以处理选项获得焦点时的操作
        context.eventBus?.emit('config-option-focus', payload);
      },
    );

    // 清除高亮
    this.messageHandlers.set(
      WebviewMessageType.CLEAR_HIGHLIGHTS,
      async (payload, context) => {
        this.logger.debug('Clear highlights');
        // 这里可以处理清除预览高亮的操作
        context.eventBus?.emit('clear-highlights', payload);
      },
    );

    // Webview 准备就绪
    this.messageHandlers.set(
      WebviewMessageType.WEBVIEW_READY,
      async (payload, context) => {
        this.logger.info('Webview is ready, triggering editor initialization sequence', {
          module: 'MessageHandler',
          operation: 'webview-ready',
          message: 'Starting auto-load of workspace .clang-format file'
        });
        context.eventBus?.emit('editor-fully-ready', payload);
      },
    );
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
