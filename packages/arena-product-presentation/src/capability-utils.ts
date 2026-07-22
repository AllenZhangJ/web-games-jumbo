type UnknownMethod = (...args: unknown[]) => unknown;

export function snapshotMethod(
  value: unknown,
  name: string,
  methodName: string,
  required = true,
): UnknownMethod | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  let owner: object | null = value;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, methodName);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${methodName} 必须是数据方法。`);
      }
      const method = descriptor.value as UnknownMethod;
      return (...args: unknown[]) => method.call(value, ...args);
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  if (!required) return null;
  throw new TypeError(`${name} 缺少 ${methodName}()。`);
}

export function rejectThenable(value: unknown, name: string): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let owner: object | null = value as object;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, 'then');
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value')) {
        throw new TypeError(`${name} 返回了访问器 thenable。`);
      }
      if (typeof descriptor.value !== 'function') return;
      try { Promise.resolve(value).catch(() => {}); } catch { /* invalid thenable */ }
      throw new TypeError(`${name} 必须同步完成。`);
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
}

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
