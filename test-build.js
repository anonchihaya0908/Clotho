#!/usr/bin/env node

/**
 * Build System Test Script
 * 验证新的构建系统是否正常工作
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Clotho Build System');
console.log('================================\n');

async function runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
        console.log(`▶️  Running: ${command} ${args.join(' ')}`);

        const process = spawn(command, args, {
            stdio: 'pipe',
            shell: true
        });

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ Success!\n`);
                resolve({ stdout, stderr });
            } else {
                console.log(`❌ Failed with code ${code}`);
                if (stderr) console.log(`Error: ${stderr}`);
                reject(new Error(`Command failed with exit code ${code}`));
            }
        });
    });
}

function checkFile(filePath, description) {
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${description}: ${filePath}`);
        return true;
    } else {
        console.log(`❌ ${description} not found: ${filePath}`);
        return false;
    }
}

async function testBuildSystem() {
    console.log('1️⃣  Testing clean...');
    try {
        await runCommand('npm', ['run', 'clean']);
    } catch (error) {
        console.log('⚠️  Clean failed, continuing...\n');
    }

    console.log('2️⃣  Testing build...');
    await runCommand('npm', ['run', 'build']);

    console.log('3️⃣  Checking build outputs...');
    const checks = [
        checkFile('out/bundle.js', 'Extension bundle'),
        checkFile('webviews/visual-editor/clang-format/dist/index.js', 'Webview JS'),
        checkFile('webviews/visual-editor/clang-format/dist/index.css', 'Webview CSS')
    ];

    const allPassed = checks.every(check => check);

    console.log('\n🎯 Test Results:');
    if (allPassed) {
        console.log('✅ All tests passed! Build system is working correctly.');
        console.log('\n📋 Next steps:');
        console.log('  • Press F5 in VS Code to start debugging');
        console.log('  • Or run: npm run dev');
        console.log('  • Or run: node build.js dev');
    } else {
        console.log('❌ Some tests failed. Please check the build configuration.');
    }

    return allPassed;
}

// Run tests
testBuildSystem()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    });
