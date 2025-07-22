# Clang-Format 可视化编辑器 - 自动加载配置功能

## 🎉 新功能说明

### 1. 自动读取工作区配置文件

现在当您打开 Clang-Format 可视化编辑器时，系统会：

1. **自动检测** 当前工作区中是否存在 `.clang-format` 配置文件
2. **自动加载** 找到的配置文件，无需手动点击"加载"按钮
3. **友好提示** 如果成功加载工作区配置，会显示 "已自动加载工作区的 .clang-format 配置文件"
4. **优雅降级** 如果没找到配置文件，会使用默认配置

### 2. 改进的配置解析

优化了配置文件解析逻辑，现在支持：

- ✅ **布尔值** (`true`/`false`) - 不区分大小写
- ✅ **整数和浮点数** (`4`, `2.5`)
- ✅ **字符串** (带或不带引号)
- ✅ **数组** (`[value1, value2]`)
- ✅ **移除引号** 自动处理带引号的值
- ✅ **调试输出** 在浏览器控制台显示解析过程

### 3. 增强的调试功能

添加了详细的调试输出，帮助排查数据显示问题：

- 📊 **配置解析日志** - 显示从文件中解析的配置
- 🔧 **值显示调试** - 特别关注关键配置项(如 `IndentWidth`, `BasedOnStyle`)
- 🚀 **初始化日志** - 显示前端接收到的数据

## 🔧 使用方法

### 测试自动加载功能

1. 在您的 C++ 项目根目录创建 `.clang-format` 文件:
```yaml
---
BasedOnStyle: Microsoft
IndentWidth: 4
UseTab: Never
TabWidth: 4
ColumnLimit: 120
BreakBeforeBraces: Allman
```

2. 打开 VS Code，使用命令面板 (`Ctrl+Shift+P`) 执行:
   - `Clotho: Open Clang-Format Editor`

3. 编辑器会自动加载您的配置文件 ✨

### 调试数据显示问题

如果发现配置显示不正确：

1. 打开浏览器开发者工具 (`F12`)
2. 查看控制台中的调试信息:
   - `📄 Clotho: Parsed configuration:` - 显示解析后的配置
   - `🚀 Clotho Frontend: Received initialization data:` - 显示前端收到的数据
   - `🔧 Clotho Debug - IndentWidth:` - 显示具体配置项的值处理过程

## 🐛 问题排查

### 如果自动加载不工作

1. **确认文件位置**: `.clang-format` 文件必须在工作区根目录
2. **检查文件格式**: 确保是有效的 YAML 格式
3. **查看控制台**: 检查是否有错误信息
4. **手动加载**: 如果自动加载失败，仍可使用工具栏的"加载"按钮

### 如果配置显示不正确

1. **检查调试输出**: 查看浏览器控制台的调试信息
2. **验证配置值**: 确认 `.clang-format` 文件中的值格式正确
3. **重新加载**: 尝试关闭并重新打开编辑器

## 📋 支持的配置格式示例

```yaml
---
# 基础样式
BasedOnStyle: Microsoft

# 缩进设置
IndentWidth: 4
UseTab: false
TabWidth: 4

# 行长度
ColumnLimit: 120

# 大括号样式  
BreakBeforeBraces: Allman

# 数组示例
IncludeCategories:
  - Regex: '^<.*'
    Priority: 1
  - Regex: '.*'
    Priority: 2
```

## 🎯 后续改进

根据使用反馈，我们计划添加：

- 🔄 **配置文件监听** - 当 `.clang-format` 文件更改时自动重新加载
- 📝 **配置验证** - 在保存前验证配置的有效性
- 💾 **配置备份** - 在覆盖前自动备份现有配置
- 🎨 **样式预设** - 提供更多内置样式模板
