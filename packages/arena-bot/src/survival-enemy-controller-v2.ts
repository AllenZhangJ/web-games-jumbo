import {
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
  normalizeInputFrame,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  SURVIVAL_ENEMY_ROUTE_INTENT_V1,
  type SurvivalEnemyObservationV1,
  type SurvivalEnemyRouteTargetV1,
} from './survival-enemy-observation-v1.js';
import {
  createSurvivalEnemyObservationV2,
  type SurvivalEnemyObservationV2,
  type SurvivalEnemyVisibleSupplyV2,
} from './survival-enemy-observation-v2.js';
import {
  SurvivalEnemyControllerV1,
  validateSurvivalEnemyControllerCheckpointV1,
  type SurvivalEnemyControllerCheckpointV1,
  type SurvivalEnemyControllerV1Options,
} from './survival-enemy-controller-v1.js';

export const SURVIVAL_ENEMY_CONTROLLER_CHECKPOINT_V2_SCHEMA_VERSION = 2 as const;
export const SURVIVAL_ENEMY_CONTROLLER_V2_CANDIDATE_STATUS = 'production-unreachable' as const;

export interface SurvivalEnemyControllerCheckpointV2 {
  readonly schemaVersion: typeof SURVIVAL_ENEMY_CONTROLLER_CHECKPOINT_V2_SCHEMA_VERSION;
  readonly delegateCheckpointV1: SurvivalEnemyControllerCheckpointV1;
  readonly lastTick: number;
  readonly lastEventSequence: number;
  readonly lastObservationHash: string | null;
  readonly lastFrame: ArenaInputFrame | null;
  readonly checkpointIdentityHash: string;
}

type SurvivalEnemyControllerCheckpointCoreV2 = Omit<
  SurvivalEnemyControllerCheckpointV2,
  'checkpointIdentityHash'
>;

const CHECKPOINT_CORE_KEYS = new Set([
  'schemaVersion', 'delegateCheckpointV1', 'lastTick', 'lastEventSequence',
  'lastObservationHash', 'lastFrame',
]);
const CHECKPOINT_KEYS = new Set([...CHECKPOINT_CORE_KEYS, 'checkpointIdentityHash']);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key}为必填字段。`);
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

function checkpointCore(value: unknown): SurvivalEnemyControllerCheckpointCoreV2 {
  exactRecord(value, CHECKPOINT_CORE_KEYS, 'SurvivalEnemyControllerCheckpointV2');
  if (value.schemaVersion !== SURVIVAL_ENEMY_CONTROLLER_CHECKPOINT_V2_SCHEMA_VERSION) {
    throw new RangeError('SurvivalEnemyControllerCheckpointV2.schemaVersion必须是2。');
  }
  const delegateCheckpointV1 = validateSurvivalEnemyControllerCheckpointV1(
    value.delegateCheckpointV1,
  );
  const lastTick = integerAtLeastMinusOne(
    value.lastTick,
    'SurvivalEnemyControllerCheckpointV2.lastTick',
  );
  const lastEventSequence = integerAtLeastMinusOne(
    value.lastEventSequence,
    'SurvivalEnemyControllerCheckpointV2.lastEventSequence',
  );
  const lastObservationHash = nullableHash(
    value.lastObservationHash,
    'SurvivalEnemyControllerCheckpointV2.lastObservationHash',
  );
  const lastFrame = value.lastFrame === null ? null : normalizeInputFrame(value.lastFrame, {
    expectedTick: lastTick,
    participantIds: [delegateCheckpointV1.participantId],
  });
  if (lastTick !== delegateCheckpointV1.lastTick) {
    throw new RangeError('SurvivalEnemyControllerCheckpointV2 wrapper/delegate tick漂移。');
  }
  if (lastTick === -1) {
    if (lastEventSequence !== -1 || lastObservationHash !== null || lastFrame !== null) {
      throw new RangeError('SurvivalEnemyControllerCheckpointV2初始历史必须为空。');
    }
  } else if (
    lastEventSequence < 0
    || lastObservationHash === null
    || lastFrame === null
    || lastEventSequence !== delegateCheckpointV1.lastEventSequence
  ) {
    throw new RangeError('SurvivalEnemyControllerCheckpointV2运行历史不闭合。');
  }
  return Object.freeze({
    schemaVersion: SURVIVAL_ENEMY_CONTROLLER_CHECKPOINT_V2_SCHEMA_VERSION,
    delegateCheckpointV1,
    lastTick,
    lastEventSequence,
    lastObservationHash,
    lastFrame,
  });
}

function withIdentity(
  core: SurvivalEnemyControllerCheckpointCoreV2,
): SurvivalEnemyControllerCheckpointV2 {
  return Object.freeze({
    ...core,
    checkpointIdentityHash: createDeterministicDataHash(
      core,
      'SurvivalEnemyControllerCheckpointV2 identity',
    ),
  });
}

export function createSurvivalEnemyControllerCheckpointV2(
  value: unknown,
): SurvivalEnemyControllerCheckpointV2 {
  const source = cloneFrozenData(value, 'SurvivalEnemyControllerCheckpointV2 create options');
  return withIdentity(checkpointCore(source));
}

export function validateSurvivalEnemyControllerCheckpointV2(
  value: unknown,
): SurvivalEnemyControllerCheckpointV2 {
  const source = cloneFrozenData(value, 'SurvivalEnemyControllerCheckpointV2');
  exactRecord(source, CHECKPOINT_KEYS, 'SurvivalEnemyControllerCheckpointV2');
  if (
    typeof source.checkpointIdentityHash !== 'string'
    || !HASH_PATTERN.test(source.checkpointIdentityHash)
  ) throw new TypeError('SurvivalEnemyControllerCheckpointV2.checkpointIdentityHash无效。');
  const core = Object.fromEntries([...CHECKPOINT_CORE_KEYS].map((key) => [key, source[key]]));
  const checkpoint = withIdentity(checkpointCore(core));
  if (checkpoint.checkpointIdentityHash !== source.checkpointIdentityHash) {
    throw new RangeError('SurvivalEnemyControllerCheckpointV2 identity hash漂移。');
  }
  return checkpoint;
}

function horizontalDistance(
  left: Readonly<{ x: number; z: number }>,
  right: Readonly<{ x: number; z: number }>,
): number {
  return Math.hypot(right.x - left.x, right.z - left.z);
}

function selectSupply(
  observation: SurvivalEnemyObservationV2,
): SurvivalEnemyVisibleSupplyV2 | null {
  if (
    observation.heldEquipment !== null
    || observation.self.actionInProgress
    || observation.visibleSupplies.length === 0
  ) return null;
  return [...observation.visibleSupplies].sort((left, right) => {
    const leftSame = left.segmentId === observation.self.currentSegmentId ? 0 : 1;
    const rightSame = right.segmentId === observation.self.currentSegmentId ? 0 : 1;
    return leftSame - rightSame
      || left.remainingTicks - right.remainingTicks
      || horizontalDistance(observation.self.position, left.position)
        - horizontalDistance(observation.self.position, right.position)
      || (left.supplyId < right.supplyId ? -1 : left.supplyId > right.supplyId ? 1 : 0);
  })[0]!;
}

function supplyTarget(
  observation: SurvivalEnemyObservationV2,
  supply: SurvivalEnemyVisibleSupplyV2,
): SurvivalEnemyRouteTargetV1 {
  if (supply.segmentId === observation.self.currentSegmentId) {
    return Object.freeze({
      segmentId: supply.segmentId,
      anchorId: `arena.survival.supply-target:${supply.supplyId}`,
      position: supply.position,
      intent: SURVIVAL_ENEMY_ROUTE_INTENT_V1.INTERCEPT,
      traversal: supply.directTraversal,
      priority: 100,
    });
  }
  const routeTarget = observation.routeTargets.find(
    ({ anchorId }) => anchorId === supply.routeTargetAnchorId,
  );
  if (routeTarget === undefined) throw new Error('SurvivalEnemyControllerV2供给路线引用漂移。');
  return Object.freeze({
    ...routeTarget,
    intent: SURVIVAL_ENEMY_ROUTE_INTENT_V1.INTERCEPT,
    priority: 100,
  });
}

function delegateObservation(
  observation: SurvivalEnemyObservationV2,
  selectedSupply: SurvivalEnemyVisibleSupplyV2 | null,
): SurvivalEnemyObservationV1 {
  return Object.freeze({
    schemaVersion: 1 as const,
    tick: observation.tick,
    eventSequence: observation.eventSequence,
    modeDefinitionId: observation.modeDefinitionId,
    participantId: observation.participantId,
    slotId: observation.slotId,
    slotGeneration: observation.slotGeneration,
    active: observation.active,
    primaryRange: observation.primaryRange,
    primaryMinimumCommitmentTicks: observation.primaryMinimumCommitmentTicks,
    primaryCommitment: observation.primaryCommitment,
    self: selectedSupply === null
      ? observation.self
      : Object.freeze({ ...observation.self, actionReady: false }),
    player: observation.player,
    routeTargets: selectedSupply === null
      ? observation.routeTargets
      : Object.freeze([supplyTarget(observation, selectedSupply)]),
  });
}

export class SurvivalEnemyControllerV2 {
  #delegate: SurvivalEnemyControllerV1;
  #lifecycle: 'active' | 'paused' | 'destroyed' = 'active';
  #lastTick = -1;
  #lastEventSequence = -1;
  #lastObservationHash: string | null = null;
  #lastFrame: ArenaInputFrame | null = null;

  static restoreFromCheckpointV2(value: unknown): SurvivalEnemyControllerV2 {
    const checkpoint = validateSurvivalEnemyControllerCheckpointV2(value);
    const delegateCheckpoint = checkpoint.delegateCheckpointV1;
    const controller = new SurvivalEnemyControllerV2({
      participantId: delegateCheckpoint.participantId,
      slotId: delegateCheckpoint.slotId,
      behaviorSeed: delegateCheckpoint.behaviorSeed,
      profile: delegateCheckpoint.profile,
    });
    controller.#delegate.destroy();
    controller.#delegate = SurvivalEnemyControllerV1.restoreFromCheckpointV1(delegateCheckpoint);
    controller.#lifecycle = delegateCheckpoint.lifecycle;
    controller.#lastTick = checkpoint.lastTick;
    controller.#lastEventSequence = checkpoint.lastEventSequence;
    controller.#lastObservationHash = checkpoint.lastObservationHash;
    controller.#lastFrame = checkpoint.lastFrame;
    return controller;
  }

  constructor(options: SurvivalEnemyControllerV1Options);
  constructor(value: unknown) {
    this.#delegate = new SurvivalEnemyControllerV1(value as SurvivalEnemyControllerV1Options);
  }

  createInput(value: unknown): ArenaInputFrame {
    if (this.#lifecycle !== 'active') {
      throw new Error(`SurvivalEnemyControllerV2状态${this.#lifecycle}拒绝输入。`);
    }
    const observation = createSurvivalEnemyObservationV2(value);
    const observationHash = createDeterministicDataHash(
      observation,
      'SurvivalEnemyControllerV2 observation',
    );
    if (observation.tick === this.#lastTick) {
      if (
        observation.eventSequence !== this.#lastEventSequence
        || observationHash !== this.#lastObservationHash
        || this.#lastFrame === null
      ) throw new RangeError('SurvivalEnemyControllerV2同tick observation发生分叉。');
      return this.#lastFrame;
    }
    if (this.#lastTick >= 0 && observation.tick !== this.#lastTick + 1) {
      throw new RangeError('SurvivalEnemyControllerV2 observation tick必须连续。');
    }
    if (observation.eventSequence < this.#lastEventSequence) {
      throw new RangeError('SurvivalEnemyControllerV2 eventSequence不得回退。');
    }
    const selectedSupply = selectSupply(observation);
    const delegated = this.#delegate.createInput(delegateObservation(observation, selectedSupply));
    const frame = selectedSupply === null ? delegated : normalizeInputFrame({
      ...delegated,
      primaryPressed: false,
      primaryHeld: false,
      slamPressed: false,
    }, {
      expectedTick: observation.tick,
      participantIds: [observation.participantId],
    });
    this.#lastTick = observation.tick;
    this.#lastEventSequence = observation.eventSequence;
    this.#lastObservationHash = observationHash;
    this.#lastFrame = frame;
    return frame;
  }

  pause(): void {
    if (this.#lifecycle !== 'active') throw new Error('SurvivalEnemyControllerV2只能从active暂停。');
    this.#delegate.pause();
    this.#lifecycle = 'paused';
  }

  resume(): void {
    if (this.#lifecycle !== 'paused') throw new Error('SurvivalEnemyControllerV2只能从paused恢复。');
    this.#delegate.resume();
    this.#lifecycle = 'active';
  }

  exportCheckpointV2(): SurvivalEnemyControllerCheckpointV2 {
    return createSurvivalEnemyControllerCheckpointV2({
      schemaVersion: SURVIVAL_ENEMY_CONTROLLER_CHECKPOINT_V2_SCHEMA_VERSION,
      delegateCheckpointV1: this.#delegate.exportCheckpointV1(),
      lastTick: this.#lastTick,
      lastEventSequence: this.#lastEventSequence,
      lastObservationHash: this.#lastObservationHash,
      lastFrame: this.#lastFrame,
    });
  }

  getDebugSnapshot(): Readonly<{
    readonly controllerVersion: 2;
    readonly lifecycle: 'active' | 'paused' | 'destroyed';
    readonly lastTick: number;
    readonly lastEventSequence: number;
    readonly delegate: ReturnType<SurvivalEnemyControllerV1['getDebugSnapshot']>;
  }> {
    return Object.freeze({
      controllerVersion: 2 as const,
      lifecycle: this.#lifecycle,
      lastTick: this.#lastTick,
      lastEventSequence: this.#lastEventSequence,
      delegate: this.#delegate.getDebugSnapshot(),
    });
  }

  destroy(): void {
    if (this.#lifecycle === 'destroyed') return;
    this.#delegate.destroy();
    this.#lifecycle = 'destroyed';
    this.#lastObservationHash = null;
    this.#lastFrame = null;
  }
}

export const SURVIVAL_ENEMY_CONTROLLER_V2_CANDIDATE = Object.freeze({
  status: SURVIVAL_ENEMY_CONTROLLER_V2_CANDIDATE_STATUS,
  hardGate: false as const,
  observationSchemaVersion: 2 as const,
  unarmedVisibleSupplyPolicy: 'same-segment-expiry-distance-stable-id' as const,
  heldEquipmentPolicy: 'pursue-player-with-existing-controller-v1' as const,
  emitsOnlyInputFrame: true as const,
  writesHitMovementSupplyOrMode: false as const,
  defaultBotRegistryWired: false as const,
  validationStatus: 'not-run' as const,
});
