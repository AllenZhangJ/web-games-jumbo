import {
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import type {
  ActionDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_ANIMATION_ACTION_CATEGORY,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
  ARENA_V2_UNARMED_ACTION_DEFINITIONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';

export interface ArenaV2FormalActionPresentationCandidateV1 {
  readonly semantic: 'base-push' | 'base-air-strike' | 'equipment' | 'down-smash';
  readonly label: string;
  readonly animationCategory: typeof ARENA_ANIMATION_ACTION_CATEGORY.EQUIPMENT;
  readonly timing: Readonly<{
    readonly windupTicks?: number;
    readonly activeTicks: number;
    readonly recoveryTicks?: number;
  }>;
  readonly clipName: '2H_Melee_Attack_Chop';
  readonly overlayMask: 'upper-body';
}

function positiveAnimationTiming(
  action: ActionDefinition,
): ArenaV2FormalActionPresentationCandidateV1['timing'] {
  return Object.freeze({
    ...(action.timing.windupTicks > 0
      ? { windupTicks: action.timing.windupTicks }
      : {}),
    activeTicks: action.timing.activeTicks,
    ...(action.timing.recoveryTicks > 0
      ? { recoveryTicks: action.timing.recoveryTicks }
      : {}),
  });
}

function presentation(
  action: ActionDefinition,
  semantic: ArenaV2FormalActionPresentationCandidateV1['semantic'],
  label: string,
): ArenaV2FormalActionPresentationCandidateV1 {
  return Object.freeze({
    semantic,
    label,
    animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.EQUIPMENT,
    timing: positiveAnimationTiming(action),
    clipName: '2H_Melee_Attack_Chop' as const,
    overlayMask: 'upper-body' as const,
  });
}

const entries: readonly (readonly [string, ArenaV2FormalActionPresentationCandidateV1])[] =
  Object.freeze([
    ...ARENA_V2_UNARMED_ACTION_DEFINITIONS_CANDIDATE_V1.map((action, index) => Object.freeze([
      action.id,
      presentation(
        action,
        index === 0 ? 'base-push' : 'base-air-strike',
        index === 0 ? '徒手推击' : '徒手空中打击',
      ),
    ] as const)),
    ...ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.flatMap((weapon) => (
      weapon.actions.map((action, index) => Object.freeze([
        action.id,
        presentation(
          action,
          index === 0 ? 'equipment' : 'down-smash',
          `${weapon.equipment.presentationSemantic}${index === 0 ? '地面攻击' : '空中攻击'}`,
        ),
      ] as const))
    )),
  ]);

if (entries.length !== 42 || new Set(entries.map(([id]) => id)).size !== entries.length) {
  throw new RangeError('Arena V2正式动作表现必须闭合2个徒手动作和20把武器的40个动作。');
}

export const ARENA_V2_FORMAL_ACTION_PRESENTATIONS_CANDIDATE_V1 = Object.freeze(
  Object.fromEntries(entries),
) as Readonly<Record<string, ArenaV2FormalActionPresentationCandidateV1>>;

const AUTHORITY = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  unarmedActionCount: 2 as const,
  weaponActionCount: 40 as const,
  actionPresentations: ARENA_V2_FORMAL_ACTION_PRESENTATIONS_CANDIDATE_V1,
  ownsRuleOrMatchAuthority: false as const,
});

export const ARENA_V2_FORMAL_ACTION_PRESENTATION_CATALOG_CANDIDATE_V1 = Object.freeze({
  ...AUTHORITY,
  contentHash: createDeterministicDataHash(
    AUTHORITY,
    'Arena V2 Formal Action Presentation Catalog Candidate V1',
  ),
  validationStatus: 'not-run' as const,
});
