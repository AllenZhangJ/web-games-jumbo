export function createRng(seed = Date.now()) {
  let state = seed >>> 0;

  return {
    next() {
      // Keep the state in uint32 space. Without the truncation the accumulated
      // Number eventually loses low bits after a few million calls and the
      // generator silently stops following the intended Mulberry32 sequence.
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
      return Math.floor(this.next() * (max - min + 1)) + min;
    },
    pick(items) {
      if (!Array.isArray(items) || items.length === 0) {
        throw new RangeError('rng.pick(items) 需要非空数组。');
      }
      return items[Math.floor(this.next() * items.length)];
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
}
