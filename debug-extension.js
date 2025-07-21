#!/usr/bin/env node

/**
 * Extension Debug Script
 * 调试扩展激活和命令注册问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Clotho Extension Debug');
console.log('==========================\n');

function checkFile(filePath, description) {
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${description}: ${path.relative('.', filePath)}`);
        return true;
    } else {
        console.log(`❌ ${description} not found: ${path.relative('.', filePath)}`);
        return false;
    }
}

function analyzePackageJson() {
    console.log('📦 Analyzing package.json...');

    try {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

        // 检查主入口点
        console.log(`📍 Main entry: ${pkg.main}`);
        checkFile(pkg.main, 'Main bundle');

        // 检查命令定义
        const commands = pkg.contributes?.commands || [];
        const configureRulesCmd = commands.find(cmd => cmd.command === 'clotho.configureRules');

        if (configureRulesCmd) {
            console.log(`✅ Configure Rules command found: ${configureRulesCmd.title}`);
        } else {
            console.log(`❌ Configure Rules command NOT found in package.json`);
        }

        // 检查激活事件
        const activationEvents = pkg.activationEvents || [];
        console.log(`🚀 Activation events: ${activationEvents.join(', ')}`);

        return true;
    } catch (error) {
        console.log(`❌ Failed to analyze package.json: ${error.message}`);
        return false;
    }
}

function checkBuildOutputs() {
    console.log('\n🏗️  Checking build outputs...');

    const files = [
        'out/bundle.js',
        'out/bundle.js.map',
        'webviews/visual-editor/clang-format/dist/index.js',
        'webviews/visual-editor/clang-format/dist/index.css'
    ];

    return files.map(file => checkFile(file, path.basename(file))).every(Boolean);
}

function analyzeBundleSize() {
    console.log('\n📊 Bundle analysis...');

    try {
        const bundlePath = 'out/bundle.js';
        if (fs.existsSync(bundlePath)) {
            const stats = fs.statSync(bundlePath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            console.log(`📦 Bundle size: ${sizeKB} KB`);

            if (stats.size > 0) {
                console.log(`✅ Bundle is not empty`);
                return true;
            } else {
                console.log(`❌ Bundle is empty`);
                return false;
            }
        } else {
            console.log(`❌ Bundle not found`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Bundle analysis failed: ${error.message}`);
        return false;
    }
}

function generateDebugInfo() {
    console.log('\n🔧 Debug Information');
    console.log('====================');

    // 提供调试建议
    console.log('1. Press F5 in VS Code to start debugging');
    console.log('2. Open VS Code Developer Tools (Help → Toggle Developer Tools)');
    console.log('3. Check the Console tab for any error messages');
    console.log('4. Try running the command manually:');
    console.log('   • Press Ctrl+Shift+P');
    console.log('   • Type "Clotho: Configure"');
    console.log('   • Look for the command in the list');
    console.log('\n5. If command is missing, check extension activation:');
    console.log('   • Open a .cpp or .c file to trigger activation');
    console.log('   • Check Extensions view to see if Clotho is active');
}

// 运行所有检查
async function main() {
    const checks = [
        analyzePackageJson(),
        checkBuildOutputs(),
        analyzeBundleSize()
    ];

    const allPassed = checks.every(Boolean);

    console.log('\n🎯 Debug Results:');
    if (allPassed) {
        console.log('✅ All checks passed. Extension should work correctly.');
        console.log('⚠️  If commands are still missing, this is likely a runtime activation issue.');
    } else {
        console.log('❌ Some checks failed. Please resolve the issues above.');
    }

    generateDebugInfo();
}

main().catch(console.error);
