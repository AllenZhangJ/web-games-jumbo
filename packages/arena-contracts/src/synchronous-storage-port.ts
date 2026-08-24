import {
  assertKnownKeys,
  assertNonEmptyString,
} from './definition-utils.js';
import { assertSynchronousReturn } from './synchronous-return-boundary.js';

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
const MAX_STORAGE_PORT_PROTOTYPE_DEPTH = 32;

export const SYNCHRONOUS_STORAGE_PORT_BOUNDARY = Object.freeze({
  maximumMethodPrototypeDepth: MAX_STORAGE_PORT_PROTOTYPE_DEPTH,
  readResultRequiresExactOwnEnumerableDataFields: true,
  sharedSynchronousReturnBoundaryWired: true,
  validationStatus: 'not-run',
} as const);

function snapshotMethod(value: object, methodName: string, label: string): UnknownFunction {
  let current: object | null = value;
  const visited = new Set<object>();
  for (
    let depth = 0;
    current !== null && depth < MAX_STORAGE_PORT_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(current)) throw new TypeError(`${label} Port 原型链不能循环。`);
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
  if (current !== null) {
    throw new RangeError(`${label} Port 原型链超过${MAX_STORAGE_PORT_PROTOTYPE_DEPTH}层。`);
  }
  throw new TypeError(`${label}.${methodName} 必须是函数。`);
}

function readResultField(result: object, key: string, label: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(result, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${label} read result.${key} 必须是自有可枚举数据字段。`);
  }
  return descriptor.value;
}

function requireSynchronousResult<T>(value: T, name: string): T {
  assertSynchronousReturn(value, name);
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
      const result = requireSynchronousResult(
        storageRead.call(value, key),
        `${label}.storageRead`,
      );
      assertKnownKeys(result, READ_RESULT_KEYS, `${label} read result`);
      const ok = readResultField(result, 'ok', label);
      const found = readResultField(result, 'found', label);
      const storedValue = readResultField(result, 'value', label);
      if (typeof ok !== 'boolean' || typeof found !== 'boolean') {
        throw new TypeError(`${label} read result.ok/found 必须是布尔值。`);
      }
      if (!ok && found) {
        throw new RangeError(`${label} 读取失败时不能声明 found。`);
      }
      if (!found && storedValue !== undefined) {
        throw new RangeError(`${label} 未找到值时 value 必须是 undefined。`);
      }
      return Object.freeze({ ok, found, value: storedValue });
    },
    write(keyValue: string, data: unknown): boolean {
      const key = assertNonEmptyString(keyValue, `${label} key`);
      const result = requireSynchronousResult(
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
      const result = requireSynchronousResult(
        storageDelete.call(value, key),
        `${label}.storageDelete`,
      );
      if (typeof result !== 'boolean') {
        throw new TypeError(`${label}.storageDelete 必须返回布尔值。`);
      }
      return result;
    },
  });
}
