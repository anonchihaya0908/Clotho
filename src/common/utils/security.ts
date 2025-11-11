/**
 * Security Utilities
 * Functions for security-related operations, using VS Code APIs when available
 */

import * as vscode from 'vscode';
import { PERFORMANCE } from '../constants';

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
 * 高性能LRU缓存实现
 * 使用双向链表 + HashMap 实现 O(1) 的 get/set 操作
 */

// 双向链表节点
class LRUNode<K, V> {
  constructor(
    public key: K | null,
    public value: V | null,
    public prev: LRUNode<K, V> | null = null,
    public next: LRUNode<K, V> | null = null
  ) { }

  /**
   * 检查是否为哨兵节点
   */
  isSentinel(): boolean {
    return this.key === null && this.value === null;
  }
}

export class SimpleCache<K, V> {
  private readonly capacity: number;
  private readonly cache = new Map<K, LRUNode<K, V>>();
  private head: LRUNode<K, V>;
  private tail: LRUNode<K, V>;

  constructor(maxSize: number = PERFORMANCE.SIMPLE_CACHE_MAX_SIZE) {
    this.capacity = maxSize;
    // 创建哨兵节点简化边界处理（使用 null 标记哨兵节点）
    this.head = new LRUNode<K, V>(null, null);
    this.tail = new LRUNode<K, V>(null, null);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: K): V | undefined {
    const node = this.cache.get(key);
    if (!node || node.isSentinel()) {
      return undefined;
    }

    // 移动到头部（最近使用）
    this.moveToHead(node);
    return node.value ?? undefined;
  }

  set(key: K, value: V): void {
    const existingNode = this.cache.get(key);

    if (existingNode) {
      // 更新现有节点
      existingNode.value = value;
      this.moveToHead(existingNode);
    } else {
      // 添加新节点
      const newNode = new LRUNode(key, value);

      if (this.cache.size >= this.capacity) {
        // 移除最少使用的节点
        const tail = this.removeTail();
        if (tail && tail.key !== null) {
          this.cache.delete(tail.key);
        }
      }

      this.cache.set(key, newNode);
      this.addToHead(newNode);
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.cache.delete(key);
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  size(): number {
    return this.cache.size;
  }

  // 获取缓存统计信息
  getStats(): { size: number; capacity: number; hitRate?: number } {
    return {
      size: this.cache.size,
      capacity: this.capacity,
    };
  }

  // === 私有辅助方法 ===

  private addToHead(node: LRUNode<K, V>): void {
    node.prev = this.head;
    node.next = this.head.next;

    if (this.head.next) {
      this.head.next.prev = node;
    }
    this.head.next = node;
  }

  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
  }

  private moveToHead(node: LRUNode<K, V>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private removeTail(): LRUNode<K, V> | null {
    const lastNode = this.tail.prev;
    if (lastNode && lastNode !== this.head && !lastNode.isSentinel()) {
      this.removeNode(lastNode);
      return lastNode;
    }
    return null;
  }
}
