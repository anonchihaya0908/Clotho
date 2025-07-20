// 简单的配置测试脚本
const vscode = require('vscode');

// 模拟 VS Code 配置读取
function testConfigReading() {
  console.log('测试配置读取...');

  // 读取 Clotho 配置
  const config = vscode.workspace.getConfiguration('clotho');
  const rules = config.get('createPair.rules', []);

  console.log('读取到的配置规则数量:', rules.length);
  if (rules.length > 0) {
    console.log('配置规则:');
    rules.forEach((rule, index) => {
      console.log(`  ${index + 1}. ${rule.label} (${rule.language}): ${rule.headerExt}/${rule.sourceExt}`);
    });
  } else {
    console.log('没有找到配置规则，将使用默认模板');
  }
}

// 导出测试函数
if (typeof module !== 'undefined') {
  module.exports = { testConfigReading };
}
