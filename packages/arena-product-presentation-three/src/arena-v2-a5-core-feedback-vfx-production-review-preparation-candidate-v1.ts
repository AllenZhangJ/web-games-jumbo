import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1,
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_FORMAL_CORE_FEEDBACK_VFX_CUE_IDS_CANDIDATE_V1,
  ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1,
  ARENA_V2_TWENTY_WEAPON_FEEDBACK_READ_PLAN_CANDIDATE_V1,
  ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PORT_CANDIDATE_V1,
  ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_RESOLUTION_CANDIDATE_V1,
  ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_RESOLUTION_CANDIDATE_V2,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_TWENTY_WEAPON_FORMAL_VFX_STYLE_CANDIDATE_V1,
} from './arena-v2-twenty-weapon-formal-vfx-style-candidate-v1.js';

export const ARENA_V2_A5_CORE_FEEDBACK_VFX_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const TEXTURE_WIDTH = 128 as const;
const TEXTURE_HEIGHT = 128 as const;
const RGBA8_BYTES_PER_PIXEL = 4 as const;
const PER_TEXTURE_RGBA8_DECODED_BYTE_ESTIMATE =
  TEXTURE_WIDTH * TEXTURE_HEIGHT * RGBA8_BYTES_PER_PIXEL;

const FEEDBACK_KIND_BY_BASE_CUE = Object.freeze({
  'impact-confirm': 'hit-confirm',
  'impact-surface-transfer': 'hit-surface-transfer',
  'ring-out': 'hit-ring-out',
  'evaded-warning': 'attack-evaded',
  'movement-fall-warning': 'movement-fall',
} as const);

const SPECIALIZED_CUE_COUNT_BY_BASE_CUE = Object.freeze({
  'impact-confirm': 120,
  'impact-surface-transfer': 120,
  'ring-out': 120,
  'evaded-warning': 120,
  'movement-fall-warning': 3,
} as const);

const CORE_FEEDBACK_VFX_REVIEW_CHECKLIST = Object.freeze([
  Object.freeze({
    reviewId: 'five-result-texture-and-semantic-closure' as const,
    question: 'five-textures-map-one-to-one-to-five-non-conflicting-authority-result-semantics' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'shape-timing-color-and-grayscale-read' as const,
    question: 'every-result-reads-by-shape-timing-and-value-before-color' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'ring-out-versus-movement-fall-separation' as const,
    question: 'weapon-ring-out-and-self-movement-fall-never-share-the-same-causal-silhouette' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'texture-decode-alpha-edge-and-minification' as const,
    question: 'png-alpha-edges-decode-filter-and-scale-without-fringe-or-semantic-loss' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'core-direction-result-layer-hierarchy' as const,
    question: 'core-direction-and-result-remain-essential-while-decoration-cuts-first' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'quality-tier-and-reduced-motion-off-switch' as const,
    question: 'off-low-medium-high-and-static-policies-retain-causal-read-with-bounded-layers' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'particle-count-overdraw-and-distortion' as const,
    question: 'zero-twenty-four-forty-eight-ninety-six-particle-tiers-stay-under-two-x-overdraw-without-distortion' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'weapon-style-supporting-layer-closure' as const,
    question: 'twenty-weapon-contact-geometry-supports-but-never-replaces-authored-result-textures' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'pool-active-identity-and-lifecycle' as const,
    question: 'bounded-pools-sixty-four-active-identities-clear-remove-and-dispose-without-leaks' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'two-map-desktop-mobile-and-performance' as const,
    question: 'five-results-read-on-both-maps-desktop-and-mobile-with-device-performance-evidence' as const,
    evidenceStatus: 'not-run' as const,
  }),
]);

const vfxWorkBatch =
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1.workBatches.find(
    ({ batchId }) => batchId === 'a5-core-feedback-vfx-textures',
  );
if (
  vfxWorkBatch === undefined
  || vfxWorkBatch.priority !== 8
  || vfxWorkBatch.assetCount !== 5
  || vfxWorkBatch.sourceApprovalRecordedAssetCount !== 0
  || vfxWorkBatch.verifiedIntakeOnlyAssetCount !== 0
  || vfxWorkBatch.authoredCandidateAssetCount !== 5
  || vfxWorkBatch.currentAllowedScope
    !== 'contract-source-budget-and-review-preparation-only'
  || vfxWorkBatch.productionBlockoutAllowed
  || vfxWorkBatch.integrationAllowed
  || vfxWorkBatch.finalAllowed
  || vfxWorkBatch.assetUsePermitted
) throw new RangeError('Arena V2 A5核心反馈VFX评审准备必须绑定第八个关闭生产门的5资产批次。');

const vfxTextureReviewRows = Object.freeze(
  ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.map((texture) => {
    const catalogAsset =
      ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.catalogAssets.find(
        ({ assetId }) => assetId === texture.vfxAssetId,
      );
    const approvalEntry =
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.find(
        ({ assetId }) => assetId === texture.vfxAssetId,
      );
    const feedbackKind = FEEDBACK_KIND_BY_BASE_CUE[texture.cueId];
    const feedbackProfile =
      ARENA_V2_TWENTY_WEAPON_FEEDBACK_READ_PLAN_CANDIDATE_V1
        .feedbackProfiles[feedbackKind];
    const specializedCueConsumerCount =
      SPECIALIZED_CUE_COUNT_BY_BASE_CUE[texture.cueId];
    if (catalogAsset === undefined || approvalEntry === undefined) {
      throw new RangeError(`Arena V2 A5 VFX纹理${texture.vfxAssetId}缺少Catalog或批准事实。`);
    }
    if (
      texture.width !== TEXTURE_WIDTH
      || texture.height !== TEXTURE_HEIGHT
      || texture.maturity !== 'authored-candidate-not-approved'
      || feedbackProfile.feedbackKind !== feedbackKind
      || feedbackProfile.baseVisualCue !== texture.cueId
      || catalogAsset.phaseId !== 'A5'
      || catalogAsset.role !== 'core-feedback-vfx-texture'
      || catalogAsset.mediaKind !== 'texture'
      || catalogAsset.maturity !== texture.maturity
      || catalogAsset.artifactPath !== texture.artifactPath
      || catalogAsset.byteLength !== texture.byteLength
      || catalogAsset.sha256 !== texture.sha256
      || catalogAsset.productionApproved
      || catalogAsset.formalReady
      || approvalEntry.artifactPath !== texture.artifactPath
      || approvalEntry.byteLength !== texture.byteLength
      || approvalEntry.sha256 !== texture.sha256
      || approvalEntry.productionApprovalStatus !== 'missing-not-approved'
      || approvalEntry.assetUsePermitted
      || approvalEntry.formalReady
      || !vfxWorkBatch.assetIds.includes(texture.vfxAssetId)
    ) throw new RangeError(`Arena V2 A5 VFX纹理${texture.vfxAssetId}的来源、语义或批准事实漂移。`);
    return Object.freeze({
      textureAsset: Object.freeze({
        assetId: texture.vfxAssetId,
        cueId: texture.cueId,
        artifactPath: texture.artifactPath,
        runtimeSourceKey: texture.runtimeSourceKey,
        width: texture.width,
        height: texture.height,
        encodedByteLength: texture.byteLength,
        sha256: texture.sha256,
        maturity: texture.maturity,
        sourceRevision: texture.provenance.sourceRevision,
        licenseId: texture.provenance.licenseId,
        rightsHolder: texture.provenance.rightsHolder,
        proofDocument: texture.provenance.proofDocument,
        sourceApprovalRecorded: texture.provenance.approvedBy !== null
          && texture.provenance.approvedAt !== null,
        candidateBudgetCoverage: catalogAsset.v2CandidateBudgetCoverage.status,
        productionApprovalStatus: approvalEntry.productionApprovalStatus,
        productionApproved: false as const,
        formalReady: false as const,
        assetUsePermitted: false as const,
      }),
      semantic: Object.freeze({
        feedbackKind,
        semanticShape: feedbackProfile.semanticShape,
        timingLanguage: feedbackProfile.timingLanguage,
        reducedMotionFallback: feedbackProfile.reducedMotionFallback,
        valueContrastPolicy: 'bright-core-dark-edge' as const,
        colorIsNeverSoleSignal: true as const,
        specializedCueConsumerCount,
        authoritySource: feedbackKind === 'movement-fall'
          ? 'authority-movement-fall-result' as const
          : 'WeaponFeedbackResolved' as const,
      }),
      textureReview: Object.freeze({
        requiredColorSpace: 'srgb' as const,
        alphaEdgeReviewStatus: 'not-run' as const,
        decodeReviewStatus: 'not-run' as const,
        minificationReviewStatus: 'not-run' as const,
        grayscaleReviewStatus: 'not-run' as const,
        darkMapReviewStatus: 'not-run' as const,
        lightMapReviewStatus: 'not-run' as const,
        desktopCaptureStatus: 'not-run' as const,
        mobile390x844CaptureStatus: 'not-run' as const,
      }),
      memoryEnvelope: Object.freeze({
        estimateFormat: 'rgba8-no-mip-runtime-decode-envelope' as const,
        rgba8DecodedByteEstimate: PER_TEXTURE_RGBA8_DECODED_BYTE_ESTIMATE,
        measurementStatus: 'not-measured-runtime-peak' as const,
      }),
      reviewStatus: 'not-run' as const,
      productionBlockoutAllowed: false as const,
      integrationAllowed: false as const,
      finalAllowed: false as const,
    });
  }),
);

const assetIds = vfxTextureReviewRows.map(({ textureAsset }) => textureAsset.assetId);
const cueIds = vfxTextureReviewRows.map(({ textureAsset }) => textureAsset.cueId);
const feedbackKinds = vfxTextureReviewRows.map(({ semantic }) => semantic.feedbackKind);
const totalEncodedBytes = vfxTextureReviewRows.reduce(
  (total, { textureAsset }) => total + textureAsset.encodedByteLength,
  0,
);
const totalRgba8DecodedByteEstimate = vfxTextureReviewRows.reduce(
  (total, { memoryEnvelope }) => total + memoryEnvelope.rgba8DecodedByteEstimate,
  0,
);
if (
  vfxTextureReviewRows.length !== 5
  || new Set(assetIds).size !== 5
  || new Set(cueIds).size !== 5
  || new Set(feedbackKinds).size !== 5
  || new Set(assetIds).size !== vfxWorkBatch.assetIds.length
  || vfxWorkBatch.assetIds.some((assetId) => !assetIds.includes(assetId))
  || ARENA_V2_FORMAL_CORE_FEEDBACK_VFX_CUE_IDS_CANDIDATE_V1.some(
    (cueId) => !cueIds.includes(cueId),
  )
  || totalEncodedBytes !== 21_539
  || totalRgba8DecodedByteEstimate !== 327_680
  || vfxTextureReviewRows.reduce(
    (total, { semantic }) => total + semantic.specializedCueConsumerCount,
    0,
  ) !== 483
  || ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_RESOLUTION_CANDIDATE_V1
    .specializedCueCount !== 483
  || ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_RESOLUTION_CANDIDATE_V1
    .recordedFormalTextureCount !== 5
  || ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_RESOLUTION_CANDIDATE_V1
    .productionApprovedTextureCount !== 0
  || !ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_RESOLUTION_CANDIDATE_V1
    .shapeTimingColorOrderRequired
  || ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_RESOLUTION_CANDIDATE_V1
    .programmaticAssetFallbackAllowed
  || !ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_RESOLUTION_CANDIDATE_V2
    .impactStrengthUsesSharedAuthorityImpulseProjection
  || ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_RESOLUTION_CANDIDATE_V2
    .positionOrAnimationDirectionInferenceAllowed
  || ARENA_V2_TWENTY_WEAPON_FORMAL_VFX_STYLE_CANDIDATE_V1
    .stableStyleIdentityCount !== 480
  || !ARENA_V2_TWENTY_WEAPON_FORMAL_VFX_STYLE_CANDIDATE_V1
    .authoredCoreTextureRemainsRequired
  || ARENA_V2_TWENTY_WEAPON_FORMAL_VFX_STYLE_CANDIDATE_V1.addsVfxLayer
  || ARENA_V2_TWENTY_WEAPON_FORMAL_VFX_STYLE_CANDIDATE_V1.raisesParticleBudget
  || ARENA_V2_TWENTY_WEAPON_FORMAL_VFX_STYLE_CANDIDATE_V1.raisesOverdrawBudget
  || ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PORT_CANDIDATE_V1
    .maximumActiveIdentities !== 64
  || ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PORT_CANDIDATE_V1
    .currentProductionApprovedTextureCount !== 0
) throw new RangeError('Arena V2 A5核心反馈VFX准备必须闭合5纹理、483 Cue及关闭资产/性能扩容门。');

const coreFeedbackVfxReviewPack = Object.freeze({
  textureAssetCount: 5 as const,
  feedbackSemanticCount: 5 as const,
  specializedCueCount: 483 as const,
  weaponSpecificStyleCount: 480 as const,
  movementFallStyleCount: 3 as const,
  totalEncodedBytes,
  totalRgba8DecodedByteEstimate,
  shapeTimingColorContract: Object.freeze({
    orderRequired: true as const,
    valueContrastPolicy: 'bright-core-dark-edge' as const,
    essentialLayers: Object.freeze(['core', 'direction', 'result'] as const),
    optionalLayers: Object.freeze(['decoration'] as const),
    authoredCoreTextureRemainsRequired: true as const,
    generatedWeaponGeometryIsSupportingLayerOnly: true as const,
    colorIsNeverSoleSignal: true as const,
  }),
  qualityAndParticleContract: Object.freeze({
    offOrReducedMotion: Object.freeze({ maximumLayers: 1 as const, maximumParticles: 0 as const }),
    low: Object.freeze({ maximumLayers: 1 as const, maximumParticles: 24 as const }),
    medium: Object.freeze({ maximumLayers: 2 as const, maximumParticles: 48 as const }),
    high: Object.freeze({ maximumLayers: 3 as const, maximumParticles: 96 as const }),
    maximumAverageOverdraw: 2 as const,
    distortionAllowed: false as const,
    explicitOffSwitchRequired: true as const,
    boundedLifetimeRequired: true as const,
    pooledOwnershipRequired: true as const,
    maximumActiveSourceEventIdentities: 64 as const,
    particleBoundsReviewStatus: 'not-run' as const,
    deviceOverdrawReviewStatus: 'not-run' as const,
  }),
  authorityAndLifecycleContract: Object.freeze({
    ownsRuleOrHitAuthority: false as const,
    infersOutcomeFromTextureOrAnimation: false as const,
    infersDirectionFromPositionOrAnimation: false as const,
    worldDirectionUsesSharedAuthorityProjectionWhenAvailable: true as const,
    programmaticAssetFallbackAllowed: false as const,
    removeClearAndDisposeReviewStatus: 'not-run' as const,
  }),
  vfxTextureReviewRows,
  reviewChecklist: CORE_FEEDBACK_VFX_REVIEW_CHECKLIST,
  reviewStatus: 'not-run' as const,
  productionBlockoutAllowed: false as const,
  integrationAllowed: false as const,
  finalAllowed: false as const,
});

const core = Object.freeze({
  schemaVersion:
    ARENA_V2_A5_CORE_FEEDBACK_VFX_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.a5-core-feedback-vfx-production-review-preparation.candidate.v1' as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  formalReady: false as const,
  grantsApproval: false as const,
  assetUsePermitted: false as const,
  createsOrModifiesAssets: false as const,
  createsReferenceImages: false as const,
  usesAiGeneration: false as const,
  downloadsAssets: false as const,
  loadsOrDecodesAssets: false as const,
  rendersEffects: false as const,
  participatesInGameplayAuthority: false as const,
  changesFeedbackSemanticsOrCausality: false as const,
  changesVfxRuntimeLayerParticleOrOverdrawBudgets: false as const,
  defaultFormalBundleConsumes: false as const,
  defaultPreloaderConsumes: false as const,
  defaultEntryConsumes: false as const,
  workBatchId: vfxWorkBatch.batchId,
  workQueueIdentityHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1
      .workQueueIdentityHash,
  readinessIdentityHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.readinessIdentityHash,
  usedSkillIds: Object.freeze([
    'vfx-realtime', 'particle-systems', 'game-art-director',
  ] as const),
  projectReferencePaths: Object.freeze([
    'docs/architecture/arena-art-and-audio-development-flow.md',
    'docs/architecture/arena-art-bible.md',
    'docs/architecture/arena-art-development-alignment-matrix.md',
    'docs/research/arena-authored-vfx-texture-candidates.md',
    '.agents/skills/vfx-realtime/SKILL.md',
    '.agents/skills/vfx-realtime/references/patterns.md',
    '.agents/skills/vfx-realtime/references/validations.md',
    '.agents/skills/particle-systems/SKILL.md',
    '.agents/skills/game-art-director/SKILL.md',
  ] as const),
  currentAllowedScope: 'source-shape-timing-color-particle-budget-lifecycle-and-review-preparation-only' as const,
  reviewDecisionPolicy: Object.freeze({
    generatedTextureIsNotProductionApproval: true as const,
    catalogRegistrationIsNotRenderedEvidence: true as const,
    rgba8EstimateIsNotGpuMemoryMeasurement: true as const,
    grayscaleShapeReadPrecedesColorReview: true as const,
    weaponGeometryMayNotReplaceAuthoredResultTexture: true as const,
    ringOutAndMovementFallMustRemainCausallyDistinct: true as const,
    optionalDecorationCutsBeforeCoreDirectionOrResult: true as const,
    realTwoMapMobileAndPerformanceReviewRequired: true as const,
    reviewStatus: 'not-run' as const,
  }),
  productionPermission: Object.freeze({
    productionBlockoutAllowed: false as const,
    integrationAllowed: false as const,
    finalAllowed: false as const,
    assetUsePermitted: false as const,
  }),
  coreFeedbackVfxReviewPack,
  summary: Object.freeze({
    textureAssetCount: vfxTextureReviewRows.length,
    feedbackSemanticCount: new Set(feedbackKinds).size,
    specializedCueCount: vfxTextureReviewRows.reduce(
      (total, { semantic }) => total + semantic.specializedCueConsumerCount,
      0,
    ),
    weaponSpecificStyleCount:
      ARENA_V2_TWENTY_WEAPON_FORMAL_VFX_STYLE_CANDIDATE_V1.stableStyleIdentityCount,
    totalEncodedBytes,
    totalRgba8DecodedByteEstimate,
    reviewChecklistItemCount: CORE_FEEDBACK_VFX_REVIEW_CHECKLIST.length,
    reviewPassCount: 0 as const,
    renderedTextureCount: 0 as const,
    productionApprovedTextureCount: 0 as const,
    productionBlockoutTextureCount: 0 as const,
    integrationTextureCount: 0 as const,
    finalTextureCount: 0 as const,
  }),
});

export const ARENA_V2_A5_CORE_FEEDBACK_VFX_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 =
  Object.freeze({
    ...core,
    preparationIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 A5 core feedback VFX production review preparation candidate V1',
    ),
  });

export type ArenaV2A5CoreFeedbackVfxProductionReviewPreparationCandidateV1 =
  typeof ARENA_V2_A5_CORE_FEEDBACK_VFX_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1;
