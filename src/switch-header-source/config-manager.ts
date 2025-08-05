import * as vscode from 'vscode';
import { SwitchConfig, DEFAULT_SWITCH_CONFIG } from '../common/constants';

/**
 * 配置模板集合 - 为不同项目类型提供预设配置
 */
export const CONFIG_TEMPLATES = {
  standard: {
    name: 'Standard C/C++',
    description: 'Standard C/C++ project structure',
    config: DEFAULT_SWITCH_CONFIG,
  },

  modern_cpp: {
    name: 'Modern C++',
    description: 'Modern C++ project with API/implementation separation',
    config: {
      sourceDirs: ['src', 'lib', 'implementation'],
      headerDirs: ['include', 'api', 'public'],
      testDirs: ['tests', 'unittest', 'gtests'],
      searchPaths: [
        '.',
        '../include',
        '../src',
        './include',
        './src',
        '../api',
      ],
      excludePaths: DEFAULT_SWITCH_CONFIG.excludePaths,
    } as SwitchConfig,
  },

  cmake_project: {
    name: 'CMake Project',
    description: 'CMake-based project structure',
    config: {
      sourceDirs: ['src', 'lib'],
      headerDirs: ['include', 'headers'],
      testDirs: ['tests', 'test'],
      searchPaths: ['.', '../include', '../src', './include', './src'],
      excludePaths: [
        ...(DEFAULT_SWITCH_CONFIG.excludePaths || []), // 🔄 防止undefined
        '**/CMakeFiles/**',
      ],
    } as SwitchConfig,
  },

  google_style: {
    name: 'Google Style',
    description: 'Google C++ style guide structure',
    config: {
      sourceDirs: ['src', 'lib'],
      headerDirs: ['include', 'public'],
      testDirs: ['test', 'tests'],
      searchPaths: ['.', '../include', '../src', './include', './src'],
      excludePaths: DEFAULT_SWITCH_CONFIG.excludePaths,
    } as SwitchConfig,
  },

  enterprise: {
    name: 'Enterprise',
    description: 'Large enterprise project structure',
    config: {
      sourceDirs: ['source', 'src', 'lib', 'core', 'implementation'],
      headerDirs: ['include', 'headers', 'api', 'interface', 'public'],
      testDirs: ['test', 'tests', 'spec', 'verification', 'unittest'],
      searchPaths: [
        '.',
        '../include',
        '../src',
        './include',
        './src',
        '../../common/include',
      ],
      excludePaths: DEFAULT_SWITCH_CONFIG.excludePaths,
    } as SwitchConfig,
  },
};

/**
 * 配置服务类 - 负责读取和管理切换配置
 * 重构为实例类以支持依赖注入和更好的测试性
 */
export class SwitchConfigService {
  /**
   * 获取当前有效的配置
   */
  public getConfig(): SwitchConfig {
    const config = vscode.workspace.getConfiguration('clotho');

    return {
      sourceDirs: config.get<string[]>(
        'switch.sourceDirs',
        DEFAULT_SWITCH_CONFIG.sourceDirs,
      ),
      headerDirs: config.get<string[]>(
        'switch.headerDirs',
        DEFAULT_SWITCH_CONFIG.headerDirs,
      ),
      testDirs: config.get<string[]>(
        'switch.testDirs',
        DEFAULT_SWITCH_CONFIG.testDirs,
      ),
      searchPaths: config.get<string[]>(
        'switch.searchPaths',
        DEFAULT_SWITCH_CONFIG.searchPaths,
      ),
      excludePaths: DEFAULT_SWITCH_CONFIG.excludePaths,
    };
  }

  /**
   * 应用配置模板
   */
  public async applyTemplate(
    templateKey: keyof typeof CONFIG_TEMPLATES,
  ): Promise<void> {
    const template = CONFIG_TEMPLATES[templateKey];
    if (!template) {
      throw new Error(`Unknown template: ${templateKey}`);
    }

    const config = vscode.workspace.getConfiguration('clotho');

    await Promise.all([
      config.update(
        'switch.sourceDirs',
        template.config.sourceDirs,
        vscode.ConfigurationTarget.Workspace,
      ),
      config.update(
        'switch.headerDirs',
        template.config.headerDirs,
        vscode.ConfigurationTarget.Workspace,
      ),
      config.update(
        'switch.testDirs',
        template.config.testDirs,
        vscode.ConfigurationTarget.Workspace,
      ),
      config.update(
        'switch.searchPaths',
        template.config.searchPaths,
        vscode.ConfigurationTarget.Workspace,
      ),
    ]);

    vscode.window.showInformationMessage(
      `Applied ${template.name} configuration template.`,
    );
  }

  /**
   * 显示配置模板选择对话框
   */
  public async showTemplateSelector(): Promise<void> {
    interface TemplateQuickPickItem extends vscode.QuickPickItem {
      templateKey: keyof typeof CONFIG_TEMPLATES;
    }

    const items: TemplateQuickPickItem[] = Object.entries(CONFIG_TEMPLATES).map(
      ([key, template]) => ({
        label: `$(settings-gear) ${template.name}`,
        description: template.description,
        detail: `Source: [${template.config.sourceDirs.join(', ')}] | Headers: [${template.config.headerDirs.join(', ')}]`,
        templateKey: key as keyof typeof CONFIG_TEMPLATES,
      }),
    );

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder:
        'Select a configuration template for header/source switching',
      title: 'Switch Configuration Templates',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (selected) {
      await this.applyTemplate(selected.templateKey);
    }
  }

  /**
   * 显示当前配置信息
   */
  public showCurrentConfig(): void {
    const config = this.getConfig();

    const message = [
      'Current Switch Configuration:',
      `Source Directories: ${config.sourceDirs.join(', ')}`,
      `Header Directories: ${config.headerDirs.join(', ')}`,
      `Test Directories: ${config.testDirs.join(', ')}`,
      `Search Paths: ${config.searchPaths.join(', ')}`,
    ].join('\n');

    vscode.window.showInformationMessage(message, { modal: true });
  }
}
