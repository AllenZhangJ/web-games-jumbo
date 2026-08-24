import {
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn,
  isNormalizedInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  validateProductMatchResult,
} from '@number-strategy-jump/arena-product-contracts';
import type { ProductMatchResult } from '@number-strategy-jump/arena-product-contracts';
import type {
  DeepReadonly,
  MatchReadFrameV2,
} from '@number-strategy-jump/arena-contracts';

const READ_FRAME_KEYS = new Set(['schemaVersion', 'worldSnapshot', 'localActionSidecar']);
const READ_WORLD_KEYS = new Set([
  'authoritySchemaVersion', 'physicsBackendVersion', 'configHash', 'ruleContentHash', 'matchSeed',
  'tick', 'activeTick', 'phase', 'remainingTicks', 'eventSequence', 'participants', 'equipment',
  'activeSupplyProjection', 'map', 'result',
]);
const READ_LOCAL_KEYS = new Set([
  'schemaVersion', 'tick', 'eventSequence', 'participantId', 'profile',
  'primaryActionDefinitionId', 'channels',
]);
const READ_LOCAL_CHANNEL_KEYS = new Set(['primary', 'primaryHold']);
const READ_PHASES = new Set(['preparing', 'running', 'sudden-death', 'ended']);
const READ_PARTICIPANT_KEYS = new Set([
  'id', 'characterDefinitionId', 'status', 'lives', 'eliminations', 'deaths',
  'hitstunTicks', 'invulnerableTicks', 'respawnTicks', 'lastHitBy', 'lastHitTick',
  'action', 'actionRule', 'movement', 'equipment', 'position', 'velocity', 'facing',
  'grounded', 'supportSurfaceId',
]);
const READ_OUTCOME_KEYS = new Set(['kind', 'actionDefinitionId', 'lane', 'source', 'reason']);
const PRODUCT_RESULT_KEYS = new Set([
  'schemaVersion', 'matchSeed', 'authorityIdentity', 'authorityResult',
  'content', 'opponent', 'authorityHash',
]);

class MissingPortPropertyError extends TypeError {}

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
  throw new TypeError('ProductMatch无法捕获原生Promise.prototype.then数据方法。');
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
  throw new TypeError('ProductMatch无法捕获原生Promise[Symbol.species]访问器。');
}
const NATIVE_PROMISE_SPECIES_GETTER = CAPTURED_PROMISE_SPECIES_DESCRIPTOR.get;
const NATIVE_PROMISE_SPECIES_FLAGS = Object.freeze({
  configurable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.configurable,
  enumerable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.enumerable,
});
const NOOP = (): void => {};

export function readRequiredDataField(
  record: object,
  key: string,
  label: string,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${label}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

export function readOptionalDataField(
  record: object,
  key: string,
  label: string,
  fallback?: unknown,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined) return fallback;
  if (!descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${label}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

export function requireRecord(value: unknown, label: string): Record<string, unknown> {
  return assertPlainRecord(value, label);
}

function readFrozenDataField(record: object, key: string, label: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${label}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function requireFrozenDataKeys(record: object, keys: ReadonlySet<string>, label: string): void {
  for (const key of keys) readFrozenDataField(record, key, label);
}

function requireFrozenRecord(value: unknown, label: string): Record<string, unknown> {
  const record = assertPlainRecord(value, label);
  if (!Object.isFrozen(record)) throw new TypeError(`${label} 必须是冻结对象。`);
  return record;
}

function assertFrozenPlainTree(value: unknown, label: string, seen = new WeakSet<object>()): void {
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) throw new TypeError(`${label} 不能包含循环引用。`);
  if (!Object.isFrozen(value)) throw new TypeError(`${label} 必须递归冻结。`);
  seen.add(value);
  try {
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== 'string')) {
      throw new TypeError(`${label} 不能包含 Symbol 字段。`);
    }
    const stringKeys = keys as string[];
    if (Array.isArray(value)) {
      const expected = new Set(['length']);
      for (let index = 0; index < value.length; index += 1) expected.add(String(index));
      if (stringKeys.some((key) => !expected.has(key))) throw new TypeError(`${label} 数组不能包含额外字段。`);
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
          throw new TypeError(`${label}[${index}] 必须是冻结数据字段。`);
        }
        assertFrozenPlainTree(descriptor.value, `${label}[${index}]`, seen);
      }
      return;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${label} 必须是普通对象。`);
    }
    for (const key of stringKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
        throw new TypeError(`${label}.${key} 必须是冻结数据字段。`);
      }
      assertFrozenPlainTree(descriptor.value, `${label}.${key}`, seen);
    }
  } finally {
    seen.delete(value);
  }
}

export function assertProductMatchResult(
  value: unknown,
  expectedMatchSeed?: number,
  label = 'ProductMatchResult',
): ProductMatchResult {
  const result = requireFrozenRecord(value, label);
  assertKnownKeys(result, PRODUCT_RESULT_KEYS, label);
  requireFrozenDataKeys(result, PRODUCT_RESULT_KEYS, label);
  assertFrozenPlainTree(result, label);
  validateProductMatchResult(result);
  if (expectedMatchSeed !== undefined && readFrozenDataField(result, 'matchSeed', label) !== expectedMatchSeed) {
    throw new Error(`${label} 与当前 ProductMatch matchSeed 不一致。`);
  }
  return result as unknown as ProductMatchResult;
}

/**
 * Product V2 is a trusted read-only consumer boundary.  It deliberately does
 * not call the PA2a audit/normalizer or clone the frame: Session owns the
 * frozen object and the product layer preserves its identity for memo hits.
 */
export function assertProductMatchReadFrameV2(
  value: unknown,
  expectedMatchSeed?: number,
): DeepReadonly<MatchReadFrameV2> {
  const frame = requireFrozenRecord(value, 'ProductMatch MatchReadFrameV2');
  assertKnownKeys(frame, READ_FRAME_KEYS, 'ProductMatch MatchReadFrameV2');
  requireFrozenDataKeys(frame, READ_FRAME_KEYS, 'ProductMatch MatchReadFrameV2');
  const frameSchema = readFrozenDataField(frame, 'schemaVersion', 'ProductMatch MatchReadFrameV2');
  if (frameSchema !== 2) throw new RangeError('ProductMatch MatchReadFrameV2.schemaVersion 必须是 2。');

  const world = requireFrozenRecord(
    readFrozenDataField(frame, 'worldSnapshot', 'ProductMatch MatchReadFrameV2'),
    'ProductMatch WorldSnapshotV2',
  );
  assertKnownKeys(world, READ_WORLD_KEYS, 'ProductMatch WorldSnapshotV2');
  requireFrozenDataKeys(world, READ_WORLD_KEYS, 'ProductMatch WorldSnapshotV2');
  const worldTick = readFrozenDataField(world, 'tick', 'ProductMatch WorldSnapshotV2');
  const worldEventSequence = readFrozenDataField(world, 'eventSequence', 'ProductMatch WorldSnapshotV2');
  const worldPhase = readFrozenDataField(world, 'phase', 'ProductMatch WorldSnapshotV2');
  const worldMatchSeed = readFrozenDataField(world, 'matchSeed', 'ProductMatch WorldSnapshotV2');
  if (!Number.isSafeInteger(worldTick) || (worldTick as number) < 0) {
    throw new RangeError('ProductMatch WorldSnapshotV2.tick 必须是非负安全整数。');
  }
  if (!Number.isSafeInteger(worldEventSequence) || (worldEventSequence as number) < 0) {
    throw new RangeError('ProductMatch WorldSnapshotV2.eventSequence 必须是非负安全整数。');
  }
  if (typeof worldPhase !== 'string' || !READ_PHASES.has(worldPhase)) {
    throw new RangeError('ProductMatch WorldSnapshotV2.phase 无效。');
  }
  if (expectedMatchSeed !== undefined && worldMatchSeed !== expectedMatchSeed) {
    throw new Error('ProductMatch V2 frame 与当前 ProductMatch matchSeed 不一致。');
  }
  const participants = readFrozenDataField(world, 'participants', 'ProductMatch WorldSnapshotV2');
  if (!Array.isArray(participants) || !Object.isFrozen(participants)) {
    throw new TypeError('ProductMatch WorldSnapshotV2.participants 必须是冻结数组。');
  }
  const participantIds = new Set<string>();
  for (const participant of participants) {
    const participantRecord = requireFrozenRecord(participant, 'ProductMatch WorldSnapshotV2 participant');
    assertKnownKeys(participantRecord, READ_PARTICIPANT_KEYS, 'ProductMatch participant');
    requireFrozenDataKeys(participantRecord, READ_PARTICIPANT_KEYS, 'ProductMatch participant');
    const participantId = readFrozenDataField(participantRecord, 'id', 'ProductMatch participant');
    if (typeof participantId !== 'string' || participantId.length === 0) {
      throw new TypeError('ProductMatch participant.id 必须是非空字符串。');
    }
    if (participantIds.has(participantId)) throw new RangeError(`ProductMatch participant ${participantId} 重复。`);
    participantIds.add(participantId);
  }

  const local = requireFrozenRecord(
    readFrozenDataField(frame, 'localActionSidecar', 'ProductMatch MatchReadFrameV2'),
    'ProductMatch LocalActionSidecarV2',
  );
  assertKnownKeys(local, READ_LOCAL_KEYS, 'ProductMatch LocalActionSidecarV2');
  requireFrozenDataKeys(local, READ_LOCAL_KEYS, 'ProductMatch LocalActionSidecarV2');
  const localSchema = readFrozenDataField(local, 'schemaVersion', 'ProductMatch LocalActionSidecarV2');
  const localTick = readFrozenDataField(local, 'tick', 'ProductMatch LocalActionSidecarV2');
  const localEventSequence = readFrozenDataField(local, 'eventSequence', 'ProductMatch LocalActionSidecarV2');
  const localParticipantId = readFrozenDataField(local, 'participantId', 'ProductMatch LocalActionSidecarV2');
  const localProfile = readFrozenDataField(local, 'profile', 'ProductMatch LocalActionSidecarV2');
  if (localSchema !== 2 || localTick !== worldTick || localEventSequence !== worldEventSequence) {
    throw new Error('ProductMatch V2 frame/world identity 不一致。');
  }
  if (localProfile !== 'local-context-primary') {
    throw new Error('ProductMatch V2 frame 必须携带 local-context-primary sidecar。');
  }
  if (typeof localParticipantId !== 'string' || !participantIds.has(localParticipantId)) {
    throw new Error('ProductMatch V2 local participant 身份无效。');
  }
  const channels = requireFrozenRecord(
    readFrozenDataField(local, 'channels', 'ProductMatch LocalActionSidecarV2'),
    'ProductMatch LocalActionSidecarV2.channels',
  );
  assertKnownKeys(channels, READ_LOCAL_CHANNEL_KEYS, 'ProductMatch LocalActionSidecarV2.channels');
  for (const key of READ_LOCAL_CHANNEL_KEYS) {
    const outcome = requireFrozenRecord(
      readFrozenDataField(channels, key, 'ProductMatch LocalActionSidecarV2.channels'),
      `ProductMatch ${key} outcome`,
    );
    assertKnownKeys(outcome, READ_OUTCOME_KEYS, `ProductMatch ${key} outcome`);
    requireFrozenDataKeys(outcome, READ_OUTCOME_KEYS, `ProductMatch ${key} outcome`);
    const kind = readFrozenDataField(outcome, 'kind', `ProductMatch ${key} outcome`);
    const reason = readFrozenDataField(outcome, 'reason', `ProductMatch ${key} outcome`);
    if (typeof kind !== 'string' || typeof reason !== 'string' || reason.length === 0) {
      throw new TypeError(`ProductMatch ${key} outcome kind/reason 无效。`);
    }
  }
  return value as DeepReadonly<MatchReadFrameV2>;
}

function assertFrozenOutcomeRecord(value: unknown, keys: ReadonlySet<string>, label: string): Record<string, unknown> {
  const record = requireFrozenRecord(value, label);
  assertKnownKeys(record, keys, label);
  requireFrozenDataKeys(record, keys, label);
  return record;
}

export function assertProductMatchReadFrameStartOutcome(
  value: unknown,
  expectedMatchSeed: number,
): { readonly readFrame: DeepReadonly<MatchReadFrameV2> } {
  const record = assertFrozenOutcomeRecord(
    value,
    new Set(['readFrame']),
    'ProductMatch V2 start outcome',
  );
  return Object.freeze({
    readFrame: assertProductMatchReadFrameV2(
      readFrozenDataField(record, 'readFrame', 'ProductMatch V2 start outcome'),
      expectedMatchSeed,
    ),
  });
}

export function assertProductMatchReadFrameStepOutcome(
  value: unknown,
  expectedMatchSeed: number,
): {
  readonly events: readonly unknown[];
  readonly readFrame: DeepReadonly<MatchReadFrameV2>;
  readonly input: object;
  readonly result: Readonly<Record<string, unknown>> | null;
} {
  const record = assertFrozenOutcomeRecord(
    value,
    new Set(['events', 'readFrame', 'input', 'result']),
    'ProductMatch V2 step outcome',
  );
  const events = readFrozenDataField(record, 'events', 'ProductMatch V2 step outcome');
  if (!Array.isArray(events) || !Object.isFrozen(events)) {
    throw new TypeError('ProductMatch V2 step events 必须是冻结数组。');
  }
  const readFrame = assertProductMatchReadFrameV2(
    readFrozenDataField(record, 'readFrame', 'ProductMatch V2 step outcome'),
    expectedMatchSeed,
  );
  const input = readFrozenDataField(record, 'input', 'ProductMatch V2 step outcome');
  if (!isNormalizedInputFrame(input)) {
    throw new TypeError('ProductMatch V2 step input 必须是 normalized InputFrame。');
  }
  const world = requireFrozenRecord(readFrozenDataField(readFrame, 'worldSnapshot', 'ProductMatch V2 step frame'), 'ProductMatch V2 step world');
  const local = requireFrozenRecord(readFrozenDataField(readFrame, 'localActionSidecar', 'ProductMatch V2 step frame'), 'ProductMatch V2 step local sidecar');
  if (
    readFrozenDataField(input, 'participantId', 'ProductMatch V2 step input')
      !== readFrozenDataField(local, 'participantId', 'ProductMatch V2 step local sidecar')
    || readFrozenDataField(input, 'tick', 'ProductMatch V2 step input')
      !== (readFrozenDataField(world, 'tick', 'ProductMatch V2 step world') as number) - 1
  ) {
    throw new Error('ProductMatch V2 step input 与 read frame identity 不一致。');
  }
  const result = readFrozenDataField(record, 'result', 'ProductMatch V2 step outcome');
  if (result !== null) {
    assertProductMatchResult(result, expectedMatchSeed, 'ProductMatch V2 step result');
  }
  return Object.freeze({
    events: events as readonly unknown[],
    readFrame,
    input,
    result: result as Readonly<Record<string, unknown>> | null,
  });
}

function findDescriptor(
  value: unknown,
  key: string,
  ownerName: string,
): Readonly<{ owner: object; descriptor: PropertyDescriptor }> {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError(`${ownerName}.${key} 不存在。`);
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
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) return Object.freeze({ owner: current, descriptor });
    current = Object.getPrototypeOf(current) as object | null;
  }
  if (current !== null) {
    throw new RangeError(`${ownerName} 原型链超过${MAX_PORT_PROTOTYPE_DEPTH}层。`);
  }
  throw new MissingPortPropertyError(`${ownerName}.${key} 不存在。`);
}

export function snapshotMethod<T>(
  value: unknown,
  methodName: string,
  ownerName: string,
): T {
  const { descriptor } = findDescriptor(value, methodName, ownerName);
  if (!('value' in descriptor) || typeof descriptor.value !== 'function') {
    throw new TypeError(`${ownerName}.${methodName} 必须是数据方法。`);
  }
  return descriptor.value.bind(value) as T;
}

export function snapshotOptionalMethod<T>(
  value: unknown,
  methodName: string,
  ownerName: string,
): T | null {
  try {
    return snapshotMethod<T>(value, methodName, ownerName);
  } catch (error) {
    if (error instanceof MissingPortPropertyError) return null;
    throw error;
  }
}

export function snapshotGetter<T>(
  value: unknown,
  propertyName: string,
  ownerName: string,
): () => T {
  const { descriptor } = findDescriptor(value, propertyName, ownerName);
  if (!('get' in descriptor) || typeof descriptor.get !== 'function' || descriptor.set) {
    throw new TypeError(`${ownerName}.${propertyName} 必须是只读 getter。`);
  }
  const getter = descriptor.get;
  return (): T => getter.call(value) as T;
}

interface SyncReturnDescriptors {
  readonly thenDescriptor: PropertyDescriptor | null;
  readonly constructorDescriptor: PropertyDescriptor | null;
}

function inspectSyncReturnDescriptors(value: object, label: string): SyncReturnDescriptors {
  let current: object | null = value;
  const visited = new Set<object>();
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
  return Object.freeze({ thenDescriptor, constructorDescriptor });
}

function assertNativePromiseThenIntegrity(): void {
  const descriptor = Object.getOwnPropertyDescriptor(NATIVE_PROMISE_PROTOTYPE, 'then');
  if (descriptor === undefined
    || !Object.hasOwn(descriptor, 'value')
    || descriptor.value !== NATIVE_PROMISE_THEN
    || descriptor.configurable !== NATIVE_PROMISE_THEN_FLAGS.configurable
    || descriptor.enumerable !== NATIVE_PROMISE_THEN_FLAGS.enumerable
    || descriptor.writable !== NATIVE_PROMISE_THEN_FLAGS.writable) {
    throw new TypeError('ProductMatch原生Promise.prototype.then描述符漂移。');
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
    throw new TypeError('ProductMatch原生Promise[Symbol.species]描述符漂移。');
  }
}

export function containRejectedAsyncReturn(value: unknown, label: string): void {
  assertSynchronousReturn(value, label);
}

export function resolveSyncOrNativePromise<T>(value: unknown, label: string): Promise<Readonly<{ value: T }>> {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    return Promise.resolve(Object.freeze({ value: value as T }));
  }

  try {
    Reflect.apply(NATIVE_PROMISE_THEN, value, [() => undefined, () => undefined]);
    return new Promise<Readonly<{ value: T }>>((resolve, reject) => {
      try {
        Reflect.apply(NATIVE_PROMISE_THEN, value, [
          (resolved: unknown) => resolve(Object.freeze({ value: resolved as T })),
          (rejected: unknown) => { reject(rejected); },
        ]);
      } catch (error) {
        reject(error);
      }
    });
  } catch {
    // Ordinary thenables are never invoked; inspect descriptors only.
  }

  let current: object | null = value as object;
  const visited = new Set<object>();
  let depth = 0;
  while (current !== null && depth < 32 && !visited.has(current)) {
    visited.add(current);
    depth += 1;
    const descriptor = Object.getOwnPropertyDescriptor(current, 'then');
    if (descriptor) {
      if (!('value' in descriptor)) throw new TypeError(`${label} 返回了访问器 thenable。`);
      if (typeof descriptor.value === 'function') throw new TypeError(`${label} 必须同步完成。`);
      return Promise.resolve(Object.freeze({ value: value as T }));
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  if (current !== null) throw new TypeError(`${label} 返回值原型链无效。`);
  return Promise.resolve(Object.freeze({ value: value as T }));
}
