/**
 * 🚀 统一的性能优化工具集
 * 提供防抖、节流和延迟执行的统一实现
 */

import { LRUCache } from '.';
import { PERFORMANCE } from '../constants';

/**
 * 防抖选项接口
 */
export interface DebounceOptions {
  /** 延迟时间（毫秒） */
  delay: number;
  /** 是否在首次调用时立即执行 */
  leading?: boolean;
  /** 是否在延迟结束时执行 */
  trailing?: boolean;
  /** 最大等待时间 */
  maxWait?: number;
}

/**
 * 防抖函数缓存，避免重复创建
 */
const debouncedFunctionsCache = new LRUCache<string, any>(PERFORMANCE.LRU_CACHE_MAX_SIZE);

/**
 * 🚀 增强版防抖函数 - 支持更多选项和缓存优化
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  options: number | DebounceOptions,
): (...args: Parameters<T>) => void {
  // 兼容旧版本API（只传delay数字）
  const opts: DebounceOptions = typeof options === 'number' 
    ? { delay: options, trailing: true }
    : { trailing: true, ...options };

  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T>;
  let lastCallTime: number | undefined;
  let lastInvokeTime = 0;

  function invokeFunc(time: number) {
    const args = lastArgs;
    lastInvokeTime = time;
    return func(...args);
  }

  function startTimer(timerExpired: () => void, wait: number) {
    return setTimeout(timerExpired, wait);
  }

  function cancelTimer() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= opts.delay ||
      (opts.maxWait !== undefined && timeSinceLastInvoke >= opts.maxWait)
    );
  }

  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // 重新启动定时器
    const timeSinceLastCall = time - (lastCallTime || 0);
    const remainingWait = opts.delay - timeSinceLastCall;
    timeout = startTimer(timerExpired, remainingWait);
  }

  function trailingEdge(time: number) {
    timeout = null;
    if (opts.trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = undefined as any;
    return undefined;
  }

  function leadingEdge(time: number) {
    lastInvokeTime = time;
    timeout = startTimer(timerExpired, opts.delay);
    return opts.leading ? invokeFunc(time) : undefined;
  }

  const debounced = (...args: Parameters<T>) => {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastCallTime = time;

    if (isInvoking) {
      if (timeout === null) {
        return leadingEdge(lastCallTime);
      }
      if (opts.maxWait !== undefined) {
        timeout = startTimer(timerExpired, opts.delay);
        return invokeFunc(lastCallTime);
      }
    }
    
    if (timeout === null) {
      timeout = startTimer(timerExpired, opts.delay);
    }
  };

  // 添加cancel方法
  (debounced as any).cancel = () => {
    cancelTimer();
    lastInvokeTime = 0;
    lastArgs = lastCallTime = undefined as any;
  };

  return debounced;
}

/**
 * 🚀 增强版节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): (...args: Parameters<T>) => void {
  const opts = { leading: true, trailing: true, ...options };
  return debounce(func, {
    delay: wait,
    leading: opts.leading,
    trailing: opts.trailing,
    maxWait: wait,
  });
}

/**
 * 🚀 缓存的防抖函数创建器 - 避免重复创建相同的防抖函数
 */
export function createCachedDebounce<T extends (...args: any[]) => any>(
  key: string,
  func: T,
  options: number | DebounceOptions,
): (...args: Parameters<T>) => void {
  const cached = debouncedFunctionsCache.get(key);
  if (cached) {
    return cached;
  }

  const debouncedFunc = debounce(func, options);
  debouncedFunctionsCache.set(key, debouncedFunc);
  return debouncedFunc;
}

/**
 * 🚀 简单延迟执行 - 替代直接使用setTimeout
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 🚀 带取消功能的延迟执行
 */
export function createCancelableDelay(ms: number): { promise: Promise<void>; cancel: () => void } {
  let timeoutId: NodeJS.Timeout;
  let rejectFn: (reason?: any) => void;

  const promise = new Promise<void>((resolve, reject) => {
    rejectFn = reject;
    timeoutId = setTimeout(resolve, ms);
  });

  const cancel = () => {
    clearTimeout(timeoutId);
    rejectFn(new Error('Delay cancelled'));
  };

  return { promise, cancel };
}

/**
 * 清理防抖函数缓存
 */
export function clearDebounceCache(): void {
  debouncedFunctionsCache.clear();
}
