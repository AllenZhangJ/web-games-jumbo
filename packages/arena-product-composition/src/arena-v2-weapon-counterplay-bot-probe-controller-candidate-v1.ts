import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
  normalizeInputFrame,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2MatchSceneReadFrameCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  createArenaV2WeaponCounterplayBotProbeInputCandidateV1,
  createArenaV2WeaponCounterplayBotProbeObservationCandidateV1,
  type ArenaV2CurrentLegalCounterplayRouteTargetCandidateV1,
} from './arena-v2-weapon-counterplay-bot-probe-composition-candidate-v1.js';

export const ARENA_V2_WEAPON_COUNTERPLAY_BOT_PROBE_CONTROLLER_CHECKPOINT_SCHEMA_VERSION_V1 =
  1 as const;

export interface ArenaV2WeaponCounterplayBotProbeControllerOptionsCandidateV1 {
  readonly participantId: string;
  readonly opponentParticipantId: string;
}

export interface ArenaV2WeaponCounterplayBotProbeControllerStepCandidateV1 {
  readonly scene: ArenaV2MatchSceneReadFrameCandidateV1;
  readonly selfPrimaryReady: boolean;
  readonly selfPrimaryRange: number;
  readonly selfJumpAvailable: boolean;
  readonly currentLegalRouteTargets:
    readonly ArenaV2CurrentLegalCounterplayRouteTargetCandidateV1[];
}

export interface ArenaV2WeaponCounterplayBotProbeEpochIdentityCandidateV1 {
  readonly matchSeed: number;
  readonly modeDefinitionId: string;
  readonly mapDefinitionId: string;
}

export interface ArenaV2WeaponCounterplayBotProbeControllerCheckpointCandidateV1 {
  readonly schemaVersion:
    typeof ARENA_V2_WEAPON_COUNTERPLAY_BOT_PROBE_CONTROLLER_CHECKPOINT_SCHEMA_VERSION_V1;
  readonly participantId: string;
  readonly opponentParticipantId: string;
  readonly lifecycle: 'active' | 'paused';
  readonly epochIdentity: ArenaV2WeaponCounterplayBotProbeEpochIdentityCandidateV1 | null;
  readonly lastTick: number;
  readonly lastEventSequence: number;
  readonly lastSourceIdentityHash: string | null;
  readonly lastEquipmentDefinitionId: string | null;
  readonly lastFrame: ArenaInputFrame | null;
  readonly checkpointIdentityHash: string;
}

export interface ArenaV2WeaponCounterplayBotProbeControllerSnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly participantId: string;
  readonly opponentParticipantId: string;
  readonly lifecycle: 'active' | 'paused' | 'destroyed';
  readonly epochIdentity: ArenaV2WeaponCounterplayBotProbeEpochIdentityCandidateV1 | null;
  readonly lastTick: number;
  readonly lastEventSequence: number;
  readonly lastEquipmentDefinitionId: string | null;
  readonly hasCommittedFrame: boolean;
}

type ControllerCheckpointCore = Omit<
  ArenaV2WeaponCounterplayBotProbeControllerCheckpointCandidateV1,
  'checkpointIdentityHash'
>;

const OPTIONS_KEYS = new Set(['participantId', 'opponentParticipantId']);
const STEP_KEYS = new Set([
  'scene', 'selfPrimaryReady', 'selfPrimaryRange', 'selfJumpAvailable',
  'currentLegalRouteTargets',
]);
const EPOCH_KEYS = new Set(['matchSeed', 'modeDefinitionId', 'mapDefinitionId']);
const CHECKPOINT_CORE_KEYS = new Set([
  'schemaVersion', 'participantId', 'opponentParticipantId', 'lifecycle',
  'epochIdentity', 'lastTick', 'lastEventSequence', 'lastSourceIdentityHash',
  'lastEquipmentDefinitionId', 'lastFrame',
]);
const CHECKPOINT_KEYS = new Set([...CHECKPOINT_CORE_KEYS, 'checkpointIdentityHash']);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是对象。`);
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
}

function integerAtLeastMinusOne(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < -1) {
    throw new RangeError(`${name}必须是大于等于-1的安全整数。`);
  }
  return value as number;
}

function nullableHash(value: unknown, name: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name}必须是8位小写十六进制hash或null。`);
  }
  return value;
}

function epochIdentity(
  value: unknown,
): ArenaV2WeaponCounterplayBotProbeEpochIdentityCandidateV1 {
  exactRecord(value, EPOCH_KEYS, 'Arena V2反制Bot epoch identity');
  const matchSeed = assertIntegerAtLeast(
    value.matchSeed,
    0,
    'Arena V2反制Bot epoch identity.matchSeed',
  );
  if (matchSeed > 0xffffffff) {
    throw new RangeError('Arena V2反制Bot epoch identity.matchSeed必须是uint32。');
  }
  return Object.freeze({
    matchSeed,
    modeDefinitionId: assertNonEmptyString(
      value.modeDefinitionId,
      'Arena V2反制Bot epoch identity.modeDefinitionId',
    ),
    mapDefinitionId: assertNonEmptyString(
      value.mapDefinitionId,
      'Arena V2反制Bot epoch identity.mapDefinitionId',
    ),
  });
}

function sameEpoch(
  left: ArenaV2WeaponCounterplayBotProbeEpochIdentityCandidateV1,
  right: ArenaV2WeaponCounterplayBotProbeEpochIdentityCandidateV1,
): boolean {
  return left.matchSeed === right.matchSeed
    && left.modeDefinitionId === right.modeDefinitionId
    && left.mapDefinitionId === right.mapDefinitionId;
}

function normalizeOptions(
  value: unknown,
): ArenaV2WeaponCounterplayBotProbeControllerOptionsCandidateV1 {
  const source = cloneFrozenData(value, 'Arena V2反制Bot Controller options');
  exactRecord(source, OPTIONS_KEYS, 'Arena V2反制Bot Controller options');
  const participantId = assertNonEmptyString(
    source.participantId,
    'Arena V2反制Bot Controller options.participantId',
  );
  const opponentParticipantId = assertNonEmptyString(
    source.opponentParticipantId,
    'Arena V2反制Bot Controller options.opponentParticipantId',
  );
  if (participantId === opponentParticipantId) {
    throw new RangeError('Arena V2反制Bot Controller观察者与对手不能相同。');
  }
  return Object.freeze({ participantId, opponentParticipantId });
}

function checkpointCore(value: unknown): ControllerCheckpointCore {
  exactRecord(value, CHECKPOINT_CORE_KEYS, 'Arena V2反制Bot Controller checkpoint');
  if (
    value.schemaVersion
    !== ARENA_V2_WEAPON_COUNTERPLAY_BOT_PROBE_CONTROLLER_CHECKPOINT_SCHEMA_VERSION_V1
  ) throw new RangeError('Arena V2反制Bot Controller checkpoint schema必须是1。');
  const participantId = assertNonEmptyString(
    value.participantId,
    'Arena V2反制Bot Controller checkpoint.participantId',
  );
  const opponentParticipantId = assertNonEmptyString(
    value.opponentParticipantId,
    'Arena V2反制Bot Controller checkpoint.opponentParticipantId',
  );
  if (participantId === opponentParticipantId) {
    throw new RangeError('Arena V2反制Bot Controller checkpoint参与者身份冲突。');
  }
  if (value.lifecycle !== 'active' && value.lifecycle !== 'paused') {
    throw new RangeError('Arena V2反制Bot Controller checkpoint lifecycle无效。');
  }
  const lastTick = integerAtLeastMinusOne(
    value.lastTick,
    'Arena V2反制Bot Controller checkpoint.lastTick',
  );
  const lastEventSequence = integerAtLeastMinusOne(
    value.lastEventSequence,
    'Arena V2反制Bot Controller checkpoint.lastEventSequence',
  );
  const lastSourceIdentityHash = nullableHash(
    value.lastSourceIdentityHash,
    'Arena V2反制Bot Controller checkpoint.lastSourceIdentityHash',
  );
  const lastEquipmentDefinitionId = value.lastEquipmentDefinitionId === null
    ? null
    : assertNonEmptyString(
      value.lastEquipmentDefinitionId,
      'Arena V2反制Bot Controller checkpoint.lastEquipmentDefinitionId',
    );
  const normalizedEpoch = value.epochIdentity === null
    ? null
    : epochIdentity(value.epochIdentity);
  const lastFrame = value.lastFrame === null ? null : normalizeInputFrame(value.lastFrame, {
    expectedTick: lastTick,
    participantIds: [participantId],
  });
  if (lastTick === -1) {
    if (
      lastEventSequence !== -1
      || normalizedEpoch !== null
      || lastSourceIdentityHash !== null
      || lastEquipmentDefinitionId !== null
      || lastFrame !== null
    ) throw new RangeError('Arena V2反制Bot Controller初始checkpoint历史必须为空。');
  } else if (
    lastEventSequence < 0
    || normalizedEpoch === null
    || lastSourceIdentityHash === null
    || lastEquipmentDefinitionId === null
    || lastFrame === null
  ) throw new RangeError('Arena V2反制Bot Controller运行checkpoint历史不闭合。');
  return Object.freeze({
    schemaVersion:
      ARENA_V2_WEAPON_COUNTERPLAY_BOT_PROBE_CONTROLLER_CHECKPOINT_SCHEMA_VERSION_V1,
    participantId,
    opponentParticipantId,
    lifecycle: value.lifecycle,
    epochIdentity: normalizedEpoch,
    lastTick,
    lastEventSequence,
    lastSourceIdentityHash,
    lastEquipmentDefinitionId,
    lastFrame,
  });
}

function withCheckpointIdentity(
  core: ControllerCheckpointCore,
): ArenaV2WeaponCounterplayBotProbeControllerCheckpointCandidateV1 {
  return Object.freeze({
    ...core,
    checkpointIdentityHash: createDeterministicDataHash(
      core,
      'ArenaV2WeaponCounterplayBotProbeControllerCheckpointCandidateV1 identity',
    ),
  });
}

export function createArenaV2WeaponCounterplayBotProbeControllerCheckpointCandidateV1(
  value: unknown,
): ArenaV2WeaponCounterplayBotProbeControllerCheckpointCandidateV1 {
  const source = cloneFrozenData(value, 'Arena V2反制Bot Controller checkpoint create');
  return withCheckpointIdentity(checkpointCore(source));
}

export function validateArenaV2WeaponCounterplayBotProbeControllerCheckpointCandidateV1(
  value: unknown,
): ArenaV2WeaponCounterplayBotProbeControllerCheckpointCandidateV1 {
  const source = cloneFrozenData(value, 'Arena V2反制Bot Controller checkpoint validate');
  exactRecord(source, CHECKPOINT_KEYS, 'Arena V2反制Bot Controller checkpoint validate');
  if (
    typeof source.checkpointIdentityHash !== 'string'
    || !HASH_PATTERN.test(source.checkpointIdentityHash)
  ) throw new TypeError('Arena V2反制Bot Controller checkpoint identity无效。');
  const core = Object.fromEntries(
    [...CHECKPOINT_CORE_KEYS].map((key) => [key, source[key]]),
  );
  const checkpoint = withCheckpointIdentity(checkpointCore(core));
  if (checkpoint.checkpointIdentityHash !== source.checkpointIdentityHash) {
    throw new RangeError('Arena V2反制Bot Controller checkpoint identity漂移。');
  }
  return checkpoint;
}

/**
 * Candidate-only state owner around the restricted counterplay probe. It
 * accepts one already validated Scene Read Frame per authority tick, caches
 * exact retries, rejects forks or time travel and emits only InputFrame. It is
 * intentionally absent from every default Bot registry and session factory.
 */
export class ArenaV2WeaponCounterplayBotProbeControllerCandidateV1 {
  readonly #participantId: string;
  readonly #opponentParticipantId: string;
  #lifecycle: 'active' | 'paused' | 'destroyed' = 'active';
  #epochIdentity: ArenaV2WeaponCounterplayBotProbeEpochIdentityCandidateV1 | null = null;
  #lastTick = -1;
  #lastEventSequence = -1;
  #lastSourceIdentityHash: string | null = null;
  #lastEquipmentDefinitionId: string | null = null;
  #lastFrame: ArenaInputFrame | null = null;
  #creatingInput = false;

  static restoreFromCheckpointCandidateV1(
    value: unknown,
  ): ArenaV2WeaponCounterplayBotProbeControllerCandidateV1 {
    const checkpoint =
      validateArenaV2WeaponCounterplayBotProbeControllerCheckpointCandidateV1(value);
    const controller = new ArenaV2WeaponCounterplayBotProbeControllerCandidateV1({
      participantId: checkpoint.participantId,
      opponentParticipantId: checkpoint.opponentParticipantId,
    });
    controller.#lifecycle = checkpoint.lifecycle;
    controller.#epochIdentity = checkpoint.epochIdentity;
    controller.#lastTick = checkpoint.lastTick;
    controller.#lastEventSequence = checkpoint.lastEventSequence;
    controller.#lastSourceIdentityHash = checkpoint.lastSourceIdentityHash;
    controller.#lastEquipmentDefinitionId = checkpoint.lastEquipmentDefinitionId;
    controller.#lastFrame = checkpoint.lastFrame;
    return controller;
  }

  constructor(options: ArenaV2WeaponCounterplayBotProbeControllerOptionsCandidateV1);
  constructor(value: unknown) {
    const options = normalizeOptions(value);
    this.#participantId = options.participantId;
    this.#opponentParticipantId = options.opponentParticipantId;
  }

  createInput(
    value: ArenaV2WeaponCounterplayBotProbeControllerStepCandidateV1,
  ): ArenaInputFrame {
    if (this.#lifecycle !== 'active') {
      throw new Error(`Arena V2反制Bot Controller状态${this.#lifecycle}拒绝输入。`);
    }
    if (this.#creatingInput) throw new Error('Arena V2反制Bot Controller createInput不允许重入。');
    exactRecord(value, STEP_KEYS, 'Arena V2反制Bot Controller step');
    const envelope = createArenaV2WeaponCounterplayBotProbeObservationCandidateV1({
      scene: value.scene as ArenaV2MatchSceneReadFrameCandidateV1,
      participantId: this.#participantId,
      opponentParticipantId: this.#opponentParticipantId,
      selfPrimaryReady: value.selfPrimaryReady as boolean,
      selfPrimaryRange: value.selfPrimaryRange as number,
      selfJumpAvailable: value.selfJumpAvailable as boolean,
      currentLegalRouteTargets: value.currentLegalRouteTargets as readonly (
        ArenaV2CurrentLegalCounterplayRouteTargetCandidateV1
      )[],
    });
    const sceneSource = value.scene.source;
    const nextEpoch = epochIdentity({
      matchSeed: sceneSource.matchSeed,
      modeDefinitionId: sceneSource.modeDefinitionId,
      mapDefinitionId: sceneSource.mapDefinitionId,
    });
    if (this.#epochIdentity !== null && !sameEpoch(this.#epochIdentity, nextEpoch)) {
      throw new RangeError('Arena V2反制Bot Controller不能跨match/mode/map epoch复用。');
    }
    const sourceIdentityHash = createDeterministicDataHash({
      source: sceneSource,
      equipmentDefinitionId: envelope.equipmentDefinitionId,
      observation: envelope.observation,
    }, 'Arena V2反制Bot Controller source identity');
    const tick = envelope.observation.tick;
    const eventSequence = sceneSource.eventSequence;
    if (tick === this.#lastTick) {
      if (
        eventSequence !== this.#lastEventSequence
        || sourceIdentityHash !== this.#lastSourceIdentityHash
        || envelope.equipmentDefinitionId !== this.#lastEquipmentDefinitionId
        || this.#lastFrame === null
      ) throw new RangeError('Arena V2反制Bot Controller同tick source发生分叉。');
      return this.#lastFrame;
    }
    if (tick < this.#lastTick) {
      throw new RangeError('Arena V2反制Bot Controller tick不能回退。');
    }
    if (this.#lastTick >= 0 && tick !== this.#lastTick + 1) {
      throw new RangeError('Arena V2反制Bot Controller tick必须连续。');
    }
    if (eventSequence < this.#lastEventSequence) {
      throw new RangeError('Arena V2反制Bot Controller eventSequence不能回退。');
    }
    this.#creatingInput = true;
    try {
      const frame = createArenaV2WeaponCounterplayBotProbeInputCandidateV1(envelope);
      this.#epochIdentity = nextEpoch;
      this.#lastTick = tick;
      this.#lastEventSequence = eventSequence;
      this.#lastSourceIdentityHash = sourceIdentityHash;
      this.#lastEquipmentDefinitionId = envelope.equipmentDefinitionId;
      this.#lastFrame = frame;
      return frame;
    } catch (error) {
      this.#destroyOwnedState();
      throw error;
    } finally {
      this.#creatingInput = false;
    }
  }

  pause(): void {
    if (this.#lifecycle !== 'active') {
      throw new Error('Arena V2反制Bot Controller只能从active暂停。');
    }
    this.#lifecycle = 'paused';
  }

  resume(): void {
    if (this.#lifecycle !== 'paused') {
      throw new Error('Arena V2反制Bot Controller只能从paused恢复。');
    }
    this.#lifecycle = 'active';
  }

  exportCheckpointCandidateV1():
  ArenaV2WeaponCounterplayBotProbeControllerCheckpointCandidateV1 {
    if (this.#lifecycle === 'destroyed') {
      throw new Error('Arena V2反制Bot Controller已销毁，不能导出checkpoint。');
    }
    return createArenaV2WeaponCounterplayBotProbeControllerCheckpointCandidateV1({
      schemaVersion:
        ARENA_V2_WEAPON_COUNTERPLAY_BOT_PROBE_CONTROLLER_CHECKPOINT_SCHEMA_VERSION_V1,
      participantId: this.#participantId,
      opponentParticipantId: this.#opponentParticipantId,
      lifecycle: this.#lifecycle,
      epochIdentity: this.#epochIdentity,
      lastTick: this.#lastTick,
      lastEventSequence: this.#lastEventSequence,
      lastSourceIdentityHash: this.#lastSourceIdentityHash,
      lastEquipmentDefinitionId: this.#lastEquipmentDefinitionId,
      lastFrame: this.#lastFrame,
    });
  }

  getSnapshotCandidateV1():
  ArenaV2WeaponCounterplayBotProbeControllerSnapshotCandidateV1 {
    return Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      participantId: this.#participantId,
      opponentParticipantId: this.#opponentParticipantId,
      lifecycle: this.#lifecycle,
      epochIdentity: this.#epochIdentity,
      lastTick: this.#lastTick,
      lastEventSequence: this.#lastEventSequence,
      lastEquipmentDefinitionId: this.#lastEquipmentDefinitionId,
      hasCommittedFrame: this.#lastFrame !== null,
    });
  }

  #destroyOwnedState(): void {
    this.#lifecycle = 'destroyed';
    this.#epochIdentity = null;
    this.#lastSourceIdentityHash = null;
    this.#lastEquipmentDefinitionId = null;
    this.#lastFrame = null;
  }

  destroy(): void {
    if (this.#lifecycle === 'destroyed') return;
    this.#destroyOwnedState();
  }
}

export const ARENA_V2_WEAPON_COUNTERPLAY_BOT_PROBE_CONTROLLER_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  checkpointSchemaVersion: 1 as const,
  acceptsValidatedSceneReadFrameOnly: true as const,
  acceptsCurrentLegalRoutesOnly: true as const,
  sameTickRetryIsIdempotent: true as const,
  rejectsTickForkGapOrRollback: true as const,
  failClosedAfterInternalError: true as const,
  emitsInputFrameOnly: true as const,
  defaultBotRegistryWired: false as const,
  defaultSessionFactoryWired: false as const,
  validationStatus: 'not-run' as const,
});
