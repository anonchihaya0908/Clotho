/**
 * i18n 使用示例
 *
 * 演示如何在代码中使用 Localization 工具类
 * 
 * Note: This file contains examples using outdated API and needs updating
 */

import * as vscode from 'vscode';
import { L } from './localization';

/**
 * 示例1: 错误消息
 */
export function example1_ErrorMessages() {
  const fileName = 'test.h';
  const fileType = 'header';

  // 旧代码 (硬编码)
  // vscode.window.showErrorMessage(`未找到文件: ${fileName} (${fileType})`);

  // 新代码 (使用 i18n)
  vscode.window.showErrorMessage(
    L.error.fileNotFound(fileName, fileType)
  );
  // 英文: "File not found: test.h (header)"
  // 中文: "未找到文件: test.h (header)"
}

/**
 * 示例2: UI 按钮文本
 */
export function example2_UIButtons() {
  const items: vscode.QuickPickItem[] = [
    { label: L.ui.button.save(), description: 'Save configuration' },
    { label: L.ui.button.import(), description: 'Import from file' },
    { label: L.ui.button.export(), description: 'Export to file' },
  ];

  vscode.window.showQuickPick(items, {
    placeHolder: L.ui.placeholder.selectOption()
  });
}

/**
 * 示例3: clang-format 配置项
 */
export function example3_ClangFormatOptions() {
  const optionKey = 'BasedOnStyle';

  // 获取配置项的本地化名称
  const optionName = L.clangFormat.option.getName(optionKey);
  // 英文: "Based On Style"
  // 中文: "基础风格"

  const optionDescription = L.clangFormat.option.getDescription(optionKey);
  // 英文: "The base coding style to inherit from..."
  // 中文: "继承的基础风格..."

  // Note: In production code, use unified logger instead of console.log
  // console.log(`${optionName}: ${optionDescription}`);
}

/**
 * 示例4: 信息提示
 */
export function example4_InfoMessages() {
  const fileName = 'MyClass.cpp';

  vscode.window.showInformationMessage(
    L.info.fileCreated(fileName)
  );
  // 英文: "File created: MyClass.cpp"
  // 中文: "文件已创建: MyClass.cpp"
}

/**
 * 示例5: 警告消息
 */
export function example5_WarningMessages() {
  const fileName = 'Main.cpp';

  vscode.window.showWarningMessage(
    L.warning.fileAlreadyExists(fileName)
  );
  // 英文: "File already exists: Main.cpp"
  // 中文: "文件已存在: Main.cpp"
}

/**
 * 示例6: 状态栏消息
 */
export function example6_StatusBar() {
  vscode.window.setStatusBarMessage(
    L.ui.statusBar.formatSuccess(),
    5000 // 5秒后消失
  );
  // 英文: "Formatted successfully"
  // 中文: "格式化成功"
}
