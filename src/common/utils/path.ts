/**
 * Path Utilities
 * Functions for path manipulation and workspace handling
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { Uri } from '../types';

/**
 * Normalizes a path for consistent cross-platform handling
 */
export function normalizePath(filePath: string): string {
    return path.normalize(filePath).replace(/\\/g, '/');
}

/**
 * Gets the relative path from workspace root
 */
export function getRelativePath(uri: Uri): string {
    return vscode.workspace.asRelativePath(uri);
}

/**
 * Gets the workspace folder for a given URI
 */
export function getWorkspaceFolder(
    uri: Uri,
): vscode.WorkspaceFolder | undefined {
    return vscode.workspace.getWorkspaceFolder(uri);
}

/**
 * Creates a file URI from a path string
 */
export function createFileUri(filePath: string): Uri {
    return vscode.Uri.file(filePath);
}
