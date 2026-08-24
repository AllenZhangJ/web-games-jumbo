export type SynchronousRewardPortMethod = (
  ...arguments_: readonly unknown[]
) => unknown;

const MAX_PROTOTYPE_DEPTH = 32;
const NATIVE_PROMISE_PROTOTYPE = Promise.prototype;
const NATIVE_PROMISE_CONSTRUCTOR = Promise;
const CAPTURED_THEN_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  NATIVE_PROMISE_PROTOTYPE,
  'then',
);
if (CAPTURED_THEN_DESCRIPTOR === undefined
  || !Object.hasOwn(CAPTURED_THEN_DESCRIPTOR, 'value')
  || typeof CAPTURED_THEN_DESCRIPTOR.value !== 'function') {
  throw new TypeError('RewardCommitter无法捕获原生Promise.prototype.then。');
}
const NATIVE_PROMISE_THEN = CAPTURED_THEN_DESCRIPTOR.value as (
  ...arguments_: unknown[]
) => unknown;
const NATIVE_PROMISE_THEN_FLAGS = Object.freeze({
  configurable: CAPTURED_THEN_DESCRIPTOR.configurable,
  enumerable: CAPTURED_THEN_DESCRIPTOR.enumerable,
  writable: CAPTURED_THEN_DESCRIPTOR.writable,
});
const CAPTURED_SPECIES_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  NATIVE_PROMISE_CONSTRUCTOR,
  Symbol.species,
);
if (CAPTURED_SPECIES_DESCRIPTOR === undefined
  || typeof CAPTURED_SPECIES_DESCRIPTOR.get !== 'function'
  || CAPTURED_SPECIES_DESCRIPTOR.set !== undefined) {
  throw new TypeError('RewardCommitter无法捕获原生Promise[Symbol.species]。');
}
const NATIVE_PROMISE_SPECIES_GETTER = CAPTURED_SPECIES_DESCRIPTOR.get;
const NATIVE_PROMISE_SPECIES_FLAGS = Object.freeze({
  configurable: CAPTURED_SPECIES_DESCRIPTOR.configurable,
  enumerable: CAPTURED_SPECIES_DESCRIPTOR.enumerable,
});
const NOOP = (): void => {};

function assertNativePromiseIntegrity(): void {
  const thenDescriptor = Object.getOwnPropertyDescriptor(NATIVE_PROMISE_PROTOTYPE, 'then');
  if (thenDescriptor === undefined
    || !Object.hasOwn(thenDescriptor, 'value')
    || thenDescriptor.value !== NATIVE_PROMISE_THEN
    || thenDescriptor.configurable !== NATIVE_PROMISE_THEN_FLAGS.configurable
    || thenDescriptor.enumerable !== NATIVE_PROMISE_THEN_FLAGS.enumerable
    || thenDescriptor.writable !== NATIVE_PROMISE_THEN_FLAGS.writable) {
    throw new TypeError('RewardCommitter原生Promise.prototype.then描述符漂移。');
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
    throw new TypeError('RewardCommitter原生Promise[Symbol.species]描述符漂移。');
  }
}

export function captureSynchronousRewardDataMethod(
  target: unknown,
  methodName: string,
  ownerName: string,
): SynchronousRewardPortMethod {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${ownerName}.${methodName}()不存在。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  for (let depth = 0; cursor !== null && depth < MAX_PROTOTYPE_DEPTH; depth += 1) {
    if (visited.has(cursor)) throw new TypeError(`${ownerName}原型链不能循环。`);
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, methodName);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${ownerName}.${methodName}必须是数据方法。`);
      }
      const method = descriptor.value as SynchronousRewardPortMethod;
      return (...arguments_: readonly unknown[]) => Reflect.apply(method, target, arguments_);
    }
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  if (cursor !== null) {
    throw new RangeError(`${ownerName}原型链超过${MAX_PROTOTYPE_DEPTH}层。`);
  }
  throw new TypeError(`${ownerName}.${methodName}()不存在。`);
}

export function assertSynchronousRewardPortResult<T>(value: T, label: string): T {
  assertNativePromiseIntegrity();
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return value;
  const visited = new Set<object>();
  let cursor: object | null = value as object;
  let thenDescriptor: PropertyDescriptor | null = null;
  let constructorDescriptor: PropertyDescriptor | null = null;
  for (let depth = 0; cursor !== null && depth < MAX_PROTOTYPE_DEPTH; depth += 1) {
    if (visited.has(cursor)) throw new TypeError(`${label}返回值原型链不能循环。`);
    visited.add(cursor);
    thenDescriptor ??= Object.getOwnPropertyDescriptor(cursor, 'then') ?? null;
    constructorDescriptor ??=
      Object.getOwnPropertyDescriptor(cursor, 'constructor') ?? null;
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  if (cursor !== null) {
    throw new RangeError(`${label}返回值原型链超过${MAX_PROTOTYPE_DEPTH}层。`);
  }
  if (constructorDescriptor !== null && !Object.hasOwn(constructorDescriptor, 'value')) {
    throw new TypeError(`${label}返回访问器constructor。`);
  }
  if (constructorDescriptor?.value === NATIVE_PROMISE_CONSTRUCTOR) {
    assertNativePromiseSpeciesIntegrity();
    let nativePromise = false;
    try {
      Reflect.apply(NATIVE_PROMISE_THEN, value, [NOOP, NOOP]);
      nativePromise = true;
    } catch {
      // Spoofed constructors stay on the descriptor-only path below.
    }
    if (nativePromise) throw new TypeError(`${label}必须同步完成。`);
  }
  if (thenDescriptor === null) return value;
  if (!Object.hasOwn(thenDescriptor, 'value')) {
    throw new TypeError(`${label}返回访问器thenable。`);
  }
  throw new TypeError(`${label}返回then字段，必须同步完成。`);
}
