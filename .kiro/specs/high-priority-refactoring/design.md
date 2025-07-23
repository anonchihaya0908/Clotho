# 高优先级代码重构设计文档

## 概述

本设计文档描述了如何将臃肿的coordinator.ts文件重构为多个职责明确的模块，建立统一的状态管理系统，完善错误边界处理，同时保持向后兼容性和提升代码质量。

## 架构设计

### 当前问题分析

```
当前架构问题：
┌─────────────────────────────────────────────────────────────────┐
│                ClangFormatVisualEditorCoordinator               │
│                        (1300+ 行代码)                           │
│                                                                 │
│  ❌ 编辑器管理    ❌ 预览管理    ❌ 彩蛋管理                    │
│  ❌ 消息处理      ❌ 状态管理    ❌ 错误处理                    │
│  ❌ 配置管理      ❌ 文件操作    ❌ UI管理                      │
│                                                                 │
│  问题：                                                         │
│  • 职责不清，难以理解和维护                                    │
│  • 状态分散，容易出现同步问题                                  │
│  • 错误处理不统一，恢复机制不完善                             │
│  • 测试困难，依赖关系复杂                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 目标架构

```
重构后的模块化架构：
┌─────────────────────────────────────────────────────────────────┐
│                    ClangFormatEditorCoordinator                  │
│                        (轻量级协调器)                           │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Editor    │  │   Preview   │  │ EasterEgg   │  │ Message │ │
│  │  Manager    │  │  Manager    │  │  Manager    │  │ Handler │ │
│  │             │  │             │  │             │  │         │ │
│  │ • 创建面板  │  │ • 预览编辑  │  │ • 彩蛋显示  │  │ • 消息  │ │
│  │ • 生命周期  │  │ • 文档管理  │  │ • 角色管理  │  │   路由  │ │
│  │ • 配置管理  │  │ • 高亮联动  │  │ • 过渡动画  │  │ • 验证  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│           │               │               │               │     │
│           └───────────────┼───────────────┼───────────────┘     │
│                           │               │                     │
│  ┌─────────────────────────┼───────────────┼─────────────────┐   │
│  │                   EditorStateManager                     │   │
│  │                                                          │   │
│  │  • 统一状态存储和管理                                   │   │
│  │  • 状态变化事件通知                                     │   │
│  │  • 状态一致性保证                                       │   │
│  │  • 状态持久化和恢复                                     │   │
│  └─────────────────────────┼───────────────┼─────────────────┘   │
│                           │               │                     │
│  ┌─────────────────────────┼───────────────┼─────────────────┐   │
│  │                 ErrorRecoveryManager                     │   │
│  │                                                          │   │
│  │  • 错误边界处理                                         │   │
│  │  • 自动恢复机制                                         │   │
│  │  • 降级策略                                             │   │
│  │  • 错误上报和日志                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 详细设计

### 1. 核心接口定义

#### 编辑器状态接口

```typescript
/**
 * 编辑器状态定义
 */
interface EditorState {
    // 基础状态
    isInitialized: boolean;
    isVisible: boolean;
    
    // 预览状态
    previewMode: 'open' | 'closed' | 'transitioning';
    previewUri?: vscode.Uri;
    previewEditor?: vscode.TextEditor;
    
    // 彩蛋状态
    easterEggMode: 'hidden' | 'visible' | 'transitioning';
    easterEggPanel?: vscode.WebviewPanel;
    currentCharacter?: CharacterInfo;
    
    // 配置状态
    currentConfig: Record<string, any>;
    configDirty: boolean;
    
    // 错误状态
    lastError?: EditorError;
    recoveryAttempts: number;
}

/**
 * 状态变化事件
 */
interface StateChangeEvent {
    type: 'preview' | 'easter-egg' | 'config' | 'error';
    from: any;
    to: any;
    timestamp: number;
    source: string;
}

/**
 * 编辑器错误信息
 */
interface EditorError {
    code: string;
    message: string;
    context: Record<string, any>;
    timestamp: number;
    recoverable: boolean;
}
```

#### 管理器基础接口

```typescript
/**
 * 基础管理器接口
 */
interface BaseManager {
    readonly name: string;
    initialize(context: ManagerContext): Promise<void>;
    dispose(): void;
    getStatus(): ManagerStatus;
}

/**
 * 管理器上下文
 */
interface ManagerContext {
    extensionUri: vscode.Uri;
    stateManager: EditorStateManager;
    errorRecovery: ErrorRecoveryManager;
    eventBus: EventBus;
}

/**
 * 管理器状态
 */
interface ManagerStatus {
    isInitialized: boolean;
    isHealthy: boolean;
    lastActivity: Date;
    errorCount: number;
}
```

### 2. 状态管理器设计

```typescript
/**
 * 编辑器状态管理器
 */
class EditorStateManager implements vscode.Disposable {
    private state: EditorState;
    private eventBus: EventBus;
    private stateHistory: StateSnapshot[];
    private disposables: vscode.Disposable[] = [];

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
        this.state = this.createInitialState();
        this.stateHistory = [];
    }

    /**
     * 获取当前状态（只读）
     */
    getState(): Readonly<EditorState> {
        return Object.freeze({ ...this.state });
    }

    /**
     * 更新状态（原子操作）
     */
    async updateState(updates: Partial<EditorState>, source: string): Promise<void> {
        const oldState = { ...this.state };
        const newState = { ...this.state, ...updates };
        
        // 验证状态一致性
        if (!this.validateStateTransition(oldState, newState)) {
            throw new Error(`Invalid state transition from ${source}`);
        }

        // 保存历史快照
        this.saveSnapshot(oldState, source);
        
        // 更新状态
        this.state = newState;
        
        // 发布变化事件
        await this.notifyStateChange(oldState, newState, source);
    }

    /**
     * 回滚到上一个稳定状态
     */
    async rollbackToPreviousState(): Promise<void> {
        const lastSnapshot = this.getLastStableSnapshot();
        if (lastSnapshot) {
            this.state = lastSnapshot.state;
            await this.notifyStateChange(this.state, lastSnapshot.state, 'rollback');
        }
    }

    /**
     * 重置到安全状态
     */
    async resetToSafeState(): Promise<void> {
        const safeState = this.createSafeState();
        await this.updateState(safeState, 'safety-reset');
    }

    // 私有方法...
    private validateStateTransition(from: EditorState, to: EditorState): boolean {
        // 状态转换验证逻辑
        return true;
    }

    private async notifyStateChange(from: EditorState, to: EditorState, source: string): Promise<void> {
        const event: StateChangeEvent = {
            type: this.detectChangeType(from, to),
            from,
            to,
            timestamp: Date.now(),
            source
        };
        
        await this.eventBus.emit('state-changed', event);
    }
}
```

### 3. 管理器实现

#### 编辑器管理器

```typescript
/**
 * 编辑器管理器
 * 负责主webview面板的创建、配置和生命周期管理
 */
class ClangFormatEditorManager implements BaseManager {
    readonly name = 'EditorManager';
    
    private panel?: vscode.WebviewPanel;
    private context!: ManagerContext;

    async initialize(context: ManagerContext): Promise<void> {
        this.context = context;
        // 初始化逻辑
    }

    /**
     * 创建编辑器面板
     */
    async createEditor(source: EditorOpenSource): Promise<vscode.WebviewPanel> {
        try {
            // 创建webview面板
            this.panel = vscode.window.createWebviewPanel(
                'clangFormatEditor',
                'Clang-Format Editor',
                vscode.ViewColumn.One,
                this.getWebviewOptions()
            );

            // 设置HTML内容
            this.panel.webview.html = await this.generateWebviewContent();

            // 设置事件监听
            this.setupPanelEventListeners();

            // 更新状态
            await this.context.stateManager.updateState({
                isVisible: true,
                isInitialized: true
            }, 'editor-created');

            return this.panel;

        } catch (error) {
            await this.context.errorRecovery.handleError('editor-creation-failed', error);
            throw error;
        }
    }

    /**
     * 关闭编辑器
     */
    async closeEditor(): Promise<void> {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
            
            await this.context.stateManager.updateState({
                isVisible: false
            }, 'editor-closed');
        }
    }

    // 其他方法...
}
```

#### 预览管理器

```typescript
/**
 * 预览编辑器管理器
 * 负责预览文档的创建、更新和生命周期管理
 */
class PreviewEditorManager implements BaseManager {
    readonly name = 'PreviewManager';
    
    private previewProvider: ClangFormatPreviewProvider;
    private context!: ManagerContext;

    async initialize(context: ManagerContext): Promise<void> {
        this.context = context;
        this.previewProvider = ClangFormatPreviewProvider.getInstance();
        
        // 监听文档关闭事件
        this.setupDocumentEventListeners();
    }

    /**
     * 打开预览编辑器
     */
    async openPreview(): Promise<vscode.TextEditor> {
        try {
            // 创建预览URI
            const previewUri = this.previewProvider.createPreviewUri(`preview-${Date.now()}.cpp`);
            
            // 生成初始内容
            const initialContent = await this.generatePreviewContent();
            this.previewProvider.updateContent(previewUri, initialContent);
            
            // 打开编辑器
            const editor = await vscode.window.showTextDocument(previewUri, {
                viewColumn: vscode.ViewColumn.Two,
                preserveFocus: true,
                preview: false
            });

            // 更新状态
            await this.context.stateManager.updateState({
                previewMode: 'open',
                previewUri,
                previewEditor: editor
            }, 'preview-opened');

            return editor;

        } catch (error) {
            await this.context.errorRecovery.handleError('preview-creation-failed', error);
            throw error;
        }
    }

    /**
     * 关闭预览编辑器
     */
    async closePreview(): Promise<void> {
        const state = this.context.stateManager.getState();
        
        if (state.previewUri) {
            try {
                // 关闭编辑器标签页
                await this.closePreviewTab(state.previewUri);
                
                // 清理内容
                this.previewProvider.clearContent(state.previewUri);
                
                // 更新状态
                await this.context.stateManager.updateState({
                    previewMode: 'closed',
                    previewUri: undefined,
                    previewEditor: undefined
                }, 'preview-closed');

            } catch (error) {
                await this.context.errorRecovery.handleError('preview-close-failed', error);
            }
        }
    }

    // 私有方法...
    private async closePreviewTab(uri: vscode.Uri): Promise<void> {
        // 使用tabGroups API关闭标签页
        if (vscode.window.tabGroups) {
            for (const tabGroup of vscode.window.tabGroups.all) {
                for (const tab of tabGroup.tabs) {
                    if (tab.input && typeof tab.input === 'object' && 'uri' in tab.input) {
                        const tabUri = (tab.input as any).uri;
                        if (tabUri && tabUri.toString() === uri.toString()) {
                            await vscode.window.tabGroups.close(tab);
                        }
                    }
                }
            }
        }
    }
}
```

#### 彩蛋管理器

```typescript
/**
 * 彩蛋管理器
 * 负责彩蛋webview的创建、角色管理和过渡动画
 */
class EasterEggManager implements BaseManager {
    readonly name = 'EasterEggManager';
    
    private easterEggController: SimpleEasterEggWebviewController;
    private transitionManager: TransitionManager;
    private context!: ManagerContext;

    async initialize(context: ManagerContext): Promise<void> {
        this.context = context;
        this.transitionManager = new TransitionManager(context.extensionUri);
        this.easterEggController = new SimpleEasterEggWebviewController(
            context.extensionUri,
            () => this.handleReopenPreview()
        );
    }

    /**
     * 显示彩蛋webview
     */
    async showEasterEgg(): Promise<vscode.WebviewPanel> {
        try {
            // 使用过渡管理器创建彩蛋
            const panel = await this.transitionManager.switchToEasterEgg(async () => {
                return await this.easterEggController.createEasterEggWebview();
            });

            // 更新状态
            await this.context.stateManager.updateState({
                easterEggMode: 'visible',
                easterEggPanel: panel
            }, 'easter-egg-shown');

            return panel;

        } catch (error) {
            await this.context.errorRecovery.handleError('easter-egg-creation-failed', error);
            throw error;
        }
    }

    /**
     * 隐藏彩蛋webview
     */
    async hideEasterEgg(): Promise<void> {
        const state = this.context.stateManager.getState();
        
        if (state.easterEggPanel) {
            try {
                state.easterEggPanel.dispose();
                
                await this.context.stateManager.updateState({
                    easterEggMode: 'hidden',
                    easterEggPanel: undefined
                }, 'easter-egg-hidden');

            } catch (error) {
                await this.context.errorRecovery.handleError('easter-egg-hide-failed', error);
            }
        }
    }

    /**
     * 处理重新打开预览请求
     */
    private async handleReopenPreview(): Promise<void> {
        // 通知事件总线，让预览管理器处理
        await this.context.eventBus.emit('reopen-preview-requested', {});
    }
}
```

### 4. 错误恢复管理器

```typescript
/**
 * 错误恢复管理器
 * 提供统一的错误处理和自动恢复机制
 */
class ErrorRecoveryManager implements vscode.Disposable {
    private recoveryStrategies = new Map<string, RecoveryStrategy>();
    private errorHistory: EditorError[] = [];
    private maxRecoveryAttempts = 3;

    constructor(
        private stateManager: EditorStateManager,
        private eventBus: EventBus
    ) {
        this.setupRecoveryStrategies();
    }

    /**
     * 处理错误并尝试恢复
     */
    async handleError(errorCode: string, error: any, context?: Record<string, any>): Promise<void> {
        const editorError: EditorError = {
            code: errorCode,
            message: error.message || String(error),
            context: context || {},
            timestamp: Date.now(),
            recoverable: this.isRecoverable(errorCode)
        };

        // 记录错误
        this.errorHistory.push(editorError);
        console.error(`[ErrorRecovery] ${errorCode}:`, error);

        // 更新状态
        await this.stateManager.updateState({
            lastError: editorError
        }, 'error-occurred');

        // 尝试恢复
        if (editorError.recoverable) {
            await this.attemptRecovery(errorCode, editorError);
        } else {
            // 不可恢复的错误，重置到安全状态
            await this.stateManager.resetToSafeState();
            vscode.window.showErrorMessage(`插件遇到严重错误，已重置到安全状态: ${editorError.message}`);
        }
    }

    /**
     * 尝试恢复
     */
    private async attemptRecovery(errorCode: string, error: EditorError): Promise<void> {
        const strategy = this.recoveryStrategies.get(errorCode);
        const currentState = this.stateManager.getState();

        if (strategy && currentState.recoveryAttempts < this.maxRecoveryAttempts) {
            try {
                await strategy.recover(error, this.stateManager);
                
                // 恢复成功，清除错误状态
                await this.stateManager.updateState({
                    lastError: undefined,
                    recoveryAttempts: 0
                }, 'recovery-successful');

            } catch (recoveryError) {
                // 恢复失败，增加尝试次数
                await this.stateManager.updateState({
                    recoveryAttempts: currentState.recoveryAttempts + 1
                }, 'recovery-failed');

                if (currentState.recoveryAttempts >= this.maxRecoveryAttempts) {
                    // 超过最大尝试次数，重置到安全状态
                    await this.stateManager.resetToSafeState();
                    vscode.window.showWarningMessage(`插件多次恢复失败，已重置到安全状态`);
                }
            }
        }
    }

    /**
     * 设置恢复策略
     */
    private setupRecoveryStrategies(): void {
        // 预览创建失败恢复策略
        this.recoveryStrategies.set('preview-creation-failed', {
            async recover(error: EditorError, stateManager: EditorStateManager): Promise<void> {
                // 回退到彩蛋模式
                await stateManager.updateState({
                    previewMode: 'closed',
                    easterEggMode: 'visible'
                }, 'fallback-to-easter-egg');
            }
        });

        // 彩蛋创建失败恢复策略
        this.recoveryStrategies.set('easter-egg-creation-failed', {
            async recover(error: EditorError, stateManager: EditorStateManager): Promise<void> {
                // 显示简单占位符
                await stateManager.updateState({
                    easterEggMode: 'hidden',
                    previewMode: 'closed'
                }, 'fallback-to-placeholder');
            }
        });

        // 编辑器创建失败恢复策略
        this.recoveryStrategies.set('editor-creation-failed', {
            async recover(error: EditorError, stateManager: EditorStateManager): Promise<void> {
                // 延迟重试
                await new Promise(resolve => setTimeout(resolve, 1000));
                // 这里可以触发重新创建编辑器的逻辑
            }
        });
    }

    /**
     * 判断错误是否可恢复
     */
    private isRecoverable(errorCode: string): boolean {
        const recoverableErrors = [
            'preview-creation-failed',
            'easter-egg-creation-failed',
            'webview-communication-failed',
            'state-update-failed'
        ];
        
        return recoverableErrors.includes(errorCode);
    }
}

/**
 * 恢复策略接口
 */
interface RecoveryStrategy {
    recover(error: EditorError, stateManager: EditorStateManager): Promise<void>;
}
```

### 5. 消息处理器

```typescript
/**
 * 消息处理器
 * 负责webview消息的路由、验证和处理
 */
class MessageHandler implements BaseManager {
    readonly name = 'MessageHandler';
    
    private context!: ManagerContext;
    private messageHandlers = new Map<string, MessageHandlerFunction>();

    async initialize(context: ManagerContext): Promise<void> {
        this.context = context;
        this.setupMessageHandlers();
    }

    /**
     * 处理webview消息
     */
    async handleMessage(message: WebviewMessage): Promise<void> {
        try {
            // 验证消息
            if (!this.validateMessage(message)) {
                throw new Error(`Invalid message format: ${JSON.stringify(message)}`);
            }

            // 查找处理器
            const handler = this.messageHandlers.get(message.type);
            if (!handler) {
                console.warn(`No handler found for message type: ${message.type}`);
                return;
            }

            // 执行处理器
            await handler(message.payload, this.context);

        } catch (error) {
            await this.context.errorRecovery.handleError('message-handling-failed', error, {
                messageType: message.type,
                payload: message.payload
            });
        }
    }

    /**
     * 设置消息处理器
     */
    private setupMessageHandlers(): void {
        this.messageHandlers.set(WebviewMessageType.CONFIG_CHANGED, async (payload, context) => {
            const { key, value } = payload;
            
            // 更新配置状态
            const currentState = context.stateManager.getState();
            const newConfig = { ...currentState.currentConfig };
            
            if (value === 'inherit' || value === undefined || value === null) {
                delete newConfig[key];
            } else {
                newConfig[key] = value;
            }

            await context.stateManager.updateState({
                currentConfig: newConfig,
                configDirty: true
            }, 'config-changed');

            // 通知预览更新
            await context.eventBus.emit('config-updated', { key, value });
        });

        this.messageHandlers.set(WebviewMessageType.REOPEN_PREVIEW, async (payload, context) => {
            await context.eventBus.emit('reopen-preview-requested', payload);
        });

        // 其他消息处理器...
    }

    private validateMessage(message: any): message is WebviewMessage {
        return message && typeof message.type === 'string';
    }
}

type MessageHandlerFunction = (payload: any, context: ManagerContext) => Promise<void>;
```

### 6. 主协调器重构

```typescript
/**
 * 重构后的轻量级主协调器
 * 只负责协调各个管理器，不包含具体的业务逻辑
 */
export class ClangFormatEditorCoordinator implements vscode.Disposable {
    private stateManager: EditorStateManager;
    private errorRecovery: ErrorRecoveryManager;
    private eventBus: EventBus;
    
    private editorManager: ClangFormatEditorManager;
    private previewManager: PreviewEditorManager;
    private easterEggManager: EasterEggManager;
    private messageHandler: MessageHandler;
    
    private disposables: vscode.Disposable[] = [];

    constructor(private extensionUri: vscode.Uri) {
        // 初始化核心服务
        this.eventBus = new EventBus();
        this.stateManager = new EditorStateManager(this.eventBus);
        this.errorRecovery = new ErrorRecoveryManager(this.stateManager, this.eventBus);
        
        // 初始化管理器
        this.editorManager = new ClangFormatEditorManager();
        this.previewManager = new PreviewEditorManager();
        this.easterEggManager = new EasterEggManager();
        this.messageHandler = new MessageHandler();
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 注册命令
        this.registerCommands();
    }

    /**
     * 显示编辑器
     */
    async showEditor(source: EditorOpenSource = EditorOpenSource.DIRECT): Promise<void> {
        try {
            // 创建管理器上下文
            const context: ManagerContext = {
                extensionUri: this.extensionUri,
                stateManager: this.stateManager,
                errorRecovery: this.errorRecovery,
                eventBus: this.eventBus
            };

            // 初始化所有管理器
            await this.initializeManagers(context);

            // 创建编辑器
            await this.editorManager.createEditor(source);

            // 打开预览（默认）
            await this.previewManager.openPreview();

        } catch (error) {
            await this.errorRecovery.handleError('coordinator-show-editor-failed', error);
        }
    }

    /**
     * 关闭编辑器
     */
    async closeEditor(): Promise<void> {
        try {
            // 关闭预览
            await this.previewManager.closePreview();
            
            // 隐藏彩蛋
            await this.easterEggManager.hideEasterEgg();
            
            // 关闭编辑器
            await this.editorManager.closeEditor();

        } catch (error) {
            await this.errorRecovery.handleError('coordinator-close-editor-failed', error);
        }
    }

    /**
     * 设置事件监听
     */
    private setupEventListeners(): void {
        // 监听预览关闭事件
        this.eventBus.on('preview-closed', async () => {
            await this.easterEggManager.showEasterEgg();
        });

        // 监听重新打开预览请求
        this.eventBus.on('reopen-preview-requested', async () => {
            await this.easterEggManager.hideEasterEgg();
            await this.previewManager.openPreview();
        });

        // 监听状态变化
        this.eventBus.on('state-changed', (event: StateChangeEvent) => {
            console.log(`State changed: ${event.type} from ${event.source}`);
        });
    }

    /**
     * 初始化管理器
     */
    private async initializeManagers(context: ManagerContext): Promise<void> {
        const managers = [
            this.editorManager,
            this.previewManager,
            this.easterEggManager,
            this.messageHandler
        ];

        for (const manager of managers) {
            try {
                await manager.initialize(context);
                console.log(`Initialized ${manager.name}`);
            } catch (error) {
                console.error(`Failed to initialize ${manager.name}:`, error);
                throw error;
            }
        }
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.stateManager.dispose();
        this.errorRecovery.dispose();
        // 清理其他资源...
    }
}
```

## 实现计划

### 阶段1：建立基础架构（第1-2天）
1. 创建状态管理器和事件总线
2. 实现错误恢复管理器
3. 定义所有核心接口

### 阶段2：重构管理器（第3-5天）
1. 拆分并实现编辑器管理器
2. 拆分并实现预览管理器
3. 拆分并实现彩蛋管理器
4. 实现消息处理器

### 阶段3：集成和测试（第6-7天）
1. 重构主协调器
2. 集成所有管理器
3. 编写单元测试
4. 进行集成测试

### 阶段4：优化和完善（第8-10天）
1. 性能优化
2. 错误处理完善
3. 向后兼容性验证
4. 文档更新

## 技术决策

### 1. 状态管理方案
- **选择**：中心化状态管理 + 事件驱动
- **理由**：确保状态一致性，便于调试和测试

### 2. 错误处理策略
- **选择**：错误边界 + 自动恢复 + 降级策略
- **理由**：提高系统稳定性，改善用户体验

### 3. 模块拆分原则
- **选择**：单一职责 + 依赖注入
- **理由**：提高代码可维护性和可测试性

### 4. 向后兼容性
- **选择**：保持原有API接口不变
- **理由**：确保现有功能不受影响

## 风险评估

### 高风险
- **状态同步问题**：多个管理器同时修改状态可能导致不一致
- **缓解措施**：使用原子操作和状态验证机制

### 中风险  
- **性能影响**：增加的抽象层可能影响性能
- **缓解措施**：进行性能测试和优化

### 低风险
- **向后兼容性**：重构可能破坏现有功能
- **缓解措施**：保持接口不变，增加兼容性测试
