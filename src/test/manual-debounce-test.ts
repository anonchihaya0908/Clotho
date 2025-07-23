/**
 * 手动防抖测试
 * 用于在VS Code中手动测试防抖机制
 */

import * as vscode from 'vscode';
import { DebounceManager } from '../visual-editor/clang-format/core/debounce-manager';
import { TransitionManager } from '../visual-editor/clang-format/core/transition-manager';

/**
 * 手动测试防抖功能
 */
export async function runManualDebounceTest(): Promise<void> {
    console.log('🧪 Starting manual debounce test...');

    const debounceManager = new DebounceManager();
    let callCount = 0;

    try {
        // 测试1: 基础防抖功能
        console.log('📝 Test 1: Basic debounce functionality');

        const testFunction = async () => {
            callCount++;
            console.log(`✅ Function executed, call count: ${callCount}`);
        };

        const debouncedFunction = debounceManager.debounce(
            'manual-test',
            testFunction,
            { delay: 200 }
        );

        // 快速调用多次
        console.log('⚡ Making rapid calls...');
        debouncedFunction();
        debouncedFunction();
        debouncedFunction();
        debouncedFunction();
        debouncedFunction();

        // 等待防抖完成
        await new Promise(resolve => setTimeout(resolve, 300));

        console.log(`📊 Result: Function called ${callCount} times (expected: 1)`);

        // 测试2: 锁机制
        console.log('\n📝 Test 2: Lock mechanism');

        let lockTestCount = 0;
        const lockTestFunction = async () => {
            lockTestCount++;
            console.log(`🔒 Lock test function executed, count: ${lockTestCount}`);
            await new Promise(resolve => setTimeout(resolve, 100));
        };

        // 并发执行
        console.log('🔄 Testing concurrent execution...');
        const promises = [
            debounceManager.withLock('lock-test', lockTestFunction),
            debounceManager.withLock('lock-test', lockTestFunction).catch(() => console.log('❌ Second call blocked (expected)')),
            debounceManager.withLock('lock-test', lockTestFunction).catch(() => console.log('❌ Third call blocked (expected)'))
        ];

        await Promise.allSettled(promises);
        console.log(`📊 Result: Lock test function called ${lockTestCount} times (expected: 1)`);

        // 测试3: 过渡管理器
        console.log('\n📝 Test 3: Transition manager');

        const extensionUri = vscode.Uri.file(__dirname);
        const transitionManager = new TransitionManager(extensionUri);

        console.log('🎭 Testing easter egg transition...');

        try {
            await transitionManager.switchToEasterEgg(async () => {
                // 模拟创建彩蛋webview
                const panel = vscode.window.createWebviewPanel(
                    'testEasterEgg',
                    'Test Easter Egg',
                    vscode.ViewColumn.Two,
                    { enableScripts: false }
                );

                panel.webview.html = `
                    <html>
                        <body style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
                            <div style="text-align: center;">
                                <h1>🎭</h1>
                                <p>Debounce Test Successful!</p>
                                <p>Transition completed without flickering.</p>
                            </div>
                        </body>
                    </html>
                `;

                console.log('✅ Easter egg webview created successfully');
                return panel;
            });

            console.log('✅ Transition test completed successfully');

        } catch (error) {
            console.error('❌ Transition test failed:', error);
        }

        // 显示统计信息
        const stats = debounceManager.getStatus();
        console.log('\n📊 Final Statistics:');
        console.log(`- Active timers: ${stats.activeTimers.length}`);
        console.log(`- Active locks: ${stats.activeLocks.length}`);
        console.log(`- Pending queues: ${stats.pendingQueues.length}`);

        // 显示成功消息
        vscode.window.showInformationMessage(
            `Debounce test completed! Check console for details. Calls: ${callCount}/1, Locks: ${lockTestCount}/1`,
            'Show Console'
        ).then(selection => {
            if (selection === 'Show Console') {
                vscode.commands.executeCommand('workbench.action.toggleDevTools');
            }
        });

    } catch (error) {
        console.error('❌ Manual debounce test failed:', error);
        vscode.window.showErrorMessage(`Debounce test failed: ${error}`);
    } finally {
        // 清理资源
        debounceManager.dispose();
        console.log('🧹 Test cleanup completed');
    }
}

/**
 * 测试快速切换场景
 */
export async function testRapidSwitching(): Promise<void> {
    console.log('🚀 Testing rapid switching scenario...');

    const debounceManager = new DebounceManager();
    let switchCount = 0;

    const switchFunction = debounceManager.debounce(
        'rapid-switch-test',
        async () => {
            switchCount++;
            console.log(`🔄 Switch executed: ${switchCount}`);

            // 模拟webview创建
            const panel = vscode.window.createWebviewPanel(
                'rapidSwitchTest',
                `Switch Test ${switchCount}`,
                vscode.ViewColumn.Two,
                { enableScripts: false }
            );

            panel.webview.html = `
                <html>
                    <body style="display: flex; justify-content: center; align-items: center; height: 100vh;">
                        <h2>Switch #${switchCount}</h2>
                    </body>
                </html>
            `;

            // 自动关闭面板
            setTimeout(() => {
                if (!panel.disposed) {
                    panel.dispose();
                }
            }, 1000);
        },
        { delay: 50, leading: true, trailing: false }
    );

    // 模拟用户快速点击
    console.log('⚡ Simulating rapid user clicks...');
    for (let i = 0; i < 10; i++) {
        switchFunction();
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // 等待完成
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log(`📊 Rapid switching result: ${switchCount} switches (expected: 1)`);

    vscode.window.showInformationMessage(
        `Rapid switching test completed! Switches: ${switchCount}/1 (prevented ${10 - switchCount} unnecessary switches)`
    );

    debounceManager.dispose();
}