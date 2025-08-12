#!/usr/bin/env node

// 确保在Windows上也能正常运行
if (process.platform === 'win32') {
    // Windows兼容性处理
}

/**
 * 快速开发环境启动脚本
 * F5 按键触发的开发环境自动化脚本
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
    log(`[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

// 检查项目环境
function checkEnvironment() {
    logStep('1', 'Checking development environment...');
    
    // 检查必要文件
    const requiredFiles = [
        'package.json',
        'tsconfig.json', 
        'esbuild.config.mjs',
        'src/extension.ts'
    ];
    
    for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
            logError(`Required file missing: ${file}`);
            process.exit(1);
        }
    }
    
    // 检查 node_modules
    if (!fs.existsSync('node_modules')) {
        logWarning('node_modules not found, running npm install...');
        try {
            execSync('npm install', { stdio: 'inherit' });
            logSuccess('Dependencies installed');
        } catch (error) {
            logError('Failed to install dependencies');
            process.exit(1);
        }
    }
    
    logSuccess('Environment check passed');
}

// 清理构建产物
function cleanBuild() {
    logStep('2', 'Cleaning previous build...');
    
    const dirsToClean = ['out', 'dist'];
    dirsToClean.forEach(dir => {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
            log(`  Cleaned: ${dir}`, 'blue');
        }
    });
    
    logSuccess('Build directory cleaned');
}

// 快速构建
function buildProject() {
    logStep('3', 'Building project (fast mode)...');
    
    try {
        // 使用已有的build:fast脚本
        log('  Running build:fast...', 'blue');
        execSync('npm run build:fast', { stdio: 'inherit' });
        
        logSuccess('Project built successfully');
    } catch (error) {
        logError(`Build failed: ${error.message}`);
        process.exit(1);
    }
}

// 验证构建结果
function validateBuild() {
    logStep('4', 'Validating build output...');
    
    const expectedFiles = [
        'out/bundle.js',
        'webviews/visual-editor/clang-format/dist/index.js'
    ];
    
    for (const file of expectedFiles) {
        if (!fs.existsSync(file)) {
            logError(`Expected output file missing: ${file}`);
            process.exit(1);
        }
    }
    
    logSuccess('Build validation passed');
}

// 显示开发信息
function showDevInfo() {
    logStep('5', 'Development environment ready!');
    
    log('', 'reset');
    log('🚀 Clotho Extension Development Environment', 'bright');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    log('', 'reset');
    
    log('📁 Project Structure:', 'bright');
    log('  ├── src/              (TypeScript source)', 'blue');
    log('  ├── webviews/         (React webview)', 'blue'); 
    log('  ├── out/              (Compiled output)', 'blue');
    log('  └── dist/             (Production build)', 'blue');
    log('', 'reset');
    
    log('🛠️  Available Commands:', 'bright');
    log('  • npm run dev         (Start development server)', 'green');
    log('  • npm run build       (Full build)', 'green');
    log('  • npm run watch       (Watch mode)', 'green');
    log('  • npm run package     (Create VSIX)', 'green');
    log('', 'reset');
    
    log('🔧 VS Code will now launch with the extension loaded...', 'cyan');
    log('', 'reset');
}

// 主函数
async function main() {
    const startTime = Date.now();
    
    log('', 'reset');
    log('🧵 Clotho Extension - Quick Development Setup', 'bright');
    log('================================================', 'blue');
    log('', 'reset');
    
    try {
        checkEnvironment();
        cleanBuild();
        buildProject();
        validateBuild();
        showDevInfo();
        
        const duration = Date.now() - startTime;
        log(`⚡ Setup completed in ${duration}ms`, 'green');
        log('', 'reset');
        
        // 成功退出，让 VS Code launch configuration 接管
        process.exit(0);
        
    } catch (error) {
        logError(`Setup failed: ${error.message}`);
        process.exit(1);
    }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    logError(`Uncaught exception: ${error.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logError(`Unhandled rejection: ${reason}`);
    process.exit(1);
});

// 运行主函数
main();
