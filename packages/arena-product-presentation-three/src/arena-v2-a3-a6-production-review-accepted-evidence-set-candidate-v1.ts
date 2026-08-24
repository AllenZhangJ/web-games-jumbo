import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_REQUIRED_EVIDENCE_SLOT_IDS_V1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1,
} from './arena-v2-a3-a6-formal-asset-production-review-program-candidate-v1.js';
import {
  createArenaV2A3A6ProductionReviewEvidenceIndependentEvaluationCandidateV1,
} from './arena-v2-a3-a6-production-review-evidence-independent-evaluation-candidate-v1.js';

export const ARENA_V2_A3_A6_PRODUCTION_REVIEW_ACCEPTED_EVIDENCE_SET_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const INPUT_KEYS = new Set([
  'schemaVersion',
  'ledgerContentHash',
  'workQueueIdentityHash',
  'reviewProgramIdentityHash',
  'batchId',
  'preparationId',
  'preparationIdentityHash',
  'assetId',
  'evaluations',
]);
const EVALUATION_ENTRY_KEYS = new Set(['evaluationInput', 'evaluationIdentity']);

/** Aggregates seven independently accepted evidence evaluations for one
 * current asset. Completeness only makes the set eligible for a later approval
 * decision; it does not update the ledger or approve the asset. */
export function createArenaV2A3A6ProductionReviewAcceptedEvidenceSetCandidateV1(
  value: unknown,
) {
  const source = cloneFrozenData(value, 'Arena V2逐资产七槽接受证据集候选V1');
  assertKnownKeys(source, INPUT_KEYS, 'Arena V2逐资产七槽接受证据集候选V1');
  for (const key of INPUT_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2逐资产七槽接受证据集缺少${key}。`);
    }
  }
  if (
    source.schemaVersion
      !== ARENA_V2_A3_A6_PRODUCTION_REVIEW_ACCEPTED_EVIDENCE_SET_CANDIDATE_V1_SCHEMA_VERSION
    || source.ledgerContentHash
      !== ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.contentHash
    || source.workQueueIdentityHash
      !== ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1
        .workQueueIdentityHash
    || source.reviewProgramIdentityHash
      !== ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1
        .reviewProgramIdentityHash
  ) throw new RangeError('Arena V2七槽证据集的Ledger、Queue或Program身份漂移。');

  const batchId = assertNonEmptyString(source.batchId, 'Arena V2七槽证据集.batchId');
  const preparationId = assertNonEmptyString(
    source.preparationId,
    'Arena V2七槽证据集.preparationId',
  );
  const preparationIdentityHash = assertNonEmptyString(
    source.preparationIdentityHash,
    'Arena V2七槽证据集.preparationIdentityHash',
  );
  const assetId = assertNonEmptyString(source.assetId, 'Arena V2七槽证据集.assetId');
  const programRow =
    ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1
      .reviewProgramRows.find((row) => row.batchId === batchId);
  const workBatch =
    ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1
      .workBatches.find((batch) => batch.batchId === batchId);
  const ledgerEntry =
    ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.find(
      (entry) => entry.assetId === assetId,
    );
  if (
    programRow === undefined
    || workBatch === undefined
    || ledgerEntry === undefined
    || preparationId !== programRow.preparationId
    || preparationIdentityHash !== programRow.preparationIdentityHash
    || !workBatch.assetIds.includes(assetId)
    || ledgerEntry.productionApprovalStatus !== 'missing-not-approved'
    || ledgerEntry.assetUsePermitted
    || ledgerEntry.formalReady
  ) throw new RangeError('Arena V2七槽证据集的Batch、Preparation、Asset或批准事实漂移。');

  if (!Array.isArray(source.evaluations)
    || source.evaluations.length
      !== ARENA_V2_A3_A6_PRODUCTION_APPROVAL_REQUIRED_EVIDENCE_SLOT_IDS_V1.length) {
    throw new RangeError('Arena V2七槽证据集必须精确包含7项Evaluation。');
  }
  const evaluationRows = Object.freeze(source.evaluations.map((raw, index) => {
    assertKnownKeys(raw, EVALUATION_ENTRY_KEYS, `Arena V2七槽证据集.evaluations[${index}]`);
    for (const key of EVALUATION_ENTRY_KEYS) {
      if (!Object.hasOwn(raw, key)) {
        throw new TypeError(`Arena V2七槽证据集.evaluations[${index}]缺少${key}。`);
      }
    }
    const evaluation =
      createArenaV2A3A6ProductionReviewEvidenceIndependentEvaluationCandidateV1(
        raw.evaluationInput,
      );
    const expectedSlotId =
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_REQUIRED_EVIDENCE_SLOT_IDS_V1[index];
    if (
      raw.evaluationIdentity !== evaluation.evaluationIdentity
      || evaluation.evaluationStatus !== 'accepted'
      || evaluation.acceptedEvidenceIdentity !== evaluation.evidenceIdentity
      || !evaluation.independentEvaluationCompleted
      || evaluation.assetId !== assetId
      || evaluation.batchId !== batchId
      || evaluation.preparationId !== preparationId
      || evaluation.preparationIdentityHash !== preparationIdentityHash
      || evaluation.evidenceSlotId !== expectedSlotId
      || evaluation.ledgerMutationApplied
      || evaluation.grantsApproval
      || evaluation.formalReady
      || evaluation.assetUsePermitted
    ) throw new RangeError(`Arena V2七槽证据集第${index + 1}项未按规范顺序闭合接受Evaluation。`);
    return Object.freeze({
      evidenceSlotId: evaluation.evidenceSlotId,
      evidenceKind: evaluation.evidenceKind,
      evidenceIdentity: evaluation.evidenceIdentity,
      evaluationIdentity: evaluation.evaluationIdentity,
      collectorId: evaluation.collectorId,
      reviewerId: evaluation.reviewerId,
      capturedAtUtc: evaluation.capturedAtUtc,
      reviewedAtUtc: evaluation.reviewedAtUtc,
      verificationRecordLocator: evaluation.verificationRecordLocator,
      verificationRecordSha256: evaluation.verificationRecordSha256,
      decision: 'accepted' as const,
    });
  }));

  if (
    new Set(evaluationRows.map(({ evidenceSlotId }) => evidenceSlotId)).size !== 7
    || new Set(evaluationRows.map(({ evidenceIdentity }) => evidenceIdentity)).size !== 7
    || new Set(evaluationRows.map(({ evaluationIdentity }) => evaluationIdentity)).size !== 7
  ) throw new RangeError('Arena V2七槽证据集的Slot、Evidence或Evaluation身份必须唯一。');

  const normalizedEvidenceSet = Object.freeze({
    schemaVersion:
      ARENA_V2_A3_A6_PRODUCTION_REVIEW_ACCEPTED_EVIDENCE_SET_CANDIDATE_V1_SCHEMA_VERSION,
    ledgerContentHash:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.contentHash,
    workQueueIdentityHash:
      ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1
        .workQueueIdentityHash,
    reviewProgramIdentityHash:
      ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1
        .reviewProgramIdentityHash,
    batchId,
    preparationId,
    preparationIdentityHash,
    assetId,
    artifactPath: ledgerEntry.artifactPath,
    artifactSha256: ledgerEntry.sha256,
    sourceApprovalRecorded: ledgerEntry.sourceApprovalRecorded,
    requiredEvidenceSlotIds:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_REQUIRED_EVIDENCE_SLOT_IDS_V1,
    evaluationRows,
  });
  const evidenceSetIdentity = createDeterministicDataHash(
    normalizedEvidenceSet,
    'Arena V2 A3-A6 production review accepted evidence set candidate V1',
  );
  return Object.freeze({
    ...normalizedEvidenceSet,
    evidenceSetIdentity,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    acceptedEvidenceSlotCount: 7 as const,
    completeAcceptedEvidenceSet: true as const,
    eligibleForIndependentProductionApprovalDecision: true as const,
    productionApprovalDecisionStatus: 'pending-not-decided' as const,
    completeEvidenceSetDoesNotGrantApproval: true as const,
    ledgerMutationApplied: false as const,
    ledgerSlotStatusAfterAggregation: 'missing' as const,
    productionApprovalStatusAfterAggregation: 'missing-not-approved' as const,
    grantsApproval: false as const,
    hardGate: false as const,
    formalReady: false as const,
    assetUsePermitted: false as const,
    executesEvidenceCaptureVerificationOrReview: false as const,
    readsEvidenceBytes: false as const,
    writesFilesOrLedger: false as const,
    participatesInGameplayAuthority: false as const,
  });
}

export const ARENA_V2_A3_A6_PRODUCTION_REVIEW_ACCEPTED_EVIDENCE_SET_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_A3_A6_PRODUCTION_REVIEW_ACCEPTED_EVIDENCE_SET_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.a3-a6.production-review-accepted-evidence-set.candidate.v1' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    formalReady: false as const,
    grantsApproval: false as const,
    assetUsePermitted: false as const,
    currentAllowedScope: 'plain-data-seven-slot-accepted-evidence-aggregation-only' as const,
    requiredEvidenceSlotIds:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_REQUIRED_EVIDENCE_SLOT_IDS_V1,
    requiresAllSevenAcceptedEvaluationsInCanonicalOrder: true as const,
    requiresSingleCurrentAssetBatchAndPreparationIdentity: true as const,
    completeEvidenceSetDoesNotGrantApproval: true as const,
    requiresSeparateIndependentProductionApprovalDecision: true as const,
    mutatesLedger: false as const,
    executesEvidenceCaptureVerificationOrReview: false as const,
    readsEvidenceBytes: false as const,
    writesFilesOrLedger: false as const,
    participatesInGameplayAuthority: false as const,
    defaultFormalBundleConsumes: false as const,
    defaultPreloaderConsumes: false as const,
    defaultEntryConsumes: false as const,
  });

export type ArenaV2A3A6ProductionReviewAcceptedEvidenceSetCandidateV1 =
  ReturnType<typeof createArenaV2A3A6ProductionReviewAcceptedEvidenceSetCandidateV1>;
