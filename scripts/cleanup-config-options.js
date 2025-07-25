/**
 * Config Options Cleanup Script
 * 自动移除 config-options.ts 中的所有 microPreviewCode 属性
 */

const fs = require('fs');
const path = require('path');

const configOptionsPath = path.join(__dirname, '..', 'src', 'visual-editor', 'clang-format', 'config-options.ts');

// 读取文件内容
let content = fs.readFileSync(configOptionsPath, 'utf8');

// 更新文件头注释
content = content.replace(
    '包含所有配置项的元数据和微观预览代码',
    '包含所有配置项的元数据，预览代码由 PreviewService 动态生成'
);

// 使用正则表达式移除所有 microPreviewCode 属性
// 匹配模式：microPreviewCode: `任意内容`,
const microPreviewRegex = /,?\s*microPreviewCode:\s*`[^`]*`,?\s*/gs;
content = content.replace(microPreviewRegex, '');

// 清理可能遗留的多余逗号
content = content.replace(/,(\s*\})/g, '$1');
content = content.replace(/,(\s*,)/g, '$1');

// 写回文件
fs.writeFileSync(configOptionsPath, content, 'utf8');

console.log('✅ Successfully removed all microPreviewCode properties from config-options.ts');
console.log('🔄 Updated file header comment to reflect the change');
console.log('📦 File is now decoupled from preview code generation logic');
