/**
 * Clang-Format Service
 * 负责调用 clang-format 生成代码预览和配置文件
 * 使用 stdin/stdout 流方案，完全避免临时文件和权限问题
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { errorHandler } from '../../common/error-handler';
import { logger } from '../../common/logger';
import { getLineEnding } from '../../common/platform-utils';
import { ProcessRunner } from '../../common/process-runner';
import { ConfigValidationResult, FormatResult } from '../../common/types/core';
import {
  MACRO_PREVIEW_CODE,
} from './data/clang-format-options-database';

export class ClangFormatService {
  private static instance: ClangFormatService | undefined;

  private constructor() { }

  /**
   * 获取单例实例
   */
  public static getInstance(): ClangFormatService {
    if (!ClangFormatService.instance) {
      ClangFormatService.instance = new ClangFormatService();
    }
    return ClangFormatService.instance;
  }

  /**
   * 重置单例实例（用于测试）
   */
  public static resetInstance(): void {
    ClangFormatService.instance = undefined;
  }

  /**
   * Serializes a configuration object into a YAML-like string for the -style flag.
   * This is our "native language translator" for clang-format.
   * @param config The configuration object.
   * @returns A string like "{BasedOnStyle: Google, IndentWidth: 4}"
   */
  private static _serializeConfigToYaml(config: Record<string, any>): string {
    const parts = Object.entries(config)
      // 过滤掉那些应该被继承的、未定义的值
      .filter(
        ([, value]) =>
          value !== undefined && value !== null && value !== 'inherit',
      )
      .map(([key, value]) => {
        // 对于字符串值，我们不需要加引号，除非它们是特殊值
        // 对于布尔值和数字，直接使用它们的值
        return `${key}: ${value}`;
      });
    return `{${parts.join(', ')}}`;
  }

  /**
   * Parses a YAML-like string from a .clang-format file.
   * @param content The string content of the file.
   * @returns A configuration object.
   */
  public parse(content: string): Record<string, any> {
    return this.parseConfigContent(content);
  }

  /**
   * Stringifies a configuration object into a .clang-format file content.
   * @param config The configuration object.
   * @returns A string suitable for a .clang-format file.
   */
  public stringify(config: Record<string, any>): string {
    return this.generateConfigFile(config);
  }

  /**
   * Formats a given code snippet using a configuration object.
   * This is the single, definitive, and most robust implementation.
   * It uses stdin/stdout streams and communicates with clang-format in its native YAML dialect.
   * @param code The code to format.
   * @param config The configuration object.
   * @returns A promise resolving to a FormatResult.
   */
  public async format(
    code: string,
    config: Record<string, any>,
  ): Promise<FormatResult> {
    return new Promise(async (resolve) => {
      try {
        if (!(await ProcessRunner.commandExists('clang-format'))) {
          return resolve({
            success: false,
            formattedCode: code,
            error: 'clang-format executable not found in PATH.',
          });
        }

        // 1. 使用我们的"母语翻译官"
        const styleString = ClangFormatService._serializeConfigToYaml(config);
        const args = [`-style=${styleString}`];

        // 2. 使用无shell的spawn，直接与clang-format.exe对话
        const clangFormatProcess = spawn('clang-format', args, {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let formattedCode = '';
        let errorOutput = '';

        clangFormatProcess.stdout.on('data', (data) => (formattedCode += data));
        clangFormatProcess.stderr.on('data', (data) => (errorOutput += data));

        clangFormatProcess.on('close', (exitCode) => {
          if (exitCode === 0 && !errorOutput) {
            resolve({ success: true, formattedCode });
          } else {
            const fullError = `clang-format exited with code ${exitCode}.\n--- Config Sent ---\n${styleString}\n--- Error Details ---\n${errorOutput}`;
            resolve({ success: false, formattedCode: code, error: fullError });
          }
        });

        clangFormatProcess.on('error', (err) =>
          resolve({
            success: false,
            formattedCode: code,
            error: `Failed to start clang-format: ${err.message}`,
          }),
        );

        clangFormatProcess.stdin.on('error', (err) =>
          resolve({
            success: false,
            formattedCode: code,
            error: `Failed to write to clang-format stdin: ${err.message}`,
          }),
        );

        // 3. 将代码流入stdin
        clangFormatProcess.stdin.write(code, 'utf8');
        clangFormatProcess.stdin.end();
      } catch (error) {
        resolve({
          success: false,
          formattedCode: code,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error during format execution',
        });
      }
    });
  }

  /**
   * 格式化代码（用于微观预览）- 兼容旧接口
   */
  async formatMicroPreview(
    code: string,
    config: Record<string, any>,
  ): Promise<FormatResult> {
    return this.format(code, config);
  }

  /**
   * 格式化完整代码（用于宏观预览）- 兼容旧接口
   */
  async formatMacroPreview(config: Record<string, any>): Promise<FormatResult> {
    return this.format(MACRO_PREVIEW_CODE, config);
  }

  /**
   * 验证配置的有效性
   */
  async validateConfig(
    config: Record<string, any>,
  ): Promise<ConfigValidationResult> {
    try {
      // 使用简单代码测试配置是否有效
      const testCode = 'int main() { return 0; }';
      const result = await this.format(testCode, config);

      if (result.success) {
        return { isValid: true };
      } else {
        return {
          isValid: false,
          error: result.error || 'Unknown configuration error',
        };
      }
    } catch (error) {
      errorHandler.handle(error, {
        operation: 'validateConfig',
        module: 'ClangFormatService',
        showToUser: false,
        logLevel: 'error',
      });

      return {
        isValid: false,
        error:
          error instanceof Error
            ? error.message
            : 'Configuration validation failed',
      };
    }
  }

  /**
   * Generates the content for a .clang-format configuration file.
   * (Internal helper for stringify)
   */
  private generateConfigFile(config: Record<string, any>): string {
    const lines: string[] = [];

    // 添加注释头
    lines.push('# Generated by Clotho VS Code Extension');
    lines.push('# clang-format configuration file');
    lines.push('---');

    // 排序配置项以获得一致的输出
    const sortedKeys = Object.keys(config).sort();

    for (const key of sortedKeys) {
      const value = config[key];

      // 跳过 undefined、null 或特殊的 "inherit" 标记
      if (value !== undefined && value !== null && value !== 'inherit') {
        lines.push(`${key}: ${this.formatConfigValue(value)}`);
      }
    }

    // 使用平台感知的行尾序列
    const eol = getLineEnding();
    return lines.join(eol);
  }

  /**
   * 保存配置到文件
   */
  async saveConfigToFile(
    config: Record<string, any>,
    filePath: string,
  ): Promise<void> {
    try {
      const configContent = this.generateConfigFile(config);
      await fs.promises.writeFile(filePath, configContent, 'utf8');
    } catch (error) {
      throw new Error(
        `Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 从文件加载配置
   */
  async loadConfigFromFile(filePath: string): Promise<Record<string, any>> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      return this.parseConfigContent(content);
    } catch (error) {
      throw new Error(
        `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 获取工作区中的 .clang-format 文件路径
   */
  getWorkspaceConfigPath(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return undefined;
    }

    // 查找第一个工作区文件夹中的 .clang-format 文件
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const configPath = path.join(workspaceRoot, '.clang-format');

    return fs.existsSync(configPath) ? configPath : undefined;
  }

  /**
   * 应用配置到工作区
   */
  async applyConfigToWorkspace(config: Record<string, any>): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error('No workspace folder is open');
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const configPath = path.join(workspaceRoot, '.clang-format');

      await this.saveConfigToFile(config, configPath);

      // 显示成功消息
      vscode.window.showInformationMessage(
        `Clang-format configuration saved to ${configPath}`,
      );
    } catch (error) {
      errorHandler.handle(error, {
        operation: 'applyConfigToWorkspace',
        module: 'ClangFormatService',
        showToUser: true,
        logLevel: 'error',
      });

      throw error; // Re-throw for caller to handle
    }
  }

  private formatConfigValue(value: any): string {
    if (typeof value === 'string') {
      return value;
    } else if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    } else if (typeof value === 'number') {
      return value.toString();
    } else if (Array.isArray(value)) {
      return `[${value.map((v) => this.formatConfigValue(v)).join(', ')}]`;
    } else if (typeof value === 'object') {
      const entries = Object.entries(value).map(
        ([k, v]) => `${k}: ${this.formatConfigValue(v)}`,
      );
      return `{ ${entries.join(', ')} }`;
    } else {
      return String(value);
    }
  }

  private parseConfigContent(content: string): Record<string, any> {
    const config: Record<string, any> = {};
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmedLine = line.trim();

      // 跳过注释、空行和 YAML 分隔符
      if (
        !trimmedLine ||
        trimmedLine.startsWith('#') ||
        trimmedLine === '---'
      ) {
        continue;
      }

      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex === -1) {
        continue;
      }

      const key = trimmedLine.substring(0, colonIndex).trim();
      let valueStr = trimmedLine.substring(colonIndex + 1).trim();

      // 解析值
      let value: any = valueStr;

      // Remove possible quotes
      if (
        (valueStr.startsWith('"') && valueStr.endsWith('"')) ||
        (valueStr.startsWith('\'') && valueStr.endsWith('\''))
      ) {
        valueStr = valueStr.slice(1, -1);
        value = valueStr;
      }
      // 布尔值
      else if (valueStr.toLowerCase() === 'true') {
        value = true;
      } else if (valueStr.toLowerCase() === 'false') {
        value = false;
      }
      // 数字（整数和浮点数）
      else if (/^-?\d+(\.\d+)?$/.test(valueStr)) {
        value = valueStr.includes('.')
          ? parseFloat(valueStr)
          : parseInt(valueStr);
      }
      // 数组值（例如：[value1, value2]）
      else if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
        try {
          const arrayContent = valueStr.slice(1, -1).trim();
          if (arrayContent) {
            value = arrayContent.split(',').map((item) => {
              const trimmed = item.trim();
              // Remove quotes
              if (
                (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
                (trimmed.startsWith('\'') && trimmed.endsWith('\''))
              ) {
                return trimmed.slice(1, -1);
              }
              return trimmed;
            });
          } else {
            value = [];
          }
        } catch (error) {
          logger.warn(`Failed to parse array value for ${key}: ${valueStr}`, {
            module: 'ClangFormatService',
            operation: 'parseConfigurationLine',
          });
          value = valueStr; // 保持原始字符串
        }
      }
      // 其他保持为字符串

      config[key] = value;
    }

    // 调试输出，帮助排查数据不准确的问题
    logger.debug('Parsed configuration', {
      config,
      module: 'ClangFormatService',
      operation: 'parseConfigurationLine',
    });

    return config;
  }
}
