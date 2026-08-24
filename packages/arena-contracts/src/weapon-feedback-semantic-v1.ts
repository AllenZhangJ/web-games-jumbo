import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from './definition-utils.js';

export const ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_EVENT_TYPE =
  'WeaponFeedbackResolved' as const;

export const ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND = Object.freeze({
  HIT_CONFIRM: 'hit-confirm',
  HIT_SURFACE_TRANSFER: 'hit-surface-transfer',
  HIT_RING_OUT: 'hit-ring-out',
  ATTACK_EVADED: 'attack-evaded',
  MOVEMENT_FALL: 'movement-fall',
} as const);

export const ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_FALL_CAUSE = Object.freeze({
  CREDITED_HIT: 'credited-hit',
  MOVEMENT: 'movement',
} as const);

export type ArenaWeaponFeedbackSemanticKindV1 =
  typeof ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND[
    keyof typeof ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND
  ];

export type ArenaWeaponFeedbackSemanticFallCauseV1 =
  typeof ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_FALL_CAUSE[
    keyof typeof ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_FALL_CAUSE
  ];

export interface ArenaWeaponFeedbackSemanticEventV1 {
  readonly schemaVersion: typeof ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_SCHEMA_VERSION;
  readonly id: string;
  readonly type: typeof ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_EVENT_TYPE;
  readonly sequence: number;
  readonly tick: number;
  readonly kind: ArenaWeaponFeedbackSemanticKindV1;
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

const EVENT_KEYS = new Set([
  'schemaVersion',
  'id',
  'type',
  'sequence',
  'tick',
  'kind',
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
const REQUIRED_KEYS = Object.freeze([...EVENT_KEYS]);
const KINDS: ReadonlySet<unknown> = new Set(Object.values(
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND,
));
const FALL_CAUSES: ReadonlySet<unknown> = new Set(Object.values(
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_FALL_CAUSE,
));

function optionalId(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function optionalTick(value: unknown, name: string): number | null {
  return value === null ? null : assertIntegerAtLeast(value, 0, name);
}

function requireAttackContext(
  attackerId: string | null,
  actionDefinitionId: string | null,
  actionStartedTick: number | null,
  kind: ArenaWeaponFeedbackSemanticKindV1,
): void {
  if (attackerId === null || actionDefinitionId === null || actionStartedTick === null) {
    throw new RangeError(`${kind}必须携带攻击者、动作与动作起始tick。`);
  }
}

/**
 * Validates the authority-owned causal result consumed by Presentation.
 * The contract intentionally carries only deterministic rule/physics facts;
 * copy, cue names, particles and audio remain Presentation responsibilities.
 */
export function createArenaWeaponFeedbackSemanticEventV1(
  value: unknown,
): ArenaWeaponFeedbackSemanticEventV1 {
  const source = cloneFrozenData(value, 'Arena weapon feedback semantic event V1');
  assertKnownKeys(source, EVENT_KEYS, 'Arena weapon feedback semantic event V1');
  for (const key of REQUIRED_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena weapon feedback semantic event V1缺少${key}。`);
    }
  }
  if (source.schemaVersion !== ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_SCHEMA_VERSION) {
    throw new RangeError('Arena weapon feedback semantic event V1 schemaVersion无效。');
  }
  if (source.type !== ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_EVENT_TYPE) {
    throw new RangeError('Arena weapon feedback semantic event V1 type无效。');
  }
  if (!KINDS.has(source.kind)) {
    throw new RangeError('Arena weapon feedback semantic event V1 kind无效。');
  }
  if (source.fallCause !== null && !FALL_CAUSES.has(source.fallCause)) {
    throw new RangeError('Arena weapon feedback semantic event V1 fallCause无效。');
  }

  const tick = assertIntegerAtLeast(source.tick, 0, 'WeaponFeedbackResolved.tick');
  const kind = source.kind as ArenaWeaponFeedbackSemanticKindV1;
  const attackerId = optionalId(source.attackerId, 'WeaponFeedbackResolved.attackerId');
  const targetId = optionalId(source.targetId, 'WeaponFeedbackResolved.targetId');
  const actionDefinitionId = optionalId(
    source.actionDefinitionId,
    'WeaponFeedbackResolved.actionDefinitionId',
  );
  const actionStartedTick = optionalTick(
    source.actionStartedTick,
    'WeaponFeedbackResolved.actionStartedTick',
  );
  const firstHitTick = optionalTick(source.firstHitTick, 'WeaponFeedbackResolved.firstHitTick');
  const targetFallTick = optionalTick(
    source.targetFallTick,
    'WeaponFeedbackResolved.targetFallTick',
  );
  const initialSupportSurfaceId = optionalId(
    source.initialSupportSurfaceId,
    'WeaponFeedbackResolved.initialSupportSurfaceId',
  );
  const finalSupportSurfaceId = optionalId(
    source.finalSupportSurfaceId,
    'WeaponFeedbackResolved.finalSupportSurfaceId',
  );
  const fallCause = source.fallCause as ArenaWeaponFeedbackSemanticFallCauseV1 | null;
  const creditedAttackerId = optionalId(
    source.creditedAttackerId,
    'WeaponFeedbackResolved.creditedAttackerId',
  );
  const attackContextCount = [attackerId, actionDefinitionId, actionStartedTick]
    .filter((entry) => entry !== null).length;
  if (attackContextCount !== 0 && attackContextCount !== 3) {
    throw new RangeError('WeaponFeedbackResolved攻击上下文必须全部存在或全部为null。');
  }
  if (attackerId !== null && targetId === attackerId) {
    throw new RangeError('WeaponFeedbackResolved攻击者与目标不能相同。');
  }

  for (const [name, valueTick] of [
    ['actionStartedTick', actionStartedTick],
    ['firstHitTick', firstHitTick],
    ['targetFallTick', targetFallTick],
  ] as const) {
    if (valueTick !== null && valueTick > tick) {
      throw new RangeError(`WeaponFeedbackResolved.${name}不能晚于resolution tick。`);
    }
  }
  if (
    actionStartedTick !== null
    && firstHitTick !== null
    && firstHitTick < actionStartedTick
  ) throw new RangeError('WeaponFeedbackResolved firstHitTick不能早于动作起始tick。');
  if (
    targetFallTick !== null
    && firstHitTick !== null
    && fallCause === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_FALL_CAUSE.CREDITED_HIT
    && targetFallTick < firstHitTick
  ) throw new RangeError('credited-hit fall不能早于首次命中。');
  if ((fallCause === null) !== (targetFallTick === null)) {
    throw new RangeError('WeaponFeedbackResolved fallCause与targetFallTick必须同时存在。');
  }
  if (
    (fallCause === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_FALL_CAUSE.CREDITED_HIT)
    !== (creditedAttackerId !== null)
  ) throw new RangeError('WeaponFeedbackResolved credited-hit与creditedAttackerId不一致。');

  if (kind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_CONFIRM) {
    requireAttackContext(attackerId, actionDefinitionId, actionStartedTick, kind);
    if (
      targetId === null
      || firstHitTick === null
      || targetFallTick !== null
      || fallCause !== null
      || finalSupportSurfaceId === null
      || initialSupportSurfaceId !== finalSupportSurfaceId
    ) throw new RangeError('hit-confirm必须是同一支撑面上的有效命中。');
  } else if (kind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_SURFACE_TRANSFER) {
    requireAttackContext(attackerId, actionDefinitionId, actionStartedTick, kind);
    if (
      targetId === null
      || firstHitTick === null
      || targetFallTick !== null
      || fallCause !== null
      || initialSupportSurfaceId === null
      || finalSupportSurfaceId === null
      || initialSupportSurfaceId === finalSupportSurfaceId
    ) throw new RangeError('hit-surface-transfer必须在有效命中后改变支撑面。');
  } else if (kind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_RING_OUT) {
    requireAttackContext(attackerId, actionDefinitionId, actionStartedTick, kind);
    if (
      targetId === null
      || firstHitTick === null
      || targetFallTick === null
      || initialSupportSurfaceId === null
      || fallCause !== ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_FALL_CAUSE.CREDITED_HIT
      || creditedAttackerId !== attackerId
      || finalSupportSurfaceId !== null
    ) throw new RangeError('hit-ring-out必须由当前攻击者的命中归因并失去支撑。');
  } else if (kind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.ATTACK_EVADED) {
    requireAttackContext(attackerId, actionDefinitionId, actionStartedTick, kind);
    if (
      targetId !== null
      || firstHitTick !== null
      || targetFallTick !== null
      || initialSupportSurfaceId !== null
      || finalSupportSurfaceId !== null
      || fallCause !== null
      || creditedAttackerId !== null
    ) throw new RangeError('attack-evaded不能携带目标、支撑面、命中或掉落事实。');
  } else {
    if (
      attackerId !== null
      || actionDefinitionId !== null
      || actionStartedTick !== null
      || targetId === null
      || targetFallTick === null
      || firstHitTick !== null
      || initialSupportSurfaceId === null
      || fallCause !== ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_FALL_CAUSE.MOVEMENT
      || creditedAttackerId !== null
      || finalSupportSurfaceId !== null
    ) throw new RangeError('movement-fall必须是无命中归因的移动掉落。');
  }

  return Object.freeze({
    schemaVersion: ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_SCHEMA_VERSION,
    id: assertNonEmptyString(source.id, 'WeaponFeedbackResolved.id'),
    type: ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_EVENT_TYPE,
    sequence: assertIntegerAtLeast(source.sequence, 0, 'WeaponFeedbackResolved.sequence'),
    tick,
    kind,
    attackerId,
    targetId,
    actionDefinitionId,
    actionStartedTick,
    firstHitTick,
    targetFallTick,
    initialSupportSurfaceId,
    finalSupportSurfaceId,
    fallCause,
    creditedAttackerId,
  });
}
