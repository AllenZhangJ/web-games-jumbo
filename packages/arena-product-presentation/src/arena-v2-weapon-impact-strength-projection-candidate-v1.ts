import {
  ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND,
  createArenaWeaponFeedbackDirectionFactV2,
  type ArenaWeaponFeedbackDirectionFactV2,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_V2_WEAPON_IMPACT_STRENGTH_CANDIDATE_V1 = Object.freeze({
  LIGHT: 'light',
  MEDIUM: 'medium',
  HEAVY: 'heavy',
} as const);

export type ArenaV2WeaponImpactStrengthCandidateV1 =
  typeof ARENA_V2_WEAPON_IMPACT_STRENGTH_CANDIDATE_V1[
    keyof typeof ARENA_V2_WEAPON_IMPACT_STRENGTH_CANDIDATE_V1
  ];

export interface ArenaV2WeaponImpactStrengthProjectionCandidateV1 {
  readonly schemaVersion: 1;
  readonly sourceEventId: string;
  readonly feedbackKind: ArenaWeaponFeedbackDirectionFactV2['feedbackKind'];
  readonly horizontalImpulseMagnitude: number;
  readonly strength: ArenaV2WeaponImpactStrengthCandidateV1;
  readonly playerLabel: '轻击' | '实击' | '重击';
  readonly presentation: Readonly<{
    readonly effectScaleMultiplier: 0.9 | 1 | 1.12;
    readonly directionArrowScaleMultiplier: 0.9 | 1.12 | 1.28;
    readonly cameraImpactScaleMultiplier: 0.82 | 1 | 1.18;
    readonly characterImpactScaleMultiplier: 0.85 | 1 | 1.12;
    readonly minimumAudioPriority: 1 | 2 | 3;
    readonly minimumAudioGainDb: -6 | -3 | -2;
  }>;
}

export const ARENA_V2_WEAPON_IMPACT_STRENGTH_THRESHOLDS_CANDIDATE_V1 = Object.freeze({
  mediumMinimumHorizontalImpulse: 8,
  heavyMinimumHorizontalImpulse: 12,
} as const);

const PRESENTATION_BY_STRENGTH = Object.freeze({
  light: Object.freeze({
    playerLabel: '轻击' as const,
    effectScaleMultiplier: 0.9 as const,
    directionArrowScaleMultiplier: 0.9 as const,
    cameraImpactScaleMultiplier: 0.82 as const,
    characterImpactScaleMultiplier: 0.85 as const,
    minimumAudioPriority: 1 as const,
    minimumAudioGainDb: -6 as const,
  }),
  medium: Object.freeze({
    playerLabel: '实击' as const,
    effectScaleMultiplier: 1 as const,
    directionArrowScaleMultiplier: 1.12 as const,
    cameraImpactScaleMultiplier: 1 as const,
    characterImpactScaleMultiplier: 1 as const,
    minimumAudioPriority: 2 as const,
    minimumAudioGainDb: -3 as const,
  }),
  heavy: Object.freeze({
    playerLabel: '重击' as const,
    effectScaleMultiplier: 1.12 as const,
    directionArrowScaleMultiplier: 1.28 as const,
    cameraImpactScaleMultiplier: 1.18 as const,
    characterImpactScaleMultiplier: 1.12 as const,
    minimumAudioPriority: 3 as const,
    minimumAudioGainDb: -2 as const,
  }),
} satisfies Readonly<Record<
  ArenaV2WeaponImpactStrengthCandidateV1,
  Readonly<{
    readonly playerLabel: '轻击' | '实击' | '重击';
    readonly effectScaleMultiplier: 0.9 | 1 | 1.12;
    readonly directionArrowScaleMultiplier: 0.9 | 1.12 | 1.28;
    readonly cameraImpactScaleMultiplier: 0.82 | 1 | 1.18;
    readonly characterImpactScaleMultiplier: 0.85 | 1 | 1.12;
    readonly minimumAudioPriority: 1 | 2 | 3;
    readonly minimumAudioGainDb: -6 | -3 | -2;
  }>
>>);

/**
 * Presentation-only strength read. Classification consumes the exact impulse
 * magnitude already emitted by authority; weapon level, distance and animation
 * are deliberately not re-read or inferred here.
 */
export function projectArenaV2WeaponImpactStrengthCandidateV1(
  value: unknown,
): ArenaV2WeaponImpactStrengthProjectionCandidateV1 | null {
  const fact = createArenaWeaponFeedbackDirectionFactV2(value);
  if (fact.resultDirection.kind
    !== ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND.AUTHORITY_HORIZONTAL_IMPULSE) {
    return null;
  }
  const magnitude = fact.resultDirection.horizontalImpulseMagnitude;
  if (magnitude === null) {
    throw new RangeError('Arena V2 weapon impact strength缺少权威水平冲量。');
  }
  const strength = magnitude
    >= ARENA_V2_WEAPON_IMPACT_STRENGTH_THRESHOLDS_CANDIDATE_V1
      .heavyMinimumHorizontalImpulse
    ? ARENA_V2_WEAPON_IMPACT_STRENGTH_CANDIDATE_V1.HEAVY
    : magnitude
      >= ARENA_V2_WEAPON_IMPACT_STRENGTH_THRESHOLDS_CANDIDATE_V1
        .mediumMinimumHorizontalImpulse
      ? ARENA_V2_WEAPON_IMPACT_STRENGTH_CANDIDATE_V1.MEDIUM
      : ARENA_V2_WEAPON_IMPACT_STRENGTH_CANDIDATE_V1.LIGHT;
  const presentation = PRESENTATION_BY_STRENGTH[strength];
  return Object.freeze({
    schemaVersion: 1 as const,
    sourceEventId: fact.feedbackEventId,
    feedbackKind: fact.feedbackKind,
    horizontalImpulseMagnitude: magnitude,
    strength,
    playerLabel: presentation.playerLabel,
    presentation: Object.freeze({
      effectScaleMultiplier: presentation.effectScaleMultiplier,
      directionArrowScaleMultiplier: presentation.directionArrowScaleMultiplier,
      cameraImpactScaleMultiplier: presentation.cameraImpactScaleMultiplier,
      characterImpactScaleMultiplier: presentation.characterImpactScaleMultiplier,
      minimumAudioPriority: presentation.minimumAudioPriority,
      minimumAudioGainDb: presentation.minimumAudioGainDb,
    }),
  });
}

export const ARENA_V2_WEAPON_IMPACT_STRENGTH_PROJECTION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  defaultSurfaceWired: false as const,
  authoritySource: 'weapon-feedback-direction-fact-v2.horizontalImpulseMagnitude' as const,
  mediumMinimumHorizontalImpulse: 8 as const,
  heavyMinimumHorizontalImpulse: 12 as const,
  readsWeaponLevel: false as const,
  infersFromDistanceOrAnimation: false as const,
  ownsRuleOrMatchAuthority: false as const,
  validationStatus: 'not-run' as const,
});
