#!/usr/bin/env node

/**
 * 独立的开发启动脚本
 * 编译 TypeScript 并启动 VS Code 扩展开发模式
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔨 Starting Clotho development environment...');

// 检查是否存在 TypeScript 编译器
function checkTypeScript() {
    try {
        require.resolve('typescript');
        return true;
    } catch (error) {
        console.error('❌ TypeScript not found. Please run: npm install');
        return false;
    }
}

// 编译 TypeScript
function compile() {
    return new Promise((resolve, reject) => {
        console.log('📦 Compiling TypeScript...');

        const tsc = spawn('npx', ['tsc', '-p', '.'], {
            stdio: 'inherit',
            shell: true,
            cwd: __dirname
        });

        tsc.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Compilation successful!');
                resolve();
            } else {
                console.error('❌ Compilation failed!');
                reject(new Error(`TypeScript compilation failed with code ${code}`));
            }
        });
    });
}

// 启动 VS Code 扩展开发模式
function startVSCode() {
    console.log('🚀 Starting VS Code Extension Development Host...');

    const vscode = spawn('code', [
        '--extensionDevelopmentPath=' + __dirname,
        '--new-window'
    ], {
        stdio: 'inherit',
        shell: true,
        detached: true
    });

    vscode.on('error', (error) => {
        if (error.code === 'ENOENT') {
            console.error('❌ VS Code command not found. Please ensure VS Code is installed and added to PATH.');
            console.log('💡 Try installing VS Code command line tools: Ctrl+Shift+P -> "Shell Command: Install \'code\' command in PATH"');
        } else {
            console.error('❌ Failed to start VS Code:', error.message);
        }
    });

    // 分离进程，让脚本可以正常退出
    vscode.unref();
}

// 主函数
async function main() {
    try {
        if (!checkTypeScript()) {
            process.exit(1);
        }

        await compile();
        startVSCode();

        console.log('🎉 Development environment started successfully!');
        console.log('📝 You can now test your extension in the new VS Code window.');

    } catch (error) {
        console.error('❌ Failed to start development environment:', error.message);
        process.exit(1);
    }
}

// 处理命令行参数
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Clotho Development Script

Usage:
  node dev.js          Start development environment
  node dev.js --help   Show this help message

What this script does:
1. Compiles TypeScript source code
2. Starts VS Code Extension Development Host
3. Opens a new VS Code window for testing

Requirements:
- Node.js and npm installed
- VS Code installed with 'code' command available
- Run 'npm install' first to install dependencies
  `);
    process.exit(0);
}

main();
