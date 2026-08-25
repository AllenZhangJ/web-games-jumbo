import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1 as PROGRAM,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_DECISION_RECORD_CANDIDATE_V1 as CONTRACT,
  createArenaV2A3A6ProductionApprovalDecisionRecordCandidateV1,
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

function evidenceSetInput() {
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
      evidenceLocator: `evidence://arena-v2/approval/${slotId}`,
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
      verificationRecordLocator: `evidence://arena-v2/approval-evaluation/${slotId}`,
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
    return { evaluationInput, evaluationIdentity: evaluation.evaluationIdentity };
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

function approvedInput() {
  const setInput = evidenceSetInput();
  const set = createArenaV2A3A6ProductionReviewAcceptedEvidenceSetCandidateV1(setInput);
  return {
    schemaVersion: 1,
    evidenceSetInput: setInput,
    evidenceSetIdentity: set.evidenceSetIdentity,
    approverId: 'production-approver-001',
    decidedAtUtc: '2026-08-14T14:00:00.000Z',
    decision: 'approved',
    sourceAndRightsClosureVerified: true,
    budgetIdentityVerified: true,
    dependencyClosureVerified: true,
    approvalRecordLocator: 'evidence://arena-v2/approval-decision/record-001',
    approvalRecordSha256: 'f'.repeat(64),
    reasonIds: ['seven-slot-current-identity-independent-approval'],
    notes: null,
  };
}

describe('Arena V2 A3-A6 production approval decision record candidate V1 (not run)', () => {
  it('records an approved decision for future ledger assembly without mutating current approval', () => {
    const record = createArenaV2A3A6ProductionApprovalDecisionRecordCandidateV1(
      approvedInput(),
    );
    expect(record).toMatchObject({
      decisionStatus: 'approved',
      acceptedEvidenceSlotCount: 7,
      eligibleForNewImmutableLedgerAssembly: true,
      decisionRecordDoesNotMutateCurrentLedger: true,
      ledgerMutationApplied: false,
      currentLedgerProductionApprovalStatus: 'missing-not-approved',
      currentLedgerAssetUsePermitted: false,
      grantsApprovalForCurrentLedger: false,
      grantsApproval: false,
      hardGate: false,
      formalReady: false,
      assetUsePermitted: false,
      executesEvidenceOrApprovalWork: false,
      readsEvidenceBytes: false,
      writesFilesOrLedger: false,
    });
    expect(record.approvalDecisionIdentity).toMatch(/^[a-f0-9]{8}$/u);
  });

  it('rejects actor overlap stale evidence set and incomplete approval closure', () => {
    expect(() => createArenaV2A3A6ProductionApprovalDecisionRecordCandidateV1({
      ...approvedInput(),
      approverId: 'reviewer-1',
    })).toThrow(/不得兼任/u);
    expect(() => createArenaV2A3A6ProductionApprovalDecisionRecordCandidateV1({
      ...approvedInput(),
      evidenceSetIdentity: 'e'.repeat(64),
    })).toThrow(/Evidence Set身份/u);
    expect(() => createArenaV2A3A6ProductionApprovalDecisionRecordCandidateV1({
      ...approvedInput(),
      dependencyClosureVerified: false,
    })).toThrow(/接受必须闭合/u);
  });

  it('records rejection with covering canonical reasons and no approval', () => {
    const record = createArenaV2A3A6ProductionApprovalDecisionRecordCandidateV1({
      ...approvedInput(),
      decision: 'rejected',
      sourceAndRightsClosureVerified: false,
      budgetIdentityVerified: true,
      dependencyClosureVerified: false,
      reasonIds: [
        'dependency-closure-rejected',
        'source-or-rights-closure-rejected',
      ],
    });
    expect(record.decisionStatus).toBe('rejected');
    expect(record.eligibleForNewImmutableLedgerAssembly).toBe(false);
    expect(record.grantsApproval).toBe(false);
  });

  it('publishes a non-mutating independent decision contract', () => {
    expect(CONTRACT).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      requiresCompleteSevenSlotAcceptedEvidenceSet: true,
      approverMustDifferFromCollectorsAndReviewers: true,
      approvedRequiresSourceRightsBudgetAndDependencyClosure: true,
      approvedDecisionOnlyFeedsNewImmutableLedgerAssembly: true,
      decisionRecordDoesNotMutateCurrentLedger: true,
      mutatesLedger: false,
      executesEvidenceOrApprovalWork: false,
      readsEvidenceBytes: false,
      writesFilesOrLedger: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
  });
});
