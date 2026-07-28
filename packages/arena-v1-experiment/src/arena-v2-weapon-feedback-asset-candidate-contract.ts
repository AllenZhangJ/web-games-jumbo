export type ArenaV2WeaponFeedbackKind =
  | 'hit-confirm'
  | 'hit-surface-transfer'
  | 'hit-ring-out'
  | 'attack-evaded'
  | 'movement-fall';

const FEEDBACK_KIND = Object.freeze({
  HIT_CONFIRM: 'hit-confirm',
  HIT_SURFACE_TRANSFER: 'hit-surface-transfer',
  HIT_RING_OUT: 'hit-ring-out',
  ATTACK_EVADED: 'attack-evaded',
  MOVEMENT_FALL: 'movement-fall',
} as const);

export type ArenaV2WeaponFeedbackAssetCandidateStatus = 'candidate';

export interface ArenaV2WeaponFeedbackAssetCandidate {
  readonly feedbackKind: ArenaV2WeaponFeedbackKind;
  readonly semanticRole:
    | 'confirm-hit'
    | 'transfer-support'
    | 'loss-of-support'
    | 'attack-evaded'
    | 'route-fall';
  readonly visualAssetId: string;
  readonly audioAssetId: string;
  readonly reducedMotionVisualAssetId: string;
  readonly status: ArenaV2WeaponFeedbackAssetCandidateStatus;
  readonly finalAssetBound: false;
  readonly deviceVerified: false;
  readonly humanVerified: false;
}

export interface ArenaV2WeaponFeedbackAssetCandidateAudit {
  readonly status: 'blocked';
  readonly candidateCount: number;
  readonly coveredFeedbackKinds: readonly ArenaV2WeaponFeedbackKind[];
  readonly blockers: readonly string[];
}

export const ARENA_V2_WEAPON_FEEDBACK_ASSET_CANDIDATES: readonly ArenaV2WeaponFeedbackAssetCandidate[] = Object.freeze([
  Object.freeze({
    feedbackKind: FEEDBACK_KIND.HIT_CONFIRM,
    semanticRole: 'confirm-hit',
    visualAssetId: 'arena.feedback.visual.impact-confirm.v1',
    audioAssetId: 'arena.feedback.audio.weapon-hit.v1',
    reducedMotionVisualAssetId: 'arena.feedback.visual.impact-confirm.reduced.v1',
    status: 'candidate',
    finalAssetBound: false,
    deviceVerified: false,
    humanVerified: false,
  }),
  Object.freeze({
    feedbackKind: FEEDBACK_KIND.HIT_SURFACE_TRANSFER,
    semanticRole: 'transfer-support',
    visualAssetId: 'arena.feedback.visual.impact-surface-transfer.v1',
    audioAssetId: 'arena.feedback.audio.weapon-transfer.v1',
    reducedMotionVisualAssetId: 'arena.feedback.visual.impact-surface-transfer.reduced.v1',
    status: 'candidate',
    finalAssetBound: false,
    deviceVerified: false,
    humanVerified: false,
  }),
  Object.freeze({
    feedbackKind: FEEDBACK_KIND.HIT_RING_OUT,
    semanticRole: 'loss-of-support',
    visualAssetId: 'arena.feedback.visual.ring-out.v1',
    audioAssetId: 'arena.feedback.audio.weapon-ring-out.v1',
    reducedMotionVisualAssetId: 'arena.feedback.visual.ring-out.reduced.v1',
    status: 'candidate',
    finalAssetBound: false,
    deviceVerified: false,
    humanVerified: false,
  }),
  Object.freeze({
    feedbackKind: FEEDBACK_KIND.ATTACK_EVADED,
    semanticRole: 'attack-evaded',
    visualAssetId: 'arena.feedback.visual.evaded-warning.v1',
    audioAssetId: 'arena.feedback.audio.weapon-evaded.v1',
    reducedMotionVisualAssetId: 'arena.feedback.visual.evaded-warning.reduced.v1',
    status: 'candidate',
    finalAssetBound: false,
    deviceVerified: false,
    humanVerified: false,
  }),
  Object.freeze({
    feedbackKind: FEEDBACK_KIND.MOVEMENT_FALL,
    semanticRole: 'route-fall',
    visualAssetId: 'arena.feedback.visual.movement-fall-warning.v1',
    audioAssetId: 'arena.feedback.audio.movement-fall.v1',
    reducedMotionVisualAssetId: 'arena.feedback.visual.movement-fall-warning.reduced.v1',
    status: 'candidate',
    finalAssetBound: false,
    deviceVerified: false,
    humanVerified: false,
  }),
]);

export function getArenaV2WeaponFeedbackAssetCandidate(
  feedbackKind: ArenaV2WeaponFeedbackKind,
): ArenaV2WeaponFeedbackAssetCandidate {
  const candidate = ARENA_V2_WEAPON_FEEDBACK_ASSET_CANDIDATES.find(({ feedbackKind: value }) => (
    value === feedbackKind
  ));
  if (!candidate) throw new RangeError(`反馈语义缺少候选资产合同：${feedbackKind}`);
  return candidate;
}

export function runArenaV2WeaponFeedbackAssetCandidateAudit(): ArenaV2WeaponFeedbackAssetCandidateAudit {
  return Object.freeze({
    status: 'blocked',
    candidateCount: ARENA_V2_WEAPON_FEEDBACK_ASSET_CANDIDATES.length,
    coveredFeedbackKinds: Object.freeze(
      ARENA_V2_WEAPON_FEEDBACK_ASSET_CANDIDATES.map(({ feedbackKind }) => feedbackKind),
    ),
    blockers: Object.freeze([
      'final-visual-assets-not-bound',
      'final-audio-assets-not-bound',
      'device-readability-not-verified',
      'human-causal-readability-not-verified',
    ]),
  });
}
