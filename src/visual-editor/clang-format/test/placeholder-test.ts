/**
 * 占位符 Webview 功能测试
 * 这个文件用于手动测试占位符功能
 */

import * as vscode from 'vscode';

/**
 * 测试占位符创建和基本功能
 */
export async function testPlaceholderBasicFunctionality(): Promise<void> {
  console.log('🧪 开始测试占位符基本功能...');

  try {
    // 1. 打开 Clang-Format 编辑器
    await vscode.commands.executeCommand('clotho.openClangFormatEditor');

    // 等待编辑器完全加载
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 2. 模拟用户关闭预览面板
    // 这需要手动操作，因为我们无法直接模拟用户关闭标签页
    vscode.window.showInformationMessage(
      '请手动关闭右侧的预览面板来测试占位符功能。关闭后应该会看到占位符界面。',
      '了解',
    );

    console.log('✅ 占位符测试准备完成，请手动关闭预览面板进行测试');
  } catch (error) {
    console.error('❌ 占位符测试失败:', error);
    vscode.window.showErrorMessage(`占位符测试失败: ${error}`);
  }
}

/**
 * 测试占位符的主题适应性
 */
export async function testPlaceholderThemeAdaptation(): Promise<void> {
  console.log('🧪 开始测试占位符主题适应性...');

  try {
    // 获取当前主题
    const currentTheme = vscode.window.activeColorTheme;
    console.log('当前主题:', {
      kind: vscode.ColorThemeKind[currentTheme.kind],
      isDark:
        currentTheme.kind === vscode.ColorThemeKind.Dark ||
        currentTheme.kind === vscode.ColorThemeKind.HighContrast,
    });

    vscode.window.showInformationMessage(
      `当前主题: ${vscode.ColorThemeKind[currentTheme.kind]}。请切换主题并观察占位符是否正确适应。`,
      '了解',
    );

    console.log('✅ 主题适应性测试准备完成');
  } catch (error) {
    console.error('❌ 主题适应性测试失败:', error);
    vscode.window.showErrorMessage(`主题适应性测试失败: ${error}`);
  }
}

/**
 * 测试占位符的重新打开功能
 */
export async function testPlaceholderReopenFunctionality(): Promise<void> {
  console.log('🧪 开始测试占位符重新打开功能...');

  try {
    vscode.window.showInformationMessage(
      '请确保占位符界面已显示，然后点击"重新打开预览"按钮测试功能。',
      '了解',
    );

    console.log('✅ 重新打开功能测试准备完成');
  } catch (error) {
    console.error('❌ 重新打开功能测试失败:', error);
    vscode.window.showErrorMessage(`重新打开功能测试失败: ${error}`);
  }
}

/**
 * 运行所有占位符测试
 */
export async function runAllPlaceholderTests(): Promise<void> {
  console.log('🚀 开始运行所有占位符测试...');

  await testPlaceholderBasicFunctionality();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await testPlaceholderThemeAdaptation();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await testPlaceholderReopenFunctionality();

  console.log('🎉 所有占位符测试完成！');
}
/**

 * 测试修复后的逻辑：关闭主编辑器不应该创建占位符
 */
export async function testMainEditorCloseLogic(): Promise<void> {
  console.log('🧪 开始测试主编辑器关闭逻辑...');

  try {
    // 1. 打开 Clang-Format 编辑器
    await vscode.commands.executeCommand('clotho.openClangFormatEditor');

    // 等待编辑器完全加载
    await new Promise((resolve) => setTimeout(resolve, 2000));

    vscode.window.showInformationMessage(
      '测试步骤：\n' +
        '1. 现在应该看到左侧配置面板和右侧预览面板\n' +
        '2. 请关闭左侧的主配置面板（点击标签页的X）\n' +
        '3. 观察：应该不会出现占位符，整个编辑器会话应该结束\n' +
        '4. 如果出现了占位符，说明逻辑有问题',
      '了解',
    );

    console.log('✅ 主编辑器关闭逻辑测试准备完成');
  } catch (error) {
    console.error('❌ 主编辑器关闭逻辑测试失败:', error);
    vscode.window.showErrorMessage(`主编辑器关闭逻辑测试失败: ${error}`);
  }
}

/**
 * 测试修复后的逻辑：关闭预览应该创建占位符
 */
export async function testPreviewCloseLogic(): Promise<void> {
  console.log('🧪 开始测试预览关闭逻辑...');

  try {
    // 1. 打开 Clang-Format 编辑器
    await vscode.commands.executeCommand('clotho.openClangFormatEditor');

    // 等待编辑器完全加载
    await new Promise((resolve) => setTimeout(resolve, 2000));

    vscode.window.showInformationMessage(
      '测试步骤：\n' +
        '1. 现在应该看到左侧配置面板和右侧预览面板\n' +
        '2. 请关闭右侧的预览面板（点击标签页的X）\n' +
        '3. 观察：应该立即出现占位符界面\n' +
        '4. 左侧配置面板应该保持不变',
      '了解',
    );

    console.log('✅ 预览关闭逻辑测试准备完成');
  } catch (error) {
    console.error('❌ 预览关闭逻辑测试失败:', error);
    vscode.window.showErrorMessage(`预览关闭逻辑测试失败: ${error}`);
  }
} /*
 *
 * 直接测试占位符创建功能
 */
export async function testDirectPlaceholderCreation(): Promise<void> {
  console.log('🧪 开始直接测试占位符创建...');

  try {
    // 1. 打开 Clang-Format 编辑器
    await vscode.commands.executeCommand('clotho.openClangFormatEditor');

    // 等待编辑器完全加载
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 2. 手动触发 preview-closed 事件来测试占位符创建
    console.log('🔥 Manually triggering preview-closed event...');

    // 这里我们需要访问服务容器来获取协调器
    // 但由于架构限制，我们先通过控制台提示用户
    vscode.window
      .showInformationMessage(
        '请打开开发者控制台查看调试信息，然后手动关闭右侧预览面板。\n' +
          '应该看到详细的调试日志显示占位符创建过程。',
        '打开控制台',
      )
      .then((selection) => {
        if (selection === '打开控制台') {
          vscode.commands.executeCommand('workbench.action.toggleDevTools');
        }
      });

    console.log('✅ 直接占位符创建测试准备完成');
  } catch (error) {
    console.error('❌ 直接占位符创建测试失败:', error);
    vscode.window.showErrorMessage(`直接占位符创建测试失败: ${error}`);
  }
} /**
 *
 检查当前编辑器组状态
 */
export async function checkEditorGroupsStatus(): Promise<void> {
  console.log('🧪 检查当前编辑器组状态...');

  try {
    const tabGroups = vscode.window.tabGroups.all;
    console.log('📊 当前编辑器组数量:', tabGroups.length);

    tabGroups.forEach((group, index) => {
      console.log(`📁 编辑器组 ${index + 1}:`);
      console.log(`  - viewColumn: ${group.viewColumn}`);
      console.log(`  - isActive: ${group.isActive}`);
      console.log(`  - tabs count: ${group.tabs.length}`);

      group.tabs.forEach((tab, tabIndex) => {
        const input = tab.input as any;
        console.log(`    📄 标签页 ${tabIndex + 1}: ${tab.label}`);
        console.log(`      - isActive: ${tab.isActive}`);
        console.log(`      - isDirty: ${tab.isDirty}`);
        console.log(`      - isPinned: ${tab.isPinned}`);
        console.log(`      - isPreview: ${tab.isPreview}`);
        if (input?.uri) {
          console.log(`      - URI: ${input.uri.toString()}`);
        }
      });
    });

    vscode.window
      .showInformationMessage(
        `当前有 ${tabGroups.length} 个编辑器组。详细信息请查看控制台。`,
        '打开控制台',
      )
      .then((selection) => {
        if (selection === '打开控制台') {
          vscode.commands.executeCommand('workbench.action.toggleDevTools');
        }
      });
  } catch (error) {
    console.error('❌ 检查编辑器组状态失败:', error);
    vscode.window.showErrorMessage(`检查编辑器组状态失败: ${error}`);
  }
} /**

 * 测试占位符和预览的相互切换
 */
export async function testPlaceholderPreviewSwitching(): Promise<void> {
  console.log('🧪 开始测试占位符和预览的相互切换...');

  try {
    // 1. 打开 Clang-Format 编辑器
    await vscode.commands.executeCommand('clotho.openClangFormatEditor');

    // 等待编辑器完全加载
    await new Promise((resolve) => setTimeout(resolve, 2000));

    vscode.window.showInformationMessage(
      '测试步骤：\n' +
        '1. 关闭右侧预览 → 应该出现占位符\n' +
        '2. 点击"重新打开预览" → 应该只有预览，没有占位符\n' +
        '3. 再次关闭预览 → 应该再次出现占位符\n' +
        '4. 重复步骤2-3，确保没有卡住\n' +
        '5. 检查是否只有一个面板存在（不应该同时有预览和占位符）',
      '了解',
    );

    console.log('✅ 占位符和预览切换测试准备完成');
  } catch (error) {
    console.error('❌ 占位符和预览切换测试失败:', error);
    vscode.window.showErrorMessage(`占位符和预览切换测试失败: ${error}`);
  }
}
