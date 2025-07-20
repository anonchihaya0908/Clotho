# Clotho 插件安装和使用指南

## 📦 安装方法

### 方法一：从 VSIX 文件安装（推荐）

1. 在 VS Code 中按 `Ctrl+Shift+P` 打开命令面板
2. 输入 "Extensions: Install from VSIX..."
3. 选择生成的 `clotho-1.0.0.vsix` 文件
4. 重启 VS Code

### 方法二：通过命令行安装

```bash
code --install-extension clotho-1.0.0.vsix
```

## 🚀 使用方法

### 创建 C/C++ 文件对

#### 快捷键方式
- 按 `Ctrl+Alt+N` 快速创建新的文件对

#### 命令面板方式
1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 "Clotho: New C/C++ Header/Source Pair"
3. 按照提示选择模板类型和文件名

#### 右键菜单方式
- 在资源管理器中右键点击文件夹
- 选择 "New C/C++ Header/Source Pair"

### 在头文件和源文件之间切换

#### 快捷键方式
- 按 `Alt+O` 在头文件和源文件之间快速切换

#### 命令面板方式
1. 按 `Ctrl+Shift+P`
2. 输入 "Clotho: Switch Between Header/Source"

#### 右键菜单方式
- 在编辑器中右键点击
- 选择 "Switch Between Header/Source"

### 配置文件扩展名规则

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 "Clotho: Configure File Extension Rules"
3. 按照向导设置自定义扩展名

## 🎨 模板类型

### C++ 模板
- **C++ 类模板**：包含构造函数、析构函数和基本结构
- **C++ 结构体模板**：简单的结构体定义
- **C++ 空模板**：带头文件保护的基本文件对

### C 模板
- **C 结构体模板**：typedef 结构体定义
- **C 空模板**：函数声明的基本 .h/.c 文件对

## ⚙️ 配置选项

### 工作区配置示例

在 `.vscode/settings.json` 中添加：

```json
{
  "clotho.createPair.rules": [
    {
      "key": "cpp_hpp",
      "label": "C++ Pair (.hpp/.cpp)",
      "description": "创建 .hpp/.cpp 文件对，带头文件保护",
      "language": "cpp",
      "headerExt": ".hpp",
      "sourceExt": ".cpp"
    }
  ],
  "clotho.switchHeaderSource.searchPaths": [
    ".",
    "../include",
    "../src",
    "./include",
    "./src"
  ]
}
```

## 🔧 支持的文件扩展名

### 头文件
- `.h` - 标准 C/C++ 头文件
- `.hpp` - C++ 头文件
- `.hh` - 替代 C++ 头文件
- `.hxx` - 扩展 C++ 头文件

### 源文件
- `.c` - C 源文件
- `.cpp` - 标准 C++ 源文件
- `.cc` - 替代 C++ 源文件
- `.cxx` - 扩展 C++ 源文件

## 💡 使用技巧

1. **智能语言检测**：Clotho 会分析当前文件和项目结构，智能建议最合适的模板类型

2. **自定义扩展名**：如果使用非标准文件扩展名，Clotho 会记住您的选择并在将来的文件创建中提供默认选项

3. **工作区配置**：为不同项目设置不同的扩展名规则，通过配置工作区特定的设置

4. **快速访问**：使用键盘快捷键获得最快的工作流程 - `Ctrl+Alt+N` 创建新对，`Alt+O` 切换文件

## 🐛 故障排除

### 常见问题

1. **找不到对应文件**
   - 检查搜索路径配置
   - 确保文件名匹配（不包括扩展名）

2. **模板选择错误**
   - 检查当前文件的语言检测
   - 手动选择正确的模板类型

3. **自定义规则不生效**
   - 检查配置语法是否正确
   - 重启 VS Code 使配置生效

### 重置配置

如果需要重置所有自定义配置：

1. 打开设置（`Ctrl+,`）
2. 搜索 "clotho"
3. 删除所有自定义配置项

## 📝 开发信息

- **版本**: 1.0.0
- **许可证**: Apache 2.0
- **源代码**: 基于模块化架构，支持依赖注入
- **支持的 VS Code 版本**: 1.74.0+

## 🎉 享受使用 Clotho！

Clotho 让 C/C++ 开发更加高效和愉快。如果您有任何问题或建议，请随时反馈！
