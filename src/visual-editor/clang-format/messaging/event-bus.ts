import { EventEmitter } from 'events';
import { UI_CONSTANTS } from '../../../common/constants';
import { EventHandler, UnsubscribeFunction } from '../../../common/types/event-types';

/**
 * 一个简单的事件总线，用于在不同管理器之间解耦通信
 * 基于Node.js的EventEmitter实现
 */
export class EventBus {
  private emitter = new EventEmitter();

  constructor() {
    //  increased listener limit using centralized constant
    this.emitter.setMaxListeners(UI_CONSTANTS.MAX_EVENT_LISTENERS);
  }

  /**
   * 订阅事件
   * @param eventName 事件名称
   * @param handler 事件处理函数
   * @returns 一个可以调用以取消订阅的函数
   */
  on(eventName: string, handler: EventHandler): UnsubscribeFunction {
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
  emit(eventName: string, ...args: readonly unknown[]): void {
    this.emitter.emit(eventName, ...args);
  }

  /**
   * 异步发布事件，返回Promise以支持串联操作
   * @param eventName 事件名称
   * @param args 传递给处理函数的参数
   * @returns Promise<void>
   */
  async emitAsync(eventName: string, ...args: readonly unknown[]): Promise<void> {
    return new Promise((resolve) => {
      this.emitter.emit(eventName, ...args);
      // 使用微任务确保事件处理器有机会执行
      process.nextTick(resolve);
    });
  }

  /**
   * 清理所有监听器
   */
  dispose(): void {
    this.emitter.removeAllListeners();
  }
}
