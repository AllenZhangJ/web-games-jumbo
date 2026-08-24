import {
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  projectArenaV2TwentyWeaponFeedbackDirectionReadPlanCandidateV2,
  type ArenaV2TwentyWeaponFeedbackDirectionReadPlanCandidateV2,
} from './arena-v2-twenty-weapon-feedback-direction-read-plan-candidate-v2.js';
import {
  createArenaV2FeedbackVisualCommandSnapshotCandidateV1,
  resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1,
  type ArenaV2TwentyWeaponFeedbackVfxResolutionCandidateV1,
} from './arena-v2-twenty-weapon-feedback-vfx-resolution-candidate-v1.js';
import { arenaV2WeaponDisplayNameV1 } from './arena-v2-weapon-map-learning-projection-candidate-v1.js';

export interface ArenaV2TwentyWeaponFeedbackVfxResolutionCandidateV2 {
  readonly schemaVersion: 2;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly base: ArenaV2TwentyWeaponFeedbackVfxResolutionCandidateV1;
  readonly directionReadPlan: ArenaV2TwentyWeaponFeedbackDirectionReadPlanCandidateV2;
  readonly directionRenderRecipe: Readonly<{
    readonly space: 'authority-world' | 'symbolic-billboard';
    readonly worldDirection: Readonly<{ readonly x: number; readonly z: number }> | null;
    readonly horizontalImpulseMagnitude: number | null;
    readonly impactStrength: 'light' | 'medium' | 'heavy' | null;
    readonly effectScaleMultiplier: 0.9 | 1 | 1.12;
    readonly directionArrowScaleMultiplier: 0.9 | 1.12 | 1.28;
    readonly cameraImpactScaleMultiplier: 0.82 | 1 | 1.18;
    readonly characterImpactScaleMultiplier: 0.85 | 1 | 1.12;
    readonly worldOrientedArrowAllowed: boolean;
    readonly billboardFamilyShapeRequired: boolean;
  }>;
  readonly governance: Readonly<{
    readonly ownsRuleOrMatchAuthority: false;
    readonly infersDirection: false;
    readonly programmaticAssetFallbackUsed: false;
    readonly mayEnterProduction: false;
  }>;
}

const INPUT_KEYS = new Set(['schemaVersion', 'command', 'modeKind', 'event', 'directionFact']);

function expectedPlayerTitleAffixes(
  plan: ArenaV2TwentyWeaponFeedbackDirectionReadPlanCandidateV2,
): Readonly<{ readonly strengthPrefix: string; readonly weaponPrefix: string }> {
  const base = plan.base;
  const strengthPrefix = plan.directionProjection.impactStrength === null
    ? ''
    : `${plan.directionProjection.impactStrength.playerLabel} · `;
  if (base.equipmentDefinitionId === null || base.actionContext === null) {
    return Object.freeze({ strengthPrefix, weaponPrefix: '' });
  }
  const context = base.actionContext === 'ground' ? '地面' : '空中';
  return Object.freeze({
    strengthPrefix,
    weaponPrefix: `${arenaV2WeaponDisplayNameV1(base.equipmentDefinitionId)}·${context}：`,
  });
}

export function resolveArenaV2TwentyWeaponFeedbackVfxCandidateV2(
  value: unknown,
): ArenaV2TwentyWeaponFeedbackVfxResolutionCandidateV2 {
  const source = cloneFrozenData(value, 'Arena V2 weapon feedback VFX resolution V2');
  assertKnownKeys(source, INPUT_KEYS, 'Arena V2 weapon feedback VFX resolution V2');
  for (const key of INPUT_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2 weapon feedback VFX resolution V2缺少${key}。`);
    }
  }
  if (source.schemaVersion !== 2) {
    throw new RangeError('Arena V2 weapon feedback VFX resolution只接受schemaVersion 2。');
  }
  const command = createArenaV2FeedbackVisualCommandSnapshotCandidateV1(source.command);
  const base = resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1(command);
  const directionReadPlan = projectArenaV2TwentyWeaponFeedbackDirectionReadPlanCandidateV2({
    schemaVersion: 2,
    modeKind: source.modeKind,
    event: source.event,
    directionFact: source.directionFact,
  });
  const titleAffixes = expectedPlayerTitleAffixes(directionReadPlan);
  const expectedTitlePrefix = `${titleAffixes.strengthPrefix}${titleAffixes.weaponPrefix}`;
  const authorityEmphasis = directionReadPlan.base.authorityPresentation.emphasis;
  const prevalidatedLocalWarning = command.perspective === 'local-involved'
    && command.emphasis === 'warning';
  if (base.sourceEventId !== directionReadPlan.base.sourceEventId
    || base.specializedCueId !== directionReadPlan.base.vfx.cueId
    || base.weaponId !== directionReadPlan.base.weaponId
    || base.actionContext !== directionReadPlan.base.actionContext
    || base.modeKind !== directionReadPlan.base.modeKind
    || base.feedbackKind !== directionReadPlan.base.feedbackKind
    || command.tick !== directionReadPlan.base.tick
    || command.sequence !== directionReadPlan.base.sequence
    || command.attackerParticipantId
      !== directionReadPlan.base.authorityPresentation.attackerId
    || command.targetParticipantId
      !== directionReadPlan.base.authorityPresentation.targetId
    || !command.title.startsWith(expectedTitlePrefix)
    || command.title.length <= expectedTitlePrefix.length
    || (command.emphasis !== authorityEmphasis && !prevalidatedLocalWarning)) {
    throw new RangeError('Arena V2 weapon feedback VFX命令与方向读取计划身份不一致。');
  }
  const world = directionReadPlan.directionProjection.space === 'authority-world';
  const strength = directionReadPlan.directionProjection.impactStrength;
  return Object.freeze({
    schemaVersion: 2 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    base,
    directionReadPlan,
    directionRenderRecipe: Object.freeze({
      space: directionReadPlan.directionProjection.space,
      worldDirection: directionReadPlan.directionProjection.worldDirection,
      horizontalImpulseMagnitude:
        directionReadPlan.directionProjection.horizontalImpulseMagnitude,
      impactStrength: strength?.strength ?? null,
      effectScaleMultiplier: strength?.presentation.effectScaleMultiplier ?? 1,
      directionArrowScaleMultiplier:
        strength?.presentation.directionArrowScaleMultiplier ?? 1.12,
      cameraImpactScaleMultiplier:
        strength?.presentation.cameraImpactScaleMultiplier ?? 1,
      characterImpactScaleMultiplier:
        strength?.presentation.characterImpactScaleMultiplier ?? 1,
      worldOrientedArrowAllowed: directionReadPlan.directionProjection.worldOrientedArrowAllowed,
      billboardFamilyShapeRequired: !world,
    }),
    governance: Object.freeze({
      ownsRuleOrMatchAuthority: false as const,
      infersDirection: false as const,
      programmaticAssetFallbackUsed: false as const,
      mayEnterProduction: false as const,
    }),
  });
}

export const ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_RESOLUTION_CANDIDATE_V2 = Object.freeze({
  schemaVersion: 2 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  defaultSurfaceWired: false as const,
  v1AuthoredTextureAndBudgetReused: true as const,
  authorityWorldDirectionOptional: true as const,
  positionOrAnimationDirectionInferenceAllowed: false as const,
  impactStrengthUsesSharedAuthorityImpulseProjection: true as const,
  acceptsPrevalidatedLocalPerspectiveWarning: true as const,
  closesAttackerAndTargetIdentityAgainstAuthorityPresentation: true as const,
  doesNotDerivePerspectiveFromLocalizedCopy: true as const,
  programmaticAssetFallbackAllowed: false as const,
  validationStatus: 'not-run' as const,
});
