import {
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  validateArenaV2P7StageReportCandidateV2,
  type ArenaV2P7StageReportCandidateV2,
} from './arena-v2-p7-stage-report-candidate-v2.js';
import {
  assertArenaV2A7CurrentFormalAssetCatalogLegacyBindingCandidateV2,
} from './arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v2.js';
import {
  validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3,
  type ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3,
} from './arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v3.js';

export const ARENA_V2_P7_RELEASE_FREEZE_MANIFEST_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

const OPTION_KEYS = new Set(['report', 'formalVisualMediaEvidence']);
const STORED_MANIFEST_KEYS = new Set([
  'schemaVersion', 'status', 'defaultReleaseBundleWired', 'defaultEntryWired',
  'validationStatus', 'publishes', 'purpose', 'identity', 'qualification',
  'acceptedOpenDefects', 'evaluationEvidenceIndex', 'automationReceiptIndex',
  'explicitNonActions', 'formalVisualMediaEvidence', 'report', 'identityHash',
]);

const EXPLICIT_NON_ACTIONS = Object.freeze([
  'does-not-publish-release',
  'does-not-modify-branch',
  'does-not-merge-branches',
  'does-not-write-git-tag',
  'does-not-upload-artifacts',
  'does-not-sign-artifacts',
  'does-not-produce-device-or-human-evidence',
] as const);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
}

function assertEligibleReport(report: ArenaV2P7StageReportCandidateV2): void {
  if (
    report.hardGate !== 'PASS'
    || report.reportStatus !== 'PASS'
    || report.evaluationHardGate !== 'PASS'
    || report.automationHardGate !== 'PASS'
    || report.reportDecision !== 'advance'
    || report.independentAudit.decision !== 'advance'
  ) throw new Error('P7 release-freeze资格要求报告、评价、自动化和独立审计全部PASS/advance。');
  if (
    report.failureReasons.length !== 0
    || report.uncompleted.length !== 0
    || report.nonPassingAutomationSuites.length !== 0
  ) throw new Error('P7 release-freeze资格不允许失败、未完成或非通过自动化项。');
  if (
    report.verificationStatus.automation.status !== 'passed'
    || report.verificationStatus.automation.hardGate !== 'PASS'
    || report.verificationStatus.automation.receiptCounts.total !== 24
    || report.verificationStatus.automation.receiptCounts.passed !== 24
    || report.verificationStatus.automation.receiptCounts.failed !== 0
    || report.verificationStatus.automation.receiptCounts.notRun !== 0
    || report.verificationStatus.device.status !== 'passed'
    || report.verificationStatus.human.status !== 'passed'
  ) throw new Error('P7 release-freeze资格要求自动化、设备与真人证据门全部闭合。');
}

function assertEligibleFormalVisualMediaEvidence(
  evidence: ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3,
  report: ArenaV2P7StageReportCandidateV2,
): void {
  if (!evidence.hardGate
    || !evidence.formalVisualMediaReady
    || String(evidence.evidenceStatus) !== 'PASS'
    || evidence.incompleteReasons.length !== 0
    || evidence.failureReasons.length !== 0) {
    throw new Error('P7 release-freeze资格要求A7 V3正式视觉/媒体证据完整且预算获批。');
  }
  if (evidence.legacyEvidence.evidence.sourceIdentity.sourceDirty !== false
    || evidence.legacyEvidence.evidence.sourceIdentity.sourceCommit
      !== report.candidateIdentity.sourceCommit
    || evidence.legacyEvidence.evidence.sourceIdentity.contentIdentityHash
      !== report.candidateIdentity.contentIdentityHash) {
    throw new RangeError('P7 release-freeze的A7与功能报告源码或内容身份漂移。');
  }
  const reportBuilds = report.candidateIdentity.environmentBuilds;
  const visualBuilds = evidence.legacyEvidence.evidence.environmentBuilds;
  if (reportBuilds.length !== visualBuilds.length
    || reportBuilds.some((entry, index) => (
      visualBuilds[index]?.environmentId !== entry.environmentId
      || visualBuilds[index]?.buildIdentitySha256 !== entry.buildIdentitySha256
    ))) {
    throw new RangeError('P7 release-freeze的A7与功能报告六环境构建身份漂移。');
  }
  const approvedPolicySource =
    evidence.approvedPolicyAssembly.approvedPolicyCandidate.sourceIdentity;
  if (
    approvedPolicySource.packageLockSha256
      !== report.candidateIdentity.packageLockSha256
    || approvedPolicySource.toolchainIdentitySha256
      !== report.candidateIdentity.toolchainIdentityHash
  ) {
    throw new RangeError('P7 release-freeze的A7结构测量与功能报告package lock或toolchain身份漂移。');
  }
}

function createAcceptedOpenDefects(report: ArenaV2P7StageReportCandidateV2) {
  const result = Object.freeze(report.openDefects.map((entry) => {
    if (entry.severity === 'blocking' || entry.severity === 'high') {
      throw new Error(`P7 release-freeze不允许开放${entry.severity}缺陷 ${entry.defectId}。`);
    }
    if (
      typeof entry.owner !== 'string' || entry.owner.trim().length === 0
      || typeof entry.impactScope !== 'string' || entry.impactScope.trim().length === 0
      || typeof entry.acceptanceReason !== 'string' || entry.acceptanceReason.trim().length === 0
    ) throw new Error(`P7 release-freeze开放缺陷 ${entry.defectId} 缺少具名接受资料。`);
    return Object.freeze({
      defectId: entry.defectId,
      severity: entry.severity,
      owner: entry.owner,
      impactScope: entry.impactScope,
      acceptanceReason: entry.acceptanceReason,
    });
  }));
  if (new Set(result.map(({ defectId }) => defectId)).size !== result.length) {
    throw new RangeError('P7 release-freeze接受缺陷ID必须唯一。');
  }
  return result;
}

function createEvaluationEvidenceIndex(report: ArenaV2P7StageReportCandidateV2) {
  if (report.evidenceIndex.length !== 29) {
    throw new RangeError('P7 release-freeze必须精确索引29项评价证据。');
  }
  const result = Object.freeze(report.evidenceIndex.map((entry) => {
    if (entry.evidenceSha256 === null) {
      throw new Error(`P7 release-freeze评价证据 ${entry.id} 缺少SHA。`);
    }
    return Object.freeze({
      kind: entry.kind,
      id: entry.id,
      evidenceSha256: entry.evidenceSha256,
    });
  }));
  if (
    new Set(result.map(({ id }) => id)).size !== result.length
    || new Set(result.map(({ evidenceSha256 }) => evidenceSha256)).size !== result.length
  ) throw new RangeError('P7 release-freeze评价证据ID/SHA必须唯一。');
  return result;
}

function createAutomationReceiptIndex(report: ArenaV2P7StageReportCandidateV2) {
  if (report.automationReceiptIndex.length !== 24) {
    throw new RangeError('P7 release-freeze必须精确索引24项自动化回执。');
  }
  const result = Object.freeze(report.automationReceiptIndex.map((entry) => {
    if (entry.status !== 'passed' || entry.evidenceSha256 === null) {
      throw new Error(`P7 release-freeze自动化回执 ${entry.suiteId} 未通过或缺少证据。`);
    }
    return Object.freeze({
      suiteId: entry.suiteId,
      status: 'passed' as const,
      commandDefinitionHash: entry.commandDefinitionHash,
      evidenceSha256: entry.evidenceSha256,
    });
  }));
  if (
    new Set(result.map(({ suiteId }) => suiteId)).size !== result.length
    || new Set(result.map(({ commandDefinitionHash }) => commandDefinitionHash)).size !== result.length
    || new Set(result.map(({ evidenceSha256 }) => evidenceSha256)).size !== result.length
  ) throw new RangeError('P7 release-freeze自动化suite/command/evidence身份必须唯一。');
  return result;
}

function assertEvidenceDomainsDisjoint(
  evaluationEvidenceIndex: readonly Readonly<{ evidenceSha256: string }>[],
  automationReceiptIndex: readonly Readonly<{ evidenceSha256: string }>[],
  formalVisualMediaEvidenceRecordIndex: readonly Readonly<{
    recordId: string;
    evidenceLocator: string;
    evidenceSha256: string;
  }>[],
  formalVisualMediaEvidenceVerificationIndex: readonly Readonly<{
    recordId: string;
    verificationReceiptLocator: string;
    verificationReceiptSha256: string;
  }>[],
): void {
  const functionalAndAutomationHashes = [
    ...evaluationEvidenceIndex.map(({ evidenceSha256 }) => evidenceSha256),
    ...automationReceiptIndex.map(({ evidenceSha256 }) => evidenceSha256),
  ];
  const functionalAndAutomationSet = new Set(functionalAndAutomationHashes);
  if (functionalAndAutomationSet.size !== functionalAndAutomationHashes.length) {
    throw new RangeError('P7 release-freeze评价与自动化证据SHA不得跨域重复。');
  }
  const collision = formalVisualMediaEvidenceRecordIndex.find(
    ({ evidenceSha256 }) => functionalAndAutomationSet.has(evidenceSha256),
  );
  if (collision !== undefined) {
    throw new RangeError(
      `P7 release-freeze功能、自动化与A7视觉/结构证据SHA不得跨域重复：`
        + `${collision.recordId} @ ${collision.evidenceLocator}。`,
    );
  }
  const verificationCollision = formalVisualMediaEvidenceVerificationIndex.find(
    ({ verificationReceiptSha256 }) => (
      functionalAndAutomationSet.has(verificationReceiptSha256)
    ),
  );
  if (verificationCollision !== undefined) {
    throw new RangeError(
      `P7 release-freeze功能、自动化与A7验证回执SHA不得跨域重复：`
        + `${verificationCollision.recordId}`
        + ` @ ${verificationCollision.verificationReceiptLocator}。`,
    );
  }
}

/** Creates only a deterministic release-freeze qualification manifest; it performs no release. */
export function createArenaV2P7ReleaseFreezeManifestCandidateV1(value: unknown) {
  const source = cloneFrozenData(value, 'Arena V2 P7 release-freeze manifest options');
  exactRecord(source, OPTION_KEYS, 'Arena V2 P7 release-freeze manifest options');
  const report = validateArenaV2P7StageReportCandidateV2(source.report);
  const formalVisualMediaEvidence =
    validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
      source.formalVisualMediaEvidence,
    );
  const acceptedOpenDefects = createAcceptedOpenDefects(report);
  assertEligibleReport(report);
  assertEligibleFormalVisualMediaEvidence(formalVisualMediaEvidence, report);
  assertArenaV2A7CurrentFormalAssetCatalogLegacyBindingCandidateV2(
    formalVisualMediaEvidence.legacyEvidence,
  );
  if (
    report.candidateIdentity.environmentBuilds.length
    !== report.evaluation.preregistration.releaseGates.requiredTargetEnvironmentCount
  ) {
    throw new RangeError('P7 release-freeze必须精确绑定六环境build identity。');
  }
  const environmentBuilds = Object.freeze(report.candidateIdentity.environmentBuilds.map(
    (entry) => Object.freeze({
      environmentId: entry.environmentId,
      buildIdentitySha256: entry.buildIdentitySha256,
    }),
  ));
  if (
    new Set(environmentBuilds.map(({ environmentId }) => environmentId)).size
      !== environmentBuilds.length
    || new Set(environmentBuilds.map(({ buildIdentitySha256 }) => buildIdentitySha256)).size
      !== environmentBuilds.length
  ) throw new RangeError('P7 release-freeze六环境ID/build identity必须唯一。');
  const evaluationEvidenceIndex = createEvaluationEvidenceIndex(report);
  const automationReceiptIndex = createAutomationReceiptIndex(report);
  const formalVisualMediaEvidenceRecordIndex =
    formalVisualMediaEvidence.formalEvidenceRecordIndex;
  assertEvidenceDomainsDisjoint(
    evaluationEvidenceIndex,
    automationReceiptIndex,
    formalVisualMediaEvidenceRecordIndex,
    formalVisualMediaEvidence.formalEvidenceRecordVerificationIndex,
  );
  const approvedBudgetPolicy =
    formalVisualMediaEvidence.approvedPolicyAssembly.approvedPolicyCandidate;
  const approvedBudgetPolicyAssemblyIdentity =
    formalVisualMediaEvidence.approvedPolicyAssembly.approvedPolicyAssemblyIdentity;
  if (
    formalVisualMediaEvidence.budgetSummary.policyId !== approvedBudgetPolicy.policyId
    || formalVisualMediaEvidence.budgetSummary.policyRevision
      !== approvedBudgetPolicy.policyRevision
    || formalVisualMediaEvidence.budgetSummary.policyContentHash
      !== approvedBudgetPolicy.policyContentHash
    || formalVisualMediaEvidence.evidence.approvedPolicyAssemblyIdentity
      !== approvedBudgetPolicyAssemblyIdentity
  ) {
    throw new RangeError('P7 release-freeze正式预算Policy或Assembly身份发生漂移。');
  }
  const core = Object.freeze({
    schemaVersion: ARENA_V2_P7_RELEASE_FREEZE_MANIFEST_CANDIDATE_V1_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    defaultReleaseBundleWired: false as const,
    defaultEntryWired: false as const,
    validationStatus: 'not-run' as const,
    publishes: false as const,
    purpose: 'release-freeze-qualification-manifest' as const,
    identity: Object.freeze({
      sourceCommit: report.candidateIdentity.sourceCommit,
      sourceDirty: false as const,
      contentIdentityHash: report.candidateIdentity.contentIdentityHash,
      environmentBuildSetIdentityHash:
        report.candidateIdentity.environmentBuildSetIdentityHash,
      preregistrationIdentityHash: report.candidateIdentity.preregistrationIdentityHash,
      evaluationEvidenceIdentityHash: report.candidateIdentity.evidenceIdentityHash,
      evaluationIdentityHash: report.candidateIdentity.evaluationIdentityHash,
      reportIdentityHash: report.reportIdentityHash,
      environmentBuilds,
      packageJsonSha256: report.candidateIdentity.packageJsonSha256,
      packageLockSha256: report.candidateIdentity.packageLockSha256,
      toolchain: report.candidateIdentity.toolchain,
      toolchainIdentityHash: report.candidateIdentity.toolchainIdentityHash,
      automationDefinitionIdentityHash:
        report.candidateIdentity.automationDefinitionIdentityHash,
      automationManifestIdentityHash: report.candidateIdentity.automationManifestIdentityHash,
      formalVisualMediaEvidenceIdentityHash:
        formalVisualMediaEvidence.evidenceIdentityHash,
      formalVisualMediaEvidenceRecordIndexIdentityHash:
        formalVisualMediaEvidence.formalEvidenceRecordIndexIdentityHash,
      formalVisualMediaEvidenceRetrievalPlanIdentityHash:
        formalVisualMediaEvidence.formalEvidenceRetrievalPlanIdentityHash,
      formalVisualMediaEvidenceStoreSnapshotIdentityHash:
        formalVisualMediaEvidence.formalEvidenceStoreSnapshotIdentityHash,
      formalVisualMediaEvidenceVerificationIndexIdentityHash:
        formalVisualMediaEvidence.formalEvidenceRecordVerificationIndexIdentityHash,
      formalAssetCatalogContentHash:
        formalVisualMediaEvidence.legacyEvidence.evidence.catalogIdentity.catalogContentHash,
      formalAssetSetSha256:
        formalVisualMediaEvidence.legacyEvidence.evidence.catalogIdentity.assetSetSha256,
      formalAssetBudgetPolicyId: approvedBudgetPolicy.policyId,
      formalAssetBudgetPolicyRevision: approvedBudgetPolicy.policyRevision,
      formalAssetBudgetPolicyContentHash:
        approvedBudgetPolicy.policyContentHash,
      formalAssetBudgetApprovedPolicyAssemblyIdentity:
        approvedBudgetPolicyAssemblyIdentity,
    }),
    qualification: Object.freeze({
      reportHardGate: 'PASS' as const,
      reportStatus: 'PASS' as const,
      reportDecision: 'advance' as const,
      independentAuditDecision: 'advance' as const,
      blockingHighOpenDefectCount: 0 as const,
      acceptedMediumLowOpenDefectCount: acceptedOpenDefects.length,
      evaluationEvidenceCount: 29 as const,
      passedAutomationReceiptCount: 24 as const,
      formalVisualMediaEvidenceRecordCount:
        formalVisualMediaEvidenceRecordIndex.length,
      formalVisualMediaEvidenceTotalBytes:
        formalVisualMediaEvidence.coverageSummary.totalFormalEvidenceBytes,
      formalVisualMediaEvidenceVerificationReceiptCount:
        formalVisualMediaEvidence.coverageSummary.formalEvidenceVerificationReceiptCount,
      formalVisualMediaEvidenceVerificationReceiptTotalBytes:
        formalVisualMediaEvidence.coverageSummary.totalFormalEvidenceVerificationReceiptBytes,
      formalVisualMediaHardGate: 'PASS' as const,
      formalVisualMediaReady: true as const,
      approvedFormalAssetCount: formalVisualMediaEvidence.coverageSummary.assetCount,
    }),
    acceptedOpenDefects,
    evaluationEvidenceIndex,
    automationReceiptIndex,
    explicitNonActions: EXPLICIT_NON_ACTIONS,
    formalVisualMediaEvidence,
    report,
  });
  return Object.freeze({
    ...core,
    identityHash: createDeterministicDataHash(
      core,
      'Arena V2 P7 release-freeze qualification manifest candidate V1',
    ),
  });
}

export type ArenaV2P7ReleaseFreezeManifestCandidateV1 = ReturnType<
  typeof createArenaV2P7ReleaseFreezeManifestCandidateV1
>;

/** Rebuilds a stored manifest from its embedded report and A7 formal media evidence. */
export function validateArenaV2P7ReleaseFreezeManifestCandidateV1(
  value: unknown,
): ArenaV2P7ReleaseFreezeManifestCandidateV1 {
  const source = cloneFrozenData(value, 'Arena V2 P7 stored release-freeze manifest');
  exactRecord(source, STORED_MANIFEST_KEYS, 'Arena V2 P7 stored release-freeze manifest');
  const canonical = createArenaV2P7ReleaseFreezeManifestCandidateV1({
    report: source.report,
    formalVisualMediaEvidence: source.formalVisualMediaEvidence,
  });
  if (
    source.identityHash !== canonical.identityHash
    || createDeterministicDataHash(
      source,
      'Arena V2 P7 stored release-freeze manifest comparison',
    ) !== createDeterministicDataHash(
      canonical,
      'Arena V2 P7 stored release-freeze manifest comparison',
    )
  ) throw new RangeError('Arena V2 P7 stored release-freeze manifest身份或内容发生漂移。');
  return canonical;
}

export const ARENA_V2_P7_RELEASE_FREEZE_MANIFEST_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  currentGate: 'incomplete' as const,
  hardGate: false as const,
  defaultReleaseBundleWired: false as const,
  defaultEntryWired: false as const,
  validationStatus: 'not-run' as const,
  publishes: false as const,
  readsOrWritesFiles: false as const,
  modifiesBranch: false as const,
  mergesBranches: false as const,
  writesGitTag: false as const,
  uploadsArtifacts: false as const,
  signsArtifacts: false as const,
  producesDeviceOrHumanEvidence: false as const,
  rejectsMissingEvaluationEvidenceSha: true as const,
  environmentBuildSetIdentityRequired: true as const,
  formalVisualMediaEvidenceRequired: true as const,
  formalVisualMediaPassRequired: true as const,
  formalVisualMediaEvidenceSchemaRequired: 3 as const,
  approvedFormalAssetBudgetPolicyAssemblyRequired: true as const,
  approvedFormalAssetBudgetStructuralLimitsRequired: true as const,
  releaseFreezeIdentityRetainsApprovedBudgetPolicyAndAssembly: true as const,
  releaseFreezeIdentityRetainsA7RetrievalPlanAndStoreSnapshot: true as const,
  formalVisualMediaSamePackageLockAndToolchainRequired: true as const,
  functionalAutomationAndFormalMediaEvidenceDomainsMustRemainDistinct: true as const,
  consumesA7OwnedFormalEvidenceRecordIndex: true as const,
  consumesA7OwnedFormalEvidenceVerificationIndex: true as const,
  currentV2BudgetPolicyCannotQualifyFreeze: true as const,
  formalVisualMediaSameSourceContentAndBuildSetRequired: true as const,
  currentFormalAssetCatalogRequired: true as const,
  currentFormalAssetCatalogExactAssetIdentityRequired: true as const,
});
