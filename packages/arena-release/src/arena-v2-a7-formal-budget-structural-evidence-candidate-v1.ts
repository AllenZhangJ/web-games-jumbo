import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
  cloneFrozenStringSet,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceGitCommit,
  assertEvidenceSha256,
  assertEvidenceUtcInstant,
} from '@number-strategy-jump/arena-evidence-contracts';
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
} from './arena-v2-p7-preregistration-candidate-v1.js';
import {
  assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1 as identifier,
  assertArenaV2A7FormalBudgetEvidenceLocatorCandidateV1 as evidenceLocator,
  assertArenaV2A7FormalBudgetNullableEvidenceTextCandidateV1 as nullableText,
} from './arena-v2-a7-formal-budget-evidence-value-candidate-v1.js';

export const ARENA_V2_A7_FORMAL_BUDGET_STRUCTURAL_EVIDENCE_SUBMISSION_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;
export const ARENA_V2_A7_FORMAL_BUDGET_STRUCTURAL_EVIDENCE_EVALUATION_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const SUBMISSION_KEYS = new Set([
  'schemaVersion',
  'policyId',
  'policyContentHash',
  'catalogContentHash',
  'sourceCommit',
  'sourceDirty',
  'packageLockSha256',
  'toolchainIdentitySha256',
  'observationBatchId',
  'collectorId',
  'capturedAtUtc',
  'artifactObservations',
  'environmentObservations',
  'reportLocator',
  'reportSha256',
  'notes',
]);
const ARTIFACT_OBSERVATION_KEYS = new Set([
  'assetId',
  'artifactPath',
  'kind',
  'artifactSha256',
  'currentEncodedBytes',
  'decodedTextureBytes',
  'nodeCount',
  'jointCount',
  'animationClipCount',
  'primitiveCount',
  'materialCount',
  'textureCount',
  'widthPixels',
  'heightPixels',
  'decodedAudioBytes',
  'maximumMeasuredResidentBytes',
  'maximumMeasuredGpuBytes',
]);
const ENVIRONMENT_OBSERVATION_KEYS = new Set([
  'environmentId',
  'buildIdentitySha256',
  'peakResidentBytes',
  'peakGpuBytes',
  'peakAudioDecodedBytes',
  'peakAssetUploadMilliseconds',
  'contextRestoreCompleted',
  'cleanupReturnedToBaseline',
  'evidenceLocator',
  'evidenceSha256',
]);
const EVALUATION_KEYS = new Set([
  'schemaVersion',
  'submissionInput',
  'submissionIdentity',
  'verifiedReportSha256',
  'artifactCoverageVerified',
  'structuralMetricsVerified',
  'environmentCoverageVerified',
  'sourceAndBuildIdentityVerified',
  'verificationRecordLocator',
  'verificationRecordSha256',
  'reviewerId',
  'reviewedAtUtc',
  'decision',
  'reasonIds',
  'notes',
]);
const A7_V2_PROJECTION_KEYS = new Set([
  'evaluationInput',
  'evaluationIdentity',
]);

const ACCEPT_REASON_ID =
  'identity-coverage-structure-and-environment-verified' as const;
const REJECTION_REASON_IDS: ReadonlySet<string> = new Set([
  'report-sha-mismatch',
  'artifact-coverage-invalid',
  'structural-metrics-invalid',
  'environment-coverage-invalid',
  'source-build-identity-invalid',
  'independent-review-rejected',
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

function positiveInteger(value: unknown, name: string): number {
  return assertIntegerAtLeast(value, 1, name);
}

function nonNegativeFinite(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name}必须是非负有限数。`);
  }
  return value;
}

function strictBoolean(value: unknown, name: string): boolean {
  if (value !== true && value !== false) throw new TypeError(`${name}必须是boolean。`);
  return value;
}

function normalizeArtifactObservation(
  value: unknown,
  index: number,
) {
  const name = `Arena V2 A7结构预算证据.artifactObservations[${index}]`;
  exactRecord(value, ARTIFACT_OBSERVATION_KEYS, name);
  const artifact = ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS[index];
  const ledgerEntry =
    ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries[index];
  if (
    artifact === undefined
    || ledgerEntry === undefined
    || value.assetId !== artifact.id
    || value.assetId !== ledgerEntry.assetId
    || value.artifactPath !== artifact.path
    || value.artifactPath !== ledgerEntry.artifactPath
    || value.kind !== artifact.kind
    || value.artifactSha256 !== artifact.sha256
    || value.artifactSha256 !== ledgerEntry.sha256
    || value.currentEncodedBytes !== artifact.currentEncodedBytes
    || value.currentEncodedBytes !== ledgerEntry.byteLength
    || value.decodedTextureBytes !== artifact.decodedTextureBytes
  ) throw new RangeError(`${name}必须与当前Catalog、账本和预算候选逐项同序闭合。`);

  const nodeCount = nonNegativeInteger(value.nodeCount, `${name}.nodeCount`);
  const jointCount = nonNegativeInteger(value.jointCount, `${name}.jointCount`);
  const animationClipCount = nonNegativeInteger(
    value.animationClipCount,
    `${name}.animationClipCount`,
  );
  const primitiveCount = nonNegativeInteger(
    value.primitiveCount,
    `${name}.primitiveCount`,
  );
  const materialCount = nonNegativeInteger(value.materialCount, `${name}.materialCount`);
  const textureCount = nonNegativeInteger(value.textureCount, `${name}.textureCount`);
  const widthPixels = nonNegativeInteger(value.widthPixels, `${name}.widthPixels`);
  const heightPixels = nonNegativeInteger(value.heightPixels, `${name}.heightPixels`);
  const decodedAudioBytes = nonNegativeInteger(
    value.decodedAudioBytes,
    `${name}.decodedAudioBytes`,
  );
  const maximumMeasuredResidentBytes = positiveInteger(
    value.maximumMeasuredResidentBytes,
    `${name}.maximumMeasuredResidentBytes`,
  );
  const maximumMeasuredGpuBytes = nonNegativeInteger(
    value.maximumMeasuredGpuBytes,
    `${name}.maximumMeasuredGpuBytes`,
  );
  const isAudio = artifact.kind === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.AUDIO;
  const isTexture = artifact.kind
    === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.TEXTURE;
  const isCharacter = artifact.kind
    === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.CHARACTER_MODEL;
  const isModel = !isAudio && !isTexture;
  if (isAudio && (
    nodeCount !== 0
    || jointCount !== 0
    || animationClipCount !== 0
    || primitiveCount !== 0
    || materialCount !== 0
    || textureCount !== 0
    || widthPixels !== 0
    || heightPixels !== 0
    || decodedAudioBytes === 0
    || maximumMeasuredGpuBytes !== 0
  )) throw new RangeError(`${name}的音频指标必须使用音频结构语义。`);
  if (isTexture && (
    nodeCount !== 0
    || jointCount !== 0
    || animationClipCount !== 0
    || primitiveCount !== 0
    || materialCount !== 0
    || textureCount !== 0
    || widthPixels === 0
    || heightPixels === 0
    || widthPixels !== artifact.widthPixels
    || heightPixels !== artifact.heightPixels
    || decodedAudioBytes !== 0
    || maximumMeasuredGpuBytes === 0
    || maximumMeasuredGpuBytes < artifact.decodedTextureBytes
  )) throw new RangeError(`${name}的纹理指标必须使用纹理结构语义。`);
  if (isModel && (
    nodeCount === 0
    || primitiveCount === 0
    || widthPixels !== 0
    || heightPixels !== 0
    || decodedAudioBytes !== 0
    || maximumMeasuredGpuBytes === 0
  )) throw new RangeError(`${name}的模型指标必须使用模型结构语义。`);
  if (isCharacter && (jointCount === 0 || animationClipCount === 0)) {
    throw new RangeError(`${name}的角色模型必须记录关节和动作片段。`);
  }
  return Object.freeze({
    assetId: artifact.id,
    artifactPath: artifact.path,
    kind: artifact.kind,
    artifactSha256: artifact.sha256,
    currentEncodedBytes: artifact.currentEncodedBytes,
    decodedTextureBytes: artifact.decodedTextureBytes,
    nodeCount,
    jointCount,
    animationClipCount,
    primitiveCount,
    materialCount,
    textureCount,
    widthPixels,
    heightPixels,
    decodedAudioBytes,
    maximumMeasuredResidentBytes,
    maximumMeasuredGpuBytes,
  });
}

function normalizeEnvironmentObservation(value: unknown, index: number) {
  const name = `Arena V2 A7结构预算证据.environmentObservations[${index}]`;
  exactRecord(value, ENVIRONMENT_OBSERVATION_KEYS, name);
  const expected = ARENA_V2_P7_TARGET_ENVIRONMENTS_CANDIDATE_V1[index];
  if (expected === undefined || value.environmentId !== expected.id) {
    throw new RangeError(`${name}必须按P7六环境规范顺序闭合。`);
  }
  return Object.freeze({
    environmentId: expected.id,
    buildIdentitySha256: assertEvidenceSha256(
      value.buildIdentitySha256,
      `${name}.buildIdentitySha256`,
    ),
    peakResidentBytes: positiveInteger(value.peakResidentBytes, `${name}.peakResidentBytes`),
    peakGpuBytes: nonNegativeInteger(value.peakGpuBytes, `${name}.peakGpuBytes`),
    peakAudioDecodedBytes: nonNegativeInteger(
      value.peakAudioDecodedBytes,
      `${name}.peakAudioDecodedBytes`,
    ),
    peakAssetUploadMilliseconds: nonNegativeFinite(
      value.peakAssetUploadMilliseconds,
      `${name}.peakAssetUploadMilliseconds`,
    ),
    contextRestoreCompleted: strictBoolean(
      value.contextRestoreCompleted,
      `${name}.contextRestoreCompleted`,
    ),
    cleanupReturnedToBaseline: strictBoolean(
      value.cleanupReturnedToBaseline,
      `${name}.cleanupReturnedToBaseline`,
    ),
    evidenceLocator: evidenceLocator(value.evidenceLocator, `${name}.evidenceLocator`),
    evidenceSha256: assertEvidenceSha256(value.evidenceSha256, `${name}.evidenceSha256`),
  });
}

/** Captures measured structure and six-environment observations only. */
export function createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1(
  value: unknown,
) {
  const source = cloneFrozenData(value, 'Arena V2 A7结构预算证据提交候选V1');
  exactRecord(source, SUBMISSION_KEYS, 'Arena V2 A7结构预算证据提交候选V1');
  const policy = ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY;
  const ledger = ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1;
  if (
    source.schemaVersion
      !== ARENA_V2_A7_FORMAL_BUDGET_STRUCTURAL_EVIDENCE_SUBMISSION_CANDIDATE_V1_SCHEMA_VERSION
    || source.policyId !== policy.policyId
    || source.policyContentHash !== policy.policyContentHash
    || source.catalogContentHash !== ledger.catalogContentHash
    || policy.artifactCount !== ledger.entries.length
    || policy.approvalStatus !== 'proposed-not-approved'
    || policy.hardGateUsable
  ) throw new RangeError('Arena V2 A7结构预算证据必须绑定当前未批准130项预算与Catalog身份。');
  if (source.sourceDirty !== false) {
    throw new RangeError('Arena V2 A7结构预算证据只接受clean source构建。');
  }
  if (!Array.isArray(source.artifactObservations)
    || source.artifactObservations.length !== policy.artifactCount) {
    throw new RangeError('Arena V2 A7结构预算证据必须精确包含130项资产观察。');
  }
  if (!Array.isArray(source.environmentObservations)
    || source.environmentObservations.length
      !== ARENA_V2_P7_TARGET_ENVIRONMENTS_CANDIDATE_V1.length) {
    throw new RangeError('Arena V2 A7结构预算证据必须精确包含P7六环境观察。');
  }
  const artifactObservations = Object.freeze(source.artifactObservations.map(
    normalizeArtifactObservation,
  ));
  const environmentObservations = Object.freeze(source.environmentObservations.map(
    normalizeEnvironmentObservation,
  ));
  if (
    new Set(environmentObservations.map(({ evidenceLocator }) => evidenceLocator)).size
      !== environmentObservations.length
    || new Set(environmentObservations.map(({ evidenceSha256 }) => evidenceSha256)).size
      !== environmentObservations.length
  ) throw new RangeError('Arena V2 A7六环境结构预算证据Locator与SHA必须逐环境唯一。');
  const reportLocator = evidenceLocator(
    source.reportLocator,
    'A7结构预算.reportLocator',
  );
  const reportSha256 = assertEvidenceSha256(
    source.reportSha256,
    'A7结构预算.reportSha256',
  );
  if (
    environmentObservations.some((entry) => entry.evidenceLocator === reportLocator)
    || environmentObservations.some((entry) => entry.evidenceSha256 === reportSha256)
  ) throw new RangeError('Arena V2 A7结构观察总报告不得复用六环境原始证据身份。');
  const normalized = Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_BUDGET_STRUCTURAL_EVIDENCE_SUBMISSION_CANDIDATE_V1_SCHEMA_VERSION,
    policyId: policy.policyId,
    policyContentHash: policy.policyContentHash,
    catalogContentHash: ledger.catalogContentHash,
    sourceCommit: assertEvidenceGitCommit(source.sourceCommit, 'A7结构预算.sourceCommit'),
    sourceDirty: false as const,
    packageLockSha256: assertEvidenceSha256(
      source.packageLockSha256,
      'A7结构预算.packageLockSha256',
    ),
    toolchainIdentitySha256: assertEvidenceSha256(
      source.toolchainIdentitySha256,
      'A7结构预算.toolchainIdentitySha256',
    ),
    observationBatchId: identifier(
      source.observationBatchId,
      'A7结构预算.observationBatchId',
    ),
    collectorId: identifier(source.collectorId, 'A7结构预算.collectorId'),
    capturedAtUtc: assertEvidenceUtcInstant(
      source.capturedAtUtc,
      'A7结构预算.capturedAtUtc',
    ),
    artifactObservations,
    environmentObservations,
    reportLocator,
    reportSha256,
    notes: nullableText(source.notes, 'A7结构预算.notes'),
  });
  const submissionIdentity = createDeterministicDataHash(
    normalized,
    'Arena V2 A7 formal budget structural evidence submission candidate V1',
  );
  return Object.freeze({
    ...normalized,
    submissionIdentity,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    submissionStatus: 'captured-reference-awaiting-independent-evaluation' as const,
    artifactObservationCount: artifactObservations.length,
    environmentObservationCount: environmentObservations.length,
    eligibleForIndependentEvaluation: true as const,
    containsApprovedStructuralLimits: false as const,
    grantsBudgetApproval: false as const,
    hardGate: false as const,
    hardGateUsable: false as const,
    writesFilesOrEvidence: false as const,
    runsMeasurementTools: false as const,
    createsOrModifiesAssets: false as const,
    loadsAssets: false as const,
    publishesRelease: false as const,
  });
}

/** Independently evaluates the submitted evidence identity, not budget limits. */
export function createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1(
  value: unknown,
) {
  const source = cloneFrozenData(value, 'Arena V2 A7结构预算证据独立评估候选V1');
  exactRecord(source, EVALUATION_KEYS, 'Arena V2 A7结构预算证据独立评估候选V1');
  if (
    source.schemaVersion
      !== ARENA_V2_A7_FORMAL_BUDGET_STRUCTURAL_EVIDENCE_EVALUATION_CANDIDATE_V1_SCHEMA_VERSION
  ) throw new RangeError('Arena V2 A7结构预算证据独立评估schemaVersion无效。');
  const submission = createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1(
    source.submissionInput,
  );
  if (
    source.submissionIdentity !== submission.submissionIdentity
    || !submission.eligibleForIndependentEvaluation
    || submission.grantsBudgetApproval
    || submission.hardGate
    || submission.hardGateUsable
  ) throw new RangeError('Arena V2 A7结构预算证据提交身份或关闭门状态漂移。');
  const reviewerId = identifier(source.reviewerId, 'A7结构预算评估.reviewerId');
  if (reviewerId === submission.collectorId) {
    throw new RangeError('Arena V2 A7结构预算证据reviewer不得兼任collector。');
  }
  const reviewedAtUtc = assertEvidenceUtcInstant(
    source.reviewedAtUtc,
    'A7结构预算评估.reviewedAtUtc',
  );
  if (reviewedAtUtc < submission.capturedAtUtc) {
    throw new RangeError('Arena V2 A7结构预算证据评估时间不得早于采集时间。');
  }
  const verifiedReportSha256 = assertEvidenceSha256(
    source.verifiedReportSha256,
    'A7结构预算评估.verifiedReportSha256',
  );
  const artifactCoverageVerified = strictBoolean(
    source.artifactCoverageVerified,
    'A7结构预算评估.artifactCoverageVerified',
  );
  const structuralMetricsVerified = strictBoolean(
    source.structuralMetricsVerified,
    'A7结构预算评估.structuralMetricsVerified',
  );
  const environmentCoverageVerified = strictBoolean(
    source.environmentCoverageVerified,
    'A7结构预算评估.environmentCoverageVerified',
  );
  const sourceAndBuildIdentityVerified = strictBoolean(
    source.sourceAndBuildIdentityVerified,
    'A7结构预算评估.sourceAndBuildIdentityVerified',
  );
  const evaluationDecision = source.decision;
  if (evaluationDecision !== 'accepted' && evaluationDecision !== 'rejected') {
    throw new RangeError('Arena V2 A7结构预算证据评估decision无效。');
  }
  const reasonIds = cloneFrozenStringSet(
    source.reasonIds as readonly unknown[],
    'A7结构预算评估.reasonIds',
  );
  if (evaluationDecision === 'accepted') {
    if (
      verifiedReportSha256 !== submission.reportSha256
      || !artifactCoverageVerified
      || !structuralMetricsVerified
      || !environmentCoverageVerified
      || !sourceAndBuildIdentityVerified
      || reasonIds.length !== 1
      || reasonIds[0] !== ACCEPT_REASON_ID
    ) throw new RangeError('Arena V2 A7结构预算证据接受必须闭合报告、覆盖、指标和构建身份。');
  } else if (
    reasonIds.length === 0
    || reasonIds.some((reasonId) => !REJECTION_REASON_IDS.has(reasonId))
    || (verifiedReportSha256 !== submission.reportSha256
      && !reasonIds.includes('report-sha-mismatch'))
    || (!artifactCoverageVerified && !reasonIds.includes('artifact-coverage-invalid'))
    || (!structuralMetricsVerified && !reasonIds.includes('structural-metrics-invalid'))
    || (!environmentCoverageVerified
      && !reasonIds.includes('environment-coverage-invalid'))
    || (!sourceAndBuildIdentityVerified
      && !reasonIds.includes('source-build-identity-invalid'))
  ) throw new RangeError('Arena V2 A7结构预算证据拒绝原因必须覆盖失败事实。');
  const verificationRecordLocator = evidenceLocator(
    source.verificationRecordLocator,
    'A7结构预算评估.verificationRecordLocator',
  );
  const verificationRecordSha256 = assertEvidenceSha256(
    source.verificationRecordSha256,
    'A7结构预算评估.verificationRecordSha256',
  );
  if (
    verificationRecordLocator === submission.reportLocator
    || verificationRecordSha256 === submission.reportSha256
    || submission.environmentObservations.some(
      (entry) => entry.evidenceLocator === verificationRecordLocator,
    )
    || submission.environmentObservations.some(
      (entry) => entry.evidenceSha256 === verificationRecordSha256,
    )
  ) {
    throw new RangeError('Arena V2 A7结构预算评估记录不得复用总报告或六环境原始证据身份。');
  }
  const normalized = Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_BUDGET_STRUCTURAL_EVIDENCE_EVALUATION_CANDIDATE_V1_SCHEMA_VERSION,
    submissionIdentity: submission.submissionIdentity,
    policyId: submission.policyId,
    policyContentHash: submission.policyContentHash,
    catalogContentHash: submission.catalogContentHash,
    sourceCommit: submission.sourceCommit,
    packageLockSha256: submission.packageLockSha256,
    toolchainIdentitySha256: submission.toolchainIdentitySha256,
    observationBatchId: submission.observationBatchId,
    collectorId: submission.collectorId,
    capturedAtUtc: submission.capturedAtUtc,
    reportLocator: submission.reportLocator,
    reportSha256: submission.reportSha256,
    verifiedReportSha256,
    artifactObservationCount: submission.artifactObservationCount,
    environmentObservationCount: submission.environmentObservationCount,
    artifactObservations: submission.artifactObservations,
    environmentObservations: submission.environmentObservations,
    artifactCoverageVerified,
    structuralMetricsVerified,
    environmentCoverageVerified,
    sourceAndBuildIdentityVerified,
    reviewerId,
    reviewedAtUtc,
    environmentBuilds: Object.freeze(submission.environmentObservations.map((entry) => (
      Object.freeze({
        environmentId: entry.environmentId,
        buildIdentitySha256: entry.buildIdentitySha256,
        evidenceSha256: entry.evidenceSha256,
      })
    ))),
    decision: evaluationDecision,
    verificationRecordLocator,
    verificationRecordSha256,
    reasonIds,
    notes: nullableText(source.notes, 'A7结构预算评估.notes'),
  });
  const evaluationIdentity = createDeterministicDataHash(
    normalized,
    'Arena V2 A7 formal budget structural evidence evaluation candidate V1',
  );
  return Object.freeze({
    ...normalized,
    evaluationIdentity,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    evaluationStatus: evaluationDecision,
    evidenceIdentityAccepted: evaluationDecision === 'accepted',
    eligibleForSeparateStructuralLimitProposal: evaluationDecision === 'accepted',
    acceptedEvidenceDoesNotDefineOrApproveLimits: true as const,
    grantsBudgetApproval: false as const,
    hardGate: false as const,
    hardGateUsable: false as const,
    writesFilesOrEvidence: false as const,
    runsMeasurementTools: false as const,
    createsOrModifiesAssets: false as const,
    loadsAssets: false as const,
    publishesRelease: false as const,
  });
}

/** Projects accepted structural evidence into A7 V2's observation-only input. */
export function createArenaV2A7FormalBudgetEvidenceProjectionCandidateV1(
  value: unknown,
) {
  const source = cloneFrozenData(value, 'Arena V2 A7结构预算证据投影候选V1');
  exactRecord(source, A7_V2_PROJECTION_KEYS, 'Arena V2 A7结构预算证据投影候选V1');
  const evaluation =
    createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1(
      source.evaluationInput,
    );
  if (
    source.evaluationIdentity !== evaluation.evaluationIdentity
    || evaluation.evaluationStatus !== 'accepted'
    || !evaluation.evidenceIdentityAccepted
    || !evaluation.eligibleForSeparateStructuralLimitProposal
    || evaluation.artifactObservationCount
      !== ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY.artifactCount
    || evaluation.environmentObservationCount
      !== ARENA_V2_P7_TARGET_ENVIRONMENTS_CANDIDATE_V1.length
    || evaluation.grantsBudgetApproval
    || evaluation.hardGate
    || evaluation.hardGateUsable
  ) throw new RangeError('Arena V2 A7结构预算投影只接受当前完整且独立接受的证据评估。');
  return Object.freeze({
    schemaVersion: 1 as const,
    structuralEvidenceEvaluationIdentity: evaluation.evaluationIdentity,
    sourceCommit: evaluation.sourceCommit,
    packageLockSha256: evaluation.packageLockSha256,
    toolchainIdentitySha256: evaluation.toolchainIdentitySha256,
    environmentBuilds: evaluation.environmentBuilds,
    formalBudgetEvidence: Object.freeze({
      policyId: evaluation.policyId,
      policyContentHash: evaluation.policyContentHash,
      artifactObservationCount: evaluation.artifactObservationCount,
      status: 'passed' as const,
      evidenceSha256: evaluation.reportSha256,
      failureReason: null,
    }),
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    producesA7V2ObservationInputOnly: true as const,
    definesOrApprovesStructuralLimits: false as const,
    grantsBudgetApproval: false as const,
    hardGate: false as const,
    hardGateUsable: false as const,
    publishesRelease: false as const,
  });
}

export const ARENA_V2_A7_FORMAL_BUDGET_STRUCTURAL_EVIDENCE_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    id: 'arena-v2.a7.formal-budget-structural-evidence.candidate.v1' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    hardGateUsable: false as const,
    currentAllowedScope: 'plain-data-structural-and-six-environment-evidence-only' as const,
    requiredArtifactObservationCount: 130 as const,
    requiredEnvironmentObservationCount: 6 as const,
    submissionBindsCurrentCatalogPolicySourceAndBuild: true as const,
    independentReviewerRequired: true as const,
    timestampsRequireCanonicalUtcInstants: true as const,
    boundedCanonicalEvidenceStringsRequired: true as const,
    sharedEvidenceValueContractRequired: true as const,
    canonicalAsciiIdentifiersAndWhitespaceFreeLocatorsRequired: true as const,
    artifactObservationsBindFormalBudgetEncodedMediaFormatIdentity: true as const,
    textureObservationsBindFormalBudgetDecodedFormatIdentity: true as const,
    currentTextureDimensionsMustMatchFormalBudgetCatalogMetadata: true as const,
    environmentEvidenceRecordsRemainDistinctFromGovernanceRecords: true as const,
    evidenceRecordLocatorsAndHashesMustRemainDomainDistinct: true as const,
    acceptedEvaluationProjectsToA7V2ObservationInput: true as const,
    acceptedEvidenceDoesNotDefineOrApproveLimits: true as const,
    createsOrModifiesAssets: false as const,
    loadsAssets: false as const,
    runsMeasurementTools: false as const,
    writesFilesOrEvidence: false as const,
    grantsBudgetApproval: false as const,
    publishesRelease: false as const,
    defaultFormalBundleConsumes: false as const,
    defaultPreloaderConsumes: false as const,
    defaultEntryConsumes: false as const,
  });

export type ArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1 =
  ReturnType<typeof createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1>;
export type ArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1 =
  ReturnType<typeof createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1>;
