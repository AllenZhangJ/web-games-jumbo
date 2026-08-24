import {
  ARENA_MATCH_EVENT_V6,
  ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND,
  assertKnownKeys,
  cloneFrozenData,
  createArenaMatchEventV6,
  createArenaWeaponFeedbackDirectionFactV2,
  type ArenaWeaponFeedbackDirectionFactV2,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_UNARMED_ACTION_DEFINITIONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  createArenaV2FeedbackVisualCommandSnapshotCandidateV1,
} from './arena-v2-twenty-weapon-feedback-vfx-resolution-candidate-v1.js';
import type {
  ArenaV2ModeHudFeedbackVisualCommandV1,
} from './arena-v2-mode-hud-feedback-effect-consumer-v1.js';
import {
  projectArenaV2WeaponImpactStrengthCandidateV1,
} from './arena-v2-weapon-impact-strength-projection-candidate-v1.js';

export interface ArenaV2UnarmedFeedbackDirectionPresentationCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly command: ArenaV2ModeHudFeedbackVisualCommandV1;
  readonly directionFact: ArenaWeaponFeedbackDirectionFactV2;
  readonly directionRenderRecipe: Readonly<{
    readonly space: 'authority-world' | 'symbolic-billboard';
    readonly worldDirection: Readonly<{ readonly x: number; readonly z: number }> | null;
    readonly horizontalImpulseMagnitude: number | null;
    readonly impactStrength: 'light' | 'medium' | 'heavy' | null;
    readonly effectScaleMultiplier: 0.9 | 1 | 1.12;
    readonly directionArrowScaleMultiplier: 0.9 | 1.12 | 1.28;
    readonly cameraImpactScaleMultiplier: 0.82 | 1 | 1.18;
    readonly characterImpactScaleMultiplier: 0.85 | 1 | 1.12;
  }>;
  readonly governance: Readonly<{
    readonly exactUnarmedActionIdentityRequired: true;
    readonly exactFeedbackFactIdentityRequired: true;
    readonly reusesGenericCueAndAuthoredBudget: true;
    readonly infersDirectionFromPositionOrAnimation: false;
    readonly ownsRuleOrMatchAuthority: false;
  }>;
}

const INPUT_KEYS = new Set(['schemaVersion', 'command', 'event', 'directionFact']);
const UNARMED_ACTION_IDS = new Set(
  ARENA_V2_UNARMED_ACTION_DEFINITIONS_CANDIDATE_V1.map(({ id }) => id),
);
const PASSTHROUGH_CUE_BY_FEEDBACK_KIND = Object.freeze({
  'hit-confirm': 'impact-confirm',
  'hit-surface-transfer': 'impact-surface-transfer',
  'hit-ring-out': 'ring-out',
  'attack-evaded': 'evaded-warning',
} as const);

export function projectArenaV2UnarmedFeedbackDirectionPresentationCandidateV1(
  value: unknown,
): ArenaV2UnarmedFeedbackDirectionPresentationCandidateV1 {
  const source = cloneFrozenData(value, 'Arena V2 unarmed feedback direction presentation');
  assertKnownKeys(source, INPUT_KEYS, 'Arena V2 unarmed feedback direction presentation');
  for (const key of INPUT_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2徒手方向反馈缺少${key}。`);
    }
  }
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena V2徒手方向反馈只接受schemaVersion 1。');
  }
  const event = createArenaMatchEventV6(source.event);
  if (event.type !== ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED
    || event.kind === 'movement-fall'
    || event.actionDefinitionId === null
    || !UNARMED_ACTION_IDS.has(event.actionDefinitionId)) {
    throw new RangeError('Arena V2徒手方向反馈必须来自精确徒手Action的武器反馈事件。');
  }
  const command = createArenaV2FeedbackVisualCommandSnapshotCandidateV1(source.command);
  const directionFact = createArenaWeaponFeedbackDirectionFactV2(source.directionFact);
  if (command.sourceEventId !== event.id
    || command.tick !== event.tick
    || command.sequence !== event.sequence
    || command.attackerParticipantId !== event.attackerId
    || command.targetParticipantId !== event.targetId
    || directionFact.feedbackEventId !== event.id
    || directionFact.feedbackTick !== event.tick
    || directionFact.feedbackSequence !== event.sequence
    || directionFact.feedbackKind !== event.kind
    || command.cueId !== PASSTHROUGH_CUE_BY_FEEDBACK_KIND[event.kind]) {
    throw new RangeError('Arena V2徒手命令、事件、通用Cue与方向事实身份不一致。');
  }
  const strength = projectArenaV2WeaponImpactStrengthCandidateV1(directionFact);
  const authorityWorldDirection = directionFact.resultDirection.kind
    === ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND.AUTHORITY_HORIZONTAL_IMPULSE;
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    command,
    directionFact,
    directionRenderRecipe: Object.freeze({
      space: authorityWorldDirection ? 'authority-world' as const : 'symbolic-billboard' as const,
      worldDirection: directionFact.resultDirection.worldDirection,
      horizontalImpulseMagnitude: directionFact.resultDirection.horizontalImpulseMagnitude,
      impactStrength: strength?.strength ?? null,
      effectScaleMultiplier: strength?.presentation.effectScaleMultiplier ?? 1,
      directionArrowScaleMultiplier:
        strength?.presentation.directionArrowScaleMultiplier ?? 1.12,
      cameraImpactScaleMultiplier:
        strength?.presentation.cameraImpactScaleMultiplier ?? 1,
      characterImpactScaleMultiplier:
        strength?.presentation.characterImpactScaleMultiplier ?? 1,
    }),
    governance: Object.freeze({
      exactUnarmedActionIdentityRequired: true as const,
      exactFeedbackFactIdentityRequired: true as const,
      reusesGenericCueAndAuthoredBudget: true as const,
      infersDirectionFromPositionOrAnimation: false as const,
      ownsRuleOrMatchAuthority: false as const,
    }),
  });
}

export const ARENA_V2_UNARMED_FEEDBACK_DIRECTION_PRESENTATION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  defaultSurfaceWired: false as const,
  unarmedActionCount: 2 as const,
  genericCueIdentityReused: true as const,
  authorityDirectionAndImpulseOnly: true as const,
  closesAttackerAndTargetIdentityAgainstAuthorityEvent: true as const,
  addsTextureAudioOrParticleBudget: false as const,
  validationStatus: 'not-run' as const,
});
