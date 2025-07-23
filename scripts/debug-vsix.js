#!/usr/bin/env node

/**
 * VSIX调试脚本
 * 帮助诊断开发模式正常但打包后不工作的问题
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 VSIX问题诊断工具\n');

// 1. 检查关键文件是否存在
console.log('📁 检查关键文件...');
const criticalFiles = [
    'out/bundle.js',
    'webviews/visual-editor/clang-format/dist/index.js',
    'webviews/visual-editor/clang-format/dist/index.css',
    'package.json',
    '.vscodeignore'
];

let allFilesExist = true;
criticalFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`✅ ${file} (${sizeKB} KB)`);
    } else {
        console.error(`❌ ${file} 不存在`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.error('\n❌ 关键文件缺失，请先运行构建命令');
    console.log('💡 建议运行: npm run build:production');
    process.exit(1);
}

// 2. 检查webview资源
console.log('\n🎨 检查webview资源...');
const webviewDist = 'webviews/visual-editor/clang-format/dist';
if (fs.existsSync(webviewDist)) {
    const files = fs.readdirSync(webviewDist, { recursive: true });
    console.log(`📄 总文件数: ${files.length}`);

    const jsFiles = files.filter(f => f.endsWith('.js'));
    const cssFiles = files.filter(f => f.endsWith('.css'));
    const imageFiles = files.filter(f => f.endsWith('.webp') || f.endsWith('.png') || f.endsWith('.jpg'));

    console.log(`📜 JS文件: ${jsFiles.length}`);
    console.log(`🎨 CSS文件: ${cssFiles.length}`);
    console.log(`🖼️  图片文件: ${imageFiles.length}`);

    if (imageFiles.length === 0) {
        console.warn('⚠️  没有找到图片文件，这可能导致webview显示问题');
    }
}

// 3. 检查.vscodeignore配置
console.log('\n📋 检查.vscodeignore配置...');
if (fs.existsSync('.vscodeignore')) {
    const ignoreContent = fs.readFileSync('.vscodeignore', 'utf-8');
    const lines = ignoreContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

    console.log('🚫 被忽略的模式:');
    lines.forEach(line => {
        console.log(`   ${line}`);
    });

    // 检查是否意外忽略了重要文件
    const problematicPatterns = [
        'webviews/**/dist/**',
        'out/**',
        '*.js',
        '*.css'
    ];

    const hasProblems = problematicPatterns.some(pattern =>
        lines.some(line => line.includes(pattern.replace('**', '')) && !line.startsWith('!'))
    );

    if (hasProblems) {
        console.warn('⚠️  .vscodeignore可能包含有问题的模式');
    }
}

// 4. 检查package.json配置
console.log('\n📦 检查package.json配置...');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

console.log(`📌 主入口: ${pkg.main}`);
console.log(`🎯 激活事件: ${pkg.activationEvents?.length || 0} 个`);
console.log(`⚙️  命令数量: ${pkg.contributes?.commands?.length || 0} 个`);

if (!pkg.main || !fs.existsSync(pkg.main)) {
    console.error(`❌ 主入口文件不存在: ${pkg.main}`);
    allFilesExist = false;
}

// 5. 生成调试信息
console.log('\n🔧 生成调试信息...');
const debugInfo = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    files: {
        mainBundle: fs.existsSync('out/bundle.js') ? fs.statSync('out/bundle.js').size : 0,
        webviewJs: fs.existsSync('webviews/visual-editor/clang-format/dist/index.js') ?
            fs.statSync('webviews/visual-editor/clang-format/dist/index.js').size : 0,
        webviewCss: fs.existsSync('webviews/visual-editor/clang-format/dist/index.css') ?
            fs.statSync('webviews/visual-editor/clang-format/dist/index.css').size : 0
    },
    packageJson: {
        main: pkg.main,
        activationEvents: pkg.activationEvents,
        commandCount: pkg.contributes?.commands?.length || 0
    }
};

fs.writeFileSync('debug-info.json', JSON.stringify(debugInfo, null, 2));
console.log('📄 调试信息已保存到 debug-info.json');

// 6. 提供修复建议
console.log('\n💡 常见问题修复建议:');
console.log('1. 路径问题: 确保webview资源路径正确');
console.log('2. CSP问题: 检查Content Security Policy配置');
console.log('3. 依赖问题: 确保所有依赖都正确打包');
console.log('4. 权限问题: 检查webview权限配置');

console.log('\n🚀 如果问题仍然存在，请提供以下信息:');
console.log('- 具体的错误信息（开发者工具控制台）');
console.log('- VS Code版本');
console.log('- 操作系统版本');
console.log('- debug-info.json文件内容');

if (allFilesExist) {
    console.log('\n✅ 基本检查通过，可以尝试打包测试');
} else {
    console.log('\n❌ 发现问题，请先修复后再打包');
}