/**
 * Clangd Client Helper
 * Centralizes detection and LSP request helpers for clangd.
 */

import * as vscode from 'vscode';
import { LSP_CLIENT_STATE, LSP_REQUESTS, PERFORMANCE, EXTERNAL_EXTENSIONS } from '../constants';
import { createModuleLogger } from '../logger/unified-logger';

const logger = createModuleLogger('ClangdClientHelper');

/**
 * Checks whether clangd extension is installed and client is running.
 */
export function isClangdAvailable(): boolean {
  try {
    const clangdExtension = vscode.extensions.getExtension(EXTERNAL_EXTENSIONS.CLANGD);
    if (!clangdExtension?.isActive) {
      return false;
    }
    interface ClangdClient { state: number; sendRequest: (method: string, params: unknown) => Promise<unknown>; }
    interface ClangdApi { getClient?: () => ClangdClient | undefined; }
    const api = clangdExtension.exports as Partial<ClangdApi>;
    const client = api?.getClient ? api.getClient() : undefined;
    return Boolean(client && client.state === LSP_CLIENT_STATE.RUNNING);
  } catch {
    return false;
  }
}

/**
 * Attempt to switch source/header via clangd.
 * Returns the target URI if found and exists, otherwise null.
 */
export async function trySwitchSourceHeader(currentFile: vscode.Uri): Promise<vscode.Uri | null> {
  const start = Date.now();
  try {
    const clangdExtension = vscode.extensions.getExtension(EXTERNAL_EXTENSIONS.CLANGD);
    if (!clangdExtension) {
      logger.debug('clangd extension not found', { operation: 'trySwitchSourceHeader' });
      return null;
    }

    if (!clangdExtension.isActive) {
      try {
        await clangdExtension.activate();
        logger.debug('clangd extension activated', { operation: 'trySwitchSourceHeader' });
      } catch {
        logger.debug('Failed to activate clangd extension', { operation: 'trySwitchSourceHeader' });
        return null;
      }
    }

    interface ClangdClient { state: number; sendRequest: (method: string, params: unknown) => Promise<unknown>; }
    interface ClangdApi { getClient?: () => ClangdClient | undefined; }
    const api = clangdExtension.exports as Partial<ClangdApi>;
    if (!api?.getClient) {
      logger.debug('clangd API not available', { operation: 'trySwitchSourceHeader' });
      return null;
    }

    const client = api.getClient();
    if (!client || client.state !== LSP_CLIENT_STATE.RUNNING) {
      logger.debug('clangd client not running', { operation: 'trySwitchSourceHeader' });
      return null;
    }

    const textDocument = { uri: currentFile.toString() };
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('clangd request timeout')), PERFORMANCE.CLANGD_REQUEST_TIMEOUT)
    );

    const result: unknown = await Promise.race([
      client.sendRequest(LSP_REQUESTS.SWITCH_SOURCE_HEADER, textDocument),
      timeoutPromise,
    ]);

    if (result && typeof result === 'string') {
      const targetUri = vscode.Uri.parse(result);
      try {
        await vscode.workspace.fs.stat(targetUri);
        const duration = Date.now() - start;
        logger.debug('clangd switch succeeded', { operation: 'trySwitchSourceHeader', duration });
        return targetUri;
      } catch {
        logger.debug('clangd result file does not exist', { operation: 'trySwitchSourceHeader' });
        return null;
      }
    }

    const duration = Date.now() - start;
    logger.debug('clangd returned no result', { operation: 'trySwitchSourceHeader', duration });
    return null;
  } catch (error) {
    const duration = Date.now() - start;
    logger.debug('clangd integration failed', {
      operation: 'trySwitchSourceHeader',
      duration,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
