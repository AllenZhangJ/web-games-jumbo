import {
  assertKnownKeys,
  assertNonEmptyString,
} from './definition-utils.js';

export interface SynchronousStorageReadResult {
  readonly ok: boolean;
  readonly found: boolean;
  readonly value: unknown;
}

export interface SynchronousStoragePort {
  read(key: string): SynchronousStorageReadResult;
  write(key: string, data: unknown): boolean;
  delete(key: string): boolean;
}

export interface SynchronousStoragePortOptions {
  readonly label?: string;
}

type UnknownFunction = (...args: unknown[]) => unknown;

const READ_RESULT_KEYS = new Set(['ok', 'found', 'value']);
const PORT_OPTION_KEYS = new Set(['label']);

function snapshotMethod(value: object, methodName: string, label: string): UnknownFunction {
  let current: object | null = value;
  const visited = new Set<object>();
  while (current !== null && !visited.has(current)) {
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, methodName);
    if (descriptor) {
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        throw new TypeError(`${label}.${methodName} 不得是访问器。`);
      }
      if (typeof descriptor.value !== 'function') {
        throw new TypeError(`${label}.${methodName} 必须是函数。`);
      }
      return descriptor.value as UnknownFunction;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  throw new TypeError(`${label}.${methodName} 必须是函数。`);
}

function findThenMethod(value: object): UnknownFunction | null {
  let current: object | null = value;
  const visited = new Set<object>();
  while (current !== null && !visited.has(current)) {
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, 'then');
    if (descriptor) {
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) return null;
      return typeof descriptor.value === 'function' ? descriptor.value as UnknownFunction : null;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  return null;
}

function rejectAsync<T>(value: T, name: string): T {
  if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
    const thenMethod = findThenMethod(value as object);
    if (!thenMethod) return value;
    try {
      thenMethod.call(value, undefined, () => undefined);
    } catch {
      // The synchronous boundary rejects the value regardless. A native
      // Promise is observed here only to contain a possible late rejection.
    }
    throw new TypeError(`${name} 必须同步完成。`);
  }
  return value;
}

function normalizeLabel(options: SynchronousStoragePortOptions): string {
  assertKnownKeys(options, PORT_OPTION_KEYS, 'SynchronousStoragePort options');
  const descriptor = Object.getOwnPropertyDescriptor(options, 'label');
  return assertNonEmptyString(
    descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')
      ? descriptor.value
      : 'Synchronous Storage',
    'SynchronousStoragePort.label',
  );
}

/**
 * Adapts the three platform storage functions into one strict, synchronous
 * port. Product, pilot and study persistence share this boundary without
 * sharing their aggregates, schemas or repositories.
 */
export function createSynchronousStoragePort(
  value: unknown,
  options: SynchronousStoragePortOptions = {},
): Readonly<SynchronousStoragePort> {
  const label = normalizeLabel(options);
  if (!value || typeof value !== 'object') throw new TypeError(`${label} Port 无效。`);
  const storageRead = snapshotMethod(value, 'storageRead', label);
  const storageWrite = snapshotMethod(value, 'storageWrite', label);
  const storageDelete = snapshotMethod(value, 'storageDelete', label);
  return Object.freeze({
    read(keyValue: string): SynchronousStorageReadResult {
      const key = assertNonEmptyString(keyValue, `${label} key`);
      const result = rejectAsync(storageRead.call(value, key), `${label}.storageRead`);
      assertKnownKeys(result, READ_RESULT_KEYS, `${label} read result`);
      if (typeof result.ok !== 'boolean' || typeof result.found !== 'boolean') {
        throw new TypeError(`${label} read result.ok/found 必须是布尔值。`);
      }
      if (!result.ok && result.found) {
        throw new RangeError(`${label} 读取失败时不能声明 found。`);
      }
      if (!result.found && result.value !== undefined) {
        throw new RangeError(`${label} 未找到值时 value 必须是 undefined。`);
      }
      return Object.freeze({ ok: result.ok, found: result.found, value: result.value });
    },
    write(keyValue: string, data: unknown): boolean {
      const key = assertNonEmptyString(keyValue, `${label} key`);
      const result = rejectAsync(
        storageWrite.call(value, key, data),
        `${label}.storageWrite`,
      );
      if (typeof result !== 'boolean') {
        throw new TypeError(`${label}.storageWrite 必须返回布尔值。`);
      }
      return result;
    },
    delete(keyValue: string): boolean {
      const key = assertNonEmptyString(keyValue, `${label} key`);
      const result = rejectAsync(storageDelete.call(value, key), `${label}.storageDelete`);
      if (typeof result !== 'boolean') {
        throw new TypeError(`${label}.storageDelete 必须返回布尔值。`);
      }
      return result;
    },
  });
}
