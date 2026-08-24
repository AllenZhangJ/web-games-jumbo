import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1,
} from './arena-v2-a3-a6-formal-asset-readiness-candidate-v1.js';
import {
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY,
} from './arena-v2-a3-a6-production-approval-evidence-ledger-candidate-v1.js';

export const ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const WORK_BATCH_DEFINITIONS = Object.freeze([
  Object.freeze({
    priority: 1 as const,
    batchId: 'a3-map-models' as const,
    phaseId: 'A3' as const,
    roleKeys: Object.freeze(['A3\u0000map-model'] as const),
    purpose: 'kz-route-readability-and-environment-source-preparation' as const,
  }),
  Object.freeze({
    priority: 2 as const,
    batchId: 'a3-survival-enemy-model' as const,
    phaseId: 'A3' as const,
    roleKeys: Object.freeze(['A3\u0000survival-enemy-model'] as const),
    purpose: 'single-enemy-family-silhouette-and-source-preparation' as const,
  }),
  Object.freeze({
    priority: 3 as const,
    batchId: 'a4-playable-character-models' as const,
    phaseId: 'A4' as const,
    roleKeys: Object.freeze(['A4\u0000playable-character-model'] as const),
    purpose: 'playable-character-silhouette-and-animation-review-preparation' as const,
  }),
  Object.freeze({
    priority: 4 as const,
    batchId: 'a4-weapon-attachment-models' as const,
    phaseId: 'A4' as const,
    roleKeys: Object.freeze(['A4\u0000weapon-attachment-model'] as const),
    purpose: 'weapon-silhouette-grip-and-action-readability-preparation' as const,
  }),
  Object.freeze({
    priority: 5 as const,
    batchId: 'a4-formal-material-textures' as const,
    phaseId: 'A4' as const,
    roleKeys: Object.freeze([
      'A4\u0000attachment-material-texture',
      'A4\u0000character-material-texture',
    ] as const),
    purpose: 'shared-material-color-space-and-budget-review-preparation' as const,
  }),
  Object.freeze({
    priority: 6 as const,
    batchId: 'a4-weapon-impact-audio' as const,
    phaseId: 'A4' as const,
    roleKeys: Object.freeze(['A4\u0000weapon-impact-audio'] as const),
    purpose: 'weapon-impact-identity-and-mix-review-preparation' as const,
  }),
  Object.freeze({
    priority: 7 as const,
    batchId: 'a4-weapon-phase-audio' as const,
    phaseId: 'A4' as const,
    roleKeys: Object.freeze(['A4\u0000weapon-phase-audio'] as const),
    purpose: 'weapon-windup-release-recovery-audio-review-preparation' as const,
  }),
  Object.freeze({
    priority: 8 as const,
    batchId: 'a5-core-feedback-vfx-textures' as const,
    phaseId: 'A5' as const,
    roleKeys: Object.freeze(['A5\u0000core-feedback-vfx-texture'] as const),
    purpose: 'five-feedback-shape-timing-color-review-preparation' as const,
  }),
  Object.freeze({
    priority: 9 as const,
    batchId: 'a5-mode-and-supply-audio' as const,
    phaseId: 'A5' as const,
    roleKeys: Object.freeze(['A5\u0000mode-or-supply-audio'] as const),
    purpose: 'mode-supply-causality-and-mix-review-preparation' as const,
  }),
]);

const APPROVAL_ENTRY_BY_ASSET_ID = new Map(
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.map((entry) => (
    [entry.assetId, entry] as const
  )),
);

if (
  APPROVAL_ENTRY_BY_ASSET_ID.size
  !== ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.summary.assetCount
) throw new RangeError('Arena V2正式资产准备队列的批准账本assetId不唯一。');

const assignedAssetIds = new Set<string>();
const WORK_BATCHES = Object.freeze(WORK_BATCH_DEFINITIONS.map((definition) => {
  const roleKeys = new Set<string>(definition.roleKeys);
  const assets = ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.catalogAssets
    .filter((asset) => roleKeys.has(`${asset.phaseId}\u0000${asset.role}`));
  if (assets.length === 0) {
    throw new RangeError(`Arena V2正式资产准备批次${definition.batchId}不能为空。`);
  }
  let sourceApprovalRecordedAssetCount = 0;
  let verifiedIntakeOnlyAssetCount = 0;
  let authoredCandidateAssetCount = 0;
  for (const asset of assets) {
    if (assignedAssetIds.has(asset.assetId)) {
      throw new RangeError(`Arena V2正式资产准备队列重复分配${asset.assetId}。`);
    }
    assignedAssetIds.add(asset.assetId);
    const approvalEntry = APPROVAL_ENTRY_BY_ASSET_ID.get(asset.assetId);
    if (
      approvalEntry === undefined
      || approvalEntry.artifactPath !== asset.artifactPath
      || approvalEntry.byteLength !== asset.byteLength
      || approvalEntry.sha256 !== asset.sha256
      || approvalEntry.productionApprovalStatus !== 'missing-not-approved'
      || approvalEntry.assetUsePermitted
      || approvalEntry.formalReady
      || approvalEntry.requiredEvidenceSlots.some(({ status }) => status !== 'missing')
    ) throw new RangeError(`Arena V2正式资产准备队列批准事实漂移：${asset.assetId}。`);
    if (asset.provenance.sourceApprovalRecorded) sourceApprovalRecordedAssetCount += 1;
    if (asset.maturity === 'verified-intake-only') verifiedIntakeOnlyAssetCount += 1;
    else authoredCandidateAssetCount += 1;
  }
  const assetIds = Object.freeze(assets.map(({ assetId }) => assetId));
  return Object.freeze({
    priority: definition.priority,
    batchId: definition.batchId,
    phaseId: definition.phaseId,
    purpose: definition.purpose,
    currentAllowedScope: 'contract-source-budget-and-review-preparation-only' as const,
    assetIds,
    assetCount: assetIds.length,
    sourceApprovalRecordedAssetCount,
    verifiedIntakeOnlyAssetCount,
    authoredCandidateAssetCount,
    productionApprovalMissingAssetCount: assetIds.length,
    missingEvidenceSlotCount:
      assetIds.length
      * ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1
        .summary.requiredEvidenceSlotCountPerAsset,
    requiredEvidenceSlotIds:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1
        .requiredEvidenceSlotIds,
    productionBlockoutAllowed: false as const,
    integrationAllowed: false as const,
    finalAllowed: false as const,
    assetUsePermitted: false as const,
  });
}));

if (
  assignedAssetIds.size
    !== ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.catalogAssets.length
  || assignedAssetIds.size
    !== ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1
      .summary.assetCount
) throw new RangeError('Arena V2正式资产准备队列必须精确覆盖当前130项Catalog。');

const core = Object.freeze({
  schemaVersion:
    ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.a3-a6.formal-asset-production-work-queue.candidate.v1' as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  formalReady: false as const,
  grantsApproval: false as const,
  assetUsePermitted: false as const,
  createsOrModifiesAssets: false as const,
  loadsAssets: false as const,
  participatesInGameplayAuthority: false as const,
  defaultFormalBundleConsumes: false as const,
  defaultPreloaderConsumes: false as const,
  defaultEntryConsumes: false as const,
  catalogContentHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.currentCatalogContentHash,
  readinessIdentityHash:
    ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.readinessIdentityHash,
  approvalLedgerIdentity:
    ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY,
  usedSkillIds: Object.freeze(['game-art-director'] as const),
  projectReferencePaths: Object.freeze([
    'docs/architecture/arena-art-and-audio-development-flow.md',
    'docs/architecture/arena-art-bible.md',
    'docs/architecture/arena-art-development-alignment-matrix.md',
    '.agents/skills/game-art-director/SKILL.md',
  ] as const),
  currentPreparationPolicy: Object.freeze({
    allowedScope: 'contract-source-budget-and-review-preparation-only' as const,
    nextPreparationBatchId: WORK_BATCHES[0]!.batchId,
    unblockedProductionBatchIds: Object.freeze([] as readonly string[]),
    productionBlockoutAllowed: false as const,
    integrationAllowed: false as const,
    finalAllowed: false as const,
  }),
  blockingPrerequisites: Object.freeze([
    Object.freeze({
      prerequisiteId: 'A0.3-current-source-human-silhouette' as const,
      status: 'incomplete-pending-regeneration-and-human-0-of-10' as const,
      blocks: 'production-blockout' as const,
    }),
    Object.freeze({
      prerequisiteId: 'A1.1-current-source-readiness' as const,
      status: 'pending-current-source-regeneration' as const,
      blocks: 'production-blockout' as const,
    }),
    Object.freeze({
      prerequisiteId: 'a3-a6-per-asset-production-approval' as const,
      status: 'missing-not-approved-130-of-130' as const,
      blocks: 'asset-use-integration-and-final' as const,
    }),
  ]),
  workBatches: WORK_BATCHES,
  summary: Object.freeze({
    batchCount: WORK_BATCHES.length,
    assetCount: assignedAssetIds.size,
    preparationBatchCount: WORK_BATCHES.length,
    productionBlockoutBatchCount: 0 as const,
    integrationBatchCount: 0 as const,
    finalBatchCount: 0 as const,
    productionApprovalMissingAssetCount:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1
        .summary.productionApprovalMissingAssetCount,
    missingEvidenceSlotCount:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1
        .summary.missingEvidenceSlotCount,
  }),
});

export const ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1 =
  Object.freeze({
    ...core,
    workQueueIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 A3-A6 formal asset production work queue candidate V1',
    ),
  });

export type ArenaV2A3A6FormalAssetProductionWorkQueueCandidateV1 =
  typeof ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1;
