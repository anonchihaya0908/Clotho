#!/usr/bin/env node

/**
 * 创建测试版VSIX包
 * 包含额外的调试信息和错误处理
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🧪 创建测试版VSIX包...\n');

// 1. 清理并构建
console.log('🧹 清理旧文件...');
try {
    execSync('npm run clean', { stdio: 'inherit' });
} catch (error) {
    console.warn('⚠️  清理失败，继续...');
}

console.log('\n🔨 构建扩展...');
try {
    execSync('npm run build:production', { stdio: 'inherit' });
} catch (error) {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
}

// 2. 验证关键文件
console.log('\n🔍 验证关键文件...');
const criticalFiles = [
    'out/bundle.js',
    'webviews/visual-editor/clang-format/dist/index.js',
    'webviews/visual-editor/clang-format/dist/index.css'
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
    console.error('\n❌ 关键文件缺失，无法打包');
    process.exit(1);
}

// 3. 创建测试版package.json（添加更多调试信息）
console.log('\n📝 准备测试版配置...');
const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const testPkg = {
    ...originalPkg,
    name: originalPkg.name + '-test',
    displayName: originalPkg.displayName + ' (Test)',
    version: originalPkg.version + '-test.' + Date.now()
};

// 备份原始package.json
fs.writeFileSync('package.json.backup', JSON.stringify(originalPkg, null, 2));
fs.writeFileSync('package.json', JSON.stringify(testPkg, null, 2));

try {
    // 4. 创建VSIX包
    console.log('\n📦 创建测试版VSIX包...');
    execSync('npx @vscode/vsce package --no-dependencies', { stdio: 'inherit' });

    // 查找生成的VSIX文件
    const vsixFiles = fs.readdirSync('.').filter(f => f.endsWith('.vsix'));
    if (vsixFiles.length > 0) {
        const vsixFile = vsixFiles[0];
        const stats = fs.statSync(vsixFile);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`\n🎉 测试版VSIX包创建成功！`);
        console.log(`📄 文件名: ${vsixFile}`);
        console.log(`📏 文件大小: ${sizeInMB} MB`);

        // 重命名为test版本
        const testVsixName = vsixFile.replace('.vsix', '-test.vsix');
        fs.renameSync(vsixFile, testVsixName);
        console.log(`📄 重命名为: ${testVsixName}`);

        console.log('\n🔧 测试建议:');
        console.log('1. 在干净的VS Code中安装这个测试版本');
        console.log('2. 打开开发者工具 (Help > Toggle Developer Tools)');
        console.log('3. 查看Console和Network标签页的错误信息');
        console.log('4. 尝试激活插件并查看输出面板的扩展主机日志');

    } else {
        console.error('❌ 找不到生成的VSIX文件');
    }

} catch (error) {
    console.error('❌ 创建VSIX包失败:', error.message);
} finally {
    // 恢复原始package.json
    if (fs.existsSync('package.json.backup')) {
        fs.renameSync('package.json.backup', 'package.json');
        console.log('✅ 已恢复原始package.json');
    }
}

console.log('\n💡 如果测试版本仍然不工作，请提供:');
console.log('- VS Code开发者工具中的具体错误信息');
console.log('- VS Code版本号');
console.log('- 操作系统版本');
console.log('- 插件激活时的具体行为描述');