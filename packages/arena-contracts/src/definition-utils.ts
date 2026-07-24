const UNSAFE_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

export type PlainRecord = Record<string, unknown>;

export type DeepReadonly<T> =
  T extends (...args: never[]) => unknown ? T
    : T extends readonly (infer U)[] ? readonly DeepReadonly<U>[]
      : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T;

function ownDataKeys(value: object, name: string): string[] {
  const keys = Reflect.ownKeys(value);
  const result: string[] = [];
  for (const key of keys) {
    if (typeof key !== 'string') throw new TypeError(`${name} 不能包含 Symbol 字段。`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      !descriptor
      || !descriptor.enumerable
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
    }
    result.push(key);
  }
  return result;
}

export function assertPlainRecord(value: unknown, name: string): PlainRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  return value as PlainRecord;
}

export function assertKnownKeys(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  name: string,
): asserts value is PlainRecord {
  const record = assertPlainRecord(value, name);
  for (const key of ownDataKeys(record, name)) {
    if (UNSAFE_KEYS.has(key)) throw new RangeError(`${name} 包含不安全字段 ${key}。`);
    if (!allowedKeys.has(key)) throw new RangeError(`${name} 不支持字段 ${key}。`);
  }
}

export function assertNonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

export function assertIntegerAtLeast(value: unknown, minimum: number, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return value as number;
}

export function assertPositiveFinite(value: unknown, name: string): number {
  if (!Number.isFinite(value) || (value as number) <= 0) {
    throw new RangeError(`${name} 必须是有限正数。`);
  }
  return value as number;
}

function cloneData(value: unknown, name: string, active: WeakSet<object>): unknown {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new RangeError(`${name} 不能包含非有限数。`);
    return value;
  }
  if (typeof value !== 'object') {
    throw new TypeError(`${name} 只能包含可序列化数据。`);
  }
  if (active.has(value)) throw new TypeError(`${name} 不能包含循环引用。`);
  active.add(value);
  try {
    if (Array.isArray(value)) {
      const keys = Reflect.ownKeys(value);
      if (keys.some((key) => typeof key !== 'string')) {
        throw new TypeError(`${name} 不能包含 Symbol 字段。`);
      }
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (
          !descriptor
          || !descriptor.enumerable
          || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
        ) {
          throw new TypeError(`${name} 不能包含空槽或访问器。`);
        }
      }
      const expectedKeys = new Set(['length']);
      for (let index = 0; index < value.length; index += 1) expectedKeys.add(String(index));
      if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
        throw new TypeError(`${name} 数组不能包含额外字段。`);
      }
      return Object.freeze(Array.from({ length: value.length }, (_, index) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
          throw new TypeError(`${name}[${index}] 必须是数据字段。`);
        }
        return cloneData(descriptor.value, `${name}[${index}]`, active);
      }));
    }
    const record = assertPlainRecord(value, name);
    const result: PlainRecord = {};
    const descriptors = Object.getOwnPropertyDescriptors(record);
    for (const key of ownDataKeys(record, name).sort()) {
      if (UNSAFE_KEYS.has(key)) throw new RangeError(`${name} 包含不安全字段 ${key}。`);
      const descriptor = descriptors[key];
      if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        throw new TypeError(`${name}.${key} 必须是数据字段。`);
      }
      result[key] = cloneData(descriptor.value, `${name}.${key}`, active);
    }
    return Object.freeze(result);
  } finally {
    active.delete(value);
  }
}

export function cloneFrozenData<T>(
  value: T,
  name = 'data',
  active: WeakSet<object> = new WeakSet(),
): DeepReadonly<T> {
  return cloneData(value, name, active) as DeepReadonly<T>;
}

export function cloneFrozenStringSet(
  values: readonly unknown[] = [],
  name = 'values',
): readonly string[] {
  if (!Array.isArray(values)) throw new TypeError(`${name} 必须是数组。`);
  const result = values.map((value, index) => assertNonEmptyString(value, `${name}[${index}]`));
  if (new Set(result).size !== result.length) throw new RangeError(`${name} 不能包含重复项。`);
  return Object.freeze([...result].sort());
}
