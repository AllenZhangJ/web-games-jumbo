import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A7_FORMAL_BUDGET_INDEPENDENT_APPROVAL_DECISION_CANDIDATE_V1 as CONTRACT,
  createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1,
  createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1,
  createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1,
  createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1,
} from '../src/index.js';
import {
  createArenaV2A7StructuralLimitProposalTestInput,
} from './arena-v2-a7-formal-budget-structural-test-fixture.js';

const APPROVAL_REASON_ID =
  'structural-limits-headroom-and-lifecycle-independently-approved';

function decisionInput(strictHeadroom = true) {
  const proposalInput =
    createArenaV2A7StructuralLimitProposalTestInput(strictHeadroom);
  const proposal =
    createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(proposalInput);
  const zeroHeadroomDispositions = strictHeadroom
    ? []
    : [
      ...proposal.artifactLimits.map((entry) => ({
        scope: 'artifact',
        targetId: entry.assetId,
        accepted: true,
        rationaleId: 'independent-zero-headroom-accepted-for-test-only',
      })),
      ...proposal.environmentLimits.map((entry) => ({
        scope: 'environment',
        targetId: entry.environmentId,
        accepted: true,
        rationaleId: 'independent-zero-headroom-accepted-for-test-only',
      })),
    ];
  return {
    schemaVersion: 1,
    proposalInput,
    proposalIdentity: proposal.structuralLimitProposalIdentity,
    approverId: 'structural-budget-independent-approver-001',
    decidedAtUtc: '2026-08-15T15:00:00.000Z',
    decision: 'approved',
    artifactHeadroomAdequacyVerified: true,
    environmentHeadroomAdequacyVerified: true,
    applicabilityAndObservationFloorVerified: true,
    lifecycleRequirementsVerified: true,
    zeroHeadroomDispositions,
    decisionRecordLocator: 'evidence://arena-v2/a7/structural-budget/decision-001',
    decisionRecordSha256: '1'.repeat(64),
    reasonIds: [APPROVAL_REASON_ID],
    notes: null,
  };
}

describe('Arena V2 A7 formal budget independent approval decision candidate V1 (not run)', () => {
  it('records future approval eligibility without mutating or approving current V2', () => {
    const decision =
      createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
        decisionInput(),
      );
    expect(decision).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      decisionStatus: 'approved',
      eligibleForNewImmutableApprovedBudgetPolicyAssembly: true,
      decisionRecordDoesNotMutateCurrentV2Policy: true,
      currentV2ApprovalStatus: 'proposed-not-approved',
      currentV2StructuralLimitsStatus: 'unresolved-not-approved',
      currentV2PolicyMutationApplied: false,
      grantsBudgetApprovalForCurrentV2Policy: false,
      grantsBudgetApproval: false,
      hardGate: false,
      hardGateUsable: false,
      proposalSummary: {
        artifactLimitCount: 130,
        environmentLimitCount: 6,
      },
      everyZeroHeadroomDispositionAccepted: true,
      everyObservedEnvironmentLifecycleSatisfied: true,
      writesFilesOrPolicy: false,
      publishesRelease: false,
    });
    expect(decision.independentApprovalDecisionIdentity).toMatch(/^[a-f0-9]{8}$/u);
  });

  it('requires exact accepted dispositions for every zero-headroom target', () => {
    const accepted =
      createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
        decisionInput(false),
      );
    expect(accepted.zeroHeadroomDispositions).toHaveLength(136);

    const missing = decisionInput(false);
    missing.zeroHeadroomDispositions.pop();
    expect(() => createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
      missing,
    )).toThrow(/精确处置/u);

    const rejectedDisposition = decisionInput(false);
    rejectedDisposition.zeroHeadroomDispositions[0]!.accepted = false;
    expect(() => createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
      rejectedDisposition,
    )).toThrow(/批准必须闭合/u);
  });

  it('rejects role overlap and incomplete approval facts', () => {
    const overlap = decisionInput();
    overlap.approverId = overlap.proposalInput.proposerId;
    expect(() => createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
      overlap,
    )).toThrow(/不得兼任/u);

    const incomplete = decisionInput();
    incomplete.artifactHeadroomAdequacyVerified = false;
    expect(() => createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
      incomplete,
    )).toThrow(/批准必须闭合/u);
  });

  it('rejects approval when an accepted environment observation failed lifecycle recovery', () => {
    const input = decisionInput();
    const evaluationInput = input.proposalInput.evaluationInput;
    evaluationInput.submissionInput.environmentObservations[0]!
      .contextRestoreCompleted = false;
    const submission =
      createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1(
        evaluationInput.submissionInput,
      );
    evaluationInput.submissionIdentity = submission.submissionIdentity;
    const evaluation =
      createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1(
        evaluationInput,
      );
    input.proposalInput.evaluationIdentity = evaluation.evaluationIdentity;
    const proposal = createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(
      input.proposalInput,
    );
    input.proposalIdentity = proposal.structuralLimitProposalIdentity;
    expect(() => createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
      input,
    )).toThrow(/生命周期/u);
  });

  it('records a canonical rejection without opening downstream assembly', () => {
    const input = decisionInput();
    input.decision = 'rejected';
    input.artifactHeadroomAdequacyVerified = false;
    input.reasonIds = ['artifact-headroom-rejected'];
    const decision =
      createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(input);
    expect(decision).toMatchObject({
      decisionStatus: 'rejected',
      eligibleForNewImmutableApprovedBudgetPolicyAssembly: false,
      grantsBudgetApproval: false,
      hardGate: false,
    });
  });

  it('rejects approval record identity reuse from prior evidence domains', () => {
    const shaReuse = decisionInput();
    shaReuse.decisionRecordSha256 = shaReuse.proposalInput.proposalRecordSha256;
    expect(() => createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
      shaReuse,
    )).toThrow(/不得复用/u);

    const locatorReuse = decisionInput();
    locatorReuse.decisionRecordLocator =
      locatorReuse.proposalInput.evaluationInput.submissionInput.reportLocator;
    expect(() => createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
      locatorReuse,
    )).toThrow(/不得复用/u);

    const environmentShaReuse = decisionInput();
    environmentShaReuse.decisionRecordSha256 =
      environmentShaReuse.proposalInput.evaluationInput.submissionInput
        .environmentObservations[0]!.evidenceSha256;
    expect(() => createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
      environmentShaReuse,
    )).toThrow(/不得复用/u);
  });

  it('rejects a calendar-invalid approval decision timestamp', () => {
    const input = decisionInput();
    input.decidedAtUtc = '2026-13-15T15:00:00.000Z';
    expect(() => createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
      input,
    )).toThrow(/不是有效 UTC 时间/u);
  });

  it('rejects ambiguous approval identities and control-bearing record locators', () => {
    const actor = decisionInput();
    actor.approverId = `${actor.approverId} `;
    expect(() => createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
      actor,
    )).toThrow(/首尾空白/u);

    const locator = decisionInput();
    locator.decisionRecordLocator += '\t';
    expect(() => createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
      locator,
    )).toThrow(/控制字符/u);
  });

  it('publishes only a deferred independent-decision contract', () => {
    expect(CONTRACT).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      hardGateUsable: false,
      requiresImmutableStructuralLimitProposal: true,
      approverMustDifferFromCollectorReviewerAndProposer: true,
      approvedRequiresArtifactAndEnvironmentHeadroomAdequacy: true,
      approvedRequiresApplicabilityObservationFloorAndLifecycleClosure: true,
      approvedRequiresObservedEnvironmentLifecycleSuccess: true,
      zeroHeadroomRequiresExactIndependentDisposition: true,
      timestampsRequireCanonicalUtcInstants: true,
      boundedCanonicalEvidenceStringsRequired: true,
      sharedEvidenceValueContractRequired: true,
      canonicalAsciiIdentifiersAndWhitespaceFreeLocatorsRequired: true,
      environmentEvidenceRecordsRemainDistinctFromGovernanceRecords: true,
      approvedDecisionOnlyFeedsNewImmutablePolicyAssembly: true,
      decisionRecordDoesNotMutateCurrentV2Policy: true,
      evidenceRecordLocatorsAndHashesMustRemainDomainDistinct: true,
      grantsBudgetApproval: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
  });
});
