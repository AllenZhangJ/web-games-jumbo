import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV2A3A6ProductionReviewAcceptedEvidenceSetCandidateV1,
} from './arena-v2-a3-a6-production-review-accepted-evidence-set-candidate-v1.js';

export const ARENA_V2_A3_A6_PRODUCTION_APPROVAL_DECISION_RECORD_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const INPUT_KEYS = new Set([
  'schemaVersion',
  'evidenceSetInput',
  'evidenceSetIdentity',
  'approverId',
  'decidedAtUtc',
  'decision',
  'sourceAndRightsClosureVerified',
  'budgetIdentityVerified',
  'dependencyClosureVerified',
  'approvalRecordLocator',
  'approvalRecordSha256',
  'reasonIds',
  'notes',
]);

const APPROVAL_REASON_ID = 'seven-slot-current-identity-independent-approval' as const;
const REJECTION_REASON_IDS: ReadonlySet<string> = new Set([
  'source-or-rights-closure-rejected',
  'budget-identity-rejected',
  'dependency-closure-rejected',
  'independent-approver-rejected',
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

function sha256(value: unknown, name: string): string {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    throw new RangeError(`${name}必须是小写64位SHA-256。`);
  }
  return value;
}

function utcTimestamp(value: unknown, name: string): string {
  if (typeof value !== 'string' || !UTC_TIMESTAMP_PATTERN.test(value)) {
    throw new RangeError(`${name}必须是毫秒精度UTC ISO时间。`);
  }
  return value;
}

function strictBoolean(value: unknown, name: string): boolean {
  if (value !== true && value !== false) throw new TypeError(`${name}必须是boolean。`);
  return value;
}

function decision(value: unknown): 'approved' | 'rejected' {
  if (value !== 'approved' && value !== 'rejected') {
    throw new RangeError('Arena V2生产批准decision必须是approved或rejected。');
  }
  return value;
}

/** Records an independent decision over a complete seven-slot evidence set.
 * Even an approved record remains a proposal for a future immutable ledger
 * version; this function never mutates the current missing ledger. */
export function createArenaV2A3A6ProductionApprovalDecisionRecordCandidateV1(
  value: unknown,
) {
  const source = cloneFrozenData(value, 'Arena V2逐资产生产批准决策记录候选V1');
  assertKnownKeys(source, INPUT_KEYS, 'Arena V2逐资产生产批准决策记录候选V1');
  for (const key of INPUT_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2逐资产生产批准决策记录缺少${key}。`);
    }
  }
  if (
    source.schemaVersion
      !== ARENA_V2_A3_A6_PRODUCTION_APPROVAL_DECISION_RECORD_CANDIDATE_V1_SCHEMA_VERSION
  ) throw new RangeError('Arena V2逐资产生产批准决策记录schemaVersion无效。');

  const evidenceSet = createArenaV2A3A6ProductionReviewAcceptedEvidenceSetCandidateV1(
    source.evidenceSetInput,
  );
  if (
    source.evidenceSetIdentity !== evidenceSet.evidenceSetIdentity
    || !evidenceSet.completeAcceptedEvidenceSet
    || !evidenceSet.eligibleForIndependentProductionApprovalDecision
    || evidenceSet.productionApprovalDecisionStatus !== 'pending-not-decided'
    || evidenceSet.ledgerMutationApplied
    || evidenceSet.grantsApproval
    || evidenceSet.formalReady
    || evidenceSet.assetUsePermitted
  ) throw new RangeError('Arena V2生产批准决策的Evidence Set身份或关闭门状态漂移。');

  const approverId = assertNonEmptyString(
    source.approverId,
    'Arena V2生产批准决策.approverId',
  );
  const priorActorIds = new Set(evidenceSet.evaluationRows.flatMap((row) => (
    [row.collectorId, row.reviewerId]
  )));
  if (priorActorIds.has(approverId)) {
    throw new RangeError('Arena V2生产批准人不得兼任当前Evidence Set的采集者或评估者。');
  }
  const decidedAtUtc = utcTimestamp(
    source.decidedAtUtc,
    'Arena V2生产批准决策.decidedAtUtc',
  );
  const latestReviewedAtUtc = evidenceSet.evaluationRows.reduce(
    (latest, row) => row.reviewedAtUtc > latest ? row.reviewedAtUtc : latest,
    evidenceSet.evaluationRows[0]!.reviewedAtUtc,
  );
  if (decidedAtUtc < latestReviewedAtUtc) {
    throw new RangeError('Arena V2生产批准决策时间不得早于任何独立评估时间。');
  }

  const approvalDecision = decision(source.decision);
  const sourceAndRightsClosureVerified = strictBoolean(
    source.sourceAndRightsClosureVerified,
    'Arena V2生产批准决策.sourceAndRightsClosureVerified',
  );
  const budgetIdentityVerified = strictBoolean(
    source.budgetIdentityVerified,
    'Arena V2生产批准决策.budgetIdentityVerified',
  );
  const dependencyClosureVerified = strictBoolean(
    source.dependencyClosureVerified,
    'Arena V2生产批准决策.dependencyClosureVerified',
  );
  const reasonIds = cloneFrozenStringSet(
    source.reasonIds as readonly unknown[],
    'Arena V2生产批准决策.reasonIds',
  );
  if (approvalDecision === 'approved') {
    if (
      !sourceAndRightsClosureVerified
      || !budgetIdentityVerified
      || !dependencyClosureVerified
      || reasonIds.length !== 1
      || reasonIds[0] !== APPROVAL_REASON_ID
    ) throw new RangeError('Arena V2生产批准接受必须闭合来源权利、预算、依赖及唯一批准原因。');
  } else if (
    reasonIds.length === 0
    || reasonIds.some((reasonId) => !REJECTION_REASON_IDS.has(reasonId))
    || (!sourceAndRightsClosureVerified
      && !reasonIds.includes('source-or-rights-closure-rejected'))
    || (!budgetIdentityVerified && !reasonIds.includes('budget-identity-rejected'))
    || (!dependencyClosureVerified && !reasonIds.includes('dependency-closure-rejected'))
  ) throw new RangeError('Arena V2生产批准拒绝原因必须覆盖失败事实且只用规范原因。');

  const notes = source.notes === null
    ? null
    : assertNonEmptyString(source.notes, 'Arena V2生产批准决策.notes');
  const normalizedDecision = Object.freeze({
    schemaVersion:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_DECISION_RECORD_CANDIDATE_V1_SCHEMA_VERSION,
    evidenceSetIdentity: evidenceSet.evidenceSetIdentity,
    ledgerContentHash: evidenceSet.ledgerContentHash,
    workQueueIdentityHash: evidenceSet.workQueueIdentityHash,
    reviewProgramIdentityHash: evidenceSet.reviewProgramIdentityHash,
    assetId: evidenceSet.assetId,
    artifactPath: evidenceSet.artifactPath,
    artifactSha256: evidenceSet.artifactSha256,
    batchId: evidenceSet.batchId,
    preparationId: evidenceSet.preparationId,
    preparationIdentityHash: evidenceSet.preparationIdentityHash,
    acceptedEvidenceSlotCount: evidenceSet.acceptedEvidenceSlotCount,
    sourceApprovalRecordedBeforeDecision: evidenceSet.sourceApprovalRecorded,
    sourceAndRightsClosureVerified,
    budgetIdentityVerified,
    dependencyClosureVerified,
    approverId,
    decidedAtUtc,
    decision: approvalDecision,
    approvalRecordLocator: assertNonEmptyString(
      source.approvalRecordLocator,
      'Arena V2生产批准决策.approvalRecordLocator',
    ),
    approvalRecordSha256: sha256(
      source.approvalRecordSha256,
      'Arena V2生产批准决策.approvalRecordSha256',
    ),
    reasonIds,
    notes,
  });
  const approvalDecisionIdentity = createDeterministicDataHash(
    normalizedDecision,
    'Arena V2 A3-A6 production approval decision record candidate V1',
  );
  return Object.freeze({
    ...normalizedDecision,
    approvalDecisionIdentity,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    decisionStatus: approvalDecision,
    eligibleForNewImmutableLedgerAssembly: approvalDecision === 'approved',
    decisionRecordDoesNotMutateCurrentLedger: true as const,
    ledgerMutationApplied: false as const,
    currentLedgerProductionApprovalStatus: 'missing-not-approved' as const,
    currentLedgerAssetUsePermitted: false as const,
    grantsApprovalForCurrentLedger: false as const,
    grantsApproval: false as const,
    hardGate: false as const,
    formalReady: false as const,
    assetUsePermitted: false as const,
    executesEvidenceOrApprovalWork: false as const,
    readsEvidenceBytes: false as const,
    writesFilesOrLedger: false as const,
    participatesInGameplayAuthority: false as const,
  });
}

export const ARENA_V2_A3_A6_PRODUCTION_APPROVAL_DECISION_RECORD_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_DECISION_RECORD_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.a3-a6.production-approval-decision-record.candidate.v1' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    formalReady: false as const,
    grantsApproval: false as const,
    assetUsePermitted: false as const,
    currentAllowedScope: 'plain-data-independent-production-approval-decision-record-only' as const,
    approvalReasonId: APPROVAL_REASON_ID,
    rejectionReasonIds: Object.freeze([...REJECTION_REASON_IDS].sort()),
    requiresCompleteSevenSlotAcceptedEvidenceSet: true as const,
    approverMustDifferFromCollectorsAndReviewers: true as const,
    approvedRequiresSourceRightsBudgetAndDependencyClosure: true as const,
    approvedDecisionOnlyFeedsNewImmutableLedgerAssembly: true as const,
    decisionRecordDoesNotMutateCurrentLedger: true as const,
    mutatesLedger: false as const,
    executesEvidenceOrApprovalWork: false as const,
    readsEvidenceBytes: false as const,
    writesFilesOrLedger: false as const,
    participatesInGameplayAuthority: false as const,
    defaultFormalBundleConsumes: false as const,
    defaultPreloaderConsumes: false as const,
    defaultEntryConsumes: false as const,
  });

export type ArenaV2A3A6ProductionApprovalDecisionRecordCandidateV1 =
  ReturnType<typeof createArenaV2A3A6ProductionApprovalDecisionRecordCandidateV1>;
