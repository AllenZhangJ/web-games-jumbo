export interface DeterministicRng {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  snapshot(): number;
  restore(snapshot: number): void;
}

export interface RandomSource {
  next(): number;
  snapshot?(): unknown;
  restore?(snapshot: unknown): void;
}

export function createRng(seed = Date.now()): DeterministicRng {
  let state = seed >>> 0;

  const rng: DeterministicRng = {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    int(min, max) {
      if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) {
        throw new RangeError('rng.int(min, max) 需要 min <= max 的安全整数边界。');
      }
      return Math.floor(rng.next() * (max - min + 1)) + min;
    },
    pick<T>(items: readonly T[]): T {
      if (!Array.isArray(items) || items.length === 0) {
        throw new RangeError('rng.pick(items) 需要非空数组。');
      }
      const item = items[Math.floor(rng.next() * items.length)];
      if (item === undefined) throw new RangeError('rng.pick(items) 未能选择数组项。');
      return item;
    },
    snapshot() {
      return state;
    },
    restore(snapshot) {
      if (!Number.isInteger(snapshot) || snapshot < 0 || snapshot > 0xffffffff) {
        throw new RangeError('RNG 快照必须是 uint32 整数。');
      }
      state = snapshot >>> 0;
    },
  };
  return rng;
}
