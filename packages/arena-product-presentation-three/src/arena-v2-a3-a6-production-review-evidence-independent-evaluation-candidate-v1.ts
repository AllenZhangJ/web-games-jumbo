import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_A3_A6_PRODUCTION_REVIEW_EVIDENCE_SUBMISSION_CANDIDATE_V1,
  createArenaV2A3A6ProductionReviewEvidenceSubmissionCandidateV1,
} from './arena-v2-a3-a6-production-review-evidence-submission-candidate-v1.js';

export const ARENA_V2_A3_A6_PRODUCTION_REVIEW_EVIDENCE_INDEPENDENT_EVALUATION_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const INPUT_KEYS = new Set([
  'schemaVersion',
  'submissionInput',
  'evidenceIdentity',
  'verifiedEvidenceSha256',
  'evidenceBytesShaVerified',
  'evidenceContentStructureVerified',
  'environmentIdentityVerified',
  'verificationRecordLocator',
  'verificationRecordSha256',
  'reviewerId',
  'reviewedAtUtc',
  'decision',
  'reasonIds',
  'notes',
]);

const ACCEPT_REASON_ID = 'identity-content-environment-verified' as const;
const REJECTION_REASON_IDS: ReadonlySet<string> = new Set([
  'evidence-sha-mismatch',
  'evidence-content-structure-invalid',
  'environment-identity-mismatch',
  'collector-observation-not-pass',
  'insufficient-samples',
  'independent-review-rejected',
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

function decision(value: unknown): 'accepted' | 'rejected' {
  if (value !== 'accepted' && value !== 'rejected') {
    throw new RangeError('Arena V2独立证据评估decision必须是accepted或rejected。');
  }
  return value;
}

/** Pure-data independent evaluation. It validates a submitted reference and
 * records an evaluation result, but it does not mutate the missing-slot ledger
 * and cannot grant production approval. */
export function createArenaV2A3A6ProductionReviewEvidenceIndependentEvaluationCandidateV1(
  value: unknown,
) {
  const source = cloneFrozenData(value, 'Arena V2生产评审证据独立评估候选V1');
  assertKnownKeys(source, INPUT_KEYS, 'Arena V2生产评审证据独立评估候选V1');
  for (const key of INPUT_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2生产评审证据独立评估缺少${key}。`);
    }
  }
  if (
    source.schemaVersion
      !== ARENA_V2_A3_A6_PRODUCTION_REVIEW_EVIDENCE_INDEPENDENT_EVALUATION_CANDIDATE_V1_SCHEMA_VERSION
  ) throw new RangeError('Arena V2生产评审证据独立评估schemaVersion无效。');

  const submission = createArenaV2A3A6ProductionReviewEvidenceSubmissionCandidateV1(
    source.submissionInput,
  );
  if (
    source.evidenceIdentity !== submission.evidenceIdentity
    || submission.submissionStatus
      !== 'captured-reference-awaiting-independent-evaluation'
    || !submission.acceptedForIndependentEvaluation
    || submission.independentEvaluationCompleted
    || submission.ledgerMutationApplied
    || submission.grantsApproval
    || submission.formalReady
    || submission.assetUsePermitted
  ) throw new RangeError('Arena V2独立评估的提交Identity或关闭门状态漂移。');

  const reviewerId = assertNonEmptyString(
    source.reviewerId,
    'Arena V2独立证据评估.reviewerId',
  );
  if (reviewerId === submission.collectorId) {
    throw new RangeError('Arena V2独立证据评估者不得与证据采集者相同。');
  }
  const reviewedAtUtc = utcTimestamp(
    source.reviewedAtUtc,
    'Arena V2独立证据评估.reviewedAtUtc',
  );
  if (reviewedAtUtc < submission.capturedAtUtc) {
    throw new RangeError('Arena V2独立证据评估时间不得早于证据采集时间。');
  }

  const evaluationDecision = decision(source.decision);
  const evidenceBytesShaVerified = strictBoolean(
    source.evidenceBytesShaVerified,
    'Arena V2独立证据评估.evidenceBytesShaVerified',
  );
  const evidenceContentStructureVerified = strictBoolean(
    source.evidenceContentStructureVerified,
    'Arena V2独立证据评估.evidenceContentStructureVerified',
  );
  const environmentIdentityVerified = strictBoolean(
    source.environmentIdentityVerified,
    'Arena V2独立证据评估.environmentIdentityVerified',
  );
  const verifiedEvidenceSha256 = sha256(
    source.verifiedEvidenceSha256,
    'Arena V2独立证据评估.verifiedEvidenceSha256',
  );
  const reasonIds = cloneFrozenStringSet(
    source.reasonIds as readonly unknown[],
    'Arena V2独立证据评估.reasonIds',
  );

  if (evaluationDecision === 'accepted') {
    if (
      verifiedEvidenceSha256 !== submission.evidenceSha256
      || !evidenceBytesShaVerified
      || !evidenceContentStructureVerified
      || !environmentIdentityVerified
      || submission.observedOutcome !== 'pass'
      || reasonIds.length !== 1
      || reasonIds[0] !== ACCEPT_REASON_ID
    ) throw new RangeError('Arena V2独立证据评估接受必须闭合SHA、结构、环境、采集pass和唯一接受原因。');
  } else {
    if (
      reasonIds.length === 0
      || reasonIds.some((reasonId) => !REJECTION_REASON_IDS.has(reasonId))
      || (!evidenceBytesShaVerified && !reasonIds.includes('evidence-sha-mismatch'))
      || (!evidenceContentStructureVerified
        && !reasonIds.includes('evidence-content-structure-invalid'))
      || (!environmentIdentityVerified
        && !reasonIds.includes('environment-identity-mismatch'))
      || (submission.observedOutcome !== 'pass'
        && !reasonIds.includes('collector-observation-not-pass'))
    ) throw new RangeError('Arena V2独立证据拒绝原因必须覆盖失败事实且只用规范原因。');
  }

  const notes = source.notes === null
    ? null
    : assertNonEmptyString(source.notes, 'Arena V2独立证据评估.notes');
  const normalizedEvaluation = Object.freeze({
    schemaVersion:
      ARENA_V2_A3_A6_PRODUCTION_REVIEW_EVIDENCE_INDEPENDENT_EVALUATION_CANDIDATE_V1_SCHEMA_VERSION,
    evidenceIdentity: submission.evidenceIdentity,
    assetId: submission.assetId,
    batchId: submission.batchId,
    preparationId: submission.preparationId,
    preparationIdentityHash: submission.preparationIdentityHash,
    evidenceSlotId: submission.evidenceSlotId,
    evidenceKind: submission.evidenceKind,
    submittedEvidenceSha256: submission.evidenceSha256,
    verifiedEvidenceSha256,
    evidenceBytesShaVerified,
    evidenceContentStructureVerified,
    environmentIdentity: submission.environmentIdentity,
    environmentIdentityVerified,
    verificationRecordLocator: assertNonEmptyString(
      source.verificationRecordLocator,
      'Arena V2独立证据评估.verificationRecordLocator',
    ),
    verificationRecordSha256: sha256(
      source.verificationRecordSha256,
      'Arena V2独立证据评估.verificationRecordSha256',
    ),
    collectorId: submission.collectorId,
    capturedAtUtc: submission.capturedAtUtc,
    reviewerId,
    reviewedAtUtc,
    decision: evaluationDecision,
    reasonIds,
    notes,
  });
  const evaluationIdentity = createDeterministicDataHash(
    normalizedEvaluation,
    'Arena V2 A3-A6 production review evidence independent evaluation candidate V1',
  );
  return Object.freeze({
    ...normalizedEvaluation,
    evaluationIdentity,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    evaluationStatus: evaluationDecision,
    acceptedEvidenceIdentity: evaluationDecision === 'accepted'
      ? submission.evidenceIdentity
      : null,
    independentEvaluationCompleted: true as const,
    evaluationAcceptanceDoesNotGrantApproval: true as const,
    ledgerMutationApplied: false as const,
    ledgerSlotStatusAfterEvaluation: 'missing' as const,
    productionApprovalStatusAfterEvaluation: 'missing-not-approved' as const,
    grantsApproval: false as const,
    hardGate: false as const,
    formalReady: false as const,
    assetUsePermitted: false as const,
    executesEvidenceCaptureOrVerification: false as const,
    readsEvidenceBytes: false as const,
    writesFilesOrLedger: false as const,
    participatesInGameplayAuthority: false as const,
  });
}

export const ARENA_V2_A3_A6_PRODUCTION_REVIEW_EVIDENCE_INDEPENDENT_EVALUATION_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_A3_A6_PRODUCTION_REVIEW_EVIDENCE_INDEPENDENT_EVALUATION_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.a3-a6.production-review-evidence-independent-evaluation.candidate.v1' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    formalReady: false as const,
    grantsApproval: false as const,
    assetUsePermitted: false as const,
    currentAllowedScope: 'plain-data-independent-evidence-evaluation-handoff-only' as const,
    submissionContractId:
      ARENA_V2_A3_A6_PRODUCTION_REVIEW_EVIDENCE_SUBMISSION_CANDIDATE_V1.id,
    acceptedReasonId: ACCEPT_REASON_ID,
    rejectionReasonIds: Object.freeze([...REJECTION_REASON_IDS].sort()),
    reviewerMustDifferFromCollector: true as const,
    acceptedRequiresMatchingEvidenceSha: true as const,
    acceptedRequiresVerifiedContentAndEnvironment: true as const,
    acceptedRequiresCollectorObservedPass: true as const,
    evaluationAcceptanceDoesNotGrantApproval: true as const,
    mutatesLedger: false as const,
    executesEvidenceCaptureOrVerification: false as const,
    readsEvidenceBytes: false as const,
    writesFilesOrLedger: false as const,
    participatesInGameplayAuthority: false as const,
    defaultFormalBundleConsumes: false as const,
    defaultPreloaderConsumes: false as const,
    defaultEntryConsumes: false as const,
  });

export type ArenaV2A3A6ProductionReviewEvidenceIndependentEvaluationCandidateV1 =
  ReturnType<
  typeof createArenaV2A3A6ProductionReviewEvidenceIndependentEvaluationCandidateV1
  >;
