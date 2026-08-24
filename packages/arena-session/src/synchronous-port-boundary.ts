export type SynchronousPortMethod = (...arguments_: readonly unknown[]) => unknown;

const MAX_SYNC_DESCRIPTOR_PROTOTYPE_DEPTH = 32;
const NATIVE_PROMISE_PROTOTYPE = Promise.prototype;
const NATIVE_PROMISE_CONSTRUCTOR = Promise;
const CAPTURED_PROMISE_THEN_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  NATIVE_PROMISE_PROTOTYPE,
  'then',
);
if (CAPTURED_PROMISE_THEN_DESCRIPTOR === undefined
  || !Object.hasOwn(CAPTURED_PROMISE_THEN_DESCRIPTOR, 'value')
  || typeof CAPTURED_PROMISE_THEN_DESCRIPTOR.value !== 'function') {
  throw new TypeError('Arena Session无法捕获原生Promise.prototype.then数据方法。');
}
const NATIVE_PROMISE_THEN = CAPTURED_PROMISE_THEN_DESCRIPTOR.value as (
  ...arguments_: unknown[]
) => unknown;
const NATIVE_PROMISE_THEN_FLAGS = Object.freeze({
  configurable: CAPTURED_PROMISE_THEN_DESCRIPTOR.configurable,
  enumerable: CAPTURED_PROMISE_THEN_DESCRIPTOR.enumerable,
  writable: CAPTURED_PROMISE_THEN_DESCRIPTOR.writable,
});
const CAPTURED_PROMISE_SPECIES_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  NATIVE_PROMISE_CONSTRUCTOR,
  Symbol.species,
);
if (CAPTURED_PROMISE_SPECIES_DESCRIPTOR === undefined
  || typeof CAPTURED_PROMISE_SPECIES_DESCRIPTOR.get !== 'function'
  || CAPTURED_PROMISE_SPECIES_DESCRIPTOR.set !== undefined) {
  throw new TypeError('Arena Session无法捕获原生Promise[Symbol.species]访问器。');
}
const NATIVE_PROMISE_SPECIES_GETTER = CAPTURED_PROMISE_SPECIES_DESCRIPTOR.get;
const NATIVE_PROMISE_SPECIES_FLAGS = Object.freeze({
  configurable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.configurable,
  enumerable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.enumerable,
});
const NOOP = (): void => {};

function assertNativePromiseThenIntegrity(): void {
  const descriptor = Object.getOwnPropertyDescriptor(NATIVE_PROMISE_PROTOTYPE, 'then');
  if (descriptor === undefined
    || !Object.hasOwn(descriptor, 'value')
    || descriptor.value !== NATIVE_PROMISE_THEN
    || descriptor.configurable !== NATIVE_PROMISE_THEN_FLAGS.configurable
    || descriptor.enumerable !== NATIVE_PROMISE_THEN_FLAGS.enumerable
    || descriptor.writable !== NATIVE_PROMISE_THEN_FLAGS.writable) {
    throw new TypeError('Arena Session原生Promise.prototype.then描述符漂移。');
  }
}

function assertNativePromiseSpeciesIntegrity(): void {
  const descriptor = Object.getOwnPropertyDescriptor(
    NATIVE_PROMISE_CONSTRUCTOR,
    Symbol.species,
  );
  if (descriptor === undefined
    || descriptor.get !== NATIVE_PROMISE_SPECIES_GETTER
    || descriptor.set !== undefined
    || descriptor.configurable !== NATIVE_PROMISE_SPECIES_FLAGS.configurable
    || descriptor.enumerable !== NATIVE_PROMISE_SPECIES_FLAGS.enumerable) {
    throw new TypeError('Arena Session原生Promise[Symbol.species]描述符漂移。');
  }
}

interface SynchronousValueDescriptors {
  readonly thenDescriptor: PropertyDescriptor | null;
  readonly constructorDescriptor: PropertyDescriptor | null;
}

function inspectSynchronousValueDescriptors(
  value: object,
  contractName: string,
): SynchronousValueDescriptors {
  const visited = new Set<object>();
  let cursor: object | null = value;
  let thenDescriptor: PropertyDescriptor | null = null;
  let constructorDescriptor: PropertyDescriptor | null = null;
  for (
    let depth = 0;
    cursor !== null && depth < MAX_SYNC_DESCRIPTOR_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(cursor)) {
      throw new TypeError(`${contractName}返回值原型链不能循环。`);
    }
    visited.add(cursor);
    thenDescriptor ??= Object.getOwnPropertyDescriptor(cursor, 'then') ?? null;
    constructorDescriptor ??=
      Object.getOwnPropertyDescriptor(cursor, 'constructor') ?? null;
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  if (cursor !== null) {
    throw new RangeError(
      `${contractName}返回值原型链超过${MAX_SYNC_DESCRIPTOR_PROTOTYPE_DEPTH}层。`,
    );
  }
  return Object.freeze({ thenDescriptor, constructorDescriptor });
}

export function captureSynchronousDataMethod(
  target: unknown,
  methodName: string,
  ownerName: string,
): SynchronousPortMethod {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${ownerName}.${methodName}()不存在。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  for (
    let depth = 0;
    cursor !== null && depth < MAX_SYNC_DESCRIPTOR_PROTOTYPE_DEPTH;
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
      const method = descriptor.value as SynchronousPortMethod;
      return (...arguments_: readonly unknown[]) => Reflect.apply(method, target, arguments_);
    }
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  if (cursor !== null) {
    throw new RangeError(`${ownerName}原型链超过${MAX_SYNC_DESCRIPTOR_PROTOTYPE_DEPTH}层。`);
  }
  throw new TypeError(`${ownerName}.${methodName}()不存在。`);
}

export function captureOptionalSynchronousDataMethod(
  target: unknown,
  methodName: string,
  ownerName: string,
): SynchronousPortMethod | null {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${ownerName}.${methodName}()宿主无效。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  for (
    let depth = 0;
    cursor !== null && depth < MAX_SYNC_DESCRIPTOR_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(cursor)) throw new TypeError(`${ownerName}原型链不能循环。`);
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, methodName);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${ownerName}.${methodName}必须是数据方法。`);
      }
      const captured = descriptor.value as SynchronousPortMethod;
      return (...arguments_: readonly unknown[]) => Reflect.apply(captured, target, arguments_);
    }
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  if (cursor !== null) {
    throw new RangeError(`${ownerName}原型链超过${MAX_SYNC_DESCRIPTOR_PROTOTYPE_DEPTH}层。`);
  }
  return null;
}

export function assertSynchronousPortResult<T>(value: T, contractName: string): T {
  assertNativePromiseThenIntegrity();
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    return value;
  }
  const descriptors = inspectSynchronousValueDescriptors(value as object, contractName);
  const constructorDescriptor = descriptors.constructorDescriptor;
  if (constructorDescriptor !== null && !Object.hasOwn(constructorDescriptor, 'value')) {
    throw new TypeError(`${contractName}返回访问器constructor。`);
  }

  if (constructorDescriptor?.value === NATIVE_PROMISE_CONSTRUCTOR) {
    assertNativePromiseSpeciesIntegrity();
    try {
      Reflect.apply(NATIVE_PROMISE_THEN, value, [NOOP, NOOP]);
      throw new TypeError(`${contractName}必须同步完成。`);
    } catch (error) {
      if (error instanceof TypeError && error.message === `${contractName}必须同步完成。`) {
        throw error;
      }
      // A plain object may spoof constructor: Promise. Native brand failure is
      // contained and ordinary thenable inspection below remains descriptor-only.
    }
  }

  const thenDescriptor = descriptors.thenDescriptor;
  if (thenDescriptor === null) return value;
  if (!Object.hasOwn(thenDescriptor, 'value')) {
    throw new TypeError(`${contractName}返回访问器thenable。`);
  }
  throw new TypeError(`${contractName}返回then字段，必须同步完成。`);
}
