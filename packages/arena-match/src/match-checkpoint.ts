import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  combineCleanupFailure,
  createDeterministicDataHash,
  normalizeInputFrames,
  normalizeThrownError,
  type ArenaInputFrame,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_MATCH_PHASE,
  type ArenaMatchConfigOverrides,
  type ArenaMatchPhase,
} from './match-config.js';
import {
  MatchCore,
  type ArenaAuthorityEvent,
} from './match-core.js';

export const ARENA_INTERNAL_MATCH_CHECKPOINT_SCHEMA_VERSION = 1 as const;

const CHECKPOINT_KEYS = new Set([
  'checkpointSchemaVersion',
  'matchSchemaVersion',
  'physicsBackendVersion',
  'configHash',
  'ruleContentHash',
  'matchSeed',
  'config',
  'tick',
  'phase',
  'eventSequence',
  'inputFrames',
  'events',
  'stateHash',
]);
const RESTORE_OPTION_KEYS = new Set(['coreFactory']);
const HASH_PATTERN = /^[0-9a-f]{8}$/;
const PHASES = new Set<unknown>(Object.values(ARENA_MATCH_PHASE));
const MAX_SYNC_DESCRIPTOR_PROTOTYPE_DEPTH = 32;
const NATIVE_PROMISE_PROTOTYPE = Promise.prototype;
const NATIVE_PROMISE_CONSTRUCTOR = Promise;
const CAPTURED_PROMISE_THEN_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  NATIVE_PROMISE_PROTOTYPE,
  'then',
);
if (CAPTURED_PROMISE_THEN_DESCRIPTOR === undefined
  || !Object.prototype.hasOwnProperty.call(CAPTURED_PROMISE_THEN_DESCRIPTOR, 'value')
  || typeof CAPTURED_PROMISE_THEN_DESCRIPTOR.value !== 'function') {
  throw new TypeError('checkpoint 无法捕获原生 Promise.prototype.then 数据方法。');
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
  throw new TypeError('checkpoint 无法捕获原生 Promise[Symbol.species] 访问器。');
}
const NATIVE_PROMISE_SPECIES_GETTER = CAPTURED_PROMISE_SPECIES_DESCRIPTOR.get;
const NATIVE_PROMISE_SPECIES_FLAGS = Object.freeze({
  configurable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.configurable,
  enumerable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.enumerable,
});
const NOOP = (): void => {};

export interface ArenaInternalMatchCheckpoint {
  readonly checkpointSchemaVersion: typeof ARENA_INTERNAL_MATCH_CHECKPOINT_SCHEMA_VERSION;
  readonly matchSchemaVersion: number;
  readonly physicsBackendVersion: string;
  readonly configHash: string;
  readonly ruleContentHash: string;
  readonly matchSeed: number;
  readonly config: DeepReadonly<ArenaMatchConfigOverrides>;
  readonly tick: number;
  readonly phase: ArenaMatchPhase;
  readonly eventSequence: number;
  readonly inputFrames: readonly ArenaInputFrame[];
  readonly events: readonly ArenaAuthorityEvent[];
  readonly stateHash: string;
}

export interface InternalCheckpointCoreFactoryOptions {
  readonly seed: number;
  readonly config: DeepReadonly<ArenaMatchConfigOverrides>;
}

export type InternalCheckpointCoreFactory = (
  options: InternalCheckpointCoreFactoryOptions,
) => unknown;

export interface RestoreMatchCoreFromCheckpointOptions {
  readonly coreFactory: InternalCheckpointCoreFactory;
}

function hash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是 8 位小写十六进制 hash。`);
  }
  return value;
}

function uint32(value: unknown, name: string): number {
  const result = assertIntegerAtLeast(value, 0, name);
  if (result > 0xffffffff) throw new RangeError(`${name} 必须是 uint32。`);
  return result;
}

function validateEventPrefix(
  events: unknown,
  matchSeed: number,
  checkpointTick: number,
  eventSequence: number,
): readonly ArenaAuthorityEvent[] {
  if (!Array.isArray(events)) throw new TypeError('checkpoint.events 必须是数组。');
  if (events.length !== eventSequence) {
    throw new RangeError('checkpoint eventSequence 与 events 长度不一致。');
  }
  for (let index = 0; index < events.length; index += 1) {
    const event = assertPlainRecord(events[index], `checkpoint.events[${index}]`);
    const sequence = assertIntegerAtLeast(
      event.sequence,
      0,
      `checkpoint.events[${index}].sequence`,
    );
    const tick = assertIntegerAtLeast(event.tick, 0, `checkpoint.events[${index}].tick`);
    const type = assertNonEmptyString(event.type, `checkpoint.events[${index}].type`);
    const id = assertNonEmptyString(event.id, `checkpoint.events[${index}].id`);
    if (sequence !== index) throw new RangeError('checkpoint event sequence 必须从 0 连续递增。');
    if (checkpointTick === 0 || tick >= checkpointTick) {
      throw new RangeError('checkpoint 不能包含当前或未来 tick 事件。');
    }
    if (id !== `${matchSeed.toString(16)}:${tick}:${sequence}`) {
      throw new RangeError(`checkpoint event ${sequence} 稳定身份不一致。`);
    }
    void type;
  }
  createDeterministicDataHash(events, 'checkpoint events');
  return events as readonly ArenaAuthorityEvent[];
}

export function validateArenaInternalMatchCheckpoint(
  value: unknown,
): ArenaInternalMatchCheckpoint {
  const source = cloneFrozenData(value, 'ArenaInternalMatchCheckpoint');
  assertKnownKeys(source, CHECKPOINT_KEYS, 'ArenaInternalMatchCheckpoint');
  if (source.checkpointSchemaVersion !== ARENA_INTERNAL_MATCH_CHECKPOINT_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 internal checkpoint schema ${String(source.checkpointSchemaVersion)}；`
      + `当前仅支持 ${ARENA_INTERNAL_MATCH_CHECKPOINT_SCHEMA_VERSION}。`,
    );
  }
  const matchSchemaVersion = assertIntegerAtLeast(
    source.matchSchemaVersion,
    1,
    'checkpoint.matchSchemaVersion',
  );
  const physicsBackendVersion = assertNonEmptyString(
    source.physicsBackendVersion,
    'checkpoint.physicsBackendVersion',
  );
  const configHash = hash(source.configHash, 'checkpoint.configHash');
  const ruleContentHash = hash(source.ruleContentHash, 'checkpoint.ruleContentHash');
  const matchSeed = uint32(source.matchSeed, 'checkpoint.matchSeed');
  const config = assertPlainRecord(source.config, 'checkpoint.config');
  const tick = assertIntegerAtLeast(source.tick, 0, 'checkpoint.tick');
  if (!PHASES.has(source.phase)) {
    throw new RangeError(`checkpoint.phase 不受支持：${String(source.phase)}。`);
  }
  const phase = source.phase as ArenaMatchPhase;
  const eventSequence = assertIntegerAtLeast(
    source.eventSequence,
    0,
    'checkpoint.eventSequence',
  );
  if (!Array.isArray(source.inputFrames)) {
    throw new TypeError('checkpoint.inputFrames 必须是数组。');
  }
  createDeterministicDataHash(source.inputFrames, 'checkpoint input frames');
  const events = validateEventPrefix(source.events, matchSeed, tick, eventSequence);
  const stateHash = hash(source.stateHash, 'checkpoint.stateHash');
  return Object.freeze({
    checkpointSchemaVersion: ARENA_INTERNAL_MATCH_CHECKPOINT_SCHEMA_VERSION,
    matchSchemaVersion,
    physicsBackendVersion,
    configHash,
    ruleContentHash,
    matchSeed,
    config: config as DeepReadonly<ArenaMatchConfigOverrides>,
    tick,
    phase,
    eventSequence,
    inputFrames: source.inputFrames as readonly ArenaInputFrame[],
    events,
    stateHash,
  });
}

export function createArenaInternalMatchCheckpoint(
  value: unknown,
): ArenaInternalMatchCheckpoint {
  return validateArenaInternalMatchCheckpoint(value);
}

function parseRestoreOptions(value: unknown): RestoreMatchCoreFromCheckpointOptions {
  const source = value === undefined ? {} : value;
  assertKnownKeys(source, RESTORE_OPTION_KEYS, 'restore checkpoint options');
  const descriptor = source && (typeof source === 'object' || typeof source === 'function')
    ? Object.getOwnPropertyDescriptor(source, 'coreFactory')
    : undefined;
  const coreFactory = descriptor && Object.hasOwn(descriptor, 'value')
    ? descriptor.value
    : undefined;
  if (typeof coreFactory !== 'function') {
    throw new TypeError('restore checkpoint coreFactory 必须是函数。');
  }
  return Object.freeze({ coreFactory: coreFactory as InternalCheckpointCoreFactory });
}

function assertNativePromiseThenIntegrity(): void {
  const descriptor = Object.getOwnPropertyDescriptor(NATIVE_PROMISE_PROTOTYPE, 'then');
  if (descriptor === undefined
    || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    || descriptor.value !== NATIVE_PROMISE_THEN
    || descriptor.configurable !== NATIVE_PROMISE_THEN_FLAGS.configurable
    || descriptor.enumerable !== NATIVE_PROMISE_THEN_FLAGS.enumerable
    || descriptor.writable !== NATIVE_PROMISE_THEN_FLAGS.writable) {
    throw new TypeError('checkpoint 原生 Promise.prototype.then 描述符漂移。');
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
    throw new TypeError('checkpoint 原生 Promise[Symbol.species] 描述符漂移。');
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
  let target: object | null = value;
  let thenDescriptor: PropertyDescriptor | null = null;
  let constructorDescriptor: PropertyDescriptor | null = null;
  for (
    let depth = 0;
    target !== null && depth < MAX_SYNC_DESCRIPTOR_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(target)) throw new TypeError(`${contractName} prototype 链不能循环。`);
    visited.add(target);
    thenDescriptor ??= Object.getOwnPropertyDescriptor(target, 'then') ?? null;
    constructorDescriptor ??=
      Object.getOwnPropertyDescriptor(target, 'constructor') ?? null;
    target = Object.getPrototypeOf(target) as object | null;
  }
  if (target !== null) {
    throw new RangeError(
      `${contractName} prototype 链超过 ${MAX_SYNC_DESCRIPTOR_PROTOTYPE_DEPTH} 层。`,
    );
  }
  return Object.freeze({ thenDescriptor, constructorDescriptor });
}

function rejectAsynchronousCleanupResult(value: unknown, contractName: string): void {
  assertNativePromiseThenIntegrity();
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return;
  const descriptors = inspectSynchronousValueDescriptors(
    value as object,
    `${contractName}返回值`,
  );
  const constructorDescriptor = descriptors.constructorDescriptor;
  if (constructorDescriptor !== null
    && !Object.prototype.hasOwnProperty.call(constructorDescriptor, 'value')) {
    throw new TypeError(`${contractName}返回访问器 constructor。`);
  }
  if (constructorDescriptor?.value === NATIVE_PROMISE_CONSTRUCTOR) {
    assertNativePromiseSpeciesIntegrity();
    let nativePromise = false;
    try {
      Reflect.apply(NATIVE_PROMISE_THEN, value, [NOOP, NOOP]);
      nativePromise = true;
    } catch {
      // A plain object may spoof constructor: Promise; native brand failure is
      // contained and ordinary thenable inspection remains descriptor-only.
    }
    if (nativePromise) throw new TypeError(`${contractName}必须同步完成。`);
  }
  const thenDescriptor = descriptors.thenDescriptor;
  if (thenDescriptor === null) return;
  if (!Object.prototype.hasOwnProperty.call(thenDescriptor, 'value')) {
    throw new TypeError(`${contractName}返回访问器 thenable。`);
  }
  throw new TypeError(`${contractName}返回then字段，必须同步完成。`);
}

function hasMatchCorePrototype(value: unknown, contractName: string): boolean {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return false;
  const visited = new Set<object>();
  let target: object | null = value as object;
  for (
    let depth = 0;
    target !== null && depth < MAX_SYNC_DESCRIPTOR_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (target === MatchCore.prototype) return true;
    if (visited.has(target)) throw new TypeError(`${contractName} prototype 链不能循环。`);
    visited.add(target);
    target = Object.getPrototypeOf(target) as object | null;
  }
  if (target !== null) {
    throw new RangeError(
      `${contractName} prototype 链超过 ${MAX_SYNC_DESCRIPTOR_PROTOTYPE_DEPTH} 层。`,
    );
  }
  return false;
}

function cleanupInvalidCandidate(value: unknown): void {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return;
  const visited = new Set<object>();
  let target: object | null = value as object;
  for (
    let depth = 0;
    target !== null && depth < MAX_SYNC_DESCRIPTOR_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(target)) {
      throw new TypeError('checkpoint 候选 Core 清理 prototype 链不能循环。');
    }
    visited.add(target);
    const descriptor = Object.getOwnPropertyDescriptor(target, 'destroy');
    if (descriptor !== undefined) {
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        throw new TypeError('checkpoint 候选 Core 清理.destroy必须是数据方法。');
      }
      if (typeof descriptor.value === 'function') {
        const cleanupResult = Reflect.apply(descriptor.value, value, []);
        rejectAsynchronousCleanupResult(
          cleanupResult,
          'checkpoint 候选 Core destroy',
        );
      }
      return;
    }
    target = Object.getPrototypeOf(target) as object | null;
  }
  if (target !== null) {
    throw new RangeError(
      `checkpoint 候选 Core 清理 prototype 链超过 ${MAX_SYNC_DESCRIPTOR_PROTOTYPE_DEPTH} 层。`,
    );
  }
}

function adoptCandidate(value: unknown): MatchCore {
  const cleanupErrors: Error[] = [];
  try {
    if (hasMatchCorePrototype(value, 'checkpoint 候选 Core')) return value as MatchCore;
  } catch (error) {
    cleanupErrors.push(normalizeThrownError(error, 'checkpoint 候选 Core 原型检查失败'));
    throw combineCleanupFailure(
      new TypeError('checkpoint coreFactory 必须返回 MatchCore。'),
      cleanupErrors,
      'checkpoint 候选 Core 无效且清理未完整完成。',
    );
  }
  try {
    cleanupInvalidCandidate(value);
  } catch (error) {
    cleanupErrors.push(normalizeThrownError(error, 'checkpoint 候选 Core 清理失败'));
  }
  throw combineCleanupFailure(
    new TypeError('checkpoint coreFactory 必须返回 MatchCore。'),
    cleanupErrors,
    'checkpoint 候选 Core 无效且清理未完整完成。',
  );
}

function assertMetadata(core: MatchCore, checkpoint: ArenaInternalMatchCheckpoint): void {
  const metadata = core.getReplayMetadata();
  if (metadata.schemaVersion !== checkpoint.matchSchemaVersion) {
    throw new RangeError('checkpoint match schema 与候选 Core 不一致。');
  }
  if (metadata.physicsBackendVersion !== checkpoint.physicsBackendVersion) {
    throw new RangeError('checkpoint physics backend 与候选 Core 不一致。');
  }
  if (metadata.configHash !== checkpoint.configHash) {
    throw new RangeError('checkpoint config hash 与候选 Core 不一致。');
  }
  if (metadata.ruleContentHash !== checkpoint.ruleContentHash) {
    throw new RangeError('checkpoint rule content hash 与候选 Core 不一致。');
  }
  if (metadata.matchSeed !== checkpoint.matchSeed) {
    throw new RangeError('checkpoint match seed 与候选 Core 不一致。');
  }
}

function replayPrefix(core: MatchCore, checkpoint: ArenaInternalMatchCheckpoint): ArenaAuthorityEvent[] {
  const replayedEvents: ArenaAuthorityEvent[] = [];
  let inputIndex = 0;
  for (let tick = 0; tick < checkpoint.tick; tick += 1) {
    if (core.tick !== tick || core.phase === ARENA_MATCH_PHASE.ENDED) {
      throw new RangeError(`checkpoint 候选 Core 在 tick ${tick} 提前终止或分叉。`);
    }
    const frameCount = core.config.participantIds.length;
    const values = checkpoint.inputFrames.slice(inputIndex, inputIndex + frameCount);
    if (values.length !== frameCount) {
      throw new RangeError(`checkpoint 在 tick ${tick} 缺少完整参与者输入。`);
    }
    const frames = normalizeInputFrames(values, {
      tick,
      participantIds: core.config.participantIds,
    });
    replayedEvents.push(...core.step(frames));
    inputIndex += frameCount;
  }
  if (inputIndex !== checkpoint.inputFrames.length) {
    throw new RangeError('checkpoint 包含超出 tick 游标的输入。');
  }
  return replayedEvents;
}

export function restoreMatchCoreFromCheckpoint(
  checkpointValue: unknown,
  optionsValue: unknown,
): MatchCore {
  const checkpoint = validateArenaInternalMatchCheckpoint(checkpointValue);
  const { coreFactory } = parseRestoreOptions(optionsValue);
  const core = adoptCandidate(coreFactory({
    seed: checkpoint.matchSeed,
    config: checkpoint.config,
  }));
  let failure: Error | null = null;
  try {
    assertMetadata(core, checkpoint);
    const replayedEvents = replayPrefix(core, checkpoint);
    const identity = core.getInternalCheckpointIdentity();
    if (
      identity.tick !== checkpoint.tick
      || identity.phase !== checkpoint.phase
      || identity.eventSequence !== checkpoint.eventSequence
    ) throw new RangeError('checkpoint 权威游标与恢复候选不一致。');
    if (identity.stateHash !== checkpoint.stateHash) {
      throw new RangeError('checkpoint state hash 与恢复候选不一致。');
    }
    if (
      createDeterministicDataHash(replayedEvents, 'checkpoint replayed events')
      !== createDeterministicDataHash(checkpoint.events, 'checkpoint recorded events')
    ) throw new RangeError('checkpoint 事件前缀与恢复候选不一致。');
  } catch (error) {
    failure = normalizeThrownError(error, 'checkpoint 恢复失败');
  }
  if (failure === null) return core;
  const cleanupErrors: Error[] = [];
  try {
    core.destroy();
  } catch (error) {
    cleanupErrors.push(normalizeThrownError(error, 'checkpoint 候选 Core 清理失败'));
  }
  throw combineCleanupFailure(
    failure,
    cleanupErrors,
    'checkpoint 恢复失败且候选 Core 清理未完整完成。',
  );
}
