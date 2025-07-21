# Clotho Monorepo 管理指南

本项目使用 **npm workspaces** 来统一管理整个 monorepo，包括主扩展和 webview 前端。

## 🏗️ 项目结构

```
CLOTHO/                           # 根目录 (主 workspace)
├── src/                         # 扩展后端代码
├── webviews/visual-editor/clang-format/ # 前端 workspace
│   ├── src/                     # React 前端代码
│   ├── package.json            # 前端依赖
│   └── webpack.config.js       # 前端构建配置
├── package.json                # 根 package.json (workspaces 配置)
├── manage.ps1                  # 统一管理脚本
└── README.md                   # 本文档
```

## 🚀 快速开始

### 一键安装所有依赖

```bash
npm install
```

这个命令会：
- 安装扩展的依赖（TypeScript、ESBuild 等）
- 安装前端的依赖（React、Webpack 等）
- 将所有依赖集中管理在根目录的 `node_modules`

### 使用管理脚本

我们提供了一个强大的 PowerShell 脚本来简化开发流程：

```powershell
# 查看所有可用命令
.\manage.ps1 help

# 安装所有依赖
.\manage.ps1 install

# 构建整个项目
.\manage.ps1 build

# 生产模式构建
.\manage.ps1 build -Production

# 开发模式（构建前端 + 启动扩展）
.\manage.ps1 dev

# 监视模式开发
.\manage.ps1 dev -Watch

# 清理所有构建产物
.\manage.ps1 clean

# 只构建前端
.\manage.ps1 webview

# 前端监视模式
.\manage.ps1 webview -Watch

# 只构建扩展
.\manage.ps1 extension

# 运行测试
.\manage.ps1 test

# 打包扩展
.\manage.ps1 package
```

## 📦 Workspace 详细说明

### 根 Workspace (.)

**作用：** VS Code 扩展主体

**主要文件：**
- `src/` - 扩展 TypeScript 源码
- `out/` - 编译后的 JavaScript（构建产物）
- `esbuild.config.mjs` - 构建配置

**主要脚本：**
```bash
npm run compile      # 编译扩展
npm run dev         # 开发模式
npm run package     # 打包 .vsix 文件
```

### 前端 Workspace (webviews/visual-editor/clang-format)

**作用：** Clang-Format 编辑器的 React 前端

**主要文件：**
- `src/` - React 组件和样式
- `dist/` - 构建后的前端资源（构建产物）
- `webpack.config.js` - Webpack 构建配置

**主要脚本：**
```bash
npm run build       # 构建前端
npm run dev         # 监视模式构建
npm run clean       # 清理构建产物
```

## 🔧 开发工作流

### 第一次设置

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd clotho

# 2. 安装所有依赖
npm install

# 3. 构建整个项目
.\manage.ps1 build

# 4. 启动开发模式
.\manage.ps1 dev
```

### 日常开发

```bash
# 开发前端 UI
.\manage.ps1 webview -Watch

# 开发扩展逻辑
.\manage.ps1 extension -Watch

# 全栈开发（同时监视前后端）
.\manage.ps1 dev -Watch
```

### 测试和打包

```bash
# 运行测试
.\manage.ps1 test

# 生产构建
.\manage.ps1 build -Production

# 打包发布
.\manage.ps1 package
```

## 🛠️ 添加新依赖

### 给扩展添加依赖

```bash
# 生产依赖
npm install <package-name>

# 开发依赖  
npm install <package-name> --save-dev
```

### 给前端添加依赖

```bash
# 给前端添加生产依赖
npm install <package-name> --workspace=visual-editor-clang-format-webview

# 给前端添加开发依赖
npm install <package-name> --save-dev --workspace=visual-editor-clang-format-webview
```

## 📊 Workspace 状态查看

```bash
# 查看所有 workspaces
npm ls --workspaces

# 查看特定 workspace 的依赖
npm ls --workspace=visual-editor-clang-format-webview

# 查看 workspace 信息
npm query .workspace
```

## 🔍 故障排除

### 依赖问题

```bash
# 清理并重新安装
.\manage.ps1 clean
rm -rf node_modules
npm install
```

### 构建问题

```bash
# 检查 workspace 配置
npm config list

# 验证 workspaces 设置
npm ls --workspaces

# 清理重建
.\manage.ps1 clean
.\manage.ps1 build
```

### 常见错误

1. **"找不到模块"** - 运行 `npm install` 重新安装依赖
2. **"workspace 不存在"** - 检查 package.json 中的 workspaces 配置
3. **"构建失败"** - 先清理再构建：`.\manage.ps1 clean && .\manage.ps1 build`

## 💡 最佳实践

1. **统一管理**: 始终在根目录运行 `npm install`，不要在子目录单独安装
2. **使用脚本**: 优先使用 `.\manage.ps1` 脚本而不是手动命令
3. **版本锁定**: 提交 `package-lock.json` 确保依赖版本一致
4. **清理构建**: 遇到奇怪问题时，先清理再构建
5. **分离关注点**: 前端代码放在 webviews，后端逻辑放在 src

## 🚢 部署和发布

```bash
# 1. 确保所有代码已提交
git status

# 2. 生产构建
.\manage.ps1 build -Production

# 3. 运行测试
.\manage.ps1 test

# 4. 打包扩展
.\manage.ps1 package

# 5. 发布到 VS Code 市场
vsce publish
```

---

这个 monorepo 设置让您可以：
- ✅ 一条命令安装所有依赖
- ✅ 统一的构建和开发流程  
- ✅ 前后端代码分离但管理统一
- ✅ 简化的部署和发布流程

享受高效的开发体验！🎉
