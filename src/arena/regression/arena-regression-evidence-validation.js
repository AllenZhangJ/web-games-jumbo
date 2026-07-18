import {
  assertIntegerAtLeast,
  cloneFrozenData,
} from '../rules/definition-utils.js';

export function assertArenaRegressionSafeInteger(value, name) {
  if (!Number.isSafeInteger(value)) throw new TypeError(`${name} 必须是安全整数。`);
  return value;
}

export function assertArenaRegressionText(value, name) {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length > 256
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new TypeError(`${name} 必须是 1～256 位且不含控制字符的字符串。`);
  }
  return value;
}

export function cloneArenaRegressionIntegerRecord(value, name) {
  const source = cloneFrozenData(value, name);
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  if (Object.keys(source).length === 0) throw new RangeError(`${name} 不能为空。`);
  if (Object.keys(source).length > 256) throw new RangeError(`${name} 最多包含 256 项。`);
  return Object.freeze(Object.fromEntries(Object.entries(source)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, count]) => [
      assertArenaRegressionText(key, `${name} key`),
      assertIntegerAtLeast(count, 0, `${name}.${key}`),
    ])));
}
