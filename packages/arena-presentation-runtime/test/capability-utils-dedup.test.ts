import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  assertCapabilityKnownKeys,
  assertCapabilityRecord,
  readCapabilityOwnData,
  rejectThenable,
  snapshotLegacyMethod,
  snapshotMethod,
} from '../src/capability-utils.js';

vi.mock(
  '@number-strategy-jump/arena-presentation-runtime/capability-utils',
  () => import('../src/capability-utils.js'),
);

import { rejectThenable as rejectProductThenable } from '../../arena-product-presentation/src/capability-utils.js';

const REPOSITORY_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

function source(relativePath: string): string {
  return readFileSync(`${REPOSITORY_ROOT}/${relativePath}`, 'utf8');
}

describe('Arena presentation shared capability helpers', () => {
  it('captures inherited data methods once with the original receiver', () => {
    let getterCalls = 0;
    const prototype = Object.create(null) as Record<PropertyKey, unknown>;
    Object.defineProperty(prototype, 'read', {
      configurable: true,
      enumerable: false,
      value(this: { readonly identity: string }, suffix: string) {
        return `${this.identity}:${suffix}`;
      },
    });
    Object.defineProperty(prototype, 'accessor', {
      configurable: true,
      get() {
        getterCalls += 1;
        return () => undefined;
      },
    });
    const value = Object.assign(Object.create(prototype) as object, { identity: 'stable' });

    const read = snapshotMethod(value, 'Shared capability', 'read');
    expect(read?.('ok')).toBe('stable:ok');
    expect(snapshotMethod(value, 'Shared capability', 'missing', false)).toBeNull();
    expect(() => snapshotMethod(value, 'Shared capability', 'accessor')).toThrow(
      'Shared capability.accessor 必须是数据方法。',
    );
    expect(getterCalls).toBe(0);
  });

  it('preserves strict root and missing-method diagnostics', () => {
    expect(() => snapshotMethod([], 'Shared capability', 'run')).toThrow(
      'Shared capability 必须是对象。',
    );
    expect(() => snapshotMethod({}, 'Shared capability', 'run')).toThrow(
      'Shared capability 缺少 run()。',
    );
  });

  it('separates bounded traversal from the unbounded compatibility contract', () => {
    const methodOwner = Object.create(null) as Record<PropertyKey, unknown>;
    Object.defineProperty(methodOwner, 'run', {
      value(this: { readonly identity: string }) {
        return this.identity;
      },
    });
    let deepValue: object = methodOwner;
    for (let depth = 0; depth < 40; depth += 1) deepValue = Object.create(deepValue) as object;
    Object.defineProperty(deepValue, 'identity', { value: 'deep' });

    expect(() => snapshotMethod(deepValue, 'Strict capability', 'run')).toThrow(
      'Strict capability 返回值原型链无效。',
    );
    expect(snapshotLegacyMethod(deepValue, 'Legacy capability', 'run')()).toBe('deep');
    expect(() => snapshotLegacyMethod({}, 'Legacy capability', 'run')).toThrow(
      'Legacy capability 缺少 run()。',
    );

    const cyclicProxy: object = new Proxy({}, {
      getPrototypeOf() {
        return cyclicProxy;
      },
    });
    expect(() => snapshotMethod(cyclicProxy, 'Strict cyclic capability', 'run')).toThrow(
      'Strict cyclic capability 返回值原型链无效。',
    );
  });

  it('shares exact record, key and own-data validation without executing accessors', () => {
    const allowed = new Set<PropertyKey>(['optional']);
    const value = Object.freeze({ optional: 7 });
    expect(() => assertCapabilityRecord(value, 'Shared options')).not.toThrow();
    expect(() => assertCapabilityKnownKeys(value, allowed, 'Shared options')).not.toThrow();
    expect(readCapabilityOwnData(value, 'optional', 'Shared options')).toBe(7);
    expect(readCapabilityOwnData({}, 'optional', 'Shared options', false)).toBeUndefined();

    let getterCalls = 0;
    const accessor = Object.defineProperty({}, 'optional', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 7;
      },
    });
    expect(() => readCapabilityOwnData(accessor, 'optional', 'Shared options')).toThrow(
      'Shared options.optional 必须是数据字段。',
    );
    expect(getterCalls).toBe(0);
    expect(() => assertCapabilityKnownKeys(
      { [Symbol('extra')]: true },
      allowed,
      'Shared options',
    )).toThrow(/Shared options 包含未知字段 Symbol\(extra\)/u);
  });

  it('rejects asynchronous and hostile thenables without executing their members', () => {
    let getterCalls = 0;
    let thenCalls = 0;
    const accessor = Object.defineProperty({}, 'then', {
      get() {
        getterCalls += 1;
        return () => undefined;
      },
    });
    const hostile = {
      then() {
        thenCalls += 1;
      },
    };

    expect(() => rejectThenable(accessor, 'Shared result')).toThrow(
      'Shared result返回访问器thenable。',
    );
    expect(() => rejectThenable(hostile, 'Shared result')).toThrow(
      /Shared result(?:返回then字段|必须同步完成)/,
    );
    expect(() => rejectThenable({ then: null }, 'Shared result')).toThrow(
      'Shared result返回then字段，必须同步完成。',
    );
    expect(getterCalls).toBe(0);
    expect(thenCalls).toBe(0);
  });

  it('keeps Product on the pre-edit safe thenable boundary', () => {
    let thenCalls = 0;
    let getterCalls = 0;
    const thenable = {
      then() {
        thenCalls += 1;
      },
    };
    const accessor = Object.defineProperty({}, 'then', {
      get() {
        getterCalls += 1;
        return () => undefined;
      },
    });

    expect(rejectProductThenable).toBe(rejectThenable);
    expect(() => rejectProductThenable(thenable, 'Product result')).toThrow(
      'Product result返回then字段，必须同步完成。',
    );
    expect(() => rejectProductThenable(accessor, 'Product result')).toThrow(
      'Product result返回访问器thenable。',
    );
    expect(thenCalls).toBe(0);
    expect(getterCalls).toBe(0);

    let deepValue: object = {};
    for (let depth = 0; depth < 40; depth += 1) deepValue = Object.create(deepValue) as object;
    expect(() => rejectProductThenable(deepValue, 'Product deep result')).toThrow(
      /Product deep result返回值原型链(?:无效|超过32层)。/,
    );

    const cyclicProxy: object = new Proxy({}, {
      getPrototypeOf() {
        return cyclicProxy;
      },
    });
    expect(() => rejectProductThenable(cyclicProxy, 'Product cyclic result')).toThrow(
      /Product cyclic result返回值原型链(?:无效|循环)。/,
    );
  });

  it('keeps all migrated callers on the single low-level implementation', () => {
    const productCapability = source(
      'packages/arena-product-presentation/src/capability-utils.ts',
    );
    expect(productCapability).not.toMatch(/^function snapshotMethod\s*\(/mu);
    expect(productCapability).not.toMatch(/^function rejectThenable\s*\(/mu);

    for (const relativePath of [
      'packages/arena-presentation-runtime/src/arena-impact-audio.ts',
      'packages/arena-presentation-three/src/arena-hud-layer.ts',
      'packages/arena-presentation-three/src/arena-greybox-renderer.ts',
      'packages/arena-presentation-three/src/arena-world-stage.ts',
    ]) {
      const migratedSource = source(relativePath);
      expect(migratedSource, relativePath).not.toMatch(
        /^function (assertRecord|assertKnownKeys|ownData|snapshotMethod)\s*\(/mu,
      );
    }
    expect(source(
      'packages/arena-presentation-runtime/src/character-view-runtime.ts',
    )).not.toMatch(/^function (snapshotMethod|rejectThenable)\s*\(/mu);
  });
});
