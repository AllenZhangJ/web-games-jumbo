import {
  rejectThenable,
  snapshotLegacyMethod as snapshotMethod,
} from '@number-strategy-jump/arena-presentation-runtime/capability-utils';

export { rejectThenable, snapshotMethod };

export function booleanResult(value: unknown, name: string): boolean {
  rejectThenable(value, name);
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须返回 boolean。`);
  return value;
}

export function ownOptions(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  name: string,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new RangeError(`${name} 不支持 Symbol 字段。`);
  }
  const result: Record<string, unknown> = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!allowedKeys.has(key)) throw new RangeError(`${name} 不支持字段 ${key}。`);
    if (!Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key} 必须是数据字段。`);
    }
    result[key] = descriptor.value;
  }
  return result;
}
