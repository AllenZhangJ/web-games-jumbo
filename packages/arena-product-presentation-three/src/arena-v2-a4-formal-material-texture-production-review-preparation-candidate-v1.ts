import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1,
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_FORMAL_CHARACTER_MATERIAL_PROFILES_CANDIDATE_V1,
  ARENA_V2_FORMAL_MATERIAL_TEXTURE_ASSET_RECORDS_CANDIDATE_V1,
  ARENA_V2_FORMAL_MATERIAL_TEXTURE_BINDINGS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_FIRST_SCREEN_LIGHTING_CANDIDATE_V1,
} from './arena-v2-character-weapon-first-screen-readability-candidate-v1.js';

export const ARENA_V2_A4_FORMAL_MATERIAL_TEXTURE_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const RGBA8_BYTES_PER_PIXEL = 4 as const;
const PER_TEXTURE_WIDTH = 1024 as const;
const PER_TEXTURE_HEIGHT = 1024 as const;
const PER_TEXTURE_RGBA8_DECODED_BYTE_ESTIMATE =
  PER_TEXTURE_WIDTH * PER_TEXTURE_HEIGHT * RGBA8_BYTES_PER_PIXEL;
const BATCH_RGBA8_DECODED_BYTE_ESTIMATE =
  PER_TEXTURE_RGBA8_DECODED_BYTE_ESTIMATE
  * ARENA_V2_FORMAL_MATERIAL_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.length;
const BATCH_RGBA8_DECODED_BUDGET_BYTES = 16 * 1024 * 1024;

const MATERIAL_TEXTURE_REVIEW_CHECKLIST = Object.freeze([
  Object.freeze({
    reviewId: 'three-texture-source-and-binding-closure' as const,
    question: 'three-textures-bind-one-to-one-to-three-declared-model-consumers' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'albedo-srgb-color-space' as const,
    question: 'every-albedo-texture-decodes-and-samples-as-srgb-not-linear-data' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'gltf-pbr-material-and-uv-binding' as const,
    question: 'each-external-image-uri-resolves-to-the-intended-gltf-pbr-material-and-uv-set' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'decode-mipmap-and-minification-quality' as const,
    question: 'decode-mipmap-filtering-and-minification-remain-stable-at-play-distances' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'playable-and-enemy-value-identity' as const,
    question: 'shared-rogue-texture-preserves-six-value-patterns-and-skeleton-remains-one-uniform-enemy-family' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'shield-material-identity' as const,
    question: 'shield-texture-preserves-shield-silhouette-and-never-becomes-the-sole-weapon-signal' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'neutral-key-and-two-map-environments' as const,
    question: 'material-identity-survives-neutral-key-and-both-formal-map-environments' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'lighting-and-shadow-cost' as const,
    question: 'hemisphere-fill-directional-key-and-shadow-policy-stay-within-device-cost' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'decoded-memory-and-lifecycle' as const,
    question: 'decoded-memory-ownership-cache-reuse-and-disposal-have-runtime-evidence' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'desktop-mobile-color-variance-and-fallback' as const,
    question: 'desktop-mobile-color-variance-and-missing-texture-fallback-preserve-non-color-identity' as const,
    evidenceStatus: 'not-run' as const,
  }),
]);

const materialWorkBatch =
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1.workBatches.find(
    ({ batchId }) => batchId === 'a4-formal-material-textures',
  );
if (
  materialWorkBatch === undefined
  || materialWorkBatch.priority !== 5
  || materialWorkBatch.assetCount !== 3
  || materialWorkBatch.currentAllowedScope
    !== 'contract-source-budget-and-review-preparation-only'
  || materialWorkBatch.productionBlockoutAllowed
  || materialWorkBatch.integrationAllowed
  || materialWorkBatch.finalAllowed
  || materialWorkBatch.assetUsePermitted
) throw new RangeError('Arena V2 A4材质贴图评审准备必须绑定第五个关闭生产门的3资产批次。');

const textureReviewRows = Object.freeze(
  ARENA_V2_FORMAL_MATERIAL_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.map((texture) => {
    const binding = ARENA_V2_FORMAL_MATERIAL_TEXTURE_BINDINGS_CANDIDATE_V1.find(
      ({ textureAssetId }) => textureAssetId === texture.textureAssetId,
    );
    const textureCatalogAsset =
      ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.catalogAssets.find(
        ({ assetId }) => assetId === texture.textureAssetId,
      );
    const textureApproval =
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.find(
        ({ assetId }) => assetId === texture.textureAssetId,
      );
    if (binding === undefined || textureCatalogAsset === undefined || textureApproval === undefined) {
      throw new RangeError(`Arena V2 A4材质贴图${texture.textureAssetId}缺少绑定、Catalog或批准事实。`);
    }
    const dependency =
      ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1
        .materialTextureDependencyClosure.find(
          ({ bindingId }) => bindingId === binding.bindingId,
        );
    const consumerCatalogAsset =
      ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.catalogAssets.find(
        ({ assetId }) => assetId === binding.consumerVisualAssetId,
      );
    const consumerApproval =
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.find(
        ({ assetId }) => assetId === binding.consumerVisualAssetId,
      );
    if (dependency === undefined || consumerCatalogAsset === undefined || consumerApproval === undefined) {
      throw new RangeError(`Arena V2 A4材质贴图${texture.textureAssetId}缺少消费者依赖闭包。`);
    }
    const expectedRole = consumerCatalogAsset.role === 'weapon-attachment-model'
      ? 'attachment-material-texture'
      : 'character-material-texture';
    if (
      texture.width !== PER_TEXTURE_WIDTH
      || texture.height !== PER_TEXTURE_HEIGHT
      || texture.role !== expectedRole
      || texture.maturity !== 'verified-intake-only'
      || texture.productionApproved
      || textureCatalogAsset.phaseId !== 'A4'
      || textureCatalogAsset.mediaKind !== 'texture'
      || textureCatalogAsset.role !== texture.role
      || textureCatalogAsset.maturity !== texture.maturity
      || textureCatalogAsset.artifactPath !== texture.artifactPath
      || textureCatalogAsset.byteLength !== texture.byteLength
      || textureCatalogAsset.sha256 !== texture.sha256
      || textureCatalogAsset.productionApproved
      || textureCatalogAsset.formalReady
      || textureApproval.artifactPath !== texture.artifactPath
      || textureApproval.byteLength !== texture.byteLength
      || textureApproval.sha256 !== texture.sha256
      || textureApproval.productionApprovalStatus !== 'missing-not-approved'
      || textureApproval.assetUsePermitted
      || textureApproval.formalReady
      || binding.relationship !== 'external-gltf-image-uri'
      || binding.maturity !== texture.maturity
      || binding.productionApproved
      || dependency.consumerVisualAssetId !== binding.consumerVisualAssetId
      || dependency.textureAssetId !== texture.textureAssetId
      || dependency.relationship !== binding.relationship
      || dependency.gltfImageUri !== binding.gltfImageUri
      || dependency.productionApproved
      || dependency.formalReady
      || consumerCatalogAsset.productionApproved
      || consumerCatalogAsset.formalReady
      || consumerApproval.productionApprovalStatus !== 'missing-not-approved'
      || consumerApproval.assetUsePermitted
      || consumerApproval.formalReady
      || !materialWorkBatch.assetIds.includes(texture.textureAssetId)
    ) throw new RangeError(`Arena V2 A4材质贴图${texture.textureAssetId}的来源或消费者事实漂移。`);
    return Object.freeze({
      textureAsset: Object.freeze({
        assetId: texture.textureAssetId,
        role: texture.role,
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
        candidateBudgetCoverage: textureCatalogAsset.v2CandidateBudgetCoverage.status,
        productionApprovalStatus: textureApproval.productionApprovalStatus,
        productionApproved: false as const,
        formalReady: false as const,
        assetUsePermitted: false as const,
      }),
      binding: Object.freeze({
        bindingId: binding.bindingId,
        relationship: binding.relationship,
        gltfImageUri: binding.gltfImageUri,
        consumerVisualAssetId: binding.consumerVisualAssetId,
        consumerRole: consumerCatalogAsset.role,
        consumerArtifactPath: consumerCatalogAsset.artifactPath,
        consumerByteLength: consumerCatalogAsset.byteLength,
        consumerSha256: consumerCatalogAsset.sha256,
        consumerProductionApprovalStatus: consumerApproval.productionApprovalStatus,
        consumerProductionApproved: false as const,
        consumerFormalReady: false as const,
        consumerAssetUsePermitted: false as const,
      }),
      materialContract: Object.freeze({
        semantic: 'albedo-color-map' as const,
        requiredColorSpace: 'srgb' as const,
        dataTextureColorSpace: 'not-applicable' as const,
        requiredMaterialCompatibility: 'gltf-pbr-mesh-standard-compatible' as const,
        actualRuntimeMaterialStatus: 'not-run' as const,
        transparencyReviewStatus: 'not-run' as const,
        uvBindingReviewStatus: 'not-run' as const,
        decodeReviewStatus: 'not-run' as const,
        mipmapAndMinificationReviewStatus: 'not-run' as const,
        colorVarianceReviewStatus: 'not-run' as const,
      }),
      memoryEnvelope: Object.freeze({
        estimateFormat: 'rgba8-no-mip-runtime-decode-envelope' as const,
        rgba8DecodedByteEstimate: PER_TEXTURE_RGBA8_DECODED_BYTE_ESTIMATE,
        measurementStatus: 'not-measured-runtime-peak' as const,
        lifecycleReviewStatus: 'not-run' as const,
      }),
      desktopCaptureStatus: 'not-run' as const,
      mobile390x844CaptureStatus: 'not-run' as const,
      reviewStatus: 'not-run' as const,
      productionBlockoutAllowed: false as const,
      integrationAllowed: false as const,
      finalAllowed: false as const,
    });
  }),
);

const playableMaterialProfiles = Object.freeze(
  ARENA_V2_FORMAL_CHARACTER_MATERIAL_PROFILES_CANDIDATE_V1.slice(0, 6),
);
const enemyMaterialProfile =
  ARENA_V2_FORMAL_CHARACTER_MATERIAL_PROFILES_CANDIDATE_V1[6];
const textureAssetIds = textureReviewRows.map(({ textureAsset }) => textureAsset.assetId);
const bindingIds = textureReviewRows.map(({ binding }) => binding.bindingId);
const consumerVisualAssetIds = textureReviewRows.map(
  ({ binding }) => binding.consumerVisualAssetId,
);
if (
  textureReviewRows.length !== 3
  || new Set(textureAssetIds).size !== 3
  || new Set(bindingIds).size !== 3
  || new Set(consumerVisualAssetIds).size !== 3
  || new Set(textureAssetIds).size !== materialWorkBatch.assetIds.length
  || materialWorkBatch.assetIds.some((assetId) => !textureAssetIds.includes(assetId))
  || playableMaterialProfiles.length !== 6
  || new Set(playableMaterialProfiles.map(({ valuePattern }) => valuePattern.id)).size !== 6
  || playableMaterialProfiles.some(({ valuePattern }) => (
    valuePattern.meshValueMultipliers.length !== 7
    || !valuePattern.colorIsNeverSoleSignal
    || valuePattern.evidenceStatus !== 'specified-not-captured'
  ))
  || enemyMaterialProfile === undefined
  || enemyMaterialProfile.valuePattern.id !== 'arena.character-value-pattern.enemy-uniform.v1'
  || !enemyMaterialProfile.valuePattern.colorIsNeverSoleSignal
  || BATCH_RGBA8_DECODED_BYTE_ESTIMATE !== 12_582_912
  || BATCH_RGBA8_DECODED_BYTE_ESTIMATE > BATCH_RGBA8_DECODED_BUDGET_BYTES
) throw new RangeError('Arena V2 A4材质贴图准备必须闭合3贴图、3消费者与六角色/单敌人材质身份。');

const materialTextureReviewPack = Object.freeze({
  textureAssetCount: 3 as const,
  bindingCount: 3 as const,
  consumerVisualAssetCount: 3 as const,
  playableMaterialProfileCount: 6 as const,
  survivalEnemyMaterialProfileCount: 1 as const,
  requiredTextureSemantic: 'albedo-color-map' as const,
  requiredAlbedoColorSpace: 'srgb' as const,
  preferredImportedMaterialContract: 'gltf-pbr-mesh-standard-compatible' as const,
  lightingContract: Object.freeze({
    sourceStatus: ARENA_V2_FIRST_SCREEN_LIGHTING_CANDIDATE_V1.status,
    neutralKeyRequired: ARENA_V2_FIRST_SCREEN_LIGHTING_CANDIDATE_V1.neutralKeyRequired,
    hemisphereFillAllowed: true as const,
    directionalKeyAllowed: true as const,
    pointLightShadowAllowed: false as const,
    materialIdentityMustSurviveBothMapEnvironments:
      ARENA_V2_FIRST_SCREEN_LIGHTING_CANDIDATE_V1
        .characterMaterialIdentityMustSurviveMapEnvironment,
    weaponColorMayNotReplaceSilhouetteOrPattern:
      ARENA_V2_FIRST_SCREEN_LIGHTING_CANDIDATE_V1
        .weaponPrimaryColorMayNotReplaceSilhouetteOrPattern,
    imageBasedLightingPolicy: 'not-selected' as const,
    toneMappingReviewStatus: 'not-run' as const,
    shadowPolicyReviewStatus: 'not-run' as const,
    desktopCaptureStatus: 'not-run' as const,
    mobile390x844CaptureStatus: 'not-run' as const,
  }),
  decodedMemoryEnvelope: Object.freeze({
    estimateKind: 'deterministic-rgba8-no-mip-upper-envelope-not-runtime-measurement' as const,
    bytesPerPixel: RGBA8_BYTES_PER_PIXEL,
    perTextureDecodedByteEstimate: PER_TEXTURE_RGBA8_DECODED_BYTE_ESTIMATE,
    batchDecodedByteEstimate: BATCH_RGBA8_DECODED_BYTE_ESTIMATE,
    batchDecodedBudgetBytes: BATCH_RGBA8_DECODED_BUDGET_BYTES,
    withinCandidateEnvelope: true as const,
    runtimePeakMeasurementStatus: 'not-run' as const,
  }),
  playableMaterialProfiles: Object.freeze(playableMaterialProfiles.map((profile) => Object.freeze({
    materialProfileId: profile.id,
    tintHex: profile.tintHex,
    emissiveHex: profile.emissiveHex,
    emissiveIntensity: profile.emissiveIntensity,
    valuePatternId: profile.valuePattern.id,
    meshValueMultiplierCount: profile.valuePattern.meshValueMultipliers.length,
    colorIsNeverSoleSignal: profile.valuePattern.colorIsNeverSoleSignal,
    evidenceStatus: profile.valuePattern.evidenceStatus,
  }))),
  survivalEnemyMaterialProfile: Object.freeze({
    materialProfileId: enemyMaterialProfile.id,
    tintHex: enemyMaterialProfile.tintHex,
    emissiveHex: enemyMaterialProfile.emissiveHex,
    emissiveIntensity: enemyMaterialProfile.emissiveIntensity,
    valuePatternId: enemyMaterialProfile.valuePattern.id,
    colorIsNeverSoleSignal: enemyMaterialProfile.valuePattern.colorIsNeverSoleSignal,
    evidenceStatus: enemyMaterialProfile.valuePattern.evidenceStatus,
  }),
  textureReviewRows,
  reviewChecklist: MATERIAL_TEXTURE_REVIEW_CHECKLIST,
  reviewStatus: 'not-run' as const,
  productionBlockoutAllowed: false as const,
  integrationAllowed: false as const,
  finalAllowed: false as const,
});

const core = Object.freeze({
  schemaVersion:
    ARENA_V2_A4_FORMAL_MATERIAL_TEXTURE_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.a4-formal-material-texture-production-review-preparation.candidate.v1' as const,
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
  loadsAssets: false as const,
  participatesInGameplayAuthority: false as const,
  changesMaterialProfiles: false as const,
  changesLightingRuntime: false as const,
  infersGameplayFromColorOrMaterial: false as const,
  changesMapWeaponCharacterOrEnemyRules: false as const,
  defaultFormalBundleConsumes: false as const,
  defaultPreloaderConsumes: false as const,
  defaultEntryConsumes: false as const,
  workBatchId: materialWorkBatch.batchId,
  workQueueIdentityHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1
      .workQueueIdentityHash,
  readinessIdentityHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.readinessIdentityHash,
  usedSkillIds: Object.freeze(['threejs-materials-lighting', 'game-art-director'] as const),
  projectReferencePaths: Object.freeze([
    'docs/architecture/arena-art-and-audio-development-flow.md',
    'docs/architecture/arena-art-bible.md',
    'docs/architecture/arena-art-development-alignment-matrix.md',
    '.agents/skills/threejs-materials-lighting/SKILL.md',
    '.agents/skills/threejs-materials-lighting/references/materials-lights-table.md',
    '.agents/skills/game-art-director/SKILL.md',
  ] as const),
  currentAllowedScope: 'source-binding-color-space-memory-lighting-and-review-preparation-only' as const,
  reviewDecisionPolicy: Object.freeze({
    sourceIntakeIsNotProductionApproval: true as const,
    encodedBytesAreNotDecodedRuntimeMemory: true as const,
    rgba8EstimateIsNotRuntimePeakMeasurement: true as const,
    catalogBindingIsNotRuntimeMaterialProof: true as const,
    sharedTextureDoesNotWaiveSixCharacterValueReadability: true as const,
    colorOrMaterialMayNotBecomeGameplayAuthority: true as const,
    neutralLightingDoesNotReplaceTwoMapEnvironmentReview: true as const,
    desktopAndMobileReviewRequired: true as const,
    reviewStatus: 'not-run' as const,
  }),
  productionPermission: Object.freeze({
    productionBlockoutAllowed: false as const,
    integrationAllowed: false as const,
    finalAllowed: false as const,
    assetUsePermitted: false as const,
  }),
  materialTextureReviewPack,
  summary: Object.freeze({
    textureAssetCount: textureReviewRows.length,
    bindingCount: new Set(bindingIds).size,
    consumerVisualAssetCount: new Set(consumerVisualAssetIds).size,
    playableMaterialProfileCount: playableMaterialProfiles.length,
    survivalEnemyMaterialProfileCount: 1 as const,
    rgba8DecodedByteEstimate: BATCH_RGBA8_DECODED_BYTE_ESTIMATE,
    reviewChecklistItemCount: MATERIAL_TEXTURE_REVIEW_CHECKLIST.length,
    reviewPassCount: 0 as const,
    runtimeMaterialVerifiedTextureCount: 0 as const,
    productionApprovedTextureCount: 0 as const,
    productionBlockoutTextureCount: 0 as const,
    integrationTextureCount: 0 as const,
    finalTextureCount: 0 as const,
  }),
});

export const ARENA_V2_A4_FORMAL_MATERIAL_TEXTURE_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 =
  Object.freeze({
    ...core,
    preparationIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 A4 formal material texture production review preparation candidate V1',
    ),
  });

export type ArenaV2A4FormalMaterialTextureProductionReviewPreparationCandidateV1 =
  typeof ARENA_V2_A4_FORMAL_MATERIAL_TEXTURE_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1;
