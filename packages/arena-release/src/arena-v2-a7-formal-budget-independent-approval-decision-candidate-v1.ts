import {
  assertKnownKeys,
  cloneFrozenData,
  cloneFrozenStringSet,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceSha256,
  assertEvidenceUtcInstant,
} from '@number-strategy-jump/arena-evidence-contracts';
import {
  createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1,
  type ArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1,
} from './arena-v2-a7-formal-budget-structural-limit-proposal-candidate-v1.js';
import {
  assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1 as identifier,
  assertArenaV2A7FormalBudgetEvidenceLocatorCandidateV1 as evidenceLocator,
  assertArenaV2A7FormalBudgetNullableEvidenceTextCandidateV1 as nullableText,
} from './arena-v2-a7-formal-budget-evidence-value-candidate-v1.js';

export const ARENA_V2_A7_FORMAL_BUDGET_INDEPENDENT_APPROVAL_DECISION_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const INPUT_KEYS = new Set([
  'schemaVersion',
  'proposalInput',
  'proposalIdentity',
  'approverId',
  'decidedAtUtc',
  'decision',
  'artifactHeadroomAdequacyVerified',
  'environmentHeadroomAdequacyVerified',
  'applicabilityAndObservationFloorVerified',
  'lifecycleRequirementsVerified',
  'zeroHeadroomDispositions',
  'decisionRecordLocator',
  'decisionRecordSha256',
  'reasonIds',
  'notes',
]);
const ZERO_HEADROOM_DISPOSITION_KEYS = new Set([
  'scope',
  'targetId',
  'accepted',
  'rationaleId',
]);
const APPROVAL_REASON_ID =
  'structural-limits-headroom-and-lifecycle-independently-approved' as const;
const REJECTION_REASON_IDS: ReadonlySet<string> = new Set([
  'artifact-headroom-rejected',
  'environment-headroom-rejected',
  'applicability-or-observation-floor-rejected',
  'lifecycle-requirements-rejected',
  'zero-headroom-disposition-rejected',
  'independent-approver-rejected',
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

function strictBoolean(value: unknown, name: string): boolean {
  if (value !== true && value !== false) throw new TypeError(`${name}必须是boolean。`);
  return value;
}

function approvalDecision(value: unknown): 'approved' | 'rejected' {
  if (value !== 'approved' && value !== 'rejected') {
    throw new RangeError('Arena V2 A7预算独立批准decision必须是approved或rejected。');
  }
  return value;
}

function artifactHasStrictHeadroom(
  entry: ArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1['artifactLimits'][number],
): boolean {
  return entry.proposedMaximum.encodedBytes > entry.observed.currentEncodedBytes
    || entry.proposedMaximum.nodeCount > entry.observed.nodeCount
    || entry.proposedMaximum.jointCount > entry.observed.jointCount
    || entry.proposedMaximum.animationClipCount > entry.observed.animationClipCount
    || entry.proposedMaximum.primitiveCount > entry.observed.primitiveCount
    || entry.proposedMaximum.materialCount > entry.observed.materialCount
    || entry.proposedMaximum.textureCount > entry.observed.textureCount
    || entry.proposedMaximum.widthPixels > entry.observed.widthPixels
    || entry.proposedMaximum.heightPixels > entry.observed.heightPixels
    || entry.proposedMaximum.decodedTextureBytes > entry.observed.decodedTextureBytes
    || entry.proposedMaximum.decodedAudioBytes > entry.observed.decodedAudioBytes
    || entry.proposedMaximum.residentBytes
      > entry.observed.maximumMeasuredResidentBytes
    || entry.proposedMaximum.gpuBytes > entry.observed.maximumMeasuredGpuBytes;
}

function environmentHasStrictHeadroom(
  entry: ArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1['environmentLimits'][number],
): boolean {
  return entry.proposedMaximum.peakResidentBytes > entry.observed.peakResidentBytes
    || entry.proposedMaximum.peakGpuBytes > entry.observed.peakGpuBytes
    || entry.proposedMaximum.peakAudioDecodedBytes > entry.observed.peakAudioDecodedBytes
    || entry.proposedMaximum.assetUploadMilliseconds
      > entry.observed.peakAssetUploadMilliseconds;
}

function expectedZeroHeadroomTargets(
  proposal: ArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1,
) {
  return Object.freeze([
    ...proposal.artifactLimits
      .filter((entry) => !artifactHasStrictHeadroom(entry))
      .map((entry) => Object.freeze({
        scope: 'artifact' as const,
        targetId: entry.assetId,
      })),
    ...proposal.environmentLimits
      .filter((entry) => !environmentHasStrictHeadroom(entry))
      .map((entry) => Object.freeze({
        scope: 'environment' as const,
        targetId: entry.environmentId,
      })),
  ]);
}

function normalizeZeroHeadroomDispositions(
  value: unknown,
  proposal: ArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1,
) {
  const expected = expectedZeroHeadroomTargets(proposal);
  if (!Array.isArray(value) || value.length !== expected.length) {
    throw new RangeError('Arena V2 A7预算独立批准必须精确处置全部零余量目标。');
  }
  return Object.freeze(value.map((entry, index) => {
    const name = `Arena V2 A7预算独立批准.zeroHeadroomDispositions[${index}]`;
    exactRecord(entry, ZERO_HEADROOM_DISPOSITION_KEYS, name);
    const target = expected[index];
    if (
      target === undefined
      || entry.scope !== target.scope
      || entry.targetId !== target.targetId
    ) throw new RangeError(`${name}必须按规范顺序匹配零余量目标。`);
    return Object.freeze({
      scope: target.scope,
      targetId: target.targetId,
      accepted: strictBoolean(entry.accepted, `${name}.accepted`),
      rationaleId: identifier(entry.rationaleId, `${name}.rationaleId`),
    });
  }));
}

/** Records a separate approval decision; it cannot mutate or replace V2 policy. */
export function createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1(
  value: unknown,
) {
  const source = cloneFrozenData(value, 'Arena V2 A7预算独立批准决策候选V1');
  exactRecord(source, INPUT_KEYS, 'Arena V2 A7预算独立批准决策候选V1');
  if (
    source.schemaVersion
      !== ARENA_V2_A7_FORMAL_BUDGET_INDEPENDENT_APPROVAL_DECISION_CANDIDATE_V1_SCHEMA_VERSION
  ) throw new RangeError('Arena V2 A7预算独立批准schemaVersion无效。');
  const proposal =
    createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(
      source.proposalInput,
    );
  if (
    source.proposalIdentity !== proposal.structuralLimitProposalIdentity
    || proposal.proposalStatus !== 'proposed-not-independently-approved'
    || !proposal.eligibleForIndependentBudgetApprovalDecision
    || !proposal.zeroHeadroomRequiresExplicitIndependentDisposition
    || !proposal.proposalCannotChangeCurrentV2Policy
    || proposal.grantsBudgetApproval
    || proposal.hardGate
    || proposal.hardGateUsable
  ) throw new RangeError('Arena V2 A7预算独立批准只接受当前未批准的不可变结构上限提案。');

  const approverId = identifier(
    source.approverId,
    'Arena V2 A7预算独立批准.approverId',
  );
  if (
    approverId === proposal.proposerId
    || approverId === proposal.structuralEvidenceCollectorId
    || approverId === proposal.structuralEvidenceReviewerId
  ) throw new RangeError('Arena V2 A7预算Approver不得兼任Collector、Reviewer或Proposer。');
  const decidedAtUtc = assertEvidenceUtcInstant(
    source.decidedAtUtc,
    'Arena V2 A7预算独立批准.decidedAtUtc',
  );
  if (decidedAtUtc < proposal.proposedAtUtc) {
    throw new RangeError('Arena V2 A7预算独立批准时间不得早于上限提案。');
  }

  const decision = approvalDecision(source.decision);
  const artifactHeadroomAdequacyVerified = strictBoolean(
    source.artifactHeadroomAdequacyVerified,
    'Arena V2 A7预算独立批准.artifactHeadroomAdequacyVerified',
  );
  const environmentHeadroomAdequacyVerified = strictBoolean(
    source.environmentHeadroomAdequacyVerified,
    'Arena V2 A7预算独立批准.environmentHeadroomAdequacyVerified',
  );
  const applicabilityAndObservationFloorVerified = strictBoolean(
    source.applicabilityAndObservationFloorVerified,
    'Arena V2 A7预算独立批准.applicabilityAndObservationFloorVerified',
  );
  const lifecycleRequirementsVerified = strictBoolean(
    source.lifecycleRequirementsVerified,
    'Arena V2 A7预算独立批准.lifecycleRequirementsVerified',
  );
  const zeroHeadroomDispositions = normalizeZeroHeadroomDispositions(
    source.zeroHeadroomDispositions,
    proposal,
  );
  const everyZeroHeadroomDispositionAccepted = zeroHeadroomDispositions.every(
    (entry) => entry.accepted,
  );
  const everyObservedEnvironmentLifecycleSatisfied = proposal.environmentLimits.every(
    (entry) => (
      entry.observed.contextRestoreCompleted
      && entry.observed.cleanupReturnedToBaseline
    ),
  );
  const lifecycleFactsAccepted = lifecycleRequirementsVerified
    && everyObservedEnvironmentLifecycleSatisfied;
  const reasonIds = cloneFrozenStringSet(
    source.reasonIds as readonly unknown[],
    'Arena V2 A7预算独立批准.reasonIds',
  );
  if (decision === 'approved') {
    if (
      !artifactHeadroomAdequacyVerified
      || !environmentHeadroomAdequacyVerified
      || !applicabilityAndObservationFloorVerified
      || !lifecycleFactsAccepted
      || !everyZeroHeadroomDispositionAccepted
      || reasonIds.length !== 1
      || reasonIds[0] !== APPROVAL_REASON_ID
    ) throw new RangeError('Arena V2 A7预算批准必须闭合余量、适用性、观察下限、生命周期和零余量处置。');
  } else {
    const factsAllAccepted = artifactHeadroomAdequacyVerified
      && environmentHeadroomAdequacyVerified
      && applicabilityAndObservationFloorVerified
      && lifecycleFactsAccepted
      && everyZeroHeadroomDispositionAccepted;
    if (
      reasonIds.length === 0
      || reasonIds.some((reasonId) => !REJECTION_REASON_IDS.has(reasonId))
      || (!artifactHeadroomAdequacyVerified
        && !reasonIds.includes('artifact-headroom-rejected'))
      || (!environmentHeadroomAdequacyVerified
        && !reasonIds.includes('environment-headroom-rejected'))
      || (!applicabilityAndObservationFloorVerified
        && !reasonIds.includes('applicability-or-observation-floor-rejected'))
      || (!lifecycleFactsAccepted
        && !reasonIds.includes('lifecycle-requirements-rejected'))
      || (!everyZeroHeadroomDispositionAccepted
        && !reasonIds.includes('zero-headroom-disposition-rejected'))
      || (factsAllAccepted && !reasonIds.includes('independent-approver-rejected'))
    ) throw new RangeError('Arena V2 A7预算拒绝原因必须覆盖失败事实且只用规范原因。');
  }

  const decisionRecordLocator = evidenceLocator(
    source.decisionRecordLocator,
    'Arena V2 A7预算独立批准.decisionRecordLocator',
  );
  const decisionRecordSha256 = assertEvidenceSha256(
    source.decisionRecordSha256,
    'Arena V2 A7预算独立批准.decisionRecordSha256',
  );
  const priorRecordLocators = new Set([
    ...proposal.structuralEvidenceEnvironmentRecords.map((entry) => entry.evidenceLocator),
    proposal.structuralEvidenceReportLocator,
    proposal.structuralEvidenceVerificationRecordLocator,
    proposal.proposalRecordLocator,
  ]);
  const priorRecordHashes = new Set([
    ...proposal.structuralEvidenceEnvironmentRecords.map((entry) => entry.evidenceSha256),
    proposal.structuralEvidenceReportSha256,
    proposal.structuralEvidenceVerificationRecordSha256,
    proposal.proposalRecordSha256,
  ]);
  if (
    priorRecordLocators.has(decisionRecordLocator)
    || priorRecordHashes.has(decisionRecordSha256)
  ) throw new RangeError('Arena V2 A7预算批准记录不得复用环境、结构报告、评估或提案证据身份。');

  const normalized = Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_BUDGET_INDEPENDENT_APPROVAL_DECISION_CANDIDATE_V1_SCHEMA_VERSION,
    structuralLimitProposalIdentity: proposal.structuralLimitProposalIdentity,
    structuralEvidenceSubmissionIdentity: proposal.structuralEvidenceSubmissionIdentity,
    structuralEvidenceEvaluationIdentity: proposal.structuralEvidenceEvaluationIdentity,
    structuralEvidenceObservationBatchId:
      proposal.structuralEvidenceObservationBatchId,
    structuralEvidenceCapturedAtUtc: proposal.structuralEvidenceCapturedAtUtc,
    structuralEvidenceReviewedAtUtc: proposal.structuralEvidenceReviewedAtUtc,
    structuralLimitProposedAtUtc: proposal.proposedAtUtc,
    structuralEvidenceReportLocator: proposal.structuralEvidenceReportLocator,
    structuralEvidenceReportSha256: proposal.structuralEvidenceReportSha256,
    structuralEvidenceVerificationRecordLocator:
      proposal.structuralEvidenceVerificationRecordLocator,
    structuralEvidenceVerificationRecordSha256:
      proposal.structuralEvidenceVerificationRecordSha256,
    structuralEvidenceEnvironmentRecords:
      proposal.structuralEvidenceEnvironmentRecords,
    proposalRecordLocator: proposal.proposalRecordLocator,
    proposalRecordSha256: proposal.proposalRecordSha256,
    policyId: proposal.policyId,
    policyContentHash: proposal.policyContentHash,
    catalogContentHash: proposal.catalogContentHash,
    sourceCommit: proposal.sourceCommit,
    packageLockSha256: proposal.packageLockSha256,
    toolchainIdentitySha256: proposal.toolchainIdentitySha256,
    environmentBuilds: proposal.environmentBuilds,
    artifactLimits: proposal.artifactLimits,
    environmentLimits: proposal.environmentLimits,
    proposalSummary: proposal.summary,
    priorActorIds: Object.freeze({
      collectorId: proposal.structuralEvidenceCollectorId,
      reviewerId: proposal.structuralEvidenceReviewerId,
      proposerId: proposal.proposerId,
    }),
    approverId,
    decidedAtUtc,
    decision,
    artifactHeadroomAdequacyVerified,
    environmentHeadroomAdequacyVerified,
    applicabilityAndObservationFloorVerified,
    lifecycleRequirementsVerified,
    everyObservedEnvironmentLifecycleSatisfied,
    zeroHeadroomDispositions,
    everyZeroHeadroomDispositionAccepted,
    decisionRecordLocator,
    decisionRecordSha256,
    reasonIds,
    notes: nullableText(source.notes, 'Arena V2 A7预算独立批准.notes'),
  });
  const independentApprovalDecisionIdentity = createDeterministicDataHash(
    normalized,
    'Arena V2 A7 formal budget independent approval decision candidate V1',
  );
  return Object.freeze({
    ...normalized,
    independentApprovalDecisionIdentity,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    decisionStatus: decision,
    eligibleForNewImmutableApprovedBudgetPolicyAssembly:
      decision === 'approved',
    decisionRecordDoesNotMutateCurrentV2Policy: true as const,
    evidenceRecordLocatorsAndHashesMustRemainDomainDistinct: true as const,
    currentV2ApprovalStatus: 'proposed-not-approved' as const,
    currentV2StructuralLimitsStatus: 'unresolved-not-approved' as const,
    currentV2PolicyMutationApplied: false as const,
    grantsBudgetApprovalForCurrentV2Policy: false as const,
    grantsBudgetApproval: false as const,
    hardGate: false as const,
    hardGateUsable: false as const,
    writesFilesOrPolicy: false as const,
    runsMeasurementTools: false as const,
    createsOrModifiesAssets: false as const,
    loadsAssets: false as const,
    publishesRelease: false as const,
  });
}

export const ARENA_V2_A7_FORMAL_BUDGET_INDEPENDENT_APPROVAL_DECISION_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_BUDGET_INDEPENDENT_APPROVAL_DECISION_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.a7.formal-budget-independent-approval-decision.candidate.v1' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    hardGateUsable: false as const,
    currentAllowedScope: 'plain-data-independent-budget-approval-decision-only' as const,
    requiresImmutableStructuralLimitProposal: true as const,
    approverMustDifferFromCollectorReviewerAndProposer: true as const,
    approvedRequiresArtifactAndEnvironmentHeadroomAdequacy: true as const,
    approvedRequiresApplicabilityObservationFloorAndLifecycleClosure: true as const,
    approvedRequiresObservedEnvironmentLifecycleSuccess: true as const,
    approvedDecisionRetainsStructuralEvidenceCaptureProvenance: true as const,
    approvedDecisionRetainsIndependentGovernanceTimeline: true as const,
    zeroHeadroomRequiresExactIndependentDisposition: true as const,
    timestampsRequireCanonicalUtcInstants: true as const,
    boundedCanonicalEvidenceStringsRequired: true as const,
    sharedEvidenceValueContractRequired: true as const,
    canonicalAsciiIdentifiersAndWhitespaceFreeLocatorsRequired: true as const,
    environmentEvidenceRecordsRemainDistinctFromGovernanceRecords: true as const,
    approvedDecisionOnlyFeedsNewImmutablePolicyAssembly: true as const,
    decisionRecordDoesNotMutateCurrentV2Policy: true as const,
    grantsBudgetApproval: false as const,
    writesFilesOrPolicy: false as const,
    runsMeasurementTools: false as const,
    createsOrModifiesAssets: false as const,
    loadsAssets: false as const,
    publishesRelease: false as const,
    defaultFormalBundleConsumes: false as const,
    defaultPreloaderConsumes: false as const,
    defaultEntryConsumes: false as const,
    approvalReasonId: APPROVAL_REASON_ID,
    rejectionReasonIds: Object.freeze([...REJECTION_REASON_IDS].sort()),
  });

export type ArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1 =
  ReturnType<typeof createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1>;
