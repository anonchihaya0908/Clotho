/**
 * Custom hooks for performance optimization
 */

import { useCallback, useRef, useEffect, useState } from 'react';

/**
 * 防抖 Hook - 增强版本，防止组件卸载后执行
 * @param callback 要防抖的函数
 * @param delay 防抖延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef<T>(callback);
  const isMountedRef = useIsMounted();

  // 保持回调函数的最新引用
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    // 如果组件已卸载，不执行任何操作
    if (!isMountedRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      // 双重检查组件是否仍然挂载
      if (isMountedRef.current) {
        callbackRef.current(...args);
      }
      timeoutRef.current = null;
    }, delay);
  }, [delay, isMountedRef]);
}

/**
 * 多键防抖 Hook - 增强版本，防止组件卸载后执行
 * @param callback 要防抖的函数
 * @param delay 防抖延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function useMultiKeyDebounce<T extends (key: string, ...args: any[]) => any>(
  callback: T,
  delay: number
): (key: string, ...args: Parameters<T> extends [string, ...infer U] ? U : never) => void {
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const callbackRef = useRef(callback);
  const isMountedRef = useIsMounted();

  // 保持回调函数的最新引用
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 清理所有定时器
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  return useCallback((key: string, ...args: any[]) => {
    // 如果组件已卸载，不执行任何操作
    if (!isMountedRef.current) return;

    const timeouts = timeoutsRef.current;

    // 清除该键的现有定时器
    const existingTimeout = timeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // 设置新的定时器
    const timeoutId = setTimeout(() => {
      // 双重检查组件是否仍然挂载
      if (isMountedRef.current) {
        callbackRef.current(key, ...args);
      }
      timeouts.delete(key);
    }, delay);

    timeouts.set(key, timeoutId);
  }, [delay, isMountedRef]);
}

/**
 * 节流 Hook
 * @param callback 要节流的函数
 * @param delay 节流延迟时间（毫秒）
 * @returns 节流后的函数
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastCallRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  // 保持回调函数的最新引用
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      callbackRef.current(...args);
    }
  }, [delay]);
}

/**
 * 组件卸载状态 Hook
 * @returns 返回一个 ref，用于检查组件是否已卸载
 */
export function useIsMounted() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return isMountedRef;
}

/**
 * 安全的异步状态更新 Hook
 * @param initialState 初始状态
 * @returns [state, safeSetState] 安全的状态更新函数
 */
export function useSafeState<T>(initialState: T | (() => T)) {
  const [state, setState] = useState(initialState);
  const isMountedRef = useIsMounted();

  const safeSetState = useCallback((newState: T | ((prevState: T) => T)) => {
    if (isMountedRef.current) {
      setState(newState);
    }
  }, [isMountedRef]);

  return [state, safeSetState] as const;
}
