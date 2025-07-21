# 🚀 Clotho Development Guide

## Quick Start

### F5 一键启动 (推荐)
1. 打开 VS Code
2. 按 `F5` 键
3. 自动编译扩展和 Webview，并启动调试

### 命令行构建
```bash
# 使用新的 TypeScript 构建脚本
node build.js build     # 编译所有内容
node build.js dev       # 开发模式（编译 + 启动 VS Code）
node build.js watch     # 监控模式
node build.js clean     # 清理构建产物

# 或使用 npm 脚本
npm run build           # 编译扩展和 Webview
npm run watch           # 监控模式
npm run clean           # 清理构建产物
npm run dev             # 开发模式
```

## 项目结构

```
Clotho/
├── src/                        # 扩展后端代码
├── webviews/
│   └── visual-editor/
│       └── clang-format/       # Clang-Format 可视化编辑器
├── .vscode/
│   ├── tasks.json             # VS Code 任务配置
│   └── launch.json            # 调试配置
├── build.js                   # 统一构建脚本
└── package.json               # 根 package.json（npm workspaces）
```

## 开发工作流

### 1. 初始设置
```bash
npm install                    # 安装所有依赖
```

### 2. 开发
- **方式一（推荐）**：按 `F5` 键，VS Code 会自动编译并启动扩展
- **方式二**：运行 `npm run watch` 然后按 `F5`
- **方式三**：运行 `node build.js dev`

### 3. 构建发布版本
```bash
npm run build                  # 生产构建
npm run package               # 打包 VSIX 文件
```

## VS Code 集成

- **`F5`**: 一键编译 + 启动调试
- **`Ctrl+Shift+P` → "Tasks: Run Task"**: 选择预定义任务
  - `build`: 完整构建
  - `watch`: 监控模式
  - `clean`: 清理构建产物

## 故障排除

### 构建失败
1. 检查是否安装了所有依赖：`npm install`
2. 清理并重新构建：`npm run clean && npm run build`
3. 检查 Node.js 版本（推荐 16+）
4. 确保 `esbuild.config.mjs` 文件存在（已包含在项目中）

### 语法高亮问题
1. 确保 webview 已正确构建：`npm run build:webview`
2. 检查浏览器开发者工具（webview 内）
3. 查看 VS Code 开发者工具的控制台输出
4. 验证 `highlight.js` 依赖已正确安装

---

**注意**: 我们已经完全移除了 PowerShell 脚本，现在使用基于 Node.js 和 npm 的现代化构建流程。
