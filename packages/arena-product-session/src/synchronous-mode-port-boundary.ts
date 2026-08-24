import { assertSynchronousReturn } from '@number-strategy-jump/arena-contracts';

export type SynchronousModePortMethod = (
  ...arguments_: readonly unknown[]
) => unknown;

const MAX_SYNCHRONOUS_PROTOTYPE_DEPTH = 32;

export function captureSynchronousModeDataMethod(
  target: unknown,
  methodName: string,
  ownerName: string,
): SynchronousModePortMethod {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${ownerName}.${methodName}()不存在。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  for (
    let depth = 0;
    cursor !== null && depth < MAX_SYNCHRONOUS_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(cursor)) {
      throw new TypeError(`${ownerName}原型链不能循环。`);
    }
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, methodName);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${ownerName}.${methodName}必须是数据方法。`);
      }
      const method = descriptor.value as SynchronousModePortMethod;
      return (...arguments_: readonly unknown[]) => Reflect.apply(method, target, arguments_);
    }
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  if (cursor !== null) {
    throw new RangeError(
      `${ownerName}原型链超过${MAX_SYNCHRONOUS_PROTOTYPE_DEPTH}层。`,
    );
  }
  throw new TypeError(`${ownerName}.${methodName}()不存在。`);
}

export function captureOptionalSynchronousModeDataMethod(
  target: unknown,
  methodName: string,
  ownerName: string,
): SynchronousModePortMethod | null {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${ownerName}.${methodName}()宿主无效。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  for (
    let depth = 0;
    cursor !== null && depth < MAX_SYNCHRONOUS_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(cursor)) throw new TypeError(`${ownerName}原型链不能循环。`);
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, methodName);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${ownerName}.${methodName}必须是数据方法。`);
      }
      const method = descriptor.value as SynchronousModePortMethod;
      return (...arguments_: readonly unknown[]) => Reflect.apply(method, target, arguments_);
    }
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  if (cursor !== null) {
    throw new RangeError(
      `${ownerName}原型链超过${MAX_SYNCHRONOUS_PROTOTYPE_DEPTH}层。`,
    );
  }
  return null;
}

export function assertSynchronousModePortResult<T>(
  value: T,
  contractName: string,
): T {
  assertSynchronousReturn(value, contractName);
  return value;
}
