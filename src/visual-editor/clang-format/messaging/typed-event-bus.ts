import { EventBus } from './event-bus';
import { VisualEditorEventMap } from '../types/events';

// Typed helpers over EventBus without altering EventBus itself
export function onTyped<K extends keyof VisualEditorEventMap>(
  bus: EventBus,
  event: K,
  handler: (...args: VisualEditorEventMap[K]) => void,
): () => void {
  return bus.on(event as string, (...args: readonly unknown[]) => handler(...(args as VisualEditorEventMap[K])));
}

export function emitTyped<K extends keyof VisualEditorEventMap>(
  bus: EventBus,
  event: K,
  ...args: VisualEditorEventMap[K]
): void {
  bus.emit(event as string, ...args as readonly unknown[]);
}

// Generic typed wrapper (non-breaking): offers typed on/emit on top of EventBus
export class GenericEventBus<T extends Record<string, readonly unknown[]>> {
  constructor(private readonly base: EventBus = new EventBus()) {}

  on<K extends keyof T>(event: K, handler: (...args: T[K]) => void): () => void {
    return this.base.on(event as string, (...args: readonly unknown[]) => handler(...(args as T[K])));
  }

  once<K extends keyof T>(event: K, handler: (...args: T[K]) => void): () => void {
    const unsubscribe = this.base.once(event as string, (...args: readonly unknown[]) => handler(...(args as T[K])));
    // Return a noop unsubscribe for once
    return unsubscribe ?? (() => void 0);
  }

  off<K extends keyof T>(event: K, handler: (...args: T[K]) => void): void {
    this.base.off(event as string, handler as unknown as (...args: readonly unknown[]) => void);
  }

  emit<K extends keyof T>(event: K, ...args: T[K]): void {
    this.base.emit(event as string, ...args as readonly unknown[]);
  }

  dispose(): void { this.base.dispose(); }

  get raw(): EventBus { return this.base; }
}
