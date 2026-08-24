import {
  ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND,
  ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_SCHEMA_VERSION,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createArenaWeaponFeedbackResultDirectionV2,
  type ArenaWeaponFeedbackResultDirectionV2,
  type ArenaWeaponFeedbackSemanticKindV1,
} from '@number-strategy-jump/arena-contracts';

const INPUT_KEYS = new Set(['feedbackKind', 'sourceEventId', 'impulse']);
const IMPULSE_KEYS = new Set(['x', 'y', 'z']);
const HIT_KINDS = new Set<ArenaWeaponFeedbackSemanticKindV1>([
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_CONFIRM,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_SURFACE_TRANSFER,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_RING_OUT,
]);

function impulse(value: unknown): Readonly<{ readonly x: number; readonly y: number; readonly z: number }> {
  const source = cloneFrozenData(value, 'Weapon feedback result direction V2 impulse');
  assertKnownKeys(source, IMPULSE_KEYS, 'Weapon feedback result direction V2 impulse');
  for (const axis of ['x', 'y', 'z'] as const) {
    if (!Object.hasOwn(source, axis)
      || typeof source[axis] !== 'number'
      || !Number.isFinite(source[axis])) {
      throw new TypeError(`Weapon feedback result direction V2 impulse.${axis}必须是有限数。`);
    }
  }
  return Object.freeze({
    x: source.x as number,
    y: source.y as number,
    z: source.z as number,
  });
}

/**
 * Converts the committed Rule/Core impulse into a versioned read-only direction.
 * Presentation receives the result and never reconstructs it from positions.
 */
export function resolveArenaWeaponFeedbackResultDirectionV2(
  value: unknown,
): ArenaWeaponFeedbackResultDirectionV2 {
  const source = cloneFrozenData(value, 'Weapon feedback result direction resolver V2');
  assertKnownKeys(source, INPUT_KEYS, 'Weapon feedback result direction resolver V2');
  for (const key of INPUT_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Weapon feedback result direction resolver V2缺少${key}。`);
    }
  }
  const sourceEventId = assertNonEmptyString(
    source.sourceEventId,
    'Weapon feedback result direction resolver V2 sourceEventId',
  );
  const feedbackKind = source.feedbackKind as ArenaWeaponFeedbackSemanticKindV1;
  if (feedbackKind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.ATTACK_EVADED
    || feedbackKind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.MOVEMENT_FALL) {
    if (source.impulse !== null) {
      throw new RangeError(`${feedbackKind}不得携带权威命中冲量。`);
    }
    return createArenaWeaponFeedbackResultDirectionV2({
      schemaVersion: ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_SCHEMA_VERSION,
      kind: ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND.NO_WORLD_DIRECTION,
      sourceEventId,
      source: feedbackKind,
      worldDirection: null,
      horizontalImpulseMagnitude: null,
    });
  }
  if (!HIT_KINDS.has(feedbackKind)) {
    throw new RangeError('Weapon feedback result direction resolver V2 feedbackKind无效。');
  }
  if (source.impulse === null) throw new RangeError(`${feedbackKind}缺少KnockbackApplied冲量。`);
  const resolvedImpulse = impulse(source.impulse);
  const magnitude = Math.hypot(resolvedImpulse.x, resolvedImpulse.z);
  if (magnitude <= 1e-7) {
    throw new RangeError(`${feedbackKind}的水平KnockbackApplied冲量不可为零。`);
  }
  return createArenaWeaponFeedbackResultDirectionV2({
    schemaVersion: ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_SCHEMA_VERSION,
    kind: ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND.AUTHORITY_HORIZONTAL_IMPULSE,
    sourceEventId,
    source: 'KnockbackApplied',
    worldDirection: {
      x: resolvedImpulse.x / magnitude,
      z: resolvedImpulse.z / magnitude,
    },
    horizontalImpulseMagnitude: magnitude,
  });
}

export const ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_RESOLVER_V2 = Object.freeze({
  schemaVersion: 2 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  consumesCommittedRuleImpulseOnly: true as const,
  readsRendererPosition: false as const,
  usesWallClockOrRandomness: false as const,
});
