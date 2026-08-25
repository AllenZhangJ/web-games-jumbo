import { describe, expect, it } from 'vitest';
import {
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation/formal-release-evidence-candidate-v1';
import {
  ARENA_V2_A7_FORMAL_BUDGET_STRUCTURAL_LIMIT_PROPOSAL_CANDIDATE_V1 as CONTRACT,
  ARENA_V2_P7_TARGET_ENVIRONMENTS_CANDIDATE_V1,
  createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1,
  createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1,
  createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1,
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

function environmentObservations() {
  return ARENA_V2_P7_TARGET_ENVIRONMENTS_CANDIDATE_V1.map((environment, index) => ({
    environmentId: environment.id,
    buildIdentitySha256: (index + 1).toString(16).padStart(64, '0'),
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

function submissionInput() {
  return {
    schemaVersion: 1,
    policyId: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY.policyId,
    policyContentHash:
      ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY.policyContentHash,
    catalogContentHash:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.catalogContentHash,
    sourceCommit: 'a'.repeat(40),
    sourceDirty: false,
    packageLockSha256: 'b'.repeat(64),
    toolchainIdentitySha256: 'c'.repeat(64),
    observationBatchId: 'arena-v2-a7-structural-observation-001',
    collectorId: 'structural-evidence-collector-001',
    capturedAtUtc: '2026-08-15T12:00:00.000Z',
    artifactObservations: artifactObservations(),
    environmentObservations: environmentObservations(),
    reportLocator: 'evidence://arena-v2/a7/structural/report-001',
    reportSha256: 'd'.repeat(64),
    notes: null,
  };
}

function acceptedEvaluationInput() {
  const input = submissionInput();
  const submission =
    createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1(input);
  return {
    schemaVersion: 1,
    submissionInput: input,
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

function proposalInput(strictHeadroom = true) {
  const evaluationInput = acceptedEvaluationInput();
  const evaluation =
    createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1(
      evaluationInput,
    );
  const artifactLimits = evaluationInput.submissionInput.artifactObservations.map(
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
  );
  const environmentLimits = evaluationInput.submissionInput.environmentObservations.map(
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
  );
  return {
    schemaVersion: 1,
    evaluationInput,
    evaluationIdentity: evaluation.evaluationIdentity,
    proposalId: 'arena-v2-a7-structural-limit-proposal-001',
    proposerId: 'structural-limit-proposer-001',
    proposedAtUtc: '2026-08-15T14:00:00.000Z',
    artifactLimits,
    environmentLimits,
    headroomRationale: '为130项资产和六环境显式提出可独立复核的结构上限。',
    proposalRecordLocator: 'evidence://arena-v2/a7/structural-limit/proposal-001',
    proposalRecordSha256: 'f'.repeat(64),
    notes: null,
  };
}

describe('Arena V2 A7 formal budget structural limit proposal candidate V1 (not run)', () => {
  it('creates an immutable 130-asset and six-environment proposal without approval', () => {
    const proposal =
      createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(
        proposalInput(),
      );
    expect(proposal).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      proposalStatus: 'proposed-not-independently-approved',
      eligibleForIndependentBudgetApprovalDecision: true,
      headroomAdequacyDecidedHere: false,
      proposalCannotChangeCurrentV2Policy: true,
      currentV2ApprovalStatus: 'proposed-not-approved',
      currentV2StructuralLimitsStatus: 'unresolved-not-approved',
      summary: {
        artifactLimitCount: 130,
        environmentLimitCount: 6,
        strictHeadroomAssetCount: 130,
        zeroHeadroomAssetCount: 0,
        strictHeadroomEnvironmentCount: 6,
        zeroHeadroomEnvironmentCount: 0,
      },
      grantsBudgetApproval: false,
      hardGate: false,
      hardGateUsable: false,
      writesFilesOrPolicy: false,
      runsMeasurementTools: false,
      publishesRelease: false,
    });
    expect(proposal.artifactLimits.map(({ encodedMediaFormat }) => encodedMediaFormat))
      .toEqual(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS.map(
        ({ encodedMediaFormat }) => encodedMediaFormat,
      ));
    expect(proposal.artifactLimits.map(({ decodedTextureFormat }) => decodedTextureFormat))
      .toEqual(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS.map(
        ({ decodedTextureFormat }) => decodedTextureFormat,
      ));
    expect(proposal.structuralLimitProposalIdentity).toMatch(/^[a-f0-9]{8}$/u);
  });

  it('keeps zero headroom explicit for a later independent disposition', () => {
    const proposal =
      createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(
        proposalInput(false),
      );
    expect(proposal).toMatchObject({
      zeroHeadroomRequiresExplicitIndependentDisposition: true,
      summary: {
        strictHeadroomAssetCount: 0,
        zeroHeadroomAssetCount: 130,
        strictHeadroomEnvironmentCount: 0,
        zeroHeadroomEnvironmentCount: 6,
      },
      grantsBudgetApproval: false,
      hardGate: false,
    });
  });

  it('rejects below-observation limits, coverage drift and proposer overlap', () => {
    const belowObservation = proposalInput();
    belowObservation.artifactLimits[0]!.maximumEncodedBytes = 0;
    expect(() => createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(
      belowObservation,
    )).toThrow(/不得低于/u);

    const missingAsset = proposalInput();
    missingAsset.artifactLimits.pop();
    expect(() => createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(
      missingAsset,
    )).toThrow(/130项/u);

    const overlap = proposalInput();
    overlap.proposerId = overlap.evaluationInput.submissionInput.collectorId;
    expect(() => createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(
      overlap,
    )).toThrow(/不得兼任/u);
  });

  it('rejects non-applicable model or texture limits for audio', () => {
    const input = proposalInput();
    const audioIndex = input.evaluationInput.submissionInput.artifactObservations
      .findIndex((entry) => (
        entry.kind === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.AUDIO
      ));
    input.artifactLimits[audioIndex]!.maximumWidthPixels = 1;
    expect(() => createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(
      input,
    )).toThrow(/不得为音频/u);
  });

  it('rejects incoherent texture dimension, decoded-byte and GPU maximums', () => {
    const input = proposalInput();
    const textureIndex = input.evaluationInput.submissionInput.artifactObservations
      .findIndex((entry) => (
        entry.kind === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.TEXTURE
      ));
    input.artifactLimits[textureIndex]!.maximumWidthPixels *= 2;
    expect(() => createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(
      input,
    )).toThrow(/不闭合/u);
  });

  it('rejects evidence record locator or SHA reuse across evidence and proposal domains', () => {
    const shaReuse = proposalInput();
    shaReuse.proposalRecordSha256 =
      shaReuse.evaluationInput.submissionInput.reportSha256;
    expect(() => createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(
      shaReuse,
    )).toThrow(/不得复用/u);

    const locatorReuse = proposalInput();
    locatorReuse.proposalRecordLocator =
      locatorReuse.evaluationInput.verificationRecordLocator;
    expect(() => createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(
      locatorReuse,
    )).toThrow(/不得复用/u);

    const environmentShaReuse = proposalInput();
    environmentShaReuse.proposalRecordSha256 =
      environmentShaReuse.evaluationInput.submissionInput
        .environmentObservations[0]!.evidenceSha256;
    expect(() => createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(
      environmentShaReuse,
    )).toThrow(/不得复用/u);
  });

  it('rejects a calendar-invalid proposal timestamp', () => {
    const input = proposalInput();
    input.proposedAtUtc = '2026-02-30T14:00:00.000Z';
    expect(() => createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(
      input,
    )).toThrow(/不是有效 UTC 时间/u);
  });

  it('rejects ambiguous or oversized proposal strings', () => {
    const actor = proposalInput();
    actor.proposerId = ` ${actor.proposerId}`;
    expect(() => createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(
      actor,
    )).toThrow(/首尾空白/u);

    const rationale = proposalInput();
    rationale.headroomRationale = 'x'.repeat(4_097);
    expect(() => createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(
      rationale,
    )).toThrow(/不能超过 4096/u);
  });

  it('publishes only a deferred proposal contract', () => {
    expect(CONTRACT).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      hardGateUsable: false,
      requiresAcceptedIndependentStructuralEvidence: true,
      requires130ArtifactLimitsInCanonicalOrder: true,
      requiresSixEnvironmentLimitsInCanonicalOrder: true,
      proposedMaximumCannotBeBelowAcceptedObservation: true,
      headroomAdequacyRequiresIndependentDisposition: true,
      proposerMustDifferFromEvidenceCollectorAndReviewer: true,
      timestampsRequireCanonicalUtcInstants: true,
      boundedCanonicalEvidenceStringsRequired: true,
      sharedEvidenceValueContractRequired: true,
      canonicalAsciiIdentifiersAndWhitespaceFreeLocatorsRequired: true,
      artifactLimitsBindFormalBudgetEncodedMediaFormatIdentity: true,
      artifactLimitsBindFormalBudgetTextureDecodedMetadataIdentity: true,
      textureMaximumFootprintUsesFormalBudgetDecodedFormat: true,
      textureMaximumDimensionsDecodedBytesAndGpuBytesMustRemainCoherent: true,
      environmentEvidenceRecordsRemainDistinctFromGovernanceRecords: true,
      evidenceRecordLocatorsAndHashesMustRemainDomainDistinct: true,
      proposalCannotChangeCurrentV2Policy: true,
      grantsBudgetApproval: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
  });
});
