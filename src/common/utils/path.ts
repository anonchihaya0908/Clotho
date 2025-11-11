/**
 * Path Utilities
 * ===============
 *
 * 统一的路径处理工具集
 * 提供跨平台一致的路径操作
 *
 * 重构记录：
 * - Phase 5: 统一了 FileSystemService 和 SwitchService 的路径规范化逻辑
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { Uri } from '../types';

/**
 * 标准化路径（跨平台）
 * 将所有反斜杠转换为正斜杠
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, '/');
}

/**
 * 标准化路径用于缓存键
 * Windows 下转小写以支持不区分大小写的文件系统
 *
 * @param filePath 文件路径
 * @param caseInsensitive 是否不区分大小写（默认 Windows 上为 true）
 */
export function normalizePathForCache(filePath: string, caseInsensitive: boolean = process.platform === 'win32'): string {
  const normalized = normalizePath(filePath);
  return caseInsensitive ? normalized.toLowerCase() : normalized;
}

/**
 * 从路径中提取文件名（不含扩展名）
 */
export function getFileBaseName(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * 从路径中提取扩展名（含点号）
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath);
}

/**
 * 从路径中提取目录路径
 */
export function getDirectoryPath(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * 检查是否为头文件扩展名
 */
export function isHeaderExtension(ext: string): boolean {
  const headerExts = ['.h', '.hpp', '.hxx', '.hh', '.H'];
  return headerExts.includes(ext.toLowerCase());
}

/**
 * 检查是否为源文件扩展名
 */
export function isSourceExtension(ext: string): boolean {
  const sourceExts = ['.c', '.cpp', '.cc', '.cxx', '.C', '.CPP'];
  return sourceExts.includes(ext);
}

/**
 * 获取工作区相对路径
 */
export function getRelativePath(uri: Uri): string {
  return vscode.workspace.asRelativePath(uri);
}

/**
 * 获取 URI 的工作区文件夹
 */
export function getWorkspaceFolder(
  uri: Uri,
): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.getWorkspaceFolder(uri);
}

/**
 * 从路径字符串创建文件 URI
 */
export function createFileUri(filePath: string): Uri {
  return vscode.Uri.file(filePath);
}

/**
 * 连接路径片段
 */
export function joinPaths(...paths: string[]): string {
  return path.join(...paths);
}

/**
 * 检查路径是否为绝对路径
 */
export function isAbsolutePath(filePath: string): boolean {
  return path.isAbsolute(filePath);
}
