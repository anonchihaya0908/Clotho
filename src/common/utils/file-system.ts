/**
 * File System Utilities
 * Functions for file system operations
 */

import * as vscode from 'vscode';
import { Uri } from '../types';

/**
 * Checks if a file exists
 */
export async function fileExists(uri: Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates directories recursively if they don't exist
 */
export async function ensureDirectoryExists(uri: Uri): Promise<void> {
  try {
    await vscode.workspace.fs.createDirectory(uri);
  } catch {
    // Directory might already exist, which is fine
  }
}
