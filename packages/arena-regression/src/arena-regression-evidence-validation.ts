import {
  assertIntegerAtLeast,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export function assertArenaRegressionSafeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value)) throw new TypeError(`${name} 必须是安全整数。`);
  return value as number;
}
export function assertArenaRegressionText(value: unknown, name: string): string {
  if (
    typeof value !== 'string' || value.length === 0 || value.length > 256
    || /[\u0000-\u001f\u007f]/.test(value)
  ) throw new TypeError(`${name} 必须是 1～256 位且不含控制字符的字符串。`);
  return value;
}
export function cloneArenaRegressionIntegerRecord(
  value: unknown,
  name: string,
): Readonly<Record<string, number>> {
  const source = assertPlainRecord(cloneFrozenData(value, name), name);
  const entries = Object.entries(source);
  if (entries.length === 0) throw new RangeError(`${name} 不能为空。`);
  if (entries.length > 256) throw new RangeError(`${name} 最多包含 256 项。`);
  return Object.freeze(Object.fromEntries(entries
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, count]) => [
      assertArenaRegressionText(key, `${name} key`),
      assertIntegerAtLeast(count, 0, `${name}.${key}`),
    ])));
}
