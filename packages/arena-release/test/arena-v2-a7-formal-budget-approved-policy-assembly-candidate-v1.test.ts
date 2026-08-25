import { describe, expect, it } from 'vitest';
import {
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_V2_A7_FORMAL_BUDGET_APPROVED_POLICY_ASSEMBLY_CANDIDATE_V1 as CONTRACT,
  ARENA_V2_A7_FORMAL_BUDGET_APPROVED_POLICY_CANDIDATE_ID,
  createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1,
  createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1,
} from '../src/index.js';
import {
  createArenaV2A7BudgetIndependentApprovalTestInput,
} from './arena-v2-a7-formal-budget-structural-test-fixture.js';

function assemblyInput() {
  const decisionInput = createArenaV2A7BudgetIndependentApprovalTestInput();
  const decision =
    createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
      decisionInput,
    );
  return {
    schemaVersion: 1,
    decisionInput,
    decisionIdentity: decision.independentApprovalDecisionIdentity,
    policyRevision: 'arena-v2-a7-approved-budget-candidate-001',
    assemblerId: 'structural-budget-policy-assembler-001',
    assembledAtUtc: '2026-08-15T16:00:00.000Z',
    assemblyRecordLocator: 'evidence://arena-v2/a7/approved-budget/assembly-001',
    assemblyRecordSha256: '2'.repeat(64),
    notes: null,
  };
}

describe('Arena V2 A7 formal budget approved policy assembly candidate V1 (not run)', () => {
  it('assembles a new immutable candidate without replacing current V2', () => {
    const input = assemblyInput();
    const assembly = createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1(
      input,
    );
    expect(assembly).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      assemblyStatus: 'approved-policy-candidate-assembled-not-activated',
      eligibleForA7V3BudgetEvidenceBinding: true,
      approvedPolicyCandidateHardGateUsable: true,
      assemblyDoesNotReplaceCurrentV2Policy: true,
      currentV2ApprovalStatus: 'proposed-not-approved',
      currentV2StructuralLimitsStatus: 'unresolved-not-approved',
      currentV2PolicyMutationApplied: false,
      grantsBudgetApprovalForCurrentV2Policy: false,
      hardGate: false,
      hardGateUsable: false,
      writesFilesOrPolicy: false,
      publishesRelease: false,
      approvedPolicyCandidate: {
        policySchemaVersion: 3,
        policyId: ARENA_V2_A7_FORMAL_BUDGET_APPROVED_POLICY_CANDIDATE_ID,
        approvalStatus: 'approved-by-independent-decision-candidate',
        structuralLimitsStatus: 'approved-candidate',
        hardGateUsableForA7V3BudgetCheck: true,
        productionConsumptionAllowed: false,
        defaultFormalBundleConsumes: false,
        defaultPreloaderConsumes: false,
        defaultEntryConsumes: false,
        structuralSummary: {
          artifactLimitCount: 130,
          environmentLimitCount: 6,
          contextRestoreRequiredForEveryEnvironment: true,
          cleanupBaselineRequiredForEveryEnvironment: true,
          independentGovernanceRolesRemainDistinct: true,
          independentGovernanceTimelineOrdered: true,
        },
        approvalSummary: {
          decisionStatus: 'approved',
          artifactHeadroomAdequacyVerified: true,
          environmentHeadroomAdequacyVerified: true,
          applicabilityAndObservationFloorVerified: true,
          lifecycleRequirementsVerified: true,
          everyObservedEnvironmentLifecycleSatisfied: true,
          everyZeroHeadroomDispositionAccepted: true,
        },
      },
    });
    expect(assembly.approvedPolicyCandidate.artifacts).toHaveLength(130);
    expect(assembly.approvedPolicyCandidate.artifacts.every((entry) => (
      Object.isFrozen(entry.acceptedObservation)
      && entry.maximums.encodedBytes >= entry.acceptedObservation.currentEncodedBytes
      && entry.maximums.residentBytes
        >= entry.acceptedObservation.maximumMeasuredResidentBytes
    ))).toBe(true);
    expect(assembly.approvedPolicyCandidate.artifacts.map((entry) => ({
      assetId: entry.assetId,
      encodedMediaFormat: entry.encodedMediaFormat,
      decodedTextureFormat: entry.decodedTextureFormat,
      currentDecodedTextureBytes: entry.currentDecodedTextureBytes,
      currentTextureWidthPixels: entry.currentTextureWidthPixels,
      currentTextureHeightPixels: entry.currentTextureHeightPixels,
      currentDecodedAudioBytes: entry.currentDecodedAudioBytes,
    }))).toEqual(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS.map(
      (entry) => ({
        assetId: entry.id,
        encodedMediaFormat: entry.encodedMediaFormat,
        decodedTextureFormat: entry.decodedTextureFormat,
        currentDecodedTextureBytes: entry.decodedTextureBytes,
        currentTextureWidthPixels: entry.widthPixels,
        currentTextureHeightPixels: entry.heightPixels,
        currentDecodedAudioBytes: entry.kind === 'audio'
          ? entry.currentEncodedBytes * 4
          : 0,
      }),
    ));
    expect(assembly.approvedPolicyCandidate.environments).toHaveLength(6);
    expect(assembly.approvedPolicyCandidate.evidenceIdentity).toMatchObject({
      structuralEvidenceSubmissionIdentity:
        input.decisionInput.proposalInput.evaluationInput.submissionIdentity,
      structuralEvidenceObservationBatchId:
        input.decisionInput.proposalInput.evaluationInput.submissionInput
          .observationBatchId,
      structuralEvidenceCapturedAtUtc:
        input.decisionInput.proposalInput.evaluationInput.submissionInput
          .capturedAtUtc,
    });
    expect(assembly.approvedPolicyCandidate.governanceProvenance).toEqual({
      collectorId: input.decisionInput.proposalInput.evaluationInput
        .submissionInput.collectorId,
      reviewerId: input.decisionInput.proposalInput.evaluationInput.reviewerId,
      proposerId: input.decisionInput.proposalInput.proposerId,
      approverId: input.decisionInput.approverId,
      capturedAtUtc: input.decisionInput.proposalInput.evaluationInput
        .submissionInput.capturedAtUtc,
      reviewedAtUtc: input.decisionInput.proposalInput.evaluationInput.reviewedAtUtc,
      proposedAtUtc: input.decisionInput.proposalInput.proposedAtUtc,
      decidedAtUtc: input.decisionInput.decidedAtUtc,
    });
    expect(
      assembly.approvedPolicyCandidate.approvalSummary.zeroHeadroomDispositionCount,
    ).toBe(
      assembly.approvedPolicyCandidate.structuralSummary.zeroHeadroomAssetCount
        + assembly.approvedPolicyCandidate.structuralSummary
          .zeroHeadroomEnvironmentCount,
    );
    expect(assembly.approvedPolicyCandidate.environments.every((entry) => (
      Object.isFrozen(entry.acceptedObservation)
      && entry.acceptedObservation.contextRestoreCompleted
      && entry.acceptedObservation.cleanupReturnedToBaseline
      && entry.maximums.peakResidentBytes
        >= entry.acceptedObservation.peakResidentBytes
    ))).toBe(true);
    expect(assembly.approvedPolicyCandidate.environments.map((entry) => ({
      environmentId: entry.environmentId,
      evidenceLocator: entry.acceptedObservation.evidenceLocator,
      evidenceSha256: entry.acceptedObservation.evidenceSha256,
    }))).toEqual(
      assembly.approvedPolicyCandidate.evidenceIdentity
        .structuralEnvironmentEvidenceRecords,
    );
    expect(assembly.approvedPolicyCandidate.policyContentHash)
      .toMatch(/^[a-f0-9]{8}$/u);
    expect(assembly.approvedPolicyAssemblyIdentity).toMatch(/^[a-f0-9]{8}$/u);
  });

  it('rejects assembler role overlap and decision identity drift', () => {
    const overlap = assemblyInput();
    overlap.assemblerId = overlap.decisionInput.approverId;
    expect(() => createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1(
      overlap,
    )).toThrow(/不得兼任/u);

    const drift = assemblyInput();
    drift.decisionIdentity = '0'.repeat(64);
    expect(() => createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1(
      drift,
    )).toThrow(/只接受/u);
  });

  it('rejects a canonical independent rejection', () => {
    const input = assemblyInput();
    input.decisionInput.decision = 'rejected';
    input.decisionInput.artifactHeadroomAdequacyVerified = false;
    input.decisionInput.reasonIds = ['artifact-headroom-rejected'];
    const rejected =
      createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
        input.decisionInput,
      );
    input.decisionIdentity = rejected.independentApprovalDecisionIdentity;
    expect(() => createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1(
      input,
    )).toThrow(/Approved/u);
  });

  it('rejects assembly record identity reuse from any prior evidence domain', () => {
    const shaReuse = assemblyInput();
    shaReuse.assemblyRecordSha256 = shaReuse.decisionInput.decisionRecordSha256;
    expect(() => createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1(
      shaReuse,
    )).toThrow(/不得复用/u);

    const locatorReuse = assemblyInput();
    locatorReuse.assemblyRecordLocator =
      locatorReuse.decisionInput.proposalInput.proposalRecordLocator;
    expect(() => createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1(
      locatorReuse,
    )).toThrow(/不得复用/u);

    const environmentLocatorReuse = assemblyInput();
    environmentLocatorReuse.assemblyRecordLocator =
      environmentLocatorReuse.decisionInput.proposalInput.evaluationInput
        .submissionInput.environmentObservations[0]!.evidenceLocator;
    expect(() => createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1(
      environmentLocatorReuse,
    )).toThrow(/不得复用/u);
  });

  it('rejects a calendar-invalid assembly timestamp', () => {
    const input = assemblyInput();
    input.assembledAtUtc = '2026-02-29T16:00:00.000Z';
    expect(() => createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1(
      input,
    )).toThrow(/不是有效 UTC 时间/u);
  });

  it('rejects ambiguous assembler identities and oversized policy revisions', () => {
    const actor = assemblyInput();
    actor.assemblerId = ` ${actor.assemblerId}`;
    expect(() => createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1(
      actor,
    )).toThrow(/首尾空白/u);

    const revision = assemblyInput();
    revision.policyRevision = 'r'.repeat(257);
    expect(() => createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1(
      revision,
    )).toThrow(/不能超过 256/u);
  });

  it('publishes only a deferred assembly contract', () => {
    expect(CONTRACT).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      hardGateUsable: false,
      requiresApprovedIndependentDecision: true,
      assemblerMustDifferFromCollectorReviewerProposerAndApprover: true,
      timestampsRequireCanonicalUtcInstants: true,
      boundedCanonicalEvidenceStringsRequired: true,
      sharedEvidenceValueContractRequired: true,
      canonicalAsciiIdentifiersAndWhitespaceFreeLocatorsRequired: true,
      environmentEvidenceRecordsRemainDistinctFromGovernanceRecords: true,
      approvedPolicyRetainsBaseEncodedMediaFormatIdentity: true,
      approvedPolicyRetainsBaseTextureDecodedMetadataIdentity: true,
      approvedPolicyRetainsAcceptedDecodedAudioObservation: true,
      approvedPolicyRetainsCompleteAcceptedObservationFloors: true,
      approvedPolicyCandidateMayOnlyFeedA7V3BudgetEvidence: true,
      assemblyDoesNotReplaceCurrentV2Policy: true,
      currentV2PolicyMutationApplied: false,
      evidenceRecordLocatorsAndHashesMustRemainDomainDistinct: true,
      writesFilesOrPolicy: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
  });
});
