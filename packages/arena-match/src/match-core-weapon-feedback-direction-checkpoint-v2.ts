import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  validateMatchCoreWeaponFeedbackAdapterCheckpoint,
  type MatchCoreWeaponFeedbackAdapterCheckpoint,
} from './match-core-weapon-feedback-adapter-v1.js';

export interface MatchCoreWeaponFeedbackPendingDirectionV2 {
  readonly hitSourceEventId: string;
  readonly attackerId: string;
  readonly targetId: string;
  readonly actionDefinitionId: string;
  readonly firstHitTick: number;
  readonly knockbackSourceEventId: string;
  readonly impulse: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
}

export interface MatchCoreWeaponFeedbackDirectionCheckpointV2 {
  readonly schemaVersion: 2;
  readonly feedbackCheckpointIdentityHash: string;
  readonly tick: number;
  readonly sourceEventSequence: number;
  readonly pendingDirections: readonly MatchCoreWeaponFeedbackPendingDirectionV2[];
  readonly checkpointIdentityHash: string;
}

const INPUT_KEYS = new Set(['feedbackCheckpoint', 'pendingDirections']);
const DIRECTION_KEYS = new Set([
  'hitSourceEventId', 'attackerId', 'targetId', 'actionDefinitionId', 'firstHitTick',
  'knockbackSourceEventId', 'impulse',
]);
const IMPULSE_KEYS = new Set(['x', 'y', 'z']);
const CHECKPOINT_KEYS = new Set([
  'schemaVersion', 'feedbackCheckpointIdentityHash', 'tick', 'sourceEventSequence',
  'pendingDirections', 'checkpointIdentityHash',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

function impulse(value: unknown, name: string) {
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, IMPULSE_KEYS, name);
  for (const axis of ['x', 'y', 'z'] as const) {
    if (!Object.hasOwn(source, axis)
      || typeof source[axis] !== 'number'
      || !Number.isFinite(source[axis])) {
      throw new TypeError(`${name}.${axis}必须是有限数。`);
    }
  }
  const horizontalMagnitude = Math.hypot(source.x as number, source.z as number);
  if (horizontalMagnitude <= 1e-7) throw new RangeError(`${name}水平冲量不可为零。`);
  return Object.freeze({
    x: source.x as number,
    y: source.y as number,
    z: source.z as number,
  });
}

function pendingDirections(
  value: unknown,
  feedbackCheckpoint: MatchCoreWeaponFeedbackAdapterCheckpoint,
): readonly MatchCoreWeaponFeedbackPendingDirectionV2[] {
  if (!Array.isArray(value)) throw new TypeError('feedback direction pendingDirections必须是数组。');
  const participants = new Set(feedbackCheckpoint.participantIds);
  const pendingBySource = new Map(
    feedbackCheckpoint.pendingHits.map((entry) => [entry.sourceEventId, entry]),
  );
  const result = value.map((entry, index) => {
    const name = `feedback direction pendingDirections[${index}]`;
    const source = cloneFrozenData(entry, name);
    assertKnownKeys(source, DIRECTION_KEYS, name);
    for (const key of DIRECTION_KEYS) {
      if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
    }
    const hitSourceEventId = assertNonEmptyString(source.hitSourceEventId, `${name}.hitSourceEventId`);
    const attackerId = assertNonEmptyString(source.attackerId, `${name}.attackerId`);
    const targetId = assertNonEmptyString(source.targetId, `${name}.targetId`);
    const actionDefinitionId = assertNonEmptyString(
      source.actionDefinitionId,
      `${name}.actionDefinitionId`,
    );
    const firstHitTick = assertIntegerAtLeast(source.firstHitTick, 0, `${name}.firstHitTick`);
    const pending = pendingBySource.get(hitSourceEventId);
    if (!participants.has(attackerId)
      || !participants.has(targetId)
      || pending === undefined
      || pending.attackerId !== attackerId
      || pending.targetId !== targetId
      || pending.actionDefinitionId !== actionDefinitionId
      || pending.firstHitTick !== firstHitTick) {
      throw new RangeError(`${name}与V1反馈checkpoint不闭合。`);
    }
    return Object.freeze({
      hitSourceEventId,
      attackerId,
      targetId,
      actionDefinitionId,
      firstHitTick,
      knockbackSourceEventId: assertNonEmptyString(
        source.knockbackSourceEventId,
        `${name}.knockbackSourceEventId`,
      ),
      impulse: impulse(source.impulse, `${name}.impulse`),
    });
  });
  if (result.length !== pendingBySource.size
    || new Set(result.map(({ hitSourceEventId }) => hitSourceEventId)).size !== result.length
    || new Set(result.map(({ targetId }) => targetId)).size !== result.length
    || result.some(({ hitSourceEventId }) => !pendingBySource.has(hitSourceEventId))) {
    throw new RangeError('feedback direction pendingDirections必须与V1 pendingHits一一闭合。');
  }
  return Object.freeze(result.sort((left, right) => (
    left.targetId < right.targetId ? -1 : left.targetId > right.targetId ? 1 : 0
  )));
}

function core(value: unknown): Omit<MatchCoreWeaponFeedbackDirectionCheckpointV2, 'checkpointIdentityHash'> {
  const source = cloneFrozenData(value, 'feedback direction checkpoint input');
  assertKnownKeys(source, INPUT_KEYS, 'feedback direction checkpoint input');
  for (const key of INPUT_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`feedback direction checkpoint缺少${key}。`);
  }
  const feedbackCheckpoint = validateMatchCoreWeaponFeedbackAdapterCheckpoint(
    source.feedbackCheckpoint,
  );
  return Object.freeze({
    schemaVersion: 2 as const,
    feedbackCheckpointIdentityHash: feedbackCheckpoint.checkpointIdentityHash,
    tick: feedbackCheckpoint.tick,
    sourceEventSequence: feedbackCheckpoint.sourceEventSequence,
    pendingDirections: pendingDirections(source.pendingDirections, feedbackCheckpoint),
  });
}

function withHash(
  value: Omit<MatchCoreWeaponFeedbackDirectionCheckpointV2, 'checkpointIdentityHash'>,
): MatchCoreWeaponFeedbackDirectionCheckpointV2 {
  return Object.freeze({
    ...value,
    checkpointIdentityHash: createDeterministicDataHash(
      value,
      'MatchCoreWeaponFeedbackDirectionCheckpointV2 identity',
    ),
  });
}

export function createMatchCoreWeaponFeedbackDirectionCheckpointV2(
  value: unknown,
): MatchCoreWeaponFeedbackDirectionCheckpointV2 {
  return withHash(core(value));
}

export function validateMatchCoreWeaponFeedbackDirectionCheckpointV2(
  value: unknown,
  feedbackCheckpointValue: unknown,
): MatchCoreWeaponFeedbackDirectionCheckpointV2 {
  const source = cloneFrozenData(value, 'feedback direction checkpoint');
  assertKnownKeys(source, CHECKPOINT_KEYS, 'feedback direction checkpoint');
  for (const key of CHECKPOINT_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`feedback direction checkpoint缺少${key}。`);
  }
  if (source.schemaVersion !== 2
    || typeof source.checkpointIdentityHash !== 'string'
    || !HASH_PATTERN.test(source.checkpointIdentityHash)) {
    throw new RangeError('feedback direction checkpoint版本或hash格式无效。');
  }
  const feedbackCheckpoint = validateMatchCoreWeaponFeedbackAdapterCheckpoint(
    feedbackCheckpointValue,
  );
  const resolved = createMatchCoreWeaponFeedbackDirectionCheckpointV2({
    feedbackCheckpoint,
    pendingDirections: source.pendingDirections,
  });
  if (source.feedbackCheckpointIdentityHash !== feedbackCheckpoint.checkpointIdentityHash
    || source.tick !== feedbackCheckpoint.tick
    || source.sourceEventSequence !== feedbackCheckpoint.sourceEventSequence
    || source.checkpointIdentityHash !== resolved.checkpointIdentityHash) {
    throw new RangeError('feedback direction checkpoint与V1权威checkpoint或身份hash不一致。');
  }
  return resolved;
}

export const MATCH_CORE_WEAPON_FEEDBACK_DIRECTION_CHECKPOINT_V2 = Object.freeze({
  schemaVersion: 2 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  pairedWithFeedbackCheckpointV1: true as const,
  pendingHitDirectionBijectionRequired: true as const,
  deterministicIdentityHashRequired: true as const,
});
