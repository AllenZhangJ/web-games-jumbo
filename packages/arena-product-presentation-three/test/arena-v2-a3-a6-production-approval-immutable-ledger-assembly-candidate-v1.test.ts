import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_CANDIDATE_V1 as PROGRAM,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_IMMUTABLE_LEDGER_ASSEMBLY_CANDIDATE_V1 as CONTRACT,
  createArenaV2A3A6ProductionApprovalDecisionRecordCandidateV1,
  createArenaV2A3A6ProductionApprovalImmutableLedgerAssemblyCandidateV1,
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
      evidenceKind: KIND_BY_SLOT[slotId],
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

function approvedDecisionInput() {
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

function assemblyInput() {
  const decisionInput = approvedDecisionInput();
  const decision = createArenaV2A3A6ProductionApprovalDecisionRecordCandidateV1(
    decisionInput,
  );
  return {
    schemaVersion: 1,
    baseLedgerId: LEDGER.id,
    baseLedgerContentHash: LEDGER.contentHash,
    proposedContentVersion: 2,
    assemblyRequestId: 'arena-v2-ledger-assembly-request-001',
    assemblerId: 'production-ledger-assembler-001',
    assembledAtUtc: '2026-08-14T15:00:00.000Z',
    decisions: [{
      decisionInput,
      approvalDecisionIdentity: decision.approvalDecisionIdentity,
    }],
  };
}

describe('Arena V2 A3-A6 immutable approval ledger assembly candidate V1 (not run)', () => {
  it('assembles an immutable partial proposal while leaving the current ledger closed', () => {
    const proposal =
      createArenaV2A3A6ProductionApprovalImmutableLedgerAssemblyCandidateV1(
        assemblyInput(),
      );
    const approvedAssetId = proposal.approvedAssetIds[0]!;
    const proposedEntry = proposal.proposedLedger.entries.find(
      ({ assetId }) => assetId === approvedAssetId,
    )!;
    const currentEntry = LEDGER.entries.find(({ assetId }) => assetId === approvedAssetId)!;

    expect(proposal).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      assemblyStatus: 'assembled-proposal-not-published',
      immutableProposalCreated: true,
      currentLedgerMutated: false,
      publishesLedger: false,
      grantsApproval: false,
      hardGate: false,
      formalReady: false,
      assetUsePermitted: false,
      writesFilesOrLedger: false,
    });
    expect(proposal.proposedLedger.summary).toMatchObject({
      assetCount: 130,
      approvedDecisionAssembledAssetCount: 1,
      productionApprovalMissingAssetCount: 129,
      acceptedEvidenceSlotCount: 7,
      missingEvidenceSlotCount: 903,
      assetUsePermittedCount: 0,
      formalReadyAssetCount: 0,
      completeCatalogDecisionCoverage: false,
    });
    expect(proposedEntry.productionApprovalStatus)
      .toBe('approved-decision-assembled-not-published');
    expect(proposedEntry.requiredEvidenceSlots.every(({ status }) => status === 'accepted'))
      .toBe(true);
    expect(proposedEntry.approvalDecision?.approvalDecisionIdentity)
      .toBe(proposal.approvalDecisionIdentities[0]);
    expect(proposedEntry.assetUsePermitted).toBe(false);
    expect(proposedEntry.formalReady).toBe(false);
    expect(currentEntry.productionApprovalStatus).toBe('missing-not-approved');
    expect(currentEntry.requiredEvidenceSlots.every(({ status }) => status === 'missing'))
      .toBe(true);
    expect(proposal.immutableLedgerProposalIdentity).toMatch(/^[a-f0-9]{64}$/u);
    expect(proposal.proposedLedger.contentHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(Object.isFrozen(proposal.proposedLedger.entries)).toBe(true);
    expect(Object.isFrozen(proposedEntry.requiredEvidenceSlots)).toBe(true);
  });

  it('rejects stale identities, duplicate approvals, actor overlap and time reversal', () => {
    const input = assemblyInput();
    expect(() => createArenaV2A3A6ProductionApprovalImmutableLedgerAssemblyCandidateV1({
      ...input,
      baseLedgerContentHash: 'a'.repeat(64),
    })).toThrow(/基线账本身份/u);
    expect(() => createArenaV2A3A6ProductionApprovalImmutableLedgerAssemblyCandidateV1({
      ...input,
      decisions: [input.decisions[0], input.decisions[0]],
    })).toThrow(/身份必须唯一/u);
    expect(() => createArenaV2A3A6ProductionApprovalImmutableLedgerAssemblyCandidateV1({
      ...input,
      assemblerId: 'production-approver-001',
    })).toThrow(/不得兼任/u);
    expect(() => createArenaV2A3A6ProductionApprovalImmutableLedgerAssemblyCandidateV1({
      ...input,
      assembledAtUtc: '2026-08-14T13:59:59.999Z',
    })).toThrow(/不得早于/u);
  });

  it('rejects rejected decisions and decision identity substitution', () => {
    const input = assemblyInput();
    const approved = input.decisions[0]!;
    expect(() => createArenaV2A3A6ProductionApprovalImmutableLedgerAssemblyCandidateV1({
      ...input,
      decisions: [{
        ...approved,
        approvalDecisionIdentity: 'a'.repeat(64),
      }],
    })).toThrow(/不是绑定当前基线/u);
    expect(() => createArenaV2A3A6ProductionApprovalImmutableLedgerAssemblyCandidateV1({
      ...input,
      decisions: [{
        ...approved,
        decisionInput: {
          ...approved.decisionInput,
          decision: 'rejected',
          sourceAndRightsClosureVerified: false,
          reasonIds: ['source-or-rights-closure-rejected'],
        },
      }],
    })).toThrow(/不是绑定当前基线/u);
  });

  it('publishes only a non-writing, non-runtime proposal contract', () => {
    expect(CONTRACT).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      formalReady: false,
      grantsApproval: false,
      assetUsePermitted: false,
      revalidatesEveryRawApprovedDecision: true,
      requiresCurrentBaselineLedgerIdentity: true,
      requiresIndependentAssembler: true,
      preservesUnapprovedEntriesAsMissing: true,
      approvedEntriesRemainRuntimeUnusableUntilSeparatePublication: true,
      proposalIsContentAddressedAndDeepFrozen: true,
      mutatesCurrentLedger: false,
      publishesLedger: false,
      executesEvidenceApprovalOrPublicationWork: false,
      readsEvidenceBytes: false,
      writesFilesOrLedger: false,
      participatesInGameplayAuthority: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
  });
});
