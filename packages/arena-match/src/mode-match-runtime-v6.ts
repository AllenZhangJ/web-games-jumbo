import {
  ARENA_MATCH_EVENT_V6,
  ARENA_SUPPLY_AUTHORITY_FACT_MAX_RETAINED_COUNT_V1,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createArenaMatchEventV6,
  createArenaLocalJumpAvailabilityV1,
  createArenaSupplyCadenceSnapshotV1,
  createArenaSupplyAuthorityFactsV1,
  createDeterministicDataHash,
  createMatchReadFrameV3Audit,
  createModeResultV3Payload,
  normalizeInputFrames,
  type ArenaInputFrame,
  type ArenaMatchEventV6,
  type ArenaLocalJumpAvailabilityV1,
  type ArenaSupplyCadenceSnapshotV1,
  type ArenaSupplyAuthorityFactV1,
  type DeepReadonly,
  type MatchReadFrameV3,
  type MatchReadFrameV3AuditOptions,
  type ModeResultV3Payload,
} from '@number-strategy-jump/arena-contracts';
import { DuelModeAdapterV6 } from './duel-mode-adapter-v6.js';
import { ModeObjectivePolicyResolverV1 } from './mode-objective-policy-resolver-v1.js';
import { ModeResultPolicyResolverV1 } from './mode-result-policy-resolver-v1.js';
import { ModeTimelinePolicyResolverV1 } from './mode-timeline-policy-resolver-v1.js';
import {
  createArenaMatchConfigV6,
  type ArenaMatchConfigV6,
} from './match-config-v6.js';
import {
  createArenaModeCheckpointV2,
  type ArenaModeCheckpointV2,
  type ArenaModeCheckpointStateV2,
} from './mode-checkpoint-v2.js';
import {
  MODE_MATCH_RUNTIME_CHECKPOINT_V1_SCHEMA_VERSION,
  createModeMatchRuntimeCheckpointV1,
  validateModeMatchRuntimeCheckpointV1,
  type ModeMatchRuntimeCheckpointV1,
} from './mode-match-runtime-checkpoint-v1.js';
import {
  MODE_MATCH_RUNTIME_CHECKPOINT_V2_SCHEMA_VERSION,
  createModeMatchRuntimeCheckpointV2,
  validateModeMatchRuntimeCheckpointV2,
  type ModeMatchRuntimeCheckpointV2,
} from './mode-match-runtime-checkpoint-v2.js';
import {
  MODE_MATCH_RUNTIME_CHECKPOINT_V3_SCHEMA_VERSION,
  createModeMatchRuntimeCheckpointV3,
  validateModeMatchRuntimeCheckpointV3,
  type ModeMatchRuntimeCheckpointV3,
} from './mode-match-runtime-checkpoint-v3.js';
import {
  MODE_MATCH_RUNTIME_CHECKPOINT_V4_SCHEMA_VERSION,
  createModeMatchRuntimeCheckpointV4,
  validateModeMatchRuntimeCheckpointV4,
  type ModeMatchRuntimeCheckpointV4,
} from './mode-match-runtime-checkpoint-v4.js';
import {
  MODE_MATCH_RUNTIME_TERMINAL_EVIDENCE_V1_SCHEMA_VERSION,
  createModeMatchRuntimeTerminalEvidenceV1,
  type ModeMatchRuntimeTerminalEvidenceV1,
} from './mode-match-runtime-terminal-evidence-v1.js';
import {
  MODE_MATCH_RUNTIME_TERMINAL_EVIDENCE_V2_SCHEMA_VERSION,
  createModeMatchRuntimeTerminalEvidenceV2,
  type ModeMatchRuntimeTerminalEvidenceV2,
} from './mode-match-runtime-terminal-evidence-v2.js';
import {
  MODE_RUNTIME_LIFECYCLE_STATE_V1,
  type ModeRuntimeLifecycleStateV1,
} from './mode-runtime-contracts-v1.js';
import {
  RACE_MODE_PREPARING_TICKS_V1,
  RaceModeSystem,
  type RaceModeStateSnapshotV1,
} from './race-mode-system.js';
import {
  ARENA_REPLAY_V6_SCHEMA_VERSION,
  createArenaReplayV6,
  type ArenaReplayV6,
  type ArenaReplayV6Checkpoint,
} from './replay-v6.js';
import {
  SurvivalModeSystem,
  type SurvivalModeStateSnapshotV1,
} from './survival-mode-system.js';

export const MODE_MATCH_RUNTIME_V6_STATE = Object.freeze({
  CREATED: 'created',
  RUNNING: 'running',
  PAUSED: 'paused',
  ENDED: 'ended',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ModeMatchRuntimeV6State = typeof MODE_MATCH_RUNTIME_V6_STATE[
  keyof typeof MODE_MATCH_RUNTIME_V6_STATE
];

export const MODE_MATCH_RUNTIME_V6_LIFECYCLE_POLICY = Object.freeze({
  status: 'production-unreachable',
  hardGate: false,
  operationGuardPrecedesBusinessStateValidation: true,
  authorityAndModeDriverCallsCheckedBeforeCrossOwnerProgress: true,
  publicStateCheckpointAndTerminalReadsRejectOperationIntermediateState: true,
  swallowedAuthorityOrModeDriverReentryFailsClosed: true,
  stickyReentryUsesSequenceAndFirstError: true,
  cleanupCallbacksCheckedBeforeOwnershipRelease: true,
  swallowedCleanupReentryStopsLaterOwners: true,
  completeSupplyFactPrefixBoundedAndRetainedForV4Evidence: true,
  explicitSupplyFactsRequiredEveryCommittedStep: true,
  explicitLocalJumpAvailabilityRequiredEveryStartAndStep: true,
  legacySurvivalRestoreCannotClaimCompleteSupplyEvidence: true,
  destroyFastPathChecksOperationBeforeIdempotence: true,
  validationStatus: 'not-run',
} as const);

export type ModeMatchRuntimeV6ModeOptions =
  | Readonly<{
    readonly kind: 'duel';
    readonly definitionBundle: unknown;
    readonly timelinePolicyBundle?: unknown;
    readonly objectivePolicyBundle?: unknown;
    readonly resultPolicyBundle?: unknown;
  }>
  | Readonly<{
    readonly kind: 'race';
    readonly fixture: unknown;
    readonly timelinePolicyBundle?: unknown;
    readonly objectivePolicyBundle?: unknown;
  }>
  | Readonly<{
    readonly kind: 'survival';
    readonly fixture: unknown;
    readonly timelinePolicyBundle?: unknown;
    readonly objectivePolicyBundle?: unknown;
  }>;

export interface ModeMatchRuntimeV6Options {
  readonly checkpointIntervalTicks: number;
  readonly config: unknown;
  readonly expectedMatchSeed: number;
  readonly localParticipantId: string;
  readonly mode: ModeMatchRuntimeV6ModeOptions;
  readonly worldAuthority: ModeMatchWorldAuthorityV6;
}

export interface ModeMatchRuntimeV6RestoreOptions {
  readonly checkpoint: unknown;
  readonly mode: ModeMatchRuntimeV6ModeOptions;
  readonly worldAuthority: ModeMatchWorldAuthorityCheckpointV1;
}

export interface ModeMatchRuntimeV6RestoreV2Options {
  readonly checkpoint: unknown;
  readonly mode: ModeMatchRuntimeV6ModeOptions;
  readonly worldAuthority: ModeMatchWorldAuthorityCheckpointV1;
}

export interface ModeMatchRuntimeV6RestoreV3Options {
  readonly checkpoint: unknown;
  readonly mode: ModeMatchRuntimeV6ModeOptions;
  readonly worldAuthority: ModeMatchWorldAuthorityCheckpointV1;
}

export interface ModeMatchRuntimeV6RestoreV4Options {
  readonly checkpoint: unknown;
  readonly mode: ModeMatchRuntimeV6ModeOptions;
  readonly worldAuthority: ModeMatchWorldAuthorityCheckpointV1;
}

export interface ModeMatchResolutionV6 {
  readonly tick: number;
  readonly commands: readonly unknown[];
  readonly modeProjection: MatchReadFrameV3['worldSnapshot']['modeProjection'];
  readonly modeState: ArenaModeCheckpointStateV2;
  readonly modeResult: DeepReadonly<ModeResultV3Payload> | null;
}

export type ModeMatchFactsResolverV6 = (facts: unknown) => ModeMatchResolutionV6;

export interface ModeMatchWorldAuthorityV6 {
  start(context: Readonly<{
    readonly config: ArenaMatchConfigV6;
    readonly expectedMatchSeed: number;
    readonly localParticipantId: string;
  }>): unknown;
  step(request: Readonly<{
    readonly tick: number;
    readonly inputFrames: readonly ArenaInputFrame[];
    readonly resolveMode: ModeMatchFactsResolverV6;
  }>): unknown;
  exportCheckpoint(current: Readonly<{
    readonly readFrame: DeepReadonly<MatchReadFrameV3>;
    readonly readFrameAudit: MatchReadFrameV3AuditOptions;
    readonly stateHash: string;
  }>): unknown;
  restore(request: Readonly<{
    readonly checkpoint: DeepReadonly<unknown>;
    readonly config: ArenaMatchConfigV6;
    readonly expectedMatchSeed: number;
    readonly localParticipantId: string;
    readonly runtimeState: 'running' | 'paused';
  }>): unknown;
  pause(): unknown;
  resume(): unknown;
  destroy(): unknown;
}

export interface ModeMatchWorldAuthorityCheckpointV1 extends ModeMatchWorldAuthorityV6 {
  exportCheckpoint(): unknown;
  restore(request: Readonly<{
    readonly checkpoint: DeepReadonly<unknown>;
    readonly config: ArenaMatchConfigV6;
    readonly expectedMatchSeed: number;
    readonly localParticipantId: string;
    readonly runtimeState: 'running' | 'paused';
  }>): unknown;
}

export interface ModeMatchRuntimeV6StartOutcome {
  readonly readFrame: DeepReadonly<MatchReadFrameV3>;
  readonly readFrameAudit: MatchReadFrameV3AuditOptions;
  readonly supplyCadence: DeepReadonly<ArenaSupplyCadenceSnapshotV1> | null;
  /**
   * Optional versioned read capability. Authorities without a local touch
   * consumer omit it; `null` is never a public substitute for absence.
   */
  readonly localJumpAvailability?: ArenaLocalJumpAvailabilityV1;
}

export interface ModeMatchRuntimeV6StepOutcome extends ModeMatchRuntimeV6StartOutcome {
  readonly events: readonly DeepReadonly<ArenaMatchEventV6>[];
  readonly supplyFacts: readonly DeepReadonly<ArenaSupplyAuthorityFactV1>[];
  readonly supplyCadence: DeepReadonly<ArenaSupplyCadenceSnapshotV1> | null;
}

export interface ModeMatchRuntimeV6RetainedResourceSnapshot {
  readonly authorityOwned: boolean;
  readonly modeDriverOwned: boolean;
  readonly ownedResourceCount: number;
  readonly committedRecordCount: number;
}

type PortMethod = (...arguments_: readonly unknown[]) => unknown;
type ModeMatchRuntimeV6Operation =
  | 'restore'
  | 'start'
  | 'step'
  | 'pause'
  | 'resume'
  | 'runtime-checkpoint-v1-read'
  | 'runtime-checkpoint-v2-read'
  | 'runtime-checkpoint-v3-read'
  | 'runtime-checkpoint-v4-read'
  | 'mode-checkpoint-read'
  | 'mode-checkpoints-read'
  | 'terminal-replay-read'
  | 'terminal-evidence-read'
  | 'terminal-evidence-v2-read'
  | 'destroy';

interface WorldAuthorityPort {
  readonly start: PortMethod;
  readonly step: PortMethod;
  readonly exportCheckpoint: PortMethod;
  readonly restore: PortMethod;
  readonly pause: PortMethod;
  readonly resume: PortMethod;
  readonly destroy: PortMethod;
}

interface ModeDriver {
  readonly kind: ArenaMatchConfigV6['modeKind'];
  readonly contentHash: string;
  start(
    initialPhase: MatchReadFrameV3['worldSnapshot']['phase'],
    preparationRemainingTicks: number | null,
  ): ModeMatchResolutionV6;
  step(facts: unknown, tick: number): ModeMatchResolutionV6;
  restore(
    checkpoint: ArenaModeCheckpointV2,
    frame: DeepReadonly<MatchReadFrameV3>,
    runtimeState: 'running' | 'paused',
  ): ModeMatchResolutionV6;
  pause(): void;
  resume(): void;
  destroy(): void;
}

interface NormalizedStart {
  readonly readFrame: DeepReadonly<MatchReadFrameV3>;
  readonly readFrameAudit: MatchReadFrameV3AuditOptions;
  readonly supplyCadence: DeepReadonly<ArenaSupplyCadenceSnapshotV1> | null;
  readonly localJumpAvailability?: ArenaLocalJumpAvailabilityV1;
  readonly stateHash: string;
}

interface NormalizedStep extends NormalizedStart {
  readonly events: readonly DeepReadonly<ArenaMatchEventV6>[];
  readonly supplyFacts: readonly DeepReadonly<ArenaSupplyAuthorityFactV1>[];
  readonly supplyCadence: DeepReadonly<ArenaSupplyCadenceSnapshotV1> | null;
  readonly appliedModeCommandHash: string;
}

const OPTION_KEYS = new Set([
  'checkpointIntervalTicks',
  'config',
  'expectedMatchSeed',
  'localParticipantId',
  'mode',
  'worldAuthority',
]);
const RESTORE_OPTION_KEYS = new Set(['checkpoint', 'mode', 'worldAuthority']);
const DUEL_MODE_KEYS = new Set([
  'kind', 'definitionBundle', 'timelinePolicyBundle', 'objectivePolicyBundle', 'resultPolicyBundle',
]);
const DUEL_MODE_REQUIRED_KEYS = new Set(['kind', 'definitionBundle']);
const FIXTURE_MODE_KEYS = new Set([
  'kind', 'fixture', 'timelinePolicyBundle', 'objectivePolicyBundle',
]);
const FIXTURE_MODE_REQUIRED_KEYS = new Set(['kind', 'fixture']);
const START_KEYS = new Set([
  'readFrame', 'readFrameAudit', 'supplyCadence', 'localJumpAvailability', 'stateHash',
]);
const START_REQUIRED_KEYS = new Set([
  'readFrame', 'readFrameAudit', 'supplyCadence', 'stateHash',
]);
const STEP_KEYS = new Set([
  'readFrame',
  'readFrameAudit',
  'events',
  'supplyFacts',
  'supplyCadence',
  'localJumpAvailability',
  'stateHash',
  'appliedModeCommandHash',
]);
const STEP_REQUIRED_KEYS = new Set([
  'readFrame',
  'readFrameAudit',
  'events',
  'supplyFacts',
  'supplyCadence',
  'stateHash',
  'appliedModeCommandHash',
]);
const DUEL_FACT_KEYS = new Set([
  'phase', 'preparationRemainingTicks', 'result', 'timelineFacts', 'objectiveFacts',
]);
const DUEL_FACT_REQUIRED_KEYS = new Set(['phase', 'preparationRemainingTicks', 'result']);
const RACE_ONLY_EVENT_TYPES: ReadonlySet<ArenaMatchEventV6['type']> = new Set([
  ARENA_MATCH_EVENT_V6.RACE_SAFE_ANCHOR_COMMITTED,
  ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED,
]);
const SURVIVAL_ONLY_EVENT_TYPES: ReadonlySet<ArenaMatchEventV6['type']> = new Set([
  ARENA_MATCH_EVENT_V6.SURVIVAL_ENEMY_SLOT_CHANGED,
  ARENA_MATCH_EVENT_V6.SURVIVAL_PLAYER_FALL_COUNTED,
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;
const MAX_SYNC_RETURN_PROTOTYPE_DEPTH = 32;
const NATIVE_PROMISE_PROTOTYPE = Promise.prototype;
const NATIVE_PROMISE_CONSTRUCTOR = Promise;
const CAPTURED_PROMISE_THEN_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  NATIVE_PROMISE_PROTOTYPE,
  'then',
);
if (CAPTURED_PROMISE_THEN_DESCRIPTOR === undefined
  || !Object.hasOwn(CAPTURED_PROMISE_THEN_DESCRIPTOR, 'value')
  || typeof CAPTURED_PROMISE_THEN_DESCRIPTOR.value !== 'function') {
  throw new TypeError('ModeMatchRuntimeV6无法捕获原生Promise.prototype.then。');
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
  throw new TypeError('ModeMatchRuntimeV6无法捕获原生Promise[Symbol.species]。');
}
const NATIVE_PROMISE_SPECIES_GETTER = CAPTURED_PROMISE_SPECIES_DESCRIPTOR.get;
const NATIVE_PROMISE_SPECIES_FLAGS = Object.freeze({
  configurable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.configurable,
  enumerable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.enumerable,
});
const NOOP = (): void => {};

function safelyWrapThrownError(value: unknown, message: string): Error {
  const error = new Error(message);
  Object.defineProperty(error, 'cause', {
    value,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return error;
}

function requireKeys(value: object, keys: ReadonlySet<string>, name: string): void {
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
}

function dataField(record: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function dataMethod(target: unknown, methodName: string, ownerName: string): PortMethod {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${ownerName}.${methodName}()不存在。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  for (
    let depth = 0;
    cursor !== null && depth < MAX_SYNC_RETURN_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(cursor)) throw new TypeError(`${ownerName}原型链循环。`);
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, methodName);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${ownerName}.${methodName}必须是数据方法。`);
      }
      const method = descriptor.value as PortMethod;
      return (...arguments_: readonly unknown[]) => Reflect.apply(method, target, arguments_);
    }
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  if (cursor !== null) {
    throw new RangeError(`${ownerName}原型链超过${MAX_SYNC_RETURN_PROTOTYPE_DEPTH}层。`);
  }
  throw new TypeError(`${ownerName}.${methodName}()不存在。`);
}

function assertNativePromiseIntegrity(): void {
  const descriptor = Object.getOwnPropertyDescriptor(NATIVE_PROMISE_PROTOTYPE, 'then');
  if (descriptor === undefined
    || !Object.hasOwn(descriptor, 'value')
    || descriptor.value !== NATIVE_PROMISE_THEN
    || descriptor.configurable !== NATIVE_PROMISE_THEN_FLAGS.configurable
    || descriptor.enumerable !== NATIVE_PROMISE_THEN_FLAGS.enumerable
    || descriptor.writable !== NATIVE_PROMISE_THEN_FLAGS.writable) {
    throw new TypeError('ModeMatchRuntimeV6原生Promise.prototype.then描述符漂移。');
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
    throw new TypeError('ModeMatchRuntimeV6原生Promise[Symbol.species]描述符漂移。');
  }
}

function rejectAsyncSyncReturn<T>(value: T, name: string): T {
  assertNativePromiseIntegrity();
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return value;
  const visited = new Set<object>();
  let cursor: object | null = value as object;
  let thenDescriptor: PropertyDescriptor | null = null;
  let constructorDescriptor: PropertyDescriptor | null = null;
  for (
    let depth = 0;
    cursor !== null && depth < MAX_SYNC_RETURN_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(cursor)) throw new TypeError(`${name} then原型链循环。`);
    visited.add(cursor);
    thenDescriptor ??= Object.getOwnPropertyDescriptor(cursor, 'then') ?? null;
    constructorDescriptor ??=
      Object.getOwnPropertyDescriptor(cursor, 'constructor') ?? null;
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  if (cursor !== null) {
    throw new RangeError(`${name} then原型链超过${MAX_SYNC_RETURN_PROTOTYPE_DEPTH}层。`);
  }
  if (constructorDescriptor !== null && !Object.hasOwn(constructorDescriptor, 'value')) {
    throw new TypeError(`${name}返回访问器constructor。`);
  }
  if (constructorDescriptor?.value === NATIVE_PROMISE_CONSTRUCTOR) {
    assertNativePromiseSpeciesIntegrity();
    let nativePromise = false;
    try {
      Reflect.apply(NATIVE_PROMISE_THEN, value, [NOOP, NOOP]);
      nativePromise = true;
    } catch {
      // constructor identity can be spoofed; ordinary thenables stay descriptor-only.
    }
    if (nativePromise) throw new TypeError(`${name}必须同步完成。`);
  }
  if (thenDescriptor === null) return value;
  if (!Object.hasOwn(thenDescriptor, 'value')) {
    throw new TypeError(`${name}返回访问器thenable。`);
  }
  throw new TypeError(`${name}返回then字段，必须同步完成。`);
}

function hash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name}必须是8位小写十六进制hash。`);
  }
  return value;
}

function uint32(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffff_ffff) {
    throw new RangeError(`${name}必须是uint32安全整数。`);
  }
  return value as number;
}

function positiveSafeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new RangeError(`${name}必须是正安全整数。`);
  }
  return value as number;
}

function preparationTicksForPhase(value: unknown, phase: unknown): number | null {
  if (phase === 'preparing') {
    if (!Number.isSafeInteger(value) || (value as number) < 0) {
      throw new RangeError('Duel preparing facts必须提供非负安全整数倒计时。');
    }
    return value as number;
  }
  if (value !== null) throw new RangeError('Duel非preparing facts倒计时必须为null。');
  return null;
}

function sameData(left: unknown, right: unknown, name: string): boolean {
  return createDeterministicDataHash(left, `${name} left`)
    === createDeterministicDataHash(right, `${name} right`);
}

function captureWorldAuthority(value: unknown): WorldAuthorityPort {
  const destroy = dataMethod(value, 'destroy', 'ModeMatchWorldAuthorityV6');
  try {
    return Object.freeze({
      start: dataMethod(value, 'start', 'ModeMatchWorldAuthorityV6'),
      step: dataMethod(value, 'step', 'ModeMatchWorldAuthorityV6'),
      exportCheckpoint: dataMethod(value, 'exportCheckpoint', 'ModeMatchWorldAuthorityV6'),
      restore: dataMethod(value, 'restore', 'ModeMatchWorldAuthorityV6'),
      pause: dataMethod(value, 'pause', 'ModeMatchWorldAuthorityV6'),
      resume: dataMethod(value, 'resume', 'ModeMatchWorldAuthorityV6'),
      destroy,
    });
  } catch (error) {
    try {
      rejectAsyncSyncReturn(destroy(), 'ModeMatchWorldAuthorityV6构造期destroy');
    } catch (cleanupError) {
      const failure = safelyWrapThrownError(error, 'ModeMatchWorldAuthorityV6端口捕获失败。');
      Object.defineProperty(failure, 'cleanupErrors', {
        value: Object.freeze([
          safelyWrapThrownError(cleanupError, 'ModeMatchWorldAuthorityV6构造期清理失败。'),
        ]),
        enumerable: false,
      });
      throw failure;
    }
    throw safelyWrapThrownError(error, 'ModeMatchWorldAuthorityV6端口捕获失败。');
  }
}

function raceProjection(snapshot: RaceModeStateSnapshotV1): MatchReadFrameV3['worldSnapshot']['modeProjection'] {
  const processedTick = snapshot.lastProcessedTick;
  return Object.freeze({
    schemaVersion: 1,
    modeDefinitionId: snapshot.modeDefinitionId,
    revision: snapshot.revision,
    preparationRemainingTicks: processedTick < RACE_MODE_PREPARING_TICKS_V1
      ? RACE_MODE_PREPARING_TICKS_V1 - Math.max(0, processedTick)
      : null,
    state: Object.freeze({
      kind: 'race',
      finishGateId: snapshot.finishGateId,
      participants: Object.freeze(snapshot.participants.map((participant) => Object.freeze({
        participantId: participant.participantId,
        status: participant.status,
        safeAnchorId: participant.safeAnchorId,
        progressOrdinal: participant.progressOrdinal,
        respawnReadyTick: participant.respawnReadyTick,
        finishTick: participant.finishTick,
        rank: participant.rank,
      }))),
    }),
  });
}

function raceCheckpointState(snapshot: RaceModeStateSnapshotV1): ArenaModeCheckpointStateV2 {
  return Object.freeze({
    kind: 'race',
    revision: snapshot.revision,
    lastProcessedTick: snapshot.lastProcessedTick,
    finishGateId: snapshot.finishGateId,
    participants: snapshot.participants,
  });
}

function survivalProjection(
  snapshot: SurvivalModeStateSnapshotV1,
): MatchReadFrameV3['worldSnapshot']['modeProjection'] {
  return Object.freeze({
    schemaVersion: 1,
    modeDefinitionId: snapshot.modeDefinitionId,
    revision: snapshot.revision,
    preparationRemainingTicks: null,
    state: Object.freeze({
      kind: 'survival',
      playerParticipantId: snapshot.playerParticipantId,
      fallCount: snapshot.fallCount,
      terminalFallCount: snapshot.terminalFallCount,
      survivedTicks: snapshot.survivedTicks,
      pressureStage: snapshot.pressureStage,
      enemySlots: Object.freeze(snapshot.enemySlots.map((slot) => Object.freeze({
        slotId: slot.slotId,
        participantId: slot.participantId,
        active: slot.active,
        generation: slot.generation,
        anchorId: slot.anchorId,
      }))),
    }),
  });
}

function survivalCheckpointState(
  snapshot: SurvivalModeStateSnapshotV1,
): ArenaModeCheckpointStateV2 {
  return Object.freeze({
    kind: 'survival',
    revision: snapshot.revision,
    lastProcessedTick: snapshot.lastProcessedTick,
    playerParticipantId: snapshot.playerParticipantId,
    playerStatus: snapshot.playerStatus,
    playerRespawnReadyTick: snapshot.playerRespawnReadyTick,
    fallCount: snapshot.fallCount,
    terminalFallCount: snapshot.terminalFallCount,
    survivedTicks: snapshot.survivedTicks,
    pressureStage: snapshot.pressureStage,
    enemySlots: snapshot.enemySlots,
  });
}

function createModeDriver(config: ArenaMatchConfigV6, value: unknown): ModeDriver {
  const source = assertPlainRecord(value, 'ModeMatchRuntimeV6 mode');
  if (dataField(source, 'kind', 'ModeMatchRuntimeV6 mode') !== config.modeKind) {
    throw new RangeError('ModeMatchRuntimeV6 mode kind与config不一致。');
  }
  if (config.modeKind === 'duel') {
    assertKnownKeys(source, DUEL_MODE_KEYS, 'ModeMatchRuntimeV6 duel mode');
    requireKeys(source, DUEL_MODE_REQUIRED_KEYS, 'ModeMatchRuntimeV6 duel mode');
    const adapter = new DuelModeAdapterV6(
      config,
      dataField(source, 'definitionBundle', 'ModeMatchRuntimeV6 duel mode'),
    );
    const timelinePolicyResolver = Object.hasOwn(source, 'timelinePolicyBundle')
      ? new ModeTimelinePolicyResolverV1(
        config,
        dataField(source, 'timelinePolicyBundle', 'ModeMatchRuntimeV6 duel mode'),
      )
      : null;
    const objectivePolicyResolver = Object.hasOwn(source, 'objectivePolicyBundle')
      ? new ModeObjectivePolicyResolverV1(
        config,
        dataField(source, 'objectivePolicyBundle', 'ModeMatchRuntimeV6 duel mode'),
      )
      : null;
    const resultPolicyResolver = Object.hasOwn(source, 'resultPolicyBundle')
      ? new ModeResultPolicyResolverV1(
        config,
        dataField(source, 'resultPolicyBundle', 'ModeMatchRuntimeV6 duel mode'),
      )
      : null;
    let modeDriverContentHash: string;
    if (timelinePolicyResolver !== null) {
      modeDriverContentHash = createDeterministicDataHash({
        authorityPolicyContentHash: adapter.definitionBundleContentHash,
        timelinePolicy: timelinePolicyResolver.definitionBundle,
        objectivePolicy: objectivePolicyResolver?.definitionBundle ?? null,
        resultPolicy: resultPolicyResolver?.definitionBundle ?? null,
      }, 'Duel Mode driver authority, timeline, objective and result policy bundle');
    } else if (objectivePolicyResolver !== null || resultPolicyResolver !== null) {
      modeDriverContentHash = createDeterministicDataHash({
        authorityPolicyContentHash: adapter.definitionBundleContentHash,
        objectivePolicy: objectivePolicyResolver?.definitionBundle ?? null,
        resultPolicy: resultPolicyResolver?.definitionBundle ?? null,
      }, 'Duel Mode driver authority, objective and result policy bundle');
    } else {
      modeDriverContentHash = adapter.definitionBundleContentHash;
    }
    let lifecycle: ModeRuntimeLifecycleStateV1 = MODE_RUNTIME_LIFECYCLE_STATE_V1.CREATED;
    let revision = 0;
    let projection = adapter.mapV5Phase({ phase: 'preparing' });
    let lastTick = -1;
    const resolution = (
      tick: number,
      result: DeepReadonly<ModeResultV3Payload> | null,
      preparationRemainingTicks: number | null = null,
    ) => (
      Object.freeze({
        tick,
        commands: Object.freeze([]),
        modeProjection: Object.freeze({
          schemaVersion: 1,
          modeDefinitionId: config.modeDefinitionId,
          revision,
          preparationRemainingTicks,
          state: projection,
        }),
        modeState: Object.freeze({ kind: 'duel', suddenDeath: projection.suddenDeath }),
        modeResult: result,
      })
    );
    return Object.freeze({
      kind: 'duel' as const,
      contentHash: modeDriverContentHash,
      start(
        initialPhase: MatchReadFrameV3['worldSnapshot']['phase'],
        preparationRemainingTicks: number | null,
      ) {
        if (lifecycle !== 'created') throw new Error('Duel driver只能启动一次。');
        if (initialPhase === 'ended') throw new RangeError('Duel driver不能从ended phase启动。');
        projection = adapter.mapV5Phase({ phase: initialPhase });
        timelinePolicyResolver?.assertDuelObservation({
          totalTick: 0,
          activeTick: 0,
          phase: initialPhase,
          preparationRemainingTicks,
        }, false);
        lifecycle = 'active';
        return resolution(-1, null, preparationRemainingTicks);
      },
      step(facts: unknown, tick: number) {
        if (lifecycle !== 'active') throw new Error('Duel driver只在active状态接受step。');
        if (tick !== lastTick + 1) throw new RangeError('Duel driver tick必须连续。');
        const fact = cloneFrozenData(facts, 'ModeMatchRuntimeV6 duel facts');
        assertKnownKeys(fact, DUEL_FACT_KEYS, 'ModeMatchRuntimeV6 duel facts');
        requireKeys(fact, DUEL_FACT_REQUIRED_KEYS, 'ModeMatchRuntimeV6 duel facts');
        const nextProjection = adapter.mapV5Phase({ phase: fact.phase });
        if (!sameData(nextProjection, projection, 'Duel projection')) revision += 1;
        projection = nextProjection;
        const preparationRemainingTicks = preparationTicksForPhase(
          fact.preparationRemainingTicks,
          fact.phase,
        );
        const mappedResult = fact.result === null ? null : createModeResultV3Payload(
          adapter.mapV5Result(fact.result),
        );
        if (timelinePolicyResolver !== null) {
          const timelineFacts = dataField(
            fact,
            'timelineFacts',
            'ModeMatchRuntimeV6 duel facts',
          );
          timelinePolicyResolver.assertDuelObservation(
            timelineFacts,
            mappedResult !== null,
          );
        }
        const objectiveResult = mappedResult === null || objectivePolicyResolver === null
          ? mappedResult
          : objectivePolicyResolver.assertTerminalObjective(
            dataField(fact, 'objectiveFacts', 'ModeMatchRuntimeV6 duel facts'),
            mappedResult,
          );
        const result = objectiveResult === null
          ? null
          : resultPolicyResolver?.assertResult(objectiveResult, tick) ?? objectiveResult;
        if (resultPolicyResolver === null && result !== null && result.endedAtTick !== tick) {
          throw new RangeError('Duel result endedAtTick必须等于当前authority tick。');
        }
        lastTick = tick;
        if (result !== null) lifecycle = 'ended';
        return resolution(tick, result, preparationRemainingTicks);
      },
      restore(
        checkpoint: ArenaModeCheckpointV2,
        frame: DeepReadonly<MatchReadFrameV3>,
        runtimeState: 'running' | 'paused',
      ) {
        if (lifecycle !== 'created') throw new Error('Duel driver只能从created恢复。');
        if (checkpoint.modeState.kind !== 'duel' || checkpoint.modeResult !== null) {
          throw new RangeError('Duel driver checkpoint类型或终局身份无效。');
        }
        const world = frame.worldSnapshot;
        if (world.phase === 'ended') throw new RangeError('Duel driver不能恢复终局phase。');
        if (world.modeProjection.state.kind !== 'duel') {
          throw new RangeError('Duel driver frame projection类型无效。');
        }
        const expectedProjection = adapter.mapV5Phase({ phase: world.phase });
        if (
          !sameData(expectedProjection, world.modeProjection.state, 'Duel restore projection')
          || checkpoint.modeState.suddenDeath !== expectedProjection.suddenDeath
        ) throw new RangeError('Duel driver checkpoint/frame phase身份漂移。');
        timelinePolicyResolver?.assertDuelObservation({
          totalTick: world.tick,
          activeTick: world.activeTick,
          phase: world.phase,
          preparationRemainingTicks: world.modeProjection.preparationRemainingTicks,
        }, false);
        projection = expectedProjection;
        revision = world.modeProjection.revision;
        lastTick = checkpoint.tick - 1;
        lifecycle = runtimeState === 'running' ? 'active' : 'paused';
        return resolution(
          lastTick,
          null,
          world.modeProjection.preparationRemainingTicks,
        );
      },
      pause() {
        if (lifecycle !== 'active') throw new Error('Duel driver只能从active暂停。');
        lifecycle = 'paused';
      },
      resume() {
        if (lifecycle !== 'paused') throw new Error('Duel driver只能从paused恢复。');
        lifecycle = 'active';
      },
      destroy() { lifecycle = 'destroyed'; },
    });
  }
  assertKnownKeys(source, FIXTURE_MODE_KEYS, 'ModeMatchRuntimeV6 fixture mode');
  requireKeys(source, FIXTURE_MODE_REQUIRED_KEYS, 'ModeMatchRuntimeV6 fixture mode');
  const fixture = dataField(source, 'fixture', 'ModeMatchRuntimeV6 fixture mode');
  const timelinePolicyBundle = Object.hasOwn(source, 'timelinePolicyBundle')
    ? dataField(source, 'timelinePolicyBundle', 'ModeMatchRuntimeV6 fixture mode')
    : undefined;
  const objectivePolicyBundle = Object.hasOwn(source, 'objectivePolicyBundle')
    ? dataField(source, 'objectivePolicyBundle', 'ModeMatchRuntimeV6 fixture mode')
    : undefined;
  if (config.modeKind === 'race') {
    const system = new RaceModeSystem(
      config,
      fixture,
      objectivePolicyBundle,
      timelinePolicyBundle,
    );
    return Object.freeze({
      kind: 'race' as const,
      contentHash: system.fixtureContentHash,
      start() {
        system.start();
        const snapshot = system.getSnapshot();
        return Object.freeze({
          tick: -1,
          commands: Object.freeze([]),
          modeProjection: raceProjection(snapshot),
          modeState: raceCheckpointState(snapshot),
          modeResult: null,
        });
      },
      step(facts: unknown, tick: number) {
        const outcome = system.step(facts);
        if (outcome.tick !== tick) throw new RangeError('Race system tick与runtime不一致。');
        return Object.freeze({
          tick,
          commands: outcome.commands,
          modeProjection: raceProjection(outcome.state),
          modeState: raceCheckpointState(outcome.state),
          modeResult: outcome.state.result,
        });
      },
      restore(
        checkpoint: ArenaModeCheckpointV2,
        _frame: DeepReadonly<MatchReadFrameV3>,
        runtimeState: 'running' | 'paused',
      ) {
        if (checkpoint.modeState.kind !== 'race' || checkpoint.modeResult !== null) {
          throw new RangeError('Race driver checkpoint类型或终局身份无效。');
        }
        system.restoreFromCheckpointState(
          checkpoint.modeState,
          runtimeState === 'running' ? 'active' : 'paused',
        );
        const snapshot = system.getSnapshot();
        return Object.freeze({
          tick: checkpoint.tick - 1,
          commands: Object.freeze([]),
          modeProjection: raceProjection(snapshot),
          modeState: raceCheckpointState(snapshot),
          modeResult: null,
        });
      },
      pause() { system.pause(); },
      resume() { system.resume(); },
      destroy() { system.destroy(); },
    });
  }
  const system = new SurvivalModeSystem(
    config,
    fixture,
    objectivePolicyBundle,
    timelinePolicyBundle,
  );
  return Object.freeze({
    kind: 'survival' as const,
    contentHash: system.fixtureContentHash,
    start() {
      system.start();
      const snapshot = system.getSnapshot();
      return Object.freeze({
        tick: -1,
        commands: Object.freeze([]),
        modeProjection: survivalProjection(snapshot),
        modeState: survivalCheckpointState(snapshot),
        modeResult: null,
      });
    },
    step(facts: unknown, tick: number) {
      const outcome = system.step(facts);
      if (outcome.tick !== tick) throw new RangeError('Survival system tick与runtime不一致。');
      return Object.freeze({
        tick,
        commands: outcome.commands,
        modeProjection: survivalProjection(outcome.state),
        modeState: survivalCheckpointState(outcome.state),
        modeResult: outcome.state.result,
      });
    },
    restore(
      checkpoint: ArenaModeCheckpointV2,
      _frame: DeepReadonly<MatchReadFrameV3>,
      runtimeState: 'running' | 'paused',
    ) {
      if (checkpoint.modeState.kind !== 'survival' || checkpoint.modeResult !== null) {
        throw new RangeError('Survival driver checkpoint类型或终局身份无效。');
      }
      system.restoreFromCheckpointState(
        checkpoint.modeState,
        runtimeState === 'running' ? 'active' : 'paused',
      );
      const snapshot = system.getSnapshot();
      return Object.freeze({
        tick: checkpoint.tick - 1,
        commands: Object.freeze([]),
        modeProjection: survivalProjection(snapshot),
        modeState: survivalCheckpointState(snapshot),
        modeResult: null,
      });
    },
    pause() { system.pause(); },
    resume() { system.resume(); },
    destroy() { system.destroy(); },
  });
}

function normalizeStart(value: unknown): NormalizedStart {
  const source = cloneFrozenData(value, 'ModeMatchRuntimeV6 authority start result');
  assertKnownKeys(source, START_KEYS, 'ModeMatchRuntimeV6 authority start result');
  requireKeys(source, START_REQUIRED_KEYS, 'ModeMatchRuntimeV6 authority start result');
  const readFrameAudit = source.readFrameAudit as MatchReadFrameV3AuditOptions;
  const readFrame = createMatchReadFrameV3Audit(source.readFrame, readFrameAudit);
  const localJumpAvailability = Object.hasOwn(source, 'localJumpAvailability')
    ? createArenaLocalJumpAvailabilityV1(source.localJumpAvailability)
    : undefined;
  if (localJumpAvailability !== undefined && (
    localJumpAvailability.tick !== readFrame.worldSnapshot.tick
    || localJumpAvailability.eventSequence !== readFrame.worldSnapshot.eventSequence
    || localJumpAvailability.participantId !== readFrame.localActionSidecar.participantId
  )) throw new RangeError('ModeMatchRuntimeV6 start jump availability与Frame身份漂移。');
  return Object.freeze({
    readFrame,
    readFrameAudit,
    supplyCadence: source.supplyCadence === null
      ? null
      : createArenaSupplyCadenceSnapshotV1(source.supplyCadence),
    ...(localJumpAvailability === undefined ? {} : { localJumpAvailability }),
    stateHash: hash(source.stateHash, 'ModeMatchRuntimeV6 start stateHash'),
  });
}

function normalizeStep(value: unknown): NormalizedStep {
  const source = cloneFrozenData(value, 'ModeMatchRuntimeV6 authority step result');
  assertKnownKeys(source, STEP_KEYS, 'ModeMatchRuntimeV6 authority step result');
  requireKeys(source, STEP_REQUIRED_KEYS, 'ModeMatchRuntimeV6 authority step result');
  if (!Array.isArray(source.events)) throw new TypeError('ModeMatchRuntimeV6 events必须是数组。');
  const readFrameAudit = source.readFrameAudit as MatchReadFrameV3AuditOptions;
  const readFrame = createMatchReadFrameV3Audit(source.readFrame, readFrameAudit);
  const localJumpAvailability = Object.hasOwn(source, 'localJumpAvailability')
    ? createArenaLocalJumpAvailabilityV1(source.localJumpAvailability)
    : undefined;
  if (localJumpAvailability !== undefined && (
    localJumpAvailability.tick !== readFrame.worldSnapshot.tick
    || localJumpAvailability.eventSequence !== readFrame.worldSnapshot.eventSequence
    || localJumpAvailability.participantId !== readFrame.localActionSidecar.participantId
  )) throw new RangeError('ModeMatchRuntimeV6 step jump availability与Frame身份漂移。');
  return Object.freeze({
    readFrame,
    readFrameAudit,
    events: Object.freeze(source.events.map(createArenaMatchEventV6)),
    supplyFacts: createArenaSupplyAuthorityFactsV1(source.supplyFacts),
    supplyCadence: source.supplyCadence === null
      ? null
      : createArenaSupplyCadenceSnapshotV1(source.supplyCadence),
    ...(localJumpAvailability === undefined ? {} : { localJumpAvailability }),
    stateHash: hash(source.stateHash, 'ModeMatchRuntimeV6 step stateHash'),
    appliedModeCommandHash: hash(
      source.appliedModeCommandHash,
      'ModeMatchRuntimeV6 appliedModeCommandHash',
    ),
  });
}

export class ModeMatchRuntimeV6 {
  readonly #checkpointIntervalTicks: number;
  readonly #config: ArenaMatchConfigV6;
  readonly #configHash: string;
  readonly #modeDriverContentHash!: string;
  readonly #expectedMatchSeed: number;
  readonly #participantIds: readonly string[];
  readonly #roleByParticipantId: ReadonlyMap<string, ArenaMatchConfigV6['participantAssignments'][number]['modeRole']>;
  readonly #localParticipantId: string;
  #authority: WorldAuthorityPort | null = null;
  #driver: ModeDriver | null = null;
  #state: ModeMatchRuntimeV6State = MODE_MATCH_RUNTIME_V6_STATE.CREATED;
  #readFrame: DeepReadonly<MatchReadFrameV3> | null = null;
  #readFrameAudit: MatchReadFrameV3AuditOptions | null = null;
  #modeState: ArenaModeCheckpointStateV2 | null = null;
  #stateHash: string | null = null;
  #physicsBackendVersion: string | null = null;
  #events: DeepReadonly<ArenaMatchEventV6>[] = [];
  #eventIds = new Set<string>();
  #supplyFacts: DeepReadonly<ArenaSupplyAuthorityFactV1>[] = [];
  #supplyFactsComplete = true;
  #lastSupplyFactSequence: number | null = null;
  #supplyFactStreamId: string | null = null;
  #inputFrames: ArenaInputFrame[] = [];
  #checkpoints: ArenaReplayV6Checkpoint[] = [];
  #modeCheckpoints: ArenaModeCheckpointV2[] = [];
  #operation: ModeMatchRuntimeV6Operation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  static restoreFromRuntimeCheckpointV1(options: ModeMatchRuntimeV6RestoreOptions): ModeMatchRuntimeV6;
  static restoreFromRuntimeCheckpointV1(value: unknown): ModeMatchRuntimeV6 {
    const source = assertPlainRecord(value, 'ModeMatchRuntimeV6 restore options');
    assertKnownKeys(source, RESTORE_OPTION_KEYS, 'ModeMatchRuntimeV6 restore options');
    requireKeys(source, RESTORE_OPTION_KEYS, 'ModeMatchRuntimeV6 restore options');
    const checkpoint = validateModeMatchRuntimeCheckpointV1(
      dataField(source, 'checkpoint', 'ModeMatchRuntimeV6 restore options'),
    );
    const runtime = new ModeMatchRuntimeV6({
      checkpointIntervalTicks: checkpoint.checkpointIntervalTicks,
      config: checkpoint.config,
      expectedMatchSeed: checkpoint.expectedMatchSeed,
      localParticipantId: checkpoint.localParticipantId,
      mode: dataField(source, 'mode', 'ModeMatchRuntimeV6 restore options') as ModeMatchRuntimeV6ModeOptions,
      worldAuthority: dataField(
        source,
        'worldAuthority',
        'ModeMatchRuntimeV6 restore options',
      ) as ModeMatchWorldAuthorityV6,
    });
    runtime.#restoreRuntimeCheckpoint(checkpoint);
    runtime.#supplyFactsComplete = runtime.#config.modeKind !== 'survival';
    return runtime;
  }

  static restoreFromRuntimeCheckpointV2(
    options: ModeMatchRuntimeV6RestoreV2Options,
  ): ModeMatchRuntimeV6;
  static restoreFromRuntimeCheckpointV2(value: unknown): ModeMatchRuntimeV6 {
    const source = assertPlainRecord(value, 'ModeMatchRuntimeV6 restore V2 options');
    assertKnownKeys(source, RESTORE_OPTION_KEYS, 'ModeMatchRuntimeV6 restore V2 options');
    requireKeys(source, RESTORE_OPTION_KEYS, 'ModeMatchRuntimeV6 restore V2 options');
    const checkpoint = validateModeMatchRuntimeCheckpointV2(
      dataField(source, 'checkpoint', 'ModeMatchRuntimeV6 restore V2 options'),
    );
    const runtime = ModeMatchRuntimeV6.restoreFromRuntimeCheckpointV1({
      checkpoint: checkpoint.runtimeCheckpointV1,
      mode: dataField(
        source,
        'mode',
        'ModeMatchRuntimeV6 restore V2 options',
      ) as ModeMatchRuntimeV6ModeOptions,
      worldAuthority: dataField(
        source,
        'worldAuthority',
        'ModeMatchRuntimeV6 restore V2 options',
      ) as ModeMatchWorldAuthorityCheckpointV1,
    });
    runtime.#supplyFactStreamId = checkpoint.supplyFactStreamId;
    runtime.#lastSupplyFactSequence = checkpoint.lastSupplyFactSequence;
    runtime.#supplyFactsComplete = runtime.#config.modeKind !== 'survival'
      || checkpoint.lastSupplyFactSequence === null;
    return runtime;
  }

  static restoreFromRuntimeCheckpointV3(
    options: ModeMatchRuntimeV6RestoreV3Options,
  ): ModeMatchRuntimeV6;
  static restoreFromRuntimeCheckpointV3(value: unknown): ModeMatchRuntimeV6 {
    const source = assertPlainRecord(value, 'ModeMatchRuntimeV6 restore V3 options');
    assertKnownKeys(source, RESTORE_OPTION_KEYS, 'ModeMatchRuntimeV6 restore V3 options');
    requireKeys(source, RESTORE_OPTION_KEYS, 'ModeMatchRuntimeV6 restore V3 options');
    const checkpoint = validateModeMatchRuntimeCheckpointV3(
      dataField(source, 'checkpoint', 'ModeMatchRuntimeV6 restore V3 options'),
    );
    const runtimeCheckpointV2 = checkpoint.runtimeCheckpointV2;
    const runtimeCheckpointV1 = runtimeCheckpointV2.runtimeCheckpointV1;
    const mode = cloneFrozenData(
      dataField(source, 'mode', 'ModeMatchRuntimeV6 restore V3 options'),
      'ModeMatchRuntimeV6 restore V3 mode',
    ) as ModeMatchRuntimeV6ModeOptions;
    const identityDriver = createModeDriver(runtimeCheckpointV1.config, mode);
    let identityFailure: unknown = null;
    try {
      if (identityDriver.contentHash !== checkpoint.modeDriverContentHash) {
        throw new RangeError('ModeMatchRuntimeV6 Mode Driver内容身份漂移。');
      }
    } catch (error) {
      identityFailure = error;
    }
    try {
      identityDriver.destroy();
    } catch (cleanupError) {
      const cleanupFailure = safelyWrapThrownError(
        cleanupError,
        'ModeMatchRuntimeV6 V3身份预检driver清理失败。',
      );
      if (identityFailure === null) throw cleanupFailure;
      const failure = safelyWrapThrownError(
        identityFailure,
        'ModeMatchRuntimeV6 V3身份预检失败。',
      );
      Object.defineProperty(failure, 'cleanupErrors', {
        value: Object.freeze([cleanupFailure]),
        enumerable: false,
      });
      throw failure;
    }
    if (identityFailure !== null) throw identityFailure;
    const runtime = new ModeMatchRuntimeV6({
      checkpointIntervalTicks: runtimeCheckpointV1.checkpointIntervalTicks,
      config: runtimeCheckpointV1.config,
      expectedMatchSeed: runtimeCheckpointV1.expectedMatchSeed,
      localParticipantId: runtimeCheckpointV1.localParticipantId,
      mode,
      worldAuthority: dataField(
        source,
        'worldAuthority',
        'ModeMatchRuntimeV6 restore V3 options',
      ) as ModeMatchWorldAuthorityCheckpointV1,
    });
    runtime.#restoreRuntimeCheckpoint(runtimeCheckpointV1);
    runtime.#supplyFactStreamId = runtimeCheckpointV2.supplyFactStreamId;
    runtime.#lastSupplyFactSequence = runtimeCheckpointV2.lastSupplyFactSequence;
    runtime.#supplyFactsComplete = runtime.#config.modeKind !== 'survival'
      || runtimeCheckpointV2.lastSupplyFactSequence === null;
    return runtime;
  }

  static restoreFromRuntimeCheckpointV4(
    options: ModeMatchRuntimeV6RestoreV4Options,
  ): ModeMatchRuntimeV6;
  static restoreFromRuntimeCheckpointV4(value: unknown): ModeMatchRuntimeV6 {
    const source = assertPlainRecord(value, 'ModeMatchRuntimeV6 restore V4 options');
    assertKnownKeys(source, RESTORE_OPTION_KEYS, 'ModeMatchRuntimeV6 restore V4 options');
    requireKeys(source, RESTORE_OPTION_KEYS, 'ModeMatchRuntimeV6 restore V4 options');
    const checkpoint = validateModeMatchRuntimeCheckpointV4(
      dataField(source, 'checkpoint', 'ModeMatchRuntimeV6 restore V4 options'),
    );
    const runtime = ModeMatchRuntimeV6.restoreFromRuntimeCheckpointV3({
      checkpoint: checkpoint.runtimeCheckpointV3,
      mode: dataField(
        source,
        'mode',
        'ModeMatchRuntimeV6 restore V4 options',
      ) as ModeMatchRuntimeV6ModeOptions,
      worldAuthority: dataField(
        source,
        'worldAuthority',
        'ModeMatchRuntimeV6 restore V4 options',
      ) as ModeMatchWorldAuthorityCheckpointV1,
    });
    runtime.#supplyFacts = checkpoint.supplyFactsPrefix.slice();
    runtime.#supplyFactsComplete = true;
    return runtime;
  }

  #restoreRuntimeCheckpoint(checkpoint: ModeMatchRuntimeCheckpointV1): void {
    this.#runOperation('restore', [MODE_MATCH_RUNTIME_V6_STATE.CREATED], () => {
      const authority = this.#authority;
      const driver = this.#driver;
      if (authority === null || driver === null) {
        throw new Error('ModeMatchRuntimeV6恢复所需owner不存在。');
      }
      try {
        const restoredValue = rejectAsyncSyncReturn(
          authority.restore(Object.freeze({
            checkpoint: checkpoint.worldAuthorityCheckpoint,
            config: this.#config,
            expectedMatchSeed: this.#expectedMatchSeed,
            localParticipantId: this.#localParticipantId,
            runtimeState: checkpoint.runtimeState,
          })),
          'ModeMatchWorldAuthorityV6.restore',
        );
        this.#assertReentryFree('ModeMatchRuntimeV6 authority restore');
        const restored = normalizeStart(restoredValue);
      if (
        restored.stateHash !== checkpoint.stateHash
        || !sameData(restored.readFrameAudit, checkpoint.readFrameAudit, 'restore frame audit')
        || !sameData(restored.readFrame, checkpoint.readFrame, 'restore read frame')
      ) throw new RangeError('ModeMatchRuntimeV6 authority恢复结果与checkpoint漂移。');
      this.#physicsBackendVersion = checkpoint.physicsBackendVersion;
      this.#assertFrameIdentity(restored.readFrame);
      this.#assertSupplyCadence(restored.supplyCadence, restored.readFrame);
      const resolution = driver.restore(
        checkpoint.modeCheckpoint,
        restored.readFrame,
        checkpoint.runtimeState,
      );
      this.#assertReentryFree('ModeMatchRuntimeV6 mode driver restore');
      if (
        resolution.tick !== restored.readFrame.worldSnapshot.tick - 1
        || resolution.modeResult !== null
        || !sameData(
          resolution.modeProjection,
          restored.readFrame.worldSnapshot.modeProjection,
          'restore driver projection',
        )
        || !sameData(
          resolution.modeState,
          checkpoint.modeCheckpoint.modeState,
          'restore driver mode state',
        )
      ) throw new RangeError('ModeMatchRuntimeV6 driver恢复结果与checkpoint漂移。');

      const restoredEvents = checkpoint.eventsPrefix.slice();
      const restoredEventIds = new Set(restoredEvents.map(({ id }) => id));
      if (restoredEventIds.size !== restoredEvents.length) {
        throw new RangeError('ModeMatchRuntimeV6恢复事件ID重复。');
      }
      const restoredInputs = checkpoint.inputFramesPrefix.slice();
      const restoredReplayCheckpoints = checkpoint.replayCheckpointsPrefix.slice();
      const restoredModeCheckpoints = checkpoint.modeCheckpointsPrefix.slice();

      this.#readFrame = restored.readFrame;
      this.#readFrameAudit = restored.readFrameAudit;
      this.#stateHash = restored.stateHash;
      this.#modeState = checkpoint.modeCheckpoint.modeState;
      this.#events = restoredEvents;
      this.#eventIds = restoredEventIds;
      this.#inputFrames = restoredInputs;
      this.#checkpoints = restoredReplayCheckpoints;
      this.#modeCheckpoints = restoredModeCheckpoints;
      this.#state = checkpoint.runtimeState === 'paused'
        ? MODE_MATCH_RUNTIME_V6_STATE.PAUSED
        : MODE_MATCH_RUNTIME_V6_STATE.RUNNING;
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  constructor(options: ModeMatchRuntimeV6Options);
  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'ModeMatchRuntimeV6 options');
    assertKnownKeys(source, OPTION_KEYS, 'ModeMatchRuntimeV6 options');
    requireKeys(source, OPTION_KEYS, 'ModeMatchRuntimeV6 options');
    this.#checkpointIntervalTicks = positiveSafeInteger(
      dataField(source, 'checkpointIntervalTicks', 'ModeMatchRuntimeV6 options'),
      'ModeMatchRuntimeV6.checkpointIntervalTicks',
    );
    this.#config = createArenaMatchConfigV6(dataField(source, 'config', 'ModeMatchRuntimeV6 options'));
    this.#configHash = createDeterministicDataHash(
      this.#config,
      'ModeMatchRuntimeV6 configHash',
    );
    this.#expectedMatchSeed = uint32(
      dataField(source, 'expectedMatchSeed', 'ModeMatchRuntimeV6 options'),
      'ModeMatchRuntimeV6.expectedMatchSeed',
    );
    this.#participantIds = Object.freeze(
      this.#config.participantAssignments.map(({ participantId }) => participantId),
    );
    this.#roleByParticipantId = new Map(
      this.#config.participantAssignments.map(({ participantId, modeRole }) => (
        [participantId, modeRole] as const
      )),
    );
    this.#localParticipantId = assertNonEmptyString(
      dataField(source, 'localParticipantId', 'ModeMatchRuntimeV6 options'),
      'ModeMatchRuntimeV6.localParticipantId',
    );
    if (!this.#participantIds.includes(this.#localParticipantId)) {
      throw new RangeError('ModeMatchRuntimeV6 local participant不属于config。');
    }
    let authority: WorldAuthorityPort | null = null;
    let driver: ModeDriver | null = null;
    try {
      driver = createModeDriver(
        this.#config,
        dataField(source, 'mode', 'ModeMatchRuntimeV6 options'),
      );
      authority = captureWorldAuthority(
        dataField(source, 'worldAuthority', 'ModeMatchRuntimeV6 options'),
      );
    } catch (error) {
      const cleanupErrors: Error[] = [];
      if (driver !== null) {
        try {
          driver.destroy();
        } catch (cleanupError) {
          cleanupErrors.push(safelyWrapThrownError(
            cleanupError,
            'ModeMatchRuntimeV6构造期mode driver清理失败。',
          ));
        }
      }
      if (authority !== null) {
        try {
          rejectAsyncSyncReturn(authority.destroy(), 'ModeMatchRuntimeV6构造期authority destroy');
        } catch (cleanupError) {
          cleanupErrors.push(safelyWrapThrownError(
            cleanupError,
            'ModeMatchRuntimeV6构造期authority清理失败。',
          ));
        }
      }
      const failure = safelyWrapThrownError(error, 'ModeMatchRuntimeV6构造失败。');
      if (cleanupErrors.length > 0) {
        Object.defineProperty(failure, 'cleanupErrors', {
          value: Object.freeze(cleanupErrors),
          enumerable: false,
        });
      }
      throw failure;
    }
    if (driver === null || authority === null) {
      throw new Error('ModeMatchRuntimeV6构造后owner身份不完整。');
    }
    this.#driver = driver;
    this.#modeDriverContentHash = driver.contentHash;
    this.#authority = authority;
  }

  get state(): ModeMatchRuntimeV6State {
    this.#assertNoOperation('state-read');
    return this.#state;
  }

  get readFrame(): DeepReadonly<MatchReadFrameV3> | null {
    this.#assertNoOperation('read-frame-read');
    return this.#readFrame;
  }

  getModeDriverContentHash(): string {
    this.#assertNoOperation('mode-driver-content-hash-read');
    this.#assertState(
      MODE_MATCH_RUNTIME_V6_STATE.CREATED,
      MODE_MATCH_RUNTIME_V6_STATE.RUNNING,
      MODE_MATCH_RUNTIME_V6_STATE.PAUSED,
      MODE_MATCH_RUNTIME_V6_STATE.ENDED,
    );
    return this.#modeDriverContentHash;
  }

  getRetainedResourceSnapshot(): ModeMatchRuntimeV6RetainedResourceSnapshot {
    this.#assertNoOperation('retained-resource-snapshot-read');
    const authorityOwned = this.#authority !== null;
    const modeDriverOwned = this.#driver !== null;
    return Object.freeze({
      authorityOwned,
      modeDriverOwned,
      ownedResourceCount: Number(authorityOwned) + Number(modeDriverOwned),
      committedRecordCount: this.#events.length
        + this.#supplyFacts.length
        + this.#inputFrames.length
        + this.#checkpoints.length
        + this.#modeCheckpoints.length,
    });
  }

  #rejectReentry(operation: string): never {
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `ModeMatchRuntimeV6操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) this.#rejectReentry(operation);
  }

  #assertState(...allowed: readonly ModeMatchRuntimeV6State[]): void {
    if (!allowed.includes(this.#state)) {
      throw new Error(`ModeMatchRuntimeV6状态${this.#state}拒绝当前操作。`);
    }
  }

  #beginOperation(
    operation: ModeMatchRuntimeV6Operation,
    allowed: readonly ModeMatchRuntimeV6State[],
  ): void {
    this.#assertNoOperation(operation);
    this.#assertState(...allowed);
    this.#operation = operation;
    this.#reentryError = null;
  }

  #runOperation<T>(
    operation: ModeMatchRuntimeV6Operation,
    allowed: readonly ModeMatchRuntimeV6State[],
    action: () => T,
  ): T {
    this.#beginOperation(operation, allowed);
    const reentrySequence = this.#reentrySequence;
    try {
      const result = action();
      if (this.#reentrySequence !== reentrySequence) {
        throw this.#reentryError
          ?? new Error(`ModeMatchRuntimeV6 ${operation}发生被吞掉的重入。`);
      }
      return result;
    } catch (error) {
      if (
        this.#reentrySequence !== reentrySequence
        && this.#state !== MODE_MATCH_RUNTIME_V6_STATE.FAILED
      ) return this.#fail(error);
      throw error;
    } finally {
      this.#operation = null;
    }
  }

  #assertReentryFree(_operation: string): void {
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #assertFrameIdentity(frame: DeepReadonly<MatchReadFrameV3>): void {
    const world = frame.worldSnapshot;
    if (
      world.authoritySchemaVersion !== 6
      || world.modeDefinitionId !== this.#config.modeDefinitionId
      || world.ruleContentHash !== this.#config.modePolicyContentHash
      || world.matchSeed !== this.#expectedMatchSeed
      || world.configHash !== this.#configHash
      || frame.localActionSidecar.participantId !== this.#localParticipantId
    ) throw new RangeError('ModeMatchRuntimeV6 readFrame authority/mode/local身份漂移。');
    if (
      this.#physicsBackendVersion !== null
      && world.physicsBackendVersion !== this.#physicsBackendVersion
    ) throw new RangeError('ModeMatchRuntimeV6 physics backend身份漂移。');
    const participantIds = world.participants.map(({ id }) => id);
    if (
      participantIds.length !== this.#participantIds.length
      || participantIds.some((id, index) => id !== this.#participantIds[index])
    ) throw new RangeError('ModeMatchRuntimeV6 readFrame participant集合/顺序漂移。');
  }

  #assertSupplyCadence(
    cadence: DeepReadonly<ArenaSupplyCadenceSnapshotV1> | null,
    frame: DeepReadonly<MatchReadFrameV3>,
  ): void {
    const world = frame.worldSnapshot;
    if (this.#config.modeKind !== 'survival') {
      if (cadence !== null) {
        throw new RangeError('ModeMatchRuntimeV6非Survival不得发布供给节奏。');
      }
      return;
    }
    if (cadence === null) {
      throw new RangeError('ModeMatchRuntimeV6 Survival必须发布权威供给节奏。');
    }
    if (
      cadence.modeDefinitionId !== this.#config.modeDefinitionId
      || cadence.snapshotTick !== world.tick
    ) {
      throw new RangeError('ModeMatchRuntimeV6 supply cadence的Mode/tick身份漂移。');
    }
    const activeSupply = world.activeSupplyProjection;
    if (
      activeSupply !== null
      && activeSupply.supplies.some(({ supplyDefinitionId }) => (
        supplyDefinitionId !== cadence.supplyDefinitionId
      ))
    ) {
      throw new RangeError('ModeMatchRuntimeV6 supply cadence与活跃供给Definition不一致。');
    }
  }

  #cleanup(): readonly Error[] {
    const errors: Error[] = [];
    if (this.#driver !== null) {
      const reentrySequence = this.#reentrySequence;
      try {
        this.#driver.destroy();
        if (this.#reentrySequence !== reentrySequence) {
          throw this.#reentryError
            ?? new Error('ModeMatchRuntimeV6 mode driver清理期间发生重入。');
        }
        this.#driver = null;
      } catch (error) {
        errors.push(safelyWrapThrownError(error, 'ModeMatchRuntimeV6 mode driver清理失败。'));
        if (this.#reentrySequence !== reentrySequence) return Object.freeze(errors);
      }
    }
    if (this.#authority !== null) {
      const reentrySequence = this.#reentrySequence;
      try {
        rejectAsyncSyncReturn(this.#authority.destroy(), 'ModeMatchRuntimeV6 authority destroy');
        if (this.#reentrySequence !== reentrySequence) {
          throw this.#reentryError
            ?? new Error('ModeMatchRuntimeV6 authority清理期间发生重入。');
        }
        this.#authority = null;
      } catch (error) {
        errors.push(safelyWrapThrownError(error, 'ModeMatchRuntimeV6 authority清理失败。'));
      }
    }
    return Object.freeze(errors);
  }

  #clearCommittedRecords(): void {
    this.#readFrameAudit = null;
    this.#readFrame = null;
    this.#modeState = null;
    this.#stateHash = null;
    this.#physicsBackendVersion = null;
    this.#events = [];
    this.#eventIds.clear();
    this.#supplyFacts = [];
    this.#supplyFactsComplete = true;
    this.#lastSupplyFactSequence = null;
    this.#supplyFactStreamId = null;
    this.#inputFrames = [];
    this.#checkpoints = [];
    this.#modeCheckpoints = [];
  }

  #createModeCheckpoint(
    frame: DeepReadonly<MatchReadFrameV3>,
    modeState: ArenaModeCheckpointStateV2,
    stateHash: string,
  ): ArenaModeCheckpointV2 {
    const world = frame.worldSnapshot;
    return createArenaModeCheckpointV2({
      checkpointSchemaVersion: 2,
      matchSchemaVersion: 6,
      modeDefinitionId: this.#config.modeDefinitionId,
      contentHash: this.#config.modePolicyContentHash,
      matchSeed: this.#expectedMatchSeed,
      config: this.#config,
      participantAssignments: this.#config.participantAssignments,
      tick: world.tick,
      phase: world.phase,
      eventSequence: world.eventSequence,
      modeState,
      modeResult: world.result,
      stateHash,
    });
  }

  #fail(error: unknown): never {
    this.#state = MODE_MATCH_RUNTIME_V6_STATE.FAILED;
    const failure = safelyWrapThrownError(error, 'ModeMatchRuntimeV6失败关闭。');
    const cleanupErrors = [...this.#cleanup()];
    this.#clearCommittedRecords();
    if (this.#reentryError !== null && !cleanupErrors.includes(this.#reentryError)) {
      cleanupErrors.push(this.#reentryError);
    }
    if (cleanupErrors.length > 0) {
      Object.defineProperty(failure, 'cleanupErrors', {
        value: Object.freeze(cleanupErrors),
        enumerable: false,
      });
    }
    throw failure;
  }

  start(): ModeMatchRuntimeV6StartOutcome {
    return this.#runOperation('start', [MODE_MATCH_RUNTIME_V6_STATE.CREATED], () => {
      try {
      const authority = this.#authority;
      const driver = this.#driver;
      if (authority === null || driver === null) throw new Error('ModeMatchRuntimeV6端口不可用。');
      const startValue = rejectAsyncSyncReturn(authority.start(Object.freeze({
        config: this.#config,
        expectedMatchSeed: this.#expectedMatchSeed,
        localParticipantId: this.#localParticipantId,
      })), 'ModeMatchRuntimeV6 authority start');
      this.#assertReentryFree('ModeMatchRuntimeV6 authority start');
      const start = normalizeStart(startValue);
      this.#assertFrameIdentity(start.readFrame);
      this.#assertSupplyCadence(start.supplyCadence, start.readFrame);
      const world = start.readFrame.worldSnapshot;
      if (world.tick !== 0 || world.eventSequence !== 0 || world.result !== null) {
        throw new RangeError('ModeMatchRuntimeV6 start frame必须是tick0/eventSequence0/非终局。');
      }
      const initial = driver.start(
        world.phase,
        world.modeProjection.preparationRemainingTicks,
      );
      this.#assertReentryFree('ModeMatchRuntimeV6 mode driver start');
      if (!sameData(world.modeProjection, initial.modeProjection, 'ModeMatchRuntimeV6 start projection')) {
        throw new RangeError('ModeMatchRuntimeV6 start frame与mode projection不一致。');
      }
      const initialCheckpoint = this.#createModeCheckpoint(
        start.readFrame,
        initial.modeState,
        start.stateHash,
      );
      this.#readFrame = start.readFrame;
      this.#readFrameAudit = start.readFrameAudit;
      this.#modeState = initial.modeState;
      this.#stateHash = start.stateHash;
      this.#physicsBackendVersion = world.physicsBackendVersion;
      this.#checkpoints = [Object.freeze({ tick: 0, hash: start.stateHash })];
      this.#modeCheckpoints = [initialCheckpoint];
      this.#state = MODE_MATCH_RUNTIME_V6_STATE.RUNNING;
      return Object.freeze({
        readFrame: start.readFrame,
        readFrameAudit: start.readFrameAudit,
        supplyCadence: start.supplyCadence,
        ...(start.localJumpAvailability === undefined
          ? {}
          : { localJumpAvailability: start.localJumpAvailability }),
      });
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  step(inputValue: unknown): ModeMatchRuntimeV6StepOutcome {
    return this.#runOperation('step', [MODE_MATCH_RUNTIME_V6_STATE.RUNNING], () => {
      const current = this.#readFrame;
      if (current === null) throw new Error('ModeMatchRuntimeV6缺少current frame。');
      const tick = current.worldSnapshot.tick;
      const inputs = normalizeInputFrames(inputValue, {
        tick,
        participantIds: this.#participantIds,
      });
      try {
      const authority = this.#authority;
      const driver = this.#driver;
      if (authority === null || driver === null) throw new Error('ModeMatchRuntimeV6端口不可用。');
      let resolution: ModeMatchResolutionV6 | null = null;
      let resolverCalls = 0;
      let resolverViolation = false;
      const resolveMode: ModeMatchFactsResolverV6 = (facts) => {
        resolverCalls += 1;
        if (resolverCalls !== 1) {
          resolverViolation = true;
          throw new Error('ModeMatchRuntimeV6 authority每tick只能解析一次mode facts。');
        }
        this.#assertReentryFree('ModeMatchRuntimeV6 authority mode resolver入口');
        resolution = driver.step(facts, tick);
        this.#assertReentryFree('ModeMatchRuntimeV6 mode driver step');
        return resolution;
      };
      const steppedValue = rejectAsyncSyncReturn(authority.step(Object.freeze({
        tick,
        inputFrames: inputs,
        resolveMode,
      })), 'ModeMatchRuntimeV6 authority step');
      this.#assertReentryFree('ModeMatchRuntimeV6 authority step');
      const stepped = normalizeStep(steppedValue);
      const committedResolution = resolution as ModeMatchResolutionV6 | null;
      if (resolverCalls !== 1 || resolverViolation || committedResolution === null) {
        throw new Error('ModeMatchRuntimeV6 authority必须精确调用一次mode resolver。');
      }
      this.#assertFrameIdentity(stepped.readFrame);
      this.#assertSupplyCadence(stepped.supplyCadence, stepped.readFrame);
      const world = stepped.readFrame.worldSnapshot;
      if (world.tick !== tick + 1) throw new RangeError('ModeMatchRuntimeV6每次step必须推进1 tick。');
      if (!sameData(
        world.modeProjection,
        committedResolution.modeProjection,
        'ModeMatchRuntimeV6 projection',
      )) {
        throw new RangeError('ModeMatchRuntimeV6 post frame与mode projection不一致。');
      }
      if (!sameData(world.result, committedResolution.modeResult, 'ModeMatchRuntimeV6 result')) {
        throw new RangeError('ModeMatchRuntimeV6 post frame与mode result不一致。');
      }
      const expectedModeCommandHash = createDeterministicDataHash(
        committedResolution.commands,
        'ModeMatchRuntimeV6 mode commands',
      );
      if (stepped.appliedModeCommandHash !== expectedModeCommandHash) {
        throw new RangeError('ModeMatchRuntimeV6 authority未闭合实际应用的mode commands。');
      }
      let expectedSequence = this.#events.length;
      let previousTick = this.#events.at(-1)?.tick ?? -1;
      const batchIds = new Set<string>();
      for (const event of stepped.events) {
        if (event.sequence !== expectedSequence) {
          throw new RangeError('ModeMatchRuntimeV6 V6 event sequence不连续。');
        }
        if (event.tick < previousTick || event.tick > tick) {
          throw new RangeError('ModeMatchRuntimeV6 V6 event tick不属于已提交authority范围。');
        }
        if (this.#eventIds.has(event.id) || batchIds.has(event.id)) {
          throw new RangeError('ModeMatchRuntimeV6 V6 event id重复。');
        }
        batchIds.add(event.id);
        if (
          'modeDefinitionId' in event
          && event.modeDefinitionId !== this.#config.modeDefinitionId
        ) throw new RangeError('ModeMatchRuntimeV6 V6 event modeDefinitionId漂移。');
        if (
          (RACE_ONLY_EVENT_TYPES.has(event.type) && this.#config.modeKind !== 'race')
          || (SURVIVAL_ONLY_EVENT_TYPES.has(event.type)
            && this.#config.modeKind !== 'survival')
        ) throw new RangeError('ModeMatchRuntimeV6 V6 event类型不属于当前mode。');
        if ('participantId' in event) {
          const expectedRole = this.#roleByParticipantId.get(event.participantId);
          if (expectedRole === undefined) {
            throw new RangeError('ModeMatchRuntimeV6 V6 event participantId不属于config。');
          }
          if ('modeRole' in event && event.modeRole !== expectedRole) {
            throw new RangeError('ModeMatchRuntimeV6 V6 event modeRole与assignment不一致。');
          }
        }
        if (
          event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL
          && event.creditedAttackerId !== null
          && !this.#roleByParticipantId.has(event.creditedAttackerId)
        ) throw new RangeError('ModeMatchRuntimeV6 V6 event attacker不属于config。');
        if (event.type === ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED) {
          for (const [name, participantId] of [
            ['attackerId', event.attackerId],
            ['targetId', event.targetId],
            ['creditedAttackerId', event.creditedAttackerId],
          ] as const) {
            if (participantId !== null && !this.#roleByParticipantId.has(participantId)) {
              throw new RangeError(`ModeMatchRuntimeV6 V6 feedback ${name}不属于config。`);
            }
          }
        }
        expectedSequence += 1;
        previousTick = event.tick;
      }
      const startedEvents = stepped.events.filter(
        ({ type }) => type === ARENA_MATCH_EVENT_V6.MATCH_STARTED,
      );
      if (this.#events.length === 0) {
        const started = stepped.events[0];
        if (
          startedEvents.length !== 1
          || started?.type !== ARENA_MATCH_EVENT_V6.MATCH_STARTED
          || started.tick !== 0
        ) {
          throw new RangeError('ModeMatchRuntimeV6 MatchStarted必须是tick0首事件。');
        }
        if (
          started.participantIds.length !== this.#participantIds.length
          || started.participantIds.some((id, index) => id !== this.#participantIds[index])
        ) throw new RangeError('ModeMatchRuntimeV6 MatchStarted participant身份漂移。');
      } else if (startedEvents.length !== 0) {
        throw new RangeError('ModeMatchRuntimeV6 MatchStarted全局只能发布一次。');
      }
      if (world.eventSequence !== expectedSequence) {
        throw new RangeError('ModeMatchRuntimeV6 post frame eventSequence水位不闭合。');
      }
      for (const fact of stepped.supplyFacts) {
        if (
          fact.tick !== tick
          || fact.modeDefinitionId !== this.#config.modeDefinitionId
        ) throw new RangeError('ModeMatchRuntimeV6 supply fact不属于当前Mode/tick。');
      }
      if (this.#config.modeKind !== 'survival' && stepped.supplyFacts.length !== 0) {
        throw new RangeError('ModeMatchRuntimeV6非Survival不得发布供给事实。');
      }
      const firstSupplyFact = stepped.supplyFacts[0];
      if (
        firstSupplyFact !== undefined
        && this.#lastSupplyFactSequence === null
        && firstSupplyFact.sequence !== 0
      ) throw new RangeError('ModeMatchRuntimeV6 supply fact stream必须从sequence 0开始。');
      if (
        firstSupplyFact !== undefined
        && this.#lastSupplyFactSequence !== null
        && firstSupplyFact.sequence !== this.#lastSupplyFactSequence + 1
      ) throw new RangeError('ModeMatchRuntimeV6 supply fact sequence未连续。');
      if (
        firstSupplyFact !== undefined
        && this.#supplyFactStreamId !== null
        && firstSupplyFact.streamId !== this.#supplyFactStreamId
      ) throw new RangeError('ModeMatchRuntimeV6 supply fact stream发生漂移。');
      const endedEvents = stepped.events.filter(({ type }) => type === ARENA_MATCH_EVENT_V6.MATCH_ENDED);
      if (this.#supplyFacts.length + stepped.supplyFacts.length
        > ARENA_SUPPLY_AUTHORITY_FACT_MAX_RETAINED_COUNT_V1) {
        throw new RangeError('ModeMatchRuntimeV6供给事实超过长期对局保留上限。');
      }
      if (committedResolution.modeResult === null) {
        if (endedEvents.length !== 0 || world.phase === 'ended') {
          throw new RangeError('ModeMatchRuntimeV6非终局step不能包含终局身份。');
        }
      } else {
        const terminal = stepped.events.at(-1);
        if (
          committedResolution.modeResult.endedAtTick !== tick
          || world.tick !== committedResolution.modeResult.endedAtTick + 1
          || endedEvents.length !== 1
          || terminal?.type !== ARENA_MATCH_EVENT_V6.MATCH_ENDED
          || terminal.tick !== committedResolution.modeResult.endedAtTick
          || !sameData(
            terminal.modeResult,
            committedResolution.modeResult,
            'ModeMatchRuntimeV6 terminal',
          )
          || world.phase !== 'ended'
        ) throw new RangeError('ModeMatchRuntimeV6终局事件/frame/result未原子闭合。');
      }
      const shouldRecordCheckpoint = committedResolution.modeResult !== null
        || world.tick % this.#checkpointIntervalTicks === 0;
      const committedModeCheckpoint = shouldRecordCheckpoint
        ? this.#createModeCheckpoint(
          stepped.readFrame,
          committedResolution.modeState,
          stepped.stateHash,
        )
        : null;
      for (const event of stepped.events) {
        this.#eventIds.add(event.id);
        this.#events.push(event);
      }
      this.#supplyFacts.push(...stepped.supplyFacts);
      this.#inputFrames.push(...inputs);
      if (committedModeCheckpoint !== null) {
        this.#checkpoints.push(Object.freeze({ tick: world.tick, hash: stepped.stateHash }));
        this.#modeCheckpoints.push(committedModeCheckpoint);
      }
      this.#readFrame = stepped.readFrame;
      this.#readFrameAudit = stepped.readFrameAudit;
      this.#modeState = committedResolution.modeState;
      this.#stateHash = stepped.stateHash;
      if (firstSupplyFact !== undefined) {
        this.#supplyFactStreamId = firstSupplyFact.streamId;
        this.#lastSupplyFactSequence = stepped.supplyFacts.at(-1)!.sequence;
      }
      if (committedResolution.modeResult !== null) {
        this.#state = MODE_MATCH_RUNTIME_V6_STATE.ENDED;
      }
      return Object.freeze({
        events: stepped.events,
        supplyFacts: stepped.supplyFacts,
        supplyCadence: stepped.supplyCadence,
        ...(stepped.localJumpAvailability === undefined
          ? {}
          : { localJumpAvailability: stepped.localJumpAvailability }),
        readFrame: stepped.readFrame,
        readFrameAudit: stepped.readFrameAudit,
      });
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  pause(): void {
    this.#runOperation('pause', [MODE_MATCH_RUNTIME_V6_STATE.RUNNING], () => {
      try {
      const authority = this.#authority;
      const driver = this.#driver;
      if (authority === null || driver === null) throw new Error('ModeMatchRuntimeV6端口不可用。');
      rejectAsyncSyncReturn(authority.pause(), 'ModeMatchRuntimeV6 authority pause');
      this.#assertReentryFree('ModeMatchRuntimeV6 authority pause');
      driver.pause();
      this.#assertReentryFree('ModeMatchRuntimeV6 mode driver pause');
      this.#state = MODE_MATCH_RUNTIME_V6_STATE.PAUSED;
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  resume(): void {
    this.#runOperation('resume', [MODE_MATCH_RUNTIME_V6_STATE.PAUSED], () => {
      try {
      const authority = this.#authority;
      const driver = this.#driver;
      if (authority === null || driver === null) throw new Error('ModeMatchRuntimeV6端口不可用。');
      rejectAsyncSyncReturn(authority.resume(), 'ModeMatchRuntimeV6 authority resume');
      this.#assertReentryFree('ModeMatchRuntimeV6 authority resume');
      driver.resume();
      this.#assertReentryFree('ModeMatchRuntimeV6 mode driver resume');
      this.#state = MODE_MATCH_RUNTIME_V6_STATE.RUNNING;
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  #exportRuntimeCheckpointV1(): ModeMatchRuntimeCheckpointV1 {
    const modeCheckpoint = this.#exportModeCheckpoint();
    const authority = this.#authority;
    const readFrame = this.#readFrame;
    const readFrameAudit = this.#readFrameAudit;
    const stateHash = this.#stateHash;
    const physicsBackendVersion = this.#physicsBackendVersion;
    if (
      authority === null
      || readFrame === null
      || readFrameAudit === null
      || stateHash === null
      || physicsBackendVersion === null
    ) throw new Error('ModeMatchRuntimeV6当前恢复身份不完整。');
    const worldAuthorityCheckpoint = rejectAsyncSyncReturn(
      authority.exportCheckpoint(Object.freeze({ readFrame, readFrameAudit, stateHash })),
      'ModeMatchWorldAuthorityV6.exportCheckpoint',
    );
    this.#assertReentryFree('ModeMatchRuntimeV6 authority checkpoint export');
    return createModeMatchRuntimeCheckpointV1({
      schemaVersion: MODE_MATCH_RUNTIME_CHECKPOINT_V1_SCHEMA_VERSION,
      runtimeState: this.#state === MODE_MATCH_RUNTIME_V6_STATE.PAUSED ? 'paused' : 'running',
      checkpointIntervalTicks: this.#checkpointIntervalTicks,
      localParticipantId: this.#localParticipantId,
      config: this.#config,
      expectedMatchSeed: this.#expectedMatchSeed,
      physicsBackendVersion,
      readFrame,
      readFrameAudit,
      stateHash,
      modeCheckpoint,
      worldAuthorityCheckpoint,
      inputFramesPrefix: this.#inputFrames,
      eventsPrefix: this.#events,
      replayCheckpointsPrefix: this.#checkpoints,
      modeCheckpointsPrefix: this.#modeCheckpoints,
    });
  }

  exportRuntimeCheckpointV1(): ModeMatchRuntimeCheckpointV1 {
    return this.#runOperation(
      'runtime-checkpoint-v1-read',
      [MODE_MATCH_RUNTIME_V6_STATE.RUNNING, MODE_MATCH_RUNTIME_V6_STATE.PAUSED],
      () => {
        try {
          return this.#exportRuntimeCheckpointV1();
        } catch (error) {
          return this.#fail(error);
        }
      },
    );
  }

  exportRuntimeCheckpointV2(): ModeMatchRuntimeCheckpointV2 {
    return this.#runOperation(
      'runtime-checkpoint-v2-read',
      [MODE_MATCH_RUNTIME_V6_STATE.RUNNING, MODE_MATCH_RUNTIME_V6_STATE.PAUSED],
      () => {
        try {
          return createModeMatchRuntimeCheckpointV2({
            schemaVersion: MODE_MATCH_RUNTIME_CHECKPOINT_V2_SCHEMA_VERSION,
            runtimeCheckpointV1: this.#exportRuntimeCheckpointV1(),
            supplyFactStreamId: this.#supplyFactStreamId,
            lastSupplyFactSequence: this.#lastSupplyFactSequence,
          });
        } catch (error) {
          return this.#fail(error);
        }
      },
    );
  }

  #exportRuntimeCheckpointV3(): ModeMatchRuntimeCheckpointV3 {
    const runtimeCheckpointV1 = this.#exportRuntimeCheckpointV1();
    return createModeMatchRuntimeCheckpointV3({
      schemaVersion: MODE_MATCH_RUNTIME_CHECKPOINT_V3_SCHEMA_VERSION,
      runtimeCheckpointV2: createModeMatchRuntimeCheckpointV2({
        schemaVersion: MODE_MATCH_RUNTIME_CHECKPOINT_V2_SCHEMA_VERSION,
        runtimeCheckpointV1,
        supplyFactStreamId: this.#supplyFactStreamId,
        lastSupplyFactSequence: this.#lastSupplyFactSequence,
      }),
      modeDriverContentHash: this.#modeDriverContentHash,
    });
  }

  exportRuntimeCheckpointV3(): ModeMatchRuntimeCheckpointV3 {
    return this.#runOperation(
      'runtime-checkpoint-v3-read',
      [MODE_MATCH_RUNTIME_V6_STATE.RUNNING, MODE_MATCH_RUNTIME_V6_STATE.PAUSED],
      () => {
        try {
          return this.#exportRuntimeCheckpointV3();
        } catch (error) {
          return this.#fail(error);
        }
      },
    );
  }

  exportRuntimeCheckpointV4(): ModeMatchRuntimeCheckpointV4 {
    return this.#runOperation(
      'runtime-checkpoint-v4-read',
      [MODE_MATCH_RUNTIME_V6_STATE.RUNNING, MODE_MATCH_RUNTIME_V6_STATE.PAUSED],
      () => {
        try {
          if (!this.#supplyFactsComplete) {
            throw new Error('ModeMatchRuntimeV6旧版Survival恢复缺少完整供给事实前缀。');
          }
          return createModeMatchRuntimeCheckpointV4({
            schemaVersion: MODE_MATCH_RUNTIME_CHECKPOINT_V4_SCHEMA_VERSION,
            runtimeCheckpointV3: this.#exportRuntimeCheckpointV3(),
            supplyFactsPrefix: this.#supplyFacts,
          });
        } catch (error) {
          return this.#fail(error);
        }
      },
    );
  }

  #exportModeCheckpoint(): ArenaModeCheckpointV2 {
    if (this.#readFrame === null || this.#modeState === null || this.#stateHash === null) {
      throw new Error('ModeMatchRuntimeV6缺少checkpoint已提交状态。');
    }
    return this.#createModeCheckpoint(this.#readFrame, this.#modeState, this.#stateHash);
  }

  exportModeCheckpoint(): ArenaModeCheckpointV2 {
    return this.#runOperation(
      'mode-checkpoint-read',
      [
        MODE_MATCH_RUNTIME_V6_STATE.RUNNING,
        MODE_MATCH_RUNTIME_V6_STATE.PAUSED,
        MODE_MATCH_RUNTIME_V6_STATE.ENDED,
      ],
      () => this.#exportModeCheckpoint(),
    );
  }

  exportModeCheckpointsV2(): readonly ArenaModeCheckpointV2[] {
    return this.#runOperation(
      'mode-checkpoints-read',
      [MODE_MATCH_RUNTIME_V6_STATE.ENDED],
      () => {
        if (this.#modeCheckpoints.length !== this.#checkpoints.length) {
          throw new Error('ModeMatchRuntimeV6 checkpoint序列未闭合。');
        }
        for (let index = 0; index < this.#modeCheckpoints.length; index += 1) {
          const modeCheckpoint = this.#modeCheckpoints[index]!;
          const replayCheckpoint = this.#checkpoints[index]!;
          if (
            modeCheckpoint.tick !== replayCheckpoint.tick
            || modeCheckpoint.stateHash !== replayCheckpoint.hash
          ) throw new Error('ModeMatchRuntimeV6 ModeCheckpoint与Replay checkpoint身份漂移。');
        }
        return Object.freeze([...this.#modeCheckpoints]);
      },
    );
  }

  #exportReplayV6(): ArenaReplayV6 {
    if (this.#readFrame === null || this.#stateHash === null) {
      throw new Error('ModeMatchRuntimeV6缺少终局已提交状态。');
    }
    const world = this.#readFrame.worldSnapshot;
    if (world.result === null) throw new Error('ModeMatchRuntimeV6终局缺少mode result。');
    const finalCheckpoint = this.#checkpoints.at(-1);
    if (finalCheckpoint?.tick !== world.tick || finalCheckpoint.hash !== this.#stateHash) {
      throw new Error('ModeMatchRuntimeV6 Replay终局checkpoint缺失或身份漂移。');
    }
    return createArenaReplayV6({
      replaySchemaVersion: ARENA_REPLAY_V6_SCHEMA_VERSION,
      authoritySchemaVersion: 6,
      physicsBackendVersion: world.physicsBackendVersion,
      modeDefinitionId: this.#config.modeDefinitionId,
      contentHash: this.#config.modePolicyContentHash,
      matchSeed: this.#expectedMatchSeed,
      config: this.#config,
      participantAssignments: this.#config.participantAssignments,
      inputFrames: this.#inputFrames,
      checkpoints: this.#checkpoints,
      events: this.#events,
      modeResult: world.result,
      finalHash: this.#stateHash,
    });
  }

  exportReplayV6(): ArenaReplayV6 {
    return this.#runOperation(
      'terminal-replay-read',
      [MODE_MATCH_RUNTIME_V6_STATE.ENDED],
      () => this.#exportReplayV6(),
    );
  }

  exportTerminalEvidenceV1(): ModeMatchRuntimeTerminalEvidenceV1 {
    return this.#runOperation(
      'terminal-evidence-read',
      [MODE_MATCH_RUNTIME_V6_STATE.ENDED],
      () => createModeMatchRuntimeTerminalEvidenceV1({
        schemaVersion: MODE_MATCH_RUNTIME_TERMINAL_EVIDENCE_V1_SCHEMA_VERSION,
        replay: this.#exportReplayV6(),
        modeDriverContentHash: this.#modeDriverContentHash,
      }),
    );
  }

  exportTerminalEvidenceV2(): ModeMatchRuntimeTerminalEvidenceV2 {
    return this.#runOperation(
      'terminal-evidence-v2-read',
      [MODE_MATCH_RUNTIME_V6_STATE.ENDED],
      () => {
        if (!this.#supplyFactsComplete) {
          throw new Error('ModeMatchRuntimeV6旧版Survival恢复不能导出完整供给终局证据。');
        }
        return createModeMatchRuntimeTerminalEvidenceV2({
          schemaVersion: MODE_MATCH_RUNTIME_TERMINAL_EVIDENCE_V2_SCHEMA_VERSION,
          replay: this.#exportReplayV6(),
          modeDriverContentHash: this.#modeDriverContentHash,
          supplyFacts: this.#supplyFacts,
          supplyFactStreamId: this.#supplyFactStreamId,
          lastSupplyFactSequence: this.#lastSupplyFactSequence,
          supplyFactCount: this.#supplyFacts.length,
        });
      },
    );
  }

  destroy(): void {
    this.#assertNoOperation('destroy');
    if (this.#state === MODE_MATCH_RUNTIME_V6_STATE.DESTROYED) return;
    this.#runOperation('destroy', [
      MODE_MATCH_RUNTIME_V6_STATE.CREATED,
      MODE_MATCH_RUNTIME_V6_STATE.RUNNING,
      MODE_MATCH_RUNTIME_V6_STATE.PAUSED,
      MODE_MATCH_RUNTIME_V6_STATE.ENDED,
      MODE_MATCH_RUNTIME_V6_STATE.FAILED,
    ], () => {
      const errors = this.#cleanup();
      this.#clearCommittedRecords();
      if (errors.length > 0) {
        this.#state = MODE_MATCH_RUNTIME_V6_STATE.FAILED;
        const failure = new Error('ModeMatchRuntimeV6 destroy清理不完整。');
        Object.defineProperty(failure, 'cleanupErrors', {
          value: errors,
          enumerable: false,
        });
        throw failure;
      }
      this.#state = MODE_MATCH_RUNTIME_V6_STATE.DESTROYED;
    });
  }
}
