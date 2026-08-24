import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { ARENA_ANIMATION_SEMANTIC_IDS } from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_V2_SIX_CHARACTER_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1,
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_FORMAL_CHARACTER_MATERIAL_PROFILES_CANDIDATE_V1,
  ARENA_V2_FORMAL_CHARACTER_PRESENTATION_RECORDS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1,
} from './arena-v2-character-weapon-first-screen-readability-candidate-v1.js';

export const ARENA_V2_A4_PLAYABLE_CHARACTER_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const CHARACTER_REVIEW_CHECKLIST = Object.freeze([
  Object.freeze({
    reviewId: 'same-input-contract' as const,
    question: 'all-six-handling-identities-remain-direction-jump-and-primary-only' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'handling-difference-legibility' as const,
    question: 'each-limited-movement-difference-is-felt-and-described-without-a-skill-tree' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'shared-geometry-honesty' as const,
    question: 'shared-neutral-geometry-is-not-misrepresented-as-six-distinct-model-silhouettes' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'selection-pose-identity' as const,
    question: 'six-selection-poses-communicate-handling-without-changing-authority-state' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'value-pattern-non-color-identity' as const,
    question: 'six-seven-part-value-patterns-remain-distinct-in-grayscale-and-color-variance' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'six-direction-and-weapon-combination' as const,
    question: 'each-character-and-held-weapon-remains-readable-in-six-directions-and-three-distances' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'animation-semantic-and-clip-closure' as const,
    question: 'nineteen-semantics-map-to-the-declared-eighteen-runtime-clips-without-timing-authority' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'cross-mode-character-identity' as const,
    question: 'character-identity-remains-stable-across-duel-race-and-survival' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'model-texture-source-and-budget' as const,
    question: 'shared-model-and-external-texture-source-budget-and-approval-close-together' as const,
    evidenceStatus: 'not-run' as const,
  }),
  Object.freeze({
    reviewId: 'clone-animation-and-disposal-lifecycle' as const,
    question: 'six-instances-clone-animate-pause-resume-and-destroy-without-resource-leaks' as const,
    evidenceStatus: 'not-run' as const,
  }),
]);

const characterWorkBatch =
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1.workBatches.find(
    ({ batchId }) => batchId === 'a4-playable-character-models',
  );
const materialWorkBatch =
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1.workBatches.find(
    ({ batchId }) => batchId === 'a4-formal-material-textures',
  );
if (
  characterWorkBatch === undefined
  || materialWorkBatch === undefined
  || characterWorkBatch.priority !== 3
  || characterWorkBatch.assetCount !== 1
  || characterWorkBatch.currentAllowedScope
    !== 'contract-source-budget-and-review-preparation-only'
  || characterWorkBatch.productionBlockoutAllowed
  || characterWorkBatch.integrationAllowed
  || characterWorkBatch.finalAllowed
  || characterWorkBatch.assetUsePermitted
) throw new RangeError('Arena V2 A4六角色评审准备必须绑定第三个关闭生产门的共享模型批次。');

const playablePresentationRecords =
  ARENA_V2_FORMAL_CHARACTER_PRESENTATION_RECORDS_CANDIDATE_V1.filter(
    ({ role }) => role === 'playable-character-model',
  );
const sharedModelAssetIds = new Set(
  playablePresentationRecords.map(({ presentation }) => presentation.modelAssetId),
);
if (
  ARENA_V2_SIX_CHARACTER_CATALOG_CANDIDATE_V1.characterCount !== 6
  || ARENA_V2_SIX_CHARACTER_CATALOG_CANDIDATE_V1.entries.length !== 6
  || playablePresentationRecords.length !== 6
  || ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1.length !== 6
  || sharedModelAssetIds.size !== 1
) throw new RangeError('Arena V2 A4角色准备必须精确闭合6个玩法身份与1个共享模型。');

const sharedModelAssetId = [...sharedModelAssetIds][0]!;
const sharedModelAsset =
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.catalogAssets.find(
    ({ assetId }) => assetId === sharedModelAssetId,
  );
const sharedModelApprovalEntry =
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.find(
    ({ assetId }) => assetId === sharedModelAssetId,
  );
const sharedTextureDependency =
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1
    .materialTextureDependencyClosure.find(
      ({ consumerVisualAssetId }) => consumerVisualAssetId === sharedModelAssetId,
    );
if (
  sharedModelAsset === undefined
  || sharedModelApprovalEntry === undefined
  || sharedTextureDependency === undefined
) throw new RangeError('Arena V2 A4六角色缺少共享模型、纹理或批准事实。');
const sharedTextureAsset =
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.catalogAssets.find(
    ({ assetId }) => assetId === sharedTextureDependency.textureAssetId,
  );
const sharedTextureApprovalEntry =
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.find(
    ({ assetId }) => assetId === sharedTextureDependency.textureAssetId,
  );
if (sharedTextureAsset === undefined || sharedTextureApprovalEntry === undefined) {
  throw new RangeError('Arena V2 A4六角色缺少共享外部纹理Catalog或批准事实。');
}

const sharedCollisionHash = createDeterministicDataHash(
  ARENA_V2_SIX_CHARACTER_CATALOG_CANDIDATE_V1.sharedCollision,
  'Arena V2 A4 shared playable character collision',
);
const characterReviewRows = Object.freeze(
  ARENA_V2_SIX_CHARACTER_CATALOG_CANDIDATE_V1.entries.map((entry, index) => {
    const presentationRecord = playablePresentationRecords.find(({ presentation }) => (
      presentation.characterDefinitionId === entry.definition.id
    ));
    const firstScreenIdentity =
      ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1.find(
        ({ characterDefinitionId }) => characterDefinitionId === entry.definition.id,
      );
    if (presentationRecord === undefined || firstScreenIdentity === undefined) {
      throw new RangeError(`Arena V2 A4角色${entry.definition.id}缺少Presentation或首屏身份。`);
    }
    const presentation = presentationRecord.presentation;
    const materialProfile =
      ARENA_V2_FORMAL_CHARACTER_MATERIAL_PROFILES_CANDIDATE_V1.find(
        ({ id }) => id === presentation.materialProfileId,
      );
    if (
      materialProfile === undefined
      || entry.collectionOrder !== index + 1
      || entry.handlingKind !== firstScreenIdentity.handlingKind
      || presentation.id !== firstScreenIdentity.presentationDefinitionId
      || presentation.modelAssetId !== sharedModelAssetId
      || presentation.rigProfileId !== firstScreenIdentity.sharedRigProfileId
      || presentation.materialProfileId !== firstScreenIdentity.materialProfileId
      || materialProfile.valuePattern.id !== firstScreenIdentity.valuePattern.id
      || materialProfile.valuePattern.meshValueMultipliers.length !== 7
      || materialProfile.valuePattern.colorIsNeverSoleSignal !== true
      || createDeterministicDataHash(
        entry.definition.collision,
        'Arena V2 A4 shared playable character collision',
      ) !== sharedCollisionHash
      || Object.keys(presentation.animationMap).length !== ARENA_ANIMATION_SEMANTIC_IDS.length
    ) throw new RangeError(`Arena V2 A4角色${entry.handlingKind}的玩法与表现身份漂移。`);
    return Object.freeze({
      catalogId: entry.catalogId,
      collectionOrder: entry.collectionOrder,
      handlingKind: entry.handlingKind,
      characterDefinitionId: entry.definition.id,
      nameMessageId: entry.nameMessageId,
      handlingSummaryMessageId: entry.handlingSummaryMessageId,
      movementDifferenceMessageId: entry.movementDifferenceMessageId,
      inputContract: ARENA_V2_SIX_CHARACTER_CATALOG_CANDIDATE_V1.inputContract,
      sharedCollisionHash,
      sharedMaximumAirJumps:
        ARENA_V2_SIX_CHARACTER_CATALOG_CANDIDATE_V1.sharedMaximumAirJumps,
      movement: entry.definition.movement,
      jump: entry.definition.jump,
      presentationDefinitionId: presentation.id,
      sharedModelAssetId: presentation.modelAssetId,
      sharedRigProfileId: presentation.rigProfileId,
      materialProfileId: presentation.materialProfileId,
      outlineProfileId: presentation.outlineProfileId,
      direction: presentation.direction,
      handlingShapeAxis: firstScreenIdentity.handlingShapeAxis,
      selectionPose: firstScreenIdentity.selectionPose,
      valuePattern: Object.freeze({
        id: materialProfile.valuePattern.id,
        cue: firstScreenIdentity.valuePattern.cue,
        meshValueMultipliers: materialProfile.valuePattern.meshValueMultipliers,
        colorIsNeverSoleSignal: true as const,
        evidenceStatus: materialProfile.valuePattern.evidenceStatus,
      }),
      bodyTintHex: firstScreenIdentity.bodyTintHex,
      nearMidIdentityCue: firstScreenIdentity.nearMidIdentityCue,
      farIdentityCue: firstScreenIdentity.farIdentityCue,
      animationSemanticBindings: Object.freeze(ARENA_ANIMATION_SEMANTIC_IDS.map((semantic) => {
        const binding = presentation.animationMap[semantic];
        return Object.freeze({
          semantic,
          sourceKind: binding.sourceKind,
          sourceKey: binding.sourceKey,
          loop: binding.loop,
          fallbackSemantics: binding.fallbackSemantics,
        });
      })),
      reviewStatus: 'not-run' as const,
      productionApproved: false as const,
      formalReady: false as const,
    });
  }),
);

const materialProfileIds = characterReviewRows.map(({ materialProfileId }) => materialProfileId);
const valuePatternIds = characterReviewRows.map(({ valuePattern }) => valuePattern.id);
const selectionPoseKeys = characterReviewRows.map(({ selectionPose }) => (
  `${selectionPose.semantic}\u0000${selectionPose.sampleRatio}`
));
if (
  new Set(characterReviewRows.map(({ characterDefinitionId }) => characterDefinitionId)).size !== 6
  || new Set(materialProfileIds).size !== 6
  || new Set(valuePatternIds).size !== 6
  || new Set(selectionPoseKeys).size !== 6
  || characterReviewRows.some((row) => (
    row.inputContract.length !== 3
    || row.inputContract[0] !== 'direction'
    || row.inputContract[1] !== 'jump'
    || row.inputContract[2] !== 'primary-attack'
    || row.animationSemanticBindings.length !== 19
    || row.reviewStatus !== 'not-run'
  ))
) throw new RangeError('Arena V2 A4六角色必须具有六种有序操作/姿态/明暗身份和同一三概念输入。');

if (
  !characterWorkBatch.assetIds.includes(sharedModelAssetId)
  || sharedModelAsset.phaseId !== 'A4'
  || sharedModelAsset.role !== 'playable-character-model'
  || sharedModelAsset.artifactPath !== sharedModelApprovalEntry.artifactPath
  || sharedModelAsset.byteLength !== sharedModelApprovalEntry.byteLength
  || sharedModelAsset.sha256 !== sharedModelApprovalEntry.sha256
  || sharedModelApprovalEntry.productionApprovalStatus !== 'missing-not-approved'
  || sharedModelAsset.productionApproved
  || sharedModelAsset.formalReady
  || sharedModelApprovalEntry.assetUsePermitted
  || sharedModelApprovalEntry.formalReady
  || sharedTextureAsset.role !== 'character-material-texture'
  || !materialWorkBatch.assetIds.includes(sharedTextureAsset.assetId)
  || sharedTextureAsset.artifactPath !== sharedTextureApprovalEntry.artifactPath
  || sharedTextureAsset.byteLength !== sharedTextureApprovalEntry.byteLength
  || sharedTextureAsset.sha256 !== sharedTextureApprovalEntry.sha256
  || sharedTextureApprovalEntry.productionApprovalStatus !== 'missing-not-approved'
  || sharedTextureApprovalEntry.assetUsePermitted
  || sharedTextureApprovalEntry.formalReady
) throw new RangeError('Arena V2 A4六角色共享模型或纹理的资产准备事实漂移。');

const playableCharacterReviewPack = Object.freeze({
  gameplayCharacterCount: 6 as const,
  presentationIdentityCount: 6 as const,
  distinctSharedModelAssetCount: 1 as const,
  distinctProductionApprovedModelAssetCount: 0 as const,
  sharedModelReuseIntentional: true as const,
  sixDistinctModelAssetsRequired: false as const,
  sixDistinctNeutralPoseGeometrySilhouettesClaimed: false as const,
  sharedStaticGeometryCannotProveSixNeutralPoseSilhouettesByItself: true as const,
  roleRecognitionMustNotDependOnColor: true as const,
  roleRecognitionChannelIds: Object.freeze([
    'handling-specific-selection-pose',
    'seven-part-value-pattern',
    'participant-glyph-and-pattern',
    'localized-handling-copy',
  ] as const),
  modelAsset: Object.freeze({
    assetId: sharedModelAsset.assetId,
    artifactPath: sharedModelAsset.artifactPath,
    byteLength: sharedModelAsset.byteLength,
    sha256: sharedModelAsset.sha256,
    maturity: sharedModelAsset.maturity,
    sourceRevision: sharedModelAsset.provenance.sourceRevision,
    licenseId: sharedModelAsset.provenance.licenseId,
    rightsHolder: sharedModelAsset.provenance.rightsHolder,
    proofDocument: sharedModelAsset.provenance.proofDocument,
    sourceApprovalRecorded: sharedModelAsset.provenance.sourceApprovalRecorded,
    v2CandidateBudgetCoverage: sharedModelAsset.v2CandidateBudgetCoverage.status,
    productionApprovalStatus: sharedModelApprovalEntry.productionApprovalStatus,
    productionApproved: false as const,
    formalReady: false as const,
    assetUsePermitted: false as const,
  }),
  externalTextureDependency: Object.freeze({
    bindingId: sharedTextureDependency.bindingId,
    relationship: sharedTextureDependency.relationship,
    gltfImageUri: sharedTextureDependency.gltfImageUri,
    textureAssetId: sharedTextureAsset.assetId,
    artifactPath: sharedTextureAsset.artifactPath,
    byteLength: sharedTextureAsset.byteLength,
    sha256: sharedTextureAsset.sha256,
    workBatchId: materialWorkBatch.batchId,
    productionApprovalStatus: sharedTextureApprovalEntry.productionApprovalStatus,
    productionApproved: false as const,
    formalReady: false as const,
    assetUsePermitted: false as const,
  }),
  sourceIntakeRuntimeClipCount: 18 as const,
  sourceIntakeRuntimeClipCountStatus: 'catalog-and-proof-declared-not-runtime-inspected' as const,
  gameplayReviewDistanceIds: Object.freeze(['d00', 'd05', 'd12'] as const),
  gameplayReviewViewportIds: Object.freeze(['390x844@2x', '1280x720@1x'] as const),
  directionReviewIds: Object.freeze([
    'front', 'back', 'left', 'right', 'front-left', 'front-right',
  ] as const),
  characterReviewRows,
  reviewChecklist: CHARACTER_REVIEW_CHECKLIST,
  reviewStatus: 'not-run' as const,
  productionBlockoutAllowed: false as const,
  integrationAllowed: false as const,
  finalAllowed: false as const,
});

const core = Object.freeze({
  schemaVersion:
    ARENA_V2_A4_PLAYABLE_CHARACTER_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.a4-playable-character-production-review-preparation.candidate.v1' as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  formalReady: false as const,
  grantsApproval: false as const,
  assetUsePermitted: false as const,
  createsOrModifiesAssets: false as const,
  createsReferenceImages: false as const,
  loadsAssets: false as const,
  participatesInGameplayAuthority: false as const,
  changesCharacterCount: false as const,
  changesInputContract: false as const,
  addsCharacterSkills: false as const,
  changesCollisionMovementJumpOrActionTiming: false as const,
  defaultFormalBundleConsumes: false as const,
  defaultPreloaderConsumes: false as const,
  defaultEntryConsumes: false as const,
  workBatchId: characterWorkBatch.batchId,
  workQueueIdentityHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1
      .workQueueIdentityHash,
  readinessIdentityHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.readinessIdentityHash,
  sixCharacterCatalogContentHash: ARENA_V2_SIX_CHARACTER_CATALOG_CANDIDATE_V1.contentHash,
  usedSkillIds: Object.freeze(['character-design-sheet', 'game-art-director'] as const),
  projectReferencePaths: Object.freeze([
    'docs/product/arena-v2-product-brief.md',
    'docs/gameplay/arena-v2-gameplay-framework.md',
    'docs/architecture/arena-art-and-audio-development-flow.md',
    'docs/architecture/arena-art-bible.md',
    'docs/architecture/arena-art-development-alignment-matrix.md',
    'docs/research/arena-kaykit-adventurers-intake.md',
    '.agents/skills/character-design-sheet/SKILL.md',
    '.agents/skills/game-art-director/SKILL.md',
  ] as const),
  currentAllowedScope: 'source-brief-handling-pose-value-pattern-animation-budget-and-review-preparation-only' as const,
  reviewDecisionPolicy: Object.freeze({
    sixGameplayDefinitionsAreNotSixApprovedDistinctModels: true as const,
    sourceIntakeIsNotProductionApproval: true as const,
    sharedModelReuseDoesNotWaiveRoleReadability: true as const,
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
  playableCharacterReviewPack,
  summary: Object.freeze({
    gameplayCharacterCount: characterReviewRows.length,
    presentationIdentityCount: playablePresentationRecords.length,
    sharedModelAssetCount: sharedModelAssetIds.size,
    materialProfileCount: new Set(materialProfileIds).size,
    valuePatternCount: new Set(valuePatternIds).size,
    selectionPoseCount: new Set(selectionPoseKeys).size,
    animationSemanticCountPerCharacter: ARENA_ANIMATION_SEMANTIC_IDS.length,
    reviewChecklistItemCount: CHARACTER_REVIEW_CHECKLIST.length,
    reviewPassCount: 0 as const,
    productionApprovedModelAssetCount: 0 as const,
    productionBlockoutCharacterCount: 0 as const,
    integrationCharacterCount: 0 as const,
    finalCharacterCount: 0 as const,
  }),
});

export const ARENA_V2_A4_PLAYABLE_CHARACTER_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 =
  Object.freeze({
    ...core,
    preparationIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 A4 playable character production review preparation candidate V1',
    ),
  });

export type ArenaV2A4PlayableCharacterProductionReviewPreparationCandidateV1 =
  typeof ARENA_V2_A4_PLAYABLE_CHARACTER_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1;
