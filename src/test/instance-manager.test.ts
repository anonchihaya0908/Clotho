/**
 * 实例管理器单元测试
 */

import * as assert from 'assert';
import {
  BaseInstanceManager,
  Disposable,
} from '../common/services/instance-manager';

// 测试用的可销毁实例
class TestInstance implements Disposable {
  public disposed = false;

  constructor(public readonly id: string) {}

  dispose(): void {
    this.disposed = true;
  }
}

suite('InstanceManager Tests', () => {
  let manager: BaseInstanceManager<TestInstance>;

  setup(() => {
    manager = new BaseInstanceManager<TestInstance>();
  });

  teardown(() => {
    manager.dispose();
  });

  test('should create new instance', () => {
    const instance = manager.create('test1', () => new TestInstance('test1'));

    assert.strictEqual(instance.id, 'test1');
    assert.strictEqual(manager.count(), 1);
    assert.strictEqual(manager.has('test1'), true);
  });

  test('should return existing instance when creating with same id', () => {
    const instance1 = manager.create('test1', () => new TestInstance('test1'));
    const instance2 = manager.create(
      'test1',
      () => new TestInstance('test1-different'),
    );

    assert.strictEqual(instance1, instance2);
    assert.strictEqual(instance1.id, 'test1');
    assert.strictEqual(manager.count(), 1);
  });

  test('should get instance by id', () => {
    const created = manager.create('test1', () => new TestInstance('test1'));
    const retrieved = manager.get('test1');

    assert.strictEqual(created, retrieved);
  });

  test('should return undefined for non-existent instance', () => {
    const retrieved = manager.get('non-existent');
    assert.strictEqual(retrieved, undefined);
  });

  test('should destroy instance', () => {
    const instance = manager.create('test1', () => new TestInstance('test1'));

    assert.strictEqual(manager.destroy('test1'), true);
    assert.strictEqual(instance.disposed, true);
    assert.strictEqual(manager.count(), 0);
    assert.strictEqual(manager.has('test1'), false);
  });

  test('should return false when destroying non-existent instance', () => {
    assert.strictEqual(manager.destroy('non-existent'), false);
  });

  test('should destroy all instances', () => {
    const instance1 = manager.create('test1', () => new TestInstance('test1'));
    const instance2 = manager.create('test2', () => new TestInstance('test2'));

    manager.destroyAll();

    assert.strictEqual(instance1.disposed, true);
    assert.strictEqual(instance2.disposed, true);
    assert.strictEqual(manager.count(), 0);
  });

  test('should get all instances', () => {
    manager.create('test1', () => new TestInstance('test1'));
    manager.create('test2', () => new TestInstance('test2'));

    const allInstances = manager.getAll();

    assert.strictEqual(allInstances.size, 2);
    assert.strictEqual(allInstances.has('test1'), true);
    assert.strictEqual(allInstances.has('test2'), true);
  });

  test('should respect max instances limit', () => {
    const limitedManager = new BaseInstanceManager<TestInstance>({
      maxInstances: 2,
    });

    limitedManager.create('test1', () => new TestInstance('test1'));
    limitedManager.create('test2', () => new TestInstance('test2'));

    assert.throws(() => {
      limitedManager.create('test3', () => new TestInstance('test3'));
    }, /Maximum number of instances/);

    limitedManager.dispose();
  });

  test('should dispose manager and all instances', () => {
    const instance1 = manager.create('test1', () => new TestInstance('test1'));
    const instance2 = manager.create('test2', () => new TestInstance('test2'));

    manager.dispose();

    assert.strictEqual(instance1.disposed, true);
    assert.strictEqual(instance2.disposed, true);
    assert.strictEqual(manager.count(), 0);
  });
});
