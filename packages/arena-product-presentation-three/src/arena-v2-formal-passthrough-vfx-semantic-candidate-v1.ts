import {
  ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PASSTHROUGH_CUE_IDS_CANDIDATE_V1,
  type ArenaV2TwentyWeaponFeedbackVfxPassthroughCueIdCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';

export type ArenaV2FormalPassthroughVfxShapeKindCandidateV1 =
  | 'impact-confirm'
  | 'surface-transfer'
  | 'ring-out'
  | 'evaded-warning'
  | 'movement-fall-warning'
  | 'generic-status';

export type ArenaV2FormalPassthroughVfxTimingKindCandidateV1 =
  | 'hit-confirm'
  | 'surface-transfer'
  | 'ring-out'
  | 'evaded'
  | 'standard';

export type ArenaV2FormalPassthroughVfxImpactKindCandidateV1 =
  | 'hit-confirm'
  | 'surface-transfer'
  | 'ring-out';

export interface ArenaV2FormalPassthroughVfxSemanticCandidateV1 {
  readonly schemaVersion: 1;
  readonly cueId: ArenaV2TwentyWeaponFeedbackVfxPassthroughCueIdCandidateV1;
  readonly semanticIdentity: string;
  readonly shapeKind: ArenaV2FormalPassthroughVfxShapeKindCandidateV1;
  readonly timingKind: ArenaV2FormalPassthroughVfxTimingKindCandidateV1;
  readonly feedbackAnchorKind: 'body-impact';
  readonly cameraImpactKind: ArenaV2FormalPassthroughVfxImpactKindCandidateV1 | null;
  readonly characterImpactKind: ArenaV2FormalPassthroughVfxImpactKindCandidateV1 | null;
}

type SemanticOverride = Readonly<{
  readonly shapeKind: ArenaV2FormalPassthroughVfxShapeKindCandidateV1;
  readonly timingKind?: ArenaV2FormalPassthroughVfxTimingKindCandidateV1;
  readonly impactKind?: ArenaV2FormalPassthroughVfxImpactKindCandidateV1;
}>;

const SEMANTIC_OVERRIDES = Object.freeze({
  'impact-confirm': Object.freeze({
    shapeKind: 'impact-confirm',
    timingKind: 'hit-confirm',
    impactKind: 'hit-confirm',
  }),
  'impact-surface-transfer': Object.freeze({
    shapeKind: 'surface-transfer',
    timingKind: 'surface-transfer',
    impactKind: 'surface-transfer',
  }),
  'ring-out': Object.freeze({
    shapeKind: 'ring-out',
    timingKind: 'ring-out',
    impactKind: 'ring-out',
  }),
  'evaded-warning': Object.freeze({
    shapeKind: 'evaded-warning',
    timingKind: 'evaded',
  }),
  'movement-fall-warning': Object.freeze({
    shapeKind: 'movement-fall-warning',
  }),
  'participant-fell-credited-hit': Object.freeze({
    shapeKind: 'ring-out',
  }),
  'participant-fell-movement': Object.freeze({
    shapeKind: 'movement-fall-warning',
  }),
  'participant-fell-environment': Object.freeze({
    shapeKind: 'movement-fall-warning',
  }),
  'race-finish-claimed': Object.freeze({
    shapeKind: 'surface-transfer',
  }),
} as const satisfies Readonly<Partial<Record<
  ArenaV2TwentyWeaponFeedbackVfxPassthroughCueIdCandidateV1,
  SemanticOverride
>>>);

const PASSTHROUGH_CUE_ID_SET: ReadonlySet<string> = new Set(
  ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PASSTHROUGH_CUE_IDS_CANDIDATE_V1,
);

for (const cueId of Object.keys(SEMANTIC_OVERRIDES)) {
  if (!PASSTHROUGH_CUE_ID_SET.has(cueId)) {
    throw new RangeError(`Arena V2 formal passthrough VFX语义包含未知Cue：${cueId}。`);
  }
}

export const ARENA_V2_FORMAL_PASSTHROUGH_VFX_SEMANTICS_CANDIDATE_V1 = Object.freeze(
  ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PASSTHROUGH_CUE_IDS_CANDIDATE_V1.map((cueId) => {
    const override: SemanticOverride | undefined = SEMANTIC_OVERRIDES[cueId as keyof
      typeof SEMANTIC_OVERRIDES];
    const impactKind = override?.impactKind ?? null;
    return Object.freeze({
      schemaVersion: 1 as const,
      cueId,
      semanticIdentity: `arena.v2.formal-passthrough-vfx.${cueId}.candidate.v1`,
      shapeKind: override?.shapeKind ?? 'generic-status',
      timingKind: override?.timingKind ?? 'standard',
      feedbackAnchorKind: 'body-impact' as const,
      cameraImpactKind: impactKind,
      characterImpactKind: impactKind,
    });
  }),
);

const SEMANTIC_BY_CUE_ID: ReadonlyMap<
string,
ArenaV2FormalPassthroughVfxSemanticCandidateV1
> = new Map(
  ARENA_V2_FORMAL_PASSTHROUGH_VFX_SEMANTICS_CANDIDATE_V1.map((semantic) => (
    [semantic.cueId, semantic] as const
  )),
);

if (SEMANTIC_BY_CUE_ID.size
  !== ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PASSTHROUGH_CUE_IDS_CANDIDATE_V1.length) {
  throw new RangeError('Arena V2 formal passthrough VFX语义身份不唯一。');
}

export function requireArenaV2FormalPassthroughVfxSemanticCandidateV1(
  value: unknown,
): ArenaV2FormalPassthroughVfxSemanticCandidateV1 {
  if (typeof value !== 'string') {
    throw new TypeError('Arena V2 formal passthrough VFX cueId必须是字符串。');
  }
  const semantic = SEMANTIC_BY_CUE_ID.get(value);
  if (semantic === undefined) {
    throw new RangeError(`Arena V2 formal passthrough VFX cueId未注册：${value}。`);
  }
  return semantic;
}

export const ARENA_V2_FORMAL_PASSTHROUGH_VFX_SEMANTIC_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  exactCueIdentityCount:
    ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PASSTHROUGH_CUE_IDS_CANDIDATE_V1.length,
  substringSemanticInferenceAllowed: false as const,
  weaponRingOutAndMovementFallShapesAreCausallyDistinct: true as const,
  ownsRuleHitFallOrResultAuthority: false as const,
});
