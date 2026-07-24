export function snapshotDataArray(value: unknown, name: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  const keys = Reflect.ownKeys(value);
  const expectedKeys = new Set<string>(['length']);
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const key = String(index);
    expectedKeys.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      !descriptor
      || !descriptor.enumerable
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      throw new TypeError(`${name}[${index}] 必须是可枚举数据字段。`);
    }
    result.push(descriptor.value);
  }
  if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    throw new TypeError(`${name} 不能包含额外字段。`);
  }
  return Object.freeze(result);
}

export function readBoundMethod(
  value: object,
  method: string,
  name: string,
  required = true,
): ((argument?: unknown) => unknown) | null {
  let owner: object | null = value;
  while (owner && owner !== Object.prototype) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, method);
    if (descriptor) {
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        throw new TypeError(`${name}.${method} 必须是数据方法。`);
      }
      if (typeof descriptor.value !== 'function') {
        if (!required && descriptor.value === undefined) return null;
        throw new TypeError(`${name}.${method} 必须是函数。`);
      }
      return descriptor.value.bind(value) as (argument?: unknown) => unknown;
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  if (required) throw new TypeError(`${name}.${method} 必须是函数。`);
  return null;
}
