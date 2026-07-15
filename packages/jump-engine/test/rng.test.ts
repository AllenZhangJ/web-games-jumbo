import { describe, expect, it } from 'vitest';
import { createRng } from '../src/rng.js';

describe('deterministic random source', () => {
  it('replays the same sequence after restoring a snapshot', () => {
    const left = createRng(42);
    const right = createRng(42);
    expect([left.next(), left.next(), left.next()]).toEqual([
      right.next(),
      right.next(),
      right.next(),
    ]);

    const snapshot = left.snapshot();
    const expected = [left.next(), left.next()];
    left.restore(snapshot);
    expect([left.next(), left.next()]).toEqual(expected);
  });

  it('generates inclusive safe integers and selects existing items', () => {
    const rng = createRng(7);
    for (let index = 0; index < 100; index += 1) {
      expect(rng.int(-2, 2)).toBeGreaterThanOrEqual(-2);
      expect(rng.int(-2, 2)).toBeLessThanOrEqual(2);
      expect(['left', 'right']).toContain(rng.pick(['left', 'right']));
    }
    expect(rng.int(4, 4)).toBe(4);
  });

  it('rejects malformed ranges, empty choices and invalid snapshots', () => {
    const rng = createRng(1);
    for (const [min, max] of [[1.5, 2], [1, 2.5], [3, 2]]) {
      expect(() => rng.int(min, max)).toThrow(/安全整数边界/);
    }
    expect(() => rng.pick([])).toThrow(/非空数组/);
    expect(() => rng.pick(null as never)).toThrow(/非空数组/);
    for (const snapshot of [-1, 1.5, 0x1_0000_0000]) {
      expect(() => rng.restore(snapshot)).toThrow(/uint32/);
    }
  });
});
