#!/usr/bin/env node

/**
 * Clotho Monorepo Build Script
 * TypeScript-based replacement for PowerShell scripts
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const commands = {
    help: showHelp,
    install: installDependencies,
    build: buildAll,
    clean: cleanAll,
    dev: devMode,
    watch: watchMode,
    test: runTests,
    package: packageExtension
};

function showHelp() {
    console.log(`
🏗️  Clotho Monorepo Build Script
================================

Usage: node build.js <command>

Commands:
  help      - Show this help message
  install   - Install all dependencies for the entire monorepo
  build     - Build both extension and webview
  clean     - Clean all build artifacts
  dev       - Start development mode (build + launch VS Code)
  watch     - Start watch mode for development
  test      - Run tests
  package   - Package the extension for distribution

Examples:
  node build.js install
  node build.js build
  node build.js dev
  node build.js watch
`);
}

function runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
        console.log(`🚀 Running: ${command} ${args.join(' ')}`);

        const process = spawn(command, args, {
            stdio: 'inherit',
            shell: true,
            ...options
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with exit code ${code}`));
            }
        });

        process.on('error', (error) => {
            reject(error);
        });
    });
}

async function installDependencies() {
    console.log('📦 Installing dependencies...');
    await runCommand('npm', ['install']);
    console.log('✅ Dependencies installed successfully!');
}

async function buildAll() {
    console.log('🔨 Building extension and webview...');
    await runCommand('npm', ['run', 'build']);
    console.log('✅ Build completed successfully!');
}

async function cleanAll() {
    console.log('🧹 Cleaning build artifacts...');
    await runCommand('npm', ['run', 'clean']);
    console.log('✅ Clean completed successfully!');
}

async function devMode() {
    console.log('🚀 Starting development mode...');
    await buildAll();
    console.log('📱 Launching VS Code extension host...');
    await runCommand('code', ['--extensionDevelopmentPath=.', '--new-window']);
}

async function watchMode() {
    console.log('👀 Starting watch mode...');
    await runCommand('npm', ['run', 'watch']);
}

async function runTests() {
    console.log('🧪 Running tests...');
    await runCommand('npm', ['test']);
    console.log('✅ Tests completed successfully!');
}

async function packageExtension() {
    console.log('📦 Packaging extension...');
    await buildAll();
    await runCommand('npm', ['run', 'package']);
    console.log('✅ Extension packaged successfully!');
}

async function main() {
    const command = process.argv[2] || 'help';

    if (!commands[command]) {
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }

    try {
        await commands[command]();
    } catch (error) {
        console.error(`❌ Error executing command '${command}':`, error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { commands, runCommand };
