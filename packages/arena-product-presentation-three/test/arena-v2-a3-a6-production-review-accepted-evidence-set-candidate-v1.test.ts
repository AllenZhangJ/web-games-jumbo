import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1 as PROGRAM,
  ARENA_V2_A3_A6_PRODUCTION_REVIEW_ACCEPTED_EVIDENCE_SET_CANDIDATE_V1 as CONTRACT,
  createArenaV2A3A6ProductionReviewAcceptedEvidenceSetCandidateV1,
  createArenaV2A3A6ProductionReviewEvidenceIndependentEvaluationCandidateV1,
  createArenaV2A3A6ProductionReviewEvidenceSubmissionCandidateV1,
} from '../src/index.js';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1 as QUEUE,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1 as LEDGER,
} from '@number-strategy-jump/arena-product-presentation';

const KIND_BY_SLOT = {
  'art-direction-review': 'annotated-capture-set',
  'production-rights-review': 'rights-review-record',
  'approved-structure-budget': 'structure-budget-report',
  'browser-integration-capture': 'browser-capture-set',
  'device-visual-performance': 'device-performance-report',
  'human-readability': 'human-review-report',
  'lifecycle-release': 'lifecycle-release-report',
} as const;

function input() {
  const row = PROGRAM.reviewProgramRows[0]!;
  const batch = QUEUE.workBatches[0]!;
  const entry = LEDGER.entries.find(({ assetId }) => assetId === batch.assetIds[0])!;
  const evaluations = LEDGER.requiredEvidenceSlotIds.map((slotId, index) => {
    const submissionInput = {
      schemaVersion: 1,
      ledgerContentHash: LEDGER.contentHash,
      workQueueIdentityHash: QUEUE.workQueueIdentityHash,
      reviewProgramIdentityHash: PROGRAM.reviewProgramIdentityHash,
      batchId: row.batchId,
      preparationId: row.preparationId,
      preparationIdentityHash: row.preparationIdentityHash,
      assetId: entry.assetId,
      artifactPath: entry.artifactPath,
      artifactSha256: entry.sha256,
      evidenceSlotId: slotId,
      evidenceKind: KIND_BY_SLOT[slotId as keyof typeof KIND_BY_SLOT],
      evidenceLocator: `evidence://arena-v2/accepted-set/${slotId}`,
      evidenceSha256: (index + 1).toString(16).repeat(64),
      collectorId: `collector-${index + 1}`,
      capturedAtUtc: '2026-08-14T12:00:00.000Z',
      environmentIdentity: `review-environment-${index + 1}`,
      sampleCount: 2,
      observedOutcome: 'pass',
      notes: null,
    };
    const submission =
      createArenaV2A3A6ProductionReviewEvidenceSubmissionCandidateV1(submissionInput);
    const evaluationInput = {
      schemaVersion: 1,
      submissionInput,
      evidenceIdentity: submission.evidenceIdentity,
      verifiedEvidenceSha256: submission.evidenceSha256,
      evidenceBytesShaVerified: true,
      evidenceContentStructureVerified: true,
      environmentIdentityVerified: true,
      verificationRecordLocator: `evidence://arena-v2/evaluation/${slotId}`,
      verificationRecordSha256: (index + 8).toString(16).repeat(64),
      reviewerId: `reviewer-${index + 1}`,
      reviewedAtUtc: '2026-08-14T13:00:00.000Z',
      decision: 'accepted',
      reasonIds: ['identity-content-environment-verified'],
      notes: null,
    };
    const evaluation =
      createArenaV2A3A6ProductionReviewEvidenceIndependentEvaluationCandidateV1(
        evaluationInput,
      );
    return {
      evaluationInput,
      evaluationIdentity: evaluation.evaluationIdentity,
    };
  });
  return {
    schemaVersion: 1,
    ledgerContentHash: LEDGER.contentHash,
    workQueueIdentityHash: QUEUE.workQueueIdentityHash,
    reviewProgramIdentityHash: PROGRAM.reviewProgramIdentityHash,
    batchId: row.batchId,
    preparationId: row.preparationId,
    preparationIdentityHash: row.preparationIdentityHash,
    assetId: entry.assetId,
    evaluations,
  };
}

describe('Arena V2 A3-A6 production review accepted evidence set candidate V1 (not run)', () => {
  it('aggregates exactly seven accepted canonical evaluations without approving', () => {
    const set = createArenaV2A3A6ProductionReviewAcceptedEvidenceSetCandidateV1(input());
    expect(set).toMatchObject({
      acceptedEvidenceSlotCount: 7,
      completeAcceptedEvidenceSet: true,
      eligibleForIndependentProductionApprovalDecision: true,
      productionApprovalDecisionStatus: 'pending-not-decided',
      completeEvidenceSetDoesNotGrantApproval: true,
      ledgerMutationApplied: false,
      ledgerSlotStatusAfterAggregation: 'missing',
      productionApprovalStatusAfterAggregation: 'missing-not-approved',
      grantsApproval: false,
      hardGate: false,
      formalReady: false,
      assetUsePermitted: false,
      executesEvidenceCaptureVerificationOrReview: false,
      readsEvidenceBytes: false,
      writesFilesOrLedger: false,
    });
    expect(set.evaluationRows).toHaveLength(7);
    expect(set.evidenceSetIdentity).toMatch(/^[a-f0-9]{8}$/u);
  });

  it('fails closed on missing duplicate or reordered slots and stale evaluation identity', () => {
    const valid = input();
    expect(() => createArenaV2A3A6ProductionReviewAcceptedEvidenceSetCandidateV1({
      ...valid,
      evaluations: valid.evaluations.slice(0, 6),
    })).toThrow(/精确包含7项/u);
    expect(() => createArenaV2A3A6ProductionReviewAcceptedEvidenceSetCandidateV1({
      ...valid,
      evaluations: [valid.evaluations[1], valid.evaluations[0], ...valid.evaluations.slice(2)],
    })).toThrow(/规范顺序/u);
    expect(() => createArenaV2A3A6ProductionReviewAcceptedEvidenceSetCandidateV1({
      ...valid,
      evaluations: valid.evaluations.map((evaluation, index) => index === 0
        ? { ...evaluation, evaluationIdentity: 'f'.repeat(64) }
        : evaluation),
    })).toThrow(/规范顺序/u);
  });

  it('publishes a non-executing non-approving seven-slot aggregation contract', () => {
    expect(CONTRACT).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      requiresAllSevenAcceptedEvaluationsInCanonicalOrder: true,
      requiresSingleCurrentAssetBatchAndPreparationIdentity: true,
      completeEvidenceSetDoesNotGrantApproval: true,
      requiresSeparateIndependentProductionApprovalDecision: true,
      mutatesLedger: false,
      executesEvidenceCaptureVerificationOrReview: false,
      readsEvidenceBytes: false,
      writesFilesOrLedger: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
    expect(CONTRACT.requiredEvidenceSlotIds).toHaveLength(7);
  });
});
