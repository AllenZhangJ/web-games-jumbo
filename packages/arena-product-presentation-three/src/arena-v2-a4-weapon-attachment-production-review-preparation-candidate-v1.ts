import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_COLLECTION_WEAPON_CATALOG_CANDIDATE_V1,
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1,
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_FORMAL_EQUIPMENT_ASSET_BINDINGS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1,
} from './arena-v2-character-weapon-first-screen-readability-candidate-v1.js';

export const ARENA_V2_A4_WEAPON_ATTACHMENT_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const WEAPON_REVIEW_CHECKLIST = Object.freeze([
  Object.freeze({
    reviewId: 'twenty-weapon-catalog-closure' as const,
    question: 'twenty-gameplay-weapons-map-one-to-one-to-twenty-attachment-assets' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'silhouette-family-separation' as const,
    question: 'all-twenty-silhouette-families-remain-distinct-without-color' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'right-hand-grip-orientation-and-scale' as const,
    question: 'each-held-transform-fits-handslot-r-faces-minus-z-and-does-not-mask-the-character' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'ground-pickup-readability' as const,
    question: 'each-ground-transform-marker-and-pattern-identify-the-weapon-without-motion' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'windup-active-recovery-readability' as const,
    question: 'three-authority-phases-read-clearly-without-inferring-hit-or-changing-timing' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'six-character-combination-readability' as const,
    question: 'every-weapon-remains-readable-on-all-six-shared-model-character-identities' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'three-distance-and-six-direction-readability' as const,
    question: 'held-and-ground-identities-survive-six-directions-at-zero-five-and-twelve-meters' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'external-texture-dependency-closure' as const,
    question: 'every-declared-external-texture-closes-with-the-model-before-loading' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'source-budget-and-post-load-fit' as const,
    question: 'source-sha-budget-bounds-facing-scale-and-floor-alignment-are-captured' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'static-clone-and-disposal-lifecycle' as const,
    question: 'static-clones-share-owned-resources-and-destroy-without-leaks-or-double-disposal' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'reduced-motion-silent-and-asset-failure-fallback' as const,
    question: 'shape-pattern-text-and-static-phase-cues-survive-motion-audio-or-asset-failure' as const,
    evidenceStatus: 'not-run' as const,
  }),
]);

const weaponWorkBatch =
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1.workBatches.find(
    ({ batchId }) => batchId === 'a4-weapon-attachment-models',
  );
const materialWorkBatch =
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1.workBatches.find(
    ({ batchId }) => batchId === 'a4-formal-material-textures',
  );
if (
  weaponWorkBatch === undefined
  || materialWorkBatch === undefined
  || weaponWorkBatch.priority !== 4
  || weaponWorkBatch.assetCount !== 20
  || weaponWorkBatch.currentAllowedScope
    !== 'contract-source-budget-and-review-preparation-only'
  || weaponWorkBatch.productionBlockoutAllowed
  || weaponWorkBatch.integrationAllowed
  || weaponWorkBatch.finalAllowed
  || weaponWorkBatch.assetUsePermitted
) throw new RangeError('Arena V2 A4武器附件评审准备必须绑定第四个关闭生产门的20资产批次。');

const weaponReviewRows = Object.freeze(
  ARENA_V2_COLLECTION_WEAPON_CATALOG_CANDIDATE_V1.weapons.map((weapon, index) => {
    const information = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.find(
      ({ weaponDefinitionId }) => weaponDefinitionId === weapon.equipment.id,
    );
    const readability =
      ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1.find(
        ({ equipmentDefinitionId }) => equipmentDefinitionId === weapon.equipment.id,
      );
    const assetBinding = ARENA_V2_FORMAL_EQUIPMENT_ASSET_BINDINGS_CANDIDATE_V1.find(
      ({ equipmentDefinitionId }) => equipmentDefinitionId === weapon.equipment.id,
    );
    if (information === undefined || readability === undefined || assetBinding === undefined) {
      throw new RangeError(`Arena V2 A4武器${weapon.id}缺少信息、可读性或附件绑定。`);
    }
    const catalogAsset =
      ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.catalogAssets.find(
        ({ assetId }) => assetId === assetBinding.attachmentAssetId,
      );
    const approvalEntry =
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.find(
        ({ assetId }) => assetId === assetBinding.attachmentAssetId,
      );
    if (catalogAsset === undefined || approvalEntry === undefined) {
      throw new RangeError(`Arena V2 A4武器${weapon.id}缺少Catalog或批准事实。`);
    }
    const textureDependency =
      ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1
        .materialTextureDependencyClosure.find(
          ({ consumerVisualAssetId }) => consumerVisualAssetId === assetBinding.attachmentAssetId,
        );
    const externalTextureDependency = textureDependency === undefined
      ? null
      : (() => {
        const textureAsset =
          ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.catalogAssets.find(
            ({ assetId }) => assetId === textureDependency.textureAssetId,
          );
        const textureApproval =
          ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.find(
            ({ assetId }) => assetId === textureDependency.textureAssetId,
          );
        if (
          textureAsset === undefined
          || textureApproval === undefined
          || !materialWorkBatch.assetIds.includes(textureAsset.assetId)
          || textureAsset.artifactPath !== textureApproval.artifactPath
          || textureAsset.byteLength !== textureApproval.byteLength
          || textureAsset.sha256 !== textureApproval.sha256
          || textureApproval.productionApprovalStatus !== 'missing-not-approved'
          || textureApproval.assetUsePermitted
          || textureApproval.formalReady
        ) throw new RangeError(`Arena V2 A4武器${weapon.id}的外部纹理事实漂移。`);
        return Object.freeze({
          bindingId: textureDependency.bindingId,
          relationship: textureDependency.relationship,
          gltfImageUri: textureDependency.gltfImageUri,
          textureAssetId: textureAsset.assetId,
          artifactPath: textureAsset.artifactPath,
          byteLength: textureAsset.byteLength,
          sha256: textureAsset.sha256,
          workBatchId: materialWorkBatch.batchId,
          productionApprovalStatus: textureApproval.productionApprovalStatus,
          productionApproved: false as const,
          formalReady: false as const,
          assetUsePermitted: false as const,
        });
      })();
    if (
      weapon.collectionOrder !== index + 1
      || weapon.id !== readability.weaponId
      || weapon.equipment.id !== information.weaponDefinitionId
      || information.learningProblemMessageId.length === 0
      || readability.groundActionDefinitionId !== information.actions[0]?.actionDefinitionId
      || readability.aerialActionDefinitionId !== information.actions[1]?.actionDefinitionId
      || readability.asset.assetId !== assetBinding.attachmentAssetId
      || readability.asset.artifactPath !== catalogAsset.artifactPath
      || readability.asset.byteLength !== catalogAsset.byteLength
      || readability.asset.sha256 !== catalogAsset.sha256
      || catalogAsset.phaseId !== 'A4'
      || catalogAsset.role !== 'weapon-attachment-model'
      || catalogAsset.maturity !== assetBinding.maturity
      || catalogAsset.artifactPath !== approvalEntry.artifactPath
      || catalogAsset.byteLength !== approvalEntry.byteLength
      || catalogAsset.sha256 !== approvalEntry.sha256
      || approvalEntry.productionApprovalStatus !== 'missing-not-approved'
      || approvalEntry.assetUsePermitted
      || approvalEntry.formalReady
      || catalogAsset.productionApproved
      || catalogAsset.formalReady
      || readability.grip.slotId !== 'handslot.r'
      || readability.grip.forwardAxis !== '-Z'
      || readability.grip.transformProof !== 'candidate-local-transform-not-render-verified'
      || readability.cameraBands.length !== 3
      || readability.productionAssetApproved
      || readability.validationStatus !== 'not-run'
    ) throw new RangeError(`Arena V2 A4武器${weapon.id}的玩法、附件或可读性事实漂移。`);
    return Object.freeze({
      weaponId: weapon.id,
      collectionOrder: weapon.collectionOrder,
      sourceBatch: weapon.sourceBatch,
      learningProblem: weapon.learningProblem,
      equipmentDefinitionId: weapon.equipment.id,
      combatGrammarDefinitionId: weapon.grammar.id,
      coreVerb: weapon.grammar.coreVerb,
      requiredInput: weapon.grammar.requiredInput,
      actionReads: information.actions,
      modeConsequences: information.modeConsequences,
      modelAsset: Object.freeze({
        assetId: catalogAsset.assetId,
        artifactPath: catalogAsset.artifactPath,
        byteLength: catalogAsset.byteLength,
        sha256: catalogAsset.sha256,
        maturity: catalogAsset.maturity,
        sourceRevision: catalogAsset.provenance.sourceRevision,
        licenseId: catalogAsset.provenance.licenseId,
        rightsHolder: catalogAsset.provenance.rightsHolder,
        proofDocument: catalogAsset.provenance.proofDocument,
        sourceApprovalRecorded: catalogAsset.provenance.sourceApprovalRecorded,
        v2CandidateBudgetCoverage: catalogAsset.v2CandidateBudgetCoverage.status,
        productionApprovalStatus: approvalEntry.productionApprovalStatus,
        productionApproved: false as const,
        formalReady: false as const,
        assetUsePermitted: false as const,
      }),
      externalTextureDependency,
      silhouette: readability.silhouette,
      palette: readability.palette,
      grip: readability.grip,
      groundPickup: readability.groundPickup,
      actionReadability: readability.actionReadability,
      cameraBands: readability.cameraBands,
      accessibility: readability.accessibility,
      postLoadVerification: Object.freeze({
        boundingBoxStatus: 'not-run' as const,
        facingStatus: 'not-run' as const,
        heldScaleAndFitStatus: 'not-run' as const,
        groundAlignmentStatus: 'not-run' as const,
        screenshotStatus: 'not-run' as const,
      }),
      reviewStatus: 'not-run' as const,
      productionBlockoutAllowed: false as const,
      integrationAllowed: false as const,
      finalAllowed: false as const,
    });
  }),
);

const weaponIds = weaponReviewRows.map(({ weaponId }) => weaponId);
const equipmentDefinitionIds = weaponReviewRows.map(
  ({ equipmentDefinitionId }) => equipmentDefinitionId,
);
const assetIds = weaponReviewRows.map(({ modelAsset }) => modelAsset.assetId);
const silhouetteFamilies = weaponReviewRows.map(({ silhouette }) => silhouette.family);
if (
  weaponReviewRows.length !== 20
  || new Set(weaponIds).size !== 20
  || new Set(equipmentDefinitionIds).size !== 20
  || new Set(assetIds).size !== 20
  || new Set(silhouetteFamilies).size !== 20
  || new Set(assetIds).size !== weaponWorkBatch.assetIds.length
  || weaponWorkBatch.assetIds.some((assetId) => !assetIds.includes(assetId))
  || weaponReviewRows.some((row) => (
    row.requiredInput !== 'primary'
    || row.actionReads.length !== 2
    || row.modeConsequences.length !== 3
    || row.palette.colorIsNeverSoleSignal !== true
    || row.groundPickup.motionRequired
    || !row.actionReadability.noHitInference
    || row.cameraBands[0]?.distanceMeters !== 0
    || row.cameraBands[1]?.distanceMeters !== 5
    || row.cameraBands[2]?.distanceMeters !== 12
    || row.reviewStatus !== 'not-run'
    || row.productionBlockoutAllowed
    || row.integrationAllowed
    || row.finalAllowed
  ))
) throw new RangeError('Arena V2 A4武器附件准备必须精确闭合20武器、20资产和20轮廓族。');

const weaponAttachmentReviewPack = Object.freeze({
  gameplayWeaponCount: 20 as const,
  attachmentAssetCount: 20 as const,
  silhouetteFamilyCount: 20 as const,
  sharedInputConcepts: ARENA_V2_COLLECTION_WEAPON_CATALOG_CANDIDATE_V1.requiredInputChannels,
  attachmentCloneStrategy: 'static-scene-clone-with-explicit-resource-owner' as const,
  skeletonCloneRequired: false as const,
  candidateTransformsAreNotRenderVerified: true as const,
  postLoadBoundingBoxFacingScaleFloorAndScreenshotRequired: true as const,
  weaponReviewRows,
  reviewChecklist: WEAPON_REVIEW_CHECKLIST,
  reviewStatus: 'not-run' as const,
  productionBlockoutAllowed: false as const,
  integrationAllowed: false as const,
  finalAllowed: false as const,
});

const core = Object.freeze({
  schemaVersion:
    ARENA_V2_A4_WEAPON_ATTACHMENT_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.a4-weapon-attachment-production-review-preparation.candidate.v1' as const,
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
  changesWeaponCount: false as const,
  changesInputContract: false as const,
  changesActionTimingHitOrMovement: false as const,
  defaultFormalBundleConsumes: false as const,
  defaultPreloaderConsumes: false as const,
  defaultEntryConsumes: false as const,
  workBatchId: weaponWorkBatch.batchId,
  workQueueIdentityHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1
      .workQueueIdentityHash,
  readinessIdentityHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.readinessIdentityHash,
  weaponCatalogContentHash: ARENA_V2_COLLECTION_WEAPON_CATALOG_CANDIDATE_V1.contentHash,
  informationContentHash:
    ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.contentHash,
  usedSkillIds: Object.freeze(['game-3d-assets', 'game-art-director'] as const),
  projectReferencePaths: Object.freeze([
    'docs/gameplay/arena-v2-hot-blooded-weapon-design-synthesis.md',
    'docs/architecture/arena-art-and-audio-development-flow.md',
    'docs/architecture/arena-art-bible.md',
    'docs/architecture/arena-art-development-alignment-matrix.md',
    'docs/research/arena-kaykit-adventurers-intake.md',
    '.agents/skills/game-3d-assets/SKILL.md',
    '.agents/skills/game-art-director/SKILL.md',
  ] as const),
  currentAllowedScope: 'source-brief-silhouette-grip-ground-action-budget-and-review-preparation-only' as const,
  reviewDecisionPolicy: Object.freeze({
    sourceIntakeIsNotProductionApproval: true as const,
    candidateTransformIsNotScreenshotEvidence: true as const,
    animationPoseDoesNotChangeAuthorityActionTiming: true as const,
    attachmentDoesNotInferHitOrMovement: true as const,
    colorIsNeverSoleIdentitySignal: true as const,
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
  weaponAttachmentReviewPack,
  summary: Object.freeze({
    weaponCount: weaponReviewRows.length,
    attachmentAssetCount: new Set(assetIds).size,
    silhouetteFamilyCount: new Set(silhouetteFamilies).size,
    externalTextureDependencyCount: weaponReviewRows.filter(
      ({ externalTextureDependency }) => externalTextureDependency !== null,
    ).length,
    reviewChecklistItemCount: WEAPON_REVIEW_CHECKLIST.length,
    reviewPassCount: 0 as const,
    postLoadVerifiedWeaponCount: 0 as const,
    productionApprovedAttachmentCount: 0 as const,
    productionBlockoutWeaponCount: 0 as const,
    integrationWeaponCount: 0 as const,
    finalWeaponCount: 0 as const,
  }),
});

export const ARENA_V2_A4_WEAPON_ATTACHMENT_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 =
  Object.freeze({
    ...core,
    preparationIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 A4 weapon attachment production review preparation candidate V1',
    ),
  });

export type ArenaV2A4WeaponAttachmentProductionReviewPreparationCandidateV1 =
  typeof ARENA_V2_A4_WEAPON_ATTACHMENT_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1;
