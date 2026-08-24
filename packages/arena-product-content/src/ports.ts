import {
  assertKnownKeys,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import type { PlayerProfile } from '@number-strategy-jump/arena-profile-contracts';
import type { FrozenMatchContentPool } from './frozen-match-content-pool.js';

type AnyMethod = (...arguments_: never[]) => unknown;
const MAX_PORT_PROTOTYPE_DEPTH = 32;
const NATIVE_PROMISE_PROTOTYPE = Promise.prototype;
const NATIVE_PROMISE_CONSTRUCTOR = Promise;
const CAPTURED_PROMISE_THEN_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  NATIVE_PROMISE_PROTOTYPE,
  'then',
);
if (CAPTURED_PROMISE_THEN_DESCRIPTOR === undefined
  || !Object.hasOwn(CAPTURED_PROMISE_THEN_DESCRIPTOR, 'value')
  || typeof CAPTURED_PROMISE_THEN_DESCRIPTOR.value !== 'function') {
  throw new TypeError('ProductContent无法捕获原生Promise.prototype.then。');
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
  throw new TypeError('ProductContent无法捕获原生Promise[Symbol.species]。');
}
const NATIVE_PROMISE_SPECIES_GETTER = CAPTURED_PROMISE_SPECIES_DESCRIPTOR.get;
const NATIVE_PROMISE_SPECIES_FLAGS = Object.freeze({
  configurable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.configurable,
  enumerable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.enumerable,
});
const NOOP = (): void => {};

export interface ProfileSnapshotPort {
  getSnapshot(): PlayerProfile;
}

export interface ContentPoolResolverPort {
  resolve(options: Readonly<{ profile: PlayerProfile; matchSeed: number }>): FrozenMatchContentPool;
}

export function readOwnDataField(
  record: object,
  key: string,
  label: string,
  optional = false,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined && optional) return undefined;
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${label}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

export function normalizeExactOptions(
  value: unknown,
  keys: ReadonlySet<string>,
  label: string,
): object {
  assertKnownKeys(value, keys, label);
  return assertPlainRecord(value, label);
}

export function snapshotMethod<T extends AnyMethod>(
  value: unknown,
  methodName: string,
  ownerName: string,
): T {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError(`ProfileContentPoolProvider 需要 ${ownerName}。`);
  }
  const visited = new Set<object>();
  let current: object | null = value as object;
  for (
    let depth = 0;
    current !== null && depth < MAX_PORT_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(current)) throw new TypeError(`${ownerName} 原型链不能循环。`);
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, methodName);
    if (descriptor) {
      if (!('value' in descriptor) || typeof descriptor.value !== 'function') {
        throw new TypeError(`${ownerName}.${methodName} 必须是数据方法。`);
      }
      return descriptor.value.bind(value) as T;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  if (current !== null) {
    throw new RangeError(`${ownerName} 原型链超过${MAX_PORT_PROTOTYPE_DEPTH}层。`);
  }
  throw new TypeError(`${ownerName} 缺少 ${methodName}()。`);
}

export function rejectAsyncSyncReturn(value: unknown, label: string): void {
  const thenIntegrity = Object.getOwnPropertyDescriptor(NATIVE_PROMISE_PROTOTYPE, 'then');
  if (thenIntegrity === undefined
    || !Object.hasOwn(thenIntegrity, 'value')
    || thenIntegrity.value !== NATIVE_PROMISE_THEN
    || thenIntegrity.configurable !== NATIVE_PROMISE_THEN_FLAGS.configurable
    || thenIntegrity.enumerable !== NATIVE_PROMISE_THEN_FLAGS.enumerable
    || thenIntegrity.writable !== NATIVE_PROMISE_THEN_FLAGS.writable) {
    throw new TypeError('ProductContent原生Promise.prototype.then描述符漂移。');
  }
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return;
  const visited = new Set<object>();
  let current: object | null = value as object;
  let thenDescriptor: PropertyDescriptor | null = null;
  let constructorDescriptor: PropertyDescriptor | null = null;
  for (
    let depth = 0;
    current !== null && depth < MAX_PORT_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(current)) throw new TypeError(`${label} 返回值原型链不能循环。`);
    visited.add(current);
    thenDescriptor ??= Object.getOwnPropertyDescriptor(current, 'then') ?? null;
    constructorDescriptor ??=
      Object.getOwnPropertyDescriptor(current, 'constructor') ?? null;
    current = Object.getPrototypeOf(current) as object | null;
  }
  if (current !== null) {
    throw new RangeError(`${label} 返回值原型链超过${MAX_PORT_PROTOTYPE_DEPTH}层。`);
  }
  if (constructorDescriptor !== null && !Object.hasOwn(constructorDescriptor, 'value')) {
    throw new TypeError(`${label} 返回了访问器 constructor。`);
  }
  if (constructorDescriptor?.value === NATIVE_PROMISE_CONSTRUCTOR) {
    const species = Object.getOwnPropertyDescriptor(NATIVE_PROMISE_CONSTRUCTOR, Symbol.species);
    if (species === undefined
      || species.get !== NATIVE_PROMISE_SPECIES_GETTER
      || species.set !== undefined
      || species.configurable !== NATIVE_PROMISE_SPECIES_FLAGS.configurable
      || species.enumerable !== NATIVE_PROMISE_SPECIES_FLAGS.enumerable) {
      throw new TypeError('ProductContent原生Promise[Symbol.species]描述符漂移。');
    }
    let nativePromise = false;
    try {
      Reflect.apply(NATIVE_PROMISE_THEN, value, [NOOP, NOOP]);
      nativePromise = true;
    } catch {
      // Spoofed constructors stay on the ordinary descriptor-only path.
    }
    if (nativePromise) throw new TypeError(`${label} 必须同步完成。`);
  }
  if (thenDescriptor === null) return;
  if (!Object.hasOwn(thenDescriptor, 'value')) {
    throw new TypeError(`${label} 返回了访问器 thenable。`);
  }
  throw new TypeError(`${label} 返回了 then 字段，必须同步完成。`);
}
