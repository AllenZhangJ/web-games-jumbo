import {
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation/formal-release-evidence-candidate-v1';
import {
  ARENA_V2_P7_TARGET_ENVIRONMENTS_CANDIDATE_V1,
  createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1,
  createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1,
  createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1,
} from '../src/index.js';

function artifactObservations() {
  return ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS.map((artifact) => {
    const isAudio = artifact.kind
      === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.AUDIO;
    const isTexture = artifact.kind
      === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.TEXTURE;
    const isCharacter = artifact.kind
      === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.CHARACTER_MODEL;
    const isModel = !isAudio && !isTexture;
    return {
      assetId: artifact.id,
      artifactPath: artifact.path,
      kind: artifact.kind,
      artifactSha256: artifact.sha256,
      currentEncodedBytes: artifact.currentEncodedBytes,
      decodedTextureBytes: artifact.decodedTextureBytes,
      nodeCount: isModel ? 1 : 0,
      jointCount: isCharacter ? 1 : 0,
      animationClipCount: isCharacter ? 1 : 0,
      primitiveCount: isModel ? 1 : 0,
      materialCount: isModel ? 1 : 0,
      textureCount: 0,
      widthPixels: artifact.widthPixels,
      heightPixels: artifact.heightPixels,
      decodedAudioBytes: isAudio ? artifact.currentEncodedBytes * 4 : 0,
      maximumMeasuredResidentBytes: Math.max(
        1,
        artifact.currentEncodedBytes + artifact.decodedTextureBytes,
      ),
      maximumMeasuredGpuBytes: isAudio
        ? 0
        : Math.max(1, artifact.decodedTextureBytes, artifact.currentEncodedBytes),
    };
  });
}

export interface ArenaV2A7StructuralTestIdentityOptions {
  readonly sourceCommit?: string;
  readonly packageLockSha256?: string;
  readonly toolchainIdentitySha256?: string;
  readonly environmentBuilds?: readonly Readonly<{
    readonly environmentId: string;
    readonly buildIdentitySha256: string;
  }>[];
}

function environmentObservations(
  options: ArenaV2A7StructuralTestIdentityOptions,
) {
  return ARENA_V2_P7_TARGET_ENVIRONMENTS_CANDIDATE_V1.map((environment, index) => ({
    environmentId: environment.id,
    buildIdentitySha256: (() => {
      const supplied = options.environmentBuilds?.[index];
      if (supplied !== undefined && supplied.environmentId !== environment.id) {
        throw new RangeError('A7结构测试夹具六环境身份或顺序不一致。');
      }
      return supplied?.buildIdentitySha256
        ?? (index + 1).toString(16).padStart(64, '0');
    })(),
    peakResidentBytes: 32_000_000 + index,
    peakGpuBytes: 16_000_000 + index,
    peakAudioDecodedBytes: 4_000_000 + index,
    peakAssetUploadMilliseconds: 8 + index,
    contextRestoreCompleted: true,
    cleanupReturnedToBaseline: true,
    evidenceLocator: `evidence://arena-v2/a7/structural/${environment.id}`,
    evidenceSha256: (index + 9).toString(16).padStart(64, '0'),
  }));
}

function acceptedEvaluationInput(
  options: ArenaV2A7StructuralTestIdentityOptions,
) {
  const submissionInput = {
    schemaVersion: 1,
    policyId: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY.policyId,
    policyContentHash:
      ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY.policyContentHash,
    catalogContentHash:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.catalogContentHash,
    sourceCommit: options.sourceCommit ?? 'a'.repeat(40),
    sourceDirty: false,
    packageLockSha256: options.packageLockSha256 ?? 'b'.repeat(64),
    toolchainIdentitySha256:
      options.toolchainIdentitySha256 ?? 'c'.repeat(64),
    observationBatchId: 'arena-v2-a7-structural-observation-001',
    collectorId: 'structural-evidence-collector-001',
    capturedAtUtc: '2026-08-15T12:00:00.000Z',
    artifactObservations: artifactObservations(),
    environmentObservations: environmentObservations(options),
    reportLocator: 'evidence://arena-v2/a7/structural/report-001',
    reportSha256: 'd'.repeat(64),
    notes: null,
  };
  const submission =
    createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1(
      submissionInput,
    );
  return {
    schemaVersion: 1,
    submissionInput,
    submissionIdentity: submission.submissionIdentity,
    verifiedReportSha256: submission.reportSha256,
    artifactCoverageVerified: true,
    structuralMetricsVerified: true,
    environmentCoverageVerified: true,
    sourceAndBuildIdentityVerified: true,
    verificationRecordLocator: 'evidence://arena-v2/a7/structural/evaluation-001',
    verificationRecordSha256: 'e'.repeat(64),
    reviewerId: 'structural-evidence-reviewer-001',
    reviewedAtUtc: '2026-08-15T13:00:00.000Z',
    decision: 'accepted',
    reasonIds: ['identity-coverage-structure-and-environment-verified'],
    notes: null,
  };
}

/** Test-only future input. It is not current measurement, approval or policy evidence. */
export function createArenaV2A7StructuralLimitProposalTestInput(
  strictHeadroom = true,
  options: ArenaV2A7StructuralTestIdentityOptions = {},
) {
  const evaluationInput = acceptedEvaluationInput(options);
  const evaluation =
    createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1(
      evaluationInput,
    );
  return {
    schemaVersion: 1,
    evaluationInput,
    evaluationIdentity: evaluation.evaluationIdentity,
    proposalId: 'arena-v2-a7-structural-limit-proposal-001',
    proposerId: 'structural-limit-proposer-001',
    proposedAtUtc: '2026-08-15T14:00:00.000Z',
    artifactLimits: evaluationInput.submissionInput.artifactObservations.map(
      (observation) => ({
        assetId: observation.assetId,
        maximumEncodedBytes:
          observation.currentEncodedBytes + (strictHeadroom ? 1 : 0),
        maximumNodeCount: observation.nodeCount,
        maximumJointCount: observation.jointCount,
        maximumAnimationClipCount: observation.animationClipCount,
        maximumPrimitiveCount: observation.primitiveCount,
        maximumMaterialCount: observation.materialCount,
        maximumTextureCount: observation.textureCount,
        maximumWidthPixels: observation.widthPixels,
        maximumHeightPixels: observation.heightPixels,
        maximumDecodedTextureBytes: observation.decodedTextureBytes,
        maximumDecodedAudioBytes: observation.decodedAudioBytes,
        maximumResidentBytes: observation.maximumMeasuredResidentBytes,
        maximumGpuBytes: observation.maximumMeasuredGpuBytes,
        headroomReasonId: strictHeadroom
          ? 'encoded-byte-headroom-proposed'
          : 'zero-headroom-requires-independent-disposition',
      }),
    ),
    environmentLimits: evaluationInput.submissionInput.environmentObservations.map(
      (observation) => ({
        environmentId: observation.environmentId,
        maximumPeakResidentBytes:
          observation.peakResidentBytes + (strictHeadroom ? 1 : 0),
        maximumPeakGpuBytes: observation.peakGpuBytes,
        maximumPeakAudioDecodedBytes: observation.peakAudioDecodedBytes,
        maximumAssetUploadMilliseconds: observation.peakAssetUploadMilliseconds,
        requiresContextRestoreCompleted: true,
        requiresCleanupReturnedToBaseline: true,
        headroomReasonId: strictHeadroom
          ? 'resident-byte-headroom-proposed'
          : 'zero-headroom-requires-independent-disposition',
      }),
    ),
    headroomRationale: '测试专用未来上限提案，不代表当前预算批准。',
    proposalRecordLocator: 'evidence://arena-v2/a7/structural-limit/proposal-001',
    proposalRecordSha256: 'f'.repeat(64),
    notes: null,
  };
}

/** Test-only future approval input. It does not approve the current V2 policy. */
export function createArenaV2A7BudgetIndependentApprovalTestInput(
  strictHeadroom = true,
  options: ArenaV2A7StructuralTestIdentityOptions = {},
) {
  const proposalInput =
    createArenaV2A7StructuralLimitProposalTestInput(strictHeadroom, options);
  const proposal =
    createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(proposalInput);
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
    zeroHeadroomDispositions: strictHeadroom
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
      ],
    decisionRecordLocator: 'evidence://arena-v2/a7/structural-budget/decision-001',
    decisionRecordSha256: '1'.repeat(64),
    reasonIds: [
      'structural-limits-headroom-and-lifecycle-independently-approved',
    ],
    notes: null,
  };
}
