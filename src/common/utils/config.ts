/**
 * Configuration Utilities
 * Functions for VS Code configuration management
 */

import * as vscode from 'vscode';
import { ConfigScope } from '../types';

/**
 * Gets a configuration value with type safety
 */
export function getConfigValue<T>(
  section: string,
  key: string,
  defaultValue: T,
): T {
  return vscode.workspace.getConfiguration(section).get<T>(key, defaultValue);
}

/**
 * Sets a configuration value with proper scope handling
 */
export async function setConfigValue<T>(
  section: string,
  key: string,
  value: T,
  scope: ConfigScope,
): Promise<void> {
  const target =
        scope === 'workspace'
          ? vscode.ConfigurationTarget.Workspace
          : vscode.ConfigurationTarget.Global;

  await vscode.workspace.getConfiguration(section).update(key, value, target);
}
