#!/usr/bin/env node

/**
 * VSIX包内容检查脚本
 * 用于检查打包后的VSIX文件是否包含所有必要的文件
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 VSIX包内容检查工具\n');

// 查找VSIX文件
const vsixFiles = fs.readdirSync('.').filter(f => f.endsWith('.vsix'));

if (vsixFiles.length === 0) {
    console.error('❌ 没有找到VSIX文件');
    console.log('💡 请先运行: npm run package');
    process.exit(1);
}

const vsixFile = vsixFiles[0];
console.log(`📦 检查VSIX文件: ${vsixFile}`);

// 创建临时目录来解压VSIX
const tempDir = 'temp-vsix-extract';
if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir);

try {
    // 解压VSIX文件（VSIX实际上是ZIP文件）
    console.log('📂 解压VSIX文件...');

    // 使用PowerShell解压（Windows）
    try {
        execSync(`powershell -Command "Expand-Archive -Path '${vsixFile}' -DestinationPath '${tempDir}' -Force"`, { stdio: 'pipe' });
    } catch (error) {
        // 如果PowerShell失败，尝试使用7zip或其他工具
        console.log('⚠️  PowerShell解压失败，尝试其他方法...');
        // 这里可以添加其他解压方法
        throw error;
    }

    console.log('✅ 解压完成');

    // 检查解压后的内容
    console.log('\n📋 VSIX包内容:');

    function listFiles(dir, prefix = '') {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        items.forEach(item => {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                console.log(`${prefix}📁 ${item.name}/`);
                listFiles(fullPath, prefix + '  ');
            } else {
                const stats = fs.statSync(fullPath);
                const sizeKB = (stats.size / 1024).toFixed(2);
                console.log(`${prefix}📄 ${item.name} (${sizeKB} KB)`);
            }
        });
    }

    listFiles(tempDir);

    // 检查关键文件是否存在
    console.log('\n🔍 检查关键文件...');
    const criticalPaths = [
        'extension/out/bundle.js',
        'extension/webviews/visual-editor/clang-format/dist/index.js',
        'extension/webviews/visual-editor/clang-format/dist/index.css',
        'extension/package.json'
    ];

    let allCriticalFilesExist = true;
    criticalPaths.forEach(filePath => {
        const fullPath = path.join(tempDir, filePath);
        if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            console.log(`✅ ${filePath} (${sizeKB} KB)`);
        } else {
            console.error(`❌ ${filePath} 不存在`);
            allCriticalFilesExist = false;
        }
    });

    // 检查webview图片资源
    const imagesPath = path.join(tempDir, 'extension/webviews/visual-editor/clang-format/dist/images');
    if (fs.existsSync(imagesPath)) {
        const imageFiles = fs.readdirSync(imagesPath, { recursive: true });
        const webpFiles = imageFiles.filter(f => f.endsWith('.webp'));
        console.log(`✅ 图片资源: ${webpFiles.length} 个WebP文件`);
    } else {
        console.error('❌ 图片资源目录不存在');
        allCriticalFilesExist = false;
    }

    // 检查package.json内容
    const packageJsonPath = path.join(tempDir, 'extension/package.json');
    if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        console.log(`\n📦 Package.json信息:`);
        console.log(`   名称: ${pkg.name}`);
        console.log(`   版本: ${pkg.version}`);
        console.log(`   主入口: ${pkg.main}`);
        console.log(`   激活事件: ${pkg.activationEvents?.length || 0} 个`);
    }

    if (allCriticalFilesExist) {
        console.log('\n✅ 所有关键文件都存在于VSIX包中');
        console.log('💡 如果插件仍然不工作，问题可能是:');
        console.log('   1. 运行时路径解析问题');
        console.log('   2. Content Security Policy问题');
        console.log('   3. VS Code版本兼容性问题');
        console.log('   4. 依赖项问题');
    } else {
        console.log('\n❌ VSIX包中缺少关键文件');
        console.log('💡 建议检查.vscodeignore配置');
    }

} catch (error) {
    console.error('❌ 检查VSIX包时出错:', error.message);
} finally {
    // 清理临时目录
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

console.log('\n🔧 调试建议:');
console.log('1. 在干净的VS Code中安装插件后，打开开发者工具查看控制台错误');
console.log('2. 检查VS Code输出面板中的扩展主机日志');
console.log('3. 尝试在插件代码中添加更多日志输出');
console.log('4. 确认VS Code版本符合engines.vscode要求');