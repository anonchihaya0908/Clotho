import { BaseManager, ManagerContext, WebviewMessage, WebviewMessageType } from '../../../common/types';

type MessageHandlerFunction = (payload: any, context: ManagerContext) => Promise<void>;

/**
 * Webview 消息处理器
 * 负责路由、验证和处理所有来自webview的消息
 */
export class MessageHandler implements BaseManager {
    readonly name = 'MessageHandler';

    private context!: ManagerContext;
    private messageHandlers = new Map<string, MessageHandlerFunction>();

    async initialize(context: ManagerContext): Promise<void> {
        this.context = context;
        this.setupMessageHandlers();
        console.log('MessageHandler initialized.');
    }

    /**
     * 处理从Webview接收到的消息
     * @param message 消息对象
     */
    async handleMessage(message: WebviewMessage): Promise<void> {
        console.log('🔍 DEBUG: MessageHandler processing message:', message.type, message.payload);

        if (!this.validateMessage(message)) {
            const error = new Error(`Invalid message format: ${JSON.stringify(message)}`);
            await this.context.errorRecovery.handleError('message-validation-failed', error, { message });
            return;
        }

        const handler = this.messageHandlers.get(message.type);
        if (!handler) {
            console.warn(`No handler found for message type: ${message.type}`);
            console.log('Available handlers:', Array.from(this.messageHandlers.keys()));
            return;
        }

        try {
            console.log(`Handling message: ${message.type}`);
            await handler(message.payload, this.context);
        } catch (error: any) {
            await this.context.errorRecovery.handleError('message-handling-failed', error, {
                messageType: message.type,
                payload: message.payload,
            });
        }
    }

    /**
     * 注册不同消息类型的处理函数
     */
    private setupMessageHandlers(): void {
        // 配置变更处理函数
        const handleConfigChange = async (payload: any, context: ManagerContext) => {
            const { key, value } = payload;
            const currentState = context.stateManager.getState();
            const newConfig = { ...currentState.currentConfig };

            if (value === 'inherit' || value === undefined || value === null) {
                delete newConfig[key];
            } else {
                newConfig[key] = value;
            }

            await context.stateManager.updateState(
                {
                    currentConfig: newConfig,
                    configDirty: true,
                },
                'config-changed'
            );

            // 通知预览更新
            context.eventBus.emit('config-updated-for-preview', { newConfig });
        };

        // 配置变更 - 支持两种消息类型格式
        this.messageHandlers.set(WebviewMessageType.CONFIG_CHANGED, handleConfigChange);
        this.messageHandlers.set(WebviewMessageType.CONFIG_CHANGED_ALT, handleConfigChange); // WebView 实际发送的格式

        // 工具栏按钮：Load（快速设置/加载工作区配置）
        this.messageHandlers.set(WebviewMessageType.LOAD_WORKSPACE_CONFIG, async (payload, context) => {
            console.log('🔄 Loading workspace config...');
            context.eventBus.emit('load-workspace-config-requested', payload);
        });

        // 工具栏按钮：Save
        this.messageHandlers.set(WebviewMessageType.SAVE_CONFIG, async (payload, context) => {
            console.log('💾 Saving config...');
            context.eventBus.emit('save-config-requested', payload);
        });

        // 工具栏按钮：Import
        this.messageHandlers.set(WebviewMessageType.IMPORT_CONFIG_FILE, async (payload, context) => {
            console.log('📥 Importing config...');
            context.eventBus.emit('import-config-requested', payload);
        });

        // 工具栏按钮：Export
        this.messageHandlers.set(WebviewMessageType.EXPORT_CONFIG_FILE, async (payload, context) => {
            console.log('📤 Exporting config...');
            context.eventBus.emit('export-config-requested', payload);
        });

        // 工具栏按钮：Reset
        this.messageHandlers.set(WebviewMessageType.RESET_CONFIG_TO_DEFAULT, async (payload, context) => {
            console.log('🔄 Resetting config...');
            context.eventBus.emit('reset-config-requested', payload);
        });

        // Edit as Text按钮
        this.messageHandlers.set(WebviewMessageType.OPEN_CLANG_FORMAT_FILE, async (payload, context) => {
            console.log('📝 Opening clang-format file for text editing...');
            context.eventBus.emit('open-clang-format-file-requested', payload);
        });

        // 重新打开预览
        this.messageHandlers.set(WebviewMessageType.REOPEN_PREVIEW, async (payload, context) => {
            context.eventBus.emit('open-preview-requested', payload);
        });

        // 测试占位符功能（调试用）
        this.messageHandlers.set('testPlaceholder', async (payload, context) => {
            console.log('🧪 Test placeholder functionality triggered');
            context.eventBus.emit('close-preview-requested');
        });

        // 微观预览请求
        this.messageHandlers.set(WebviewMessageType.GET_MICRO_PREVIEW, async (payload, context) => {
            console.log('🔍 Micro preview requested:', payload);
            context.eventBus.emit('micro-preview-requested', payload);
        });

        // 宏观预览请求
        this.messageHandlers.set(WebviewMessageType.GET_MACRO_PREVIEW, async (payload, context) => {
            console.log('🔍 Macro preview requested:', payload);
            context.eventBus.emit('macro-preview-requested', payload);
        });

        // 设置更新
        this.messageHandlers.set(WebviewMessageType.UPDATE_SETTINGS, async (payload, context) => {
            console.log('⚙️ Settings updated:', payload);
            // 这里可以处理应用程序设置的更新
            // 比如显示/隐藏指南按钮等
            context.eventBus.emit('settings-updated', payload);
        });

        // 配置选项悬停
        this.messageHandlers.set(WebviewMessageType.CONFIG_OPTION_HOVER, async (payload, context) => {
            console.log('🎯 Config option hover:', payload);
            // 这里可以处理选项悬停时的预览高亮
            context.eventBus.emit('config-option-hover', payload);
        });

        // 配置选项焦点
        this.messageHandlers.set(WebviewMessageType.CONFIG_OPTION_FOCUS, async (payload, context) => {
            console.log('🎯 Config option focus:', payload);
            // 这里可以处理选项获得焦点时的操作
            context.eventBus.emit('config-option-focus', payload);
        });

        // 清除高亮
        this.messageHandlers.set(WebviewMessageType.CLEAR_HIGHLIGHTS, async (payload, context) => {
            console.log('🧹 Clear highlights');
            // 这里可以处理清除预览高亮的操作
            context.eventBus.emit('clear-highlights', payload);
        });

        // Webview 准备就绪
        this.messageHandlers.set(WebviewMessageType.WEBVIEW_READY, async (payload, context) => {
            console.log('✅ Webview is ready, triggering editor-fully-ready event');
            context.eventBus.emit('editor-fully-ready', payload);
        });
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