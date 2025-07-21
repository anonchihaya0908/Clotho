# Clang-Format Visual Editor

Clotho 扩展新增了一个强大的 clang-format 图形化配置编辑器，让您可以可视化地配置 C/C++ 代码格式化规则。

## 功能特性

### 🎨 三栏式界面设计
- **配置面板** (左侧): 按分类组织的配置选项
- **宏观预览** (右侧): 完整代码示例的格式化预览
- **微观预览** (配置项展开时): 针对特定选项的小段代码预览

### 📋 配置分类
- **General**: 基础样式设置
- **Alignment**: 对齐相关选项
- **Braces**: 大括号处理规则
- **Spacing**: 空格和间距设置
- **Indentation**: 缩进配置
- **Wrapping**: 换行和行长度设置
- **Comments**: 注释格式化选项

### 🔧 强大的管理功能
- ✅ **加载工作区配置**: 自动读取现有的 `.clang-format` 文件
- 💾 **保存到工作区**: 将配置应用到当前工作区
- 📥 **导入配置**: 从外部文件导入配置
- 📤 **导出配置**: 导出配置到文件
- 🔄 **重置配置**: 恢复到默认设置
- ✓ **实时验证**: 即时验证配置有效性

### 👀 实时预览
- **微观预览**: 每个配置项都有对应的代码示例，展示该选项的具体效果
- **宏观预览**: 完整的 C++ 代码示例，展示所有配置的综合效果
- **即时更新**: 修改配置时预览立即更新

## 使用方法

### 打开编辑器
1. 按 `Ctrl+Shift+P` 打开命令面板
2. 搜索并执行 "Clotho: Open Clang-Format Visual Editor"
3. 编辑器将在新的标签页中打开

### 配置操作
1. **浏览配置**: 点击左侧的分类标签浏览不同类别的选项
2. **展开选项**: 点击配置项查看详细说明和微观预览
3. **修改设置**: 使用右侧的控件修改配置值
4. **查看预览**: 右侧面板实时显示格式化效果

### 管理配置
- **加载现有配置**: 点击工具栏的 "📁 Load" 按钮
- **保存配置**: 点击 "💾 Save" 将配置保存到工作区的 `.clang-format` 文件
- **导入/导出**: 使用 "📥 Import" 和 "📤 Export" 按钮管理配置文件
- **验证配置**: 点击 "✓ Validate" 确保配置有效
- **重置配置**: 点击 "🔄 Reset" 恢复默认设置

## 开发和构建

### 前端构建
本功能使用 React + TypeScript 构建 webview 前端。要构建前端代码：

```powershell
# 安装依赖并构建（生产模式）
.\build-webview.ps1

# 开发模式构建
.\build-webview.ps1 -Dev

# 监视模式（自动重新构建）
.\build-webview.ps1 -Watch

# 清理并重新构建
.\build-webview.ps1 -Clean
```

### 项目结构
```
src/clang-format-editor/          # 后端逻辑
├── coordinator.ts                # 主协调器
├── format-service.ts             # clang-format 服务
├── config-options.ts             # 配置选项定义
├── types.ts                      # 类型定义
└── index.ts                      # 模块导出

webviews/clang-format-editor/     # 前端代码
├── src/
│   ├── App.tsx                   # 主应用组件
│   ├── index.tsx                 # 入口文件
│   ├── components/               # React 组件
│   └── styles/                   # CSS 样式
├── package.json                  # 前端依赖
├── webpack.config.js             # 构建配置
└── tsconfig.json                 # TypeScript 配置
```

## 依赖要求

- **clang-format**: 系统中需要安装 clang-format 工具
- **VS Code**: 版本 1.74.0 或更高
- **Node.js**: 构建前端时需要 (仅开发时)

## 技术特性

### 架构设计
- **MVC 模式**: 协调器(Controller) + 服务(Model) + Webview(View)
- **依赖注入**: 通过 ServiceContainer 管理服务生命周期
- **错误处理**: 统一的错误处理和用户提示
- **类型安全**: 完整的 TypeScript 类型定义

### 性能优化
- **按需加载**: 只有在打开编辑器时才加载相关资源
- **缓存机制**: 临时配置文件缓存，避免重复写入
- **异步操作**: 所有 I/O 操作均为异步，不阻塞 UI

### 用户体验
- **VS Code 主题**: 自动适配 VS Code 当前主题色彩
- **响应式布局**: 支持不同窗口大小的自适应布局
- **键盘友好**: 支持键盘导航和快捷键操作
- **状态保持**: 在 webview 隐藏时保持编辑状态

## 故障排除

### 常见问题
1. **clang-format 未找到**: 确保系统 PATH 中有 clang-format 命令
2. **配置无效**: 使用验证功能检查配置语法
3. **预览不更新**: 检查 clang-format 是否正常工作
4. **构建失败**: 确保 Node.js 环境正确安装

### 调试信息
- 查看 VS Code 开发者控制台获取详细错误信息
- 使用 `clotho.debugClangdDetection` 命令检查 clangd 状态
- 检查工作区是否包含有效的 C/C++ 项目

## 贡献和反馈

如果您在使用过程中遇到问题或有改进建议，欢迎通过以下方式反馈：
- 提交 Issue 报告问题
- 提交 Pull Request 贡献代码
- 在项目讨论区分享使用心得

---

这个可视化的 clang-format 编辑器让 C/C++ 代码格式化配置变得更加直观和便捷。享受更好的编码体验！
