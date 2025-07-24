/**
 * Platform and Environment Utilities
 * 平台和环境相关的工具函数
 */

import * as vscode from 'vscode';

/**
 * 获取适当的行尾序列
 * 基于 VS Code 设置和平台检测
 */
export function getLineEnding(): string {
  const eolSetting = vscode.workspace
    .getConfiguration('files')
    .get<string>('eol');

  return eolSetting === '\n' || eolSetting === '\r\n'
    ? eolSetting
    : process.platform === 'win32'
      ? '\r\n'
      : '\n';
}

/**
 * 检查当前是否为 Windows 平台
 */
export function isWindows(): boolean {
  return process.platform === 'win32';
}

/**
 * 检查当前是否为 macOS 平台
 */
export function isMacOS(): boolean {
  return process.platform === 'darwin';
}

/**
 * 检查当前是否为 Linux 平台
 */
export function isLinux(): boolean {
  return process.platform === 'linux';
}

/**
 * 获取平台特定的路径分隔符
 */
export function getPathSeparator(): string {
  return process.platform === 'win32' ? '\\' : '/';
}

/**
 * 获取平台名称（用于显示）
 */
export function getPlatformName(): string {
  switch (process.platform) {
    case 'win32':
      return 'Windows';
    case 'darwin':
      return 'macOS';
    case 'linux':
      return 'Linux';
    default:
      return 'Unknown';
  }
}

/**
 * Checks if the current VS Code theme is a dark theme.
 * High-contrast themes are also considered dark.
 * @param theme - Optional theme object to check. If not provided, the active theme is used.
 * @returns True if the theme is dark, false otherwise.
 */
export function isDarkTheme(theme?: vscode.ColorTheme): boolean {
  const currentTheme = theme || vscode.window.activeColorTheme;
  return (
    currentTheme.kind === vscode.ColorThemeKind.Dark ||
    currentTheme.kind === vscode.ColorThemeKind.HighContrast
  );
}
