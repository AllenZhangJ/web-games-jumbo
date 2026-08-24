import {
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_EVENT_TYPE,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_FALL_CAUSE,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_SCHEMA_VERSION,
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createArenaWeaponFeedbackSemanticEventV1,
  type ArenaWeaponFeedbackSemanticEventV1,
  type ArenaWeaponFeedbackSemanticFallCauseV1,
} from '@number-strategy-jump/arena-contracts';

export interface ArenaWeaponFeedbackResolutionV1 {
  readonly id: string;
  readonly sequence: number;
  readonly resolutionTick: number;
  readonly attackerId: string | null;
  readonly targetId: string | null;
  readonly actionDefinitionId: string | null;
  readonly actionStartedTick: number | null;
  readonly firstHitTick: number | null;
  readonly targetFallTick: number | null;
  readonly initialSupportSurfaceId: string | null;
  readonly finalSupportSurfaceId: string | null;
  readonly fallCause: ArenaWeaponFeedbackSemanticFallCauseV1 | null;
  readonly creditedAttackerId: string | null;
}

const RESOLUTION_KEYS = new Set([
  'id',
  'sequence',
  'resolutionTick',
  'attackerId',
  'targetId',
  'actionDefinitionId',
  'actionStartedTick',
  'firstHitTick',
  'targetFallTick',
  'initialSupportSurfaceId',
  'finalSupportSurfaceId',
  'fallCause',
  'creditedAttackerId',
]);
const REQUIRED_KEYS = Object.freeze([...RESOLUTION_KEYS]);

function optionalId(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function optionalTick(value: unknown, name: string): number | null {
  return value === null ? null : assertIntegerAtLeast(value, 0, name);
}

/**
 * Resolves one completed combat exchange from authority facts. It does not
 * inspect renderer coordinates and it never uses wall-clock time or randomness.
 */
export function resolveArenaWeaponFeedbackSemanticV1(
  value: unknown,
): ArenaWeaponFeedbackSemanticEventV1 {
  const source = cloneFrozenData(value, 'Arena weapon feedback resolution V1');
  assertKnownKeys(source, RESOLUTION_KEYS, 'Arena weapon feedback resolution V1');
  for (const key of REQUIRED_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena weapon feedback resolution V1缺少${key}。`);
    }
  }
  const firstHitTick = optionalTick(source.firstHitTick, 'feedback firstHitTick');
  const targetFallTick = optionalTick(source.targetFallTick, 'feedback targetFallTick');
  const initialSupportSurfaceId = optionalId(
    source.initialSupportSurfaceId,
    'feedback initialSupportSurfaceId',
  );
  const finalSupportSurfaceId = optionalId(
    source.finalSupportSurfaceId,
    'feedback finalSupportSurfaceId',
  );
  const fallCause = source.fallCause as ArenaWeaponFeedbackSemanticFallCauseV1 | null;
  const kind = targetFallTick !== null
    ? fallCause === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_FALL_CAUSE.CREDITED_HIT
      ? ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_RING_OUT
      : ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.MOVEMENT_FALL
    : firstHitTick === null
      ? ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.ATTACK_EVADED
      : initialSupportSurfaceId !== null
        && finalSupportSurfaceId !== null
        && initialSupportSurfaceId !== finalSupportSurfaceId
        ? ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_SURFACE_TRANSFER
        : ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_CONFIRM;

  return createArenaWeaponFeedbackSemanticEventV1({
    schemaVersion: ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_SCHEMA_VERSION,
    id: assertNonEmptyString(source.id, 'feedback id'),
    type: ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_EVENT_TYPE,
    sequence: assertIntegerAtLeast(source.sequence, 0, 'feedback sequence'),
    tick: assertIntegerAtLeast(source.resolutionTick, 0, 'feedback resolutionTick'),
    kind,
    attackerId: optionalId(source.attackerId, 'feedback attackerId'),
    targetId: kind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.ATTACK_EVADED
      ? null
      : optionalId(source.targetId, 'feedback targetId'),
    actionDefinitionId: optionalId(source.actionDefinitionId, 'feedback actionDefinitionId'),
    actionStartedTick: optionalTick(source.actionStartedTick, 'feedback actionStartedTick'),
    firstHitTick,
    targetFallTick,
    initialSupportSurfaceId: kind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.ATTACK_EVADED
      ? null
      : initialSupportSurfaceId,
    finalSupportSurfaceId: kind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.ATTACK_EVADED
      ? null
      : finalSupportSurfaceId,
    fallCause,
    creditedAttackerId: optionalId(source.creditedAttackerId, 'feedback creditedAttackerId'),
  });
}
