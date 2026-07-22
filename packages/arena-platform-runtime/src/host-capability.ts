export type UnknownMethod = (...args: unknown[]) => unknown;

export function optionalProperty(value: unknown, key: PropertyKey): unknown {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return undefined;
  try {
    return Reflect.get(value, key);
  } catch {
    return undefined;
  }
}

export function optionalMethod(value: unknown, methodName: string): UnknownMethod | null {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return null;
  let owner: object | null = value as object;
  const visited = new Set<object>();
  while (owner !== null && visited.size < 32 && !visited.has(owner)) {
    visited.add(owner);
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(owner, methodName);
    } catch {
      return null;
    }
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') return null;
      const method = descriptor.value as UnknownMethod;
      return (...args: unknown[]) => method.call(value, ...args);
    }
    try {
      owner = Object.getPrototypeOf(owner) as object | null;
    } catch {
      return null;
    }
  }
  return null;
}

export function isThenable(value: unknown): boolean {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return false;
  let owner: object | null = value as object;
  const visited = new Set<object>();
  while (owner !== null && visited.size < 32 && !visited.has(owner)) {
    visited.add(owner);
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(owner, 'then');
    } catch {
      return true;
    }
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value')) {
        return true;
      }
      if (typeof descriptor.value !== 'function') return false;
      try { Promise.prototype.then.call(value, undefined, () => {}); } catch { /* non-Promise */ }
      return true;
    }
    try {
      owner = Object.getPrototypeOf(owner) as object | null;
    } catch {
      return true;
    }
  }
  return false;
}

export function rejectThenable(value: unknown, label: string): void {
  if (isThenable(value)) throw new TypeError(`${label} 不得返回异步 thenable。`);
}
