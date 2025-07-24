/**
 * 防抖管理器测试
 */

import * as assert from "assert";
import { DebounceManager } from "../visual-editor/clang-format/core/debounce-manager";

suite("DebounceManager Tests", () => {
  let debounceManager: DebounceManager;

  setup(() => {
    debounceManager = new DebounceManager();
  });

  teardown(() => {
    debounceManager.dispose();
  });

  test("should debounce rapid function calls", async () => {
    let callCount = 0;
    const testFunction = async () => {
      callCount++;
    };

    const debouncedFunction = debounceManager.debounce(
      "test-debounce",
      testFunction,
      { delay: 100 },
    );

    // 快速调用多次
    debouncedFunction();
    debouncedFunction();
    debouncedFunction();

    // 等待防抖延迟
    await new Promise((resolve) => setTimeout(resolve, 150));

    // 应该只执行一次
    assert.strictEqual(callCount, 1);
  });

  test("should handle leading edge execution", async () => {
    let callCount = 0;
    const testFunction = async () => {
      callCount++;
    };

    const debouncedFunction = debounceManager.debounce(
      "test-leading",
      testFunction,
      { delay: 100, leading: true },
    );

    // 第一次调用应该立即执行
    await debouncedFunction();
    assert.strictEqual(callCount, 1);

    // 快速后续调用应该被防抖
    debouncedFunction();
    debouncedFunction();

    await new Promise((resolve) => setTimeout(resolve, 150));

    // 总共应该执行2次（leading + trailing）
    assert.strictEqual(callCount, 2);
  });

  test("should handle lock mechanism", async () => {
    let operationCount = 0;

    const operation = async () => {
      operationCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
    };

    // 并发执行多个操作
    const promises = [
      debounceManager.withLock("test-lock", operation),
      debounceManager.withLock("test-lock", operation).catch(() => {}), // 应该失败
      debounceManager.withLock("test-lock", operation).catch(() => {}), // 应该失败
    ];

    await Promise.allSettled(promises);

    // 只有第一个操作应该成功执行
    assert.strictEqual(operationCount, 1);
  });

  test("should queue operations correctly", async () => {
    const executionOrder: number[] = [];

    const createOperation = (id: number) => async () => {
      executionOrder.push(id);
      await new Promise((resolve) => setTimeout(resolve, 10));
    };

    // 队列化多个操作
    await Promise.all([
      debounceManager.queueOperation("test-queue", createOperation(1)),
      debounceManager.queueOperation("test-queue", createOperation(2)),
      debounceManager.queueOperation("test-queue", createOperation(3)),
    ]);

    // 应该按顺序执行
    assert.deepStrictEqual(executionOrder, [1, 2, 3]);
  });

  test("should handle cancellation", async () => {
    let callCount = 0;
    const testFunction = async () => {
      callCount++;
    };

    const debouncedFunction = debounceManager.debounce(
      "test-cancel",
      testFunction,
      { delay: 100 },
    );

    // 调用函数但立即取消
    debouncedFunction();
    debounceManager.cancel("test-cancel");

    await new Promise((resolve) => setTimeout(resolve, 150));

    // 函数不应该被执行
    assert.strictEqual(callCount, 0);
  });

  test("should provide correct status information", () => {
    const testFunction = async () => {};

    const debouncedFunction = debounceManager.debounce(
      "test-status",
      testFunction,
      { delay: 100 },
    );

    debouncedFunction();

    const status = debounceManager.getStatus();

    assert.strictEqual(status.activeTimers.includes("test-status"), true);
    assert.strictEqual(status.activeLocks.length, 0);
    assert.strictEqual(status.pendingQueues.length, 0);
  });
});
