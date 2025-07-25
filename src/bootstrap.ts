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
import { logger } from './common/logger';
import {
  PairCoordinator,
  PairCreatorService,
  PairCreatorUI,
} from './create-source-header-pair';
import {
  PairingRuleService,
  PairingRuleUI,
  PairingRuleCoordinator,
} from './pairing-rule-manager';
import {
  SwitchCoordinator,
  SwitchService,
  SwitchUI,
} from './switch-header-source';
import { MonitorCoordinator } from './clangd-monitor';
import { ClangFormatEditorCoordinator } from './visual-editor/clang-format/coordinator';
import { ClangFormatGuideService } from './visual-editor/clang-format/guide-service';
import { ClangFormatPreviewProvider } from './visual-editor/clang-format/preview-provider';
import { VisualEditorDebugHelper } from './visual-editor/clang-format/debug/visual-editor-debug-helper';
import { COMMANDS } from './common/constants';

export let serviceContainer: ServiceContainer;

/**
 * Bootstrap the entire extension.
 * This function is called once when the extension is activated.
 * It registers all service factories and initializes the main coordinators.
 *
 * @param context The VS Code extension context
 */
export async function bootstrap(
  context: vscode.ExtensionContext,
): Promise<void> {
  // 🚀 初始化 Logger 系统（优先级最高）
  logger.initializeOutputChannel();
  logger.info('Clotho 扩展启动中...', { 
    module: 'Bootstrap', 
    operation: 'startup' 
  });

  // Initialize the service container
  serviceContainer = new ServiceContainer();

  // Register all services in the container
  registerServices(context);

  // 激活 Clang-Format 可视化编辑器模块（注册虚拟文档提供者）
  try {
    ClangFormatPreviewProvider.register(context);
    logger.info('ClangFormatPreviewProvider 注册成功', { 
      module: 'Bootstrap', 
      operation: 'registerPreviewProvider' 
    });
  } catch (error) {
    logger.error(
      'ClangFormatPreviewProvider 注册失败',
      error as Error,
      { 
        module: 'Bootstrap', 
        operation: 'registerPreviewProvider' 
      }
    );
    // 不抛出错误，允许扩展继续运行
  }

  // Initialize main coordinators
  await initializeCoordinators();

  // Register all commands in one place
  registerCommands(context);

  // Register the service container for cleanup
  context.subscriptions.push({
    dispose: () => cleanup(),
  });

  // 🎉 启动完成
  logger.info('Clotho 扩展启动完成', { 
    module: 'Bootstrap', 
    operation: 'startup_complete' 
  });
}

/**
 * Register all service factories in the container.
 * Each service is registered with a factory function that defines how to create it.
 * Dependencies are resolved by calling `container.get()` for the required services.
 */
function registerServices(context: vscode.ExtensionContext): void {
  // Pairing Rule Manager
  serviceContainer.register(
    'pairingRuleService',
    () => new PairingRuleService(),
  );
  serviceContainer.register(
    'pairingRuleUI',
    (container) => new PairingRuleUI(container.get('pairingRuleService')),
  );
  serviceContainer.register(
    'pairingRuleCoordinator',
    (container) =>
      new PairingRuleCoordinator(
        container.get('pairingRuleService'),
        container.get('pairingRuleUI'),
      ),
  );

  // Create Source/Header Pair
  serviceContainer.register(
    'pairCreatorService',
    (container) => new PairCreatorService(container.get('pairingRuleService')),
  );
  serviceContainer.register(
    'pairCreatorUI',
    (container) =>
      new PairCreatorUI(
        container.get('pairCreatorService'),
        container.get('pairingRuleService'),
        container.get('pairingRuleUI'),
      ),
  );
  serviceContainer.register(
    'pairCoordinator',
    (container) =>
      new PairCoordinator(
        container.get('pairCreatorService'),
        container.get('pairCreatorUI'),
      ),
  );

  // Switch Header/Source
  serviceContainer.register('switchService', () => new SwitchService());
  serviceContainer.register('switchUI', () => new SwitchUI());
  serviceContainer.register(
    'switchCoordinator',
    (container) =>
      new SwitchCoordinator(
        container.get('switchService'),
        container.get('switchUI'),
      ),
  );

  // Clangd Monitor - pass configuration from VS Code settings
  serviceContainer.register('monitorCoordinator', () => {
    const config = vscode.workspace.getConfiguration('clotho.clangdMonitor');
    return new MonitorCoordinator({
      memory: {
        updateInterval: config.get<number>('updateInterval', 5000),
        warningThreshold: config.get<number>('warningThreshold', 2048), // 2GB (yellow)
        errorThreshold: config.get<number>('errorThreshold', 4096), // 4GB (red)
      },
      cpu: {
        updateInterval: config.get<number>('updateInterval', 3000),
        warningThreshold: config.get<number>('cpuWarningThreshold', 50), // 50% (yellow)
        errorThreshold: config.get<number>('cpuErrorThreshold', 80), // 80% (red)
        normalizeCpu: true,
        showRawCpuInTooltip: true,
      },
    });
  });

  // Clang-Format Visual Editor - 使用重构后的协调器
  serviceContainer.register(
    'clangFormatEditorCoordinator',
    () => new ClangFormatEditorCoordinator(context.extensionUri),
  );

  // Clang-Format Guide Service
  serviceContainer.register(
    'clangFormatGuideService',
    () => new ClangFormatGuideService(),
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

  // Initialize and start the monitor coordinator
  const monitorCoordinator = serviceContainer.get('monitorCoordinator');

  // Check if clangd monitoring is enabled in configuration
  const config = vscode.workspace.getConfiguration('clotho.clangdMonitor');
  const isMonitoringEnabled = config.get<boolean>('enabled', true);

  if (isMonitoringEnabled) {
    try {
      await monitorCoordinator.startMonitoring();
      logger.info('Clangd 监控启动成功', { 
        module: 'Bootstrap', 
        operation: 'startMonitoring' 
      });
    } catch (error) {
      logger.error(
        'Clangd 监控启动失败', 
        error as Error,
        { 
          module: 'Bootstrap', 
          operation: 'startMonitoring' 
        }
      );
    }
  } else {
    logger.info('Clangd 监控已被配置禁用', { 
      module: 'Bootstrap', 
      operation: 'startMonitoring' 
    });
  }
}

/**
 * Clean up all services when the extension is deactivated.
 */
export function cleanup(): void {
  logger.info('Clotho 扩展正在清理资源...', { 
    module: 'Bootstrap', 
    operation: 'cleanup' 
  });

  if (serviceContainer) {
    serviceContainer.dispose();
  }

  // 清理 Logger 资源
  logger.dispose();
  
  logger.info('Clotho 扩展清理完成', { 
    module: 'Bootstrap', 
    operation: 'cleanup_complete' 
  });
}

/**
 * Register all VS Code commands in one centralized place.
 * This makes it easier to manage and maintain all command registrations.
 */
function registerCommands(context: vscode.ExtensionContext): void {
  // Pairing Rule Manager Commands
  const configureRulesCommand = vscode.commands.registerCommand(
    COMMANDS.CONFIGURE_RULES,
    async () => {
      try {
        const coordinator = serviceContainer.get('pairingRuleCoordinator');
        await coordinator.configureRules();
      } catch (error) {
        console.error('Failed to configure rules:', error);
        vscode.window.showErrorMessage(
          'Failed to configure rules. See console for details.',
        );
      }
    },
  );

  // Create Source/Header Pair Commands
  const newSourcePairCommand = vscode.commands.registerCommand(
    COMMANDS.NEW_SOURCE_PAIR,
    async () => {
      try {
        const coordinator = serviceContainer.get('pairCoordinator');
        await coordinator.create();
      } catch (error) {
        console.error('Failed to create new source pair:', error);
        vscode.window.showErrorMessage(
          'Failed to create new source pair. See console for details.',
        );
      }
    },
  );

  // Switch Header/Source Commands
  const switchHeaderSourceCommand = vscode.commands.registerCommand(
    COMMANDS.SWITCH_HEADER_SOURCE,
    async () => {
      try {
        const coordinator = serviceContainer.get('switchCoordinator');
        await coordinator.switchHeaderSource();
      } catch (error) {
        console.error('Failed to switch header/source:', error);
        vscode.window.showErrorMessage(
          'Failed to switch header/source. See console for details.',
        );
      }
    },
  );

  // Clangd Monitor Commands
  const showClangdDetailsCommand = vscode.commands.registerCommand(
    COMMANDS.SHOW_CLANGD_DETAILS,
    async () => {
      try {
        const coordinator = serviceContainer.get('monitorCoordinator');
        await coordinator.showClangdDetails();
      } catch (error) {
        console.error('Failed to show clangd details:', error);
        vscode.window.showErrorMessage(
          'Failed to show clangd details. See console for details.',
        );
      }
    },
  );

  const restartClangdCommand = vscode.commands.registerCommand(
    'clotho.restartClangd',
    async () => {
      try {
        const coordinator = serviceContainer.get('monitorCoordinator');
        await coordinator.restartClangd();
      } catch (error) {
        console.error('Failed to restart clangd:', error);
        vscode.window.showErrorMessage(
          'Failed to restart clangd. See console for details.',
        );
      }
    },
  );

  // Visual Editor Commands
  const openClangFormatEditorCommand = vscode.commands.registerCommand(
    COMMANDS.OPEN_CLANG_FORMAT_EDITOR,
    async () => {
      try {
        const coordinator = serviceContainer.get('clangFormatEditorCoordinator');
        await coordinator.showEditor();
      } catch (error) {
        console.error('Failed to open Clang-Format editor:', error);
        vscode.window.showErrorMessage(
          'Failed to open Clang-Format editor. See console for details.',
        );
      }
    },
  );

  // Debug Commands for Visual Editor
  const diagnoseVisualEditorCommand = vscode.commands.registerCommand(
    'clotho.diagnoseVisualEditor',
    async () => {
      try {
        await VisualEditorDebugHelper.diagnosePreviewState();
      } catch (error) {
        console.error('Failed to diagnose visual editor:', error);
        vscode.window.showErrorMessage(
          'Failed to diagnose visual editor. See console for details.',
        );
      }
    },
  );

  const restartVisualEditorCommand = vscode.commands.registerCommand(
    'clotho.restartVisualEditor',
    async () => {
      try {
        await VisualEditorDebugHelper.forceRestartPreview();
      } catch (error) {
        console.error('Failed to restart visual editor:', error);
        vscode.window.showErrorMessage(
          'Failed to restart visual editor. See console for details.',
        );
      }
    },
  );

  // Register all commands with the extension context for proper cleanup
  context.subscriptions.push(
    configureRulesCommand,
    newSourcePairCommand,
    switchHeaderSourceCommand,
    showClangdDetailsCommand,
    restartClangdCommand,
    openClangFormatEditorCommand,
    diagnoseVisualEditorCommand,
    restartVisualEditorCommand,
  );
}
