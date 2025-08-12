/**
 * Bootstrap Module
 * ================
 *
 * This module is responsible for setting up and initializing all services
 * and their dependencies in the correct order. It acts as the central place
 * where the Dependency Injection (DI) container is configured.
 */

import * as vscode from 'vscode';
import { SimpleClangdMonitor } from './clangd-monitor/simple-monitor';
import { COMMANDS } from './common/constants';
import { errorHandler } from './common/error-handler';
import { logger } from './common/logger';
import { ServiceContainer } from './common/service-container';
import {
  PairCoordinator,
  PairCreatorService,
  PairCreatorUI,
} from './create-source-header-pair';
import { HeaderGuardCoordinator } from './create-source-header-pair/header-guard-coordinator';
import {
  PairingRuleCoordinator,
  PairingRuleService,
  PairingRuleUI,
} from './pairing-rule-manager';
import {
  SwitchCoordinator,
  SwitchService,
  SwitchUI,
} from './switch-header-source';
import { SwitchConfigService } from './switch-header-source/config-manager';
import { ClangFormatEditorCoordinator } from './visual-editor/clang-format/coordinator';

import { ClangFormatGuideService } from './visual-editor/clang-format/guide-service';
import { ClangFormatPreviewProvider } from './visual-editor/clang-format/preview-provider';

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
  //  Initialize Logger system (highest priority)
  logger.initializeOutputChannel();
  logger.info('Clotho extension starting up...', {
    module: 'Bootstrap',
    operation: 'startup'
  });

  // Initialize the service container
  serviceContainer = new ServiceContainer();

  // Register all services in the container
  registerServices(context);

  // Activate Clang-Format visual editor module (register virtual document provider)
  try {
    ClangFormatPreviewProvider.register(context);
    logger.info('ClangFormatPreviewProvider registered successfully', {
      module: 'Bootstrap',
      operation: 'registerPreviewProvider'
    });
  } catch (error) {
    logger.error(
      'Failed to register ClangFormatPreviewProvider',
      error as Error,
      {
        module: 'Bootstrap',
        operation: 'registerPreviewProvider'
      }
    );
    // Don't throw error, allow extension to continue running
  }

  // Initialize main coordinators
  await initializeCoordinators();

  // Register all commands in one place
  registerCommands(context);

  // Register the service container for cleanup
  context.subscriptions.push({
    dispose: () => cleanup(),
  });

  //  Startup completed
  logger.info('Clotho extension startup completed', {
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
        container.get('pairingRuleService'),
      ),
  );
  serviceContainer.register(
    'headerGuardCoordinator',
    (container) =>
      new HeaderGuardCoordinator(
        container.get('pairCreatorUI'),
        container.get('pairCreatorService'),
        container.get('pairingRuleService'),
      ),
  );

  // Switch Header/Source - Complete dependency injection
  serviceContainer.register('switchConfigService',
    () => new SwitchConfigService());

  serviceContainer.register('switchService',
    (container) => new SwitchService(container.get('switchConfigService')));

  serviceContainer.register('switchUI',
    () => new SwitchUI());

  serviceContainer.register('switchCoordinator',
    (container) => new SwitchCoordinator(
      container.get('switchService'),
      container.get('switchUI'),
      container.get('switchConfigService')
    ));

  // Clangd Monitor - 简化版本
  serviceContainer.register('clangdMonitor', () => new SimpleClangdMonitor());

  // Clang-Format Visual Editor
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

  // Initialize and start the simple monitor
  const clangdMonitor = serviceContainer.get('clangdMonitor') as SimpleClangdMonitor;

  // Check if clangd monitoring is enabled in configuration
  const config = vscode.workspace.getConfiguration('clotho.clangdMonitor');
  const isMonitoringEnabled = config.get<boolean>('enabled', true);

  if (isMonitoringEnabled) {
    try {
      logger.info('Starting clangd monitoring...', {
        module: 'Bootstrap',
        operation: 'startMonitoring'
      });
      clangdMonitor.start();
      logger.info('Clangd monitoring started successfully', {
        module: 'Bootstrap',
        operation: 'startMonitoring'
      });
    } catch (error) {
      logger.error(
        'Failed to start clangd monitoring',
        error as Error,
        {
          module: 'Bootstrap',
          operation: 'startMonitoring'
        }
      );
    }
  } else {
    logger.info('Clangd monitoring disabled by configuration', {
      module: 'Bootstrap',
      operation: 'startMonitoring'
    });
  }
}

/**
 * Clean up all services when the extension is deactivated.
 */
export function cleanup(): void {
  logger.info('Clotho extension cleaning up resources...', {
    module: 'Bootstrap',
    operation: 'cleanup'
  });

  if (serviceContainer) {
    serviceContainer.dispose();
  }

  // Clean up Logger resources
  logger.dispose();

  logger.info('Clotho extension cleanup completed', {
    module: 'Bootstrap',
    operation: 'cleanup_complete'
  });
}

/**
 * Register all VS Code commands in one centralized place.
 * This makes it easier to manage and maintain all command registrations.
 */
function registerCommands(context: vscode.ExtensionContext): void {
  const register = (command: string, handler: (...args: unknown[]) => unknown) => {
    return vscode.commands.registerCommand(command, async (...args: unknown[]) => {
      try {
        await handler(...args);
      } catch (error) {
        errorHandler.handle(error, {
          module: 'CommandExecution',
          operation: command,
          showToUser: true,
        });
      }
    });
  };

  // Pairing Rule Manager Commands
  const configureRulesCommand = register(COMMANDS.CONFIGURE_RULES, () => {
    const coordinator = serviceContainer.get('pairingRuleCoordinator');
    return coordinator.configureRules();
  });

  // Create Source/Header Pair Commands
  const newSourcePairCommand = register(COMMANDS.NEW_SOURCE_PAIR, () => {
    const coordinator = serviceContainer.get('pairCoordinator');
    return coordinator.create();
  });

  // Header Guard Configuration Commands
  const configureHeaderGuardCommand = register(COMMANDS.CONFIGURE_HEADER_GUARD, () => {
    const coordinator = serviceContainer.get('headerGuardCoordinator');
    return coordinator.configureHeaderGuard();
  });

  // Switch Header/Source Commands
  const switchHeaderSourceCommand = register(
    COMMANDS.SWITCH_HEADER_SOURCE,
    () => {
      const coordinator = serviceContainer.get('switchCoordinator');
      return coordinator.switchHeaderSource();
    },
  );

  // Clangd Monitor Commands - 简化版本
  const restartClangdCommand = register('clotho.restartClangd', () => {
    const monitor = serviceContainer.get('clangdMonitor') as SimpleClangdMonitor;
    return monitor.restartClangd();
  });

  const debugClangdCommand = register('clotho.debugClangd', () => {
    const monitor = serviceContainer.get('clangdMonitor') as SimpleClangdMonitor;
    return monitor.debugClangdStatus();
  });

  // Visual Editor Commands
  const openClangFormatEditorCommand = register(
    COMMANDS.OPEN_CLANG_FORMAT_EDITOR,
    () => {
      const coordinator = serviceContainer.get('clangFormatEditorCoordinator');
      return coordinator.showEditor();
    },
  );

  // Register all commands with the extension context for proper cleanup
  context.subscriptions.push(
    configureRulesCommand,
    newSourcePairCommand,
    configureHeaderGuardCommand,
    switchHeaderSourceCommand,
    restartClangdCommand,
    debugClangdCommand,
    openClangFormatEditorCommand,
  );
}
