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
  ARENA_V2_A7_FORMAL_BUDGET_STRUCTURAL_EVIDENCE_CANDIDATE_V1 as CONTRACT,
  ARENA_V2_P7_TARGET_ENVIRONMENTS_CANDIDATE_V1,
  createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1,
  createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1,
  createArenaV2A7FormalBudgetEvidenceProjectionCandidateV1,
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
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1
        .catalogContentHash,
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

describe('Arena V2 A7 formal budget structural evidence candidate V1 (not run)', () => {
  it('captures exact 130-asset and six-environment observations without approving limits', () => {
    const submission =
      createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1(
        submissionInput(),
      );
    expect(submission).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      submissionStatus: 'captured-reference-awaiting-independent-evaluation',
      artifactObservationCount: 130,
      environmentObservationCount: 6,
      eligibleForIndependentEvaluation: true,
      containsApprovedStructuralLimits: false,
      grantsBudgetApproval: false,
      hardGate: false,
      hardGateUsable: false,
      runsMeasurementTools: false,
      writesFilesOrEvidence: false,
    });
    expect(submission.submissionIdentity).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('accepts independently verified evidence identity but still does not define limits', () => {
    const evaluation =
      createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1(
        acceptedEvaluationInput(),
      );
    expect(evaluation).toMatchObject({
      evaluationStatus: 'accepted',
      evidenceIdentityAccepted: true,
      eligibleForSeparateStructuralLimitProposal: true,
      acceptedEvidenceDoesNotDefineOrApproveLimits: true,
      grantsBudgetApproval: false,
      hardGate: false,
      hardGateUsable: false,
      publishesRelease: false,
    });
    expect(evaluation.evaluationIdentity).toMatch(/^[a-f0-9]{64}$/u);

    const projection = createArenaV2A7FormalBudgetEvidenceProjectionCandidateV1({
      evaluationInput: acceptedEvaluationInput(),
      evaluationIdentity: evaluation.evaluationIdentity,
    });
    expect(projection).toMatchObject({
      producesA7V2ObservationInputOnly: true,
      definesOrApprovesStructuralLimits: false,
      grantsBudgetApproval: false,
      hardGate: false,
      hardGateUsable: false,
      formalBudgetEvidence: {
        artifactObservationCount: 130,
        status: 'passed',
        evidenceSha256: 'd'.repeat(64),
        failureReason: null,
      },
    });
  });

  it('rejects dirty source, coverage drift, reviewer overlap and false acceptance', () => {
    const input = submissionInput();
    expect(() => createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1({
      ...input,
      sourceDirty: true,
    })).toThrow(/clean source/u);
    expect(() => createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1({
      ...input,
      artifactObservations: input.artifactObservations.slice(1),
    })).toThrow(/130项/u);

    const evaluation = acceptedEvaluationInput();
    expect(() => createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1({
      ...evaluation,
      reviewerId: evaluation.submissionInput.collectorId,
    })).toThrow(/不得兼任/u);
    expect(() => createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1({
      ...evaluation,
      structuralMetricsVerified: false,
    })).toThrow(/接受必须闭合/u);
  });

  it('keeps the independent evaluation record identity distinct from the observation report', () => {
    const evaluation = acceptedEvaluationInput();
    expect(() => createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1({
      ...evaluation,
      verificationRecordLocator: evaluation.submissionInput.reportLocator,
    })).toThrow(/不得复用/u);
    expect(() => createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1({
      ...evaluation,
      verificationRecordSha256: evaluation.submissionInput.reportSha256,
    })).toThrow(/不得复用/u);

    expect(() => createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1({
      ...evaluation,
      verificationRecordLocator:
        evaluation.submissionInput.environmentObservations[0]!.evidenceLocator,
    })).toThrow(/不得复用/u);
  });

  it('keeps the aggregate report identity distinct from six environment records', () => {
    const input = submissionInput();
    input.reportSha256 = input.environmentObservations[0]!.evidenceSha256;
    expect(() => createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1(
      input,
    )).toThrow(/不得复用/u);
  });

  it('rejects calendar-invalid evidence timestamps that only resemble UTC instants', () => {
    const submission = submissionInput();
    expect(() => createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1({
      ...submission,
      capturedAtUtc: '2026-99-99T12:00:00.000Z',
    })).toThrow(/不是有效 UTC 时间/u);

    const evaluation = acceptedEvaluationInput();
    expect(() => createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1({
      ...evaluation,
      reviewedAtUtc: '2026-02-30T13:00:00.000Z',
    })).toThrow(/不是有效 UTC 时间/u);
  });

  it('rejects ambiguous actor identities and unbounded or control-bearing locators', () => {
    const evaluation = acceptedEvaluationInput();
    expect(() => createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1({
      ...evaluation,
      reviewerId: ` ${evaluation.reviewerId}`,
    })).toThrow(/首尾空白/u);

    const controlLocator = submissionInput();
    controlLocator.environmentObservations[0]!.evidenceLocator += '\n';
    expect(() => createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1(
      controlLocator,
    )).toThrow(/控制字符/u);

    const oversizedLocator = submissionInput();
    oversizedLocator.reportLocator = `evidence://${'x'.repeat(2_048)}`;
    expect(() => createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1(
      oversizedLocator,
    )).toThrow(/不能超过 2048/u);

    const confusableActor = submissionInput();
    confusableActor.collectorId = 'structural-evidence-collector-０01';
    expect(() => createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1(
      confusableActor,
    )).toThrow(/小写ASCII规范标识/u);

    const whitespaceLocator = submissionInput();
    whitespaceLocator.reportLocator = 'evidence://arena-v2/a7/structural/report 001';
    expect(() => createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1(
      whitespaceLocator,
    )).toThrow(/不允许包含空白/u);
  });

  it('rejects texture dimensions that do not match formal budget catalog metadata', () => {
    const input = submissionInput();
    const textureIndex = input.artifactObservations.findIndex(
      (entry) => entry.kind === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.TEXTURE,
    );
    input.artifactObservations[textureIndex]!.widthPixels = 1;
    input.artifactObservations[textureIndex]!.heightPixels =
      input.artifactObservations[textureIndex]!.decodedTextureBytes / 4;
    expect(() => createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1(
      input,
    )).toThrow(/纹理结构语义/u);
  });

  it('publishes only a deferred evidence contract', () => {
    expect(CONTRACT).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      hardGateUsable: false,
      requiredArtifactObservationCount: 130,
      requiredEnvironmentObservationCount: 6,
      submissionBindsCurrentCatalogPolicySourceAndBuild: true,
      independentReviewerRequired: true,
      timestampsRequireCanonicalUtcInstants: true,
      boundedCanonicalEvidenceStringsRequired: true,
      sharedEvidenceValueContractRequired: true,
      canonicalAsciiIdentifiersAndWhitespaceFreeLocatorsRequired: true,
      artifactObservationsBindFormalBudgetEncodedMediaFormatIdentity: true,
      textureObservationsBindFormalBudgetDecodedFormatIdentity: true,
      currentTextureDimensionsMustMatchFormalBudgetCatalogMetadata: true,
      environmentEvidenceRecordsRemainDistinctFromGovernanceRecords: true,
      evidenceRecordLocatorsAndHashesMustRemainDomainDistinct: true,
      acceptedEvaluationProjectsToA7V2ObservationInput: true,
      acceptedEvidenceDoesNotDefineOrApproveLimits: true,
      runsMeasurementTools: false,
      writesFilesOrEvidence: false,
      grantsBudgetApproval: false,
      publishesRelease: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
  });
});
