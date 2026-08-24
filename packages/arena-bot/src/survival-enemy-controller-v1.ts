import {
  cloneFrozenData,
  createDeterministicDataHash,
  createNeutralInputFrame,
  createRng,
  deriveSeed,
  normalizeInputFrame,
  type ArenaInputFrame,
  type DeterministicRng,
} from '@number-strategy-jump/arena-contracts';
import {
  SURVIVAL_ENEMY_ROUTE_INTENT_V1,
  SURVIVAL_ENEMY_TRAVERSAL_V1,
  createSurvivalEnemyObservationV1,
  type SurvivalEnemyObservationV1,
  type SurvivalEnemyRouteIntentV1,
  type SurvivalEnemyRouteTargetV1,
} from './survival-enemy-observation-v1.js';
import {
  createBotPrimaryInputPacingV1,
  isBotParticipantControlAvailableV1,
} from './bot-primary-input-pacing-v1.js';

export const SURVIVAL_ENEMY_PROFILE_V1_SCHEMA_VERSION = 1 as const;
export const SURVIVAL_ENEMY_CONTROLLER_CHECKPOINT_V1_SCHEMA_VERSION = 1 as const;
export const SURVIVAL_ENEMY_CONTROLLER_V1_CANDIDATE_STATUS = 'production-unreachable' as const;

export interface SurvivalEnemyIntentWeightsV1 {
  readonly pursuit: number;
  readonly intercept: number;
  readonly recovery: number;
}

export interface SurvivalEnemyProfileV1 {
  readonly schemaVersion: typeof SURVIVAL_ENEMY_PROFILE_V1_SCHEMA_VERSION;
  readonly id: string;
  readonly decisionIntervalTicks: number;
  readonly minimumAttackIntervalTicks: number;
  readonly attackJitterTicks: number;
  readonly minimumJumpIntervalTicks: number;
  readonly maximumInputMagnitude: number;
  readonly preferredDistance: number;
  readonly attackRangeScale: number;
  readonly jumpTriggerDistance: number;
  readonly intentWeights: SurvivalEnemyIntentWeightsV1;
}

export interface SurvivalEnemyControllerV1Options {
  readonly participantId: string;
  readonly slotId: string;
  readonly behaviorSeed: number;
  readonly profile: unknown;
}

export interface SurvivalEnemyControllerDebugSnapshotV1 {
  readonly participantId: string;
  readonly slotId: string;
  readonly profileId: string;
  readonly lifecycle: 'active' | 'paused' | 'destroyed';
  readonly slotGeneration: number | null;
  readonly lastTick: number;
  readonly lastEventSequence: number;
  readonly selectedAnchorId: string | null;
  readonly nextDecisionTick: number;
  readonly nextAttackTick: number;
  readonly nextJumpTick: number;
  readonly rngState: number | null;
}

export interface SurvivalEnemyControllerCheckpointV1 {
  readonly schemaVersion: typeof SURVIVAL_ENEMY_CONTROLLER_CHECKPOINT_V1_SCHEMA_VERSION;
  readonly participantId: string;
  readonly slotId: string;
  readonly behaviorSeed: number;
  readonly profile: SurvivalEnemyProfileV1;
  readonly lifecycle: 'active' | 'paused';
  readonly slotGeneration: number | null;
  readonly lastTick: number;
  readonly lastEventSequence: number;
  readonly lastObservationHash: string | null;
  readonly lastFrame: ArenaInputFrame | null;
  readonly selectedAnchorId: string | null;
  readonly nextDecisionTick: number;
  readonly nextAttackTick: number;
  readonly nextJumpTick: number;
  readonly rngState: number | null;
  readonly checkpointIdentityHash: string;
}

type SurvivalEnemyControllerCheckpointCoreV1 = Omit<
  SurvivalEnemyControllerCheckpointV1,
  'checkpointIdentityHash'
>;

const PROFILE_KEYS = new Set([
  'schemaVersion', 'id', 'decisionIntervalTicks', 'minimumAttackIntervalTicks',
  'attackJitterTicks', 'minimumJumpIntervalTicks', 'maximumInputMagnitude',
  'preferredDistance', 'attackRangeScale', 'jumpTriggerDistance', 'intentWeights',
]);
const WEIGHT_KEYS = new Set(['pursuit', 'intercept', 'recovery']);
const OPTION_KEYS = new Set(['participantId', 'slotId', 'behaviorSeed', 'profile']);
const CHECKPOINT_CORE_KEYS = new Set([
  'schemaVersion', 'participantId', 'slotId', 'behaviorSeed', 'profile', 'lifecycle',
  'slotGeneration', 'lastTick', 'lastEventSequence', 'lastObservationHash', 'lastFrame',
  'selectedAnchorId', 'nextDecisionTick', 'nextAttackTick', 'nextJumpTick', 'rngState',
]);
const CHECKPOINT_KEYS = new Set([...CHECKPOINT_CORE_KEYS, 'checkpointIdentityHash']);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!keys.has(key)) throw new RangeError(`${name}不支持字段${key}。`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(record, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name}必须是非空字符串。`);
  }
  return value;
}

function integerBetween(value: unknown, minimum: number, maximum: number, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new RangeError(`${name}必须是${minimum}–${maximum}的安全整数。`);
  }
  return value as number;
}

function finiteBetween(value: unknown, minimum: number, maximum: number, name: string): number {
  if (!Number.isFinite(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new RangeError(`${name}必须是${minimum}–${maximum}的有限数。`);
  }
  return value as number;
}

function uint32(value: unknown, name: string): number {
  return integerBetween(value, 0, 0xffff_ffff, name);
}

function integerAtLeastMinusOne(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < -1) {
    throw new RangeError(`${name}必须是大于等于-1的安全整数。`);
  }
  return value as number;
}

function nullableString(value: unknown, name: string): string | null {
  return value === null ? null : nonEmptyString(value, name);
}

function nullableHash(value: unknown, name: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name}必须是8位小写十六进制hash或null。`);
  }
  return value;
}

export function createSurvivalEnemyProfileV1(value: unknown): SurvivalEnemyProfileV1 {
  const source = cloneFrozenData(value, 'SurvivalEnemyProfileV1');
  exactRecord(source, PROFILE_KEYS, 'SurvivalEnemyProfileV1');
  if (source.schemaVersion !== SURVIVAL_ENEMY_PROFILE_V1_SCHEMA_VERSION) {
    throw new RangeError('SurvivalEnemyProfileV1.schemaVersion必须是1。');
  }
  exactRecord(source.intentWeights, WEIGHT_KEYS, 'SurvivalEnemyProfileV1.intentWeights');
  return Object.freeze({
    schemaVersion: SURVIVAL_ENEMY_PROFILE_V1_SCHEMA_VERSION,
    id: nonEmptyString(source.id, 'SurvivalEnemyProfileV1.id'),
    decisionIntervalTicks: integerBetween(
      source.decisionIntervalTicks,
      1,
      600,
      'SurvivalEnemyProfileV1.decisionIntervalTicks',
    ),
    minimumAttackIntervalTicks: integerBetween(
      source.minimumAttackIntervalTicks,
      1,
      3600,
      'SurvivalEnemyProfileV1.minimumAttackIntervalTicks',
    ),
    attackJitterTicks: integerBetween(
      source.attackJitterTicks,
      0,
      600,
      'SurvivalEnemyProfileV1.attackJitterTicks',
    ),
    minimumJumpIntervalTicks: integerBetween(
      source.minimumJumpIntervalTicks,
      1,
      3600,
      'SurvivalEnemyProfileV1.minimumJumpIntervalTicks',
    ),
    maximumInputMagnitude: finiteBetween(
      source.maximumInputMagnitude,
      0.1,
      1,
      'SurvivalEnemyProfileV1.maximumInputMagnitude',
    ),
    preferredDistance: finiteBetween(
      source.preferredDistance,
      0,
      100,
      'SurvivalEnemyProfileV1.preferredDistance',
    ),
    attackRangeScale: finiteBetween(
      source.attackRangeScale,
      0.1,
      2,
      'SurvivalEnemyProfileV1.attackRangeScale',
    ),
    jumpTriggerDistance: finiteBetween(
      source.jumpTriggerDistance,
      0.1,
      100,
      'SurvivalEnemyProfileV1.jumpTriggerDistance',
    ),
    intentWeights: Object.freeze({
      pursuit: integerBetween(
        source.intentWeights.pursuit,
        0,
        100,
        'SurvivalEnemyProfileV1.intentWeights.pursuit',
      ),
      intercept: integerBetween(
        source.intentWeights.intercept,
        0,
        100,
        'SurvivalEnemyProfileV1.intentWeights.intercept',
      ),
      recovery: integerBetween(
        source.intentWeights.recovery,
        0,
        100,
        'SurvivalEnemyProfileV1.intentWeights.recovery',
      ),
    }),
  });
}

export const SURVIVAL_ENEMY_FAMILY_PROFILE_CANDIDATE_V1 = createSurvivalEnemyProfileV1({
  schemaVersion: SURVIVAL_ENEMY_PROFILE_V1_SCHEMA_VERSION,
  id: 'arena.survival.enemy-family.candidate.v1',
  decisionIntervalTicks: 18,
  minimumAttackIntervalTicks: 42,
  attackJitterTicks: 12,
  minimumJumpIntervalTicks: 30,
  maximumInputMagnitude: 0.82,
  preferredDistance: 1.4,
  attackRangeScale: 0.9,
  jumpTriggerDistance: 2.8,
  intentWeights: { pursuit: 24, intercept: 18, recovery: 8 },
});

function normalizeCheckpointCore(value: unknown): SurvivalEnemyControllerCheckpointCoreV1 {
  exactRecord(value, CHECKPOINT_CORE_KEYS, 'SurvivalEnemyControllerCheckpointV1');
  if (value.schemaVersion !== SURVIVAL_ENEMY_CONTROLLER_CHECKPOINT_V1_SCHEMA_VERSION) {
    throw new RangeError('SurvivalEnemyControllerCheckpointV1.schemaVersion必须是1。');
  }
  if (value.lifecycle !== 'active' && value.lifecycle !== 'paused') {
    throw new RangeError('SurvivalEnemyControllerCheckpointV1只允许active/paused。');
  }
  const participantId = nonEmptyString(
    value.participantId,
    'SurvivalEnemyControllerCheckpointV1.participantId',
  );
  const slotGeneration = value.slotGeneration === null
    ? null
    : uint32(value.slotGeneration, 'SurvivalEnemyControllerCheckpointV1.slotGeneration');
  const lastTick = integerAtLeastMinusOne(
    value.lastTick,
    'SurvivalEnemyControllerCheckpointV1.lastTick',
  );
  const lastEventSequence = integerAtLeastMinusOne(
    value.lastEventSequence,
    'SurvivalEnemyControllerCheckpointV1.lastEventSequence',
  );
  const lastObservationHash = nullableHash(
    value.lastObservationHash,
    'SurvivalEnemyControllerCheckpointV1.lastObservationHash',
  );
  const lastFrame = value.lastFrame === null ? null : normalizeInputFrame(value.lastFrame, {
    expectedTick: lastTick,
    participantIds: [participantId],
  });
  const selectedAnchorId = nullableString(
    value.selectedAnchorId,
    'SurvivalEnemyControllerCheckpointV1.selectedAnchorId',
  );
  const rngState = value.rngState === null
    ? null
    : uint32(value.rngState, 'SurvivalEnemyControllerCheckpointV1.rngState');
  if (lastTick === -1) {
    if (
      lastEventSequence !== -1
      || lastObservationHash !== null
      || lastFrame !== null
      || selectedAnchorId !== null
    ) throw new RangeError('SurvivalEnemyControllerCheckpointV1初始历史字段必须为空。');
  } else if (lastObservationHash === null || lastFrame === null || lastEventSequence < 0) {
    throw new RangeError('SurvivalEnemyControllerCheckpointV1已运行历史字段不完整。');
  }
  if ((slotGeneration === null) !== (rngState === null)) {
    throw new RangeError('SurvivalEnemyControllerCheckpointV1 generation/rngState必须同时存在。');
  }
  if (slotGeneration === null && lastTick !== -1) {
    throw new RangeError('SurvivalEnemyControllerCheckpointV1已运行状态缺少slotGeneration。');
  }
  return Object.freeze({
    schemaVersion: SURVIVAL_ENEMY_CONTROLLER_CHECKPOINT_V1_SCHEMA_VERSION,
    participantId,
    slotId: nonEmptyString(value.slotId, 'SurvivalEnemyControllerCheckpointV1.slotId'),
    behaviorSeed: uint32(value.behaviorSeed, 'SurvivalEnemyControllerCheckpointV1.behaviorSeed'),
    profile: createSurvivalEnemyProfileV1(value.profile),
    lifecycle: value.lifecycle,
    slotGeneration,
    lastTick,
    lastEventSequence,
    lastObservationHash,
    lastFrame,
    selectedAnchorId,
    nextDecisionTick: integerBetween(
      value.nextDecisionTick,
      0,
      Number.MAX_SAFE_INTEGER,
      'SurvivalEnemyControllerCheckpointV1.nextDecisionTick',
    ),
    nextAttackTick: integerBetween(
      value.nextAttackTick,
      0,
      Number.MAX_SAFE_INTEGER,
      'SurvivalEnemyControllerCheckpointV1.nextAttackTick',
    ),
    nextJumpTick: integerBetween(
      value.nextJumpTick,
      0,
      Number.MAX_SAFE_INTEGER,
      'SurvivalEnemyControllerCheckpointV1.nextJumpTick',
    ),
    rngState,
  });
}

function withCheckpointIdentity(
  core: SurvivalEnemyControllerCheckpointCoreV1,
): SurvivalEnemyControllerCheckpointV1 {
  return Object.freeze({
    ...core,
    checkpointIdentityHash: createDeterministicDataHash(
      core,
      'SurvivalEnemyControllerCheckpointV1 identity',
    ),
  });
}

export function createSurvivalEnemyControllerCheckpointV1(
  value: unknown,
): SurvivalEnemyControllerCheckpointV1 {
  const source = cloneFrozenData(value, 'SurvivalEnemyControllerCheckpointV1 create options');
  return withCheckpointIdentity(normalizeCheckpointCore(source));
}

export function validateSurvivalEnemyControllerCheckpointV1(
  value: unknown,
): SurvivalEnemyControllerCheckpointV1 {
  const source = cloneFrozenData(value, 'SurvivalEnemyControllerCheckpointV1');
  exactRecord(source, CHECKPOINT_KEYS, 'SurvivalEnemyControllerCheckpointV1');
  if (typeof source.checkpointIdentityHash !== 'string' || !HASH_PATTERN.test(source.checkpointIdentityHash)) {
    throw new TypeError('SurvivalEnemyControllerCheckpointV1.checkpointIdentityHash无效。');
  }
  const core = Object.fromEntries([...CHECKPOINT_CORE_KEYS].map((key) => [key, source[key]]));
  const checkpoint = withCheckpointIdentity(normalizeCheckpointCore(core));
  if (checkpoint.checkpointIdentityHash !== source.checkpointIdentityHash) {
    throw new RangeError('SurvivalEnemyControllerCheckpointV1 identity hash漂移。');
  }
  return checkpoint;
}

function weightForIntent(
  profile: SurvivalEnemyProfileV1,
  intent: SurvivalEnemyRouteIntentV1,
): number {
  if (intent === SURVIVAL_ENEMY_ROUTE_INTENT_V1.PURSUIT) return profile.intentWeights.pursuit;
  if (intent === SURVIVAL_ENEMY_ROUTE_INTENT_V1.INTERCEPT) return profile.intentWeights.intercept;
  return profile.intentWeights.recovery;
}

function horizontalDistance(
  first: Readonly<{ x: number; z: number }>,
  second: Readonly<{ x: number; z: number }>,
): number {
  return Math.hypot(second.x - first.x, second.z - first.z);
}

export class SurvivalEnemyControllerV1 {
  readonly #participantId: string;
  readonly #slotId: string;
  readonly #behaviorSeed: number;
  readonly #profile: SurvivalEnemyProfileV1;
  #lifecycle: 'active' | 'paused' | 'destroyed' = 'active';
  #rng: DeterministicRng | null = null;
  #slotGeneration: number | null = null;
  #lastTick = -1;
  #lastEventSequence = -1;
  #lastObservationHash: string | null = null;
  #lastFrame: ArenaInputFrame | null = null;
  #selectedAnchorId: string | null = null;
  #nextDecisionTick = 0;
  #nextAttackTick = 0;
  #nextJumpTick = 0;

  static restoreFromCheckpointV1(value: unknown): SurvivalEnemyControllerV1 {
    const checkpoint = validateSurvivalEnemyControllerCheckpointV1(value);
    const controller = new SurvivalEnemyControllerV1({
      participantId: checkpoint.participantId,
      slotId: checkpoint.slotId,
      behaviorSeed: checkpoint.behaviorSeed,
      profile: checkpoint.profile,
    });
    controller.#restoreCheckpoint(checkpoint);
    return controller;
  }

  constructor(options: SurvivalEnemyControllerV1Options);
  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'SurvivalEnemyControllerV1 options');
    exactRecord(source, OPTION_KEYS, 'SurvivalEnemyControllerV1 options');
    this.#participantId = nonEmptyString(
      source.participantId,
      'SurvivalEnemyControllerV1.participantId',
    );
    this.#slotId = nonEmptyString(source.slotId, 'SurvivalEnemyControllerV1.slotId');
    this.#behaviorSeed = uint32(source.behaviorSeed, 'SurvivalEnemyControllerV1.behaviorSeed');
    this.#profile = createSurvivalEnemyProfileV1(source.profile);
  }

  #restoreCheckpoint(checkpoint: SurvivalEnemyControllerCheckpointV1): void {
    if (
      this.#lastTick !== -1
      || this.#slotGeneration !== null
      || this.#rng !== null
      || this.#lastFrame !== null
    ) throw new Error('SurvivalEnemyControllerV1只能从全新实例恢复。');
    if (
      checkpoint.participantId !== this.#participantId
      || checkpoint.slotId !== this.#slotId
      || checkpoint.behaviorSeed !== this.#behaviorSeed
      || createDeterministicDataHash(checkpoint.profile) !== createDeterministicDataHash(this.#profile)
    ) throw new RangeError('SurvivalEnemyControllerV1 checkpoint身份漂移。');
    let rng: DeterministicRng | null = null;
    if (checkpoint.slotGeneration !== null && checkpoint.rngState !== null) {
      rng = createRng(deriveSeed(
        this.#behaviorSeed,
        `arena.survival.enemy:${this.#slotId}:generation:${checkpoint.slotGeneration}`,
      ));
      rng.restore(checkpoint.rngState);
    }
    this.#lifecycle = checkpoint.lifecycle;
    this.#rng = rng;
    this.#slotGeneration = checkpoint.slotGeneration;
    this.#lastTick = checkpoint.lastTick;
    this.#lastEventSequence = checkpoint.lastEventSequence;
    this.#lastObservationHash = checkpoint.lastObservationHash;
    this.#lastFrame = checkpoint.lastFrame;
    this.#selectedAnchorId = checkpoint.selectedAnchorId;
    this.#nextDecisionTick = checkpoint.nextDecisionTick;
    this.#nextAttackTick = checkpoint.nextAttackTick;
    this.#nextJumpTick = checkpoint.nextJumpTick;
  }

  #assertActive(): void {
    if (this.#lifecycle !== 'active') {
      throw new Error(`SurvivalEnemyControllerV1状态${this.#lifecycle}拒绝输入。`);
    }
  }

  #resetGeneration(generation: number, tick: number): void {
    this.#slotGeneration = generation;
    this.#rng = createRng(deriveSeed(
      this.#behaviorSeed,
      `arena.survival.enemy:${this.#slotId}:generation:${generation}`,
    ));
    this.#selectedAnchorId = null;
    this.#nextDecisionTick = tick;
    this.#nextAttackTick = tick;
    this.#nextJumpTick = tick;
  }

  #selectTarget(observation: SurvivalEnemyObservationV1): SurvivalEnemyRouteTargetV1 {
    const rng = this.#rng;
    if (rng === null) throw new Error('SurvivalEnemyControllerV1缺少具名随机流。');
    const scored = observation.routeTargets.map((target) => Object.freeze({
      target,
      score: target.priority + weightForIntent(this.#profile, target.intent),
    })).sort((left, right) => (
      right.score - left.score
      || (left.target.anchorId < right.target.anchorId ? -1 : 1)
    ));
    const highestScore = scored[0]?.score;
    if (highestScore === undefined) throw new RangeError('Survival enemy没有合法route target。');
    return rng.pick(scored.filter(({ score }) => score === highestScore)).target;
  }

  #currentTarget(observation: SurvivalEnemyObservationV1): SurvivalEnemyRouteTargetV1 {
    let selected = this.#selectedAnchorId === null
      ? undefined
      : observation.routeTargets.find(({ anchorId }) => anchorId === this.#selectedAnchorId);
    if (selected === undefined || observation.tick >= this.#nextDecisionTick) {
      selected = this.#selectTarget(observation);
      this.#selectedAnchorId = selected.anchorId;
      this.#nextDecisionTick = observation.tick + this.#profile.decisionIntervalTicks;
    }
    return selected;
  }

  #commitFrame(
    observation: SurvivalEnemyObservationV1,
    observationHash: string,
    frame: ArenaInputFrame,
  ): ArenaInputFrame {
    this.#lastTick = observation.tick;
    this.#lastEventSequence = observation.eventSequence;
    this.#lastObservationHash = observationHash;
    this.#lastFrame = frame;
    return frame;
  }

  createInput(value: unknown): ArenaInputFrame {
    this.#assertActive();
    const observation = createSurvivalEnemyObservationV1(value);
    if (observation.participantId !== this.#participantId || observation.slotId !== this.#slotId) {
      throw new RangeError('SurvivalEnemyControllerV1 observation身份漂移。');
    }
    const observationHash = createDeterministicDataHash(
      observation,
      'SurvivalEnemyControllerV1 observation',
    );
    if (observation.tick === this.#lastTick) {
      if (
        observation.eventSequence !== this.#lastEventSequence
        || observationHash !== this.#lastObservationHash
        || this.#lastFrame === null
      ) throw new RangeError('SurvivalEnemyControllerV1同tick observation发生分叉。');
      return this.#lastFrame;
    }
    if (this.#lastTick >= 0 && observation.tick !== this.#lastTick + 1) {
      throw new RangeError('SurvivalEnemyControllerV1 observation tick必须连续。');
    }
    if (observation.eventSequence < this.#lastEventSequence) {
      throw new RangeError('SurvivalEnemyControllerV1 eventSequence不得回退。');
    }
    if (this.#slotGeneration !== null && observation.slotGeneration < this.#slotGeneration) {
      throw new RangeError('SurvivalEnemyControllerV1 slotGeneration不得回退。');
    }
    if (observation.slotGeneration !== this.#slotGeneration) {
      this.#resetGeneration(observation.slotGeneration, observation.tick);
    }
    const canControl = isBotParticipantControlAvailableV1({
      schemaVersion: 1,
      participantActive: observation.active,
      hitstunTicks: observation.self.hitstunTicks,
    });
    if (!canControl) {
      return this.#commitFrame(
        observation,
        observationHash,
        createNeutralInputFrame(observation.tick, this.#participantId),
      );
    }

    const target = this.#currentTarget(observation);
    const chargingCommitment = observation.primaryCommitment?.status === 'charging';
    const sameSegmentAsPlayer = observation.self.currentSegmentId !== null
      && observation.self.currentSegmentId === observation.player.currentSegmentId;
    const canTrackChargingPlayer = chargingCommitment
      && observation.player.invulnerableTicks === 0;
    const movementTarget = chargingCommitment
      ? canTrackChargingPlayer
        ? observation.player.position
        : observation.self.position
      : sameSegmentAsPlayer
      && target.intent === SURVIVAL_ENEMY_ROUTE_INTENT_V1.PURSUIT
      ? observation.player.position
      : target.position;
    const dx = movementTarget.x - observation.self.position.x;
    const dz = movementTarget.z - observation.self.position.z;
    const targetDistance = Math.hypot(dx, dz);
    const shouldHoldDistance = sameSegmentAsPlayer
      && targetDistance <= this.#profile.preferredDistance;
    const magnitude = targetDistance > 1e-7 && !shouldHoldDistance
      ? this.#profile.maximumInputMagnitude / targetDistance
      : 0;

    const playerDistance = horizontalDistance(observation.self.position, observation.player.position);
    const canAttack = observation.self.actionReady
      && observation.player.invulnerableTicks === 0
      && playerDistance <= observation.primaryRange * this.#profile.attackRangeScale
      && observation.tick >= this.#nextAttackTick;
    if (canAttack) {
      const rng = this.#rng;
      if (rng === null) throw new Error('SurvivalEnemyControllerV1缺少攻击随机流。');
      this.#nextAttackTick = observation.tick
        + this.#profile.minimumAttackIntervalTicks
        + rng.int(0, this.#profile.attackJitterTicks);
    }
    const primaryInput = createBotPrimaryInputPacingV1({
      schemaVersion: 1,
      actionReady: observation.self.actionReady,
      actionInProgress: observation.self.actionInProgress,
      commitment: observation.primaryCommitment,
      minimumCommitmentTicks: observation.primaryMinimumCommitmentTicks,
      wantsToStart: canAttack,
    });

    const canJump = !chargingCommitment
      && target.traversal === SURVIVAL_ENEMY_TRAVERSAL_V1.JUMP
      && observation.self.grounded
      && targetDistance <= this.#profile.jumpTriggerDistance
      && observation.tick >= this.#nextJumpTick;
    if (canJump) this.#nextJumpTick = observation.tick + this.#profile.minimumJumpIntervalTicks;

    return this.#commitFrame(observation, observationHash, normalizeInputFrame({
      tick: observation.tick,
      participantId: this.#participantId,
      moveX: dx * magnitude,
      moveZ: dz * magnitude,
      primaryPressed: primaryInput.primaryPressed,
      primaryHeld: primaryInput.primaryHeld,
      jumpPressed: canJump,
      jumpHeld: canJump,
      slamPressed: false,
    }, {
      expectedTick: observation.tick,
      participantIds: [this.#participantId],
    }));
  }

  pause(): void {
    if (this.#lifecycle !== 'active') throw new Error('SurvivalEnemyControllerV1只能从active暂停。');
    this.#lifecycle = 'paused';
  }

  resume(): void {
    if (this.#lifecycle !== 'paused') throw new Error('SurvivalEnemyControllerV1只能从paused恢复。');
    this.#lifecycle = 'active';
  }

  exportCheckpointV1(): SurvivalEnemyControllerCheckpointV1 {
    if (this.#lifecycle === 'destroyed') {
      throw new Error('SurvivalEnemyControllerV1已销毁，不能导出checkpoint。');
    }
    return createSurvivalEnemyControllerCheckpointV1({
      schemaVersion: SURVIVAL_ENEMY_CONTROLLER_CHECKPOINT_V1_SCHEMA_VERSION,
      participantId: this.#participantId,
      slotId: this.#slotId,
      behaviorSeed: this.#behaviorSeed,
      profile: this.#profile,
      lifecycle: this.#lifecycle,
      slotGeneration: this.#slotGeneration,
      lastTick: this.#lastTick,
      lastEventSequence: this.#lastEventSequence,
      lastObservationHash: this.#lastObservationHash,
      lastFrame: this.#lastFrame,
      selectedAnchorId: this.#selectedAnchorId,
      nextDecisionTick: this.#nextDecisionTick,
      nextAttackTick: this.#nextAttackTick,
      nextJumpTick: this.#nextJumpTick,
      rngState: this.#rng?.snapshot() ?? null,
    });
  }

  destroy(): void {
    if (this.#lifecycle === 'destroyed') return;
    this.#lifecycle = 'destroyed';
    this.#rng = null;
    this.#lastObservationHash = null;
    this.#lastFrame = null;
    this.#selectedAnchorId = null;
  }

  getDebugSnapshot(): Readonly<SurvivalEnemyControllerDebugSnapshotV1> {
    return Object.freeze({
      participantId: this.#participantId,
      slotId: this.#slotId,
      profileId: this.#profile.id,
      lifecycle: this.#lifecycle,
      slotGeneration: this.#slotGeneration,
      lastTick: this.#lastTick,
      lastEventSequence: this.#lastEventSequence,
      selectedAnchorId: this.#selectedAnchorId,
      nextDecisionTick: this.#nextDecisionTick,
      nextAttackTick: this.#nextAttackTick,
      nextJumpTick: this.#nextJumpTick,
      rngState: this.#rng?.snapshot() ?? null,
    });
  }
}
