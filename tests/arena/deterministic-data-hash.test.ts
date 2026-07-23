import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';

test('deterministic data hash ignores object insertion order but preserves array order', () => {
  const first = createDeterministicDataHash({ b: 2, a: { y: 4, x: 3 } });
  const reordered = createDeterministicDataHash({ a: { x: 3, y: 4 }, b: 2 });
  assert.equal(first, reordered);
  assert.notEqual(
    createDeterministicDataHash({ values: ['a', 'b'] }),
    createDeterministicDataHash({ values: ['b', 'a'] }),
  );
});

test('deterministic data hash rejects accessors, cycles, sparse arrays and non-finite values', () => {
  let getterCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, 'value', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 1;
    },
  });
  assert.throws(() => createDeterministicDataHash(accessor), /可枚举数据字段/);
  assert.equal(getterCalls, 0);
  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  assert.throws(() => createDeterministicDataHash(cyclic), /循环引用/);
  const sparse: unknown[] = [];
  sparse.length = 1;
  assert.throws(() => createDeterministicDataHash(sparse), /数据字段/);
  assert.throws(() => createDeterministicDataHash({ value: Number.NaN }), /非有限数/);
});
