import {
  ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND,
  createArenaWeaponFeedbackResultDirectionV2,
  type ArenaWeaponFeedbackResultDirectionV2,
} from './weapon-feedback-result-direction-v2.js';
import {
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND,
  type ArenaWeaponFeedbackSemanticKindV1,
} from './weapon-feedback-semantic-v1.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from './definition-utils.js';

export interface ArenaWeaponFeedbackDirectionFactV2 {
  readonly schemaVersion: 2;
  readonly feedbackEventId: string;
  readonly feedbackTick: number;
  readonly feedbackSequence: number;
  readonly feedbackKind: ArenaWeaponFeedbackSemanticKindV1;
  readonly resultDirection: ArenaWeaponFeedbackResultDirectionV2;
}

const FACT_KEYS = new Set([
  'schemaVersion',
  'feedbackEventId',
  'feedbackTick',
  'feedbackSequence',
  'feedbackKind',
  'resultDirection',
]);
const KINDS = new Set<unknown>(Object.values(ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND));

export function createArenaWeaponFeedbackDirectionFactV2(
  value: unknown,
): ArenaWeaponFeedbackDirectionFactV2 {
  const source = cloneFrozenData(value, 'Arena weapon feedback direction fact V2');
  assertKnownKeys(source, FACT_KEYS, 'Arena weapon feedback direction fact V2');
  for (const key of FACT_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena weapon feedback direction fact V2缺少${key}。`);
    }
  }
  if (source.schemaVersion !== 2 || !KINDS.has(source.feedbackKind)) {
    throw new RangeError('Arena weapon feedback direction fact V2版本或kind无效。');
  }
  const feedbackKind = source.feedbackKind as ArenaWeaponFeedbackSemanticKindV1;
  const resultDirection = createArenaWeaponFeedbackResultDirectionV2(source.resultDirection);
  const hit = feedbackKind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_CONFIRM
    || feedbackKind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_SURFACE_TRANSFER
    || feedbackKind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_RING_OUT;
  if (hit !== (
    resultDirection.kind
      === ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND.AUTHORITY_HORIZONTAL_IMPULSE
  )) {
    throw new RangeError('Arena weapon feedback direction fact V2语义与方向种类不一致。');
  }
  if (feedbackKind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.ATTACK_EVADED
    && resultDirection.source !== 'attack-evaded') {
    throw new RangeError('attack-evaded方向事实来源不一致。');
  }
  if (feedbackKind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.MOVEMENT_FALL
    && resultDirection.source !== 'movement-fall') {
    throw new RangeError('movement-fall方向事实来源不一致。');
  }
  return Object.freeze({
    schemaVersion: 2 as const,
    feedbackEventId: assertNonEmptyString(
      source.feedbackEventId,
      'Arena weapon feedback direction fact V2 feedbackEventId',
    ),
    feedbackTick: assertIntegerAtLeast(
      source.feedbackTick,
      0,
      'Arena weapon feedback direction fact V2 feedbackTick',
    ),
    feedbackSequence: assertIntegerAtLeast(
      source.feedbackSequence,
      0,
      'Arena weapon feedback direction fact V2 feedbackSequence',
    ),
    feedbackKind,
    resultDirection,
  });
}

export const ARENA_WEAPON_FEEDBACK_DIRECTION_FACT_V2 = Object.freeze({
  schemaVersion: 2 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  augmentsV6WithoutDuplicatingOutcomeAuthority: true as const,
  presentationMayInferDirection: false as const,
});
