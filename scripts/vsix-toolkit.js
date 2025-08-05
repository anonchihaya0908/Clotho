#!/usr/bin/env node

/**
 * VSIX工具包 - 统一的VSIX诊断、修复和打包工具
 * 整合了之前分散的多个脚本功能
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COMMANDS = {
    diagnose: '诊断VSIX打包问题',
    fix: '修复常见的打包配置问题',
    inspect: '检查已打包的VSIX文件内容',
    package: '执行完整的打包流程'
};

function showHelp() {
    console.log(' Clotho VSIX工具包\n');
    console.log('用法: node scripts/vsix-toolkit.js <command>\n');
    console.log('可用命令:');
    Object.entries(COMMANDS).forEach(([cmd, desc]) => {
        console.log(`  ${cmd.padEnd(10)} - ${desc}`);
    });
    console.log('\n示例:');
    console.log('  node scripts/vsix-toolkit.js diagnose');
    console.log('  node scripts/vsix-toolkit.js fix');
}

function diagnose() {
    console.log(' 开始诊断VSIX打包问题...\n');
    
    // 检查关键文件
    console.log(' 检查关键文件...');
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
            console.log(` ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
        } else {
            console.log(` ${file} - 文件不存在`);
            missingFiles.push(file);
        }
    });
    
    if (missingFiles.length > 0) {
        console.log(`\n 发现 ${missingFiles.length} 个缺失文件，请先运行构建命令：`);
        console.log('npm run build:production');
        return false;
    }
    
    // 检查webview资源
    console.log('\n 检查webview资源...');
    const webviewDist = 'webviews/visual-editor/clang-format/dist';
    if (fs.existsSync(webviewDist)) {
        const files = fs.readdirSync(webviewDist);
        console.log(` webview dist目录包含 ${files.length} 个文件`);
        
        const jsFiles = files.filter(f => f.endsWith('.js'));
        const cssFiles = files.filter(f => f.endsWith('.css'));
        console.log(` JS文件: ${jsFiles.length},  CSS文件: ${cssFiles.length}`);
    } else {
        console.log(' webview dist目录不存在');
        return false;
    }
    
    // 检查.vscodeignore配置
    console.log('\n 检查.vscodeignore配置...');
    if (fs.existsSync('.vscodeignore')) {
        const ignoreContent = fs.readFileSync('.vscodeignore', 'utf-8');
        console.log(' .vscodeignore文件存在');
        
        if (ignoreContent.includes('!webviews/**/dist/**')) {
            console.log(' webview dist目录被正确包含');
        } else {
            console.log('  webview dist目录可能没有被正确包含');
        }
    } else {
        console.log(' .vscodeignore文件不存在');
        return false;
    }
    
    console.log('\n 诊断完成！');
    return true;
}

function fix() {
    console.log(' 开始修复VSIX打包问题...\n');
    
    // 确保.vscodeignore配置正确
    console.log(' 修复.vscodeignore配置...');
    const vscodeignoreContent = `# Source maps and TypeScript files
out/**/*.map
src/**
tsconfig.json
.vscode-test/
*.vsix
.DS_Store
.vscode/settings.json
.vscode/launch.json
.vscode/tasks.json
.eslintrc.json
**/*.ts
!out/**/*.js

# Development files
node_modules/
.git/
.gitignore
.github/
scripts/
esbuild.config.mjs
webpack.config.js

# Webview source files (exclude source, include built dist)
webviews/**/src/**
webviews/**/node_modules/**
webviews/**/package-lock.json
webviews/**/*.ts
webviews/**/*.tsx
webviews/**/tsconfig.json
webviews/**/webpack.config.js

# CRITICAL: Keep the built webview assets
!webviews/**/dist/**
!webviews/**/dist/**/*.js
!webviews/**/dist/**/*.css
!webviews/**/dist/**/*.webp
!webviews/**/dist/**/*.png
!webviews/**/dist/**/*.svg
!webviews/**/dist/**/*.json

# Keep important config files
!package.json
!README.md
!LICENSE
!CHANGELOG.md
`;
    
    fs.writeFileSync('.vscodeignore', vscodeignoreContent);
    console.log(' .vscodeignore已更新');
    
    console.log('\n 修复完成！');
}

function inspect(vsixPath) {
    if (!vsixPath) {
        // 查找最新的VSIX文件
        const vsixFiles = fs.readdirSync('.').filter(f => f.endsWith('.vsix'));
        if (vsixFiles.length === 0) {
            console.log(' 未找到VSIX文件');
            return;
        }
        vsixPath = vsixFiles.sort().pop(); // 获取最新的
    }
    
    console.log(` 检查VSIX文件: ${vsixPath}\n`);
    
    try {
        const result = execSync(`npx @vscode/vsce ls ${vsixPath}`, { encoding: 'utf-8' });
        const lines = result.split('\n').filter(line => line.trim());
        
        console.log(` VSIX包含 ${lines.length} 个文件:`);
        
        // 检查关键文件
        const webviewFiles = lines.filter(line => line.includes('webviews') && line.includes('dist'));
        console.log(` webview相关文件: ${webviewFiles.length} 个`);
        
        const jsFiles = lines.filter(line => line.endsWith('.js'));
        const cssFiles = lines.filter(line => line.endsWith('.css'));
        console.log(` JS文件: ${jsFiles.length} 个`);
        console.log(` CSS文件: ${cssFiles.length} 个`);
        
    } catch (error) {
        console.error(' 检查失败:', error.message);
    }
}

function packageExtension() {
    console.log(' 开始完整打包流程...\n');
    
    try {
        console.log('1⃣ 清理旧文件...');
        execSync('npm run clean', { stdio: 'inherit' });
        
        console.log('\n2⃣ 构建项目...');
        execSync('npm run build:production', { stdio: 'inherit' });
        
        console.log('\n3⃣ 诊断检查...');
        if (!diagnose()) {
            console.log(' 诊断失败，停止打包');
            return;
        }
        
        console.log('\n4⃣ 创建VSIX包...');
        execSync('npx @vscode/vsce package', { stdio: 'inherit' });
        
        console.log('\n 打包完成！');
        
    } catch (error) {
        console.error(' 打包失败:', error.message);
    }
}

// 主程序
const command = process.argv[2];

if (!command || !COMMANDS[command]) {
    showHelp();
    process.exit(1);
}

switch (command) {
    case 'diagnose':
        diagnose();
        break;
    case 'fix':
        fix();
        break;
    case 'inspect':
        inspect(process.argv[3]);
        break;
    case 'package':
        packageExtension();
        break;
    default:
        showHelp();
}
