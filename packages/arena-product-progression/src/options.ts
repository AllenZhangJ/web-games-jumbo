import { assertKnownKeys, assertPlainRecord, type PlainRecord } from '@number-strategy-jump/arena-contracts';

export function readExactOptions(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): Readonly<Record<string, unknown>> {
  const record = assertPlainRecord(value, name);
  assertKnownKeys(record, keys, name);
  const result: Record<string, unknown> = {};
  for (const key of keys) result[key] = readDataField(record, key, name);
  return Object.freeze(result);
}

export function readDataField(record: PlainRecord, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}
