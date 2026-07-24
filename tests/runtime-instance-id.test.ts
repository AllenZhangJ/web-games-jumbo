import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaProductGame } from '@number-strategy-jump/arena-v1-application-launch';
import { createRuntimeInstanceId } from '@number-strategy-jump/arena-platform-runtime';
import { createPlatformContract } from '@number-strategy-jump/arena-platform-contracts';

test('runtime instance id prefers host crypto and validates its namespace', () => {
  assert.equal(createRuntimeInstanceId({
    crypto: { randomUUID: () => 'runtime-uuid' },
  }, 'arena-product-douyin'), 'arena-product-douyin-runtime-uuid');
  assert.throws(() => createRuntimeInstanceId({}, '   '), /prefix/);
});

test('runtime instance id fallback cannot collide inside one VM and carries restart entropy', () => {
  const root = {
    Date: { now: () => 1_234_567 },
    performance: { now: () => 98.765 },
  };
  const first = createRuntimeInstanceId(root, 'arena-product');
  const second = createRuntimeInstanceId(root, 'arena-product');
  assert.match(first, /^arena-product-fallback-1234567-98765-\d+$/);
  assert.notEqual(second, first);
});

test('runtime instance id supports getRandomValues-only mini-game hosts', () => {
  const root = {
    crypto: {
      getRandomValues(values: Uint32Array): Uint32Array {
        values.set([1, 2, 3, 4]);
        return values;
      },
    },
  };
  assert.equal(
    createRuntimeInstanceId(root, 'mini-game'),
    'mini-game-00000001000000020000000300000004',
  );
});

test('product game decoration never evaluates invalid option accessors', () => {
  let getterCalls = 0;
  const options = {};
  Object.defineProperty(options, 'ownerId', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 'must-not-run';
    },
  });

  assert.throws(
    () => createArenaProductGame(createPlatformContract({ id: 'test' }), options),
    /不能是访问器/,
  );
  assert.equal(getterCalls, 0);
});
