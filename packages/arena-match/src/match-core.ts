import {
  ARENA_MATCH_PHASE,
  ARENA_PARTICIPANT_STATUS,
  type ArenaMatchConfig,
  type ArenaMatchConfigOverrides,
  type ArenaMatchPhase,
  createArenaMatchConfig,
} from './match-config.js';
import { MatchParticipantSystem } from './match-participant-system.js';
import {
  MatchTimelineSystem,
  type MatchActiveTickTransition,
  type MatchTimelineSnapshot,
} from './match-timeline-system.js';
import {
  createCharacterRuntimeReference,
  type CharacterRuntimeReference,
} from './character-runtime.js';
import {
  createArenaConfigHash,
  createMatchStateHash,
  ARENA_EQUIPMENT_SUPPLY_DISPOSITION_SCHEMA_VERSION,
  type ArenaInternalEquipmentSupplyTimelineSnapshot,
  type ArenaInternalMatchSnapshot,
} from './state-hash.js';
import {
  ARENA_MATCH_EVENT as EVENT,
  EQUIPMENT_DESPAWN_REASON,
  combineCleanupFailure,
  createDeterministicDataHash,
  createEquipmentExpiredEventPayload,
  createEquipmentRecycledEventPayload,
  createEquipmentReplacedEventPayload,
  createEquipmentSpawnedEventPayload,
  createRng,
  deriveSeed,
  isNormalizedInputFrame,
  normalizeInputFrames,
  normalizeThrownError,
  type ArenaInputFrame,
  type ArenaMatchReadProfile,
  type ArenaMatchSnapshot,
  type ArenaPublicSupplyProjection,
  type DeepReadonly,
  type DeterministicRng,
  type WorldSnapshotV2,
} from '@number-strategy-jump/arena-contracts';
import {
  assertPhysicsWorld,
  createCharacterPhysicsProfile,
  createLightweightPhysicsWorld,
  createMovementPhysicsPort,
  type PhysicsVector3,
  type PhysicsWorld,
} from '@number-strategy-jump/arena-physics';
import {
  assertArenaMapSystem,
  type ArenaMapSystemContract,
} from '@number-strategy-jump/arena-map';
import {
  assertArenaRuleEngine,
  type ActionCandidate,
  type ArenaRuleBatch,
  type ArenaRuleEngineContract,
  type RuleActor,
  type RuleEquipmentPosition,
} from '@number-strategy-jump/arena-core';
import {
  assertCharacterRegistry,
  type CharacterDefinition,
  type CharacterRegistryContract,
} from '@number-strategy-jump/arena-definitions';
import {
  createMovementCommand,
  MovementSystem,
  type MovementCapabilities,
  type MovementMutationPort,
} from '@number-strategy-jump/arena-movement';
import {
  createMatchReadBindingForOwner,
  createMatchReadOwnerPort,
  createMatchReadReaderForOwner,
  invalidateMatchReadOwner,
  type MatchReadBinding,
  type MatchReadOwnerPort,
  type MatchReadReader,
} from './match-read-port.js';
import {
  composeBotMobilitySidecarV2,
  composeFullAuditSidecarV2,
  composeLocalActionSidecarV2,
  composeMatchReadFrameV2,
  composeWorldSnapshotV2,
  type MatchReadFrameReader,
  type MatchReadModelBuildCandidate,
  type MatchReadModelIdentity,
  type MatchReadSidecarReader,
  type MatchReadWorldSource,
} from './match-read-frame.js';
import type {
  BotMobilitySidecarV2,
  FullAuditSidecarV2,
} from '@number-strategy-jump/arena-contracts';

// Equipment positions share the character-body coordinate convention so a
// dropped item and a configured spawn can use the same validation path. The
// tolerance covers the physics world's small ground-probe/snap offset without
// accepting unreachable items floating above or buried below a surface.
const EQUIPMENT_SURFACE_HEIGHT_TOLERANCE = 0.1;
const MAX_FACTORY_RESOURCE_PROTOTYPE_DEPTH = 32;
const NATIVE_PROMISE_PROTOTYPE = Promise.prototype;
const NATIVE_PROMISE_CONSTRUCTOR = Promise;
const CAPTURED_PROMISE_THEN_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  NATIVE_PROMISE_PROTOTYPE,
  'then',
);
if (CAPTURED_PROMISE_THEN_DESCRIPTOR === undefined
  || !Object.prototype.hasOwnProperty.call(CAPTURED_PROMISE_THEN_DESCRIPTOR, 'value')
  || typeof CAPTURED_PROMISE_THEN_DESCRIPTOR.value !== 'function') {
  throw new TypeError('MatchCore 无法捕获原生 Promise.prototype.then 数据方法。');
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
  throw new TypeError('MatchCore 无法捕获原生 Promise[Symbol.species] 访问器。');
}
const NATIVE_PROMISE_SPECIES_GETTER = CAPTURED_PROMISE_SPECIES_DESCRIPTOR.get;
const NATIVE_PROMISE_SPECIES_FLAGS = Object.freeze({
  configurable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.configurable,
  enumerable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.enumerable,
});
const NOOP = (): void => {};

type UnknownRecord = Readonly<Record<string, unknown>>;

export interface ArenaAuthorityEvent extends UnknownRecord {
  readonly id: string;
  readonly sequence: number;
  readonly tick: number;
  readonly type: string;
}

export interface MatchCoreFactoryContext {
  readonly participantIds: readonly string[];
  readonly config: ArenaMatchConfig;
}

export interface MatchCoreMapFactoryContext {
  readonly config: ArenaMatchConfig;
  readonly matchSeed: number;
  readonly equipmentDefinitionCatalog: Readonly<{
    require(definitionId: string): unknown;
  }>;
  readonly characterDefinitionCatalog: Readonly<{
    require(definitionId: string): CharacterDefinition;
  }>;
}

export interface MatchCoreEquipmentSupplyAuthority {
  applySupplyTimelinePhase(options: unknown): unknown;
  resolveSupplyPickups(options: unknown): unknown;
  getSnapshot(instanceId: string): unknown;
}

export interface MatchCoreEquipmentSupplyTimelineStepResult {
  readonly tick: number;
  readonly phaseOrder: readonly ['spawn', 'expire', 'pickup', 'action'];
  readonly spawnedEvents: readonly Readonly<{ readonly type: string; readonly payload: UnknownRecord }>[];
  readonly expiredEvents: readonly Readonly<{ readonly type: string; readonly payload: UnknownRecord }>[];
  readonly pickupDecisions: readonly Readonly<{
    readonly participantId: string;
    readonly equipmentInstanceId: string;
    readonly kind: 'picked-up' | 'replaced';
  }>[];
  readonly pickupEvents: readonly Readonly<{ readonly type: string; readonly payload: UnknownRecord }>[];
  readonly nextPhase: 'action';
}

export interface MatchCoreEquipmentSupplyTimelineContract {
  step(options: unknown): MatchCoreEquipmentSupplyTimelineStepResult;
  getSnapshot(): ArenaInternalEquipmentSupplyTimelineSnapshot;
  getPublicSupplyProjection(options: unknown): Readonly<{
    readonly projection: ArenaPublicSupplyProjection;
    readonly pendingExpiryEquipmentInstanceIds: readonly string[];
  }>;
  getContentHash(): string;
  destroy(): void;
}

export interface MatchCoreEquipmentSupplyTimelineFactoryContext {
  readonly participantIds: readonly string[];
  readonly config: ArenaMatchConfig;
  readonly matchSeed: number;
  readonly equipmentDefinitionCatalog: Readonly<{
    require(definitionId: string): unknown;
  }>;
  readonly equipmentAuthority: MatchCoreEquipmentSupplyAuthority;
  readonly isEquipmentPositionValid: (position: unknown) => boolean;
}

export interface MatchCoreOptions {
  readonly seed?: unknown;
  readonly config?: unknown;
  readonly physicsFactory?: (options: { readonly arena: ArenaMatchConfig['arena'] }) => unknown;
  readonly ruleEngineFactory?: (context: MatchCoreFactoryContext) => unknown;
  readonly mapSystemFactory?: (context: MatchCoreMapFactoryContext) => unknown;
  readonly characterRegistry?: unknown;
  readonly equipmentSupplyTimelineFactory?: (
    context: MatchCoreEquipmentSupplyTimelineFactoryContext
  ) => unknown;
}

export interface MatchReplayMetadata {
  readonly schemaVersion: ArenaMatchConfig['schemaVersion'];
  readonly physicsBackendVersion: ArenaMatchConfig['physicsBackendVersion'];
  readonly configHash: string;
  readonly ruleContentHash: string;
  readonly matchSeed: number;
  readonly config: ArenaMatchConfigOverrides;
}

export interface MatchInternalCheckpointIdentity {
  readonly tick: number;
  readonly phase: ArenaMatchPhase;
  readonly eventSequence: number;
  readonly stateHash: string;
}

/**
 * Opaque, single-consumer input batch for the LocalMatchSession fast path.
 * The marker is intentionally empty: ownership, provenance and frame data
 * live in module-private WeakMaps and cannot be supplied by a structural cast.
 */
export interface MatchCoreTrustedInputFrameBatch {
  readonly __arenaTrustedInputFrameBatch?: never;
}

interface TrustedInputFrameBatchRecord {
  readonly owner: MatchCore;
  readonly tick: number;
  readonly eventSequence: number;
  readonly frames: readonly ArenaInputFrame[];
  consumed: boolean;
}

const TRUSTED_INPUT_FRAME_BATCHES = new WeakMap<object, TrustedInputFrameBatchRecord>();
const NORMALIZED_INPUT_FRAME_KEYS = Object.freeze([
  'tick',
  'participantId',
  'moveX',
  'moveZ',
  'primaryPressed',
  'primaryHeld',
  'jumpPressed',
  'jumpHeld',
  'slamPressed',
]);

function readFrozenDataField(value: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (
    descriptor === undefined
    || !descriptor.enumerable
    || !('value' in descriptor)
    || descriptor.writable
    || descriptor.configurable
  ) throw new TypeError(`${name}.${key} 必须是冻结数据字段。`);
  return descriptor.value;
}

function assertExactFrozenRecord(
  value: unknown,
  keys: readonly string[],
  name: string,
): asserts value is Record<string, unknown> {
  if (
    value === null
    || typeof value !== 'object'
    || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || !Object.isFrozen(value)
  ) throw new TypeError(`${name} 必须是冻结 plain record。`);
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== keys.length
    || ownKeys.some((key) => typeof key !== 'string' || !keys.includes(key))
    || keys.some((key) => !ownKeys.includes(key))
  ) throw new TypeError(`${name} 字段集合不符合 trusted InputFrame 合同。`);
  for (const key of keys) readFrozenDataField(value, key, name);
}

function assertTrustedNormalizedFrame(
  value: unknown,
  expectedTick: number,
  expectedParticipantId: string,
  name: string,
): asserts value is ArenaInputFrame {
  if (!isNormalizedInputFrame(value)) {
    throw new TypeError(`${name} 必须来自 arena-contracts strict normalizer。`);
  }
  assertExactFrozenRecord(value, NORMALIZED_INPUT_FRAME_KEYS, name);
  const tick = readFrozenDataField(value, 'tick', name);
  const participantId = readFrozenDataField(value, 'participantId', name);
  if (tick !== expectedTick) {
    throw new RangeError(`${name}.tick 与当前 MatchCore tick 不一致。`);
  }
  if (participantId !== expectedParticipantId) {
    throw new RangeError(`${name}.participantId 顺序或身份不一致。`);
  }
  if (
    typeof tick !== 'number'
    || !Number.isSafeInteger(tick)
    || tick < 0
    || typeof participantId !== 'string'
    || participantId.length === 0
  ) throw new TypeError(`${name} 身份字段无效。`);
  for (const key of ['moveX', 'moveZ']) {
    const movement = readFrozenDataField(value, key, name);
    if (typeof movement !== 'number' || !Number.isFinite(movement)) {
      throw new TypeError(`${name}.${key} 必须是有限数。`);
    }
  }
  const moveX = readFrozenDataField(value, 'moveX', name) as number;
  const moveZ = readFrozenDataField(value, 'moveZ', name) as number;
  if (
    Math.abs(moveX) > 1
    || Math.abs(moveZ) > 1
    || Math.hypot(moveX, moveZ) > 1
  ) throw new RangeError(`${name} movement 未经过规范化。`);
  for (const key of [
    'primaryPressed',
    'primaryHeld',
    'jumpPressed',
    'jumpHeld',
    'slamPressed',
  ]) {
    if (typeof readFrozenDataField(value, key, name) !== 'boolean') {
      throw new TypeError(`${name}.${key} 必须是 boolean。`);
    }
  }
}

function assertTrustedInputFrameArray(
  value: unknown,
  participantIds: readonly string[],
  tick: number,
): readonly ArenaInputFrame[] {
  if (
    !Array.isArray(value)
    || Object.getPrototypeOf(value) !== Array.prototype
    || !Object.isFrozen(value)
  ) throw new TypeError('trusted InputFrame batch 必须是冻结数组。');
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  if (
    lengthDescriptor === undefined
    || !('value' in lengthDescriptor)
    || lengthDescriptor.value !== participantIds.length
    || lengthDescriptor.writable
    || lengthDescriptor.enumerable
    || lengthDescriptor.configurable
  ) throw new TypeError('trusted InputFrame batch length 不一致。');
  const expectedKeys = new Set([
    'length',
    ...participantIds.map((_, index) => String(index)),
  ]);
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== expectedKeys.size
    || ownKeys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))
    || [...expectedKeys].some((key) => !ownKeys.includes(key))
  ) throw new TypeError('trusted InputFrame batch 不能包含稀疏、额外或 Symbol 字段。');
  const frames = participantIds.map((participantId, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined
      || !descriptor.enumerable
      || !('value' in descriptor)
      || descriptor.writable
      || descriptor.configurable
    ) throw new TypeError(`trusted InputFrame batch[${index}] 不是冻结数据字段。`);
    const frame = descriptor.value;
    assertTrustedNormalizedFrame(frame, tick, participantId, `trusted InputFrame batch[${index}]`);
    return frame;
  });
  return Object.freeze(frames);
}

function createTrustedInputFrameBatch(
  owner: MatchCore,
  value: unknown,
  participantIds: readonly string[],
  tick: number,
  eventSequence: number,
): MatchCoreTrustedInputFrameBatch {
  const frames = assertTrustedInputFrameArray(value, participantIds, tick);
  const token = Object.freeze(Object.create(null)) as MatchCoreTrustedInputFrameBatch;
  TRUSTED_INPUT_FRAME_BATCHES.set(token, {
    owner,
    tick,
    eventSequence,
    frames,
    consumed: false,
  });
  return token;
}

function consumeTrustedInputFrameBatch(
  owner: MatchCore,
  value: unknown,
  tick: number,
  eventSequence: number,
): readonly ArenaInputFrame[] {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError('trusted InputFrame batch 无效。');
  }
  const record = TRUSTED_INPUT_FRAME_BATCHES.get(value);
  if (record === undefined) throw new TypeError('trusted InputFrame batch provenance 无效。');
  if (record.owner !== owner) throw new RangeError('trusted InputFrame batch 与当前 MatchCore 不一致。');
  if (record.consumed) throw new Error('trusted InputFrame batch 已被消费。');
  if (record.tick !== tick || record.eventSequence !== eventSequence) {
    throw new RangeError('trusted InputFrame batch 已过期。');
  }
  record.consumed = true;
  return record.frames;
}

export function readConsumedTrustedInputFrameBatch(
  owner: MatchCore,
  value: unknown,
): readonly ArenaInputFrame[] {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError('trusted InputFrame batch 无效。');
  }
  const record = TRUSTED_INPUT_FRAME_BATCHES.get(value);
  if (record === undefined || record.owner !== owner || !record.consumed) {
    throw new TypeError('trusted InputFrame batch 未完成有效消费。');
  }
  return record.frames;
}

interface MovementPreparation {
  readonly additionalCandidates: readonly Readonly<{
    participantId: string;
    candidates: readonly ActionCandidate[];
  }>[];
  readonly resolutionInputFrames: readonly ArenaInputFrame[] | null;
}

interface PublicSnapshotCacheEntry {
  readonly tick: number;
  readonly eventSequence: number;
  readonly phase: ArenaMatchPhase;
  readonly snapshot: DeepReadonly<ArenaMatchSnapshot>;
}

interface MatchOutcome {
  readonly winnerId: string | null;
  readonly reason: string;
  readonly isDraw: boolean;
}

function normalizeSeed(seed: unknown): number {
  if (typeof seed !== 'number' || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError('match seed 必须是 uint32 整数。');
  }
  return seed;
}

function cloneSnapshotData<T>(value: T): DeepReadonly<T> {
  if (value === null || typeof value !== 'object') return value as DeepReadonly<T>;
  if (Array.isArray(value)) return value.map(cloneSnapshotData) as DeepReadonly<T>;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    cloneSnapshotData(child),
  ])) as DeepReadonly<T>;
}

function freezeSnapshotData<T>(value: T, active = new WeakSet<object>()): DeepReadonly<T> {
  if (value === null || typeof value !== 'object') return value as DeepReadonly<T>;
  const object = value as object;
  const prototype = Object.getPrototypeOf(object);
  if (!Array.isArray(object) && prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('MatchCore public snapshot 只能包含 plain object 或 array。');
  }
  if (active.has(object)) throw new TypeError('MatchCore public snapshot 不能包含循环引用。');
  active.add(object);
  for (const key of Reflect.ownKeys(object)) {
    if (typeof key === 'symbol') {
      throw new TypeError('MatchCore public snapshot 不允许 Symbol 字段。');
    }
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (descriptor === undefined) throw new TypeError('MatchCore public snapshot 字段读取失败。');
    if (!('value' in descriptor)) {
      throw new TypeError('MatchCore public snapshot 不能包含访问器字段。');
    }
    freezeSnapshotData(descriptor.value, active);
  }
  Object.freeze(object);
  active.delete(object);
  return value as DeepReadonly<T>;
}

function cleanupCauses(value: unknown): readonly unknown[] | null {
  if (!value || typeof value !== 'object') return null;
  const descriptor = Object.getOwnPropertyDescriptor(value, 'causes');
  return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')
    && Array.isArray(descriptor.value)
    ? descriptor.value
    : null;
}

function requireMapValue<K, V>(map: ReadonlyMap<K, V>, key: K, message: string): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(message);
  return value;
}

function assertNativePromiseThenIntegrity(): void {
  const descriptor = Object.getOwnPropertyDescriptor(NATIVE_PROMISE_PROTOTYPE, 'then');
  if (descriptor === undefined
    || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    || descriptor.value !== NATIVE_PROMISE_THEN
    || descriptor.configurable !== NATIVE_PROMISE_THEN_FLAGS.configurable
    || descriptor.enumerable !== NATIVE_PROMISE_THEN_FLAGS.enumerable
    || descriptor.writable !== NATIVE_PROMISE_THEN_FLAGS.writable) {
    throw new TypeError('MatchCore 原生 Promise.prototype.then 描述符漂移。');
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
    throw new TypeError('MatchCore 原生 Promise[Symbol.species] 描述符漂移。');
  }
}

interface FactoryResourceReturnDescriptors {
  readonly thenDescriptor: PropertyDescriptor | null;
  readonly constructorDescriptor: PropertyDescriptor | null;
}

function inspectFactoryResourceReturnDescriptors(
  value: object,
  contractName: string,
): FactoryResourceReturnDescriptors {
  const visited = new Set<object>();
  let target: object | null = value;
  let thenDescriptor: PropertyDescriptor | null = null;
  let constructorDescriptor: PropertyDescriptor | null = null;
  for (
    let depth = 0;
    target !== null && depth < MAX_FACTORY_RESOURCE_PROTOTYPE_DEPTH;
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
      `${contractName} prototype 链超过 ${MAX_FACTORY_RESOURCE_PROTOTYPE_DEPTH} 层。`,
    );
  }
  return Object.freeze({ thenDescriptor, constructorDescriptor });
}

function rejectAsynchronousFactoryCleanupResult(
  value: unknown,
  contractName: string,
): void {
  assertNativePromiseThenIntegrity();
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return;
  const descriptors = inspectFactoryResourceReturnDescriptors(
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
      // Plain objects may spoof constructor: Promise. Native brand failure is
      // contained; ordinary thenables remain descriptor-only below.
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

function findDataMethod(
  value: unknown,
  name: string,
  ownerName = 'MatchCore factory resource',
): ((...args: unknown[]) => unknown) | null {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return null;
  const visited = new Set<object>();
  let target: object | null = value;
  for (
    let depth = 0;
    target !== null && depth < MAX_FACTORY_RESOURCE_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(target)) throw new TypeError(`${ownerName} prototype 链不能循环。`);
    visited.add(target);
    const descriptor = Object.getOwnPropertyDescriptor(target, name);
    if (descriptor) {
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        throw new TypeError(`${ownerName}.${name} 必须是数据方法。`);
      }
      return typeof descriptor.value === 'function'
        ? descriptor.value as (...args: unknown[]) => unknown
        : null;
    }
    target = Object.getPrototypeOf(target) as object | null;
  }
  if (target !== null) {
    throw new RangeError(
      `${ownerName} prototype 链超过 ${MAX_FACTORY_RESOURCE_PROTOTYPE_DEPTH} 层。`,
    );
  }
  return null;
}

function adoptFactoryResource<T>(
  candidate: unknown,
  assertion: (value: unknown) => T,
  name: string,
): T {
  try {
    return assertion(candidate);
  } catch (error) {
    const cleanupErrors: Error[] = [];
    try {
      const destroy = findDataMethod(candidate, 'destroy', `${name} 候选资源清理`);
      if (destroy !== null) {
        const cleanupResult = Reflect.apply(destroy, candidate, []);
        rejectAsynchronousFactoryCleanupResult(cleanupResult, `${name} 候选资源 destroy`);
      }
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, `${name} 候选资源清理失败`));
    }
    throw combineCleanupFailure(
      normalizeThrownError(error, `${name} 校验失败`),
      cleanupErrors,
      `${name} 校验失败且候选资源清理未完整完成。`,
    );
  }
}

function assertEquipmentSupplyTimeline(
  value: unknown,
): MatchCoreEquipmentSupplyTimelineContract {
  if (!value || typeof value !== 'object') {
    throw new TypeError('equipmentSupplyTimelineFactory 必须返回对象。');
  }
  for (const methodName of [
    'step',
    'getSnapshot',
    'getPublicSupplyProjection',
    'getContentHash',
    'destroy',
  ] as const) {
    if (findDataMethod(value, methodName, 'equipmentSupplyTimelineFactory 返回值') === null) {
      throw new TypeError(`equipment supply timeline 缺少 ${methodName}()。`);
    }
  }
  return value as MatchCoreEquipmentSupplyTimelineContract;
}

/**
 * Authoritative, renderer-free 1v1 arena simulation. All time is integer ticks;
 * callers may sample snapshots at any render rate without changing outcomes.
 */
export class MatchCore {
  #matchSeed: number;
  #config: ArenaMatchConfig;
  #configHash: string;
  #ruleContentHash: string | null;
  #characterRegistry: CharacterRegistryContract;
  #characterRuntimes: Map<string, CharacterRuntimeReference>;
  #physics: PhysicsWorld | null;
  #movement: MovementSystem | null;
  #movementPhysicsPort: MovementMutationPort | null;
  #rules: ArenaRuleEngineContract | null;
  #map: ArenaMapSystemContract | null;
  #participantSystem: MatchParticipantSystem | null;
  #timeline: MatchTimelineSystem | null;
  #equipmentSupplyTimeline: MatchCoreEquipmentSupplyTimelineContract | null;
  #terminalTimelineSnapshot: MatchTimelineSnapshot | null;
  #rngStreams: Readonly<Record<string, DeterministicRng>>;
  #events: ArenaAuthorityEvent[];
  #destroyed: boolean;
  #eventSequence: number;
  #stepping: boolean;
  #publicSnapshotCache: PublicSnapshotCacheEntry | null;
  #matchReadOwnerPort: MatchReadOwnerPort | null = null;
  #matchReadBindingCreating = false;
  #callerInputValidationActive = false;
  #matchReadBuildActive = false;
  #matchReadWorldMemo: {
    readonly identity: MatchReadModelIdentity;
    readonly snapshot: DeepReadonly<WorldSnapshotV2>;
  } | null = null;

  #withMatchReadBuild<T>(operation: () => T): T {
    if (this.#matchReadBuildActive) {
      throw new Error('MatchRead model 构造不可重入。');
    }
    if (this.#stepping || this.#callerInputValidationActive || this.#matchReadBindingCreating) {
      throw new Error('MatchRead model 构造期间 authority 不可重入。');
    }
    this.#matchReadBuildActive = true;
    try {
      return operation();
    } finally {
      this.#matchReadBuildActive = false;
    }
  }

  #assertNoMatchReadBuild(operation: string): void {
    if (this.#matchReadBuildActive) {
      throw new Error(`${operation} 不能在 MatchRead model 构造期间调用。`);
    }
  }

  #withCallerInputValidation<T>(operation: () => T): T {
    if (this.#callerInputValidationActive) {
      throw new Error('MatchCore caller input validation 不可重入。');
    }
    this.#assertNoMatchReadBuild('caller input validation');
    this.#callerInputValidationActive = true;
    try {
      return operation();
    } finally {
      this.#callerInputValidationActive = false;
    }
  }

  #requireResource<T>(resource: T | null, name: string): T {
    if (resource === null) throw new Error(`MatchCore ${name} 资源不可用。`);
    return resource;
  }

  get #physicsWorld(): PhysicsWorld {
    return this.#requireResource(this.#physics, 'physics');
  }

  get #movementSystem(): MovementSystem {
    return this.#requireResource(this.#movement, 'movement');
  }

  get #movementPort(): MovementMutationPort {
    return this.#requireResource(this.#movementPhysicsPort, 'movement physics port');
  }

  get #ruleEngine(): ArenaRuleEngineContract {
    return this.#requireResource(this.#rules, 'rules');
  }

  get #mapSystem(): ArenaMapSystemContract {
    return this.#requireResource(this.#map, 'map');
  }

  get #participants(): MatchParticipantSystem {
    return this.#requireResource(this.#participantSystem, 'participants');
  }

  get #matchTimeline(): MatchTimelineSystem {
    return this.#requireResource(this.#timeline, 'timeline');
  }

  #cleanupConstructionFailure(error: unknown): Error {
    const cleanupErrors: Error[] = [];
    this.#matchReadWorldMemo = null;
    invalidateMatchReadOwner(this.#matchReadOwnerPort);
    this.#matchReadOwnerPort = null;
    try {
      if (typeof this.#equipmentSupplyTimeline?.destroy === 'function') {
        this.#equipmentSupplyTimeline.destroy();
      }
      this.#equipmentSupplyTimeline = null;
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(
        cleanupError,
        'MatchCore equipment supply timeline 构造清理失败',
      ));
    }
    try {
      if (typeof this.#timeline?.destroy === 'function') this.#matchTimeline.destroy();
      this.#timeline = null;
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(
        cleanupError,
        'MatchCore timeline 构造清理失败',
      ));
    }
    try {
      if (typeof this.#participantSystem?.destroy === 'function') {
        this.#participants.destroy();
      }
      this.#participantSystem = null;
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(
        cleanupError,
        'MatchCore participant 构造清理失败',
      ));
    }
    try {
      if (typeof this.#movement?.destroy === 'function') this.#movementSystem.destroy();
      this.#movement = null;
      this.#movementPhysicsPort = null;
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, 'MatchCore movement 构造清理失败'));
    }
    try {
      if (typeof this.#physics?.destroy === 'function') this.#physicsWorld.destroy();
      this.#physics = null;
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, 'MatchCore physics 构造清理失败'));
    }
    try {
      if (typeof this.#rules?.destroy === 'function') this.#ruleEngine.destroy();
      this.#rules = null;
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, 'MatchCore rules 构造清理失败'));
    }
    try {
      if (typeof this.#map?.destroy === 'function') this.#mapSystem.destroy();
      this.#map = null;
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, 'MatchCore map 构造清理失败'));
    }
    this.#destroyed = true;
    this.#characterRuntimes?.clear();
    return combineCleanupFailure(
      normalizeThrownError(error, 'MatchCore 构造失败'),
      cleanupErrors,
      'MatchCore 构造失败且清理未完整完成。',
    );
  }

  constructor({
    seed = 1,
    config = {},
    physicsFactory = createLightweightPhysicsWorld,
    ruleEngineFactory,
    mapSystemFactory,
    characterRegistry,
    equipmentSupplyTimelineFactory,
  }: MatchCoreOptions = {}) {
    if (typeof physicsFactory !== 'function') throw new TypeError('physicsFactory 必须是函数。');
    if (typeof ruleEngineFactory !== 'function') {
      throw new TypeError('MatchCore 需要显式 ruleEngineFactory。');
    }
    if (typeof mapSystemFactory !== 'function') {
      throw new TypeError('MatchCore 需要显式 mapSystemFactory。');
    }
    if (
      equipmentSupplyTimelineFactory !== undefined
      && typeof equipmentSupplyTimelineFactory !== 'function'
    ) throw new TypeError('equipmentSupplyTimelineFactory 必须是函数。');
    this.#characterRegistry = assertCharacterRegistry(characterRegistry);
    this.#matchSeed = normalizeSeed(seed);
    this.#config = createArenaMatchConfig(config);
    this.#configHash = createArenaConfigHash(this.#config);
    this.#ruleContentHash = null;
    this.#eventSequence = 0;
    this.#events = [];
    this.#destroyed = false;
    this.#terminalTimelineSnapshot = null;
    this.#stepping = false;
    this.#publicSnapshotCache = null;
    this.#matchReadOwnerPort = null;
    this.#rngStreams = Object.fromEntries(
      ['spawn', 'map', 'equipment', 'bot', 'presentation'].map((name) => [
        name,
        createRng(deriveSeed(this.matchSeed, name)),
      ]),
    );
    this.#characterRuntimes = new Map<string, CharacterRuntimeReference>();
    this.#participantSystem = null;
    this.#timeline = null;
    this.#equipmentSupplyTimeline = null;
    this.#physics = null;
    this.#movement = null;
    this.#movementPhysicsPort = null;
    this.#rules = null;
    this.#map = null;
    try {
      this.#participantSystem = new MatchParticipantSystem({
        participantIds: this.config.participantIds,
        livesPerParticipant: this.config.livesPerParticipant,
      });
      this.#timeline = new MatchTimelineSystem({
        preparingTicks: this.config.preparingTicks,
        suddenDeathStartTick: this.config.suddenDeathStartTick,
        hardLimitTicks: this.config.hardLimitTicks,
      });
      for (const assignment of this.config.participantCharacters) {
        const runtime = createCharacterRuntimeReference({
          participantId: assignment.participantId,
          definitionId: assignment.definitionId,
          characterRegistry: this.#characterRegistry,
        });
        this.#characterRuntimes.set(runtime.participantId, runtime);
        const definition = this.#characterRegistry.require(runtime.definitionId);
        if (
          !Number.isFinite(this.config.basePush.horizontalImpulse / definition.collision.mass)
          || !Number.isFinite(this.config.basePush.verticalImpulse / definition.collision.mass)
        ) {
          throw new RangeError(
            `basePush impulse 与 CharacterDefinition ${definition.id} 的质量组合后无效。`,
          );
        }
      }
      this.#movement = new MovementSystem({
        airJumpHorizontalImpulse: this.config.airJumpHorizontalImpulse ?? 0,
        participantCharacters: this.config.participantIds.map((participantId) => {
          const runtime = requireMapValue(
            this.#characterRuntimes,
            participantId,
            `participant ${participantId} 缺少 character runtime。`,
          );
          return {
            participantId,
            characterDefinition: this.#characterRegistry.require(runtime.definitionId),
          };
        }),
      });
      this.#rules = adoptFactoryResource(
        ruleEngineFactory({
          participantIds: this.config.participantIds,
          config: this.config,
        }),
        assertArenaRuleEngine,
        'ruleEngineFactory',
      );
      this.#map = adoptFactoryResource(
        mapSystemFactory({
          config: this.config,
          matchSeed: this.matchSeed,
          equipmentDefinitionCatalog: Object.freeze({
            require: (definitionId) => this.#ruleEngine.requireEquipmentDefinition(definitionId),
          }),
          characterDefinitionCatalog: Object.freeze({
            require: (definitionId) => this.#characterRegistry.require(definitionId),
          }),
        }),
        assertArenaMapSystem,
        'mapSystemFactory',
      );
      if (equipmentSupplyTimelineFactory !== undefined) {
        const applySupplyPhase = findDataMethod(
          this.#ruleEngine,
          'applyEquipmentSupplyTimelinePhase',
        );
        const resolveSupplyPickups = findDataMethod(
          this.#ruleEngine,
          'resolveEquipmentSupplyPickups',
        );
        if (applySupplyPhase === null || resolveSupplyPickups === null) {
          throw new TypeError('生存供给 Composition 需要 RuleEngine supply authority。');
        }
        this.#equipmentSupplyTimeline = adoptFactoryResource(
          equipmentSupplyTimelineFactory({
            participantIds: this.config.participantIds,
            config: this.config,
            matchSeed: this.matchSeed,
            equipmentDefinitionCatalog: Object.freeze({
              require: (definitionId) => this.#ruleEngine.requireEquipmentDefinition(definitionId),
            }),
            equipmentAuthority: Object.freeze({
              applySupplyTimelinePhase: (options: unknown) => applySupplyPhase.call(
                this.#ruleEngine,
                options,
              ),
              resolveSupplyPickups: (options: unknown) => resolveSupplyPickups.call(
                this.#ruleEngine,
                options,
              ),
              getSnapshot: (instanceId: string) => (
                this.#ruleEngine.getEquipmentSnapshot(instanceId)
              ),
            }),
            isEquipmentPositionValid: (position) => this.#isEquipmentPositionValid(position),
          }),
          assertEquipmentSupplyTimeline,
          'equipmentSupplyTimelineFactory',
        );
      }
      this.#ruleContentHash = createDeterministicDataHash({
        combat: this.#ruleEngine.getContentHash(),
        map: this.#mapSystem.getContentHash(),
        characters: this.#characterRegistry.list(),
        ...(this.#equipmentSupplyTimeline === null ? {} : {
          equipmentSupplyTimeline: this.#equipmentSupplyTimeline.getContentHash(),
        }),
      }, 'Arena authority content');
      if (typeof this.#ruleContentHash !== 'string' || !/^[0-9a-f]{8}$/.test(this.#ruleContentHash)) {
        throw new TypeError('ruleEngine content hash 必须是 8 位十六进制字符串。');
      }
      this.#physics = adoptFactoryResource(
        physicsFactory({ arena: this.config.arena }),
        assertPhysicsWorld,
        'physicsFactory',
      );
      this.#movementPhysicsPort = createMovementPhysicsPort(this.#physicsWorld);
      for (let index = 0; index < this.config.participantIds.length; index += 1) {
        const id = this.config.participantIds[index];
        const spawn = this.config.arena.spawns[index];
        if (id === undefined || spawn === undefined) {
          throw new Error(`participant/spawn 索引 ${index} 不完整。`);
        }
        const runtime = requireMapValue(
          this.#characterRuntimes,
          id,
          `participant ${id} 缺少 character runtime。`,
        );
        const definition = this.#characterRegistry.require(runtime.definitionId);
        this.#physicsWorld.addCharacter({
          id,
          position: spawn,
          ...createCharacterPhysicsProfile(definition),
        });
        this.#physicsWorld.resetCharacter(id, {
          position: spawn,
          velocity: { x: 0, y: 0, z: 0 },
          facing: { x: index === 0 ? 1 : -1, z: 0 },
        });
      }
      for (const spawn of this.config.equipment.initialSpawns) {
        if (!this.#isEquipmentPositionValid(spawn.position)) {
          throw new RangeError(`equipment spawn ${spawn.id} 不在合法竞技场表面。`);
        }
        this.#ruleEngine.spawnEquipment({
          instanceId: `initial:${spawn.id}`,
          definitionId: spawn.definitionId,
          spawnId: spawn.id,
          position: spawn.position,
        });
      }
      this.#matchReadOwnerPort = createMatchReadOwnerPort({
        owner: this,
        participantIds: this.config.participantIds,
        mapDefinitionId: this.config.mapDefinitionId,
        contentSelectionHash: this.config.contentSelection?.contentHash ?? null,
        configHash: this.#configHash,
        authorityContentHash: this.ruleContentHash,
        readIdentity: (participantId, profile) => this.#readMatchReadIdentity(
          participantId,
          profile,
        ),
      });
    } catch (error) {
      throw this.#cleanupConstructionFailure(error);
    }
  }

  get tick(): number {
    return this.#timeline?.tick ?? this.#terminalTimelineSnapshot?.tick ?? 0;
  }

  get matchSeed(): number {
    return this.#matchSeed;
  }

  get config(): ArenaMatchConfig {
    return this.#config;
  }

  get configHash(): string {
    return this.#configHash;
  }

  get ruleContentHash(): string {
    if (this.#ruleContentHash === null) {
      throw new Error('MatchCore rule content hash 尚未初始化。');
    }
    return this.#ruleContentHash;
  }

  get activeTick(): number {
    return this.#timeline?.activeTick ?? this.#terminalTimelineSnapshot?.activeTick ?? 0;
  }

  get phase(): ArenaMatchPhase {
    return this.#timeline?.phase ?? this.#terminalTimelineSnapshot?.phase ?? ARENA_MATCH_PHASE.ENDED;
  }

  get result(): MatchTimelineSnapshot['result'] {
    const result = this.#timeline?.result ?? this.#terminalTimelineSnapshot?.result ?? null;
    return result ? { ...result } : null;
  }

  getCharacterDefinition(participantId: unknown): CharacterDefinition {
    this.#assertUsable();
    this.#assertNoMatchReadBuild('character definition');
    if (this.#callerInputValidationActive) {
      throw new Error('caller input validation 期间不能读取 character definition。');
    }
    const runtime = typeof participantId === 'string'
      ? this.#characterRuntimes.get(participantId)
      : undefined;
    if (!runtime) throw new RangeError(`未知 character participant ${String(participantId)}。`);
    return this.#characterRegistry.require(runtime.definitionId);
  }

  getMovementCapabilities(participantId: unknown): MovementCapabilities {
    this.#assertUsable();
    this.#assertNoMatchReadBuild('movement capabilities');
    if (this.#stepping) throw new Error('MatchCore step()期间不能读取movement capabilities。');
    if (this.#callerInputValidationActive) {
      throw new Error('caller input validation期间不能读取movement capabilities。');
    }
    if (typeof participantId !== 'string' || !this.config.participantIds.includes(participantId)) {
      throw new RangeError(`未知 movement participant ${String(participantId)}。`);
    }
    const physics = this.#physicsWorld.getCharacterState(participantId);
    const phaseAllowsMovement = this.phase === ARENA_MATCH_PHASE.RUNNING
      || this.phase === ARENA_MATCH_PHASE.SUDDEN_DEATH;
    return this.#movementSystem.projectCapabilities(participantId, {
      grounded: physics.grounded,
      canMove: phaseAllowsMovement && this.#participants.canAct(participantId),
    });
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('MatchCore 已销毁。');
  }

  #readMatchReadIdentity(
    participantId: string,
    _profile: ArenaMatchReadProfile,
  ) {
    this.#assertUsable();
    this.#assertNoMatchReadBuild('MatchRead identity');
    if (this.#stepping) throw new Error('MatchCore step() 期间不能读取 MatchRead reader。');
    if (this.#callerInputValidationActive) {
      throw new Error('caller input validation 期间不能读取 MatchRead reader。');
    }
    if (!this.config.participantIds.includes(participantId)) {
      throw new RangeError(`未知 MatchRead participant ${participantId}。`);
    }
    return this.#snapshotMatchReadAuthorityIdentity();
  }

  #emit(type: string, payload: UnknownRecord = {}): ArenaAuthorityEvent {
    const event = {
      id: `${this.matchSeed.toString(16)}:${this.tick}:${this.#eventSequence}`,
      sequence: this.#eventSequence,
      tick: this.tick,
      type,
      ...payload,
    };
    this.#eventSequence += 1;
    this.#events.push(event);
    return event;
  }

  #startRunningIfNeeded(): void {
    if (!this.#matchTimeline.claimMatchStart()) return;
    this.#emit(EVENT.MATCH_STARTED, { participantIds: [...this.config.participantIds] });
    for (const equipment of this.#ruleEngine.listEquipmentSnapshots()) {
      this.#emit(EVENT.EQUIPMENT_SPAWNED, {
        equipmentInstanceId: equipment.instanceId,
        equipmentDefinitionId: equipment.definitionId,
        spawnId: equipment.spawnId,
        position: equipment.position ? { ...equipment.position } : null,
      });
    }
  }

  #stepEquipmentSupplyTimeline(): readonly string[] {
    const timeline = this.#equipmentSupplyTimeline;
    if (timeline === null) return Object.freeze([]);
    const result = timeline.step({
      tick: this.tick,
      participants: this.config.participantIds.map((id) => ({
        id,
        position: { ...this.#physicsWorld.getCharacterState(id).position },
        eligible: this.phase !== ARENA_MATCH_PHASE.PREPARING && this.#participants.canAct(id),
      })),
      contestSeed: deriveSeed(this.matchSeed, `equipment-supply:${this.tick}`),
    });
    if (
      result.tick !== this.tick
      || result.nextPhase !== 'action'
      || result.phaseOrder.length !== 4
      || result.phaseOrder.some((phase, index) => (
        phase !== ['spawn', 'expire', 'pickup', 'action'][index]
      ))
    ) throw new Error('Equipment supply timeline 阶段合同不一致。');
    for (const event of result.spawnedEvents) {
      if (event.type !== EVENT.EQUIPMENT_SPAWNED) {
        throw new RangeError(`供给生成阶段包含未知事件 ${event.type}。`);
      }
      this.#emit(event.type, { payload: createEquipmentSpawnedEventPayload(event.payload) });
    }
    for (const event of result.expiredEvents) {
      if (event.type !== EVENT.EQUIPMENT_EXPIRED) {
        throw new RangeError(`供给过期阶段包含未知事件 ${event.type}。`);
      }
      this.#emit(event.type, { payload: createEquipmentExpiredEventPayload(event.payload) });
    }
    for (const event of result.pickupEvents) {
      if (event.type === EVENT.EQUIPMENT_RECYCLED) {
        this.#emit(event.type, { payload: createEquipmentRecycledEventPayload(event.payload) });
      } else if (event.type === EVENT.EQUIPMENT_REPLACED) {
        this.#emit(event.type, { payload: createEquipmentReplacedEventPayload(event.payload) });
      } else {
        throw new RangeError(`供给拾取阶段包含未知事件 ${event.type}。`);
      }
    }
    for (const decision of result.pickupDecisions) {
      if (decision.kind !== 'picked-up') continue;
      const equipment = this.#ruleEngine.getEquipmentSnapshot(decision.equipmentInstanceId);
      this.#emit(EVENT.EQUIPMENT_PICKED_UP, {
        participantId: decision.participantId,
        equipmentInstanceId: equipment.instanceId,
        equipmentDefinitionId: equipment.definitionId,
      });
    }
    return Object.freeze(timeline.getSnapshot().activeSupplies.map((supply) => (
      supply.equipmentInstanceId
    )));
  }

  #runValidatedStep(frames: readonly ArenaInputFrame[]): readonly ArenaAuthorityEvent[] {
    this.#publicSnapshotCache = null;
    this.#events = [];
    try {
      return this.#stepNormalized(frames);
    } catch (error) {
      const failure = normalizeThrownError(error, 'MatchCore tick 失败');
      // Internal fail-closed cleanup is allowed after the authoritative
      // mutation phase unwinds; external destroy() remains blocked while a
      // caller-owned input is being validated.
      this.#stepping = false;
      try {
        this.destroy();
      } catch (cleanupError) {
        const causes = cleanupCauses(cleanupError);
        const cleanupErrors = causes
          ? causes.map((cause) => normalizeThrownError(
            cause,
            'MatchCore tick 清理失败',
          ))
          : [normalizeThrownError(cleanupError, 'MatchCore tick 清理失败')];
        throw combineCleanupFailure(
          failure,
          cleanupErrors,
          'MatchCore tick 失败且清理未完整完成。',
        );
      }
      throw failure;
    }
  }

  step(inputFrames: readonly unknown[] = []): readonly ArenaAuthorityEvent[] {
    this.#assertUsable();
    this.#assertNoMatchReadBuild('MatchCore.step()');
    if (this.phase === ARENA_MATCH_PHASE.ENDED) throw new Error('比赛已经结束，不能继续 step。');
    if (this.#stepping) throw new Error('MatchCore.step() 不可重入。');
    if (this.#matchReadBindingCreating) {
      throw new Error('MatchRead binding 创建期间不能 step。');
    }
    if (this.#callerInputValidationActive) {
      throw new Error('caller input validation 期间不能 step。');
    }
    this.#stepping = true;
    try {
      const frames = normalizeInputFrames(inputFrames, {
        tick: this.tick,
        participantIds: this.config.participantIds,
      });
      return this.#runValidatedStep(frames);
    } finally {
      this.#stepping = false;
    }
  }

  /** @internal Used only by LocalMatchSession through HeadlessMatchRunner. */
  createTrustedInputFrameBatch(
    inputFrames: readonly unknown[],
  ): MatchCoreTrustedInputFrameBatch {
    this.#assertUsable();
    this.#assertNoMatchReadBuild('trusted InputFrame batch');
    if (this.#stepping) throw new Error('MatchCore step() 期间不能创建 trusted InputFrame batch。');
    if (this.#matchReadBindingCreating) {
      throw new Error('MatchRead binding 创建期间不能创建 trusted InputFrame batch。');
    }
    return this.#withCallerInputValidation(() => createTrustedInputFrameBatch(
      this,
      inputFrames,
      this.config.participantIds,
      this.tick,
      this.#eventSequence,
    ));
  }

  /** @internal Used only by HeadlessMatchRunner through LocalMatchSession. */
  stepTrustedInputFrameBatch(
    batch: unknown,
  ): readonly ArenaAuthorityEvent[] {
    this.#assertUsable();
    this.#assertNoMatchReadBuild('MatchCore.stepTrustedInputFrameBatch()');
    if (this.phase === ARENA_MATCH_PHASE.ENDED) throw new Error('比赛已经结束，不能继续 step。');
    if (this.#stepping) throw new Error('MatchCore.stepTrustedInputFrameBatch() 不可重入。');
    if (this.#matchReadBindingCreating) {
      throw new Error('MatchRead binding 创建期间不能 step。');
    }
    if (this.#callerInputValidationActive) {
      throw new Error('caller input validation 期间不能 step。');
    }
    this.#stepping = true;
    try {
      const frames = consumeTrustedInputFrameBatch(
        this,
        batch,
        this.tick,
        this.#eventSequence,
      );
      return this.#runValidatedStep(frames);
    } finally {
      this.#stepping = false;
    }
  }

  #stepNormalized(frames: readonly ArenaInputFrame[]): readonly ArenaAuthorityEvent[] {
    this.#matchTimeline.beginStep();
    if (this.phase === ARENA_MATCH_PHASE.PREPARING) {
      this.#stepEquipmentSupplyTimeline();
      for (const id of this.config.participantIds) this.#physicsWorld.setMovementIntent(id, 0, 0);
      this.#physicsWorld.step(this.config.fixedDeltaSeconds);
      if (this.#matchTimeline.advancePreparation()) this.#startRunningIfNeeded();
      this.#matchTimeline.completeStep();
      return this.#events.map((event) => ({ ...event }));
    }

    this.#startRunningIfNeeded();
    this.#advanceParticipantTimers();
    this.#ruleEngine.advanceTimers();
    this.#advanceMapState();
    const supplyEquipmentIds = this.#stepEquipmentSupplyTimeline();
    this.#updateEquipmentState(supplyEquipmentIds);
    const frameById = new Map(frames.map((frame) => [frame.participantId, frame]));
    const movementPreparation = this.#prepareMovement(frameById);
    const startedActions = this.#ruleEngine.resolveActions({
      tick: this.tick,
      actors: this.#createRuleActors(),
      inputFrames: movementPreparation.resolutionInputFrames ?? frames,
      additionalCandidates: movementPreparation.additionalCandidates,
    });
    this.#movementSystem.execute(
      startedActions.movementCommands.map(createMovementCommand),
      this.#movementPort,
    );
    this.#commitRuleBatch(startedActions);
    const activeActions = this.#ruleEngine.resolveActiveActions({ actors: this.#createRuleActors() });
    this.#commitRuleBatch(activeActions);
    this.#applyMovementIntents(frameById);
    this.#physicsWorld.step(this.config.fixedDeltaSeconds);
    this.#completeMovement();
    this.#resolveEliminations();

    if (this.phase !== ARENA_MATCH_PHASE.ENDED) {
      const transition = this.#matchTimeline.advanceActiveTick();
      if (transition.suddenDeathStarted) this.#handleSuddenDeathStarted(transition);
      if (transition.timeoutDue) this.#resolveTimeout();
    }
    this.#matchTimeline.completeStep();
    return this.#events.map((event) => ({ ...event }));
  }

  #advanceParticipantTimers(): void {
    for (const participantId of this.#participants.advanceTimers()) {
      this.#respawnParticipant(participantId, 'timer');
    }
  }

  #createRuleActors(): readonly RuleActor[] {
    return this.config.participantIds.map((id) => {
      const physics = this.#physicsWorld.getCharacterState(id);
      return {
        id,
        canAct: this.#participants.canAct(id),
        targetable: this.#participants.isTargetable(id),
        position: { ...physics.position },
        facing: { ...physics.facing },
      };
    });
  }

  #prepareMovement(frameById: ReadonlyMap<string, ArenaInputFrame>): MovementPreparation {
    const contacts = [];
    const inputs = [];
    const availability = [];
    for (const participantId of this.config.participantIds) {
      const physics = this.#physicsWorld.getCharacterState(participantId);
      const frame = requireMapValue(
        frameById,
        participantId,
        `participant ${participantId} 缺少当前 tick 输入。`,
      );
      contacts.push({ participantId, grounded: physics.grounded });
      inputs.push({
        tick: this.tick,
        participantId,
        jumpPressed: frame.jumpPressed,
        jumpHeld: frame.jumpHeld,
        moveX: frame.moveX,
        moveZ: frame.moveZ,
      });
      availability.push({
        participantId,
        canMove: this.#participants.canAct(participantId),
      });
    }
    this.#movementSystem.prepareTick({
      tick: this.tick,
      contacts,
      inputs,
      availability,
    });
    const additionalCandidates: Array<Readonly<{
      participantId: string;
      candidates: readonly ActionCandidate[];
    }>> = [];
    let resolutionInputFrames: ArenaInputFrame[] | null = null;
    for (let index = 0; index < this.config.participantIds.length; index += 1) {
      const participantId = this.config.participantIds[index];
      if (participantId === undefined) {
        throw new Error(`participant 索引 ${index} 不完整。`);
      }
      const capabilities = this.#movementSystem.getCapabilities(participantId);
      additionalCandidates.push(Object.freeze({
        participantId,
        candidates: this.#ruleEngine.getMovementActionCandidates(capabilities),
      }));
      const frame = requireMapValue(
        frameById,
        participantId,
        `participant ${participantId} 缺少当前 tick 输入。`,
      );
      // Replay records only real semantic edges. A buffered press is an
      // authoritative Movement derivation and is re-presented to the same
      // resolver on the first legal grounded tick until consumed or expired.
      if (
        capabilities.hasBufferedJump
        && capabilities.canGroundJump
        && !frame.jumpPressed
      ) {
        resolutionInputFrames ??= this.config.participantIds.map((id) => requireMapValue(
          frameById,
          id,
          `participant ${id} 缺少当前 tick 输入。`,
        ));
        resolutionInputFrames[index] = Object.freeze({ ...frame, jumpPressed: true });
      }
    }
    return Object.freeze({
      additionalCandidates: Object.freeze(additionalCandidates),
      resolutionInputFrames: resolutionInputFrames
        ? Object.freeze(resolutionInputFrames)
        : null,
    });
  }

  #completeMovement(): void {
    const transitions = this.#movementSystem.completeTick({
      tick: this.tick,
      contacts: this.config.participantIds.map((participantId) => ({
        participantId,
        grounded: this.#physicsWorld.getCharacterState(participantId).grounded,
      })),
    });
    for (const transition of transitions) {
      if (transition.kind !== 'down-smash-landed') {
        throw new RangeError(`未知 Movement transition ${transition.kind}。`);
      }
      this.#emit(EVENT.DOWN_SMASH_LANDED, {
        participantId: transition.participantId,
        action: transition.actionDefinitionId,
      });
    }
  }

  #isEquipmentPositionValid(position: unknown): boolean {
    if (!position || typeof position !== 'object') return false;
    const candidate = position as Partial<RuleEquipmentPosition>;
    if (
      !Number.isFinite(candidate.x)
      || !Number.isFinite(candidate.y)
      || !Number.isFinite(candidate.z)
      || (candidate.y as number) <= this.config.arena.killY
    ) return false;
    const normalized = candidate as RuleEquipmentPosition;
    return this.config.arena.surfaces.some((surface) => {
      if (
        !this.#mapSystem.isSurfaceEnabled(surface.id)
        || Math.abs(normalized.x - surface.center.x) > surface.halfExtents.x
        || Math.abs(normalized.z - surface.center.z) > surface.halfExtents.z
      ) return false;
      const surfaceTop = surface.center.y + surface.halfExtents.y;
      return [...this.#characterRuntimes.values()].some((runtime) => {
        const collision = this.#characterRegistry.require(runtime.definitionId).collision;
        return Math.abs(
          normalized.y - (surfaceTop + collision.radius + collision.halfHeight)
        ) <= EQUIPMENT_SURFACE_HEIGHT_TOLERANCE;
      });
    });
  }

  #advanceMapState(): void {
    const batch = this.#mapSystem.advance({
      activeTick: this.activeTick,
      actors: this.config.participantIds.map((id) => {
        const physics = this.#physicsWorld.getCharacterState(id);
        return {
          id,
          position: { ...physics.position },
          eligible: this.#participants.isActive(id),
        };
      }),
    });
    this.#mapSystem.commit(batch, {
      applyImpulse: (participantId, impulse) => {
        this.#physicsWorld.applyImpulse(participantId, impulse);
      },
      setSurfaceEnabled: (surfaceId, enabled) => {
        this.#physicsWorld.setSurfaceEnabled(surfaceId, enabled);
      },
      spawnEquipment: (spawn) => {
        if (!this.#isEquipmentPositionValid(spawn.position)) {
          throw new RangeError(`map equipment spawn ${spawn.spawnId} 不在可用竞技场表面。`);
        }
        const equipment = this.#ruleEngine.spawnEquipment(spawn);
        this.#emit(EVENT.EQUIPMENT_SPAWNED, {
          equipmentInstanceId: equipment.instanceId,
          equipmentDefinitionId: equipment.definitionId,
          spawnId: equipment.spawnId,
          position: equipment.position ? { ...equipment.position } : null,
        });
      },
    });
    for (const event of batch.events) {
      const { type, ...payload } = event;
      this.#emit(type, payload);
    }
    for (const equipment of this.#ruleEngine.despawnInvalidWorldEquipment({
      isPositionValid: (position: RuleEquipmentPosition) => this.#isEquipmentPositionValid(position),
    })) {
      this.#emit(EVENT.EQUIPMENT_DESPAWNED, {
        equipmentInstanceId: equipment.instanceId,
        equipmentDefinitionId: equipment.definitionId,
        reason: 'invalid-map-surface',
      });
    }
  }

  #updateEquipmentState(excludedEquipmentInstanceIds: readonly string[] = []): void {
    const participants = this.config.participantIds.map((id) => {
      const physics = this.#physicsWorld.getCharacterState(id);
      if (
        this.#participants.isActive(id)
        && physics.grounded
        && physics.supportSurfaceId
        && this.#ruleEngine.getHeldEquipment(id)
      ) this.#ruleEngine.updateEquipmentLastSafePosition(id, physics.position);
      return {
        id,
        position: { ...physics.position },
        eligible: this.#participants.isActive(id),
      };
    });
    const pickups = this.#ruleEngine.resolveEquipmentPickups({
      participants,
      contestSeed: deriveSeed(this.matchSeed, `equipment-pickup:${this.tick}`),
      ...(excludedEquipmentInstanceIds.length === 0 ? {} : { excludedEquipmentInstanceIds }),
    });
    for (const pickup of pickups) {
      const equipment = this.#ruleEngine.getEquipmentSnapshot(pickup.equipmentInstanceId);
      const participant = participants.find(({ id }) => id === pickup.participantId);
      if (!participant) {
        throw new Error(`equipment pickup ${pickup.equipmentInstanceId} 缺少 participant。`);
      }
      const physics = this.#physicsWorld.getCharacterState(pickup.participantId);
      if (physics.grounded && physics.supportSurfaceId) {
        this.#ruleEngine.updateEquipmentLastSafePosition(pickup.participantId, participant.position);
      }
      this.#emit(EVENT.EQUIPMENT_PICKED_UP, {
        participantId: pickup.participantId,
        equipmentInstanceId: equipment.instanceId,
        equipmentDefinitionId: equipment.definitionId,
      });
    }
  }

  #commitRuleBatch(batch: ArenaRuleBatch): void {
    this.#ruleEngine.commit(batch, {
      recordHit: (attackerId, targetId) => {
        this.#participants.recordHit(attackerId, targetId, this.tick);
      },
      applyHitstun: (participantId, ticks) => {
        this.#participants.applyHitstun(participantId, ticks);
      },
      applyImpulse: (participantId, impulse) => {
        this.#physicsWorld.applyImpulse(participantId, impulse);
      },
    });
    for (const event of batch.events) {
      const { type, ...payload } = event;
      this.#emit(type, payload);
    }
  }

  #applyMovementIntents(frameById: ReadonlyMap<string, ArenaInputFrame>): void {
    for (const id of this.config.participantIds) {
      const frame = requireMapValue(
        frameById,
        id,
        `participant ${id} 缺少当前 tick 输入。`,
      );
      if (!this.#participants.canAct(id)) {
        this.#physicsWorld.setMovementIntent(id, 0, 0);
      } else {
        const intent = this.#movementSystem.projectHorizontalIntent(id, frame.moveX, frame.moveZ);
        this.#physicsWorld.setMovementIntent(id, intent.x, intent.z);
      }
    }
  }

  #resolveEliminations(): void {
    const eliminatedIds: string[] = [];
    for (const id of this.config.participantIds) {
      if (!this.#participants.isActive(id)) continue;
      const state = this.#physicsWorld.getCharacterState(id);
      if (state.position.y < this.config.arena.killY) eliminatedIds.push(id);
    }
    if (eliminatedIds.length === 0) return;

    const outcomes = this.#participants.eliminateBatch(eliminatedIds, {
      tick: this.tick,
      suddenDeath: this.phase === ARENA_MATCH_PHASE.SUDDEN_DEATH,
      lastHitCreditTicks: this.config.lastHitCreditTicks,
      respawnTicks: this.config.respawnTicks,
    });
    for (const outcome of outcomes) {
      this.#emit(EVENT.PLAYER_ELIMINATED, {
        participantId: outcome.participantId,
        remainingLives: outcome.remainingLives,
        creditedAttackerId: outcome.creditedAttackerId,
      });
      const dropped = this.#ruleEngine.dropEquipment(outcome.participantId, {
        isPositionValid: (position: RuleEquipmentPosition) => this.#isEquipmentPositionValid(position),
      });
      if (dropped) {
        if (dropped.despawned) {
          this.#emit(EVENT.EQUIPMENT_DESPAWNED, {
            participantId: outcome.participantId,
            equipmentInstanceId: dropped.equipment.instanceId,
            equipmentDefinitionId: dropped.equipment.definitionId,
            reason: dropped.diagnosticCode === EQUIPMENT_DESPAWN_REASON.EXPIRED_HELD_LIFECYCLE
              ? EQUIPMENT_DESPAWN_REASON.EXPIRED_HELD_LIFECYCLE
              : 'no-valid-drop-position',
          });
        } else {
          if (!dropped.equipment.position) {
            throw new Error(`equipment ${dropped.equipment.instanceId} 掉落后缺少 position。`);
          }
          this.#emit(EVENT.EQUIPMENT_DROPPED, {
            participantId: outcome.participantId,
            equipmentInstanceId: dropped.equipment.instanceId,
            equipmentDefinitionId: dropped.equipment.definitionId,
            position: { ...dropped.equipment.position },
          });
        }
        if (dropped.fallbackUsed) {
          this.#emit(EVENT.EQUIPMENT_DROP_FALLBACK, {
            participantId: outcome.participantId,
            equipmentInstanceId: dropped.equipment.instanceId,
            diagnosticCode: dropped.diagnosticCode,
          });
        }
      }
      this.#ruleEngine.resetParticipant(outcome.participantId);
      this.#movementSystem.resetParticipant(outcome.participantId);
      this.#physicsWorld.resetCharacter(outcome.participantId, {
        position: this.#holdingPosition(outcome.participantId),
        velocity: { x: 0, y: 0, z: 0 },
      });
    }

    const terminalParticipantIds = this.#participants.listByStatus(
      ARENA_PARTICIPANT_STATUS.ELIMINATED,
    );
    if (terminalParticipantIds.length === 2) {
      this.#endMatch({ winnerId: null, reason: 'simultaneous-elimination', isDraw: true });
    } else if (terminalParticipantIds.length === 1) {
      const winnerId = this.config.participantIds.find(
        (id) => id !== terminalParticipantIds[0],
      );
      if (winnerId === undefined) throw new Error('终局状态缺少可用胜者。');
      this.#endMatch({ winnerId, reason: 'last-participant-standing', isDraw: false });
    }
  }

  #holdingPosition(participantId: string): PhysicsVector3 {
    const spawnIndex = this.#participants.getSpawnIndex(participantId);
    return {
      x: spawnIndex * 4,
      y: this.config.arena.killY - 50 - spawnIndex * 5,
      z: 0,
    };
  }

  #chooseRespawn(participantId: string): PhysicsVector3 {
    const validSpawns = this.config.arena.spawns.filter((spawn) => (
      this.#mapSystem.isPositionOnEnabledSurface(spawn)
    ));
    if (validSpawns.length === 0) throw new Error('当前地图没有合法重生点。');
    const opponents = this.#participants
      .listByStatus(ARENA_PARTICIPANT_STATUS.ACTIVE)
      .filter((id) => id !== participantId)
      .map((id) => this.#physicsWorld.getCharacterState(id));
    const spawnIndex = this.#participants.getSpawnIndex(participantId);
    if (opponents.length === 0) {
      const spawn = validSpawns[spawnIndex % validSpawns.length];
      if (!spawn) throw new Error('合法重生点选择失败。');
      return spawn;
    }
    const best = validSpawns
      .map((spawn, index) => ({
        spawn,
        index,
        nearestOpponentDistance: Math.min(...opponents.map((opponent) => Math.hypot(
          spawn.x - opponent.position.x,
          spawn.z - opponent.position.z,
        ))),
      }))
      .sort((a, b) => (
        b.nearestOpponentDistance - a.nearestOpponentDistance || a.index - b.index
      ))[0];
    if (!best) throw new Error('合法重生点排序失败。');
    return best.spawn;
  }

  #respawnParticipant(
    participantId: string,
    reason: 'timer' | 'phase-transition' = 'phase-transition',
  ): void {
    const spawn = this.#chooseRespawn(participantId);
    const participant = this.#participants.respawn(participantId, {
      invulnerableTicks: this.config.invulnerableTicks,
      reason,
    });
    this.#ruleEngine.resetParticipant(participantId);
    this.#movementSystem.resetParticipant(participantId);
    this.#physicsWorld.resetCharacter(participantId, {
      position: spawn,
      velocity: { x: 0, y: 0, z: 0 },
      facing: { x: spawn.x <= 0 ? 1 : -1, z: 0 },
    });
    this.#emit(EVENT.PLAYER_RESPAWNED, {
      participantId,
      position: { ...spawn },
      invulnerableTicks: participant.invulnerableTicks,
    });
  }

  #handleSuddenDeathStarted(transition: MatchActiveTickTransition): void {
    if (this.phase !== ARENA_MATCH_PHASE.SUDDEN_DEATH) {
      throw new Error('Sudden Death transition 与 timeline phase 不一致。');
    }
    for (const participantId of this.#participants.listByStatus(
      ARENA_PARTICIPANT_STATUS.RESPAWNING,
    )) {
      this.#respawnParticipant(participantId);
    }
    this.#emit(EVENT.SUDDEN_DEATH_STARTED, {
      remainingTicks: transition.remainingTicks,
    });
  }

  #resolveTimeout(): void {
    if (this.phase === ARENA_MATCH_PHASE.ENDED) return;
    this.#endMatch(this.#participants.resolveTimeout());
  }

  #endMatch({ winnerId, reason, isDraw }: MatchOutcome): void {
    if (this.phase === ARENA_MATCH_PHASE.ENDED) return;
    for (const participantId of this.#participants.listByStatus(
      ARENA_PARTICIPANT_STATUS.RESPAWNING,
    )) {
      this.#respawnParticipant(participantId);
    }
    const result = this.#matchTimeline.end({
      winnerId,
      reason,
      isDraw,
    });
    for (const id of this.config.participantIds) this.#physicsWorld.setMovementIntent(id, 0, 0);
    this.#emit(EVENT.MATCH_ENDED, { ...result });
  }

  #createSnapshot(includeInternal: false): ArenaMatchSnapshot;
  #createSnapshot(includeInternal: true): ArenaInternalMatchSnapshot;
  #createSnapshot(includeInternal: false, includeActionAffordance: false): MatchReadWorldSource;
  #createSnapshot(
    includeInternal: boolean,
    includeActionAffordance = !includeInternal,
  ): ArenaMatchSnapshot | ArenaInternalMatchSnapshot | MatchReadWorldSource {
    this.#assertUsable();
    const timeline = this.#matchTimeline.getSnapshot();
    const equipmentSupplySnapshot = this.#equipmentSupplyTimeline?.getSnapshot() ?? null;
    const equipmentSnapshots = this.#ruleEngine.listEquipmentSnapshots();
    const supplyByEquipmentInstance = new Map<
      string,
      ArenaInternalEquipmentSupplyTimelineSnapshot['activeSupplies'][number]
    >();
    const expiredSupplyEquipmentIds = new Set<string>();
    let activeSupplyProjection: ArenaPublicSupplyProjection | undefined;
    if (equipmentSupplySnapshot !== null) {
      for (const lifecycle of equipmentSupplySnapshot.activeSupplies) {
        if (supplyByEquipmentInstance.has(lifecycle.equipmentInstanceId)) {
          throw new RangeError(`供给 equipment instance ${lifecycle.equipmentInstanceId} 重复。`);
        }
        supplyByEquipmentInstance.set(lifecycle.equipmentInstanceId, lifecycle);
      }
      if (!includeInternal) {
        const projectionResult = this.#equipmentSupplyTimeline?.getPublicSupplyProjection({
          snapshotTick: timeline.tick,
          eventSequence: this.#eventSequence,
          equipment: equipmentSnapshots,
        });
        if (!projectionResult) throw new Error('供给 public projection 构造结果缺失。');
        activeSupplyProjection = projectionResult.projection;
        for (const instanceId of projectionResult.pendingExpiryEquipmentInstanceIds) {
          expiredSupplyEquipmentIds.add(instanceId);
        }
      }
    }
    // ActionAffordance is a public next-input projection, not authority state.
    // Internal hash snapshots omit it entirely instead of recomputing derived data.
    const ruleActors: readonly RuleActor[] = includeActionAffordance ? this.#createRuleActors() : [];
    const ruleActorById = new Map(ruleActors.map((actor) => [actor.id, actor]));
    const snapshot: ArenaMatchSnapshot = {
      schemaVersion: this.config.schemaVersion,
      physicsBackendVersion: this.config.physicsBackendVersion,
      configHash: this.configHash,
      ruleContentHash: this.ruleContentHash,
      matchSeed: this.matchSeed,
      tick: timeline.tick,
      activeTick: timeline.activeTick,
      phase: timeline.phase,
      remainingTicks: this.#matchTimeline.remainingTicks,
      eventSequence: this.#eventSequence,
      participants: this.config.participantIds.map((id) => {
        const participant = this.#participants.getSnapshot(id);
        const physics = this.#physicsWorld.getCharacterState(id);
        return {
          id,
          characterDefinitionId: requireMapValue(
            this.#characterRuntimes,
            id,
            `participant ${id} 缺少 character runtime。`,
          ).definitionId,
          status: participant.status,
          lives: participant.lives,
          eliminations: participant.eliminations,
          deaths: participant.deaths,
          hitstunTicks: participant.hitstunTicks,
          invulnerableTicks: participant.invulnerableTicks,
          respawnTicks: participant.respawnTicks,
          lastHitBy: participant.lastHitBy,
          lastHitTick: participant.lastHitTick,
          action: (() => {
            const action = this.#ruleEngine.getActionSnapshot(id);
            return {
              definitionId: action.definitionId,
              phase: action.phase,
              ticksRemaining: action.ticksRemaining,
              ...(action.commitment ? { commitment: action.commitment } : {}),
            };
          })(),
          actionRule: this.#ruleEngine.getParticipantActionRule(id),
          movement: (() => {
            const movement = this.#movementSystem.getSnapshot(id);
            return {
              ...movement,
              grounded: physics.grounded,
            };
          })(),
          ...(includeActionAffordance ? {
            actionAffordance: (() => {
              const actor = requireMapValue(
                ruleActorById,
                id,
                `participant ${id} 缺少 rule actor。`,
              );
              const capabilities = this.#movementSystem.projectCapabilities(id, {
                grounded: physics.grounded,
                canMove: actor.canAct,
              });
              return cloneSnapshotData(this.#ruleEngine.getActionAffordance({
                tick: timeline.tick,
                participantId: id,
                actors: ruleActors,
                additionalCandidates: this.#ruleEngine.getMovementActionCandidates(capabilities),
              }));
            })(),
          } : {}),
          equipment: (() => {
            const equipment = this.#ruleEngine.getHeldEquipment(id);
            return equipment ? {
              instanceId: equipment.instanceId,
              definitionId: equipment.definitionId,
              cooldownRemainingTicks: equipment.cooldownRemainingTicks,
            } : null;
          })(),
          position: { ...physics.position },
          velocity: { ...physics.velocity },
          facing: { ...physics.facing },
          grounded: physics.grounded,
          supportSurfaceId: physics.supportSurfaceId,
        };
      }),
      equipment: equipmentSnapshots
        .filter((equipment) => !expiredSupplyEquipmentIds.has(equipment.instanceId))
        .map((equipment) => ({
        schemaVersion: equipment.schemaVersion,
        instanceId: equipment.instanceId,
        definitionId: equipment.definitionId,
        spawnId: equipment.spawnId,
        locationState: equipment.locationState,
        ownerId: equipment.ownerId,
        position: equipment.position ? { ...equipment.position } : null,
        lastSafePosition: equipment.lastSafePosition
          ? { ...equipment.lastSafePosition }
          : null,
        cooldownRemainingTicks: equipment.cooldownRemainingTicks,
        revision: equipment.revision,
      })),
      ...(activeSupplyProjection === undefined ? {} : { activeSupplyProjection }),
      map: cloneSnapshotData(includeInternal
        ? this.#mapSystem.getStateSnapshot()
        : this.#mapSystem.getSnapshot()),
      result: timeline.result,
    };
    if (includeInternal) {
      return Object.freeze({
        ...snapshot,
        ...(this.#equipmentSupplyTimeline === null ? {} : {
          equipmentSupplyTimeline: cloneSnapshotData(
            this.#equipmentSupplyTimeline.getSnapshot(),
          ),
          equipmentSupplyDisposition: Object.freeze({
            schemaVersion: ARENA_EQUIPMENT_SUPPLY_DISPOSITION_SCHEMA_VERSION,
            expiredHeldSupplyEquipmentInstanceIds: Object.freeze(
              [...this.#ruleEngine.listExpiredHeldSupplyEquipmentInstanceIds()],
            ),
          }),
        }),
        rngStates: Object.freeze(Object.fromEntries(
          Object.entries(this.#rngStreams).map(([name, rng]) => [name, rng.snapshot()]),
        )),
      });
    }
    if (!includeActionAffordance) {
      return snapshot as unknown as MatchReadWorldSource;
    }
    return snapshot;
  }

  getLegacyFullSnapshotForAudit(): DeepReadonly<ArenaMatchSnapshot> {
    this.#assertUsable();
    this.#assertNoMatchReadBuild('public snapshot');
    if (this.#stepping) throw new Error('MatchCore step() 期间不能读取 public snapshot。');
    if (this.#callerInputValidationActive) {
      throw new Error('caller input validation 期间不能读取 public snapshot。');
    }
    const cached = this.#publicSnapshotCache;
    if (
      cached !== null
      && cached.tick === this.tick
      && cached.eventSequence === this.#eventSequence
      && cached.phase === this.phase
    ) return cached.snapshot;
    const snapshot = freezeSnapshotData(this.#createSnapshot(false));
    this.#publicSnapshotCache = Object.freeze({
      tick: snapshot.tick,
      eventSequence: snapshot.eventSequence,
      phase: this.phase,
      snapshot,
    });
    return snapshot;
  }

  createMatchReadBinding(descriptor: unknown): MatchReadBinding {
    this.#assertUsable();
    this.#assertNoMatchReadBuild('MatchRead binding');
    if (this.#stepping) throw new Error('step() 期间不能创建 MatchRead binding。');
    if (this.#callerInputValidationActive) {
      throw new Error('caller input validation 期间不能创建 MatchRead binding。');
    }
    if (this.#matchReadBindingCreating) {
      throw new Error('MatchRead binding 创建不可重入。');
    }
    if (this.tick !== 0 || this.#eventSequence !== 0) {
      throw new Error('MatchRead binding 只能在初始 authority identity 创建。');
    }
    if (this.#matchReadOwnerPort === null) {
      throw new Error('MatchCore MatchRead owner port 尚未初始化。');
    }
    this.#matchReadBindingCreating = true;
    try {
      return this.#withCallerInputValidation(() => (
        createMatchReadBindingForOwner(this.#matchReadOwnerPort as MatchReadOwnerPort, descriptor)
      ));
    } finally {
      this.#matchReadBindingCreating = false;
    }
  }

  createMatchReadReader(
    binding: MatchReadBinding,
    participantId: string,
    profile: ArenaMatchReadProfile,
  ): MatchReadReader {
    this.#assertUsable();
    this.#assertNoMatchReadBuild('MatchRead reader');
    if (this.#stepping) throw new Error('step() 期间不能创建 MatchRead reader。');
    if (this.#callerInputValidationActive) {
      throw new Error('caller input validation 期间不能创建 MatchRead reader。');
    }
    if (this.#matchReadBindingCreating) {
      throw new Error('MatchRead binding 创建期间不能创建 reader。');
    }
    if (this.tick !== 0 || this.#eventSequence !== 0) {
      throw new Error('MatchRead reader 只能在初始 authority identity 创建。');
    }
    if (this.#matchReadOwnerPort === null) {
      throw new Error('MatchCore MatchRead owner port 尚未初始化。');
    }
    return this.#withCallerInputValidation(() => createMatchReadReaderForOwner(
      this.#matchReadOwnerPort as MatchReadOwnerPort,
      binding,
      participantId,
      profile,
    ));
  }

  #createReadActionAffordanceOptions(
    participantId: string,
    tick: number,
  ): Readonly<{
    readonly tick: number;
    readonly participantId: string;
    readonly actors: readonly RuleActor[];
    readonly additionalCandidates: readonly ActionCandidate[];
  }> {
    if (tick !== this.tick) throw new RangeError('MatchRead action profile tick 已过期。');
    const actors = this.#createRuleActors();
    const actor = requireMapValue(
      new Map(actors.map((candidate) => [candidate.id, candidate])),
      participantId,
      `participant ${participantId} 缺少 rule actor。`,
    );
    const physics = this.#physicsWorld.getCharacterState(participantId);
    const capabilities = this.#movementSystem.projectCapabilities(participantId, {
      grounded: physics.grounded,
      canMove: actor.canAct,
    });
    return Object.freeze({
      tick,
      participantId,
      actors,
      additionalCandidates: this.#ruleEngine.getMovementActionCandidates(capabilities),
    });
  }

  #getReadWorldCandidate(
    identity: MatchReadModelIdentity,
  ): Readonly<{
    readonly snapshot: DeepReadonly<WorldSnapshotV2>;
    readonly publish: boolean;
  }> {
    const memo = this.#matchReadWorldMemo;
    if (
      memo !== null
      && memo.identity.compositionHash === identity.compositionHash
      && memo.identity.generation === identity.generation
      && memo.identity.tick === identity.tick
      && memo.identity.eventSequence === identity.eventSequence
      && memo.identity.phase === identity.phase
    ) return Object.freeze({ snapshot: memo.snapshot, publish: false });
    const snapshot = composeWorldSnapshotV2(
      this.#createSnapshot(false, false),
      identity,
      { requireActiveSupplyProjection: this.#equipmentSupplyTimeline !== null },
    );
    return Object.freeze({ snapshot, publish: true });
  }

  #createMatchReadModelReader<T>(
    binding: MatchReadBinding,
    participantId: string,
    profile: ArenaMatchReadProfile,
    buildCandidate: (
      identity: MatchReadModelIdentity,
    ) => MatchReadModelBuildCandidate<T>,
  ): { readonly read: () => DeepReadonly<T> } {
    const identityReader = this.createMatchReadReader(binding, participantId, profile);
    let currentIdentity: MatchReadModelIdentity | null = null;
    let currentResult: DeepReadonly<T> | null = null;
    let reading = false;
    return Object.freeze({
      read: (...args: never[]): DeepReadonly<T> => {
        if (args.length !== 0) throw new TypeError('MatchRead model reader.read() 不接受参数。');
        if (reading) throw new Error('MatchRead model reader.read() 不可重入。');
        reading = true;
        try {
          const identity = identityReader.read();
          if (currentIdentity === identity && currentResult !== null) return currentResult;
          const candidate = this.#withMatchReadBuild(() => {
            const built = buildCandidate(identity);
            const finalIdentity = this.#readMatchReadIdentityDuringBuild(participantId);
            if (
              finalIdentity.generation !== identity.generation
              || finalIdentity.tick !== identity.tick
              || finalIdentity.eventSequence !== identity.eventSequence
              || finalIdentity.phase !== identity.phase
            ) throw new Error('MatchRead model authority identity 在构造期间发生变化。');
            if (built.publishWorld && built.worldSnapshot === undefined) {
              throw new Error('MatchRead world memo candidate 缺少 snapshot。');
            }
            if (built.publishWorld && built.worldSnapshot !== undefined) {
              this.#matchReadWorldMemo = Object.freeze({
                identity,
                snapshot: built.worldSnapshot,
              });
            } else if (
              built.worldSnapshot !== undefined
              && (
                this.#matchReadWorldMemo === null
                || this.#matchReadWorldMemo.snapshot !== built.worldSnapshot
                || this.#matchReadWorldMemo.identity.compositionHash !== identity.compositionHash
                || this.#matchReadWorldMemo.identity.generation !== identity.generation
                || this.#matchReadWorldMemo.identity.tick !== identity.tick
                || this.#matchReadWorldMemo.identity.eventSequence !== identity.eventSequence
                || this.#matchReadWorldMemo.identity.phase !== identity.phase
              )
            ) {
              throw new Error('MatchRead world memo 未在共享 current identity 下发布。');
            }
            return built;
          });
          // The complete world/profile/frame candidate is built before either
          // the identity or result memo is published. A failure therefore
          // leaves the previous stable read available.
          currentIdentity = identity;
          currentResult = candidate.result;
          return candidate.result;
        } finally {
          reading = false;
        }
      },
    });
  }

  #snapshotMatchReadAuthorityIdentity(): {
    readonly generation: number;
    readonly tick: number;
    readonly eventSequence: number;
    readonly phase: ArenaMatchPhase;
  } {
    return Object.freeze({
      generation: 1,
      tick: this.tick,
      eventSequence: this.#eventSequence,
      phase: this.phase,
    });
  }

  #readMatchReadIdentityDuringBuild(
    participantId: string,
  ): {
    readonly generation: number;
    readonly tick: number;
    readonly eventSequence: number;
    readonly phase: ArenaMatchPhase;
  } {
    this.#assertUsable();
    if (!this.config.participantIds.includes(participantId)) {
      throw new RangeError(`未知 MatchRead participant ${participantId}。`);
    }
    return this.#snapshotMatchReadAuthorityIdentity();
  }

  createMatchReadFrameReader(
    binding: MatchReadBinding,
    participantId: string,
  ): MatchReadFrameReader {
    return this.#createMatchReadModelReader(
      binding,
      participantId,
      'local-context-primary',
      (identity) => {
        const world = this.#getReadWorldCandidate(identity);
        const affordance = this.#ruleEngine.getActionAffordanceProfile(
          this.#createReadActionAffordanceOptions(participantId, identity.tick),
          'local-context-primary',
        );
        const local = composeLocalActionSidecarV2(affordance, identity, participantId);
        return {
          result: composeMatchReadFrameV2(world.snapshot, local, identity),
          worldSnapshot: world.snapshot,
          publishWorld: world.publish,
        };
      },
    );
  }

  createMatchReadSidecarReader(
    binding: MatchReadBinding,
    participantId: string,
    profile: 'bot-mobility',
  ): MatchReadSidecarReader<BotMobilitySidecarV2>;
  createMatchReadSidecarReader(
    binding: MatchReadBinding,
    participantId: string,
    profile: 'full-audit',
  ): MatchReadSidecarReader<FullAuditSidecarV2>;
  createMatchReadSidecarReader(
    binding: MatchReadBinding,
    participantId: string,
    profile: 'bot-mobility' | 'full-audit',
  ): MatchReadSidecarReader<BotMobilitySidecarV2 | FullAuditSidecarV2> {
    if (profile === 'bot-mobility') {
      return this.#createMatchReadModelReader(
        binding,
        participantId,
        profile,
        (identity) => {
          const affordance = this.#ruleEngine.getActionAffordanceProfile(
            this.#createReadActionAffordanceOptions(participantId, identity.tick),
            profile,
          );
          return {
            result: composeBotMobilitySidecarV2(affordance, identity, participantId),
            publishWorld: false,
          };
        },
      );
    }
    return this.#createMatchReadModelReader(
      binding,
      participantId,
      profile,
      (identity) => {
        const affordance = this.#ruleEngine.getActionAffordanceProfile(
          this.#createReadActionAffordanceOptions(participantId, identity.tick),
          profile,
        );
        return {
          result: composeFullAuditSidecarV2(affordance, identity, participantId),
          publishWorld: false,
        };
      },
    );
  }

  getInternalCheckpointIdentity(): MatchInternalCheckpointIdentity {
    this.#assertNoMatchReadBuild('checkpoint');
    if (this.#callerInputValidationActive) {
      throw new Error('caller input validation 期间不能创建 checkpoint。');
    }
    if (this.#stepping) throw new Error('MatchCore 不允许在半 tick 创建 checkpoint。');
    const snapshot = this.#createSnapshot(true);
    return Object.freeze({
      tick: snapshot.tick,
      phase: this.phase,
      eventSequence: snapshot.eventSequence,
      stateHash: createMatchStateHash(snapshot),
    });
  }

  getStateHash(): string {
    this.#assertNoMatchReadBuild('state hash');
    if (this.#callerInputValidationActive) {
      throw new Error('caller input validation 期间不能读取 state hash。');
    }
    return createMatchStateHash(this.#createSnapshot(true));
  }

  getReplayMetadata(): MatchReplayMetadata {
    this.#assertNoMatchReadBuild('Replay metadata');
    if (this.#callerInputValidationActive) {
      throw new Error('caller input validation 期间不能读取 Replay metadata。');
    }
    return {
      schemaVersion: this.config.schemaVersion,
      physicsBackendVersion: this.config.physicsBackendVersion,
      configHash: this.configHash,
      ruleContentHash: this.ruleContentHash,
      matchSeed: this.matchSeed,
      config: {
        participantIds: [...this.config.participantIds],
        livesPerParticipant: this.config.livesPerParticipant,
        preparingTicks: this.config.preparingTicks,
        suddenDeathStartTick: this.config.suddenDeathStartTick,
        hardLimitTicks: this.config.hardLimitTicks,
        respawnTicks: this.config.respawnTicks,
        invulnerableTicks: this.config.invulnerableTicks,
        lastHitCreditTicks: this.config.lastHitCreditTicks,
        basePush: { ...this.config.basePush },
        participantCharacters: this.config.participantCharacters.map((assignment) => ({
          ...assignment,
        })),
        contentSelection: this.config.contentSelection,
        mapDefinitionId: this.config.mapDefinitionId,
        equipment: {
          initialSpawns: this.config.equipment.initialSpawns.map((spawn) => ({
            id: spawn.id,
            definitionId: spawn.definitionId,
            position: { ...spawn.position },
          })),
        },
        arena: {
          killY: this.config.arena.killY,
          surfaces: this.config.arena.surfaces.map((surface) => ({
            id: surface.id,
            center: { ...surface.center },
            halfExtents: { ...surface.halfExtents },
          })),
          spawns: this.config.arena.spawns.map((spawn) => ({ ...spawn })),
        },
        ...(this.config.airJumpHorizontalImpulse === undefined
          ? {}
          : { airJumpHorizontalImpulse: this.config.airJumpHorizontalImpulse }),
        ...(this.config.contextPrimaryMobilityEnabled === undefined
          ? {}
          : { contextPrimaryMobilityEnabled: this.config.contextPrimaryMobilityEnabled }),
      },
    };
  }

  destroy(): void {
    this.#assertNoMatchReadBuild('MatchCore.destroy()');
    if (this.#matchReadBindingCreating) {
      throw new Error('MatchRead binding 创建期间不能销毁 MatchCore。');
    }
    if (this.#callerInputValidationActive) {
      throw new Error('caller input validation 期间不能销毁 MatchCore。');
    }
    if (
      this.#destroyed
      && !this.#timeline
      && !this.#equipmentSupplyTimeline
      && !this.#participantSystem
      && !this.#movement
      && !this.#rules
      && !this.#map
      && !this.#physics
    ) return;
    if (this.#stepping) throw new Error('step() 期间不能销毁 MatchCore。');
    this.#destroyed = true;
    invalidateMatchReadOwner(this.#matchReadOwnerPort);
    this.#matchReadOwnerPort = null;
    this.#publicSnapshotCache = null;
    this.#matchReadWorldMemo = null;
    this.#events.length = 0;
    this.#characterRuntimes.clear();
    const errors: Error[] = [];
    if (this.#equipmentSupplyTimeline) {
      try {
        this.#equipmentSupplyTimeline.destroy();
        this.#equipmentSupplyTimeline = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'MatchCore equipment supply timeline 清理失败'));
      }
    }
    if (this.#timeline) {
      try {
        this.#terminalTimelineSnapshot = this.#matchTimeline.getSnapshot();
        this.#matchTimeline.destroy();
        this.#timeline = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'MatchCore timeline 清理失败'));
      }
    }
    if (this.#participantSystem) {
      try {
        this.#participants.destroy();
        this.#participantSystem = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'MatchCore participant 清理失败'));
      }
    }
    if (this.#movement) {
      try {
        this.#movementSystem.destroy();
        this.#movement = null;
        this.#movementPhysicsPort = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'MatchCore movement 清理失败'));
      }
    }
    if (this.#rules) {
      try {
        this.#ruleEngine.destroy();
        this.#rules = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'MatchCore rules 清理失败'));
      }
    }
    if (this.#map) {
      try {
        this.#mapSystem.destroy();
        this.#map = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'MatchCore map 清理失败'));
      }
    }
    if (this.#physics) {
      try {
        this.#physicsWorld.destroy();
        this.#physics = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'MatchCore physics 清理失败'));
      }
    }
    if (errors.length > 0) {
      const cleanupError = Object.assign(new Error('MatchCore 清理未完整完成。'), {
        causes: Object.freeze([...errors]),
      });
      throw cleanupError;
    }
  }
}

export { ARENA_MATCH_EVENT } from '@number-strategy-jump/arena-contracts';
