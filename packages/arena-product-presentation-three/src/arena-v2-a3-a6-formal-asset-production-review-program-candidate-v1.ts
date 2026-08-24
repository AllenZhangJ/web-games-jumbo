import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1,
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_A3_MAP_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
  ARENA_V2_A3_SURVIVAL_ENEMY_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_A4_FORMAL_MATERIAL_TEXTURE_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
} from './arena-v2-a4-formal-material-texture-production-review-preparation-candidate-v1.js';
import {
  ARENA_V2_A4_PLAYABLE_CHARACTER_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
} from './arena-v2-a4-playable-character-production-review-preparation-candidate-v1.js';
import {
  ARENA_V2_A4_WEAPON_ATTACHMENT_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
} from './arena-v2-a4-weapon-attachment-production-review-preparation-candidate-v1.js';
import {
  ARENA_V2_A4_WEAPON_IMPACT_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
} from './arena-v2-a4-weapon-impact-audio-production-review-preparation-candidate-v1.js';
import {
  ARENA_V2_A4_WEAPON_PHASE_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
} from './arena-v2-a4-weapon-phase-audio-production-review-preparation-candidate-v1.js';
import {
  ARENA_V2_A5_CORE_FEEDBACK_VFX_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
} from './arena-v2-a5-core-feedback-vfx-production-review-preparation-candidate-v1.js';
import {
  ARENA_V2_A5_MODE_AND_SUPPLY_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
} from './arena-v2-a5-mode-and-supply-audio-production-review-preparation-candidate-v1.js';

export const ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

interface ProductionReviewPreparationBoundaryCandidateV1 {
  readonly id: string;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly hardGate: false;
  readonly formalReady: false;
  readonly grantsApproval: false;
  readonly assetUsePermitted: false;
  readonly defaultFormalBundleConsumes: false;
  readonly defaultPreloaderConsumes: false;
  readonly defaultEntryConsumes: false;
  readonly workBatchId: string;
  readonly workQueueIdentityHash: string;
  readonly readinessIdentityHash: string;
  readonly preparationIdentityHash: string;
  readonly productionPermission: Readonly<{
    readonly productionBlockoutAllowed: false;
    readonly integrationAllowed: false;
    readonly finalAllowed: false;
    readonly assetUsePermitted: false;
  }>;
}

const REVIEW_PREPARATION_INPUTS = Object.freeze([
  Object.freeze({
    priority: 1 as const,
    preparation: ARENA_V2_A3_MAP_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
    reviewUnitCount: 16 as const,
    reviewUnitBasis: 'two-maps-times-eight-items' as const,
    whileBlockedNextAction: 'refine-two-map-review-capture-script-inputs-without-executing' as const,
    afterPrerequisitesNextAction: 'run-two-map-blockout-route-readability-review' as const,
  }),
  Object.freeze({
    priority: 2 as const,
    preparation: ARENA_V2_A3_SURVIVAL_ENEMY_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
    reviewUnitCount: 9 as const,
    reviewUnitBasis: 'one-enemy-family-times-nine-items' as const,
    whileBlockedNextAction: 'refine-enemy-four-view-density-and-animation-review-inputs-without-executing' as const,
    afterPrerequisitesNextAction: 'run-single-enemy-family-blockout-review' as const,
  }),
  Object.freeze({
    priority: 3 as const,
    preparation: ARENA_V2_A4_PLAYABLE_CHARACTER_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
    reviewUnitCount: 10 as const,
    reviewUnitBasis: 'shared-model-six-identities-ten-items' as const,
    whileBlockedNextAction: 'refine-six-character-pose-value-pattern-review-inputs-without-executing' as const,
    afterPrerequisitesNextAction: 'run-six-character-shared-model-readability-review' as const,
  }),
  Object.freeze({
    priority: 4 as const,
    preparation: ARENA_V2_A4_WEAPON_ATTACHMENT_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
    reviewUnitCount: 10 as const,
    reviewUnitBasis: 'twenty-weapon-rows-ten-shared-gates' as const,
    whileBlockedNextAction: 'refine-twenty-weapon-bounds-grip-ground-and-distance-review-inputs-without-executing' as const,
    afterPrerequisitesNextAction: 'run-twenty-weapon-attachment-blockout-review' as const,
  }),
  Object.freeze({
    priority: 5 as const,
    preparation: ARENA_V2_A4_FORMAL_MATERIAL_TEXTURE_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
    reviewUnitCount: 10 as const,
    reviewUnitBasis: 'three-textures-ten-shared-gates' as const,
    whileBlockedNextAction: 'refine-pbr-color-space-lighting-and-memory-review-inputs-without-executing' as const,
    afterPrerequisitesNextAction: 'run-three-texture-runtime-material-review' as const,
  }),
  Object.freeze({
    priority: 6 as const,
    preparation: ARENA_V2_A4_WEAPON_IMPACT_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
    reviewUnitCount: 10 as const,
    reviewUnitBasis: 'twenty-one-impact-assets-ten-shared-gates' as const,
    whileBlockedNextAction: 'refine-impact-blind-listen-mix-and-device-review-inputs-without-executing' as const,
    afterPrerequisitesNextAction: 'run-weapon-impact-audio-production-review' as const,
  }),
  Object.freeze({
    priority: 7 as const,
    preparation: ARENA_V2_A4_WEAPON_PHASE_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
    reviewUnitCount: 10 as const,
    reviewUnitBasis: 'sixty-phase-assets-ten-shared-gates' as const,
    whileBlockedNextAction: 'refine-phase-hierarchy-masking-restore-and-device-review-inputs-without-executing' as const,
    afterPrerequisitesNextAction: 'run-weapon-phase-audio-production-review' as const,
  }),
  Object.freeze({
    priority: 8 as const,
    preparation: ARENA_V2_A5_CORE_FEEDBACK_VFX_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
    reviewUnitCount: 10 as const,
    reviewUnitBasis: 'five-vfx-textures-ten-shared-gates' as const,
    whileBlockedNextAction: 'refine-grayscale-particle-overdraw-and-lifecycle-review-inputs-without-executing' as const,
    afterPrerequisitesNextAction: 'run-core-feedback-vfx-production-review' as const,
  }),
  Object.freeze({
    priority: 9 as const,
    preparation: ARENA_V2_A5_MODE_AND_SUPPLY_AUDIO_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1,
    reviewUnitCount: 10 as const,
    reviewUnitBasis: 'seventeen-mode-supply-assets-ten-shared-gates' as const,
    whileBlockedNextAction: 'refine-causality-congestion-mute-and-device-review-inputs-without-executing' as const,
    afterPrerequisitesNextAction: 'run-mode-and-supply-audio-production-review' as const,
  }),
]);

function requirePreparationBoundary(
  value: ProductionReviewPreparationBoundaryCandidateV1,
  batchId: string,
): ProductionReviewPreparationBoundaryCandidateV1 {
  if (
    value.status !== 'production-unreachable'
    || value.implementationStatus !== 'code-written-not-run'
    || value.validationStatus !== 'not-run'
    || value.hardGate
    || value.formalReady
    || value.grantsApproval
    || value.assetUsePermitted
    || value.defaultFormalBundleConsumes
    || value.defaultPreloaderConsumes
    || value.defaultEntryConsumes
    || value.workBatchId !== batchId
    || value.workQueueIdentityHash
      !== ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1
        .workQueueIdentityHash
    || value.readinessIdentityHash
      !== ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.readinessIdentityHash
    || value.productionPermission.productionBlockoutAllowed
    || value.productionPermission.integrationAllowed
    || value.productionPermission.finalAllowed
    || value.productionPermission.assetUsePermitted
  ) throw new RangeError(`Arena V2正式资产评审准备${batchId}越过关闭生产门。`);
  return value;
}

const reviewProgramRows = Object.freeze(REVIEW_PREPARATION_INPUTS.map((input, index) => {
  const batch =
    ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1.workBatches[index];
  if (batch === undefined || batch.priority !== input.priority) {
    throw new RangeError(`Arena V2正式资产评审程序优先级${input.priority}缺少工作批次。`);
  }
  const preparation = requirePreparationBoundary(input.preparation, batch.batchId);
  return Object.freeze({
    priority: batch.priority,
    batchId: batch.batchId,
    phaseId: batch.phaseId,
    purpose: batch.purpose,
    preparationId: preparation.id,
    preparationIdentityHash: preparation.preparationIdentityHash,
    preparationCodeWritten: true as const,
    preparationValidationStatus: 'not-run' as const,
    assetCount: batch.assetCount,
    productionApprovalMissingAssetCount: batch.productionApprovalMissingAssetCount,
    missingEvidenceSlotCount: batch.missingEvidenceSlotCount,
    reviewUnitCount: input.reviewUnitCount,
    reviewUnitBasis: input.reviewUnitBasis,
    reviewPassCount: 0 as const,
    sourcePreparationMayContinue: true as const,
    whileBlockedNextAction: input.whileBlockedNextAction,
    afterPrerequisitesNextAction: input.afterPrerequisitesNextAction,
    productionBlockoutAllowed: false as const,
    integrationAllowed: false as const,
    finalAllowed: false as const,
    assetUsePermitted: false as const,
  });
}));

const totalAssetCount = reviewProgramRows.reduce(
  (total, row) => total + row.assetCount,
  0,
);
const totalMissingEvidenceSlotCount = reviewProgramRows.reduce(
  (total, row) => total + row.missingEvidenceSlotCount,
  0,
);
const totalReviewUnitCount = reviewProgramRows.reduce(
  (total, row) => total + row.reviewUnitCount,
  0,
);
if (
  REVIEW_PREPARATION_INPUTS.length !== 9
  || reviewProgramRows.length !== 9
  || new Set(reviewProgramRows.map(({ batchId }) => batchId)).size !== 9
  || new Set(reviewProgramRows.map(({ preparationId }) => preparationId)).size !== 9
  || new Set(reviewProgramRows.map(({ preparationIdentityHash }) => preparationIdentityHash)).size !== 9
  || totalAssetCount !== 130
  || totalAssetCount
    !== ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1.summary.assetCount
  || totalMissingEvidenceSlotCount !== 910
  || totalMissingEvidenceSlotCount
    !== ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1
      .summary.missingEvidenceSlotCount
  || totalReviewUnitCount !== 95
  || reviewProgramRows.some((row) => (
    row.productionApprovalMissingAssetCount !== row.assetCount
    || row.reviewPassCount !== 0
    || row.productionBlockoutAllowed
    || row.integrationAllowed
    || row.finalAllowed
    || row.assetUsePermitted
  ))
) throw new RangeError('Arena V2正式资产评审程序必须闭合九批、130资产、910证据缺口与95评审单元。');

const core = Object.freeze({
  schemaVersion:
    ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.a3-a6.formal-asset-production-review-program.candidate.v1' as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  formalReady: false as const,
  grantsApproval: false as const,
  assetUsePermitted: false as const,
  executesReviews: false as const,
  createsOrModifiesAssets: false as const,
  loadsOrDecodesAssets: false as const,
  rendersOrPlaysAssets: false as const,
  participatesInGameplayAuthority: false as const,
  changesBatchOrderScopeOrBudget: false as const,
  defaultFormalBundleConsumes: false as const,
  defaultPreloaderConsumes: false as const,
  defaultEntryConsumes: false as const,
  workQueueIdentityHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1
      .workQueueIdentityHash,
  readinessIdentityHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.readinessIdentityHash,
  approvalLedgerContentHash:
    ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.contentHash,
  usedSkillIds: Object.freeze([
    'game-art-director',
    'level-design',
    'character-design-sheet',
    'game-3d-assets',
    'threejs-materials-lighting',
    'audio-design',
    'vfx-realtime',
    'particle-systems',
  ] as const),
  currentAllowedScope: 'source-review-program-handoff-and-gap-routing-only' as const,
  blockingPrerequisites:
    ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1
      .blockingPrerequisites,
  executionPolicy: Object.freeze({
    preparationCodeWrittenDoesNotMeanValidated: true as const,
    reviewProgramDoesNotExecuteCommands: true as const,
    batchOrderMustFollowWorkQueue: true as const,
    eachBatchRequiresIndependentApprovalEvidence: true as const,
    failedOrUnavailableReviewMayBeDeferredWithoutChangingStatus: true as const,
    productionCannotStartFromThisProgram: true as const,
  }),
  reviewProgramRows,
  productionPermission: Object.freeze({
    productionBlockoutAllowed: false as const,
    integrationAllowed: false as const,
    finalAllowed: false as const,
    assetUsePermitted: false as const,
  }),
  summary: Object.freeze({
    workBatchCount: reviewProgramRows.length,
    preparationCodeWrittenBatchCount: reviewProgramRows.length,
    preparationValidatedBatchCount: 0 as const,
    assetCount: totalAssetCount,
    productionApprovalMissingAssetCount: totalAssetCount,
    missingEvidenceSlotCount: totalMissingEvidenceSlotCount,
    reviewUnitCount: totalReviewUnitCount,
    reviewPassCount: 0 as const,
    productionBlockoutBatchCount: 0 as const,
    integrationBatchCount: 0 as const,
    finalBatchCount: 0 as const,
  }),
});

export const ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1 =
  Object.freeze({
    ...core,
    reviewProgramIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 A3-A6 formal asset production review program candidate V1',
    ),
  });

export type ArenaV2A3A6FormalAssetProductionReviewProgramCandidateV1 =
  typeof ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1;
