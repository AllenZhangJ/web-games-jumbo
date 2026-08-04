import {
  cloneFrozenData,
  combineCleanupFailure,
  createDeterministicDataHash,
  normalizeInputFrame,
  type ArenaInputFrame,
  type DeepReadonly,
  type MatchReadFrameV2,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1,
  ARENA_SUPPLY_PRESENTATION_RECENT_EVENT_CAPACITY,
  ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
  ARENA_SUPPLY_PRESENTATION_TICKS_PER_SECOND,
  type ArenaSupplyPresentationCueV1,
  type ArenaSupplyPresentationPositionV1,
  type ArenaSupplyPresentationViewV1,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ArenaSupplyPresentationAdapter,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  createArenaV2SurvivalSupplyBotSession,
  readArenaV2SurvivalSupplyBotCompositionIdentity,
  type ArenaV2SurvivalSupplyBotCompositionOptions,
} from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
} from '@number-strategy-jump/arena-v1-content';
import {
  LocalMatchSession,
  type LocalMatchPresentationStepResultV2,
} from '@number-strategy-jump/arena-session';

export const ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE = Object.freeze({
  CREATED: 'created',
  ACTIVE: 'active',
  ENDED: 'ended',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export const ARENA_P1_SUPPLY_ACCEPTANCE_TERMINAL_ORIGIN_KIND = Object.freeze({
  SPATIAL: 'spatial',
  ACCESSIBLE_NON_SPATIAL: 'accessible-non-spatial',
} as const);

export const ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND = Object.freeze({
  REENTRANT_CALL: 'reentrant-call',
  START_FAILED: 'start-failed',
  AUTHORITY_STEP_FAILED: 'authority-step-failed',
  POST_FRAME_INVALID: 'post-frame-invalid',
  ADAPTER_FAILED: 'adapter-failed',
  HOST_COMMIT_FAILED: 'host-commit-failed',
  FRAME_LOOP_FAILED: 'frame-loop-failed',
  CLEANUP_FAILED: 'cleanup-failed',
} as const);

type ArenaP1SupplyAcceptanceRuntimeState =
  typeof ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE[
    keyof typeof ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE
  ];
type ArenaP1SupplyAcceptanceFailureKind =
  typeof ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND[
    keyof typeof ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND
  ];
type UnknownMethod = (...args: unknown[]) => unknown;

export interface ArenaP1SupplyAcceptanceTerminalCuePlacementV1 {
  readonly schemaVersion: 1;
  readonly cueId: string;
  readonly supplyId: string;
  readonly equipmentInstanceId: string;
  readonly originKind:
    typeof ARENA_P1_SUPPLY_ACCEPTANCE_TERMINAL_ORIGIN_KIND[
      keyof typeof ARENA_P1_SUPPLY_ACCEPTANCE_TERMINAL_ORIGIN_KIND
    ];
  readonly position: ArenaSupplyPresentationPositionV1 | null;
}

export interface ArenaP1SupplyAcceptanceHostCommitV1 {
  readonly schemaVersion: 1;
  readonly view: ArenaSupplyPresentationViewV1;
  readonly terminalCuePlacements: readonly ArenaP1SupplyAcceptanceTerminalCuePlacementV1[];
}

export interface ArenaP1SupplyAcceptanceInputSampleV1 {
  readonly schemaVersion: 1;
  readonly tick: number;
  readonly eventSequence: number;
  readonly participantId: string;
  readonly localActionSidecar: MatchReadFrameV2['localActionSidecar'];
}

export interface ArenaP1SupplyAcceptanceRuntimeDebugSnapshotV1 {
  readonly schemaVersion: 1;
  readonly state: ArenaP1SupplyAcceptanceRuntimeState;
  readonly currentTick: number | null;
  readonly lastCommittedSnapshotTick: number | null;
  readonly frameLoopOwned: boolean;
  readonly narrowInputRetryCount: number;
  readonly terminalFailureKind: ArenaP1SupplyAcceptanceFailureKind | null;
  readonly pendingCleanup: readonly string[];
}

interface HostMethods {
  readonly sampleInput: UnknownMethod;
  readonly commit: UnknownMethod;
  readonly startFrameLoop: UnknownMethod;
  readonly cancelFrameLoop: UnknownMethod;
  readonly destroyListeners: UnknownMethod;
  readonly destroyParticles: UnknownMethod;
  readonly destroyVoices: UnknownMethod;
  readonly destroyGpu: UnknownMethod;
  readonly destroyDom: UnknownMethod;
  readonly destroyAsyncCallbacks: UnknownMethod;
}

interface HostCleanupOwnership {
  cancelFrameLoop: boolean;
  asyncCallbacks: boolean;
  listeners: boolean;
  particles: boolean;
  voices: boolean;
  gpu: boolean;
  dom: boolean;
}

interface NormalizedComposition {
  readonly options: ArenaV2SurvivalSupplyBotCompositionOptions;
  readonly lifecycleContract: Readonly<{
    supplyDefinitionId: string;
    firstSpawnTick: number;
    spawnIntervalTicks: number;
    spawnCount: number;
    lifetimeTicks: number;
    spawnSpecs: readonly Readonly<{
      slotId: string;
      equipmentDefinitionId: string;
      spawnId: string;
      position: Readonly<{ x: number; y: number; z: number }>;
    }>[];
    equipmentDefinitionIds: readonly string[];
  }>;
  readonly matchSeed: number;
}

interface ThrowableWrapper extends Error {
  originalError: unknown;
}

class ReentrantRuntimeCallError extends Error {}
class RetryableInputSourceError extends Error {
  override readonly cause: unknown;

  constructor(cause: unknown) {
    super('P1 supply acceptance 输入未进入 authority，可在同 tick 窄重试。');
    this.cause = cause;
  }
}
class PostFrameInvariantError extends Error {}

const RUNTIME_OPTION_KEYS = new Set(['compositionOptions', 'hostResourcePort']);
const COMPOSITION_OPTION_KEYS = new Set([
  'seed',
  'config',
  'physicsFactory',
  'ruleEngineFactory',
  'mapSystemFactory',
  'characterRegistry',
  'supply',
  'bot',
  'playerParticipantId',
  'publicMatchInfo',
]);
const BOT_OPTION_KEYS = new Set([
  'participantId',
  'difficultyId',
  'behaviorSeed',
  'personalitySeed',
  'profileRegistry',
]);
const SUPPLY_OPTION_KEYS = new Set(['supplyDefinitionId', 'spawnSpecs']);
const HOST_METHOD_KEYS = new Set([
  'sampleInput',
  'commit',
  'startFrameLoop',
  'cancelFrameLoop',
  'destroyListeners',
  'destroyParticles',
  'destroyVoices',
  'destroyGpu',
  'destroyDom',
  'destroyAsyncCallbacks',
]);
const TERMINAL_CUE_KINDS = new Set<string>([
  ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1.PICKED_UP,
  ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1.REPLACED,
  ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1.EXPIRED,
]);
const NATIVE_PROMISE_THEN = Promise.prototype.then;
const SESSION_START = LocalMatchSession.prototype.start;
const SESSION_GET_PRESENTATION_FRAME = LocalMatchSession.prototype.getPresentationReadFrame;
const SESSION_STEP_PRESENTATION = LocalMatchSession.prototype.stepWithPresentationReadFrame;
const SESSION_DESTROY = LocalMatchSession.prototype.destroy;
const ADAPTER_START = ArenaSupplyPresentationAdapter.prototype.start;
const ADAPTER_UPDATE = ArenaSupplyPresentationAdapter.prototype.update;
const ADAPTER_DESTROY = ArenaSupplyPresentationAdapter.prototype.destroy;

function safeError(value: unknown, message: string): Error {
  if (value instanceof Error) return value;
  const error = new Error(message) as ThrowableWrapper;
  error.originalError = value;
  return error;
}

function exactOwnDataRecord(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  name: string,
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') throw new TypeError(`${name} 不支持 Symbol 字段。`);
    if (!allowedKeys.has(key)) throw new RangeError(`${name} 不支持字段 ${key}。`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
    }
    result[key] = descriptor.value;
  }
  return Object.freeze(result);
}

function requireOwn(record: Readonly<Record<string, unknown>>, key: string, name: string): unknown {
  if (!Object.hasOwn(record, key)) throw new TypeError(`${name} 缺少 ${key}。`);
  return record[key];
}

function stableText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function normalizeCompositionOptions(value: unknown): NormalizedComposition {
  const source = exactOwnDataRecord(
    value,
    COMPOSITION_OPTION_KEYS,
    'ArenaP1SupplyAcceptanceRuntime.compositionOptions',
  );
  const botSource = exactOwnDataRecord(
    requireOwn(source, 'bot', 'ArenaP1SupplyAcceptanceRuntime.compositionOptions'),
    BOT_OPTION_KEYS,
    'ArenaP1SupplyAcceptanceRuntime.compositionOptions.bot',
  );
  for (const key of BOT_OPTION_KEYS) {
    requireOwn(botSource, key, 'ArenaP1SupplyAcceptanceRuntime.compositionOptions.bot');
  }
  const supplySource = cloneFrozenData(
    requireOwn(source, 'supply', 'ArenaP1SupplyAcceptanceRuntime.compositionOptions'),
    'ArenaP1SupplyAcceptanceRuntime.compositionOptions.supply',
  ) as Readonly<Record<string, unknown>>;
  const supply = exactOwnDataRecord(
    supplySource,
    SUPPLY_OPTION_KEYS,
    'ArenaP1SupplyAcceptanceRuntime.compositionOptions.supply',
  );
  const supplyDefinitionId = requireOwn(
    supply,
    'supplyDefinitionId',
    'ArenaP1SupplyAcceptanceRuntime.compositionOptions.supply',
  );
  if (supplyDefinitionId !== ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id) {
    throw new RangeError('P1 acceptance 只允许正式 survival supply Definition。');
  }
  const rawSpawnSpecs = requireOwn(
    supply,
    'spawnSpecs',
    'ArenaP1SupplyAcceptanceRuntime.compositionOptions.supply',
  );
  if (!Array.isArray(rawSpawnSpecs)) throw new TypeError('P1 acceptance spawnSpecs 必须是数组。');
  for (const [index, candidate] of rawSpawnSpecs.entries()) {
    if (candidate === null || typeof candidate !== 'object'
      || typeof (candidate as { slotId?: unknown }).slotId !== 'string'
      || typeof (candidate as { equipmentDefinitionId?: unknown }).equipmentDefinitionId !== 'string') {
      throw new TypeError(`P1 acceptance spawnSpecs[${index}] identity 无效。`);
    }
  }
  const spawnSpecs = Object.freeze(
    [...rawSpawnSpecs].sort((left, right) => stableText(
      (left as { slotId: string }).slotId,
      (right as { slotId: string }).slotId,
    )),
  ) as NormalizedComposition['lifecycleContract']['spawnSpecs'];
  const equipmentDefinitionIds = Object.freeze(
    [...new Set(spawnSpecs.map(({ equipmentDefinitionId }) => equipmentDefinitionId))]
      .sort(stableText),
  );
  const normalizedSupply = Object.freeze({ supplyDefinitionId, spawnSpecs });
  const normalizedBot: Record<string, unknown> = {};
  for (const key of BOT_OPTION_KEYS) {
    normalizedBot[key] = key === 'profileRegistry'
      ? botSource[key]
      : cloneFrozenData(botSource[key], `ArenaP1SupplyAcceptanceRuntime.compositionOptions.bot.${key}`);
  }
  const options: Record<string, unknown> = {};
  for (const key of COMPOSITION_OPTION_KEYS) {
    if (!Object.hasOwn(source, key)) continue;
    if (key === 'supply') options[key] = normalizedSupply;
    else if (key === 'bot') options[key] = Object.freeze(normalizedBot);
    else if (key === 'characterRegistry'
      || key === 'physicsFactory'
      || key === 'ruleEngineFactory'
      || key === 'mapSystemFactory') {
      options[key] = source[key];
    } else {
      options[key] = cloneFrozenData(
        source[key],
        `ArenaP1SupplyAcceptanceRuntime.compositionOptions.${key}`,
      );
    }
  }
  const publicMatchInfo = requireOwn(
    options,
    'publicMatchInfo',
    'ArenaP1SupplyAcceptanceRuntime.compositionOptions',
  ) as Readonly<Record<string, unknown>>;
  if (!Number.isSafeInteger(publicMatchInfo.matchSeed) || (publicMatchInfo.matchSeed as number) < 0) {
    throw new RangeError('P1 acceptance publicMatchInfo.matchSeed 必须是非负安全整数。');
  }
  const lifecycleContract = Object.freeze({
    supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
    firstSpawnTick: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.firstSpawnTick,
    spawnIntervalTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnIntervalTicks,
    spawnCount: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnCount,
    lifetimeTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.lifetimeTicks,
    spawnSpecs,
    equipmentDefinitionIds,
  });
  return Object.freeze({
    options: Object.freeze(options) as unknown as ArenaV2SurvivalSupplyBotCompositionOptions,
    lifecycleContract,
    matchSeed: publicMatchInfo.matchSeed as number,
  });
}

function captureHostMethods(value: unknown): HostMethods {
  const source = exactOwnDataRecord(
    value,
    HOST_METHOD_KEYS,
    'ArenaP1SupplyAcceptanceRuntime.hostResourcePort',
  );
  const result: Record<string, UnknownMethod> = {};
  for (const key of HOST_METHOD_KEYS) {
    const candidate = requireOwn(source, key, 'ArenaP1SupplyAcceptanceRuntime.hostResourcePort');
    if (typeof candidate !== 'function') {
      throw new TypeError(`ArenaP1SupplyAcceptanceRuntime.hostResourcePort.${key} 必须是函数。`);
    }
    result[key] = (...args: unknown[]): unknown => Reflect.apply(candidate, value, args);
  }
  return Object.freeze(result) as unknown as HostMethods;
}

function descriptorInPrototypeChain(value: object, key: PropertyKey): PropertyDescriptor | null {
  const visited = new Set<object>();
  let current: object | null = value;
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) throw new TypeError('同步返回值原型链无效。');
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor !== undefined) return descriptor;
    current = Object.getPrototypeOf(current) as object | null;
  }
  return null;
}

function rejectThenable(value: unknown, name: string): void {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return;
  try {
    Reflect.apply(NATIVE_PROMISE_THEN, value, [() => undefined, () => undefined]);
    throw new TypeError(`${name} 必须同步完成。`);
  } catch (error) {
    if (error instanceof TypeError && error.message === `${name} 必须同步完成。`) throw error;
  }
  const descriptor = descriptorInPrototypeChain(value as object, 'then');
  if (descriptor === null) return;
  throw new TypeError(`${name} 不得返回 thenable。`);
}

function callSync(method: UnknownMethod, name: string, ...args: unknown[]): unknown {
  const result = method(...args);
  rejectThenable(result, name);
  return result;
}

function assertUndefinedReturn(value: unknown, name: string): void {
  if (value !== undefined) throw new TypeError(`${name} 必须返回 undefined。`);
}

function positionCopy(value: ArenaSupplyPresentationPositionV1): ArenaSupplyPresentationPositionV1 {
  return Object.freeze({ x: value.x, y: value.y, z: value.z });
}

function terminalPlacement(
  cue: ArenaSupplyPresentationCueV1,
  previousView: ArenaSupplyPresentationViewV1 | null,
): ArenaP1SupplyAcceptanceTerminalCuePlacementV1 {
  const marker = previousView?.markers.find((candidate) => (
    candidate.supplyId === cue.supplyId
    && candidate.equipmentInstanceId === cue.equipmentInstanceId
  ));
  return Object.freeze({
    schemaVersion: 1,
    cueId: cue.id,
    supplyId: cue.supplyId,
    equipmentInstanceId: cue.equipmentInstanceId,
    originKind: marker === undefined
      ? ARENA_P1_SUPPLY_ACCEPTANCE_TERMINAL_ORIGIN_KIND.ACCESSIBLE_NON_SPATIAL
      : ARENA_P1_SUPPLY_ACCEPTANCE_TERMINAL_ORIGIN_KIND.SPATIAL,
    position: marker === undefined ? null : positionCopy(marker.position),
  });
}

/** Package-private PP3a seam; it is intentionally absent from every shared index. */
export function createArenaP1SupplyAcceptanceHostCommitV1(
  view: ArenaSupplyPresentationViewV1,
  previousCommittedView: ArenaSupplyPresentationViewV1 | null,
): ArenaP1SupplyAcceptanceHostCommitV1 {
  const terminalCuePlacements = Object.freeze(view.cues
    .filter(({ kind }) => TERMINAL_CUE_KINDS.has(kind))
    .map((cue) => terminalPlacement(cue, previousCommittedView)));
  return Object.freeze({
    schemaVersion: 1,
    view,
    terminalCuePlacements,
  });
}

function validateFrameIdentity(
  frame: DeepReadonly<MatchReadFrameV2>,
  name: string,
): DeepReadonly<MatchReadFrameV2> {
  const world = frame.worldSnapshot;
  const local = frame.localActionSidecar;
  if (frame.schemaVersion !== 2
    || !Number.isSafeInteger(world.tick)
    || world.tick < 0
    || !Number.isSafeInteger(world.eventSequence)
    || world.eventSequence < 0
    || local.tick !== world.tick
    || local.eventSequence !== world.eventSequence
    || typeof local.participantId !== 'string'
    || local.participantId.length === 0
    || world.activeSupplyProjection === null
    || world.activeSupplyProjection.snapshotTick !== world.tick
    || world.activeSupplyProjection.snapshotEventSequence !== world.eventSequence) {
    throw new PostFrameInvariantError(`${name} identity 不闭合。`);
  }
  return frame;
}

function presentationStartInput(frame: DeepReadonly<MatchReadFrameV2>): Readonly<Record<string, unknown>> {
  const projection = frame.worldSnapshot.activeSupplyProjection;
  if (projection === null) throw new PostFrameInvariantError('P1 post frame 缺少 supply projection。');
  return Object.freeze({
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    snapshotTick: frame.worldSnapshot.tick,
    snapshotEventSequence: frame.worldSnapshot.eventSequence,
    equipment: frame.worldSnapshot.equipment,
    activeSupplyProjection: projection,
  });
}

function presentationUpdateInput(
  step: LocalMatchPresentationStepResultV2,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    ...presentationStartInput(step.readFrame),
    events: step.events,
  });
}

function validateStepResult(
  before: DeepReadonly<MatchReadFrameV2>,
  step: LocalMatchPresentationStepResultV2,
  expectedInput: ArenaInputFrame,
): LocalMatchPresentationStepResultV2 {
  if (!Array.isArray(step.events)) throw new PostFrameInvariantError('P1 authority events 必须是数组。');
  const after = validateFrameIdentity(step.readFrame, 'P1 post frame');
  if (after.worldSnapshot.tick !== before.worldSnapshot.tick + 1) {
    throw new PostFrameInvariantError('P1 authority step 必须恰好推进一个 tick。');
  }
  if (step.input === null
    || step.input.tick !== expectedInput.tick
    || step.input.participantId !== expectedInput.participantId) {
    throw new PostFrameInvariantError('P1 authority 返回的 input identity 无效。');
  }
  return step;
}

export class ArenaP1SupplyAcceptanceRuntime {
  #session: LocalMatchSession | null;
  #adapter: ArenaSupplyPresentationAdapter | null;
  #host: HostMethods | null;
  #hostOwnership: HostCleanupOwnership;
  #state: ArenaP1SupplyAcceptanceRuntimeState;
  #currentFrame: DeepReadonly<MatchReadFrameV2> | null;
  #lastCommittedView: ArenaSupplyPresentationViewV1 | null;
  #frameLoopToken: unknown;
  #frameLoopOwned: boolean;
  #generation: number;
  #inTransaction: boolean;
  #reentryCount: number;
  #narrowInputRetryCount: number;
  #terminalFailureKind: ArenaP1SupplyAcceptanceFailureKind | null;

  constructor(optionsValue: unknown) {
    this.#session = null;
    this.#adapter = null;
    this.#host = null;
    this.#hostOwnership = {
      cancelFrameLoop: false,
      asyncCallbacks: false,
      listeners: false,
      particles: false,
      voices: false,
      gpu: false,
      dom: false,
    };
    this.#state = ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.CREATED;
    this.#currentFrame = null;
    this.#lastCommittedView = null;
    this.#frameLoopToken = undefined;
    this.#frameLoopOwned = false;
    this.#generation = 1;
    this.#inTransaction = true;
    this.#reentryCount = 0;
    this.#narrowInputRetryCount = 0;
    this.#terminalFailureKind = null;

    try {
      const options = exactOwnDataRecord(
        optionsValue,
        RUNTIME_OPTION_KEYS,
        'ArenaP1SupplyAcceptanceRuntime options',
      );
      const composition = normalizeCompositionOptions(requireOwn(
        options,
        'compositionOptions',
        'ArenaP1SupplyAcceptanceRuntime options',
      ));
      const host = captureHostMethods(requireOwn(
        options,
        'hostResourcePort',
        'ArenaP1SupplyAcceptanceRuntime options',
      ));
      // A completely captured host port transfers all non-frame ownership to
      // this runtime immediately. Every later constructor failure therefore
      // uses the same retained, per-resource cleanup path as destroy().
      this.#host = host;
      this.#hostOwnership = {
        cancelFrameLoop: false,
        asyncCallbacks: true,
        listeners: true,
        particles: true,
        voices: true,
        gpu: true,
        dom: true,
      };
      this.#session = createArenaV2SurvivalSupplyBotSession(composition.options);
      const identity = readArenaV2SurvivalSupplyBotCompositionIdentity(this.#session);
      const streamIdentityHash = createDeterministicDataHash(Object.freeze({
        compositionIdentity: identity,
        matchSeed: composition.matchSeed,
      }), 'P1 supply acceptance stream identity');
      this.#adapter = new ArenaSupplyPresentationAdapter(Object.freeze({
        schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
        streamId: `p1-supply-${identity.compositionContractHash}-${streamIdentityHash}`,
        ticksPerSecond: ARENA_SUPPLY_PRESENTATION_TICKS_PER_SECOND,
        lifecycleContract: composition.lifecycleContract,
        recentEventCapacity: ARENA_SUPPLY_PRESENTATION_RECENT_EVENT_CAPACITY,
      }));
    } catch (error) {
      const cleanupErrors = this.#cleanupOwned();
      throw combineCleanupFailure(
        safeError(error, 'ArenaP1SupplyAcceptanceRuntime 构造失败。'),
        cleanupErrors,
        'ArenaP1SupplyAcceptanceRuntime 构造失败且回滚未完成。',
      );
    } finally {
      this.#inTransaction = false;
    }
    Object.freeze(this);
  }

  #enterTransaction(): number {
    if (this.#inTransaction) {
      this.#reentryCount += 1;
      throw new ReentrantRuntimeCallError('ArenaP1SupplyAcceptanceRuntime 检测到重入调用。');
    }
    this.#inTransaction = true;
    return this.#reentryCount;
  }

  #assertNoReentry(epoch: number): void {
    if (this.#reentryCount !== epoch) {
      throw new ReentrantRuntimeCallError('ArenaP1SupplyAcceptanceRuntime 检测到被吞掉的重入调用。');
    }
  }

  #isReentryFailure(error: unknown, epoch: number): boolean {
    return this.#reentryCount !== epoch || error instanceof ReentrantRuntimeCallError;
  }

  #leaveTransaction(): void {
    this.#inTransaction = false;
  }

  #requireCreated(): void {
    if (this.#state !== ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.CREATED) {
      throw new Error(`P1 acceptance runtime 无法在 ${this.#state} 状态 start。`);
    }
  }

  #requireActive(): void {
    if (this.#state !== ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.ACTIVE) {
      throw new Error(`P1 acceptance runtime 无法在 ${this.#state} 状态 step。`);
    }
  }

  #invokeHost(epoch: number, method: UnknownMethod, name: string, ...args: unknown[]): unknown {
    const result = callSync(method, name, ...args);
    this.#assertNoReentry(epoch);
    return result;
  }

  #frameCallback(generation: number): () => void {
    return () => {
      if (generation !== this.#generation) return;
      try {
        this.step();
      } catch {
        // Narrow pre-authority input failures retry on the next host frame;
        // terminal paths already fail closed and retain cleanup ownership.
      }
    };
  }

  start(): ArenaSupplyPresentationViewV1 {
    const epoch = this.#enterTransaction();
    let failureKind: ArenaP1SupplyAcceptanceFailureKind =
      ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.START_FAILED;
    try {
      this.#requireCreated();
      const session = this.#session;
      const adapter = this.#adapter;
      const host = this.#host;
      if (session === null || adapter === null || host === null) {
        return this.#failClosed(
          new Error('P1 acceptance 启动所有权不完整。'),
          ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.START_FAILED,
        );
      }
      try {
        Reflect.apply(SESSION_START, session, []);
        this.#assertNoReentry(epoch);
        const currentFrameCandidate = Reflect.apply(
          SESSION_GET_PRESENTATION_FRAME,
          session,
          [],
        ) as DeepReadonly<MatchReadFrameV2>;
        this.#assertNoReentry(epoch);
        const currentFrame = validateFrameIdentity(
          currentFrameCandidate,
          'P1 current pre-step frame',
        );
        failureKind = ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.ADAPTER_FAILED;
        const view = Reflect.apply(
          ADAPTER_START,
          adapter,
          [presentationStartInput(currentFrame)],
        ) as ArenaSupplyPresentationViewV1;
        const commit = createArenaP1SupplyAcceptanceHostCommitV1(view, null);
        failureKind = ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.HOST_COMMIT_FAILED;
        assertUndefinedReturn(
          this.#invokeHost(epoch, host.commit, 'P1 host commit', commit),
          'P1 host commit',
        );
        this.#currentFrame = currentFrame;
        this.#lastCommittedView = view;
        failureKind = ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.FRAME_LOOP_FAILED;
        const token = host.startFrameLoop(this.#frameCallback(this.#generation));
        this.#frameLoopToken = token;
        this.#frameLoopOwned = true;
        this.#hostOwnership.cancelFrameLoop = true;
        rejectThenable(token, 'P1 host startFrameLoop');
        this.#assertNoReentry(epoch);
        this.#state = ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.ACTIVE;
        return view;
      } catch (error) {
        const kind = this.#isReentryFailure(error, epoch)
          ? ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.REENTRANT_CALL
          : failureKind;
        return this.#failClosed(error, kind);
      }
    } finally {
      this.#leaveTransaction();
    }
  }

  #sampleInput(
    epoch: number,
    host: HostMethods,
    frame: DeepReadonly<MatchReadFrameV2>,
  ): ArenaInputFrame {
    const sample = Object.freeze({
      schemaVersion: 1,
      tick: frame.worldSnapshot.tick,
      eventSequence: frame.worldSnapshot.eventSequence,
      participantId: frame.localActionSidecar.participantId,
      localActionSidecar: frame.localActionSidecar,
    }) satisfies ArenaP1SupplyAcceptanceInputSampleV1;
    try {
      const candidate = this.#invokeHost(epoch, host.sampleInput, 'P1 host sampleInput', sample);
      const normalized = normalizeInputFrame(candidate, {
        expectedTick: sample.tick,
        participantIds: [sample.participantId],
      });
      this.#assertNoReentry(epoch);
      return normalized;
    } catch (error) {
      if (this.#reentryCount !== epoch || error instanceof ReentrantRuntimeCallError) throw error;
      this.#narrowInputRetryCount += 1;
      throw new RetryableInputSourceError(error);
    }
  }

  step(): ArenaSupplyPresentationViewV1 {
    const epoch = this.#enterTransaction();
    let authorityEntered = false;
    let adapterCommitted = false;
    try {
      this.#requireActive();
      const session = this.#session;
      const adapter = this.#adapter;
      const host = this.#host;
      const before = this.#currentFrame;
      const previousView = this.#lastCommittedView;
      if (session === null || adapter === null || host === null || before === null || previousView === null) {
        return this.#failClosed(
          new Error('P1 acceptance step 所有权不完整。'),
          ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.POST_FRAME_INVALID,
        );
      }
      let input: ArenaInputFrame;
      try {
        input = this.#sampleInput(epoch, host, before);
      } catch (error) {
        if (error instanceof RetryableInputSourceError) throw error;
        return this.#failClosed(error, ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.REENTRANT_CALL);
      }
      let step: LocalMatchPresentationStepResultV2;
      try {
        authorityEntered = true;
        step = Reflect.apply(
          SESSION_STEP_PRESENTATION,
          session,
          [input],
        ) as LocalMatchPresentationStepResultV2;
        this.#assertNoReentry(epoch);
      } catch (error) {
        return this.#failClosed(
          error,
          this.#isReentryFailure(error, epoch)
            ? ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.REENTRANT_CALL
            : ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.AUTHORITY_STEP_FAILED,
        );
      }
      try {
        validateStepResult(before, step, input);
      } catch (error) {
        return this.#failClosed(
          error,
          ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.POST_FRAME_INVALID,
        );
      }
      let view: ArenaSupplyPresentationViewV1;
      try {
        view = Reflect.apply(
          ADAPTER_UPDATE,
          adapter,
          [presentationUpdateInput(step)],
        ) as ArenaSupplyPresentationViewV1;
        adapterCommitted = true;
      } catch (error) {
        return this.#failClosed(
          error,
          this.#isReentryFailure(error, epoch)
            ? ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.REENTRANT_CALL
            : ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.ADAPTER_FAILED,
        );
      }
      try {
        const commit = createArenaP1SupplyAcceptanceHostCommitV1(view, previousView);
        assertUndefinedReturn(
          this.#invokeHost(epoch, host.commit, 'P1 host commit', commit),
          'P1 host commit',
        );
      } catch (error) {
        return this.#failClosed(error, this.#isReentryFailure(error, epoch)
          ? ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.REENTRANT_CALL
          : ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.HOST_COMMIT_FAILED);
      }
      if (!authorityEntered || !adapterCommitted) {
        return this.#failClosed(
          new Error('P1 acceptance 主流程承诺点不闭合。'),
          ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.POST_FRAME_INVALID,
        );
      }
      this.#currentFrame = step.readFrame;
      this.#lastCommittedView = view;
      if (step.readFrame.worldSnapshot.phase === 'ended') {
        this.#state = ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.ENDED;
        const stopErrors: Error[] = [];
        this.#cleanupFrameLoop(stopErrors);
        if (stopErrors.length > 0) {
          return this.#failClosed(
            stopErrors[0],
            ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.FRAME_LOOP_FAILED,
          );
        }
      }
      return view;
    } finally {
      this.#leaveTransaction();
    }
  }

  getLastCommittedView(): ArenaSupplyPresentationViewV1 | null {
    const epoch = this.#enterTransaction();
    try {
      this.#assertNoReentry(epoch);
      return this.#lastCommittedView;
    } finally {
      this.#leaveTransaction();
    }
  }

  getDebugSnapshot(): ArenaP1SupplyAcceptanceRuntimeDebugSnapshotV1 {
    const epoch = this.#enterTransaction();
    try {
      const pendingCleanup: string[] = [];
      if (this.#session !== null) pendingCleanup.push('session');
      if (this.#adapter !== null) pendingCleanup.push('adapter');
      if (this.#hostOwnership.cancelFrameLoop) pendingCleanup.push('frame-loop');
      if (this.#hostOwnership.asyncCallbacks) pendingCleanup.push('async');
      if (this.#hostOwnership.listeners) pendingCleanup.push('listener');
      if (this.#hostOwnership.particles) pendingCleanup.push('particle');
      if (this.#hostOwnership.voices) pendingCleanup.push('voice');
      if (this.#hostOwnership.gpu) pendingCleanup.push('gpu');
      if (this.#hostOwnership.dom) pendingCleanup.push('dom');
      const snapshot = Object.freeze({
        schemaVersion: 1,
        state: this.#state,
        currentTick: this.#currentFrame?.worldSnapshot.tick ?? null,
        lastCommittedSnapshotTick: this.#lastCommittedView?.snapshotTick ?? null,
        frameLoopOwned: this.#frameLoopOwned,
        narrowInputRetryCount: this.#narrowInputRetryCount,
        terminalFailureKind: this.#terminalFailureKind,
        pendingCleanup: Object.freeze(pendingCleanup),
      });
      this.#assertNoReentry(epoch);
      return snapshot;
    } finally {
      this.#leaveTransaction();
    }
  }

  #cleanupFrameLoop(errors: Error[]): void {
    if (!this.#hostOwnership.cancelFrameLoop) return;
    const host = this.#host;
    if (host === null) {
      errors.push(new Error('P1 frame loop cleanup 缺少 host port。'));
      return;
    }
    const epoch = this.#reentryCount;
    try {
      assertUndefinedReturn(
        callSync(host.cancelFrameLoop, 'P1 host cancelFrameLoop', this.#frameLoopToken),
        'P1 host cancelFrameLoop',
      );
      this.#assertNoReentry(epoch);
      this.#hostOwnership.cancelFrameLoop = false;
      this.#frameLoopOwned = false;
      this.#frameLoopToken = undefined;
    } catch (error) {
      errors.push(safeError(error, 'P1 frame loop 清理失败。'));
    }
  }

  #cleanupHostPart(
    ownershipKey: keyof Omit<HostCleanupOwnership, 'cancelFrameLoop'>,
    methodKey: keyof HostMethods,
    label: string,
    errors: Error[],
  ): void {
    if (!this.#hostOwnership[ownershipKey]) return;
    const host = this.#host;
    if (host === null) {
      errors.push(new Error(`P1 ${label} cleanup 缺少 host port。`));
      return;
    }
    const epoch = this.#reentryCount;
    try {
      assertUndefinedReturn(callSync(host[methodKey], `P1 host ${methodKey}`), `P1 host ${methodKey}`);
      this.#assertNoReentry(epoch);
      this.#hostOwnership[ownershipKey] = false;
    } catch (error) {
      errors.push(safeError(error, `P1 ${label} 清理失败。`));
    }
  }

  #cleanupOwned(): Error[] {
    this.#generation += 1;
    const errors: Error[] = [];
    this.#cleanupFrameLoop(errors);
    this.#cleanupHostPart('asyncCallbacks', 'destroyAsyncCallbacks', 'async callback', errors);
    this.#cleanupHostPart('listeners', 'destroyListeners', 'listener', errors);
    this.#cleanupHostPart('particles', 'destroyParticles', 'particle', errors);
    this.#cleanupHostPart('voices', 'destroyVoices', 'voice', errors);
    this.#cleanupHostPart('gpu', 'destroyGpu', 'GPU', errors);
    this.#cleanupHostPart('dom', 'destroyDom', 'DOM', errors);
    if (this.#adapter !== null) {
      const epoch = this.#reentryCount;
      try {
        Reflect.apply(ADAPTER_DESTROY, this.#adapter, []);
        this.#assertNoReentry(epoch);
        this.#adapter = null;
      } catch (error) {
        errors.push(safeError(error, 'P1 adapter 清理失败。'));
      }
    }
    if (this.#session !== null) {
      const epoch = this.#reentryCount;
      try {
        Reflect.apply(SESSION_DESTROY, this.#session, []);
        this.#assertNoReentry(epoch);
        this.#session = null;
      } catch (error) {
        errors.push(safeError(error, 'P1 Session 清理失败。'));
      }
    }
    if (!Object.values(this.#hostOwnership).some(Boolean)) this.#host = null;
    return errors;
  }

  #failClosed(error: unknown, kind: ArenaP1SupplyAcceptanceFailureKind): never {
    this.#state = ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.FAILED;
    this.#terminalFailureKind = kind;
    this.#currentFrame = null;
    this.#lastCommittedView = null;
    const cleanupErrors = this.#cleanupOwned();
    throw combineCleanupFailure(
      safeError(error, `P1 acceptance ${kind}`),
      cleanupErrors,
      `P1 acceptance ${kind} 且清理未完成。`,
    );
  }

  destroy(): void {
    const epoch = this.#enterTransaction();
    try {
      if (this.#state === ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.DESTROYED) {
        this.#assertNoReentry(epoch);
        return;
      }
      this.#currentFrame = null;
      this.#lastCommittedView = null;
      const errors = this.#cleanupOwned();
      if (errors.length > 0) {
        this.#state = ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.FAILED;
        this.#terminalFailureKind ??= ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.CLEANUP_FAILED;
        throw combineCleanupFailure(
          new Error('P1 acceptance destroy 未完成。'),
          errors,
          'P1 acceptance destroy 多项清理失败。',
        );
      }
      this.#state = ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.DESTROYED;
      this.#assertNoReentry(epoch);
    } finally {
      this.#leaveTransaction();
    }
  }
}
