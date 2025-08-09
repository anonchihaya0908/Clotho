# Clotho - C/C++ Header/Source Pair Creator

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/Togawa-Sakiko.clotho.svg)](https://marketplace.visualstudio.com/items?itemName=Togawa-Sakiko.clotho)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

Clotho is a powerful Visual Studio Code extension that simplifies C/C++ development by providing intelligent header/source file pair creation and management. Named after the Greek fate who spins the thread of life, Clotho weaves together your C/C++ source and header files seamlessly.

## 🚀 Features

### ✨ NEW! Visual Clang-Format Editor
- **Three-Pane Interface**: Configuration panel, micro previews, and macro preview
- **Real-time Preview**: See formatting changes instantly as you adjust settings
- **Category Organization**: Options grouped by Alignment, Braces, Spacing, Indentation, etc.
- **Import/Export**: Load existing configurations or save custom presets
- **Workspace Integration**: Seamlessly manage `.clang-format` files in your projects
- **Live Validation**: Instant feedback on configuration validity

### 🎯 Smart File Pair Creation
- **Intelligent Language Detection**: Automatically detects C vs C++ context from your current workspace
- **Multiple Template Types**: Choose from class, struct, or empty file templates
- **Custom File Extensions**: Support for various C/C++ file extensions (.h/.cpp, .hh/.cc, .hpp/.cxx, etc.)
- **Header Guard Generation**: Automatically generates appropriate header guards

### 🔄 Quick Header/Source Switching
- **Fast Navigation**: Instantly switch between corresponding header and source files
- **Multiple Search Paths**: Configurable search paths for finding corresponding files
- **Smart Discovery**: Automatically searches common project structure patterns

### ⚙️ Flexible Configuration
- **Workspace-Specific Rules**: Configure different extension rules per workspace
- **Global Settings**: Set up default preferences for all projects
- **Template Customization**: Adapts templates based on your file extension preferences

### 📊 Clangd Monitoring
- **Real-time Memory Usage**: Monitor clangd server memory consumption in the status bar
- **Process Information**: View detailed clangd process information including PID and version (direct child processes)
- **Configurable Thresholds**: Set custom warning and error memory thresholds
- **Smart Detection**: Automatically detects clangd process through extension API
- **Cross-platform Support**: Works on Windows, macOS, and Linux

## 📦 Installation

1. Open Visual Studio Code
2. Press `Ctrl+P` to open the Quick Open dialog
3. Type `ext install Togawa-Sakiko.clotho` and press Enter
4. Restart VS Code if prompted

## 🎮 Usage

### 🎨 Using the Visual Clang-Format Editor

#### Opening the Editor
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "Clotho: Open Clang-Format Visual Editor"
3. The editor opens in a new tab with three panels:
   - **Left**: Configuration options organized by category
   - **Right**: Live preview of formatted code
   - **Toolbar**: Import, export, save, and management options

#### Configuring Format Options
1. **Browse Categories**: Click category tabs (Alignment, Braces, Spacing, etc.)
2. **Expand Options**: Click any option to see description and micro preview
3. **Adjust Settings**: Use controls to modify values
4. **Real-time Preview**: See changes instantly in the preview panel

#### Managing Configurations
- **Load Existing**: Click "📁 Load" to import workspace `.clang-format`
- **Save to Workspace**: Click "💾 Save" to apply settings to your project
- **Import/Export**: Use "📥 Import" and "📤 Export" for configuration files
- **Reset**: Click "🔄 Reset" to restore default settings
- **Validate**: Click "✓ Validate" to check configuration syntax

### Creating New File Pairs

#### Method 1: Command Palette
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "Clotho: New C/C++ Header/Source Pair"
3. Follow the prompts to select template and file name

#### Method 2: Keyboard Shortcut
- Press `Ctrl+Alt+N` to quickly create a new file pair

#### Method 3: Explorer Context Menu
- Right-click on a folder in the Explorer
- Select "New C/C++ Header/Source Pair"

### Switching Between Files

#### Method 1: Keyboard Shortcut
- Press `Alt+O` to switch between header and source files

#### Method 2: Command Palette
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "Clotho: Switch Between Header/Source"

#### Method 3: Editor Context Menu
- Right-click in the editor
- Select "Switch Between Header/Source"

### Configuration

#### Method 1: Command Palette
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "Clotho: Configure File Extension Rules"

#### Method 2: Settings
- Open VS Code Settings
- Search for "Clotho"
- Configure your preferences

## ⚙️ Configuration Options

### File Extension Rules

Configure custom pairing rules in your workspace or user settings:

```json
{
  "clotho.createPair.rules": [
    {
      "key": "cpp_custom",
      "label": "C++ Pair (.hpp/.cpp)",
      "description": "Creates a .hpp/.cpp file pair with header guards",
      "language": "cpp",
      "headerExt": ".hpp",
      "sourceExt": ".cpp"
    }
  ]
}
```

### Search Paths for Header/Source Switching

```json
{
  "clotho.switch.searchPaths": [
    ".",
    "../include",
    "../src",
    "./include",
    "./src",
    "../../include"
  ]
}
```

## 🎨 Template Types

### C++ Templates
- **Class Template**: Creates a class with constructor, destructor, and basic structure
- **Struct Template**: Creates a simple struct definition
- **Empty Template**: Creates basic header/source files with header guards

### C Templates
- **Struct Template**: Creates a typedef struct definition
- **Empty Template**: Creates basic .h/.c files for function declarations

## 🔧 Template Examples

### C++ Class Template

**MyClass.h**
```cpp
#ifndef MYCLASS_H_
#define MYCLASS_H_

class MyClass {
public:
  MyClass();
  ~MyClass();

private:
  // Add private members here
};

#endif  // MYCLASS_H_
```

**MyClass.cpp**
```cpp
#include "MyClass.h"

MyClass::MyClass() {
  // Constructor implementation
}

MyClass::~MyClass() {
  // Destructor implementation
}
```

## 📋 Requirements

- Visual Studio Code 1.74.0 or higher
- C/C++ development environment (optional, but recommended)

## 🔥 Tips & Tricks

1. **Language Detection**: Clotho analyzes your current file and project structure to intelligently suggest the most appropriate template type.

2. **Custom Extensions**: If you use non-standard file extensions, Clotho will remember your choices and offer them as defaults for future file creation.

3. **Workspace Configuration**: Set up different extension rules for different projects by configuring workspace-specific settings.

4. **Quick Access**: Use the keyboard shortcuts for fastest workflow - `Ctrl+Alt+N` for new pairs and `Alt+O` for switching.

## 🐛 Known Issues

- Search paths are relative to the current file's directory
- Large workspaces may experience slight delays during file discovery

## 📝 Release Notes

### 1.0.0
- Initial release
- Smart C/C++ file pair creation
- Header/source file switching
- Configurable file extensions
- Multiple template types
- Workspace and global settings support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the need for better C/C++ development tools in VS Code
- Named after Clotho, one of the three Fates in Greek mythology who spins the thread of life

---

**Enjoy weaving your C/C++ code with Clotho!** 🧵✨