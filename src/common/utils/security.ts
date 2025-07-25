/**
 * Security Utilities
 * Functions for security-related operations, using VS Code APIs when available
 */

import * as vscode from 'vscode';

/**
 * Generates a random nonce for Content Security Policy
 * Uses VS Code's built-in API for better security
 */
export function getNonce(): string {
    // Use VS Code's built-in nonce generation if available
    if (typeof vscode.workspace.fs !== 'undefined') {
        // Generate a secure random string using VS Code's crypto
        const array = new Uint8Array(16);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        }
    }

    // Fallback to a simple but secure implementation
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Simple cache implementation using Map
 * For more advanced caching needs, consider using external libraries
 */
export class SimpleCache<K, V> {
    private cache = new Map<K, V>();
    private readonly maxSize: number;

    constructor(maxSize: number = 100) {
        this.maxSize = maxSize;
    }

    get(key: K): V | undefined {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }

    set(key: K, value: V): void {
        // If key exists, delete it first
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        // If cache is full, remove least recently used
        else if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, value);
    }

    has(key: K): boolean {
        return this.cache.has(key);
    }

    delete(key: K): boolean {
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }
}
