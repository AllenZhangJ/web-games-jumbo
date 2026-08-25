import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1 as PROGRAM,
  ARENA_V2_A3_A6_PRODUCTION_REVIEW_EVIDENCE_INDEPENDENT_EVALUATION_CANDIDATE_V1 as CONTRACT,
  createArenaV2A3A6ProductionReviewEvidenceIndependentEvaluationCandidateV1,
  createArenaV2A3A6ProductionReviewEvidenceSubmissionCandidateV1,
} from '../src/index.js';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1 as QUEUE,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1 as LEDGER,
} from '@number-strategy-jump/arena-product-presentation';

function submissionInput(observedOutcome: 'pass' | 'fail' | 'inconclusive' = 'pass') {
  const row = PROGRAM.reviewProgramRows[0]!;
  const batch = QUEUE.workBatches[0]!;
  const entry = LEDGER.entries.find(({ assetId }) => assetId === batch.assetIds[0])!;
  return {
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
    evidenceSlotId: 'art-direction-review',
    evidenceKind: 'annotated-capture-set',
    evidenceLocator: 'evidence://arena-v2/a3-map/art-direction/review-001',
    evidenceSha256: 'a'.repeat(64),
    collectorId: 'collector-001',
    capturedAtUtc: '2026-08-14T12:00:00.000Z',
    environmentIdentity: 'desktop-browser-review-environment-001',
    sampleCount: 2,
    observedOutcome,
    notes: null,
  };
}

function acceptedEvaluationInput() {
  const input = submissionInput();
  const submission = createArenaV2A3A6ProductionReviewEvidenceSubmissionCandidateV1(input);
  return {
    schemaVersion: 1,
    submissionInput: input,
    evidenceIdentity: submission.evidenceIdentity,
    verifiedEvidenceSha256: submission.evidenceSha256,
    evidenceBytesShaVerified: true,
    evidenceContentStructureVerified: true,
    environmentIdentityVerified: true,
    verificationRecordLocator: 'evidence://arena-v2/evaluation/review-001',
    verificationRecordSha256: 'b'.repeat(64),
    reviewerId: 'reviewer-002',
    reviewedAtUtc: '2026-08-14T13:00:00.000Z',
    decision: 'accepted',
    reasonIds: ['identity-content-environment-verified'],
    notes: 'independently accepted candidate evidence',
  };
}

describe('Arena V2 A3-A6 production review evidence independent evaluation candidate V1 (not run)', () => {
  it('accepts identity-closed evidence without mutating or approving', () => {
    const evaluation =
      createArenaV2A3A6ProductionReviewEvidenceIndependentEvaluationCandidateV1(
        acceptedEvaluationInput(),
      );
    expect(evaluation).toMatchObject({
      evaluationStatus: 'accepted',
      independentEvaluationCompleted: true,
      evaluationAcceptanceDoesNotGrantApproval: true,
      ledgerMutationApplied: false,
      ledgerSlotStatusAfterEvaluation: 'missing',
      productionApprovalStatusAfterEvaluation: 'missing-not-approved',
      grantsApproval: false,
      hardGate: false,
      formalReady: false,
      assetUsePermitted: false,
      executesEvidenceCaptureOrVerification: false,
      readsEvidenceBytes: false,
      writesFilesOrLedger: false,
    });
    expect(evaluation.acceptedEvidenceIdentity).toBe(evaluation.evidenceIdentity);
    expect(evaluation.evaluationIdentity).toMatch(/^[a-f0-9]{8}$/u);
  });

  it('rejects collector self-review, stale evidence identity and premature acceptance', () => {
    expect(() => createArenaV2A3A6ProductionReviewEvidenceIndependentEvaluationCandidateV1({
      ...acceptedEvaluationInput(),
      reviewerId: 'collector-001',
    })).toThrow(/不得与证据采集者相同/u);
    expect(() => createArenaV2A3A6ProductionReviewEvidenceIndependentEvaluationCandidateV1({
      ...acceptedEvaluationInput(),
      evidenceIdentity: 'c'.repeat(64),
    })).toThrow(/提交Identity/u);
    expect(() => createArenaV2A3A6ProductionReviewEvidenceIndependentEvaluationCandidateV1({
      ...acceptedEvaluationInput(),
      evidenceBytesShaVerified: false,
    })).toThrow(/接受必须闭合/u);
  });

  it('records a normalized rejection only when reasons cover failed facts', () => {
    const input = submissionInput('inconclusive');
    const submission = createArenaV2A3A6ProductionReviewEvidenceSubmissionCandidateV1(input);
    const evaluation =
      createArenaV2A3A6ProductionReviewEvidenceIndependentEvaluationCandidateV1({
        ...acceptedEvaluationInput(),
        submissionInput: input,
        evidenceIdentity: submission.evidenceIdentity,
        evidenceBytesShaVerified: false,
        evidenceContentStructureVerified: false,
        environmentIdentityVerified: true,
        decision: 'rejected',
        reasonIds: [
          'collector-observation-not-pass',
          'evidence-content-structure-invalid',
          'evidence-sha-mismatch',
        ],
      });
    expect(evaluation.evaluationStatus).toBe('rejected');
    expect(evaluation.acceptedEvidenceIdentity).toBeNull();
    expect(evaluation.grantsApproval).toBe(false);
  });

  it('publishes a non-executing independent evaluation contract', () => {
    expect(CONTRACT).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      reviewerMustDifferFromCollector: true,
      acceptedRequiresMatchingEvidenceSha: true,
      acceptedRequiresVerifiedContentAndEnvironment: true,
      acceptedRequiresCollectorObservedPass: true,
      evaluationAcceptanceDoesNotGrantApproval: true,
      mutatesLedger: false,
      executesEvidenceCaptureOrVerification: false,
      readsEvidenceBytes: false,
      writesFilesOrLedger: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
  });
});
