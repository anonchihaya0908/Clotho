# Clotho 开发指南

## 项目结构

```
Clotho/
├── src/                                 # 源代码目录
│   ├── extension.ts                     # 插件入口点
│   ├── switch-source-header.ts          # 头文件/源文件切换功能
│   ├── create-source-header-pair/       # 文件对创建模块
│   │   ├── index.ts                     # 模块入口
│   │   ├── coordinator.ts               # 主协调器
│   │   ├── service.ts                   # 业务逻辑层
│   │   ├── ui.ts                        # 用户界面层
│   │   └── templates.ts                 # 模板和常量
│   └── pairing-rule-manager/            # 配对规则管理模块
│       ├── index.ts                     # 模块入口
│       └── pairing-rule-manager.ts      # 规则管理实现
├── out/                                 # 编译输出目录
├── package.json                         # NPM 包配置
├── tsconfig.json                        # TypeScript 配置
├── .vscodeignore                        # VS Code 打包忽略文件
└── README.md                            # 项目说明
```

## 架构设计

### 依赖注入模式
- 使用 ExtensionContext 接口进行依赖注入
- 各模块间松耦合，便于测试和维护

### 模块化设计
- **extension.ts**: 插件激活入口，管理生命周期
- **create-source-header-pair**: 文件对创建的完整功能
- **switch-source-header**: 文件切换功能
- **pairing-rule-manager**: 配置管理功能

### 分层架构
- **UI层 (ui.ts)**: 处理用户交互和界面显示
- **业务层 (service.ts)**: 核心业务逻辑
- **协调层 (coordinator.ts)**: 统筹各层协作

## 开发环境设置

### 必需软件
- Node.js 16+
- Visual Studio Code
- TypeScript 4.9+

### 安装依赖
```bash
npm install
```

### 编译项目
```bash
npm run compile
```

### 监听模式编译
```bash
npm run watch
```

### 打包插件
```bash
npm run package
```

## 调试和测试

### 本地调试
1. 在 VS Code 中打开项目
2. 按 F5 启动扩展开发主机
3. 在新窗口中测试插件功能

### 任务配置
项目包含预配置的 VS Code 任务：
- **编译**: `Ctrl+Shift+P` -> "Tasks: Run Task" -> "npm: compile"
- **监听**: `Ctrl+Shift+P` -> "Tasks: Run Task" -> "npm: watch"
- **打包**: `Ctrl+Shift+P` -> "Tasks: Run Task" -> "Package Extension"

## 核心功能实现

### 1. 文件对创建 (create-source-header-pair)

#### 工作流程
1. 检测目标目录
2. 分析语言上下文
3. 检查自定义规则
4. 呈现模板选择
5. 获取文件名
6. 验证唯一性
7. 生成内容
8. 写入文件
9. 在编辑器中打开

#### 核心类
- **PairCoordinator**: 主要工作流程协调
- **PairCreatorService**: 业务逻辑和文件操作
- **PairCreatorUI**: 用户界面和输入验证

### 2. 文件切换 (switch-source-header)

#### 实现原理
- 基于文件扩展名确定当前文件类型
- 在配置的搜索路径中查找对应文件
- 支持多种 C/C++ 文件扩展名组合

### 3. 规则管理 (pairing-rule-manager)

#### 配置存储
- 支持工作区和全局配置
- JSON 格式存储自定义规则
- 向导式配置界面

## 扩展和自定义

### 添加新模板类型
1. 在 `templates.ts` 中添加模板定义
2. 更新 `TemplateKey` 类型
3. 在 `FILE_TEMPLATES` 中添加模板内容
4. 更新相关业务逻辑

### 添加新命令
1. 在 `package.json` 的 `contributes.commands` 中定义
2. 在相应模块中注册命令处理器
3. 更新菜单和快捷键配置

### 自定义配置选项
1. 在 `package.json` 的 `contributes.configuration` 中定义
2. 在代码中使用 `vscode.workspace.getConfiguration()` 读取
3. 提供默认值和验证逻辑

## 发布清单

### 发布前检查
- [ ] 代码编译无错误
- [ ] 所有功能测试通过
- [ ] 更新版本号
- [ ] 更新 CHANGELOG.md
- [ ] 更新 README.md
- [ ] 检查许可证信息

### 打包命令
```bash
npm run package
```

### 发布到市场
```bash
npx @vscode/vsce publish
```

## 贡献指南

### 代码风格
- 使用 TypeScript 严格模式
- 遵循 ESLint 配置
- 使用驼峰命名法
- 添加适当的注释和文档

### 提交规范
- 功能: `feat: 添加新功能描述`
- 修复: `fix: 修复问题描述`
- 文档: `docs: 更新文档`
- 重构: `refactor: 重构代码`

### 测试要求
- 为新功能添加单元测试
- 确保现有测试通过
- 在多个 VS Code 版本中测试

## 技术栈

- **TypeScript**: 主要开发语言
- **VS Code API**: 插件开发框架
- **Node.js**: 运行时环境
- **NPM**: 包管理器
- **ESLint**: 代码质量检查

## 性能优化

### 已实现的优化
- 文件系统操作缓存
- 并行文件检查
- 智能语言检测
- 延迟加载模块

### 进一步优化建议
- 添加更多缓存策略
- 优化大型工作区的性能
- 减少内存使用
- 异步操作优化
