/**
 * Platform and Environment Utilities
 * Platform and environment related utility functions
 */

import * as vscode from 'vscode';

/**
 * Get appropriate line ending sequence
 * Based on VS Code settings and platform detection
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
 * Check if current platform is Windows
 */
export function isWindows(): boolean {
  return process.platform === 'win32';
}

/**
 * Check if current platform is macOS
 */
export function isMacOS(): boolean {
  return process.platform === 'darwin';
}

/**
 * Check if current platform is Linux
 */
export function isLinux(): boolean {
  return process.platform === 'linux';
}

/**
 * Get platform-specific path separator
 */
export function getPathSeparator(): string {
  return process.platform === 'win32' ? '\\' : '/';
}

/**
 * Get platform name (for display)
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
