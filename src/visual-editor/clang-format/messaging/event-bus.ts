import { EventEmitter } from 'events';

type EventHandler = (...args: any[]) => void;

/**
 * 一个简单的事件总线，用于在不同管理器之间解耦通信
 * 基于Node.js的EventEmitter实现
 */
export class EventBus {
  private emitter = new EventEmitter();

  constructor() {
    // 增加监听器限制，防止因监听过多而发出警告
    this.emitter.setMaxListeners(50);
  }

  /**
   * 订阅事件
   * @param eventName 事件名称
   * @param handler 事件处理函数
   * @returns 一个可以调用以取消订阅的函数
   */
  on(eventName: string, handler: EventHandler): () => void {
    this.emitter.on(eventName, handler);
    return () => this.emitter.off(eventName, handler);
  }

  /**
   * 订阅一次性事件
   * @param eventName 事件名称
   * @param handler 事件处理函数
   */
  once(eventName: string, handler: EventHandler): void {
    this.emitter.once(eventName, handler);
  }

  /**
   * 取消订阅事件
   * @param eventName 事件名称
   * @param handler 事件处理函数
   */
  off(eventName: string, handler: EventHandler): void {
    this.emitter.off(eventName, handler);
  }

  /**
   * 发布事件
   * @param eventName 事件名称
   * @param args 传递给处理函数的参数
   */
  emit(eventName: string, ...args: any[]): void {
    this.emitter.emit(eventName, ...args);
  }

  /**
   * 清理所有监听器
   */
  dispose(): void {
    this.emitter.removeAllListeners();
  }
}
