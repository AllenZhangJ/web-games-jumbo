import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1,
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1,
  ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1,
  ARENA_V2_FORMAL_MODE_SUPPLY_AUDIO_CUE_IDS_CANDIDATE_V1,
  ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_CANDIDATE_V1,
  ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS,
} from '@number-strategy-jump/arena-product-presentation';

export const ARENA_V2_A5_MODE_AND_SUPPLY_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const MODE_AND_SUPPLY_AUDIO_REVIEW_CHECKLIST = Object.freeze([
  Object.freeze({
    reviewId: 'thirteen-mode-four-supply-identity-closure' as const,
    question: 'thirteen-mode-and-four-supply-cues-close-one-to-one-with-seventeen-assets' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'source-license-derivative-and-sha-closure' as const,
    question: 'all-seventeen-authored-derivatives-retain-source-revision-license-and-sha' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'authority-event-and-supply-fact-causality' as const,
    question: 'every-cue-consumes-an-explicit-authority-event-or-supply-fact-without-world-state-inference' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'fall-cause-and-survival-terminal-blind-read' as const,
    question: 'credited-hit-movement-environment-first-fall-and-terminal-fall-remain-distinct-without-visuals' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'start-respawn-anchor-finish-and-end-hierarchy' as const,
    question: 'round-boundaries-recovery-checkpoints-finish-and-match-end-have-clear-non-conflicting-weight' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'enemy-pressure-entry-release-density' as const,
    question: 'enemy-entry-and-leave-cues-scale-in-density-without-creating-new-enemy-or-stage-semantics' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'supply-spawn-pickup-replace-expire-lifecycle' as const,
    question: 'four-supply-cues-express-explicit-ten-second-lifecycle-results-without-marker-disappearance-inference' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'semantic-priority-eight-voice-and-dedupe' as const,
    question: 'match-results-survive-congestion-while-supply-cues-drop-first-and-source-events-never-duplicate' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'gain-headroom-limiter-masking-and-devices' as const,
    question: 'gain-ladder-master-headroom-limiter-and-device-output-avoid-clipping-or-critical-mask' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'mute-restore-load-failure-and-lifecycle' as const,
    question: 'mute-restore-preload-failure-stop-all-and-destroy-never-backfill-or-change-authority' as const,
    evidenceStatus: 'not-run' as const,
  }),
]);

const MODE_SUPPLY_AUDIO_REVIEW_PROFILE_INPUTS = Object.freeze([
  Object.freeze({ cueId: 'mode-started', category: 'mode', designIntent: 'clear-round-open', authoritySource: 'MatchStarted', authorityPredicate: 'event-type-exact', emphasis: 'strong', gainDb: -3, voicePriority: 2 }),
  Object.freeze({ cueId: 'participant-fell-credited-hit', category: 'mode', designIntent: 'credited-heavy-drop', authoritySource: 'ParticipantFell', authorityPredicate: 'fallCause=credited-hit', emphasis: 'warning', gainDb: -2, voicePriority: 3 }),
  Object.freeze({ cueId: 'participant-fell-movement', category: 'mode', designIntent: 'light-route-miss', authoritySource: 'ParticipantFell', authorityPredicate: 'fallCause=movement', emphasis: 'warning', gainDb: -2, voicePriority: 3 }),
  Object.freeze({ cueId: 'participant-fell-environment', category: 'mode', designIntent: 'dark-world-drop', authoritySource: 'ParticipantFell', authorityPredicate: 'fallCause=environment', emphasis: 'warning', gainDb: -2, voicePriority: 3 }),
  Object.freeze({ cueId: 'respawn-scheduled', category: 'mode', designIntent: 'soft-pending-pulse', authoritySource: 'ParticipantRespawnScheduled', authorityPredicate: 'event-type-exact', emphasis: 'normal', gainDb: -6, voicePriority: 2 }),
  Object.freeze({ cueId: 'respawned', category: 'mode', designIntent: 'bright-return-confirm', authoritySource: 'ParticipantRespawned', authorityPredicate: 'event-type-exact', emphasis: 'strong', gainDb: -3, voicePriority: 2 }),
  Object.freeze({ cueId: 'safe-anchor-committed', category: 'mode', designIntent: 'precise-checkpoint-lock', authoritySource: 'RaceSafeAnchorCommitted', authorityPredicate: 'event-type-exact', emphasis: 'normal', gainDb: -6, voicePriority: 2 }),
  Object.freeze({ cueId: 'race-finish-claimed', category: 'mode', designIntent: 'wide-finish-release', authoritySource: 'RaceFinishClaimed', authorityPredicate: 'event-type-exact', emphasis: 'strong', gainDb: -3, voicePriority: 3 }),
  Object.freeze({ cueId: 'enemy-pressure', category: 'mode', designIntent: 'low-threat-entry', authoritySource: 'SurvivalEnemySlotChanged', authorityPredicate: 'active=true', emphasis: 'warning', gainDb: -2, voicePriority: 2 }),
  Object.freeze({ cueId: 'enemy-left', category: 'mode', designIntent: 'pressure-release', authoritySource: 'SurvivalEnemySlotChanged', authorityPredicate: 'active=false', emphasis: 'normal', gainDb: -6, voicePriority: 2 }),
  Object.freeze({ cueId: 'survival-first-fall', category: 'mode', designIntent: 'warning-with-recovery', authoritySource: 'SurvivalPlayerFallCounted', authorityPredicate: 'terminal=false', emphasis: 'warning', gainDb: -2, voicePriority: 3 }),
  Object.freeze({ cueId: 'survival-terminal-fall', category: 'mode', designIntent: 'terminal-heavy-stop', authoritySource: 'SurvivalPlayerFallCounted', authorityPredicate: 'terminal=true', emphasis: 'warning', gainDb: -2, voicePriority: 3 }),
  Object.freeze({ cueId: 'match-ended', category: 'mode', designIntent: 'neutral-round-close', authoritySource: 'MatchEnded', authorityPredicate: 'event-type-exact', emphasis: 'strong', gainDb: -3, voicePriority: 3 }),
  Object.freeze({ cueId: 'supply-spawned', category: 'supply', designIntent: 'visible-world-arrival', authoritySource: 'ArenaSupplyAuthorityFact', authorityPredicate: 'kind=spawned', emphasis: 'strong', gainDb: -3, voicePriority: 1 }),
  Object.freeze({ cueId: 'supply-picked-up', category: 'supply', designIntent: 'quick-ownership-confirm', authoritySource: 'ArenaSupplyAuthorityFact', authorityPredicate: 'kind=picked-up', emphasis: 'normal', gainDb: -6, voicePriority: 1 }),
  Object.freeze({ cueId: 'supply-replaced', category: 'supply', designIntent: 'two-stage-swap-confirm', authoritySource: 'ArenaSupplyAuthorityFact', authorityPredicate: 'kind=replaced', emphasis: 'strong', gainDb: -3, voicePriority: 1 }),
  Object.freeze({ cueId: 'supply-expired', category: 'supply', designIntent: 'quiet-lifecycle-close', authoritySource: 'ArenaSupplyAuthorityFact', authorityPredicate: 'kind=expired', emphasis: 'warning', gainDb: -2, voicePriority: 1 }),
] as const);

const reviewProfileByCueId: ReadonlyMap<
string,
(typeof MODE_SUPPLY_AUDIO_REVIEW_PROFILE_INPUTS)[number]
> = new Map(
  MODE_SUPPLY_AUDIO_REVIEW_PROFILE_INPUTS.map((profile) => [profile.cueId, profile] as const),
);

const modeSupplyWorkBatch =
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1.workBatches.find(
    ({ batchId }) => batchId === 'a5-mode-and-supply-audio',
  );
if (
  modeSupplyWorkBatch === undefined
  || modeSupplyWorkBatch.priority !== 9
  || modeSupplyWorkBatch.assetCount !== 17
  || modeSupplyWorkBatch.sourceApprovalRecordedAssetCount !== 0
  || modeSupplyWorkBatch.verifiedIntakeOnlyAssetCount !== 0
  || modeSupplyWorkBatch.authoredCandidateAssetCount !== 17
  || modeSupplyWorkBatch.currentAllowedScope
    !== 'contract-source-budget-and-review-preparation-only'
  || modeSupplyWorkBatch.productionBlockoutAllowed
  || modeSupplyWorkBatch.integrationAllowed
  || modeSupplyWorkBatch.finalAllowed
  || modeSupplyWorkBatch.assetUsePermitted
) throw new RangeError('Arena V2 A5模式与供给音频评审准备必须绑定第九个关闭生产门的17资产批次。');

const modeSupplyAudioRecords = Object.freeze(
  ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.filter(({ actionSemantic, cueId }) => (
    actionSemantic === null
    && cueId !== null
    && !cueId.startsWith('arena.cue.audio.weapon-phase.')
  )),
);

const modeSupplyAudioReviewRows = Object.freeze(modeSupplyAudioRecords.map((audio) => {
  const profile = audio.cueId === null ? undefined : reviewProfileByCueId.get(audio.cueId);
  const catalogAsset =
    ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.catalogAssets.find(
      ({ assetId }) => assetId === audio.audioAssetId,
    );
  const approvalEntry =
    ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.find(
      ({ assetId }) => assetId === audio.audioAssetId,
    );
  if (profile === undefined || catalogAsset === undefined || approvalEntry === undefined) {
    throw new RangeError(`Arena V2 A5模式/供给音频${audio.audioAssetId}缺少Cue、Catalog或批准事实。`);
  }
  if (
    catalogAsset.phaseId !== 'A5'
    || catalogAsset.role !== 'mode-or-supply-audio'
    || catalogAsset.mediaKind !== 'audio'
    || audio.actionSemantic !== null
    || audio.weaponDefinitionId !== null
    || audio.maturity !== 'authored-candidate-not-approved'
    || catalogAsset.maturity !== audio.maturity
    || catalogAsset.artifactPath !== audio.artifactPath
    || catalogAsset.byteLength !== audio.byteLength
    || catalogAsset.sha256 !== audio.sha256
    || catalogAsset.productionApproved
    || catalogAsset.formalReady
    || approvalEntry.artifactPath !== audio.artifactPath
    || approvalEntry.byteLength !== audio.byteLength
    || approvalEntry.sha256 !== audio.sha256
    || approvalEntry.productionApprovalStatus !== 'missing-not-approved'
    || approvalEntry.assetUsePermitted
    || approvalEntry.formalReady
    || audio.provenance.sourceRevision
      !== 'arena-v2-authored-mode-supply-audio-builder.candidate.v1'
    || audio.provenance.licenseId !== 'CC0-1.0'
    || audio.provenance.approvedBy !== null
    || audio.provenance.approvedAt !== null
    || !modeSupplyWorkBatch.assetIds.includes(audio.audioAssetId)
  ) throw new RangeError(`Arena V2 A5模式/供给音频${audio.audioAssetId}来源、Cue或批准事实漂移。`);
  return Object.freeze({
    audioAsset: Object.freeze({
      assetId: audio.audioAssetId,
      cueId: profile.cueId,
      artifactPath: audio.artifactPath,
      runtimeSourceKey: audio.runtimeSourceKey,
      encodedByteLength: audio.byteLength,
      sha256: audio.sha256,
      maturity: audio.maturity,
      sourceRevision: audio.provenance.sourceRevision,
      licenseId: audio.provenance.licenseId,
      rightsHolder: audio.provenance.rightsHolder,
      proofDocument: audio.provenance.proofDocument,
      sourceApprovalRecorded: false as const,
      candidateBudgetCoverage: catalogAsset.v2CandidateBudgetCoverage.status,
      productionApprovalStatus: approvalEntry.productionApprovalStatus,
      productionApproved: false as const,
      formalReady: false as const,
      assetUsePermitted: false as const,
    }),
    causalIdentity: Object.freeze({
      category: profile.category,
      designIntent: profile.designIntent,
      authoritySource: profile.authoritySource,
      authorityPredicate: profile.authorityPredicate,
      actionDefinitionId: null,
      combatGrammarIdentity: null,
      worldStateOrAnimationInferenceAllowed: false as const,
      audioPlaybackMayWriteAuthority: false as const,
    }),
    playbackReviewContract: Object.freeze({
      bus: 'SFX' as const,
      oneShot: true as const,
      emphasis: profile.emphasis,
      gainDb: profile.gainDb,
      voicePriority: profile.voicePriority,
      deterministicVariationSource: 'sourceEventId' as const,
      playbackRateVariants: Object.freeze([0.96, 1, 1.04] as const),
      maximumConcurrentVoices: 8 as const,
      overflowPolicy: 'drop-lowest-priority' as const,
      syntheticFallbackAllowed: false as const,
      runtimeBindingReviewStatus: 'not-run' as const,
    }),
    audioQualityReview: Object.freeze({
      decodeStatus: 'not-run' as const,
      waveformAndPeakStatus: 'not-run' as const,
      loudnessStatus: 'not-run' as const,
      blindListenCausalityStatus: 'not-run' as const,
      congestionAndMaskingStatus: 'not-run' as const,
      headphonesStatus: 'not-run' as const,
      speakerStatus: 'not-run' as const,
      mobileDeviceStatus: 'not-run' as const,
      muteRestoreStatus: 'not-run' as const,
    }),
    reviewStatus: 'not-run' as const,
    productionBlockoutAllowed: false as const,
    integrationAllowed: false as const,
    finalAllowed: false as const,
  });
}));

const modeRows = modeSupplyAudioReviewRows.filter(
  ({ causalIdentity }) => causalIdentity.category === 'mode',
);
const supplyRows = modeSupplyAudioReviewRows.filter(
  ({ causalIdentity }) => causalIdentity.category === 'supply',
);
const cueIds = modeSupplyAudioReviewRows.map(({ audioAsset }) => audioAsset.cueId);
const assetIds: readonly string[] = modeSupplyAudioReviewRows.map(
  ({ audioAsset }) => audioAsset.assetId,
);
const totalEncodedBytes = modeSupplyAudioReviewRows.reduce(
  (total, { audioAsset }) => total + audioAsset.encodedByteLength,
  0,
);
if (
  MODE_SUPPLY_AUDIO_REVIEW_PROFILE_INPUTS.length !== 17
  || reviewProfileByCueId.size !== 17
  || modeSupplyAudioReviewRows.length !== 17
  || modeRows.length !== 13
  || supplyRows.length !== 4
  || new Set(cueIds).size !== 17
  || new Set(assetIds).size !== 17
  || new Set(assetIds).size !== modeSupplyWorkBatch.assetIds.length
  || modeSupplyWorkBatch.assetIds.some((assetId) => !assetIds.includes(assetId))
  || ARENA_V2_FORMAL_MODE_SUPPLY_AUDIO_CUE_IDS_CANDIDATE_V1.length !== 17
  || ARENA_V2_FORMAL_MODE_SUPPLY_AUDIO_CUE_IDS_CANDIDATE_V1.some(
    (cueId) => !cueIds.includes(cueId),
  )
  || totalEncodedBytes !== 92_077
  || ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1
    .registeredModeFeedbackAudioIdentityCount !== 13
  || ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1
    .registeredSupplyFeedbackAudioIdentityCount !== 4
  || ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1
    .approvedModeAndSupplyAudioIdentityCount !== 0
  || ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1
    .nonWeaponCombatGrammarIdentity !== null
  || ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1
    .syntheticAudioFallbackAllowed
  || ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.oneShotAudioCueCount !== 8
  || ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.seenIdentityCount !== 64
  || !ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_CANDIDATE_V1.matchEndedAlwaysHighest
  || !ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_CANDIDATE_V1
    .audioVoicePriorityUsesSemanticPriority
) throw new RangeError('Arena V2 A5模式与供给音频准备必须闭合13+4 Cue、92,077 B及既有队列优先级。');

const modeAndSupplyAudioReviewPack = Object.freeze({
  modeAudioAssetCount: 13 as const,
  supplyAudioAssetCount: 4 as const,
  totalAudioAssetCount: 17 as const,
  authoredCandidateAssetCount: 17 as const,
  totalEncodedBytes,
  causalPriorityContract: Object.freeze({
    source: 'validated-mode-events-and-explicit-supply-authority-facts' as const,
    semanticVoicePriorityOrder: Object.freeze([
      'match-ended',
      'terminal-finish-or-fall',
      'decisive-fall',
      'ordinary-mode-feedback',
      'supply-feedback',
    ] as const),
    supplyVoicePriority: 1 as const,
    matchEndedVoicePriority: 3 as const,
    audioNeverInfersModeSupplyFallRespawnOrResult: true as const,
    supplyNeverInfersLifecycleFromMarkerDisappearance: true as const,
    combatGrammarIdentity: null,
  }),
  mixReviewContract: Object.freeze({
    route: 'voice-gain→SFX→Master→limiter→destination' as const,
    sfxBusGainDb: 0 as const,
    masterHeadroomDb: -6 as const,
    limiter: Object.freeze({
      thresholdDb: -3 as const,
      kneeDb: 0 as const,
      ratio: 20 as const,
      attackSeconds: 0.003 as const,
      releaseSeconds: 0.18 as const,
    }),
    maximumConcurrentVoices: 8 as const,
    overflowPolicy: 'drop-lowest-priority' as const,
    maximumSeenSourceEventIdentities: 64 as const,
    mixGraphRuntimeReviewStatus: 'not-run' as const,
    clippingAndMaskingReviewStatus: 'not-run' as const,
  }),
  muteRestoreAndLifecycleContract: Object.freeze({
    muteRetainsVisualTextAndAnnouncementCausality: true as const,
    muteAdvancesConsumedSourceEventWatermark: true as const,
    unmuteDoesNotBackfillPastOneShots: true as const,
    restoredPastEventsRemainSilent: true as const,
    audioLoadFailureDoesNotChangeAuthority: true as const,
    stopAllAndDestroyReviewStatus: 'not-run' as const,
  }),
  modeSupplyAudioReviewRows,
  reviewChecklist: MODE_AND_SUPPLY_AUDIO_REVIEW_CHECKLIST,
  reviewStatus: 'not-run' as const,
  productionBlockoutAllowed: false as const,
  integrationAllowed: false as const,
  finalAllowed: false as const,
});

const core = Object.freeze({
  schemaVersion:
    ARENA_V2_A5_MODE_AND_SUPPLY_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.a5-mode-and-supply-audio-production-review-preparation.candidate.v1' as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  formalReady: false as const,
  grantsApproval: false as const,
  assetUsePermitted: false as const,
  createsOrModifiesAssets: false as const,
  downloadsAssets: false as const,
  convertsAssets: false as const,
  loadsOrDecodesAssets: false as const,
  playsAudio: false as const,
  participatesInGameplayAuthority: false as const,
  changesModeSupplyFallRespawnOrResultSemantics: false as const,
  changesAudioRuntimeQueueVoiceOrMixBudgets: false as const,
  defaultFormalBundleConsumes: false as const,
  defaultPreloaderConsumes: false as const,
  defaultEntryConsumes: false as const,
  workBatchId: modeSupplyWorkBatch.batchId,
  workQueueIdentityHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1
      .workQueueIdentityHash,
  readinessIdentityHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.readinessIdentityHash,
  usedSkillIds: Object.freeze(['audio-design', 'game-art-director'] as const),
  projectReferencePaths: Object.freeze([
    'docs/architecture/arena-art-and-audio-development-flow.md',
    'docs/architecture/arena-art-bible.md',
    'docs/architecture/arena-art-development-alignment-matrix.md',
    'docs/research/arena-authored-mode-supply-audio-candidates.md',
    'packages/arena-product-presentation/src/arena-v2-mode-hud-view-model-v1.ts',
    'packages/arena-product-presentation/src/arena-v2-supply-fact-cue-projection-v1.ts',
    'packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-queue-v1.ts',
    'src/entry/arena-v2-formal-web-audio-port-candidate-v1.ts',
    '.agents/skills/audio-design/SKILL.md',
    '.agents/skills/game-art-director/SKILL.md',
  ] as const),
  currentAllowedScope: 'source-causality-priority-mix-mute-lifecycle-and-review-preparation-only' as const,
  reviewDecisionPolicy: Object.freeze({
    generatedDerivativeIsNotProductionApproval: true as const,
    encodedBytesAreNotDecodedOrMixEvidence: true as const,
    catalogRegistrationIsNotAudibleCausalityEvidence: true as const,
    modeAndSupplyAudioMayNotCarryCombatGrammar: true as const,
    supplyWarningEmphasisMayNotOverrideLowSemanticVoicePriority: true as const,
    audioMayNotBackfillAfterMuteOrRestore: true as const,
    limiterIsSafetyNotMixApproval: true as const,
    realHeadphonesSpeakersAndMobileReviewRequired: true as const,
    reviewStatus: 'not-run' as const,
  }),
  productionPermission: Object.freeze({
    productionBlockoutAllowed: false as const,
    integrationAllowed: false as const,
    finalAllowed: false as const,
    assetUsePermitted: false as const,
  }),
  modeAndSupplyAudioReviewPack,
  summary: Object.freeze({
    modeAudioAssetCount: modeRows.length,
    supplyAudioAssetCount: supplyRows.length,
    totalAudioAssetCount: modeSupplyAudioReviewRows.length,
    sourceApprovalRecordedAssetCount: 0 as const,
    authoredCandidateAssetCount: modeSupplyAudioReviewRows.length,
    totalEncodedBytes,
    reviewChecklistItemCount: MODE_AND_SUPPLY_AUDIO_REVIEW_CHECKLIST.length,
    reviewPassCount: 0 as const,
    decodedAndListenedAssetCount: 0 as const,
    productionApprovedAudioCount: 0 as const,
    productionBlockoutAudioCount: 0 as const,
    integrationAudioCount: 0 as const,
    finalAudioCount: 0 as const,
  }),
});

export const ARENA_V2_A5_MODE_AND_SUPPLY_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 =
  Object.freeze({
    ...core,
    preparationIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 A5 mode and supply audio production review preparation candidate V1',
    ),
  });

export type ArenaV2A5ModeAndSupplyAudioProductionReviewPreparationCandidateV1 =
  typeof ARENA_V2_A5_MODE_AND_SUPPLY_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1;
