import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_UNARMED_ACTION_DEFINITIONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1,
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1,
  ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_CANDIDATE_V1,
} from './arena-v2-twenty-weapon-audiovisual-production-manifest-candidate-v1.js';

export const ARENA_V2_A4_WEAPON_IMPACT_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const IMPACT_AUDIO_REVIEW_CHECKLIST = Object.freeze([
  Object.freeze({
    reviewId: 'twenty-weapon-plus-unarmed-closure' as const,
    question: 'twenty-weapon-impact-assets-and-one-unarmed-base-push-close-without-identity-overlap' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'source-license-and-derivative-closure' as const,
    question: 'four-verified-intakes-and-seventeen-authored-derivatives-retain-revision-license-and-sha' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'exact-action-and-combat-grammar-binding' as const,
    question: 'twenty-weapons-resolve-from-forty-exact-ground-aerial-action-identities' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'twenty-weapon-blind-listen-identity' as const,
    question: 'all-twenty-weapons-remain-identifiable-without-visuals' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'weight-commitment-and-result-causality' as const,
    question: 'perceived-weight-supports-but-never-invents-authority-impact-or-ring-out-results' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'deterministic-repeat-variation' as const,
    question: 'source-event-variation-reduces-repetition-without-random-or-identity-drift' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'sfx-gain-and-priority-ladder' as const,
    question: 'voice-gain-sfx-routing-and-priority-preserve-important-results' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'eight-voice-overflow-and-dedupe' as const,
    question: 'eight-voice-congestion-drops-low-priority-repeats-without-duplicate-source-events' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'headroom-limiter-and-device-output' as const,
    question: 'master-headroom-limiter-headphones-speakers-and-mobile-output-avoid-clipping-or-masking' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'mute-load-failure-and-lifecycle' as const,
    question: 'mute-missing-audio-preload-failure-stop-all-and-destroy-preserve-visual-text-causality' as const,
    evidenceStatus: 'not-run' as const,
  }),
]);

const impactWorkBatch =
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1.workBatches.find(
    ({ batchId }) => batchId === 'a4-weapon-impact-audio',
  );
if (
  impactWorkBatch === undefined
  || impactWorkBatch.priority !== 6
  || impactWorkBatch.assetCount !== 21
  || impactWorkBatch.sourceApprovalRecordedAssetCount !== 4
  || impactWorkBatch.verifiedIntakeOnlyAssetCount !== 4
  || impactWorkBatch.authoredCandidateAssetCount !== 17
  || impactWorkBatch.currentAllowedScope
    !== 'contract-source-budget-and-review-preparation-only'
  || impactWorkBatch.productionBlockoutAllowed
  || impactWorkBatch.integrationAllowed
  || impactWorkBatch.finalAllowed
  || impactWorkBatch.assetUsePermitted
) throw new RangeError('Arena V2 A4武器命中音频评审准备必须绑定第六个关闭生产门的21资产批次。');

const impactAudioRecords = Object.freeze(
  ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.filter(
    ({ actionSemantic }) => actionSemantic !== null,
  ),
);

const impactAudioReviewRows = Object.freeze(impactAudioRecords.map((audio) => {
  const catalogAsset =
    ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.catalogAssets.find(
      ({ assetId }) => assetId === audio.audioAssetId,
    );
  const approvalEntry =
    ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.find(
      ({ assetId }) => assetId === audio.audioAssetId,
    );
  if (catalogAsset === undefined || approvalEntry === undefined) {
    throw new RangeError(`Arena V2 A4命中音频${audio.audioAssetId}缺少Catalog或批准事实。`);
  }
  const weaponManifest = audio.weaponDefinitionId === null
    ? null
    : ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_CANDIDATE_V1.find(
      ({ equipmentDefinitionId }) => equipmentDefinitionId === audio.weaponDefinitionId,
    ) ?? null;
  const unarmed = audio.weaponDefinitionId === null && audio.actionSemantic === 'base-push';
  if (
    catalogAsset.phaseId !== 'A4'
    || catalogAsset.role !== 'weapon-impact-audio'
    || catalogAsset.mediaKind !== 'audio'
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
    || !impactWorkBatch.assetIds.includes(audio.audioAssetId)
    || (unarmed && weaponManifest !== null)
    || (!unarmed && (
      weaponManifest === null
      || weaponManifest.impactAudio.audioAssetId !== audio.audioAssetId
      || weaponManifest.impactAudio.weaponDefinitionId !== audio.weaponDefinitionId
      || weaponManifest.impactAudio.semantic !== audio.actionSemantic
      || weaponManifest.impactAudio.maturity !== audio.maturity
      || weaponManifest.impactAudio.productionApproved
      || weaponManifest.actionBindings.length !== 2
      || weaponManifest.combatGrammarIdentities.length !== 2
      || weaponManifest.feedbackRecipes.length !== 24
      || weaponManifest.productionReady
      || weaponManifest.validationStatus !== 'not-run'
    ))
  ) throw new RangeError(`Arena V2 A4命中音频${audio.audioAssetId}的来源、武器或批准事实漂移。`);
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
      identityKind: unarmed ? 'unarmed-base-push' as const : 'weapon-impact' as const,
      weaponId: weaponManifest?.weaponId ?? null,
      collectionOrder: weaponManifest?.collectionOrder ?? null,
      weaponDefinitionId: audio.weaponDefinitionId,
      actionSemantic: audio.actionSemantic,
      audioIdentity: weaponManifest?.signature.audioIdentity ?? 'base-push-unarmed',
      coreVerb: weaponManifest?.actionBindings[0]?.coreVerb ?? null,
      sharedAudioBody: weaponManifest?.verbReadProfile.sharedAudioBody ?? 'base-push-body',
      actionDefinitionIds: unarmed
        ? Object.freeze(ARENA_V2_UNARMED_ACTION_DEFINITIONS_CANDIDATE_V1.map(({ id }) => id))
        : Object.freeze(weaponManifest!.actionBindings.map(
          ({ collectionActionDefinitionId }) => collectionActionDefinitionId,
        )),
      actionContexts: unarmed
        ? Object.freeze(['ground', 'aerial'] as const)
        : Object.freeze(weaponManifest!.actionBindings.map(({ actionContext }) => actionContext)),
      combatGrammarIdentityCount: weaponManifest?.combatGrammarIdentities.length ?? 0,
      feedbackRecipeCount: weaponManifest?.feedbackRecipes.length ?? 0,
    }),
    playbackReviewContract: Object.freeze({
      bus: 'SFX' as const,
      oneShot: true as const,
      authoritySource: 'weapon-feedback-resolved-or-exact-unarmed-action' as const,
      deterministicVariationSource: 'sourceEventId' as const,
      playbackRateVariants: Object.freeze([0.96, 1, 1.04] as const),
      allowedGainDb: Object.freeze([-6, -3, -2] as const),
      allowedPriority: Object.freeze([1, 2, 3] as const),
      maximumConcurrentVoices: 8 as const,
      overflowPolicy: 'drop-lowest-priority' as const,
      syntheticFallbackAllowed: false as const,
      runtimeBindingReviewStatus: 'not-run' as const,
    }),
    audioQualityReview: Object.freeze({
      decodeStatus: 'not-run' as const,
      waveformAndPeakStatus: 'not-run' as const,
      loudnessStatus: 'not-run' as const,
      blindListenIdentityStatus: 'not-run' as const,
      repeatedHitStatus: 'not-run' as const,
      headphonesStatus: 'not-run' as const,
      speakerStatus: 'not-run' as const,
      mobileDeviceStatus: 'not-run' as const,
    }),
    reviewStatus: 'not-run' as const,
    productionBlockoutAllowed: false as const,
    integrationAllowed: false as const,
    finalAllowed: false as const,
  });
}));

const weaponRows = impactAudioReviewRows.filter(
  ({ identity }) => identity.identityKind === 'weapon-impact',
);
const unarmedRows = impactAudioReviewRows.filter(
  ({ identity }) => identity.identityKind === 'unarmed-base-push',
);
const assetIds: readonly string[] = impactAudioReviewRows.map(
  ({ audioAsset }) => audioAsset.assetId,
);
const weaponIds = weaponRows.map(({ identity }) => identity.weaponId);
const weaponDefinitionIds = weaponRows.map(({ identity }) => identity.weaponDefinitionId);
const actionDefinitionIds = weaponRows.flatMap(
  ({ identity }) => identity.actionDefinitionIds,
);
const totalEncodedBytes = impactAudioReviewRows.reduce(
  (total, { audioAsset }) => total + audioAsset.encodedByteLength,
  0,
);
if (
  impactAudioReviewRows.length !== 21
  || weaponRows.length !== 20
  || unarmedRows.length !== 1
  || new Set(assetIds).size !== 21
  || new Set(weaponIds).size !== 20
  || new Set(weaponDefinitionIds).size !== 20
  || actionDefinitionIds.length !== 40
  || new Set(actionDefinitionIds).size !== 40
  || new Set(assetIds).size !== impactWorkBatch.assetIds.length
  || impactWorkBatch.assetIds.some((assetId) => !assetIds.includes(assetId))
  || impactAudioReviewRows.filter(
    ({ audioAsset }) => audioAsset.sourceApprovalRecorded,
  ).length !== 4
  || impactAudioReviewRows.filter(
    ({ audioAsset }) => audioAsset.maturity === 'verified-intake-only',
  ).length !== 4
  || impactAudioReviewRows.filter(
    ({ audioAsset }) => audioAsset.maturity === 'authored-candidate-not-approved',
  ).length !== 17
  || totalEncodedBytes !== 125_974
  || ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1
    .registeredImpactAudioIdentityCount !== 21
  || ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1
    .registeredWeaponImpactAudioIdentityCount !== 20
  || ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1
    .impactActionLookupPolicy !== 'exact-action-definition-id'
  || ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1
    .approvedWeaponImpactAudioIdentityCount !== 0
  || ARENA_V2_FORMAL_AUDIO_CUE_RESOLUTION_CANDIDATE_V1
    .approvedAdditionalUnarmedImpactAudioIdentityCount !== 0
) throw new RangeError('Arena V2 A4命中音频准备必须闭合20武器、1徒手、40动作和21份未批准资产。');

const impactAudioReviewPack = Object.freeze({
  impactAudioAssetCount: 21 as const,
  weaponImpactAudioAssetCount: 20 as const,
  unarmedImpactAudioAssetCount: 1 as const,
  exactWeaponActionIdentityCount: 40 as const,
  verifiedIntakeAssetCount: 4 as const,
  authoredCandidateAssetCount: 17 as const,
  totalEncodedBytes,
  impactActionLookupPolicy: 'exact-action-definition-id' as const,
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
    mixGraphRuntimeReviewStatus: 'not-run' as const,
    clippingAndMaskingReviewStatus: 'not-run' as const,
  }),
  causalAndAccessibilityContract: Object.freeze({
    impactAudioConsumesAuthorityDerivedCommandsOnly: true as const,
    audioNeverInfersHitRingOutOrMovement: true as const,
    muteRetainsVisualShapeDirectionResultTextAndAnnouncement: true as const,
    audioLoadFailureDoesNotChangeAuthority: true as const,
    syntheticOrUnrelatedFallbackAllowed: false as const,
    playerBlindListenReviewRequired: true as const,
  }),
  impactAudioReviewRows,
  reviewChecklist: IMPACT_AUDIO_REVIEW_CHECKLIST,
  reviewStatus: 'not-run' as const,
  productionBlockoutAllowed: false as const,
  integrationAllowed: false as const,
  finalAllowed: false as const,
});

const core = Object.freeze({
  schemaVersion:
    ARENA_V2_A4_WEAPON_IMPACT_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.a4-weapon-impact-audio-production-review-preparation.candidate.v1' as const,
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
  changesWeaponCount: false as const,
  changesActionTimingHitRingOutOrMovement: false as const,
  changesAudioRuntimeOrMix: false as const,
  defaultFormalBundleConsumes: false as const,
  defaultPreloaderConsumes: false as const,
  defaultEntryConsumes: false as const,
  workBatchId: impactWorkBatch.batchId,
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
    'docs/research/arena-kenney-impact-sounds-intake.md',
    'docs/research/arena-authored-weapon-audio-candidates.md',
    'src/entry/arena-v2-formal-web-audio-port-candidate-v1.ts',
    '.agents/skills/audio-design/SKILL.md',
    '.agents/skills/game-art-director/SKILL.md',
  ] as const),
  currentAllowedScope: 'source-identity-causality-mix-budget-and-review-preparation-only' as const,
  reviewDecisionPolicy: Object.freeze({
    sourceIntakeIsNotProductionApproval: true as const,
    generatedDerivativeIsNotProductionApproval: true as const,
    encodedBytesAreNotDecodedOrMixEvidence: true as const,
    catalogRegistrationIsNotAudibleIdentityEvidence: true as const,
    audioWeightCannotOverrideAuthorityResult: true as const,
    deterministicPitchVariationDoesNotCreateNewWeaponIdentity: true as const,
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
  impactAudioReviewPack,
  summary: Object.freeze({
    impactAudioAssetCount: impactAudioReviewRows.length,
    weaponImpactAudioAssetCount: weaponRows.length,
    unarmedImpactAudioAssetCount: unarmedRows.length,
    exactWeaponActionIdentityCount: new Set(actionDefinitionIds).size,
    sourceApprovalRecordedAssetCount: impactAudioReviewRows.filter(
      ({ audioAsset }) => audioAsset.sourceApprovalRecorded,
    ).length,
    authoredCandidateAssetCount: impactAudioReviewRows.filter(
      ({ audioAsset }) => audioAsset.maturity === 'authored-candidate-not-approved',
    ).length,
    totalEncodedBytes,
    reviewChecklistItemCount: IMPACT_AUDIO_REVIEW_CHECKLIST.length,
    reviewPassCount: 0 as const,
    decodedAndListenedAssetCount: 0 as const,
    productionApprovedAudioCount: 0 as const,
    productionBlockoutAudioCount: 0 as const,
    integrationAudioCount: 0 as const,
    finalAudioCount: 0 as const,
  }),
});

export const ARENA_V2_A4_WEAPON_IMPACT_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 =
  Object.freeze({
    ...core,
    preparationIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 A4 weapon impact audio production review preparation candidate V1',
    ),
  });

export type ArenaV2A4WeaponImpactAudioProductionReviewPreparationCandidateV1 =
  typeof ARENA_V2_A4_WEAPON_IMPACT_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1;
