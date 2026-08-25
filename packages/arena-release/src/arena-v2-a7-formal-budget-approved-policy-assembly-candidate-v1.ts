import {
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceSha256,
  assertEvidenceUtcInstant,
} from '@number-strategy-jump/arena-evidence-contracts';
import {
  createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1,
} from './arena-v2-a7-formal-budget-independent-approval-decision-candidate-v1.js';
import {
  assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1 as identifier,
  assertArenaV2A7FormalBudgetEvidenceLocatorCandidateV1 as evidenceLocator,
  assertArenaV2A7FormalBudgetNullableEvidenceTextCandidateV1 as nullableText,
} from './arena-v2-a7-formal-budget-evidence-value-candidate-v1.js';

export const ARENA_V2_A7_FORMAL_BUDGET_APPROVED_POLICY_ASSEMBLY_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;
export const ARENA_V2_A7_FORMAL_BUDGET_APPROVED_POLICY_CANDIDATE_ID =
  'arena.stage7.formal-asset-budget.v3-independent-approved-candidate' as const;

const INPUT_KEYS = new Set([
  'schemaVersion',
  'decisionInput',
  'decisionIdentity',
  'policyRevision',
  'assemblerId',
  'assembledAtUtc',
  'assemblyRecordLocator',
  'assemblyRecordSha256',
  'notes',
]);
function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
}

/** Assembles a new immutable candidate; it never replaces the current V2 policy. */
export function createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1(
  value: unknown,
) {
  const source = cloneFrozenData(value, 'Arena V2 A7已批准预算Policy装配候选V1');
  exactRecord(source, INPUT_KEYS, 'Arena V2 A7已批准预算Policy装配候选V1');
  if (
    source.schemaVersion
      !== ARENA_V2_A7_FORMAL_BUDGET_APPROVED_POLICY_ASSEMBLY_CANDIDATE_V1_SCHEMA_VERSION
  ) throw new RangeError('Arena V2 A7已批准预算Policy装配schemaVersion无效。');
  const decision =
    createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
      source.decisionInput,
    );
  if (
    source.decisionIdentity !== decision.independentApprovalDecisionIdentity
    || decision.decisionStatus !== 'approved'
    || !decision.eligibleForNewImmutableApprovedBudgetPolicyAssembly
    || !decision.everyZeroHeadroomDispositionAccepted
    || !decision.decisionRecordDoesNotMutateCurrentV2Policy
    || decision.currentV2PolicyMutationApplied
    || decision.grantsBudgetApproval
    || decision.hardGate
    || decision.hardGateUsable
  ) throw new RangeError('Arena V2 A7新预算Policy装配只接受闭合的独立Approved决策。');

  const assemblerId = identifier(
    source.assemblerId,
    'Arena V2 A7已批准预算Policy装配.assemblerId',
  );
  const priorActorIds = new Set([
    decision.priorActorIds.collectorId,
    decision.priorActorIds.reviewerId,
    decision.priorActorIds.proposerId,
    decision.approverId,
  ]);
  if (priorActorIds.has(assemblerId)) {
    throw new RangeError('Arena V2 A7预算Policy Assembler不得兼任前四个证据/决策角色。');
  }
  const assembledAtUtc = assertEvidenceUtcInstant(
    source.assembledAtUtc,
    'Arena V2 A7已批准预算Policy装配.assembledAtUtc',
  );
  if (assembledAtUtc < decision.decidedAtUtc) {
    throw new RangeError('Arena V2 A7预算Policy装配时间不得早于独立批准决策。');
  }

  const policyRevision = identifier(
    source.policyRevision,
    'Arena V2 A7已批准预算Policy装配.policyRevision',
  );
  const assemblyRecordLocator = evidenceLocator(
    source.assemblyRecordLocator,
    'Arena V2 A7已批准预算Policy装配.assemblyRecordLocator',
  );
  const assemblyRecordSha256 = assertEvidenceSha256(
    source.assemblyRecordSha256,
    'Arena V2 A7已批准预算Policy装配.assemblyRecordSha256',
  );
  const priorRecordLocators = new Set([
    ...decision.structuralEvidenceEnvironmentRecords.map((entry) => entry.evidenceLocator),
    decision.structuralEvidenceReportLocator,
    decision.structuralEvidenceVerificationRecordLocator,
    decision.proposalRecordLocator,
    decision.decisionRecordLocator,
  ]);
  const priorRecordHashes = new Set([
    ...decision.structuralEvidenceEnvironmentRecords.map((entry) => entry.evidenceSha256),
    decision.structuralEvidenceReportSha256,
    decision.structuralEvidenceVerificationRecordSha256,
    decision.proposalRecordSha256,
    decision.decisionRecordSha256,
  ]);
  if (
    priorRecordLocators.has(assemblyRecordLocator)
    || priorRecordHashes.has(assemblyRecordSha256)
  ) throw new RangeError('Arena V2 A7预算Policy装配记录不得复用环境原始证据或前四层记录身份。');
  const acceptedEnvironmentObservationEvidenceIdentityClosed =
    decision.environmentLimits.length
      === decision.structuralEvidenceEnvironmentRecords.length
    && decision.environmentLimits.every((entry, index) => {
      const evidenceRecord = decision.structuralEvidenceEnvironmentRecords[index];
      return evidenceRecord !== undefined
        && entry.environmentId === evidenceRecord.environmentId
        && entry.observed.evidenceLocator === evidenceRecord.evidenceLocator
        && entry.observed.evidenceSha256 === evidenceRecord.evidenceSha256;
    });
  if (!acceptedEnvironmentObservationEvidenceIdentityClosed) {
    throw new RangeError('Arena V2 A7预算Policy环境Accepted Observation必须与原始证据ID、Locator和SHA逐项一致。');
  }
  const independentGovernanceActorIds = [
    decision.priorActorIds.collectorId,
    decision.priorActorIds.reviewerId,
    decision.priorActorIds.proposerId,
    decision.approverId,
  ] as const;
  const independentGovernanceRolesRemainDistinct =
    new Set(independentGovernanceActorIds).size
      === independentGovernanceActorIds.length;
  const independentGovernanceTimelineOrdered =
    decision.structuralEvidenceCapturedAtUtc
      <= decision.structuralEvidenceReviewedAtUtc
    && decision.structuralEvidenceReviewedAtUtc
      <= decision.structuralLimitProposedAtUtc
    && decision.structuralLimitProposedAtUtc <= decision.decidedAtUtc;
  if (
    !independentGovernanceRolesRemainDistinct
    || !independentGovernanceTimelineOrdered
  ) {
    throw new RangeError('Arena V2 A7预算Policy必须保留四角色分离及采集、评估、提案、批准时间顺序。');
  }
  const approvedPolicyData = Object.freeze({
    policySchemaVersion: 3 as const,
    policyId: ARENA_V2_A7_FORMAL_BUDGET_APPROVED_POLICY_CANDIDATE_ID,
    policyRevision,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    approvalStatus: 'approved-by-independent-decision-candidate' as const,
    structuralLimitsStatus: 'approved-candidate' as const,
    basePolicy: Object.freeze({
      policyId: decision.policyId,
      policyContentHash: decision.policyContentHash,
      catalogContentHash: decision.catalogContentHash,
    }),
    sourceIdentity: Object.freeze({
      sourceCommit: decision.sourceCommit,
      packageLockSha256: decision.packageLockSha256,
      toolchainIdentitySha256: decision.toolchainIdentitySha256,
    }),
    evidenceIdentity: Object.freeze({
      structuralEvidenceSubmissionIdentity:
        decision.structuralEvidenceSubmissionIdentity,
      structuralEvidenceObservationBatchId:
        decision.structuralEvidenceObservationBatchId,
      structuralEvidenceCapturedAtUtc:
        decision.structuralEvidenceCapturedAtUtc,
      structuralEnvironmentEvidenceRecords:
        decision.structuralEvidenceEnvironmentRecords,
      structuralEvidenceEvaluationIdentity:
        decision.structuralEvidenceEvaluationIdentity,
      structuralEvidenceReportLocator: decision.structuralEvidenceReportLocator,
      structuralEvidenceReportSha256: decision.structuralEvidenceReportSha256,
      structuralEvidenceVerificationRecordLocator:
        decision.structuralEvidenceVerificationRecordLocator,
      structuralEvidenceVerificationRecordSha256:
        decision.structuralEvidenceVerificationRecordSha256,
      structuralLimitProposalRecordLocator: decision.proposalRecordLocator,
      structuralLimitProposalRecordSha256: decision.proposalRecordSha256,
      structuralLimitProposalIdentity: decision.structuralLimitProposalIdentity,
      independentApprovalDecisionIdentity:
        decision.independentApprovalDecisionIdentity,
      independentApprovalRecordLocator: decision.decisionRecordLocator,
      independentApprovalRecordSha256: decision.decisionRecordSha256,
    }),
    governanceProvenance: Object.freeze({
      collectorId: decision.priorActorIds.collectorId,
      reviewerId: decision.priorActorIds.reviewerId,
      proposerId: decision.priorActorIds.proposerId,
      approverId: decision.approverId,
      capturedAtUtc: decision.structuralEvidenceCapturedAtUtc,
      reviewedAtUtc: decision.structuralEvidenceReviewedAtUtc,
      proposedAtUtc: decision.structuralLimitProposedAtUtc,
      decidedAtUtc: decision.decidedAtUtc,
    }),
    artifacts: Object.freeze(decision.artifactLimits.map((entry) => Object.freeze({
      assetId: entry.assetId,
      artifactPath: entry.artifactPath,
      kind: entry.kind,
      encodedMediaFormat: entry.encodedMediaFormat,
      decodedTextureFormat: entry.decodedTextureFormat,
      artifactSha256: entry.artifactSha256,
      currentEncodedBytes: entry.observed.currentEncodedBytes,
      currentDecodedTextureBytes: entry.observed.decodedTextureBytes,
      currentTextureWidthPixels: entry.observed.widthPixels,
      currentTextureHeightPixels: entry.observed.heightPixels,
      currentDecodedAudioBytes: entry.observed.decodedAudioBytes,
      acceptedObservation: entry.observed,
      maximums: entry.proposedMaximum,
      headroomReasonId: entry.headroomReasonId,
    }))),
    environments: Object.freeze(decision.environmentLimits.map((entry) => Object.freeze({
      environmentId: entry.environmentId,
      buildIdentitySha256: entry.observed.buildIdentitySha256,
      acceptedObservation: entry.observed,
      maximums: entry.proposedMaximum,
      requiresContextRestoreCompleted: entry.requiresContextRestoreCompleted,
      requiresCleanupReturnedToBaseline: entry.requiresCleanupReturnedToBaseline,
      headroomReasonId: entry.headroomReasonId,
    }))),
    structuralSummary: Object.freeze({
      ...decision.proposalSummary,
      artifactLimitCount: decision.artifactLimits.length,
      environmentLimitCount: decision.environmentLimits.length,
      contextRestoreRequiredForEveryEnvironment: decision.environmentLimits.every(
        (entry) => entry.requiresContextRestoreCompleted,
      ),
      cleanupBaselineRequiredForEveryEnvironment: decision.environmentLimits.every(
        (entry) => entry.requiresCleanupReturnedToBaseline,
      ),
      acceptedEnvironmentObservationEvidenceIdentityClosed: true as const,
      independentGovernanceRolesRemainDistinct: true as const,
      independentGovernanceTimelineOrdered: true as const,
    }),
    approvalSummary: Object.freeze({
      approverId: decision.approverId,
      decidedAtUtc: decision.decidedAtUtc,
      decisionStatus: decision.decisionStatus,
      artifactHeadroomAdequacyVerified:
        decision.artifactHeadroomAdequacyVerified,
      environmentHeadroomAdequacyVerified:
        decision.environmentHeadroomAdequacyVerified,
      applicabilityAndObservationFloorVerified:
        decision.applicabilityAndObservationFloorVerified,
      lifecycleRequirementsVerified: decision.lifecycleRequirementsVerified,
      everyObservedEnvironmentLifecycleSatisfied:
        decision.everyObservedEnvironmentLifecycleSatisfied,
      zeroHeadroomDispositionCount: decision.zeroHeadroomDispositions.length,
      everyZeroHeadroomDispositionAccepted:
        decision.everyZeroHeadroomDispositionAccepted,
    }),
    hardGateUsableForA7V3BudgetCheck: true as const,
    productionConsumptionAllowed: false as const,
    defaultFormalBundleConsumes: false as const,
    defaultPreloaderConsumes: false as const,
    defaultEntryConsumes: false as const,
  });
  const approvedPolicyContentHash = createDeterministicDataHash(
    approvedPolicyData,
    'Arena V2 A7 formal asset budget V3 independent approved policy candidate',
  );
  const normalizedAssembly = Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_BUDGET_APPROVED_POLICY_ASSEMBLY_CANDIDATE_V1_SCHEMA_VERSION,
    approvedPolicyCandidate: Object.freeze({
      ...approvedPolicyData,
      policyContentHash: approvedPolicyContentHash,
    }),
    assemblerId,
    assembledAtUtc,
    assemblyRecordLocator,
    assemblyRecordSha256,
    notes: nullableText(source.notes, 'Arena V2 A7已批准预算Policy装配.notes'),
  });
  const approvedPolicyAssemblyIdentity = createDeterministicDataHash(
    normalizedAssembly,
    'Arena V2 A7 formal budget approved policy assembly candidate V1',
  );
  return Object.freeze({
    ...normalizedAssembly,
    approvedPolicyAssemblyIdentity,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    assemblyStatus: 'approved-policy-candidate-assembled-not-activated' as const,
    eligibleForA7V3BudgetEvidenceBinding: true as const,
    approvedPolicyCandidateHardGateUsable: true as const,
    approvedPolicyBindsAcceptedEnvironmentObservationsToEvidenceRecords: true as const,
    assemblyDoesNotReplaceCurrentV2Policy: true as const,
    evidenceRecordLocatorsAndHashesMustRemainDomainDistinct: true as const,
    currentV2ApprovalStatus: 'proposed-not-approved' as const,
    currentV2StructuralLimitsStatus: 'unresolved-not-approved' as const,
    currentV2PolicyMutationApplied: false as const,
    grantsBudgetApprovalForCurrentV2Policy: false as const,
    hardGate: false as const,
    hardGateUsable: false as const,
    writesFilesOrPolicy: false as const,
    createsOrModifiesAssets: false as const,
    loadsAssets: false as const,
    publishesRelease: false as const,
  });
}

export const ARENA_V2_A7_FORMAL_BUDGET_APPROVED_POLICY_ASSEMBLY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_BUDGET_APPROVED_POLICY_ASSEMBLY_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.a7.formal-budget-approved-policy-assembly.candidate.v1' as const,
    approvedPolicyCandidateId:
      ARENA_V2_A7_FORMAL_BUDGET_APPROVED_POLICY_CANDIDATE_ID,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    hardGateUsable: false as const,
    currentAllowedScope: 'plain-data-new-immutable-approved-policy-assembly-only' as const,
    requiresApprovedIndependentDecision: true as const,
    assemblerMustDifferFromCollectorReviewerProposerAndApprover: true as const,
    timestampsRequireCanonicalUtcInstants: true as const,
    boundedCanonicalEvidenceStringsRequired: true as const,
    sharedEvidenceValueContractRequired: true as const,
    canonicalAsciiIdentifiersAndWhitespaceFreeLocatorsRequired: true as const,
    environmentEvidenceRecordsRemainDistinctFromGovernanceRecords: true as const,
    evidenceRecordLocatorsAndHashesMustRemainDomainDistinct: true as const,
    approvedPolicyRetainsBaseEncodedMediaFormatIdentity: true as const,
    approvedPolicyRetainsBaseTextureDecodedMetadataIdentity: true as const,
    approvedPolicyRetainsAcceptedDecodedAudioObservation: true as const,
    approvedPolicyRetainsCompleteAcceptedObservationFloors: true as const,
    approvedPolicyBindsAcceptedEnvironmentObservationsToEvidenceRecords: true as const,
    approvedPolicyRetainsStructuralEvidenceCaptureProvenance: true as const,
    approvedPolicyRetainsIndependentGovernanceRolesAndTimeline: true as const,
    approvedPolicyRetainsIndependentApprovalClosureSummary: true as const,
    assemblyEnvelopeRemainsOutsidePolicyGovernanceProvenance: true as const,
    approvedPolicyCandidateMayOnlyFeedA7V3BudgetEvidence: true as const,
    assemblyDoesNotReplaceCurrentV2Policy: true as const,
    currentV2PolicyMutationApplied: false as const,
    writesFilesOrPolicy: false as const,
    createsOrModifiesAssets: false as const,
    loadsAssets: false as const,
    publishesRelease: false as const,
    defaultFormalBundleConsumes: false as const,
    defaultPreloaderConsumes: false as const,
    defaultEntryConsumes: false as const,
  });

export type ArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1 =
  ReturnType<typeof createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1>;
