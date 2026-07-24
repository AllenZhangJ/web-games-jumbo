import { assertPlainRecord } from '@number-strategy-jump/arena-contracts';

export function readRequiredDataField(
  record: object,
  key: string,
  label: string,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${label}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

export function readOptionalDataField(
  record: object,
  key: string,
  label: string,
  fallback?: unknown,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined) return fallback;
  if (!descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${label}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

export function requireRecord(value: unknown, label: string): Record<string, unknown> {
  return assertPlainRecord(value, label);
}

function findDescriptor(
  value: unknown,
  key: string,
  ownerName: string,
): Readonly<{ owner: object; descriptor: PropertyDescriptor }> {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError(`${ownerName}.${key} 不存在。`);
  }
  const visited = new Set<object>();
  let current: object | null = value as object;
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) {
      throw new TypeError(`${ownerName} 原型链无效。`);
    }
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) return Object.freeze({ owner: current, descriptor });
    current = Object.getPrototypeOf(current) as object | null;
  }
  throw new TypeError(`${ownerName}.${key} 不存在。`);
}

export function snapshotMethod<T>(
  value: unknown,
  methodName: string,
  ownerName: string,
): T {
  const { descriptor } = findDescriptor(value, methodName, ownerName);
  if (!('value' in descriptor) || typeof descriptor.value !== 'function') {
    throw new TypeError(`${ownerName}.${methodName} 必须是数据方法。`);
  }
  return descriptor.value.bind(value) as T;
}

export function snapshotGetter<T>(
  value: unknown,
  propertyName: string,
  ownerName: string,
): () => T {
  const { descriptor } = findDescriptor(value, propertyName, ownerName);
  if (!('get' in descriptor) || typeof descriptor.get !== 'function' || descriptor.set) {
    throw new TypeError(`${ownerName}.${propertyName} 必须是只读 getter。`);
  }
  const getter = descriptor.get;
  return (): T => getter.call(value) as T;
}

export function containRejectedAsyncReturn(value: unknown, label: string): void {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return;
  let current: object | null = value as object;
  const visited = new Set<object>();
  while (current !== null && visited.size < 32 && !visited.has(current)) {
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, 'then');
    if (descriptor) {
      if ('value' in descriptor && typeof descriptor.value === 'function') {
        Promise.resolve(value).catch(() => {
          // The public port is synchronous; contain a late rejection after rejecting it.
        });
      }
      throw new TypeError(`${label} 必须同步完成。`);
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
}
