export type UnknownFunction = (...args: unknown[]) => unknown;

export function ownDataOptions(
  value: unknown,
  name: string,
  allowedKeys?: ReadonlySet<string>,
): Readonly<Record<string, unknown>> {
  if (value === undefined) return Object.freeze({});
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') throw new RangeError(`${name} 不支持 Symbol 字段。`);
    if (allowedKeys && !allowedKeys.has(key)) throw new RangeError(`${name} 不支持 ${key}。`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name}.${key} 不能是访问器。`);
    result[key] = descriptor.value;
  }
  return Object.freeze(result);
}

export function descriptorInPrototypeChain(
  value: object,
  key: PropertyKey,
  name: string,
): PropertyDescriptor | null {
  const visited = new Set<object>();
  let current: object | null = value;
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) throw new TypeError(`${name} 原型链无效。`);
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) return descriptor;
    current = Object.getPrototypeOf(current) as object | null;
  }
  return null;
}

export function optionalDataField(value: unknown, key: string, name: string): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const descriptor = descriptorInPrototypeChain(value, key, name);
  if (!descriptor) return undefined;
  if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name}.${key} 不能是访问器。`);
  return descriptor.value;
}

export function optionalDataMethod(
  value: unknown,
  methodName: string,
  name: string,
): UnknownFunction | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const descriptor = descriptorInPrototypeChain(value, methodName, name);
  if (!descriptor) return null;
  if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
    throw new TypeError(`${name}.${methodName} 必须是数据方法。`);
  }
  return descriptor.value.bind(value) as UnknownFunction;
}

export function requiredFunction(value: unknown, name: string): UnknownFunction {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value as UnknownFunction;
}
