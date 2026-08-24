import {
  ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND,
  assertKnownKeys,
  cloneFrozenData,
  createArenaWeaponFeedbackDirectionFactV2,
  type ArenaWeaponFeedbackDirectionFactV2,
} from '@number-strategy-jump/arena-contracts';
import type { WeaponModeKindV1 } from '@number-strategy-jump/arena-definitions';
import {
  projectArenaV2TwentyWeaponFeedbackReadPlanCandidateV1,
  type ArenaV2TwentyWeaponFeedbackReadPlanProjectionCandidateV1,
} from './arena-v2-twenty-weapon-feedback-read-plan-candidate-v1.js';
import {
  projectArenaV2WeaponImpactStrengthCandidateV1,
  type ArenaV2WeaponImpactStrengthProjectionCandidateV1,
} from './arena-v2-weapon-impact-strength-projection-candidate-v1.js';

export interface ArenaV2TwentyWeaponFeedbackDirectionReadPlanCandidateV2 {
  readonly schemaVersion: 2;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly base: ArenaV2TwentyWeaponFeedbackReadPlanProjectionCandidateV1;
  readonly directionFact: ArenaWeaponFeedbackDirectionFactV2;
  readonly directionProjection: Readonly<{
    readonly space: 'authority-world' | 'symbolic-billboard';
    readonly authorityWorldDirectionAvailable: boolean;
    readonly worldDirection: Readonly<{ readonly x: number; readonly z: number }> | null;
    readonly horizontalImpulseMagnitude: number | null;
    readonly playerDirectionLabel: ArenaV2WeaponImpactDirectionLabelCandidateV1 | null;
    readonly worldOrientedArrowAllowed: boolean;
    readonly sourceEventId: string;
    readonly impactStrength: ArenaV2WeaponImpactStrengthProjectionCandidateV1 | null;
  }>;
  readonly governance: Readonly<{
    readonly ownsRuleOrMatchAuthority: false;
    readonly infersDirectionFromPositions: false;
    readonly infersDirectionFromAnimation: false;
    readonly classifiesImpactFromAuthorityImpulseOnly: true;
    readonly requiresExactFeedbackFactIdentity: true;
  }>;
}

export type ArenaV2WeaponImpactDirectionLabelCandidateV1 =
  | '地图东向'
  | '地图东北向'
  | '地图北向'
  | '地图西北向'
  | '地图西向'
  | '地图西南向'
  | '地图南向'
  | '地图东南向';

const INPUT_KEYS = new Set(['schemaVersion', 'modeKind', 'event', 'directionFact']);

/**
 * Converts only the authority-provided world vector into an absolute map
 * compass label. It never uses camera facing, actor positions or animation.
 */
export function projectArenaV2WeaponImpactDirectionLabelCandidateV1(
  value: unknown,
): ArenaV2WeaponImpactDirectionLabelCandidateV1 | null {
  const fact = createArenaWeaponFeedbackDirectionFactV2(value);
  const direction = fact.resultDirection.worldDirection;
  if (direction === null) return null;
  const horizontal = Math.abs(direction.x);
  const depth = Math.abs(direction.z);
  if (horizontal >= depth * 2) return direction.x > 0 ? '地图东向' : '地图西向';
  if (depth >= horizontal * 2) return direction.z > 0 ? '地图北向' : '地图南向';
  if (direction.x > 0) return direction.z > 0 ? '地图东北向' : '地图东南向';
  return direction.z > 0 ? '地图西北向' : '地图西南向';
}

export function projectArenaV2TwentyWeaponFeedbackDirectionReadPlanCandidateV2(
  value: unknown,
): ArenaV2TwentyWeaponFeedbackDirectionReadPlanCandidateV2 {
  const source = cloneFrozenData(value, 'Arena V2 weapon feedback direction read plan V2');
  assertKnownKeys(source, INPUT_KEYS, 'Arena V2 weapon feedback direction read plan V2');
  for (const key of INPUT_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2 weapon feedback direction read plan V2缺少${key}。`);
    }
  }
  if (source.schemaVersion !== 2) {
    throw new RangeError('Arena V2 weapon feedback direction read plan只接受schemaVersion 2。');
  }
  const base = projectArenaV2TwentyWeaponFeedbackReadPlanCandidateV1({
    schemaVersion: 1,
    modeKind: source.modeKind as WeaponModeKindV1,
    event: source.event,
  });
  const directionFact = createArenaWeaponFeedbackDirectionFactV2(source.directionFact);
  if (directionFact.feedbackEventId !== base.sourceEventId
    || directionFact.feedbackTick !== base.tick
    || directionFact.feedbackSequence !== base.sequence
    || directionFact.feedbackKind !== base.feedbackKind) {
    throw new RangeError('Arena V2 weapon feedback Direction Fact与V1读取计划身份不一致。');
  }
  const world = directionFact.resultDirection.kind
    === ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND.AUTHORITY_HORIZONTAL_IMPULSE;
  const impactStrength = projectArenaV2WeaponImpactStrengthCandidateV1(directionFact);
  const playerDirectionLabel = projectArenaV2WeaponImpactDirectionLabelCandidateV1(
    directionFact,
  );
  return Object.freeze({
    schemaVersion: 2 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    base,
    directionFact,
    directionProjection: Object.freeze({
      space: world ? 'authority-world' as const : 'symbolic-billboard' as const,
      authorityWorldDirectionAvailable: world,
      worldDirection: directionFact.resultDirection.worldDirection,
      horizontalImpulseMagnitude: directionFact.resultDirection.horizontalImpulseMagnitude,
      playerDirectionLabel,
      worldOrientedArrowAllowed: world,
      sourceEventId: directionFact.resultDirection.sourceEventId,
      impactStrength,
    }),
    governance: Object.freeze({
      ownsRuleOrMatchAuthority: false as const,
      infersDirectionFromPositions: false as const,
      infersDirectionFromAnimation: false as const,
      classifiesImpactFromAuthorityImpulseOnly: true as const,
      requiresExactFeedbackFactIdentity: true as const,
    }),
  });
}

export const ARENA_V2_TWENTY_WEAPON_FEEDBACK_DIRECTION_READ_PLAN_CANDIDATE_V2 = Object.freeze({
  schemaVersion: 2 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  defaultSurfaceWired: false as const,
  v1CueAndSemanticReadPlanReused: true as const,
  exactDirectionFactIdentityRequired: true as const,
  positionOrAnimationInferenceAllowed: false as const,
  impactStrengthUsesAuthorityImpulseOnly: true as const,
  playerDirectionUsesAbsoluteMapCompassOnly: true as const,
  validationStatus: 'not-run' as const,
});
