export type UnknownMethod = (...args: unknown[]) => unknown;

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
      try {
        Promise.prototype.then.call(value, undefined, () => {});
      } catch { /* non-Promise thenables must not be executed while rejecting them */ }
      throw new TypeError(`${name} 必须同步完成。`);
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
}

export function snapshotFunction(value: unknown, name: string): UnknownMethod {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value as UnknownMethod;
}
