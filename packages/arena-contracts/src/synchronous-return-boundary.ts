type NativePromiseThen = (
  this: Promise<unknown>,
  onFulfilled?: ((value: unknown) => unknown) | null,
  onRejected?: ((reason: unknown) => unknown) | null,
) => Promise<unknown>;

const MAX_SYNCHRONOUS_RETURN_PROTOTYPE_DEPTH = 32;
const NATIVE_PROMISE_PROTOTYPE = Promise.prototype;
const NATIVE_PROMISE_CONSTRUCTOR = Promise;
const CAPTURED_PROMISE_THEN_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  NATIVE_PROMISE_PROTOTYPE,
  'then',
);
if (CAPTURED_PROMISE_THEN_DESCRIPTOR === undefined
  || !Object.hasOwn(CAPTURED_PROMISE_THEN_DESCRIPTOR, 'value')
  || typeof CAPTURED_PROMISE_THEN_DESCRIPTOR.value !== 'function') {
  throw new TypeError('Arena Contracts无法捕获原生Promise.prototype.then。');
}
const NATIVE_PROMISE_THEN = CAPTURED_PROMISE_THEN_DESCRIPTOR.value as NativePromiseThen;
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
  throw new TypeError('Arena Contracts无法捕获原生Promise[Symbol.species]。');
}
const NATIVE_PROMISE_SPECIES_GETTER = CAPTURED_PROMISE_SPECIES_DESCRIPTOR.get;
const NATIVE_PROMISE_SPECIES_FLAGS = Object.freeze({
  configurable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.configurable,
  enumerable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.enumerable,
});
const NATIVE_FUNCTION_TO_STRING = Function.prototype.toString;
const NATIVE_PROMISE_CONSTRUCTOR_SOURCE = Reflect.apply(
  NATIVE_FUNCTION_TO_STRING,
  NATIVE_PROMISE_CONSTRUCTOR,
  [],
);
const NATIVE_PROMISE_THEN_SOURCE = Reflect.apply(
  NATIVE_FUNCTION_TO_STRING,
  NATIVE_PROMISE_THEN,
  [],
);
const NATIVE_PROMISE_SPECIES_GETTER_SOURCE = Reflect.apply(
  NATIVE_FUNCTION_TO_STRING,
  NATIVE_PROMISE_SPECIES_GETTER,
  [],
);
const NOOP = (): void => {};

function assertNativePromiseIntegrity(): void {
  const descriptor = Object.getOwnPropertyDescriptor(NATIVE_PROMISE_PROTOTYPE, 'then');
  if (descriptor === undefined
    || !Object.hasOwn(descriptor, 'value')
    || descriptor.value !== NATIVE_PROMISE_THEN
    || descriptor.configurable !== NATIVE_PROMISE_THEN_FLAGS.configurable
    || descriptor.enumerable !== NATIVE_PROMISE_THEN_FLAGS.enumerable
    || descriptor.writable !== NATIVE_PROMISE_THEN_FLAGS.writable) {
    throw new TypeError('Arena Contracts原生Promise.prototype.then描述符漂移。');
  }
}

function assertNativePromiseSpeciesIntegrity(): void {
  const descriptor = Object.getOwnPropertyDescriptor(NATIVE_PROMISE_CONSTRUCTOR, Symbol.species);
  if (descriptor === undefined
    || descriptor.get !== NATIVE_PROMISE_SPECIES_GETTER
    || descriptor.set !== undefined
    || descriptor.configurable !== NATIVE_PROMISE_SPECIES_FLAGS.configurable
    || descriptor.enumerable !== NATIVE_PROMISE_SPECIES_FLAGS.enumerable) {
    throw new TypeError('Arena Contracts原生Promise[Symbol.species]描述符漂移。');
  }
}

function isRecognizedNativePromiseConstructor(value: unknown): boolean {
  if (value === NATIVE_PROMISE_CONSTRUCTOR) return true;
  if (typeof value !== 'function') return false;
  const species = Object.getOwnPropertyDescriptor(value, Symbol.species);
  if (species === undefined
    || typeof species.get !== 'function'
    || species.set !== undefined
    || species.configurable !== NATIVE_PROMISE_SPECIES_FLAGS.configurable
    || species.enumerable !== NATIVE_PROMISE_SPECIES_FLAGS.enumerable) {
    return false;
  }
  try {
    return Reflect.apply(NATIVE_FUNCTION_TO_STRING, value, []) === NATIVE_PROMISE_CONSTRUCTOR_SOURCE
      && Reflect.apply(NATIVE_FUNCTION_TO_STRING, species.get, [])
        === NATIVE_PROMISE_SPECIES_GETTER_SOURCE;
  } catch {
    return false;
  }
}

function findRecognizedNativePromiseThen(
  value: object,
  constructorValue: unknown,
): NativePromiseThen | null {
  if (!isRecognizedNativePromiseConstructor(constructorValue)) return null;
  const visited = new Set<object>();
  let cursor: object | null = value;
  for (
    let depth = 0;
    cursor !== null && depth < MAX_SYNCHRONOUS_RETURN_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(cursor)) return null;
    visited.add(cursor);
    const then = Object.getOwnPropertyDescriptor(cursor, 'then');
    const constructor = Object.getOwnPropertyDescriptor(cursor, 'constructor');
    const tag = Object.getOwnPropertyDescriptor(cursor, Symbol.toStringTag);
    if (then !== undefined
      && Object.hasOwn(then, 'value')
      && typeof then.value === 'function'
      && then.configurable === NATIVE_PROMISE_THEN_FLAGS.configurable
      && then.enumerable === NATIVE_PROMISE_THEN_FLAGS.enumerable
      && then.writable === NATIVE_PROMISE_THEN_FLAGS.writable
      && constructor !== undefined
      && Object.hasOwn(constructor, 'value')
      && constructor.value === constructorValue
      && tag !== undefined
      && Object.hasOwn(tag, 'value')
      && tag.value === 'Promise'
      && tag.configurable === true
      && tag.enumerable === false
      && tag.writable === false) {
      try {
        if (Reflect.apply(NATIVE_FUNCTION_TO_STRING, then.value, []) === NATIVE_PROMISE_THEN_SOURCE) {
          return then.value as NativePromiseThen;
        }
      } catch {
        return null;
      }
    }
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  return null;
}

/**
 * Rejects asynchronous or ambiguous values at a synchronous port boundary.
 * Prototype inspection is bounded and descriptor-only. Ordinary thenables and
 * accessors are never invoked; only an intact native Promise is observed to
 * contain a possible late rejection before the boundary rejects it. The
 * intrinsic brand probe is deliberately realm-agnostic, so a foreign native
 * Promise is contained too without ever reading its ordinary `then` field.
 */
export function assertSynchronousReturn(value: unknown, name: string): void {
  assertNativePromiseIntegrity();
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return;
  const visited = new Set<object>();
  let owner: object | null = value as object;
  let thenDescriptor: PropertyDescriptor | null = null;
  let constructorDescriptor: PropertyDescriptor | null = null;
  for (
    let depth = 0;
    owner !== null && depth < MAX_SYNCHRONOUS_RETURN_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(owner)) throw new TypeError(`${name}返回值原型链循环。`);
    visited.add(owner);
    thenDescriptor ??= Object.getOwnPropertyDescriptor(owner, 'then') ?? null;
    constructorDescriptor ??=
      Object.getOwnPropertyDescriptor(owner, 'constructor') ?? null;
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  if (owner !== null) {
    throw new RangeError(
      `${name}返回值原型链超过${MAX_SYNCHRONOUS_RETURN_PROTOTYPE_DEPTH}层。`,
    );
  }
  if (constructorDescriptor !== null && !Object.hasOwn(constructorDescriptor, 'value')) {
    throw new TypeError(`${name}返回访问器constructor。`);
  }
  // Promise internal slots are realm-independent. A foreign native Promise
  // must be observed before rejection, but subclasses are not probed: their
  // `then()` may execute a custom Symbol.species hook. The constructor check
  // remains descriptor-only and never reads an ordinary input property.
  const nativeThen = findRecognizedNativePromiseThen(
    value as object,
    constructorDescriptor?.value,
  );
  if (nativeThen !== null) {
    if (constructorDescriptor?.value === NATIVE_PROMISE_CONSTRUCTOR) {
      assertNativePromiseSpeciesIntegrity();
    }
    let nativePromise = false;
    try {
      Reflect.apply(nativeThen, value, [NOOP, NOOP]);
      nativePromise = true;
    } catch {
      // A spoofed constructor remains on the descriptor-only path below.
    }
    if (nativePromise) throw new TypeError(`${name}必须同步完成。`);
  }
  if (thenDescriptor === null) return;
  if (!Object.hasOwn(thenDescriptor, 'value')) {
    throw new TypeError(`${name}返回访问器thenable。`);
  }
  throw new TypeError(`${name}返回then字段，必须同步完成。`);
}

export const ARENA_SYNCHRONOUS_RETURN_BOUNDARY = Object.freeze({
  maximumPrototypeDepth: MAX_SYNCHRONOUS_RETURN_PROTOTYPE_DEPTH,
  descriptorOnlyOrdinaryThenableInspection: true as const,
  nativePromiseIntegrityRequiredBeforeObservation: true as const,
});
