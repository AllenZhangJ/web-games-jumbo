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

export const ARENA_V2_A3_A6_PRODUCTION_REVIEW_EVIDENCE_SUBMISSION_CANDIDATE_V1_SCHEMA_VERSION =
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
  'artifactPath',
  'artifactSha256',
  'evidenceSlotId',
  'evidenceKind',
  'evidenceLocator',
  'evidenceSha256',
  'collectorId',
  'capturedAtUtc',
  'environmentIdentity',
  'sampleCount',
  'observedOutcome',
  'notes',
]);

const EVIDENCE_KIND_BY_SLOT = Object.freeze({
  'art-direction-review': 'annotated-capture-set',
  'production-rights-review': 'rights-review-record',
  'approved-structure-budget': 'structure-budget-report',
  'browser-integration-capture': 'browser-capture-set',
  'device-visual-performance': 'device-performance-report',
  'human-readability': 'human-review-report',
  'lifecycle-release': 'lifecycle-release-report',
} as const);

type ProductionEvidenceSlotIdV1 =
  keyof typeof EVIDENCE_KIND_BY_SLOT;
type ProductionEvidenceKindV1 =
  (typeof EVIDENCE_KIND_BY_SLOT)[ProductionEvidenceSlotIdV1];

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

function positiveSafeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new RangeError(`${name}必须是正安全整数。`);
  }
  return value as number;
}

function evidenceSlotId(value: unknown): ProductionEvidenceSlotIdV1 {
  if (typeof value !== 'string' || !Object.hasOwn(EVIDENCE_KIND_BY_SLOT, value)) {
    throw new RangeError('Arena V2生产评审证据槽身份无效。');
  }
  return value as ProductionEvidenceSlotIdV1;
}

function observedOutcome(value: unknown): 'pass' | 'fail' | 'inconclusive' {
  if (value !== 'pass' && value !== 'fail' && value !== 'inconclusive') {
    throw new RangeError('Arena V2生产评审观察结果必须是pass/fail/inconclusive。');
  }
  return value;
}

/**
 * Accepts one immutable evidence reference for later independent evaluation.
 * It never updates the approval ledger and never turns a collector's observed
 * outcome into production approval.
 */
export function createArenaV2A3A6ProductionReviewEvidenceSubmissionCandidateV1(
  value: unknown,
) {
  const source = cloneFrozenData(value, 'Arena V2逐资产生产评审证据提交候选V1');
  assertKnownKeys(source, INPUT_KEYS, 'Arena V2逐资产生产评审证据提交候选V1');
  for (const key of INPUT_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2逐资产生产评审证据提交缺少${key}。`);
    }
  }
  if (
    source.schemaVersion
      !== ARENA_V2_A3_A6_PRODUCTION_REVIEW_EVIDENCE_SUBMISSION_CANDIDATE_V1_SCHEMA_VERSION
    || source.ledgerContentHash
      !== ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.contentHash
    || source.workQueueIdentityHash
      !== ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1
        .workQueueIdentityHash
    || source.reviewProgramIdentityHash
      !== ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1
        .reviewProgramIdentityHash
  ) throw new RangeError('Arena V2生产评审证据提交的Ledger、Queue或Program身份漂移。');

  const batchId = assertNonEmptyString(
    source.batchId,
    'Arena V2生产评审证据提交.batchId',
  );
  const programRow =
    ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1
      .reviewProgramRows.find((row) => row.batchId === batchId);
  const workBatch =
    ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1
      .workBatches.find((batch) => batch.batchId === batchId);
  if (programRow === undefined || workBatch === undefined) {
    throw new RangeError(`Arena V2生产评审证据提交引用未知批次${batchId}。`);
  }
  if (
    source.preparationId !== programRow.preparationId
    || source.preparationIdentityHash !== programRow.preparationIdentityHash
    || programRow.preparationValidationStatus !== 'not-run'
    || programRow.reviewPassCount !== 0
    || programRow.productionBlockoutAllowed
    || programRow.integrationAllowed
    || programRow.finalAllowed
    || programRow.assetUsePermitted
  ) throw new RangeError(`Arena V2生产评审证据提交的${batchId}准备身份或门状态漂移。`);

  const assetId = assertNonEmptyString(
    source.assetId,
    'Arena V2生产评审证据提交.assetId',
  );
  const ledgerEntry =
    ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.find(
      (entry) => entry.assetId === assetId,
    );
  if (
    ledgerEntry === undefined
    || !workBatch.assetIds.includes(assetId)
    || source.artifactPath !== ledgerEntry.artifactPath
    || source.artifactSha256 !== ledgerEntry.sha256
    || ledgerEntry.productionApprovalStatus !== 'missing-not-approved'
    || ledgerEntry.assetUsePermitted
    || ledgerEntry.formalReady
  ) throw new RangeError(`Arena V2生产评审证据提交的资产${assetId}身份、批次或批准事实漂移。`);

  const slotId = evidenceSlotId(source.evidenceSlotId);
  const expectedEvidenceKind = EVIDENCE_KIND_BY_SLOT[slotId];
  if (source.evidenceKind !== expectedEvidenceKind) {
    throw new RangeError(`Arena V2生产评审证据槽${slotId}要求${expectedEvidenceKind}。`);
  }
  const ledgerSlot = ledgerEntry.requiredEvidenceSlots.find(({ slotId: id }) => id === slotId);
  if (
    ledgerSlot === undefined
    || ledgerSlot.status !== 'missing'
    || ledgerSlot.evidenceIdentity !== null
    || ledgerSlot.reviewerId !== null
    || ledgerSlot.reviewedAt !== null
  ) throw new RangeError(`Arena V2生产评审证据槽${assetId}/${slotId}不再是规范缺失状态。`);

  const notes = source.notes === null
    ? null
    : assertNonEmptyString(source.notes, 'Arena V2生产评审证据提交.notes');
  const normalizedEvidence = Object.freeze({
    schemaVersion:
      ARENA_V2_A3_A6_PRODUCTION_REVIEW_EVIDENCE_SUBMISSION_CANDIDATE_V1_SCHEMA_VERSION,
    ledgerContentHash:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.contentHash,
    workQueueIdentityHash:
      ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1
        .workQueueIdentityHash,
    reviewProgramIdentityHash:
      ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1
        .reviewProgramIdentityHash,
    batchId,
    preparationId: programRow.preparationId,
    preparationIdentityHash: programRow.preparationIdentityHash,
    assetId,
    artifactPath: ledgerEntry.artifactPath,
    artifactSha256: ledgerEntry.sha256,
    evidenceSlotId: slotId,
    evidenceKind: source.evidenceKind as ProductionEvidenceKindV1,
    evidenceLocator: assertNonEmptyString(
      source.evidenceLocator,
      'Arena V2生产评审证据提交.evidenceLocator',
    ),
    evidenceSha256: sha256(
      source.evidenceSha256,
      'Arena V2生产评审证据提交.evidenceSha256',
    ),
    collectorId: assertNonEmptyString(
      source.collectorId,
      'Arena V2生产评审证据提交.collectorId',
    ),
    capturedAtUtc: utcTimestamp(
      source.capturedAtUtc,
      'Arena V2生产评审证据提交.capturedAtUtc',
    ),
    environmentIdentity: assertNonEmptyString(
      source.environmentIdentity,
      'Arena V2生产评审证据提交.environmentIdentity',
    ),
    sampleCount: positiveSafeInteger(
      source.sampleCount,
      'Arena V2生产评审证据提交.sampleCount',
    ),
    observedOutcome: observedOutcome(source.observedOutcome),
    notes,
  });
  const evidenceIdentity = createDeterministicDataHash(
    normalizedEvidence,
    'Arena V2 A3-A6 production review evidence submission candidate V1',
  );
  return Object.freeze({
    ...normalizedEvidence,
    evidenceIdentity,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    submissionStatus: 'captured-reference-awaiting-independent-evaluation' as const,
    acceptedForIndependentEvaluation: true as const,
    independentEvaluationCompleted: false as const,
    observedOutcomeDoesNotGrantApproval: true as const,
    ledgerMutationApplied: false as const,
    ledgerSlotStatusAfterSubmission: 'missing' as const,
    productionApprovalStatusAfterSubmission: 'missing-not-approved' as const,
    grantsApproval: false as const,
    hardGate: false as const,
    formalReady: false as const,
    assetUsePermitted: false as const,
    executesEvidenceCapture: false as const,
    readsEvidenceBytes: false as const,
    writesFilesOrLedger: false as const,
    participatesInGameplayAuthority: false as const,
  });
}

export const ARENA_V2_A3_A6_PRODUCTION_REVIEW_EVIDENCE_SUBMISSION_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_A3_A6_PRODUCTION_REVIEW_EVIDENCE_SUBMISSION_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.a3-a6.production-review-evidence-submission.candidate.v1' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    formalReady: false as const,
    grantsApproval: false as const,
    assetUsePermitted: false as const,
    currentAllowedScope: 'plain-data-evidence-reference-validation-and-handoff-only' as const,
    supportedBatchCount:
      ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1
        .summary.workBatchCount,
    supportedAssetCount:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1
        .summary.assetCount,
    supportedEvidenceSlotIds:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_REQUIRED_EVIDENCE_SLOT_IDS_V1,
    evidenceKindBySlot: EVIDENCE_KIND_BY_SLOT,
    inputIsExactKeyPlainData: true as const,
    unknownBatchAssetSlotOrPreparationFailsClosed: true as const,
    artifactPathAndShaMustMatchCurrentLedger: true as const,
    observedOutcomeDoesNotGrantApproval: true as const,
    requiresIndependentEvaluation: true as const,
    mutatesLedger: false as const,
    executesEvidenceCapture: false as const,
    readsEvidenceBytes: false as const,
    writesFilesOrLedger: false as const,
    participatesInGameplayAuthority: false as const,
    defaultFormalBundleConsumes: false as const,
    defaultPreloaderConsumes: false as const,
    defaultEntryConsumes: false as const,
  });

export type ArenaV2A3A6ProductionReviewEvidenceSubmissionCandidateV1 =
  ReturnType<typeof createArenaV2A3A6ProductionReviewEvidenceSubmissionCandidateV1>;
