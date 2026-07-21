function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function createFnv1aHash(text: string): string {
  if (typeof text !== 'string') throw new TypeError('FNV-1a 输入必须是字符串。');
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function canonicalize(value: unknown, name: string, active: WeakSet<object>): string {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${name} 不能包含非有限数。`);
    return `n:${Object.is(value, -0) ? 0 : value}`;
  }
  if (typeof value === 'string') return `s:${JSON.stringify(value)}`;
  if (typeof value === 'boolean') return value ? 'b:1' : 'b:0';
  if (!value || typeof value !== 'object') {
    throw new TypeError(`${name} 不支持 ${typeof value}。`);
  }
  if (active.has(value)) throw new TypeError(`${name} 不能包含循环引用。`);
  active.add(value);
  try {
    if (Array.isArray(value)) {
      const keys = Reflect.ownKeys(value);
      const expectedKeys = new Set(['length']);
      for (let index = 0; index < value.length; index += 1) expectedKeys.add(String(index));
      if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
        throw new TypeError(`${name} 数组不能包含空槽、Symbol 或额外字段。`);
      }
      return `[${Array.from({ length: value.length }, (_, index) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (
          !descriptor
          || !descriptor.enumerable
          || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
        ) {
          throw new TypeError(`${name}[${index}] 必须是数据字段。`);
        }
        return canonicalize(descriptor.value, `${name}[${index}]`, active);
      }).join(',')}]`;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${name} 只支持普通对象。`);
    }
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== 'string')) {
      throw new TypeError(`${name} 不能包含 Symbol 字段。`);
    }
    const stringKeys = keys as string[];
    stringKeys.sort(compareText);
    return `{${stringKeys.map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        !descriptor
        || !descriptor.enumerable
        || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
      ) throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
      return `${JSON.stringify(key)}:${canonicalize(descriptor.value, `${name}.${key}`, active)}`;
    }).join(',')}}`;
  } finally {
    active.delete(value);
  }
}

export function createDeterministicDataHash(value: unknown, name = 'data'): string {
  return createFnv1aHash(canonicalize(value, name, new WeakSet()));
}
