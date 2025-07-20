# Change Log

All notable changes to the "Clotho" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-XX

### Added
- Initial release of Clotho extension
- Smart C/C++ header/source file pair creation
- Intelligent language detection (C vs C++)
- Multiple template types (class, struct, empty)
- Custom file extension support (.h/.cpp, .hh/.cc, .hpp/.cxx, etc.)
- Header guard automatic generation
- Quick header/source file switching with `Alt+O`
- Configurable search paths for file discovery
- Workspace and global configuration support
- Explorer context menu integration
- Command palette integration
- Keyboard shortcuts support
- Welcome message for first-time users

### Features
- **New File Pair Creation**: `Ctrl+Alt+N` shortcut
- **Header/Source Switching**: `Alt+O` shortcut
- **Template Selection**: Choose from multiple C/C++ templates
- **Extension Configuration**: Customize file extensions per project
- **Smart Detection**: Analyzes current context for optimal suggestions
- **Multiple Search Paths**: Find corresponding files in various directories

### Commands
- `clotho.newSourcePair` - Create new C/C++ header/source pair
- `clotho.switchHeaderSource` - Switch between header and source files
- `clotho.configureRules` - Configure file extension rules

### Configuration Options
- `clotho.createPair.rules` - Custom pairing rules for file extensions
- `clotho.switchHeaderSource.searchPaths` - Additional search paths for finding corresponding files

### Templates
- C++ Class template with constructor/destructor
- C++ Struct template
- C++ Empty file pair template
- C Struct template with typedef
- C Empty file pair template

### Supported File Extensions
- Headers: `.h`, `.hpp`, `.hh`, `.hxx`
- Sources: `.c`, `.cpp`, `.cc`, `.cxx`
- Custom extensions via configuration

### UI Enhancements
- Context menus in Explorer and Editor
- Quick Pick dialogs with descriptions and details
- Error handling with user-friendly messages
- Progress indicators for file operations

### Development
- TypeScript implementation
- Modular architecture with dependency injection
- Comprehensive error handling
- Extensive documentation and comments
- ESLint configuration for code quality

## [Unreleased]

### Planned Features
- Additional template types
- Template customization
- Better integration with C/C++ tools
- Enhanced search algorithms
- Performance optimizations
- More configuration options

---

**Note**: Replace the date placeholder with the actual release date when publishing.
