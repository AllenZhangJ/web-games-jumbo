import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { ARENA_ANIMATION_SEMANTIC_IDS } from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1,
} from './arena-v2-a3-a6-formal-asset-readiness-candidate-v1.js';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1,
} from './arena-v2-a3-a6-formal-asset-production-work-queue-candidate-v1.js';
import {
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
} from './arena-v2-a3-a6-production-approval-evidence-ledger-candidate-v1.js';
import {
  ARENA_V2_FORMAL_CHARACTER_MATERIAL_PROFILES_CANDIDATE_V1,
  ARENA_V2_FORMAL_CHARACTER_PRESENTATION_RECORDS_CANDIDATE_V1,
} from './arena-v2-formal-presentation-asset-catalog-candidate-v1.js';

export const ARENA_V2_A3_SURVIVAL_ENEMY_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const ENEMY_REVIEW_CHECKLIST = Object.freeze([
  Object.freeze({
    reviewId: 'four-view-turnaround-consistency' as const,
    question: 'front-three-quarter-side-and-back-preserve-one-silhouette-and-proportion-system' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'playable-enemy-silhouette-separation' as const,
    question: 'enemy-remains-distinct-from-all-playable-characters-at-gameplay-thumbnail-distances' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'six-sector-direction-readability' as const,
    question: 'camera-relative-six-sector-facing-remains-readable-without-color' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'animation-semantic-coverage' as const,
    question: 'every-registered-animation-semantic-reads-without-changing-gameplay-timing' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'crowd-density-readability' as const,
    question: 'one-two-four-eight-and-sixteen-enemies-remain-readable-without-inventing-variants' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'pressure-signal-integrity' as const,
    question: 'pressure-is-expressed-by-count-entry-direction-density-and-stage-marker-only' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'hit-fall-and-reentry-readability' as const,
    question: 'hitstun-knockback-fall-and-reentry-are-distinct-without-rejudging-results' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'texture-outline-and-fallback-readability' as const,
    question: 'material-outline-reduced-motion-and-asset-failure-fallback-preserve-enemy-identity' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'source-budget-and-lifecycle-closure' as const,
    question: 'model-texture-source-budget-load-clone-and-disposal-evidence-close-together' as const,
    evidenceStatus: 'not-run' as const,
  }),
]);

const enemyWorkBatch =
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1.workBatches.find(
    ({ batchId }) => batchId === 'a3-survival-enemy-model',
  );
const materialWorkBatch =
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1.workBatches.find(
    ({ batchId }) => batchId === 'a4-formal-material-textures',
  );
if (
  enemyWorkBatch === undefined
  || materialWorkBatch === undefined
  || enemyWorkBatch.priority !== 2
  || enemyWorkBatch.assetCount !== 1
  || enemyWorkBatch.currentAllowedScope
    !== 'contract-source-budget-and-review-preparation-only'
  || enemyWorkBatch.productionBlockoutAllowed
  || enemyWorkBatch.integrationAllowed
  || enemyWorkBatch.finalAllowed
  || enemyWorkBatch.assetUsePermitted
) throw new RangeError('Arena V2 A3生存敌人评审准备必须绑定第二个关闭生产门的单资产批次。');

const enemyPresentationRecord =
  ARENA_V2_FORMAL_CHARACTER_PRESENTATION_RECORDS_CANDIDATE_V1.find(
    ({ role }) => role === 'survival-enemy-model',
  );
if (enemyPresentationRecord === undefined) {
  throw new RangeError('Arena V2 A3生存敌人缺少唯一Presentation身份。');
}
const enemyPresentation = enemyPresentationRecord.presentation;
const enemyCatalogAsset =
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.catalogAssets.find(
    ({ assetId }) => assetId === enemyPresentation.modelAssetId,
  );
const enemyApprovalEntry =
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.find(
    ({ assetId }) => assetId === enemyPresentation.modelAssetId,
  );
const enemyMaterialProfile =
  ARENA_V2_FORMAL_CHARACTER_MATERIAL_PROFILES_CANDIDATE_V1.find(
    ({ id }) => id === enemyPresentation.materialProfileId,
  );
const enemyTextureDependency =
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1
    .materialTextureDependencyClosure.find(
      ({ consumerVisualAssetId }) => consumerVisualAssetId === enemyPresentation.modelAssetId,
    );
if (
  enemyCatalogAsset === undefined
  || enemyApprovalEntry === undefined
  || enemyMaterialProfile === undefined
  || enemyTextureDependency === undefined
) throw new RangeError('Arena V2 A3生存敌人缺少模型、材质、纹理或批准事实。');
const enemyTextureAsset =
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.catalogAssets.find(
    ({ assetId }) => assetId === enemyTextureDependency.textureAssetId,
  );
const enemyTextureApprovalEntry =
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.find(
    ({ assetId }) => assetId === enemyTextureDependency.textureAssetId,
  );
if (enemyTextureAsset === undefined || enemyTextureApprovalEntry === undefined) {
  throw new RangeError('Arena V2 A3生存敌人缺少外部纹理Catalog或批准事实。');
}

const pressurePolicy = ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.pressurePolicyDefinition;
const desiredActiveEnemyCounts = Object.freeze(
  pressurePolicy.stages.map(({ desiredActiveEnemySlots }) => desiredActiveEnemySlots),
);
const animationSemanticBindings = Object.freeze(ARENA_ANIMATION_SEMANTIC_IDS.map((semantic) => {
  const binding = enemyPresentation.animationMap[semantic];
  return Object.freeze({
    semantic,
    sourceKind: binding.sourceKind,
    sourceKey: binding.sourceKey,
    loop: binding.loop,
    fallbackSemantics: binding.fallbackSemantics,
    reviewStatus: 'not-run' as const,
  });
}));
const distinctAnimationSourceKeys = Object.freeze([
  ...new Set(animationSemanticBindings.map(({ sourceKey }) => sourceKey)),
].sort());

if (
  ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.enemyVisualArchetypeCount !== 1
  || ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.enemyAuthorityFamilyCount !== 1
  || ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.maximumActiveEnemies !== 16
  || pressurePolicy.slotActivationOrder.length !== 16
  || pressurePolicy.stages.length !== 10
  || desiredActiveEnemyCounts.join(',') !== '1,2,3,4,5,6,8,10,12,16'
  || enemyPresentation.characterDefinitionId
    !== ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1
      .enemyFamilyCharacterDefinition.id
  || !enemyWorkBatch.assetIds.includes(enemyPresentation.modelAssetId)
  || enemyCatalogAsset.phaseId !== 'A3'
  || enemyCatalogAsset.role !== 'survival-enemy-model'
  || enemyCatalogAsset.maturity !== enemyPresentationRecord.maturity
  || enemyCatalogAsset.artifactPath !== enemyApprovalEntry.artifactPath
  || enemyCatalogAsset.byteLength !== enemyApprovalEntry.byteLength
  || enemyCatalogAsset.sha256 !== enemyApprovalEntry.sha256
  || enemyApprovalEntry.productionApprovalStatus !== 'missing-not-approved'
  || enemyCatalogAsset.productionApproved
  || enemyCatalogAsset.formalReady
  || enemyApprovalEntry.assetUsePermitted
  || enemyApprovalEntry.formalReady
  || enemyPresentation.direction.strategy !== 'six-sector-camera-relative'
  || enemyPresentation.direction.defaultFrontAxis !== 'negative-z'
  || animationSemanticBindings.length !== ARENA_ANIMATION_SEMANTIC_IDS.length
  || new Set(animationSemanticBindings.map(({ semantic }) => semantic)).size
    !== ARENA_ANIMATION_SEMANTIC_IDS.length
) throw new RangeError('Arena V2 A3生存敌人的单族、压力、资产或动作语义事实漂移。');

if (
  enemyTextureAsset.role !== 'character-material-texture'
  || enemyTextureAsset.artifactPath !== enemyTextureApprovalEntry.artifactPath
  || enemyTextureAsset.byteLength !== enemyTextureApprovalEntry.byteLength
  || enemyTextureAsset.sha256 !== enemyTextureApprovalEntry.sha256
  || !materialWorkBatch.assetIds.includes(enemyTextureAsset.assetId)
  || enemyTextureDependency.productionApproved
  || enemyTextureDependency.formalReady
  || enemyTextureApprovalEntry.productionApprovalStatus !== 'missing-not-approved'
  || enemyTextureApprovalEntry.assetUsePermitted
  || enemyTextureApprovalEntry.formalReady
  || enemyMaterialProfile.valuePattern.colorIsNeverSoleSignal !== true
  || enemyMaterialProfile.valuePattern.evidenceStatus !== 'specified-not-captured'
) throw new RangeError('Arena V2 A3生存敌人的外部纹理或非颜色可读性事实漂移。');

const enemyReviewPack = Object.freeze({
  characterDefinitionId: enemyPresentation.characterDefinitionId,
  presentationDefinitionId: enemyPresentation.id,
  singleVisualArchetypeRequired: true as const,
  singleAuthorityFamilyRequired: true as const,
  modelAsset: Object.freeze({
    assetId: enemyCatalogAsset.assetId,
    artifactPath: enemyCatalogAsset.artifactPath,
    byteLength: enemyCatalogAsset.byteLength,
    sha256: enemyCatalogAsset.sha256,
    maturity: enemyCatalogAsset.maturity,
    sourceRevision: enemyCatalogAsset.provenance.sourceRevision,
    licenseId: enemyCatalogAsset.provenance.licenseId,
    rightsHolder: enemyCatalogAsset.provenance.rightsHolder,
    proofDocument: enemyCatalogAsset.provenance.proofDocument,
    sourceApprovalRecorded: enemyCatalogAsset.provenance.sourceApprovalRecorded,
    v2CandidateBudgetCoverage: enemyCatalogAsset.v2CandidateBudgetCoverage.status,
    productionApprovalStatus: enemyApprovalEntry.productionApprovalStatus,
    productionApproved: false as const,
    formalReady: false as const,
    assetUsePermitted: false as const,
  }),
  externalTextureDependency: Object.freeze({
    bindingId: enemyTextureDependency.bindingId,
    relationship: enemyTextureDependency.relationship,
    gltfImageUri: enemyTextureDependency.gltfImageUri,
    textureAssetId: enemyTextureAsset.assetId,
    artifactPath: enemyTextureAsset.artifactPath,
    byteLength: enemyTextureAsset.byteLength,
    sha256: enemyTextureAsset.sha256,
    maturity: enemyTextureAsset.maturity,
    workBatchId: materialWorkBatch.batchId,
    productionApprovalStatus: enemyTextureApprovalEntry.productionApprovalStatus,
    productionApproved: false as const,
    formalReady: false as const,
    assetUsePermitted: false as const,
  }),
  presentationIdentity: Object.freeze({
    rigProfileId: enemyPresentation.rigProfileId,
    materialProfileId: enemyPresentation.materialProfileId,
    outlineProfileId: enemyPresentation.outlineProfileId,
    direction: enemyPresentation.direction,
    locomotion: enemyPresentation.locomotion,
    materialTintHex: enemyMaterialProfile.tintHex,
    materialEmissiveHex: enemyMaterialProfile.emissiveHex,
    materialEmissiveIntensity: enemyMaterialProfile.emissiveIntensity,
    valuePattern: enemyMaterialProfile.valuePattern,
  }),
  pressureIdentity: Object.freeze({
    modeDefinitionId: ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.modeDefinitionId,
    pressurePolicyDefinitionId: pressurePolicy.id,
    sharedMapDefinitionIds:
      ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.sharesMapDefinitionIds,
    stageIntervalTicks:
      ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.stageIntervalTicks,
    maximumActiveEnemies:
      ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.maximumActiveEnemies,
    slotCount: pressurePolicy.slotActivationOrder.length,
    desiredActiveEnemyCounts,
  }),
  silhouetteAndConsistencyBrief: Object.freeze({
    turnaroundViewIds: Object.freeze(['front', 'three-quarter', 'side', 'back'] as const),
    gameplayReviewDistanceIds: Object.freeze(['d00', 'd05', 'd12'] as const),
    gameplayReviewViewportIds: Object.freeze(['390x844@2x', '1280x720@1x'] as const),
    preserveOneDescriptionAnchorAcrossEveryReview: true as const,
    distinguishFromAllSixPlayableCharactersWithoutColor: true as const,
    slotVisualVariationAllowed: false as const,
    stageVisualVariantAllowed: false as const,
    collisionScaleVariationAllowed: false as const,
    colorRarityVariationAllowed: false as const,
    pressureSignalIds: Object.freeze([
      'active-enemy-count',
      'entry-direction',
      'crowd-density',
      'authority-stage-marker',
    ] as const),
    pressureMayNotBeExpressedBy: Object.freeze([
      'new-enemy-type',
      'larger-collision-silhouette',
      'rarity-color',
      'new-skill-outline',
    ] as const),
    proportionReviewStatus: 'not-run' as const,
    thumbnailSilhouetteReviewStatus: 'not-run' as const,
  }),
  animationSemanticBindings,
  distinctAnimationSourceKeys,
  sourceIntakeRuntimeClipCount: 18 as const,
  sourceIntakeRuntimeClipCountStatus: 'catalog-and-proof-declared-not-runtime-inspected' as const,
  reviewChecklist: ENEMY_REVIEW_CHECKLIST,
  reviewStatus: 'not-run' as const,
  productionBlockoutAllowed: false as const,
  integrationAllowed: false as const,
  finalAllowed: false as const,
});

if (
  enemyReviewPack.reviewChecklist.length !== 9
  || enemyReviewPack.reviewChecklist.some(({ evidenceStatus }) => evidenceStatus !== 'not-run')
  || enemyReviewPack.modelAsset.productionApprovalStatus !== 'missing-not-approved'
  || enemyReviewPack.externalTextureDependency.productionApprovalStatus
    !== 'missing-not-approved'
  || enemyReviewPack.productionBlockoutAllowed
  || enemyReviewPack.integrationAllowed
  || enemyReviewPack.finalAllowed
) throw new RangeError('Arena V2 A3生存敌人生产评审准备不得伪造评审或开放生产门。');

const core = Object.freeze({
  schemaVersion:
    ARENA_V2_A3_SURVIVAL_ENEMY_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.a3-survival-enemy-production-review-preparation.candidate.v1' as const,
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
  loadsAssets: false as const,
  participatesInGameplayAuthority: false as const,
  changesEnemyFamilyCount: false as const,
  changesPressurePolicy: false as const,
  changesCollisionMovementOrActionTiming: false as const,
  defaultFormalBundleConsumes: false as const,
  defaultPreloaderConsumes: false as const,
  defaultEntryConsumes: false as const,
  workBatchId: enemyWorkBatch.batchId,
  workQueueIdentityHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1
      .workQueueIdentityHash,
  readinessIdentityHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.readinessIdentityHash,
  survivalPressureContentHash: ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.contentHash,
  usedSkillIds: Object.freeze(['character-design-sheet', 'game-art-director'] as const),
  projectReferencePaths: Object.freeze([
    'docs/architecture/arena-art-and-audio-development-flow.md',
    'docs/architecture/arena-art-bible.md',
    'docs/architecture/arena-art-development-alignment-matrix.md',
    'docs/research/arena-kaykit-skeletons-intake.md',
    '.agents/skills/character-design-sheet/SKILL.md',
    '.agents/skills/game-art-director/SKILL.md',
  ] as const),
  currentAllowedScope: 'source-brief-silhouette-animation-budget-and-review-preparation-only' as const,
  reviewDecisionPolicy: Object.freeze({
    sourceIntakeIsNotProductionApproval: true as const,
    registeredAnimationBindingsAreNotRuntimeReadabilityEvidence: true as const,
    oneFamilyMustRemainOneFamilyAtEveryPressureStage: true as const,
    playerReviewRequired: true as const,
    browserAndDeviceReviewRequired: true as const,
    reviewStatus: 'not-run' as const,
  }),
  productionPermission: Object.freeze({
    productionBlockoutAllowed: false as const,
    integrationAllowed: false as const,
    finalAllowed: false as const,
    assetUsePermitted: false as const,
  }),
  enemyReviewPack,
  summary: Object.freeze({
    enemyAuthorityFamilyCount: 1 as const,
    enemyVisualArchetypeCount: 1 as const,
    modelAssetCount: 1 as const,
    requiredExternalTextureAssetCount: 1 as const,
    animationSemanticCount: animationSemanticBindings.length,
    distinctAnimationSourceKeyCount: distinctAnimationSourceKeys.length,
    pressureStageCount: pressurePolicy.stages.length,
    maximumActiveEnemyCount:
      ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.maximumActiveEnemies,
    reviewChecklistItemCount: ENEMY_REVIEW_CHECKLIST.length,
    reviewPassCount: 0 as const,
    productionBlockoutEnemyCount: 0 as const,
    integrationEnemyCount: 0 as const,
    finalEnemyCount: 0 as const,
  }),
});

export const ARENA_V2_A3_SURVIVAL_ENEMY_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 =
  Object.freeze({
    ...core,
    preparationIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 A3 survival enemy production review preparation candidate V1',
    ),
  });

export type ArenaV2A3SurvivalEnemyProductionReviewPreparationCandidateV1 =
  typeof ARENA_V2_A3_SURVIVAL_ENEMY_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1;
