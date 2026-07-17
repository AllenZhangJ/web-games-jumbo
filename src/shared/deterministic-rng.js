function toUint32(seed) {
  if (!Number.isFinite(seed)) throw new TypeError('RNG seed 必须是有限数。');
  return seed >>> 0;
}

export function deriveSeed(seed, namespace) {
  const root = toUint32(seed);
  if (typeof namespace !== 'string' || namespace.length === 0) {
    throw new TypeError('RNG namespace 必须是非空字符串。');
  }
  let hash = (0x811c9dc5 ^ root) >>> 0;
  for (let index = 0; index < namespace.length; index += 1) {
    hash ^= namespace.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  hash ^= root >>> 16;
  hash = Math.imul(hash, 0x85ebca6b) >>> 0;
  hash ^= hash >>> 13;
  return hash >>> 0;
}

export function createRng(seed = Date.now()) {
  let state = toUint32(seed);

  return {
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
      const span = max - min + 1;
      if (!Number.isSafeInteger(span) || span > 0x100000000) {
        throw new RangeError('rng.int(min, max) 的范围不能超过 uint32。');
      }
      return Math.floor(this.next() * span) + min;
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
