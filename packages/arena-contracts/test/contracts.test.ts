import { describe, expect, it } from 'vitest';
import {
  ARENA_MATCH_EVENT,
  assertKnownKeys,
  cloneFrozenData,
  cloneFrozenStringSet,
  createDeterministicDataHash,
  createRng,
  createNeutralInputFrame,
  createSynchronousStoragePort,
  deriveSeed,
  normalizeInputFrames,
} from '../src/index.js';
import type { ArenaInputFrame, ArenaMatchEventType } from '../src/index.js';

describe('Arena deterministic contracts', () => {
  it('normalizes complete InputFrame batches and fills missing participants deterministically', () => {
    const frame: ArenaInputFrame = createNeutralInputFrame(3, 'p1');
    expect(normalizeInputFrames([{ ...frame, moveX: 1, moveZ: 1 }], {
      tick: 3,
      participantIds: ['p1', 'p2'],
    })).toEqual([
      { ...frame, moveX: 1 / Math.hypot(1, 1), moveZ: 1 / Math.hypot(1, 1) },
      createNeutralInputFrame(3, 'p2'),
    ]);
    expect(() => normalizeInputFrames([frame, frame], {
      tick: 3,
      participantIds: ['p1'],
    })).toThrow(/重复输入/);
  });

  it('publishes one typed authority event vocabulary', () => {
    const event: ArenaMatchEventType = ARENA_MATCH_EVENT.HIT_RESOLVED;
    expect(event).toBe('HitResolved');
    expect(Object.isFrozen(ARENA_MATCH_EVENT)).toBe(true);
  });

  it('adapts one synchronous storage boundary and rejects ambiguous host results', () => {
    const values = new Map<string, unknown>();
    const host = {
      storageRead(key: string) {
        return values.has(key)
          ? { ok: true, found: true, value: values.get(key) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown) {
        values.set(key, value);
        return true;
      },
      storageDelete(key: string) {
        return values.delete(key);
      },
    };
    const port = createSynchronousStoragePort(host, { label: 'Contract Test Storage' });
    expect(port.write('profile', { revision: 1 })).toBe(true);
    expect(port.read('profile')).toEqual({ ok: true, found: true, value: { revision: 1 } });
    expect(port.delete('profile')).toBe(true);
    expect(port.read('profile')).toEqual({ ok: true, found: false, value: undefined });
    expect(Object.isFrozen(port)).toBe(true);
    expect(Object.isFrozen(port.read('profile'))).toBe(true);

    expect(() => createSynchronousStoragePort({
      ...host,
      storageRead: () => ({ ok: false, found: true, value: null }),
    }).read('profile')).toThrow(/found/);
    expect(() => createSynchronousStoragePort({
      ...host,
      storageWrite: async () => true,
    }).write('profile', null)).toThrow(/同步完成/);
  });

  it('deeply freezes canonical data without trusting accessors or insertion order', () => {
    const left = cloneFrozenData({ z: [3, 2, 1], a: { enabled: true } });
    const right = { a: { enabled: true }, z: [3, 2, 1] };
    expect(Object.isFrozen(left)).toBe(true);
    expect(Object.isFrozen(left.a)).toBe(true);
    expect(createDeterministicDataHash(left)).toBe(createDeterministicDataHash(right));
    expect(() => cloneFrozenData({
      get unsafe() {
        return 1;
      },
    })).toThrow(/数据字段/);
  });

  it('rejects schema drift and normalizes immutable string sets', () => {
    expect(() => assertKnownKeys({ id: 'arena', extra: true }, new Set(['id']), 'value'))
      .toThrow(/不支持字段 extra/);
    expect(cloneFrozenStringSet(['z', 'a'])).toEqual(['a', 'z']);
    expect(() => cloneFrozenStringSet(['same', 'same'])).toThrow(/重复项/);
  });

  it('preserves the frozen RNG sequence, bounded integers and named stream isolation', () => {
    const rng = createRng(12345);
    expect(Array.from({ length: 4 }, () => rng.next())).toEqual([
      0.9797282677609473,
      0.3067522644996643,
      0.484205421525985,
      0.817934412509203,
    ]);
    expect(deriveSeed(88, 'map')).toBe(deriveSeed(88, 'map'));
    expect(deriveSeed(88, 'map')).not.toBe(deriveSeed(88, 'bot'));
    expect(() => rng.int(0, 0x100000000)).toThrow(/不能超过 uint32/);
  });
});
