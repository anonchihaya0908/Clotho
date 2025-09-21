/**
 *  内存管理工具集
 * 提供对象池、弱引用管理功能
 */

import { PERFORMANCE } from '../constants';
// import { LRUCache } from '.'; // 保留供未来使用
import { Factory, ResetFunction } from '../type-utilities';

/**
 *  通用对象池 - 减少频繁对象创建的内存开销
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: Factory<T>;
  private resetFn?: ResetFunction<T>;
  private maxSize: number;

  constructor(
    createFunction: Factory<T>,
    resetFunction?: ResetFunction<T>,
    maxSize: number = PERFORMANCE.OBJECT_POOL_MAX_SIZE
  ) {
    this.createFn = createFunction;
    if (resetFunction) {
      this.resetFn = resetFunction;
    }
    this.maxSize = maxSize;
  }

  /**
   * 获取对象（复用或新建）
   */
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  /**
   * 归还对象到池中
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      // 重置对象状态
      if (this.resetFn) {
        this.resetFn(obj);
      }
      this.pool.push(obj);
    }
    // 如果池已满，让对象被垃圾回收
  }

  /**
   * 获取池统计信息
   */
  getStats(): { available: number; maxSize: number } {
    return {
      available: this.pool.length,
      maxSize: this.maxSize,
    };
  }

  /**
   * 清空对象池
   */
  clear(): void {
    this.pool.length = 0;
  }
}

/**
 *  带大小限制的历史记录管理器
 */
export class BoundedHistory<T> {
  private history: T[] = [];
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  /**
   * 添加记录
   */
  push(item: T): void {
    this.history.push(item);

    // 保持大小限制，移除最旧的记录
    if (this.history.length > this.maxSize) {
      this.history.splice(0, this.history.length - this.maxSize);
    }
  }

  /**
   * 获取最近的记录
   */
  getRecent(count?: number): T[] {
    if (count === undefined) {
      return [...this.history];
    }
    return this.history.slice(-count);
  }

  /**
   * 弹出最后一个记录（用于回滚操作）
   */
  pop(): T | undefined {
    return this.history.pop();
  }

  /**
   * 根据条件过滤历史记录
   */
  filter(predicate: (item: T) => boolean): T[] {
    return this.history.filter(predicate);
  }

  /**
   * 清理旧记录（基于时间）
   */
  cleanupOld(isOld: (item: T) => boolean): void {
    this.history = this.history.filter(item => !isOld(item));
  }

  /**
   * 获取历史统计
   */
  getStats(): { count: number; maxSize: number; memoryUsageEstimate: string } {
    const estimatedSize = this.history.length * 200; // 估算每个记录200字节
    return {
      count: this.history.length,
      maxSize: this.maxSize,
      memoryUsageEstimate: `~${Math.round(estimatedSize / 1024)}KB`,
    };
  }

  /**
   * 清空历史
   */
  clear(): void {
    this.history.length = 0;
  }

  /**
   * 获取历史记录数量
   */
  get length(): number {
    return this.history.length;
  }
}

/**
 *  弱引用映射管理器 - 避免内存泄漏
 */
export class WeakReferenceManager<K extends object, V> {
  private weakMap = new WeakMap<K, V>();
  private strongRefs = new Set<K>(); // 可选的强引用集合

  /**
   * 设置映射（弱引用）
   */
  set(key: K, value: V): void {
    this.weakMap.set(key, value);
  }

  /**
   * 获取映射值
   */
  get(key: K): V | undefined {
    return this.weakMap.get(key);
  }

  /**
   * 检查是否存在映射
   */
  has(key: K): boolean {
    return this.weakMap.has(key);
  }

  /**
   * 删除映射
   */
  delete(key: K): boolean {
    this.strongRefs.delete(key);
    return this.weakMap.delete(key);
  }

  /**
   * 临时持有强引用（防止被垃圾回收）
   */
  holdStrongReference(key: K): void {
    this.strongRefs.add(key);
  }

  /**
   * 释放强引用
   */
  releaseStrongReference(key: K): void {
    this.strongRefs.delete(key);
  }

  /**
   * 清理所有强引用
   */
  clearStrongReferences(): void {
    this.strongRefs.clear();
  }

  /**
   * 获取强引用统计
   */
  getStrongRefCount(): number {
    return this.strongRefs.size;
  }
}


/**
 *  预定义的对象池工厂
 */
export class ObjectPoolFactory {
  private static pools = new Map<string, ObjectPool<unknown>>();

  /**
   * SearchResult对象池
   */
  static getSearchResultPool(): ObjectPool<{ files: unknown[]; method: string }> {
    if (!this.pools.has('SearchResult')) {
      const pool = new ObjectPool(
        () => ({ files: [], method: '' }),
        (obj) => {
          obj.files.length = 0;
          obj.method = '';
        }
      );
      this.pools.set('SearchResult', pool as ObjectPool<unknown>);
    }
    return this.pools.get('SearchResult')! as ObjectPool<{ files: unknown[]; method: string }>;
  }

  /**
   * ProcessInfo对象池
   */
  static getProcessInfoPool(): ObjectPool<{ pid: number; ppid: number; memory: number; name: string }> {
    if (!this.pools.has('ProcessInfo')) {
      const pool = new ObjectPool(
        () => ({ pid: 0, ppid: 0, memory: 0, name: '' }),
        (obj) => {
          obj.pid = 0;
          obj.ppid = 0;
          obj.memory = 0;
          obj.name = '';
        }
      );
      this.pools.set('ProcessInfo', pool as ObjectPool<unknown>);
    }
    return this.pools.get('ProcessInfo')! as ObjectPool<{ pid: number; ppid: number; memory: number; name: string }>;
  }

  /**
   * 配置对象池
   */
  static getConfigObjectPool(): ObjectPool<Record<string, unknown>> {
    if (!this.pools.has('ConfigObject')) {
      const pool = new ObjectPool(
        () => ({}),
        (obj) => {
          // 清空对象属性
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              delete (obj as Record<string, unknown>)[key];
            }
          }
        }
      );
      this.pools.set('ConfigObject', pool as ObjectPool<unknown>);
    }
    return this.pools.get('ConfigObject')! as ObjectPool<Record<string, unknown>>;
  }

  /**
   * 清理所有对象池
   */
  static cleanup(): void {
    for (const pool of this.pools.values()) {
      pool.clear();
    }
    this.pools.clear();
  }
}
