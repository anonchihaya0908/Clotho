#!/usr/bin/env node

/**
 * VSIX包诊断脚本
 * 帮助诊断开发模式正常但VSIX包不工作的问题
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 开始诊断VSIX打包问题...\n');

// 1. 检查关键文件是否存在
console.log('📁 检查关键文件...');
const criticalFiles = [
    'out/bundle.js',
    'webviews/visual-editor/clang-format/dist/index.js',
    'webviews/visual-editor/clang-format/dist/index.css',
    'package.json'
];

let missingFiles = [];
criticalFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        console.log(`✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    } else {
        console.log(`❌ ${file} - 文件不存在`);
        missingFiles.push(file);
    }
});

if (missingFiles.length > 0) {
    console.log(`\n❌ 发现 ${missingFiles.length} 个缺失文件，请先运行构建命令：`);
    console.log('npm run build:production');
    process.exit(1);
}

// 2. 检查webview资源
console.log('\n🎨 检查webview资源...');
const webviewDist = 'webviews/visual-editor/clang-format/dist';
if (fs.existsSync(webviewDist)) {
    const files = fs.readdirSync(webviewDist, { recursive: true });
    console.log(`📦 webview dist目录包含 ${files.length} 个文件:`);
    files.forEach(file => {
        const fullPath = path.join(webviewDist, file);
        if (fs.statSync(fullPath).isFile()) {
            const size = fs.statSync(fullPath).size;
            console.log(`   - ${file} (${(size / 1024).toFixed(1)} KB)`);
        }
    });
} else {
    console.log('❌ webview dist目录不存在');
}

// 3. 检查.vscodeignore配置
console.log('\n📋 检查.vscodeignore配置...');
if (fs.existsSync('.vscodeignore')) {
    const ignoreContent = fs.readFileSync('.vscodeignore', 'utf-8');
    console.log('✅ .vscodeignore文件存在');

    // 检查是否正确包含webview资源
    if (ignoreContent.includes('!webviews/**/dist/**')) {
        console.log('✅ webview dist目录被正确包含');
    } else {
        console.log('⚠️  webview dist目录可能没有被正确包含');
    }
} else {
    console.log('❌ .vscodeignore文件不存在');
}

// 4. 检查package.json配置
console.log('\n📄 检查package.json配置...');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

if (pkg.main) {
    console.log(`✅ main入口: ${pkg.main}`);
    if (fs.existsSync(pkg.main)) {
        console.log('✅ main文件存在');
    } else {
        console.log('❌ main文件不存在');
    }
} else {
    console.log('❌ package.json中没有main字段');
}

// 5. 模拟VSIX内容检查
console.log('\n📦 模拟VSIX内容检查...');
try {
    // 创建临时的打包预览
    console.log('正在分析哪些文件会被包含在VSIX中...');

    const result = execSync('npx @vscode/vsce ls', { encoding: 'utf-8' });
    const lines = result.split('\n').filter(line => line.trim());

    console.log(`📋 VSIX将包含 ${lines.length} 个文件:`);

    // 检查关键文件是否在列表中
    const webviewFiles = lines.filter(line => line.includes('webviews') && line.includes('dist'));
    console.log(`🎨 webview相关文件: ${webviewFiles.length} 个`);

    if (webviewFiles.length === 0) {
        console.log('❌ 警告：没有找到webview相关文件！');
        console.log('这可能是.vscodeignore配置问题');
    } else {
        console.log('✅ webview文件将被包含');
        webviewFiles.slice(0, 5).forEach(file => console.log(`   - ${file}`));
        if (webviewFiles.length > 5) {
            console.log(`   ... 还有 ${webviewFiles.length - 5} 个文件`);
        }
    }

} catch (error) {
    console.log('⚠️  无法运行vsce ls命令，跳过此检查');
}

// 6. 提供修复建议
console.log('\n💡 修复建议:');
console.log('1. 确保运行了完整的构建命令：npm run build:production');
console.log('2. 检查.vscodeignore文件是否正确配置');
console.log('3. 确保webview资源文件存在于dist目录中');
console.log('4. 尝试使用我们的打包脚本：npm run package');

// 7. 生成调试版本的建议
console.log('\n🔧 调试建议:');
console.log('1. 在安装VSIX后，打开VS Code开发者工具查看控制台错误');
console.log('2. 检查是否有文件加载失败的错误');
console.log('3. 确认扩展是否正确激活');

console.log('\n✨ 诊断完成！');