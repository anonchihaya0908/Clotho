# 双Webview动漫角色彩蛋设计文档

## 概述

本设计文档描述了如何实现双webview架构来解决VSCode编辑器区域的"真空效应"问题。通过在用户关闭预览文档时立即创建一个动漫角色彩蛋webview作为占位符，保持界面布局的稳定性和用户体验的连续性。

## 架构

### 当前问题分析

VSCode编辑器区域的"真空效应"：
1. **编辑器组管理** - VSCode自动消除空的编辑器组
2. **布局重排** - 相邻组会自动扩展填补空间
3. **用户体验问题** - 突然的布局变化让用户感到不适

### 解决方案架构

```
正常状态：
┌─────────────────┬─────────────────┐
│   配置面板      │    预览文档     │
│  (Webview)      │   (TextEditor)  │
│                 │                 │
│  - 配置选项     │  - 格式化代码   │
│  - 实时预览     │  - 语法高亮     │
│  - 操作按钮     │  - 可编辑       │
└─────────────────┴─────────────────┘

用户关闭预览后：
┌─────────────────┬─────────────────┐
│   配置面板      │  动漫角色彩蛋   │
│  (Webview)      │   (Webview)     │
│                 │                 │
│  - 配置选项     │  - 角色图片     │
│  - 实时预览     │  - 角色信息     │
│  - 操作按钮     │  - 重开按钮     │
└─────────────────┴─────────────────┘
```

### 核心组件

#### 1. 双Webview管理器 (DualWebviewManager)

```typescript
interface DualWebviewManager {
    // 主配置面板
    configPanel: vscode.WebviewPanel;
    
    // 右侧内容（预览文档或彩蛋webview）
    rightContent: TextEditor | WebviewPanel;
    
    // 状态管理
    isPreviewMode: boolean;
    isEasterEggMode: boolean;
    
    // 核心方法
    switchToPreview(): Promise<void>;
    switchToEasterEgg(): Promise<void>;
    handlePreviewClosed(): Promise<void>;
}
```

#### 2. 彩蛋Webview控制器 (EasterEggWebviewController)

```typescript
interface EasterEggWebviewController {
    // 角色管理
    loadRandomCharacter(): Promise<CharacterInfo>;
    switchCharacter(): Promise<void>;
    
    // UI管理
    createEasterEggWebview(): vscode.WebviewPanel;
    updateCharacterDisplay(character: CharacterInfo): Promise<void>;
    
    // 事件处理
    handleReopenPreview(): Promise<void>;
    handleSwitchCharacter(): Promise<void>;
}
```

#### 3. 角色资源管理器 (CharacterResourceManager)

```typescript
interface CharacterResourceManager {
    // 资源发现
    scanCharacterImages(): Promise<string[]>;
    getRandomCharacter(): Promise<CharacterInfo>;
    
    // 资源处理
    loadCharacterInfo(imagePath: string): Promise<CharacterInfo>;
    generateWebviewUri(imagePath: string): vscode.Uri;
    
    // 缓存管理
    preloadCharacters(): Promise<void>;
    clearCache(): void;
}
```

## 组件和接口

### 数据模型

#### 角色信息模型

```typescript
interface CharacterInfo {
    id: string;
    name: string;
    description: string;
    imagePath: string;
    imageUri: vscode.Uri;
    tags: string[];
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface CharacterDatabase {
    characters: CharacterInfo[];
    lastUsed: string[];
    favorites: string[];
}
```

#### Webview状态模型

```typescript
interface WebviewState {
    type: 'config' | 'preview' | 'easter-egg';
    isVisible: boolean;
    viewColumn: vscode.ViewColumn;
    panel?: vscode.WebviewPanel;
    editor?: vscode.TextEditor;
}

interface DualWebviewState {
    left: WebviewState;
    right: WebviewState;
    mode: 'preview' | 'easter-egg';
    transitionInProgress: boolean;
}
```

### 核心接口

#### 1. 双Webview协调器接口

```typescript
interface IDualWebviewCoordinator {
    // 初始化
    initialize(): Promise<void>;
    
    // 模式切换
    switchToPreviewMode(): Promise<void>;
    switchToEasterEggMode(): Promise<void>;
    
    // 事件处理
    onPreviewClosed(): Promise<void>;
    onConfigPanelClosed(): Promise<void>;
    
    // 状态查询
    getCurrentMode(): 'preview' | 'easter-egg';
    isTransitioning(): boolean;
    
    // 清理
    dispose(): void;
}
```

#### 2. 彩蛋内容提供者接口

```typescript
interface IEasterEggContentProvider {
    // 内容生成
    generateEasterEggHTML(character: CharacterInfo): Promise<string>;
    generateCharacterCard(character: CharacterInfo): string;
    
    // 资源处理
    getWebviewResources(): { scripts: string[], styles: string[] };
    processCharacterImage(imagePath: string): Promise<string>;
    
    // 交互处理
    handleWebviewMessage(message: any): Promise<void>;
}
```

### 消息通信协议

#### Webview消息类型

```typescript
enum EasterEggMessageType {
    // 初始化
    INITIALIZE_EASTER_EGG = 'initializeEasterEgg',
    
    // 角色操作
    SWITCH_CHARACTER = 'switchCharacter',
    CHARACTER_UPDATED = 'characterUpdated',
    
    // 预览操作
    REOPEN_PREVIEW = 'reopenPreview',
    PREVIEW_REOPENED = 'previewReopened',
    
    // UI交互
    CHARACTER_HOVER = 'characterHover',
    CHARACTER_CLICK = 'characterClick',
    
    // 错误处理
    EASTER_EGG_ERROR = 'easterEggError'
}

interface EasterEggMessage {
    type: EasterEggMessageType;
    payload?: {
        character?: CharacterInfo;
        error?: string;
        action?: string;
    };
}
```

## 实现策略

### 1. 渐进式实现

#### 阶段1：基础双Webview架构
- 实现基本的双webview创建和管理
- 处理预览文档关闭事件
- 创建简单的占位符webview

#### 阶段2：彩蛋内容系统
- 实现角色图片扫描和加载
- 创建彩蛋webview的HTML/CSS/JS
- 实现随机角色选择逻辑

#### 阶段3：交互和动画
- 添加角色切换功能
- 实现hover效果和动画
- 优化用户交互体验

#### 阶段4：优化和完善
- 性能优化和内存管理
- 错误处理和边界情况
- 用户体验细节打磨

### 2. 事件驱动架构

```typescript
class DualWebviewEventManager {
    // 事件监听
    onPreviewDocumentClosed: Event<void>;
    onEasterEggWebviewCreated: Event<CharacterInfo>;
    onCharacterSwitched: Event<CharacterInfo>;
    onPreviewReopened: Event<void>;
    
    // 事件处理链
    private eventHandlers: Map<string, EventHandler[]>;
    
    // 事件分发
    emit(eventType: string, data?: any): void;
    subscribe(eventType: string, handler: EventHandler): void;
}
```

### 3. 防抖和稳定性策略

#### 防抖机制设计

```typescript
class DebounceManager {
    private timers = new Map<string, NodeJS.Timeout>();
    private locks = new Set<string>();
    
    // 防抖执行
    debounce<T extends any[]>(
        key: string, 
        fn: (...args: T) => Promise<void>, 
        delay: number = 100
    ): (...args: T) => Promise<void> {
        return async (...args: T) => {
            // 清除之前的定时器
            const existingTimer = this.timers.get(key);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }
            
            // 设置新的定时器
            return new Promise((resolve, reject) => {
                const timer = setTimeout(async () => {
                    try {
                        await fn(...args);
                        this.timers.delete(key);
                        resolve();
                    } catch (error) {
                        this.timers.delete(key);
                        reject(error);
                    }
                }, delay);
                
                this.timers.set(key, timer);
            });
        };
    }
    
    // 操作锁机制
    async withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
        if (this.locks.has(key)) {
            throw new Error(`Operation ${key} is already in progress`);
        }
        
        this.locks.add(key);
        try {
            return await operation();
        } finally {
            this.locks.delete(key);
        }
    }
}
```

#### 快速切换处理

```typescript
class TransitionManager {
    private transitionState: 'idle' | 'switching-to-preview' | 'switching-to-easter-egg' = 'idle';
    private pendingOperations: Array<() => Promise<void>> = [];
    
    async switchToEasterEgg(): Promise<void> {
        return this.debounceManager.withLock('webview-switch', async () => {
            if (this.transitionState !== 'idle') {
                console.log('Transition already in progress, queuing operation');
                return;
            }
            
            this.transitionState = 'switching-to-easter-egg';
            try {
                // 立即创建占位符，防止布局抖动
                await this.createPlaceholderWebview();
                
                // 异步加载实际内容
                await this.loadEasterEggContent();
                
                this.transitionState = 'idle';
            } catch (error) {
                this.transitionState = 'idle';
                throw error;
            }
        });
    }
    
    private async createPlaceholderWebview(): Promise<void> {
        // 极速创建基础webview结构，避免真空效应
        const placeholder = vscode.window.createWebviewPanel(
            'easterEggPlaceholder',
            'Loading...',
            vscode.ViewColumn.Two,
            { enableScripts: false }
        );
        
        placeholder.webview.html = `
            <html>
                <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                    <div style="text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 10px;">🎭</div>
                        <div>Loading character...</div>
                    </div>
                </body>
            </html>
        `;
    }
}
```

### 4. 资源管理策略

#### 图片资源处理
```typescript
class CharacterImageProcessor {
    // 图片优化
    optimizeImage(imagePath: string): Promise<string>;
    generateThumbnail(imagePath: string): Promise<string>;
    
    // 格式转换
    convertToWebviewUri(imagePath: string): vscode.Uri;
    encodeImageAsDataUri(imagePath: string): Promise<string>;
    
    // 缓存管理
    cacheImage(imagePath: string): Promise<void>;
    clearImageCache(): void;
}
```

#### 内存管理
```typescript
class WebviewMemoryManager {
    // 资源跟踪
    trackWebviewResources(panel: vscode.WebviewPanel): void;
    
    // 自动清理
    scheduleCleanup(delay: number): void;
    forceCleanup(): void;
    
    // 内存监控
    getMemoryUsage(): MemoryUsageInfo;
    isMemoryPressure(): boolean;
}
```

## 错误处理

### 错误分类和处理策略

#### 1. 资源加载错误
```typescript
class ResourceLoadingErrorHandler {
    handleImageLoadError(imagePath: string): Promise<CharacterInfo>;
    handleWebviewCreationError(): Promise<void>;
    provideFallbackContent(): string;
}
```

#### 2. 状态同步错误
```typescript
class StateSyncErrorHandler {
    handleWebviewStateDesync(): Promise<void>;
    recoverFromInvalidState(): Promise<void>;
    validateWebviewState(): boolean;
}
```

#### 3. 用户操作错误
```typescript
class UserOperationErrorHandler {
    handleRapidSwitching(): Promise<void>;
    handleConcurrentOperations(): Promise<void>;
    preventInvalidOperations(): void;
}
```

## 性能优化

### 1. 懒加载策略
- 角色图片按需加载
- Webview内容延迟渲染
- 资源预加载优化

### 2. 缓存机制
- 角色信息缓存
- 图片资源缓存
- Webview HTML模板缓存

### 3. 内存优化
- 及时释放不用的webview
- 图片资源压缩
- 事件监听器清理

## 用户体验设计

### 1. 过渡动画
```css
.character-transition {
    transition: all 0.3s ease-in-out;
    transform: translateY(0);
    opacity: 1;
}

.character-enter {
    transform: translateY(20px);
    opacity: 0;
}

.character-hover {
    transform: scale(1.05);
    filter: brightness(1.1);
}
```

### 2. 响应式设计
- 适配不同的webview尺寸
- 支持主题切换（深色/浅色）
- 优雅的加载状态显示

### 3. 交互反馈
- 按钮点击反馈
- 角色切换动画
- 加载进度指示

## 测试策略

### 1. 单元测试
- 角色资源管理器测试
- 双webview状态管理测试
- 消息通信测试

### 2. 集成测试
- 完整的模式切换流程测试
- 错误恢复机制测试
- 性能压力测试

### 3. 用户体验测试
- 快速操作场景测试
- 边界情况处理测试
- 长时间使用稳定性测试