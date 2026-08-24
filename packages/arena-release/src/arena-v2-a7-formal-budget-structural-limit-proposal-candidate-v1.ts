import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceSha256,
  assertEvidenceUtcInstant,
} from '@number-strategy-jump/arena-evidence-contracts';
import {
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY,
  ARENA_STAGE7_FORMAL_ASSET_TEXTURE_DECODED_FORMAT_V2,
  type ArenaStage7FormalAssetTextureDecodedFormatV2,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_V2_P7_TARGET_ENVIRONMENTS_CANDIDATE_V1,
} from './arena-v2-p7-preregistration-candidate-v1.js';
import {
  createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1,
} from './arena-v2-a7-formal-budget-structural-evidence-candidate-v1.js';
import {
  assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1 as identifier,
  assertArenaV2A7FormalBudgetEvidenceLocatorCandidateV1 as evidenceLocator,
  assertArenaV2A7FormalBudgetEvidenceTextCandidateV1 as boundedText,
  assertArenaV2A7FormalBudgetNullableEvidenceTextCandidateV1 as nullableText,
} from './arena-v2-a7-formal-budget-evidence-value-candidate-v1.js';

export const ARENA_V2_A7_FORMAL_BUDGET_STRUCTURAL_LIMIT_PROPOSAL_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const INPUT_KEYS = new Set([
  'schemaVersion',
  'evaluationInput',
  'evaluationIdentity',
  'proposalId',
  'proposerId',
  'proposedAtUtc',
  'artifactLimits',
  'environmentLimits',
  'headroomRationale',
  'proposalRecordLocator',
  'proposalRecordSha256',
  'notes',
]);
const ARTIFACT_LIMIT_KEYS = new Set([
  'assetId',
  'maximumEncodedBytes',
  'maximumNodeCount',
  'maximumJointCount',
  'maximumAnimationClipCount',
  'maximumPrimitiveCount',
  'maximumMaterialCount',
  'maximumTextureCount',
  'maximumWidthPixels',
  'maximumHeightPixels',
  'maximumDecodedTextureBytes',
  'maximumDecodedAudioBytes',
  'maximumResidentBytes',
  'maximumGpuBytes',
  'headroomReasonId',
]);
const ENVIRONMENT_LIMIT_KEYS = new Set([
  'environmentId',
  'maximumPeakResidentBytes',
  'maximumPeakGpuBytes',
  'maximumPeakAudioDecodedBytes',
  'maximumAssetUploadMilliseconds',
  'requiresContextRestoreCompleted',
  'requiresCleanupReturnedToBaseline',
  'headroomReasonId',
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

function nonNegativeInteger(value: unknown, name: string): number {
  return assertIntegerAtLeast(value, 0, name);
}

function nonNegativeFinite(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name}必须是非负有限数。`);
  }
  return value;
}

function strictTrue(value: unknown, name: string): true {
  if (value !== true) throw new RangeError(`${name}必须显式为true。`);
  return true;
}

function maximumIntegerAtLeast(
  value: unknown,
  observed: number,
  name: string,
): number {
  const result = nonNegativeInteger(value, name);
  if (result < observed) throw new RangeError(`${name}不得低于已接受观察值${observed}。`);
  return result;
}

function maximumFiniteAtLeast(
  value: unknown,
  observed: number,
  name: string,
): number {
  const result = nonNegativeFinite(value, name);
  if (result < observed) throw new RangeError(`${name}不得低于已接受观察值${observed}。`);
  return result;
}

function decodedTextureFootprintBytes(
  format: ArenaStage7FormalAssetTextureDecodedFormatV2,
  widthPixels: number,
  heightPixels: number,
  name: string,
): number {
  if (format !== ARENA_STAGE7_FORMAL_ASSET_TEXTURE_DECODED_FORMAT_V2.RGBA8) {
    throw new RangeError(`${name}当前只允许Catalog声明的RGBA8纹理解码格式。`);
  }
  const bytesPerPixel = 4;
  if (
    widthPixels > Math.floor(Number.MAX_SAFE_INTEGER / bytesPerPixel)
    || heightPixels > Math.floor(
      Number.MAX_SAFE_INTEGER / (widthPixels * bytesPerPixel),
    )
  ) throw new RangeError(`${name}的RGBA8像素占用超出安全整数范围。`);
  return widthPixels * heightPixels * bytesPerPixel;
}

function normalizeArtifactLimit(
  value: unknown,
  index: number,
  observation: Readonly<Record<string, unknown>>,
) {
  const name = `Arena V2 A7结构上限提案.artifactLimits[${index}]`;
  exactRecord(value, ARTIFACT_LIMIT_KEYS, name);
  if (value.assetId !== observation.assetId) {
    throw new RangeError(`${name}.assetId必须与已接受观察按规范顺序一致。`);
  }
  const policyArtifact = ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS[index];
  if (policyArtifact === undefined || policyArtifact.id !== observation.assetId) {
    throw new RangeError(`${name}必须与预算V2 Policy资产及格式按规范顺序闭合。`);
  }
  const maximumEncodedBytes = maximumIntegerAtLeast(
    value.maximumEncodedBytes,
    observation.currentEncodedBytes as number,
    `${name}.maximumEncodedBytes`,
  );
  const maximumNodeCount = maximumIntegerAtLeast(
    value.maximumNodeCount,
    observation.nodeCount as number,
    `${name}.maximumNodeCount`,
  );
  const maximumJointCount = maximumIntegerAtLeast(
    value.maximumJointCount,
    observation.jointCount as number,
    `${name}.maximumJointCount`,
  );
  const maximumAnimationClipCount = maximumIntegerAtLeast(
    value.maximumAnimationClipCount,
    observation.animationClipCount as number,
    `${name}.maximumAnimationClipCount`,
  );
  const maximumPrimitiveCount = maximumIntegerAtLeast(
    value.maximumPrimitiveCount,
    observation.primitiveCount as number,
    `${name}.maximumPrimitiveCount`,
  );
  const maximumMaterialCount = maximumIntegerAtLeast(
    value.maximumMaterialCount,
    observation.materialCount as number,
    `${name}.maximumMaterialCount`,
  );
  const maximumTextureCount = maximumIntegerAtLeast(
    value.maximumTextureCount,
    observation.textureCount as number,
    `${name}.maximumTextureCount`,
  );
  const maximumWidthPixels = maximumIntegerAtLeast(
    value.maximumWidthPixels,
    observation.widthPixels as number,
    `${name}.maximumWidthPixels`,
  );
  const maximumHeightPixels = maximumIntegerAtLeast(
    value.maximumHeightPixels,
    observation.heightPixels as number,
    `${name}.maximumHeightPixels`,
  );
  const maximumDecodedTextureBytes = maximumIntegerAtLeast(
    value.maximumDecodedTextureBytes,
    observation.decodedTextureBytes as number,
    `${name}.maximumDecodedTextureBytes`,
  );
  const maximumDecodedAudioBytes = maximumIntegerAtLeast(
    value.maximumDecodedAudioBytes,
    observation.decodedAudioBytes as number,
    `${name}.maximumDecodedAudioBytes`,
  );
  const maximumResidentBytes = maximumIntegerAtLeast(
    value.maximumResidentBytes,
    observation.maximumMeasuredResidentBytes as number,
    `${name}.maximumResidentBytes`,
  );
  const maximumGpuBytes = maximumIntegerAtLeast(
    value.maximumGpuBytes,
    observation.maximumMeasuredGpuBytes as number,
    `${name}.maximumGpuBytes`,
  );
  const kind = observation.kind;
  if (kind === 'audio' && (
    maximumNodeCount !== 0
    || maximumJointCount !== 0
    || maximumAnimationClipCount !== 0
    || maximumPrimitiveCount !== 0
    || maximumMaterialCount !== 0
    || maximumTextureCount !== 0
    || maximumWidthPixels !== 0
    || maximumHeightPixels !== 0
    || maximumDecodedTextureBytes !== 0
    || maximumGpuBytes !== 0
  )) throw new RangeError(`${name}不得为音频提案伪造模型、纹理或GPU上限。`);
  if (kind === 'texture' && (
    maximumNodeCount !== 0
    || maximumJointCount !== 0
    || maximumAnimationClipCount !== 0
    || maximumPrimitiveCount !== 0
    || maximumMaterialCount !== 0
    || maximumTextureCount !== 0
    || maximumDecodedAudioBytes !== 0
  )) throw new RangeError(`${name}不得为纹理提案伪造模型或音频上限。`);
  if (kind === 'texture') {
    const maximumDecodedFormatFootprintBytes = decodedTextureFootprintBytes(
      policyArtifact.decodedTextureFormat,
      maximumWidthPixels,
      maximumHeightPixels,
      name,
    );
    if (
      maximumDecodedTextureBytes < maximumDecodedFormatFootprintBytes
      || maximumGpuBytes < maximumDecodedTextureBytes
    ) throw new RangeError(`${name}的纹理宽高、RGBA8解码字节与GPU上限不闭合。`);
  }
  if (kind !== 'audio' && kind !== 'texture' && (
    maximumWidthPixels !== 0
    || maximumHeightPixels !== 0
    || maximumDecodedTextureBytes !== 0
    || maximumDecodedAudioBytes !== 0
  )) throw new RangeError(`${name}的模型外部纹理必须由独立纹理资产上限承担。`);
  return Object.freeze({
    assetId: observation.assetId as string,
    artifactPath: observation.artifactPath as string,
    kind: observation.kind as string,
    encodedMediaFormat: policyArtifact.encodedMediaFormat,
    decodedTextureFormat: policyArtifact.decodedTextureFormat,
    artifactSha256: observation.artifactSha256 as string,
    observed: Object.freeze({
      currentEncodedBytes: observation.currentEncodedBytes as number,
      nodeCount: observation.nodeCount as number,
      jointCount: observation.jointCount as number,
      animationClipCount: observation.animationClipCount as number,
      primitiveCount: observation.primitiveCount as number,
      materialCount: observation.materialCount as number,
      textureCount: observation.textureCount as number,
      widthPixels: observation.widthPixels as number,
      heightPixels: observation.heightPixels as number,
      decodedTextureBytes: observation.decodedTextureBytes as number,
      decodedAudioBytes: observation.decodedAudioBytes as number,
      maximumMeasuredResidentBytes: observation.maximumMeasuredResidentBytes as number,
      maximumMeasuredGpuBytes: observation.maximumMeasuredGpuBytes as number,
    }),
    proposedMaximum: Object.freeze({
      encodedBytes: maximumEncodedBytes,
      nodeCount: maximumNodeCount,
      jointCount: maximumJointCount,
      animationClipCount: maximumAnimationClipCount,
      primitiveCount: maximumPrimitiveCount,
      materialCount: maximumMaterialCount,
      textureCount: maximumTextureCount,
      widthPixels: maximumWidthPixels,
      heightPixels: maximumHeightPixels,
      decodedTextureBytes: maximumDecodedTextureBytes,
      decodedAudioBytes: maximumDecodedAudioBytes,
      residentBytes: maximumResidentBytes,
      gpuBytes: maximumGpuBytes,
    }),
    headroomReasonId: identifier(
      value.headroomReasonId,
      `${name}.headroomReasonId`,
    ),
  });
}

function normalizeEnvironmentLimit(
  value: unknown,
  index: number,
  observation: Readonly<Record<string, unknown>>,
) {
  const name = `Arena V2 A7结构上限提案.environmentLimits[${index}]`;
  exactRecord(value, ENVIRONMENT_LIMIT_KEYS, name);
  const expectedEnvironment = ARENA_V2_P7_TARGET_ENVIRONMENTS_CANDIDATE_V1[index];
  if (
    expectedEnvironment === undefined
    || value.environmentId !== expectedEnvironment.id
    || value.environmentId !== observation.environmentId
  ) throw new RangeError(`${name}必须与P7六环境及已接受观察按规范顺序一致。`);
  return Object.freeze({
    environmentId: expectedEnvironment.id,
    observed: Object.freeze({
      buildIdentitySha256: observation.buildIdentitySha256 as string,
      peakResidentBytes: observation.peakResidentBytes as number,
      peakGpuBytes: observation.peakGpuBytes as number,
      peakAudioDecodedBytes: observation.peakAudioDecodedBytes as number,
      peakAssetUploadMilliseconds: observation.peakAssetUploadMilliseconds as number,
      contextRestoreCompleted: observation.contextRestoreCompleted as boolean,
      cleanupReturnedToBaseline: observation.cleanupReturnedToBaseline as boolean,
      evidenceLocator: observation.evidenceLocator as string,
      evidenceSha256: observation.evidenceSha256 as string,
    }),
    proposedMaximum: Object.freeze({
      peakResidentBytes: maximumIntegerAtLeast(
        value.maximumPeakResidentBytes,
        observation.peakResidentBytes as number,
        `${name}.maximumPeakResidentBytes`,
      ),
      peakGpuBytes: maximumIntegerAtLeast(
        value.maximumPeakGpuBytes,
        observation.peakGpuBytes as number,
        `${name}.maximumPeakGpuBytes`,
      ),
      peakAudioDecodedBytes: maximumIntegerAtLeast(
        value.maximumPeakAudioDecodedBytes,
        observation.peakAudioDecodedBytes as number,
        `${name}.maximumPeakAudioDecodedBytes`,
      ),
      assetUploadMilliseconds: maximumFiniteAtLeast(
        value.maximumAssetUploadMilliseconds,
        observation.peakAssetUploadMilliseconds as number,
        `${name}.maximumAssetUploadMilliseconds`,
      ),
    }),
    requiresContextRestoreCompleted: strictTrue(
      value.requiresContextRestoreCompleted,
      `${name}.requiresContextRestoreCompleted`,
    ),
    requiresCleanupReturnedToBaseline: strictTrue(
      value.requiresCleanupReturnedToBaseline,
      `${name}.requiresCleanupReturnedToBaseline`,
    ),
    headroomReasonId: identifier(
      value.headroomReasonId,
      `${name}.headroomReasonId`,
    ),
  });
}

function artifactLimitHasStrictHeadroom(
  entry: ReturnType<typeof normalizeArtifactLimit>,
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

/** Creates a reviewable proposal only; it never changes the current V2 policy. */
export function createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1(
  value: unknown,
) {
  const source = cloneFrozenData(value, 'Arena V2 A7结构预算上限提案候选V1');
  exactRecord(source, INPUT_KEYS, 'Arena V2 A7结构预算上限提案候选V1');
  if (
    source.schemaVersion
      !== ARENA_V2_A7_FORMAL_BUDGET_STRUCTURAL_LIMIT_PROPOSAL_CANDIDATE_V1_SCHEMA_VERSION
  ) throw new RangeError('Arena V2 A7结构预算上限提案schemaVersion无效。');
  const evaluation =
    createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1(
      source.evaluationInput,
    );
  if (
    source.evaluationIdentity !== evaluation.evaluationIdentity
    || evaluation.evaluationStatus !== 'accepted'
    || !evaluation.evidenceIdentityAccepted
    || !evaluation.eligibleForSeparateStructuralLimitProposal
    || evaluation.policyId
      !== ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY.policyId
    || evaluation.policyContentHash
      !== ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY
        .policyContentHash
    || evaluation.grantsBudgetApproval
    || evaluation.hardGate
    || evaluation.hardGateUsable
  ) throw new RangeError('Arena V2 A7结构上限提案只接受当前独立接受的结构证据。');
  const proposerId = identifier(source.proposerId, 'A7结构上限提案.proposerId');
  if (proposerId === evaluation.collectorId || proposerId === evaluation.reviewerId) {
    throw new RangeError('Arena V2 A7结构上限Proposer不得兼任证据Collector或Reviewer。');
  }
  const proposedAtUtc = assertEvidenceUtcInstant(
    source.proposedAtUtc,
    'A7结构上限提案.proposedAtUtc',
  );
  if (proposedAtUtc < evaluation.reviewedAtUtc) {
    throw new RangeError('Arena V2 A7结构上限提案时间不得早于证据独立评估。');
  }
  if (!Array.isArray(source.artifactLimits)
    || source.artifactLimits.length !== evaluation.artifactObservations.length) {
    throw new RangeError('Arena V2 A7结构上限提案必须精确包含130项资产上限。');
  }
  if (!Array.isArray(source.environmentLimits)
    || source.environmentLimits.length !== evaluation.environmentObservations.length) {
    throw new RangeError('Arena V2 A7结构上限提案必须精确包含六环境上限。');
  }
  const artifactLimits = Object.freeze(source.artifactLimits.map((entry, index) => (
    normalizeArtifactLimit(
      entry,
      index,
      evaluation.artifactObservations[index] as Readonly<Record<string, unknown>>,
    )
  )));
  const environmentLimits = Object.freeze(source.environmentLimits.map((entry, index) => (
    normalizeEnvironmentLimit(
      entry,
      index,
      evaluation.environmentObservations[index] as Readonly<Record<string, unknown>>,
    )
  )));
  const strictHeadroomAssetCount = artifactLimits.filter(
    artifactLimitHasStrictHeadroom,
  ).length;
  const strictHeadroomEnvironmentCount = environmentLimits.filter((entry) => (
    entry.proposedMaximum.peakResidentBytes > entry.observed.peakResidentBytes
    || entry.proposedMaximum.peakGpuBytes > entry.observed.peakGpuBytes
    || entry.proposedMaximum.peakAudioDecodedBytes > entry.observed.peakAudioDecodedBytes
    || entry.proposedMaximum.assetUploadMilliseconds
      > entry.observed.peakAssetUploadMilliseconds
  )).length;
  const proposalRecordLocator = evidenceLocator(
    source.proposalRecordLocator,
    'A7结构上限提案.proposalRecordLocator',
  );
  const proposalRecordSha256 = assertEvidenceSha256(
    source.proposalRecordSha256,
    'A7结构上限提案.proposalRecordSha256',
  );
  const structuralEvidenceEnvironmentRecords = Object.freeze(
    evaluation.environmentObservations.map((entry) => Object.freeze({
      environmentId: entry.environmentId,
      evidenceLocator: entry.evidenceLocator,
      evidenceSha256: entry.evidenceSha256,
    })),
  );
  if (
    proposalRecordLocator === evaluation.reportLocator
    || proposalRecordLocator === evaluation.verificationRecordLocator
    || proposalRecordSha256 === evaluation.reportSha256
    || proposalRecordSha256 === evaluation.verificationRecordSha256
    || structuralEvidenceEnvironmentRecords.some(
      (entry) => entry.evidenceLocator === proposalRecordLocator,
    )
    || structuralEvidenceEnvironmentRecords.some(
      (entry) => entry.evidenceSha256 === proposalRecordSha256,
    )
  ) throw new RangeError('Arena V2 A7结构上限提案记录不得复用环境、总报告或评估证据身份。');
  const normalized = Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_BUDGET_STRUCTURAL_LIMIT_PROPOSAL_CANDIDATE_V1_SCHEMA_VERSION,
    proposalId: identifier(source.proposalId, 'A7结构上限提案.proposalId'),
    proposerId,
    proposedAtUtc,
    structuralEvidenceSubmissionIdentity: evaluation.submissionIdentity,
    structuralEvidenceEvaluationIdentity: evaluation.evaluationIdentity,
    structuralEvidenceObservationBatchId: evaluation.observationBatchId,
    structuralEvidenceCapturedAtUtc: evaluation.capturedAtUtc,
    structuralEvidenceReviewedAtUtc: evaluation.reviewedAtUtc,
    structuralEvidenceCollectorId: evaluation.collectorId,
    structuralEvidenceReviewerId: evaluation.reviewerId,
    structuralEvidenceReportLocator: evaluation.reportLocator,
    structuralEvidenceReportSha256: evaluation.reportSha256,
    structuralEvidenceVerificationRecordLocator:
      evaluation.verificationRecordLocator,
    structuralEvidenceVerificationRecordSha256:
      evaluation.verificationRecordSha256,
    structuralEvidenceEnvironmentRecords,
    policyId: evaluation.policyId,
    policyContentHash: evaluation.policyContentHash,
    catalogContentHash: evaluation.catalogContentHash,
    sourceCommit: evaluation.sourceCommit,
    packageLockSha256: evaluation.packageLockSha256,
    toolchainIdentitySha256: evaluation.toolchainIdentitySha256,
    environmentBuilds: evaluation.environmentBuilds,
    artifactLimits,
    environmentLimits,
    headroomRationale: boundedText(
      source.headroomRationale,
      'A7结构上限提案.headroomRationale',
    ),
    proposalRecordLocator,
    proposalRecordSha256,
    notes: nullableText(source.notes, 'A7结构上限提案.notes'),
    summary: Object.freeze({
      artifactLimitCount: artifactLimits.length,
      environmentLimitCount: environmentLimits.length,
      strictHeadroomAssetCount,
      zeroHeadroomAssetCount: artifactLimits.length - strictHeadroomAssetCount,
      strictHeadroomEnvironmentCount,
      zeroHeadroomEnvironmentCount:
        environmentLimits.length - strictHeadroomEnvironmentCount,
    }),
  });
  const structuralLimitProposalIdentity = createDeterministicDataHash(
    normalized,
    'Arena V2 A7 formal budget structural limit proposal candidate V1',
  );
  return Object.freeze({
    ...normalized,
    structuralLimitProposalIdentity,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    proposalStatus: 'proposed-not-independently-approved' as const,
    eligibleForIndependentBudgetApprovalDecision: true as const,
    headroomAdequacyDecidedHere: false as const,
    zeroHeadroomRequiresExplicitIndependentDisposition: true as const,
    proposalCannotChangeCurrentV2Policy: true as const,
    currentV2ApprovalStatus: 'proposed-not-approved' as const,
    currentV2StructuralLimitsStatus: 'unresolved-not-approved' as const,
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

export const ARENA_V2_A7_FORMAL_BUDGET_STRUCTURAL_LIMIT_PROPOSAL_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_BUDGET_STRUCTURAL_LIMIT_PROPOSAL_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.a7.formal-budget-structural-limit-proposal.candidate.v1' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    hardGateUsable: false as const,
    currentAllowedScope: 'plain-data-structural-limit-proposal-only' as const,
    requiresAcceptedIndependentStructuralEvidence: true as const,
    requires130ArtifactLimitsInCanonicalOrder: true as const,
    requiresSixEnvironmentLimitsInCanonicalOrder: true as const,
    proposedMaximumCannotBeBelowAcceptedObservation: true as const,
    headroomAdequacyRequiresIndependentDisposition: true as const,
    proposerMustDifferFromEvidenceCollectorAndReviewer: true as const,
    proposalRetainsPriorActorIdsForIndependentApproval: true as const,
    timestampsRequireCanonicalUtcInstants: true as const,
    boundedCanonicalEvidenceStringsRequired: true as const,
    sharedEvidenceValueContractRequired: true as const,
    canonicalAsciiIdentifiersAndWhitespaceFreeLocatorsRequired: true as const,
    artifactLimitsBindFormalBudgetEncodedMediaFormatIdentity: true as const,
    artifactLimitsBindFormalBudgetTextureDecodedMetadataIdentity: true as const,
    textureMaximumFootprintUsesFormalBudgetDecodedFormat: true as const,
    textureMaximumDimensionsDecodedBytesAndGpuBytesMustRemainCoherent: true as const,
    environmentEvidenceRecordsRemainDistinctFromGovernanceRecords: true as const,
    acceptedEnvironmentObservationsRetainEvidenceLocatorAndSha256: true as const,
    proposalRetainsStructuralEvidenceCaptureProvenance: true as const,
    proposalRetainsStructuralEvidenceReviewTimeline: true as const,
    evidenceRecordLocatorsAndHashesMustRemainDomainDistinct: true as const,
    proposalCannotChangeCurrentV2Policy: true as const,
    grantsBudgetApproval: false as const,
    writesFilesOrPolicy: false as const,
    runsMeasurementTools: false as const,
    createsOrModifiesAssets: false as const,
    loadsAssets: false as const,
    publishesRelease: false as const,
    defaultFormalBundleConsumes: false as const,
    defaultPreloaderConsumes: false as const,
    defaultEntryConsumes: false as const,
  });

export type ArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1 =
  ReturnType<typeof createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1>;
