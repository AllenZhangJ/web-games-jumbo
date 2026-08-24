import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1,
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1,
  ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1,
  ARENA_V2_FORMAL_WEAPON_PHASE_AUDIO_CUE_IDS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_CANDIDATE_V1,
} from './arena-v2-twenty-weapon-audiovisual-production-manifest-candidate-v1.js';
import {
  ARENA_V2_WEAPON_PHASE_AUDIO_OWNER_CANDIDATE_V1,
} from './arena-v2-weapon-phase-audio-owner-candidate-v1.js';

export const ARENA_V2_A4_WEAPON_PHASE_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const PHASE_ORDER = Object.freeze(['windup', 'release', 'recovery'] as const);

const PHASE_INTENT = Object.freeze({
  windup: Object.freeze({
    timingRead: 'anticipation-and-commitment-start' as const,
    resultRead: 'never-hit-confirmation' as const,
    gainDb: -6 as const,
    priority: 1 as const,
  }),
  release: Object.freeze({
    timingRead: 'authority-active-entry-and-action-release' as const,
    resultRead: 'never-hit-or-ring-out-confirmation' as const,
    gainDb: -3 as const,
    priority: 2 as const,
  }),
  recovery: Object.freeze({
    timingRead: 'settle-and-recovery-window' as const,
    resultRead: 'never-control-lock-or-readiness-authority' as const,
    gainDb: -6 as const,
    priority: 1 as const,
  }),
});

const PHASE_AUDIO_REVIEW_CHECKLIST = Object.freeze([
  Object.freeze({
    reviewId: 'twenty-by-three-phase-closure' as const,
    question: 'twenty-weapons-each-own-exactly-one-windup-release-and-recovery-audio-asset' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'source-revision-license-and-sha-closure' as const,
    question: 'all-sixty-authored-derivatives-retain-registered-impact-source-rights-and-fixed-sha' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'action-start-and-authority-phase-binding' as const,
    question: 'local-action-start-plus-authority-phase-drive-each-cue-without-animation-inference' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'windup-anticipation-readability' as const,
    question: 'windup-signals-commitment-start-without-sounding-like-impact' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'release-versus-impact-separation' as const,
    question: 'release-is-clear-but-remains-distinct-from-hit-and-ring-out-confirmation' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'recovery-settle-readability' as const,
    question: 'recovery-communicates-settle-without-inventing-control-lock-or-readiness' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'phase-gain-priority-and-impact-mix' as const,
    question: 'phase-gains-and-priorities-do-not-mask-impact-ring-out-mode-or-supply-results' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'deterministic-variation-eight-voice-and-dedupe' as const,
    question: 'repeats-vary-deterministically-and-remain-bounded-under-eight-voice-congestion' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'restore-mute-reset-and-lifecycle' as const,
    question: 'mid-action-restore-mute-reset-stop-all-and-destroy-never-backfill-or-leak-cues' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'blind-listen-sequence-and-device-output' as const,
    question: 'twenty-three-part-sequences-read-on-headphones-speakers-and-mobile-without-visuals' as const,
    evidenceStatus: 'not-run' as const,
  }),
]);

const phaseWorkBatch =
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1.workBatches.find(
    ({ batchId }) => batchId === 'a4-weapon-phase-audio',
  );
if (
  phaseWorkBatch === undefined
  || phaseWorkBatch.priority !== 7
  || phaseWorkBatch.assetCount !== 60
  || phaseWorkBatch.sourceApprovalRecordedAssetCount !== 0
  || phaseWorkBatch.verifiedIntakeOnlyAssetCount !== 0
  || phaseWorkBatch.authoredCandidateAssetCount !== 60
  || phaseWorkBatch.currentAllowedScope
    !== 'contract-source-budget-and-review-preparation-only'
  || phaseWorkBatch.productionBlockoutAllowed
  || phaseWorkBatch.integrationAllowed
  || phaseWorkBatch.finalAllowed
  || phaseWorkBatch.assetUsePermitted
) throw new RangeError('Arena V2 A4武器阶段音频评审准备必须绑定第七个关闭生产门的60资产批次。');

const phaseAudioRecords = Object.freeze(
  ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.filter(
    ({ cueId }) => cueId?.startsWith('arena.cue.audio.weapon-phase.') === true,
  ),
);

const phaseAudioReviewRows = Object.freeze(phaseAudioRecords.map((audio) => {
  const catalogAsset =
    ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.catalogAssets.find(
      ({ assetId }) => assetId === audio.audioAssetId,
    );
  const approvalEntry =
    ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.find(
      ({ assetId }) => assetId === audio.audioAssetId,
    );
  const weaponManifest =
    ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_CANDIDATE_V1.find(
      ({ equipmentDefinitionId }) => equipmentDefinitionId === audio.weaponDefinitionId,
    );
  const phaseSlot = weaponManifest?.authoredPhaseAudioSlots.find(
    ({ desiredAudioAssetId }) => desiredAudioAssetId === audio.audioAssetId,
  );
  if (
    catalogAsset === undefined
    || approvalEntry === undefined
    || weaponManifest === undefined
    || phaseSlot === undefined
  ) throw new RangeError(`Arena V2 A4阶段音频${audio.audioAssetId}缺少Catalog、武器或批准事实。`);
  const phaseIntent = PHASE_INTENT[phaseSlot.phase];
  if (
    audio.actionSemantic !== null
    || audio.cueId !== phaseSlot.desiredCueId
    || audio.weaponDefinitionId !== weaponManifest.equipmentDefinitionId
    || catalogAsset.phaseId !== 'A4'
    || catalogAsset.role !== 'weapon-phase-audio'
    || catalogAsset.mediaKind !== 'audio'
    || catalogAsset.maturity !== 'authored-candidate-not-approved'
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
    || !phaseWorkBatch.assetIds.includes(audio.audioAssetId)
    || phaseSlot.status !== 'authored-candidate-not-approved'
    || phaseSlot.combatGrammarIdentity !== null
    || weaponManifest.actionBindings.length !== 2
    || weaponManifest.combatGrammarIdentities.length !== 2
    || weaponManifest.productionReady
    || weaponManifest.validationStatus !== 'not-run'
  ) throw new RangeError(`Arena V2 A4阶段音频${audio.audioAssetId}的来源、阶段或批准事实漂移。`);
  return Object.freeze({
    audioAsset: Object.freeze({
      assetId: audio.audioAssetId,
      artifactPath: audio.artifactPath,
      runtimeSourceKey: audio.runtimeSourceKey,
      encodedByteLength: audio.byteLength,
      sha256: audio.sha256,
      maturity: audio.maturity,
      sourceRevision: audio.provenance.sourceRevision,
      licenseId: audio.provenance.licenseId,
      rightsHolder: audio.provenance.rightsHolder,
      proofDocument: audio.provenance.proofDocument,
      sourceApprovalRecorded: audio.provenance.approvedBy !== null
        && audio.provenance.approvedAt !== null,
      candidateBudgetCoverage: catalogAsset.v2CandidateBudgetCoverage.status,
      productionApprovalStatus: approvalEntry.productionApprovalStatus,
      productionApproved: false as const,
      formalReady: false as const,
      assetUsePermitted: false as const,
    }),
    identity: Object.freeze({
      weaponId: weaponManifest.weaponId,
      collectionOrder: weaponManifest.collectionOrder,
      weaponDefinitionId: weaponManifest.equipmentDefinitionId,
      phase: phaseSlot.phase,
      cueId: phaseSlot.desiredCueId,
      phaseIntent,
      actionDefinitionIds: Object.freeze(weaponManifest.actionBindings.map(
        ({ collectionActionDefinitionId }) => collectionActionDefinitionId,
      )),
      actionContexts: Object.freeze(weaponManifest.actionBindings.map(
        ({ actionContext }) => actionContext,
      )),
      combatGrammarIdentity: null,
    }),
    playbackReviewContract: Object.freeze({
      localParticipantOnly: true as const,
      authoritySource: 'ActionStarted+participant.action.phase' as const,
      oneShot: true as const,
      sourceEventIdentity: 'action-start-event-id+weapon-phase' as const,
      deterministicVariationSource: 'sourceEventId' as const,
      playbackRateVariants: Object.freeze([0.96, 1, 1.04] as const),
      bus: 'SFX' as const,
      gainDb: phaseIntent.gainDb,
      priority: phaseIntent.priority,
      maximumConcurrentVoices: 8 as const,
      overflowPolicy: 'drop-lowest-priority' as const,
      syntheticFallbackAllowed: false as const,
      runtimeBindingReviewStatus: 'not-run' as const,
    }),
    audioQualityReview: Object.freeze({
      decodeStatus: 'not-run' as const,
      clickDcAndPeakStatus: 'not-run' as const,
      threePhaseLoudnessHierarchyStatus: 'not-run' as const,
      phaseVersusImpactSeparationStatus: 'not-run' as const,
      blindListenSequenceStatus: 'not-run' as const,
      repeatedActionStatus: 'not-run' as const,
      mobileDeviceStatus: 'not-run' as const,
    }),
    reviewStatus: 'not-run' as const,
    productionBlockoutAllowed: false as const,
    integrationAllowed: false as const,
    finalAllowed: false as const,
  });
}));

const assetIds: readonly string[] = phaseAudioReviewRows.map(
  ({ audioAsset }) => audioAsset.assetId,
);
const cueIds = phaseAudioReviewRows.map(({ identity }) => identity.cueId);
const weaponIds = phaseAudioReviewRows.map(({ identity }) => identity.weaponId);
const weaponPhaseKeys = phaseAudioReviewRows.map(
  ({ identity }) => `${identity.weaponId}\u0000${identity.phase}`,
);
const totalEncodedBytes = phaseAudioReviewRows.reduce(
  (total, { audioAsset }) => total + audioAsset.encodedByteLength,
  0,
);
if (
  phaseAudioReviewRows.length !== 60
  || new Set(assetIds).size !== 60
  || new Set(cueIds).size !== 60
  || new Set(weaponIds).size !== 20
  || new Set(weaponPhaseKeys).size !== 60
  || new Set(assetIds).size !== phaseWorkBatch.assetIds.length
  || phaseWorkBatch.assetIds.some((assetId) => !assetIds.includes(assetId))
  || ARENA_V2_FORMAL_WEAPON_PHASE_AUDIO_CUE_IDS_CANDIDATE_V1.some(
    (cueId) => !cueIds.includes(cueId),
  )
  || [...new Set(weaponIds)].some((weaponId) => (
    PHASE_ORDER.some((phase) => !weaponPhaseKeys.includes(`${weaponId}\u0000${phase}`))
  ))
  || phaseAudioReviewRows.some(({ identity, playbackReviewContract }) => (
    identity.actionDefinitionIds.length !== 2
    || identity.actionContexts.join(',') !== 'ground,aerial'
    || playbackReviewContract.gainDb !== PHASE_INTENT[identity.phase].gainDb
    || playbackReviewContract.priority !== PHASE_INTENT[identity.phase].priority
  ))
  || ARENA_V2_WEAPON_PHASE_AUDIO_OWNER_CANDIDATE_V1.authorityPhaseCount !== 3
  || ARENA_V2_WEAPON_PHASE_AUDIO_OWNER_CANDIDATE_V1.weaponCount !== 20
  || ARENA_V2_WEAPON_PHASE_AUDIO_OWNER_CANDIDATE_V1.stableCueCount !== 60
  || ARENA_V2_WEAPON_PHASE_AUDIO_OWNER_CANDIDATE_V1.infersHitOrDirection
  || ARENA_V2_WEAPON_PHASE_AUDIO_OWNER_CANDIDATE_V1
    .restoredMidActionWithoutStartEventPlaysAudio
  || ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1
    .registeredWeaponPhaseAudioIdentityCount !== 60
  || ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1
    .approvedWeaponPhaseAudioIdentityCount !== 0
) throw new RangeError('Arena V2 A4阶段音频准备必须闭合20武器×3阶段及关闭批准门。');

const phaseAudioReviewPack = Object.freeze({
  weaponCount: 20 as const,
  phaseCountPerWeapon: 3 as const,
  phaseAudioAssetCount: 60 as const,
  authoredCandidateAssetCount: 60 as const,
  totalEncodedBytes,
  phaseOrder: PHASE_ORDER,
  authorityContract: Object.freeze({
    localParticipantOnly: true as const,
    source: 'ActionStarted+participant.action.phase' as const,
    authorityToAudioPhase: Object.freeze({
      windup: 'windup' as const,
      active: 'release' as const,
      recovery: 'recovery' as const,
    }),
    animationDoesNotDrivePhase: true as const,
    audioDoesNotInferHitOrDirection: true as const,
    exactEquipmentAndSurvivalTierIdentityRequired: true as const,
    restoredMidActionWithoutObservedStartStaysSilent: true as const,
    muteAdvancesDedupeWaterlineWithoutBackfill: true as const,
  }),
  mixReviewContract: Object.freeze({
    bus: 'SFX' as const,
    windupGainDb: -6 as const,
    releaseGainDb: -3 as const,
    recoveryGainDb: -6 as const,
    windupPriority: 1 as const,
    releasePriority: 2 as const,
    recoveryPriority: 1 as const,
    maximumConcurrentVoices: 8 as const,
    overflowPolicy: 'drop-lowest-priority' as const,
    impactModeSupplyMaskingReviewStatus: 'not-run' as const,
  }),
  phaseAudioReviewRows,
  reviewChecklist: PHASE_AUDIO_REVIEW_CHECKLIST,
  reviewStatus: 'not-run' as const,
  productionBlockoutAllowed: false as const,
  integrationAllowed: false as const,
  finalAllowed: false as const,
});

const core = Object.freeze({
  schemaVersion:
    ARENA_V2_A4_WEAPON_PHASE_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.a4-weapon-phase-audio-production-review-preparation.candidate.v1' as const,
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
  changesWeaponOrActionCount: false as const,
  changesActionTimingControlHitRingOutOrMovement: false as const,
  changesAudioOwnerRuntimeOrMix: false as const,
  defaultFormalBundleConsumes: false as const,
  defaultPreloaderConsumes: false as const,
  defaultEntryConsumes: false as const,
  workBatchId: phaseWorkBatch.batchId,
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
    'docs/research/arena-authored-weapon-phase-audio-candidates.md',
    'packages/arena-product-presentation-three/src/arena-v2-weapon-phase-audio-owner-candidate-v1.ts',
    '.agents/skills/audio-design/SKILL.md',
    '.agents/skills/game-art-director/SKILL.md',
  ] as const),
  currentAllowedScope: 'source-phase-causality-mix-budget-and-review-preparation-only' as const,
  reviewDecisionPolicy: Object.freeze({
    generatedDerivativeIsNotProductionApproval: true as const,
    catalogRegistrationIsNotAuditionEvidence: true as const,
    animationMayNotDriveAuthorityPhase: true as const,
    releaseAudioIsNotImpactConfirmation: true as const,
    recoveryAudioDoesNotGrantControlOrReadiness: true as const,
    deterministicPitchVariationDoesNotChangeWeaponIdentity: true as const,
    restoredMidActionSilenceMustNotBackfill: true as const,
    realSequenceHeadphonesSpeakersAndMobileReviewRequired: true as const,
    reviewStatus: 'not-run' as const,
  }),
  productionPermission: Object.freeze({
    productionBlockoutAllowed: false as const,
    integrationAllowed: false as const,
    finalAllowed: false as const,
    assetUsePermitted: false as const,
  }),
  phaseAudioReviewPack,
  summary: Object.freeze({
    weaponCount: new Set(weaponIds).size,
    phaseAudioAssetCount: phaseAudioReviewRows.length,
    phaseIdentityCount: new Set(weaponPhaseKeys).size,
    authoredCandidateAssetCount: phaseAudioReviewRows.filter(
      ({ audioAsset }) => audioAsset.maturity === 'authored-candidate-not-approved',
    ).length,
    totalEncodedBytes,
    reviewChecklistItemCount: PHASE_AUDIO_REVIEW_CHECKLIST.length,
    reviewPassCount: 0 as const,
    decodedAndListenedAssetCount: 0 as const,
    productionApprovedAudioCount: 0 as const,
    productionBlockoutAudioCount: 0 as const,
    integrationAudioCount: 0 as const,
    finalAudioCount: 0 as const,
  }),
});

export const ARENA_V2_A4_WEAPON_PHASE_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 =
  Object.freeze({
    ...core,
    preparationIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 A4 weapon phase audio production review preparation candidate V1',
    ),
  });

export type ArenaV2A4WeaponPhaseAudioProductionReviewPreparationCandidateV1 =
  typeof ARENA_V2_A4_WEAPON_PHASE_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1;
