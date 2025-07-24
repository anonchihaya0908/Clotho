/**
 * Bootstrap Module
 * ================
 *
 * This module is responsible for setting up and initializing all services
 * and their dependencies in the correct order. It acts as the central place
 * where the Dependency Injection (DI) container is configured.
 */

import * as vscode from 'vscode';
import { ServiceContainer } from './common/service-container';
import { PairCoordinator, PairCreatorService, PairCreatorUI } from './create-source-header-pair';
import { PairingRuleService, PairingRuleUI, PairingRuleCoordinator } from './pairing-rule-manager';
import { SwitchCoordinator, SwitchService, SwitchUI } from './switch-header-source';
import { MonitorCoordinator } from './clangd-monitor';
// 使用重构后的协调器
import { ClangFormatEditorCoordinator } from './visual-editor/clang-format/coordinator';
import { ClangFormatGuideService } from './visual-editor/clang-format/guide-service';
// import * as ClangFormatModule from './visual-editor/clang-format'; // 未使用，已注释
import { ClangFormatPreviewProvider } from './visual-editor/clang-format/preview-provider';
import { COMMANDS } from './common/constants';

export let serviceContainer: ServiceContainer;

/**
 * Bootstrap the entire extension.
 * This function is called once when the extension is activated.
 * It registers all service factories and initializes the main coordinators.
 *
 * @param context The VS Code extension context
 */
export async function bootstrap(context: vscode.ExtensionContext): Promise<void> {
    // Initialize the service container
    serviceContainer = new ServiceContainer();

    // Register all services in the container
    registerServices(context);

    // 激活 Clang-Format 可视化编辑器模块（注册虚拟文档提供者）
    try {
        ClangFormatPreviewProvider.register(context);
        console.log('Clotho: Successfully registered ClangFormatPreviewProvider');
    } catch (error) {
        console.error('Clotho: Failed to register ClangFormatPreviewProvider', error);
        // 不抛出错误，允许扩展继续运行
    }

    // Initialize main coordinators
    await initializeCoordinators();

    // 注册命令：打开Clang-Format编辑器
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.OPEN_CLANG_FORMAT_EDITOR, async () => {
            try {
                const coordinator = serviceContainer.get('clangFormatVisualEditorCoordinator');
                await coordinator.showEditor();
            } catch (error) {
                console.error('Failed to open Clang-Format editor:', error);
                vscode.window.showErrorMessage('Failed to open Clang-Format editor. See console for details.');
            }
        })
    );

    // Register the service container for cleanup
    context.subscriptions.push({
        dispose: () => cleanup()
    });
}

/**
 * Register all service factories in the container.
 * Each service is registered with a factory function that defines how to create it.
 * Dependencies are resolved by calling `container.get()` for the required services.
 */
function registerServices(context: vscode.ExtensionContext): void {
    // Pairing Rule Manager
    serviceContainer.register('pairingRuleService', () => new PairingRuleService());
    serviceContainer.register('pairingRuleUI', (container) =>
        new PairingRuleUI(container.get('pairingRuleService')));
    serviceContainer.register('pairingRuleCoordinator', (container) =>
        new PairingRuleCoordinator(
            container.get('pairingRuleService'),
            container.get('pairingRuleUI')
        ));

    // Create Source/Header Pair
    serviceContainer.register('pairCreatorService', (container) =>
        new PairCreatorService(container.get('pairingRuleService')));
    serviceContainer.register('pairCreatorUI', (container) =>
        new PairCreatorUI(
            container.get('pairCreatorService'),
            container.get('pairingRuleService'),
            container.get('pairingRuleUI')
        ));
    serviceContainer.register('pairCoordinator', (container) =>
        new PairCoordinator(
            container.get('pairCreatorService'),
            container.get('pairCreatorUI')
        ));

    // Switch Header/Source
    serviceContainer.register('switchService', () => new SwitchService());
    serviceContainer.register('switchUI', () => new SwitchUI());
    serviceContainer.register('switchCoordinator', (container) =>
        new SwitchCoordinator(
            container.get('switchService'),
            container.get('switchUI')
        ));

    // Clangd Monitor - pass configuration from VS Code settings
    serviceContainer.register('monitorCoordinator', () => {
        const config = vscode.workspace.getConfiguration('clotho.clangdMonitor');
        return new MonitorCoordinator({
            memory: {
                updateInterval: config.get<number>('updateInterval', 5000),
                warningThreshold: config.get<number>('warningThreshold', 2048), // 2GB (yellow)
                errorThreshold: config.get<number>('errorThreshold', 4096) // 4GB (red)
            },
            cpu: {
                updateInterval: config.get<number>('updateInterval', 3000),
                warningThreshold: config.get<number>('cpuWarningThreshold', 50), // 50% (yellow)
                errorThreshold: config.get<number>('cpuErrorThreshold', 80), // 80% (red)
                normalizeCpu: true,
                showRawCpuInTooltip: true
            }
        });
    });

    // Clang-Format Visual Editor - 使用重构后的协调器
    serviceContainer.register('clangFormatVisualEditorCoordinator', () =>
        new ClangFormatEditorCoordinator(context.extensionUri)
    );

    // 新增：多实例协调器（可选）
    try {
        const { MultiInstanceClangFormatCoordinator } = require('./visual-editor/clang-format/core/multi-instance-coordinator');
        serviceContainer.register('multiInstanceClangFormatCoordinator', () =>
            new MultiInstanceClangFormatCoordinator(context.extensionUri)
        );
    } catch (error) {
        console.warn('MultiInstanceClangFormatCoordinator not available:', error);
    }

    // 新增：防抖集成测试（可选）
    try {
        const { DebounceIntegration } = require('./visual-editor/clang-format/core/debounce-integration');
        serviceContainer.register('debounceIntegration', () =>
            new DebounceIntegration(context.extensionUri)
        );
    } catch (error) {
        console.warn('DebounceIntegration not available:', error);
    }

    // Clang-Format Guide Service
    serviceContainer.register('clangFormatGuideService', () =>
        new ClangFormatGuideService()
    );
}

/**
 * Initialize the main coordinators.
 * These coordinators register commands and manage the lifecycle of their respective features.
 * The coordinators automatically register commands in their constructors.
 */
async function initializeCoordinators(): Promise<void> {
    // Initialize coordinators that only register commands
    serviceContainer.get('pairingRuleCoordinator');
    serviceContainer.get('pairCoordinator');
    serviceContainer.get('switchCoordinator');
    serviceContainer.get('clangFormatGuideService');

    // 注册防抖测试命令（如果可用）
    if (serviceContainer.has('debounceIntegration')) {
        const debounceIntegration = serviceContainer.get('debounceIntegration');
        vscode.commands.registerCommand('clotho.testDebounce', async () => {
            try {
                console.log('🧪 Starting debounce test...');

                // 创建测试用的防抖处理器
                const testHandler = debounceIntegration.createDebouncedPreviewCloseHandler(async () => {
                    console.log('📄 Original handler would be called here');
                });

                // 模拟快速调用
                console.log('⚡ Simulating rapid calls...');
                testHandler();
                testHandler();
                testHandler();

                // 显示统计信息
                const stats = debounceIntegration.getStats();
                console.log('📊 Debounce stats:', stats);

                vscode.window.showInformationMessage(
                    `Debounce test completed! Check console for details. Active timers: ${stats.debounceManager.activeTimers.length}`
                );

            } catch (error) {
                console.error('❌ Debounce test failed:', error);
                vscode.window.showErrorMessage(`Debounce test failed: ${error}`);
            }
        });
    }

    // 注册手动测试命令
    vscode.commands.registerCommand('clotho.testDebounceManual', async () => {
        const { runManualDebounceTest } = require('./test/manual-debounce-test');
        await runManualDebounceTest();
    });

    vscode.commands.registerCommand('clotho.testRapidSwitching', async () => {
        const { testRapidSwitching } = require('./test/manual-debounce-test');
        await testRapidSwitching();
    });

    // 注册占位符测试命令
    vscode.commands.registerCommand('clotho.testPlaceholder', async () => {
        const { runAllPlaceholderTests } = require('./visual-editor/clang-format/test/placeholder-test');
        await runAllPlaceholderTests();
    });

    vscode.commands.registerCommand('clotho.testPlaceholderBasic', async () => {
        const { testPlaceholderBasicFunctionality } = require('./visual-editor/clang-format/test/placeholder-test');
        await testPlaceholderBasicFunctionality();
    });

    vscode.commands.registerCommand('clotho.testMainEditorClose', async () => {
        const { testMainEditorCloseLogic } = require('./visual-editor/clang-format/test/placeholder-test');
        await testMainEditorCloseLogic();
    });

    vscode.commands.registerCommand('clotho.testPreviewClose', async () => {
        const { testPreviewCloseLogic } = require('./visual-editor/clang-format/test/placeholder-test');
        await testPreviewCloseLogic();
    });

    vscode.commands.registerCommand('clotho.testDirectPlaceholder', async () => {
        const { testDirectPlaceholderCreation } = require('./visual-editor/clang-format/test/placeholder-test');
        await testDirectPlaceholderCreation();
    });

    // 调试命令：强制创建占位符
    vscode.commands.registerCommand('clotho.forceCreatePlaceholder', async () => {
        try {
            console.log('🔥 Force creating placeholder via debug command...');

            // 获取协调器实例
            const coordinator = serviceContainer.get('clangFormatVisualEditorCoordinator');

            // 通过反射访问私有成员（仅用于调试）
            const placeholderManager = (coordinator as any).placeholderManager;

            if (placeholderManager && typeof placeholderManager.forceCreatePlaceholder === 'function') {
                await placeholderManager.forceCreatePlaceholder();
                vscode.window.showInformationMessage('强制创建占位符完成！检查右侧是否出现占位符。');
            } else {
                vscode.window.showErrorMessage('无法访问占位符管理器');
            }
        } catch (error) {
            console.error('Force create placeholder failed:', error);
            vscode.window.showErrorMessage(`强制创建占位符失败: ${error}`);
        }
    });

    // Initialize and start the monitor coordinator
    const monitorCoordinator = serviceContainer.get('monitorCoordinator');

    // Check if clangd monitoring is enabled in configuration
    const config = vscode.workspace.getConfiguration('clotho.clangdMonitor');
    const isMonitoringEnabled = config.get<boolean>('enabled', true);

    if (isMonitoringEnabled) {
        try {
            await monitorCoordinator.startMonitoring();
            console.log('Clotho: Clangd monitoring started successfully');
        } catch (error) {
            console.error('Clotho: Failed to start clangd monitoring:', error);
        }
    } else {
        console.log('Clotho: Clangd monitoring is disabled in configuration');
    }
}

/**
 * Clean up all services when the extension is deactivated.
 */
export function cleanup(): void {
    if (serviceContainer) {
        serviceContainer.dispose();
    }
}
// 调试命令：检查编辑器组状态
vscode.commands.registerCommand('clotho.checkEditorGroups', async () => {
    const { checkEditorGroupsStatus } = require('./visual-editor/clang-format/test/placeholder-test');
    await checkEditorGroupsStatus();
});
// 调试命令：测试占位符和预览切换
vscode.commands.registerCommand('clotho.testPlaceholderSwitching', async () => {
    const { testPlaceholderPreviewSwitching } = require('./visual-editor/clang-format/test/placeholder-test');
    await testPlaceholderPreviewSwitching();
});