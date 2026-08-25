import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1 as PROGRAM,
  ARENA_V2_A3_A6_PRODUCTION_REVIEW_EVIDENCE_SUBMISSION_CANDIDATE_V1 as CONTRACT,
  createArenaV2A3A6ProductionReviewEvidenceSubmissionCandidateV1,
} from '../src/index.js';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_WORK_QUEUE_CANDIDATE_V1 as QUEUE,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1 as LEDGER,
} from '@number-strategy-jump/arena-product-presentation';

function input() {
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
    observedOutcome: 'pass',
    notes: 'candidate evidence reference only',
  };
}

describe('Arena V2 A3-A6 production review evidence submission candidate V1 (not run)', () => {
  it('accepts an identity-closed reference without mutating or approving', () => {
    const submission = createArenaV2A3A6ProductionReviewEvidenceSubmissionCandidateV1(input());
    expect(submission).toMatchObject({
      submissionStatus: 'captured-reference-awaiting-independent-evaluation',
      acceptedForIndependentEvaluation: true,
      independentEvaluationCompleted: false,
      observedOutcome: 'pass',
      observedOutcomeDoesNotGrantApproval: true,
      ledgerMutationApplied: false,
      ledgerSlotStatusAfterSubmission: 'missing',
      productionApprovalStatusAfterSubmission: 'missing-not-approved',
      grantsApproval: false,
      hardGate: false,
      formalReady: false,
      assetUsePermitted: false,
      executesEvidenceCapture: false,
      readsEvidenceBytes: false,
      writesFilesOrLedger: false,
    });
    expect(submission.evidenceIdentity).toMatch(/^[a-f0-9]{8}$/u);
  });

  it('fails closed on stale program identity or wrong slot evidence kind', () => {
    expect(() => createArenaV2A3A6ProductionReviewEvidenceSubmissionCandidateV1({
      ...input(),
      reviewProgramIdentityHash: 'b'.repeat(64),
    })).toThrow(/Program身份漂移/u);
    expect(() => createArenaV2A3A6ProductionReviewEvidenceSubmissionCandidateV1({
      ...input(),
      evidenceKind: 'human-review-report',
    })).toThrow(/要求annotated-capture-set/u);
  });

  it('fails closed on cross-batch assets, stale artifact identity and unknown fields', () => {
    const secondBatchAssetId = QUEUE.workBatches[1]!.assetIds[0]!;
    const secondEntry = LEDGER.entries.find(({ assetId }) => assetId === secondBatchAssetId)!;
    expect(() => createArenaV2A3A6ProductionReviewEvidenceSubmissionCandidateV1({
      ...input(),
      assetId: secondEntry.assetId,
      artifactPath: secondEntry.artifactPath,
      artifactSha256: secondEntry.sha256,
    })).toThrow(/身份、批次或批准事实漂移/u);
    expect(() => createArenaV2A3A6ProductionReviewEvidenceSubmissionCandidateV1({
      ...input(),
      artifactSha256: 'c'.repeat(64),
    })).toThrow(/身份、批次或批准事实漂移/u);
    expect(() => createArenaV2A3A6ProductionReviewEvidenceSubmissionCandidateV1({
      ...input(),
      unexpected: true,
    })).toThrow(/不支持字段/u);
  });

  it('publishes a non-executing seven-slot submission contract', () => {
    expect(CONTRACT).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      supportedBatchCount: 9,
      supportedAssetCount: 130,
      inputIsExactKeyPlainData: true,
      unknownBatchAssetSlotOrPreparationFailsClosed: true,
      artifactPathAndShaMustMatchCurrentLedger: true,
      observedOutcomeDoesNotGrantApproval: true,
      requiresIndependentEvaluation: true,
      mutatesLedger: false,
      executesEvidenceCapture: false,
      readsEvidenceBytes: false,
      writesFilesOrLedger: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
    expect(CONTRACT.supportedEvidenceSlotIds).toHaveLength(7);
  });
});
