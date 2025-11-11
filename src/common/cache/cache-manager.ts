/**
 * Cache Manager
 * =============
 * 
 * 统一管理所有缓存实例，提供集中的清理、统计和监控功能
 * 
 * 设计模式：单例 + 注册表模式
 * 
 * 优点：
 * - 集中管理所有缓存
 * - 统一清理接口
 * - 内存使用监控
 * - 缓存性能统计
 */

import { SimpleCache as LRUCache } from '../utils/security';
import { createModuleLogger } from '../logger/unified-logger';

/**
 * 缓存类别
 */
export enum CacheCategory {
  /** 文件系统缓存 */
  FileSystem = 'filesystem',
  /** 搜索结果缓存 */
  Search = 'search',
  /** 正则表达式缓存 */
  Regex = 'regex',
  /** 路径缓存 */
  Path = 'path',
  /** 函数缓存 */
  Function = 'function',
  /** 其他缓存 */
  Other = 'other',
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  /** 缓存名称 */
  name: string;
  /** 缓存类别 */
  category: CacheCategory;
  /** 当前大小 */
  size: number;
  /** 最大容量 */
  capacity: number;
  /** 命中率（如果可用）*/
  hitRate?: number;
  /** 命中次数（如果可用）*/
  hits?: number;
  /** 未命中次数（如果可用）*/
  misses?: number;
}

/**
 * 缓存注册信息
 */
interface CacheRegistration<K = any, V = any> {
  name: string;
  category: CacheCategory;
  cache: LRUCache<K, V>;
  description?: string | undefined;
}

/**
 * 全局缓存统计
 */
export interface GlobalCacheStats {
  /** 总缓存数 */
  totalCaches: number;
  /** 总缓存条目数 */
  totalEntries: number;
  /** 总最大容量 */
  totalCapacity: number;
  /** 按类别分组的统计 */
  byCategory: Record<CacheCategory, {
    count: number;
    entries: number;
    capacity: number;
  }>;
  /** 各个缓存的详细统计 */
  caches: CacheStats[];
}

/**
 * 缓存管理器
 * 单例模式，统一管理所有缓存
 */
export class CacheManager {
  private static instance: CacheManager | null = null;
  private readonly logger = createModuleLogger('CacheManager');
  private readonly caches = new Map<string, CacheRegistration>();

  private constructor() {
    this.logger.info('CacheManager initialized', {
      module: 'CacheManager',
      operation: 'constructor',
    });
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * 注册缓存实例
   * @param name 缓存名称（唯一标识）
   * @param cache 缓存实例
   * @param category 缓存类别
   * @param description 可选描述
   */
  public registerCache<K, V>(
    name: string,
    cache: LRUCache<K, V>,
    category: CacheCategory,
    description?: string,
  ): void {
    if (this.caches.has(name)) {
      this.logger.warn(`Cache "${name}" is already registered, replacing...`, {
        module: 'CacheManager',
        operation: 'registerCache',
        name,
      });
    }

    this.caches.set(name, {
      name,
      category,
      cache,
      description,
    });

    this.logger.debug(`Registered cache: ${name}`, {
      module: 'CacheManager',
      operation: 'registerCache',
      name,
      category,
      capacity: cache.getStats().capacity,
    });
  }

  /**
   * 注销缓存
   * @param name 缓存名称
   */
  public unregisterCache(name: string): boolean {
    const existed = this.caches.delete(name);
    
    if (existed) {
      this.logger.debug(`Unregistered cache: ${name}`, {
        module: 'CacheManager',
        operation: 'unregisterCache',
        name,
      });
    }
    
    return existed;
  }

  /**
   * 获取指定缓存
   * @param name 缓存名称
   */
  public getCache<K, V>(name: string): LRUCache<K, V> | undefined {
    const registration = this.caches.get(name);
    return registration?.cache as LRUCache<K, V> | undefined;
  }

  /**
   * 清除指定缓存
   * @param name 缓存名称
   */
  public clearCache(name: string): boolean {
    const registration = this.caches.get(name);
    if (registration) {
      registration.cache.clear();
      this.logger.debug(`Cleared cache: ${name}`, {
        module: 'CacheManager',
        operation: 'clearCache',
        name,
      });
      return true;
    }
    return false;
  }

  /**
   * 清除指定类别的所有缓存
   * @param category 缓存类别
   */
  public clearCachesByCategory(category: CacheCategory): number {
    let clearedCount = 0;
    
    for (const registration of this.caches.values()) {
      if (registration.category === category) {
        registration.cache.clear();
        clearedCount++;
      }
    }

    this.logger.info(`Cleared ${clearedCount} caches in category: ${category}`, {
      module: 'CacheManager',
      operation: 'clearCachesByCategory',
      category,
      count: clearedCount,
    });

    return clearedCount;
  }

  /**
   * 清除所有缓存
   */
  public clearAllCaches(): number {
    let clearedCount = 0;
    
    for (const registration of this.caches.values()) {
      registration.cache.clear();
      clearedCount++;
    }

    this.logger.info(`Cleared all ${clearedCount} caches`, {
      module: 'CacheManager',
      operation: 'clearAllCaches',
      count: clearedCount,
    });

    return clearedCount;
  }

  /**
   * 获取指定缓存的统计信息
   * @param name 缓存名称
   */
  public getCacheStats(name: string): CacheStats | undefined {
    const registration = this.caches.get(name);
    if (!registration) {
      return undefined;
    }

    const stats = registration.cache.getStats();
    
    return {
      name: registration.name,
      category: registration.category,
      size: stats.size,
      capacity: stats.capacity,
      ...(stats.hitRate !== undefined && { hitRate: stats.hitRate }),
    };
  }

  /**
   * 获取所有缓存的统计信息
   */
  public getAllCacheStats(): CacheStats[] {
    const allStats: CacheStats[] = [];

    for (const registration of this.caches.values()) {
      const stats = registration.cache.getStats();
      allStats.push({
        name: registration.name,
        category: registration.category,
        size: stats.size,
        capacity: stats.capacity,
        ...(stats.hitRate !== undefined && { hitRate: stats.hitRate }),
      });
    }

    return allStats;
  }

  /**
   * 获取全局缓存统计信息
   */
  public getGlobalStats(): GlobalCacheStats {
    const cacheStats = this.getAllCacheStats();
    
    // 初始化按类别统计
    const byCategory: GlobalCacheStats['byCategory'] = {
      [CacheCategory.FileSystem]: { count: 0, entries: 0, capacity: 0 },
      [CacheCategory.Search]: { count: 0, entries: 0, capacity: 0 },
      [CacheCategory.Regex]: { count: 0, entries: 0, capacity: 0 },
      [CacheCategory.Path]: { count: 0, entries: 0, capacity: 0 },
      [CacheCategory.Function]: { count: 0, entries: 0, capacity: 0 },
      [CacheCategory.Other]: { count: 0, entries: 0, capacity: 0 },
    };

    let totalEntries = 0;
    let totalCapacity = 0;

    // 累加统计
    for (const stats of cacheStats) {
      const categoryStats = byCategory[stats.category];
      categoryStats.count++;
      categoryStats.entries += stats.size;
      categoryStats.capacity += stats.capacity;
      
      totalEntries += stats.size;
      totalCapacity += stats.capacity;
    }

    return {
      totalCaches: cacheStats.length,
      totalEntries,
      totalCapacity,
      byCategory,
      caches: cacheStats,
    };
  }

  /**
   * 获取内存使用估算（粗略估计）
   * 假设每个缓存条目平均 1KB
   */
  public getEstimatedMemoryUsage(): {
    current: number;  // 当前使用（字节）
    maximum: number;  // 最大容量（字节）
    percentage: number;  // 使用百分比
  } {
    const stats = this.getGlobalStats();
    const AVG_ENTRY_SIZE = 1024; // 1KB per entry (rough estimate)
    
    const current = stats.totalEntries * AVG_ENTRY_SIZE;
    const maximum = stats.totalCapacity * AVG_ENTRY_SIZE;
    const percentage = maximum > 0 ? (current / maximum) * 100 : 0;

    return {
      current,
      maximum,
      percentage,
    };
  }

  /**
   * 打印缓存报告到日志
   */
  public logCacheReport(): void {
    const globalStats = this.getGlobalStats();
    const memory = this.getEstimatedMemoryUsage();

    this.logger.info('=== Cache Report ===', {
      module: 'CacheManager',
      operation: 'logCacheReport',
    });

    this.logger.info(`Total Caches: ${globalStats.totalCaches}`, {
      totalEntries: globalStats.totalEntries,
      totalCapacity: globalStats.totalCapacity,
      memoryUsage: `${(memory.current / 1024).toFixed(2)} KB / ${(memory.maximum / 1024).toFixed(2)} KB (${memory.percentage.toFixed(1)}%)`,
    });

    // 按类别报告
    for (const [category, stats] of Object.entries(globalStats.byCategory)) {
      if (stats.count > 0) {
        this.logger.info(`  ${category}: ${stats.count} caches, ${stats.entries} entries, capacity ${stats.capacity}`, {
          category,
          count: stats.count,
          entries: stats.entries,
          capacity: stats.capacity,
        });
      }
    }

    // 详细缓存列表
    for (const cacheStats of globalStats.caches) {
      const usage = cacheStats.capacity > 0 
        ? ((cacheStats.size / cacheStats.capacity) * 100).toFixed(1)
        : '0.0';
      
      const hitRateStr = cacheStats.hitRate !== undefined 
        ? ` | Hit Rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`
        : '';

      this.logger.debug(`    - ${cacheStats.name}: ${cacheStats.size}/${cacheStats.capacity} (${usage}%)${hitRateStr}`, {
        name: cacheStats.name,
        category: cacheStats.category,
        size: cacheStats.size,
        capacity: cacheStats.capacity,
        hitRate: cacheStats.hitRate,
      });
    }
  }

  /**
   * 获取所有已注册的缓存名称
   */
  public getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }

  /**
   * 检查缓存是否已注册
   */
  public hasCache(name: string): boolean {
    return this.caches.has(name);
  }
}

/**
 * 获取全局缓存管理器实例
 */
export function getCacheManager(): CacheManager {
  return CacheManager.getInstance();
}
