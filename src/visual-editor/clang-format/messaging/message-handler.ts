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
        if (!this.validateMessage(message)) {
            const error = new Error(`Invalid message format: ${JSON.stringify(message)}`);
            await this.context.errorRecovery.handleError('message-validation-failed', error, { message });
            return;
        }

        const handler = this.messageHandlers.get(message.type);
        if (!handler) {
            console.warn(`No handler found for message type: ${message.type}`);
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
        // 配置变更
        this.messageHandlers.set(WebviewMessageType.CONFIG_CHANGED, async (payload, context) => {
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
        });

        // 重新打开预览
        this.messageHandlers.set(WebviewMessageType.REOPEN_PREVIEW, async (payload, context) => {
            context.eventBus.emit('reopen-preview-requested', payload);
        });

        // 测试占位符功能（调试用）
        this.messageHandlers.set(WebviewMessageType.TEST_PLACEHOLDER, async (payload, context) => {
            console.log('🧪 Test placeholder functionality triggered');
            // 强制关闭预览以测试功能
            context.eventBus.emit('close-preview-requested');
        });

        // 其他消息处理器...
        this.messageHandlers.set(WebviewMessageType.APPLY_CONFIG, async (payload, context) => {
            context.eventBus.emit('apply-config-requested', payload);
        });

        this.messageHandlers.set(WebviewMessageType.RESET_CONFIG, async (payload, context) => {
            context.eventBus.emit('reset-config-requested', payload);
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