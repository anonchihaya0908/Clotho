/**
 * 自动提取 clang-format-options-database.ts 并生成翻译
 * 
 * 运行方式: node scripts/generate-clang-format-i18n.js
 */

const fs = require('fs');
const path = require('path');

// 读取数据库文件
const dbPath = path.join(__dirname, '../src/visual-editor/clang-format/data/clang-format-options-database.ts');
const content = fs.readFileSync(dbPath, 'utf8');

// 提取所有配置项
const regex = /\{\s*key:\s*'([^']+)',\s*name:\s*'([^']+)',\s*description:\s*'([^']+)',/g;
const matches = [];
let match;

while ((match = regex.exec(content)) !== null) {
    matches.push({
        key: match[1],
        name: match[2],
        description: match[3]
    });
}

console.log(`找到 ${matches.length} 个配置项`);

// 生成英文翻译对象 (使用简单的机器翻译作为基础)
const translations = {};

// 常见术语映射
const glossary = {
    '基础风格': 'Based On Style',
    '访问修饰符': 'Access Modifier',
    '偏移': 'Offset',
    '对齐': 'Align',
    '开括号': 'Open Bracket',
    '结构体数组': 'Array of Structures',
    '连续赋值': 'Consecutive Assignments',
    '连续位域': 'Consecutive Bit Fields',
    '连续声明': 'Consecutive Declarations',
    '连续宏': 'Consecutive Macros',
    '转义换行符': 'Escaped Newlines',
    '操作数': 'Operands',
    '尾随注释': 'Trailing Comments',
    '缩进': 'Indent',
    '换行': 'Break',
    '单行': 'Single Line',
    '多行': 'Multiline',
    '大括号': 'Braces',
    '花括号': 'Braces',
    '二元运算符': 'Binary Operators',
    '三元运算符': 'Ternary Operators',
    '构造函数': 'Constructor',
    '继承': 'Inheritance',
    '模板': 'Template',
    '列限制': 'Column Limit',
    '空格': 'Space',
    '分号': 'Semicolon',
    '冒号': 'Colon',
    '括号': 'Parentheses',
    '方括号': 'Square Brackets',
    '命名空间': 'Namespace',
    '指针': 'Pointer',
    '引用': 'Reference',
    '限定符': 'Qualifier',
};

// 简单翻译函数
function translateTerm(chinese) {
    for (const [zh, en] of Object.entries(glossary)) {
        if (chinese.includes(zh)) {
            return chinese.replace(zh, en);
        }
    }
    return chinese; // 保留中文,等待人工翻译
}

// 为每个配置项生成翻译
matches.forEach(({ key, name, description }) => {
    translations[`clangFormat.option.${key}.name`] = translateTerm(name);
    translations[`clangFormat.option.${key}.description`] = translateTerm(description);
});

// 输出到文件
const outputPath = path.join(__dirname, '../l10n/clang-format-auto-generated.json');
fs.writeFileSync(outputPath, JSON.stringify(translations, null, 2), 'utf8');

console.log(`翻译已生成: ${outputPath}`);
console.log('请手动检查并润色翻译内容');
