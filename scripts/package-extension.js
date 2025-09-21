#!/usr/bin/env node

/**
 * 完整的扩展打包脚本
 * 确保所有资源都被正确包含在VSIX包中
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('开始完整的扩展打包流程...\n');

// 步骤1: 清理所有构建产物
console.log('清理旧的构建产物...');
try {
    execSync('npm run clean', { stdio: 'inherit' });
    console.log('清理完成\n');
} catch (error) {
    console.error('清理失败:', error.message);
    process.exit(1);
}

// 步骤2: 构建扩展主体
console.log('构建扩展主体...');
try {
    execSync('npm run build:extension:production', { stdio: 'inherit' });
    console.log('扩展主体构建完成\n');
} catch (error) {
    console.error('扩展主体构建失败:', error.message);
    process.exit(1);
}

// 步骤3: 构建Webview
console.log('构建Webview组件...');
try {
    execSync('npm run build:webview:production', { stdio: 'inherit' });
    console.log('Webview构建完成\n');
} catch (error) {
    console.error('Webview构建失败:', error.message);
    process.exit(1);
}

// 步骤4: 验证关键文件存在
console.log('验证构建产物...');
const criticalFiles = [
    'out/bundle.js',
    'webviews/visual-editor/clang-format/dist/index.js',
    'webviews/visual-editor/clang-format/dist/index.css'
];

let allFilesExist = true;
criticalFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`${file} 存在`);
    } else {
        console.error(`${file} 不存在`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.error('\n关键文件缺失，打包中止');
    process.exit(1);
}

// 步骤5: 检查webview资源文件
console.log('\n检查webview图片资源...');
const imageDir = 'webviews/visual-editor/clang-format/dist/images';
if (fs.existsSync(imageDir)) {
    const imageFiles = fs.readdirSync(imageDir, { recursive: true });
    const webpFiles = imageFiles.filter(f => f.endsWith('.webp'));
    console.log(`找到 ${webpFiles.length} 个WebP图片文件`);
    if (webpFiles.length < 80) {
        console.warn(`图片数量可能不足，预期约85个，实际${webpFiles.length}个`);
    }
} else {
    console.error(`图片目录不存在: ${imageDir}`);
    allFilesExist = false;
}

if (!allFilesExist) {
    console.error('\n资源文件检查失败，打包中止');
    process.exit(1);
}

console.log('所有验证通过\n');

// 步骤6: 创建VSIX包
console.log('创建VSIX包...');
try {
    execSync('npx @vscode/vsce package --no-dependencies', { stdio: 'inherit' });

    // 查找生成的VSIX文件
    const vsixFiles = fs.readdirSync('.').filter(f => f.endsWith('.vsix'));
    if (vsixFiles.length > 0) {
        const vsixFile = vsixFiles[0];
        const stats = fs.statSync(vsixFile);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`\n打包成功！`);
        console.log(`文件名: ${vsixFile}`);
        console.log(`文件大小: ${sizeInMB} MB`);
        console.log(`位置: ${path.resolve(vsixFile)}`);
    } else {
        console.error('找不到生成的VSIX文件');
        process.exit(1);
    }
} catch (error) {
    console.error('VSIX打包失败:', error.message);
    process.exit(1);
}

console.log('\n完整打包流程完成！');
