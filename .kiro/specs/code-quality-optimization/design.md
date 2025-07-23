# 代码质量优化设计文档

## 概述

本设计文档旨在解决Clotho插件中的代码质量问题，包括类型重复定义、多窗口限制、文件结构优化和性能改进。通过系统性的重构，提升代码的可维护性和用户体验。

## 架构

### 当前架构问题分析

1. **类型定义问题**
   - `VALIDATION_ERROR` 在 `types.ts` 中重复定义
   - 错误处理类型分散在多个文件中
   - 缺乏统一的类型导出机制

2. **多窗口限制问题**
   - `ClangFormatVisualEditorCoordinator` 使用单例模式限制多窗口
   - 面板状态管理与实例绑定，无法支持多实例
   - 预览编辑器与主面板强耦合

3. **文件结构问题**
   - 工具函数分散在各个模块中
   - 常量定义不够集中
   - 类型定义与业务逻辑混合

### 目标架构

```
src/
├── common/
│   ├── types/           # 统一类型定义
│   │   ├── index.ts     # 类型导出入口
│   │   ├── webview.ts   # Webview相关类型
│   │   ├── config.ts    # 配置相关类型
│   │   └── validation.ts # 验证相关类型
│   ├── utils/           # 工具函数
│   │   ├── index.ts     # 工具函数导出入口
│   │   ├── file.ts      # 文件操作工具
│   │   ├── format.ts    # 格式化工具
│   │   └── validation.ts # 验证工具
│   ├── constants/       # 常量定义
│   │   ├── index.ts     # 常量导出入口
│   │   ├── commands.ts  # 命令常量
│   │   ├── messages.ts  # 消息类型常量
│   │   └── ui.ts        # UI相关常量
│   └── services/        # 基础服务
│       ├── error-handler.ts
│       ├── service-container.ts
│       └── instance-manager.ts  # 新增：实例管理器
├── visual-editor/
│   └── clang-format/
│       ├── core/        # 核心业务逻辑
│       │   ├── coordinator.ts
│       │   ├── format-service.ts
│       │   └── preview-provider.ts
│       ├── ui/          # UI相关
│       │   ├── panel-manager.ts    # 新增：面板管理器
│       │   └── webview-handler.ts  # 新增：Webview消息处理
│       └── config/      # 配置相关
│           ├── config-options.ts
│           └── guide-service.ts
```

## 组件和接口

### 1. 实例管理器 (InstanceManager)

```typescript
interface InstanceManager<T> {
    create(id: string, factory: () => T): T;
    get(id: string): T | undefined;
    getAll(): Map<string, T>;
    destroy(id: string): boolean;
    destroyAll(): void;
}

class ClangFormatInstanceManager implements InstanceManager<ClangFormatEditorInstance> {
    private instances = new Map<string, ClangFormatEditorInstance>();
    
    create(id: string, factory: () => ClangFormatEditorInstance): ClangFormatEditorInstance;
    get(id: string): ClangFormatEditorInstance | undefined;
    getAll(): Map<string, ClangFormatEditorInstance>;
    destroy(id: string): boolean;
    destroyAll(): void;
}
```

### 2. 面板管理器 (PanelManager)

```typescript
interface PanelManager {
    createPanel(id: string, options: PanelOptions): vscode.WebviewPanel;
    getPanel(id: string): vscode.WebviewPanel | undefined;
    destroyPanel(id: string): boolean;
    focusPanel(id: string): boolean;
}

class ClangFormatPanelManager implements PanelManager {
    private panels = new Map<string, vscode.WebviewPanel>();
    
    createPanel(id: string, options: PanelOptions): vscode.WebviewPanel;
    getPanel(id: string): vscode.WebviewPanel | undefined;
    destroyPanel(id: string): boolean;
    focusPanel(id: string): boolean;
}
```

### 3. 统一类型系统

```typescript
// common/types/webview.ts
export enum WebviewMessageType {
    // 配置相关
    INITIALIZE = 'initialize',
    CONFIG_LOADED = 'configLoaded',
    CONFIG_UPDATED = 'configUpdated',
    SAVE_CONFIG = 'saveConfig',
    LOAD_CONFIG = 'loadConfig',
    RESET_CONFIG = 'resetConfig',
    VALIDATE_CONFIG = 'validateConfig',
    
    // 验证相关 - 修复重复定义
    VALIDATION_RESULT = 'validationResult',
    VALIDATION_ERROR = 'validationError',
    
    // 预览相关
    PREVIEW_OPENED = 'previewOpened',
    PREVIEW_CLOSED = 'previewClosed',
    REOPEN_PREVIEW = 'reopenPreview',
    PREVIEW_REOPENED = 'previewReopened',
    PREVIEW_REOPEN_FAILED = 'previewReopenFailed',
    
    // 交互联动相关
    CONFIG_OPTION_HOVER = 'configOptionHover',
}

// common/types/validation.ts
export interface ValidationResult {
    isValid: boolean;
    error?: string;
    warnings?: string[];
}

export interface ValidationMessage extends WebviewMessage {
    type: WebviewMessageType.VALIDATION_RESULT | WebviewMessageType.VALIDATION_ERROR;
    payload: ValidationResult;
}
```

### 4. 编辑器实例类

```typescript
interface ClangFormatEditorInstance {
    readonly id: string;
    readonly panel: vscode.WebviewPanel;
    readonly previewProvider: ClangFormatPreviewProvider;
    readonly formatService: ClangFormatService;
    
    initialize(): Promise<void>;
    dispose(): void;
    sendMessage(message: WebviewMessage): Promise<void>;
    handleMessage(message: WebviewMessage): Promise<void>;
}

class ClangFormatEditorInstanceImpl implements ClangFormatEditorInstance {
    constructor(
        public readonly id: string,
        private panelManager: PanelManager,
        private extensionUri: vscode.Uri
    ) {}
    
    async initialize(): Promise<void>;
    dispose(): void;
    async sendMessage(message: WebviewMessage): Promise<void>;
    async handleMessage(message: WebviewMessage): Promise<void>;
}
```

## 数据模型

### 配置数据模型

```typescript
interface ClangFormatConfig {
    [key: string]: any;
}

interface EditorState {
    config: ClangFormatConfig;
    isPreviewOpen: boolean;
    previewUri?: vscode.Uri;
    isDirty: boolean;
}

interface InstanceState {
    id: string;
    editorState: EditorState;
    panelState: {
        isVisible: boolean;
        viewColumn: vscode.ViewColumn;
    };
}
```

### 消息数据模型

```typescript
interface WebviewMessage {
    type: WebviewMessageType;
    payload?: any;
    instanceId?: string; // 新增：实例标识
}

interface ConfigUpdateMessage extends WebviewMessage {
    type: WebviewMessageType.CONFIG_UPDATED;
    payload: {
        config: ClangFormatConfig;
        key?: string;
    };
}

interface PreviewUpdateMessage extends WebviewMessage {
    type: WebviewMessageType.MICRO_PREVIEW_UPDATE;
    payload: {
        formattedCode: string;
        success: boolean;
        error?: string;
        key?: string;
    };
}
```

## 错误处理

### 统一错误处理策略

```typescript
// common/types/error.ts
export interface ErrorContext {
    operation: string;
    module: string;
    instanceId?: string;
    showToUser: boolean;
    logLevel: 'info' | 'warn' | 'error';
}

export class ErrorHandler {
    static handle(error: unknown, context: ErrorContext): void {
        const errorMessage = this.formatError(error, context);
        
        // 记录日志
        this.logError(errorMessage, context.logLevel);
        
        // 显示给用户（如果需要）
        if (context.showToUser) {
            this.showUserError(errorMessage, context);
        }
        
        // 发送遥测数据（如果配置）
        this.sendTelemetry(error, context);
    }
    
    private static formatError(error: unknown, context: ErrorContext): string;
    private static logError(message: string, level: string): void;
    private static showUserError(message: string, context: ErrorContext): void;
    private static sendTelemetry(error: unknown, context: ErrorContext): void;
}
```

### 实例级错误处理

```typescript
class InstanceErrorHandler {
    constructor(private instanceId: string) {}
    
    handle(error: unknown, operation: string, showToUser: boolean = false): void {
        ErrorHandler.handle(error, {
            operation,
            module: 'ClangFormatEditor',
            instanceId: this.instanceId,
            showToUser,
            logLevel: 'error'
        });
    }
}
```

## 测试策略

### 单元测试

1. **类型定义测试**
   - 验证类型导出的完整性
   - 检查类型兼容性
   - 测试类型推断

2. **实例管理测试**
   - 测试实例创建和销毁
   - 验证实例隔离
   - 测试并发访问

3. **错误处理测试**
   - 测试各种错误场景
   - 验证错误恢复机制
   - 测试用户友好的错误消息

### 集成测试

1. **多实例测试**
   - 同时创建多个编辑器实例
   - 验证实例间的独立性
   - 测试资源清理

2. **消息传递测试**
   - 测试Webview与扩展间的通信
   - 验证消息路由的正确性
   - 测试异步消息处理

### 性能测试

1. **内存使用测试**
   - 监控实例创建的内存开销
   - 检查内存泄漏
   - 测试长时间运行的稳定性

2. **响应时间测试**
   - 测试UI操作的响应时间
   - 验证配置更新的延迟
   - 测试预览生成的性能

## 实现优先级

### 第一阶段：基础重构
1. 修复类型重复定义问题
2. 创建统一的类型导出系统
3. 重构错误处理机制

### 第二阶段：多实例支持
1. 实现实例管理器
2. 重构Coordinator支持多实例
3. 更新面板管理逻辑

### 第三阶段：文件结构优化
1. 重新组织文件结构
2. 拆分大文件为小模块
3. 优化导入导出关系

### 第四阶段：性能优化
1. 优化内存使用
2. 改进异步操作
3. 添加性能监控

## 向后兼容性

### API兼容性
- 保持现有命令接口不变
- 维护配置文件格式兼容性
- 确保用户设置迁移平滑

### 用户体验兼容性
- 保持现有快捷键和菜单项
- 维护相同的UI布局和交互方式
- 确保配置文件的向后兼容

### 迁移策略
1. 渐进式重构，避免破坏性变更
2. 提供配置迁移工具（如需要）
3. 保留旧API的兼容层（临时）