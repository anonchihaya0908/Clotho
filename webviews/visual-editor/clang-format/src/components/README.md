# 组件架构文档

## 重构概述

本次重构将原有的扁平化组件结构，改为按"组件/功能"组织的文件结构，这是现代前端开发的最佳实践。

## 文件结构

```
src/components/
├── ConfigModeSelector/          # 配置模式选择器
│   ├── index.tsx               # 组件主文件
│   └── style.css              # 组件样式
│
├── ConfigPanel/                # 主配置面板
│   ├── index.tsx
│   └── style.css
│
├── DynamicMicroPreview/        # 动态微观预览
│   └── index.tsx
│
├── MainConfigInterface/        # 主配置界面
│   └── index.tsx
│
├── PreviewPanel/               # 预览面板
│   └── index.tsx
│
├── QuickSetup/                 # 快速设置
│   ├── index.tsx
│   └── style.css
│
├── QuickSetupPanel/            # 快速设置面板
│   └── index.tsx
│
├── ResizableSplitter/          # 可调节分割器
│   └── index.tsx
│
├── SearchConfig/               # 搜索配置
│   ├── index.tsx
│   └── style.css
│
├── StatusBar/                  # 状态栏
│   └── index.tsx
│
├── Toolbar/                    # 工具栏
│   └── index.tsx
│
└── index.ts                    # 统一导出文件
```

## 架构优势

### 🎯 高内聚性
- 每个组件的所有相关文件（逻辑、样式、测试等）都在同一个文件夹中
- 修改组件时，所有相关文件都在手边，无需在文件树中跳转

### 🔧 高可维护性
- **修改方便**：所有相关文件都在同一位置
- **删除安全**：删除整个文件夹即可完全移除组件，不会留下残留
- **便于移动和复用**：可以轻松将整个组件文件夹复制到其他项目

### 📈 可扩展性
- components 文件夹结构清晰，即使有100个组件也不会混乱
- 新增组件时只需创建新的文件夹
- 每个组件都是独立的"王国"

### 🚀 团队协作友好
- 多人开发时减少文件冲突
- 代码审查更清晰，可以按组件进行审查
- 新团队成员更容易理解项目结构

## 导入方式

### 推荐方式（使用统一导出）
```typescript
import { ConfigPanel, PreviewPanel, Toolbar } from './components';
```

### 直接导入（按需使用）
```typescript
import { ConfigPanel } from './components/ConfigPanel';
import { PreviewPanel } from './components/PreviewPanel';
```

## 命名约定

- **文件夹名称**：使用 PascalCase，与组件名称一致
- **主文件**：统一命名为 `index.tsx`
- **样式文件**：统一命名为 `style.css`
- **类型定义**：如果需要，可以创建 `types.ts`
- **测试文件**：如果需要，可以创建 `index.test.tsx`

## 未来扩展建议

随着项目发展，您可以进一步在每个组件文件夹中添加：

```
ComponentName/
├── index.tsx           # 组件主文件
├── style.css          # 样式文件
├── types.ts           # 类型定义
├── index.test.tsx     # 单元测试
├── stories.tsx        # Storybook 故事
├── hooks.ts           # 组件专用的钩子
└── README.md          # 组件文档
```

## 迁移说明

本次重构保持了所有组件的API不变，只改变了文件结构。所有的导入路径都已自动更新，不会影响现有功能。

构建测试通过，证明重构成功且没有破坏任何现有功能。
