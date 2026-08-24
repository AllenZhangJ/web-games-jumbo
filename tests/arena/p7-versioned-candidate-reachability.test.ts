import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const P7_FILES = Object.freeze([
  'arena-v2-p7-preregistration-candidate-v1.ts',
  'arena-v2-p7-evidence-evaluation-candidate-v1.ts',
  'arena-v2-p7-automation-execution-evidence-candidate-v1.ts',
  'arena-v2-p7-automation-evidence-producer-candidate-v1.ts',
  'arena-v2-p7-stage-report-candidate-v1.ts',
  'arena-v2-p7-stage-report-candidate-v2.ts',
  'arena-v2-p7-automation-stage-report-session-candidate-v1.ts',
  'arena-v2-p7-release-freeze-assembly-session-candidate-v1.ts',
  'arena-v2-p7-release-freeze-manifest-candidate-v1.ts',
]);
const RELEASE_ROOT = 'packages/arena-release/src';
const A7_FILES = Object.freeze([
  'arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v1.ts',
  'arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v2.ts',
  'arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v3.ts',
]);
const A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_FILE =
  'arena-v2-a7-formal-evidence-retrieval-verifier-candidate-v1.ts';
const A7_FORMAL_EVIDENCE_STORE_ADAPTER_FILE =
  'scripts/lib/arena-a7-formal-evidence-store-adapters-candidate-v1.ts';
const A7_STRUCTURAL_BUDGET_EVIDENCE_FILE =
  'arena-v2-a7-formal-budget-structural-evidence-candidate-v1.ts';
const A7_STRUCTURAL_BUDGET_LIMIT_PROPOSAL_FILE =
  'arena-v2-a7-formal-budget-structural-limit-proposal-candidate-v1.ts';
const A7_STRUCTURAL_BUDGET_INDEPENDENT_APPROVAL_FILE =
  'arena-v2-a7-formal-budget-independent-approval-decision-candidate-v1.ts';
const A7_APPROVED_BUDGET_POLICY_ASSEMBLY_FILE =
  'arena-v2-a7-formal-budget-approved-policy-assembly-candidate-v1.ts';
const CANDIDATE_REFERENCE = /arena-v2-(?:p7-|a7-formal-(?:visual-media|evidence-retrieval-verifier|budget-(?:structural|independent|approved)))|ArenaV2(?:P7|A7)|ARENA_V2_(?:P7|A7)/u;
const CANDIDATE_FILE_SET = new Set<string>([
  ...P7_FILES,
  ...A7_FILES,
  A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_FILE,
  A7_STRUCTURAL_BUDGET_EVIDENCE_FILE,
  A7_STRUCTURAL_BUDGET_LIMIT_PROPOSAL_FILE,
  A7_STRUCTURAL_BUDGET_INDEPENDENT_APPROVAL_FILE,
  A7_APPROVED_BUDGET_POLICY_ASSEMBLY_FILE,
]);

test('P7 candidates are exported explicitly but remain absent from default entries and Release Bundle', () => {
  const index = readFileSync(path.join(RELEASE_ROOT, 'index.ts'), 'utf8');
  for (const file of P7_FILES) {
    assert.ok(index.includes(
      `export * from './${file.replace(/\.ts$/u, '.js')}';`,
    ), `${file}缺少显式包导出。`);
  }
  for (const file of A7_FILES) {
    assert.ok(index.includes(
      `export * from './${file.replace(/\.ts$/u, '.js')}';`,
    ), `${file}缺少显式包导出。`);
  }
  assert.ok(index.includes(
    `export * from './${A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_FILE.replace(/\.ts$/u, '.js')}';`,
  ), 'A7 Evidence取回核验器缺少显式包导出。');
  assert.ok(index.includes(
    `export * from './${A7_STRUCTURAL_BUDGET_EVIDENCE_FILE.replace(/\.ts$/u, '.js')}';`,
  ), 'A7结构预算证据缺少显式包导出。');
  assert.ok(index.includes(
    `export * from './${A7_STRUCTURAL_BUDGET_LIMIT_PROPOSAL_FILE.replace(/\.ts$/u, '.js')}';`,
  ), 'A7结构预算上限提案缺少显式包导出。');
  assert.ok(index.includes(
    `export * from './${A7_STRUCTURAL_BUDGET_INDEPENDENT_APPROVAL_FILE.replace(/\.ts$/u, '.js')}';`,
  ), 'A7结构预算独立批准记录缺少显式包导出。');
  assert.ok(index.includes(
    `export * from './${A7_APPROVED_BUDGET_POLICY_ASSEMBLY_FILE.replace(/\.ts$/u, '.js')}';`,
  ), 'A7新不可变预算Policy装配缺少显式包导出。');
  for (const entry of ['src/entry/web.ts', 'src/entry/wechat.ts', 'src/entry/douyin.ts']) {
    assert.doesNotMatch(
      readFileSync(entry, 'utf8'),
      CANDIDATE_REFERENCE,
      `${entry}提前接入P7/A7。`,
    );
  }
  for (const entry of readdirSync(RELEASE_ROOT, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name === 'index.ts'
      || CANDIDATE_FILE_SET.has(entry.name)) continue;
    assert.doesNotMatch(
      readFileSync(path.join(RELEASE_ROOT, entry.name), 'utf8'),
      CANDIDATE_REFERENCE,
      `${entry.name}提前接入P7/A7 Release Bundle。`,
    );
  }
});

test('P7 candidate metadata remains incomplete, not-run and production unreachable', () => {
  for (const file of P7_FILES) {
    const source = readFileSync(path.join(RELEASE_ROOT, file), 'utf8');
    assert.match(source, /status: 'production-unreachable'/, file);
    assert.match(source, /implementationStatus: 'code-written-not-run'/, file);
    assert.match(source, /currentGate: 'incomplete'/, file);
    assert.match(source, /hardGate: false/, file);
    assert.match(source, /validationStatus: 'not-run'/, file);
    assert.match(source, /defaultReleaseBundleWired: false/, file);
    assert.doesNotMatch(source, /from\s+['"](?:three|node:child_process)['"]/, file);
    assert.doesNotMatch(source, /\b(?:window|document)\s*[.[]|\bMath\.random\s*\(/, file);
  }
});

test('A7 visual/media evidence versions stay explicit, deferred and outside P7 authority', () => {
  for (const file of A7_FILES) {
    const source = readFileSync(path.join(RELEASE_ROOT, file), 'utf8');
    assert.match(source, /status: 'production-unreachable'/);
    assert.match(source, /implementationStatus: 'code-written-not-run'/);
    assert.match(source, /validationStatus: 'not-run'/);
    assert.match(source, /defaultReleaseBundleWired: false/);
    assert.match(source, /defaultEntryWired: false/);
    assert.match(source, /publishes: false/);
    assert.match(source, /createsOrModifiesAssets: false/);
    assert.match(source, /participatesInGameplayAuthority: false/);
    assert.match(source, /currentPassInstanceExists: false/);
    assert.match(source, /p7ReleaseFreezeManifestOwnedHere: false/);
    assert.match(source, /p7AdvanceComputedHere: false/);
    assert.doesNotMatch(source, /from\s+['"](?:three|node:child_process)['"]/);
    assert.doesNotMatch(source, /\b(?:window|document)\s*[.[]|\bMath\.random\s*\(/);
  }
  const v2 = readFileSync(path.join(RELEASE_ROOT, A7_FILES[1]!), 'utf8');
  assert.match(v2, /formalAssetCatalogCount: 130/);
  assert.match(v2, /formalBudgetPolicyApprovalStatus: 'proposed-not-approved'/);
  assert.match(v2, /formalBudgetStructuralLimitsStatus: 'unresolved-not-approved'/);
  assert.match(v2, /encodedMediaFormatPolicyCoverage: true/);
  assert.match(v2, /textureDecodedFormatPolicyCoverage: true/);
  assert.match(v2, /textureDimensionCoverage: true/);
  assert.match(v2, /hardGate: false/);
  const v3 = readFileSync(path.join(RELEASE_ROOT, A7_FILES[2]!), 'utf8');
  assert.match(v3, /requiresApprovedPolicyAssembly: true/);
  assert.match(v3, /requiresSameSourceAndSixEnvironmentBuildSet: true/);
  assert.match(v3, /budgetByteAggregatesMustRemainSafeIntegers: true/);
  assert.match(v3, /approvedPolicyRetainsBaseEncodedMediaFormatIdentity: true/);
  assert.match(v3, /approvedPolicyRetainsBaseTextureDecodedMetadataIdentity: true/);
  assert.match(v3, /approvedPolicyRetainsAcceptedDecodedAudioObservation: true/);
  assert.match(v3, /approvedPolicyMediaIdentityCoverage/);
  assert.match(v3, /textureDimensionAndDecodedByteIdentityCoverage: true/);
  assert.match(v3, /decodedAudioObservationAndMaximumCoverage: true/);
  assert.match(v3, /approvedPolicyRevalidatesAcceptedObservationFloorsAndLifecycle: true/);
  assert.match(v3, /approvedPolicyObservationFloorCoverage/);
  assert.match(v3, /replacesOnlyObsoleteV1V2BudgetGate: true/);
  assert.match(v3, /currentV2PolicyRemainsUnchanged: true/);
  assert.match(v3, /formalEvidenceRetrievalPlanOwnedByA7V3: true/);
  assert.match(v3, /formalEvidenceRetrievalPlanDoesNotGrantPass: true/);
  assert.match(v3, /formalEvidenceStoreSnapshotIdentityRequired: true/);
  assert.match(v3, /everyVerificationReceiptBindsSameStoreSnapshot: true/);
  assert.match(v3, /everyVerificationReceiptBindsDerivedRetrievalPlan: true/);
  assert.match(v3, /currentPassInstanceExists: false/);
  assert.match(v3, /hardGate: false/);
});

test('A7 Evidence retrieval verifier stays injected and production unreachable', () => {
  const source = readFileSync(
    path.join(RELEASE_ROOT, A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_FILE),
    'utf8',
  );
  for (const marker of [
    /status: 'production-unreachable'/,
    /implementationStatus: 'code-written-not-run'/,
    /currentGate: 'incomplete'/,
    /hardGate: false/,
    /defaultReleaseBundleWired: false/,
    /defaultEntryWired: false/,
    /validationStatus: 'not-run'/,
    /readsOnlyThroughInjectedEvidenceReader: true/,
    /hashesOnlyThroughInjectedSha256Adapter: true/,
    /writesOnlyThroughInjectedReceiptWriter: true/,
    /receiptWriterMustCommitOneAtomicBatch: true/,
    /formalEvidenceRetrievalPlanIdentityRequired: true/,
    /formalEvidenceStoreSnapshotIdentityRequired: true/,
    /everyReadHashPayloadAndReceiptBatchBindsStoreSnapshot: true/,
    /finalVerificationDirectoryRetainsRetrievalPlanIdentity: true/,
    /fixedConcurrency: 1/,
    /failurePolicy: 'fail-closed-no-partial-result'/,
    /producesA7PassOrReleaseApproval: false/,
  ]) assert.match(source, marker);
  assert.doesNotMatch(
    source,
    /from\s+['"](?:node:|three)|\b(?:spawn|execFile|readFile|writeFile|fetch)\s*\(/u,
  );
});

test('A7 Node Evidence Store Adapter remains explicit and outside default entries', () => {
  const source = readFileSync(A7_FORMAL_EVIDENCE_STORE_ADAPTER_FILE, 'utf8');
  for (const marker of [
    /status: 'production-unreachable'/,
    /implementationStatus: 'code-written-not-run'/,
    /currentGate: 'incomplete'/,
    /hardGate: false/,
    /defaultReleaseBundleWired: false/,
    /defaultEntryWired: false/,
    /validationStatus: 'not-run'/,
    /explicitEvidenceRootRequired: true/,
    /evidenceRootDirectoryIdentityPinnedByFactory: true/,
    /evidenceRootIdentityRevalidatedBeforeReadWriteAndReturn: true/,
    /receiptParentDirectoryIdentityPinnedByFactory: true/,
    /receiptParentIdentityRevalidatedBeforeCommittedReturn: true/,
    /expectedEvidenceStoreSnapshotIdentityRequired: true/,
    /adapterIdsOwnedAndEnforcedByFactory: true/,
    /readerAndHasherRequestsCanonicalizedBeforeUse: true/,
    /hasherCopiesNonSharedBytesBeforeHashing: true/,
    /readerSidecarMatchesExpectedRecordBeforeEvidenceRead: true/,
    /writerPayloadRespectsFactoryByteLimitBeforeIo: true/,
    /writerClosesBatchIdentityBeforeIo: true/,
    /writerRecomputesSessionIdentityFromEveryPayload: true/,
    /writerValidatesCanonicalPayloadAndRecomputesIdentityHash: true/,
    /writerRejectsNestedAdapterIdentitySpoofingBeforeIo: true/,
    /readerHasherAndWriterPinnedToSameSnapshot: true/,
    /storeSnapshotManifestRequiredAtCanonicalRootPath: true/,
    /storeSnapshotManifestRevalidatedBeforeReadWriteAndReturn: true/,
    /storeSnapshotManifestRevalidatedAfterEveryEvidenceRead: true/,
    /storeSnapshotCreatedAtMustCoverEveryEvidenceRecord: true/,
    /storeSnapshotManifestMustUseCanonicalExactBytes: true/,
    /canonicalStoreSnapshotManifestSerializerProvided: true/,
    /sidecarMetadataRequired: true/,
    /sourceMetadataSidecarMustUseCanonicalExactBytes: true/,
    /canonicalSourceMetadataSidecarSerializerProvided: true/,
    /receiptMetadataUsesCanonicalSidecarSerializer: true/,
    /receiptBodyUsesCanonicalSerializer: true/,
    /stableOpenFileAndPathIdentityRequired: true/,
    /symlinkEscapeRejected: true/,
    /receiptBatchPublishedThroughCommittedDirectory: true/,
    /committedReceiptBatchReadBackBeforeReturn: true/,
    /committedReceiptBytesMetadataAndShaMustMatch: true/,
    /readbackFailureRemovesOnlyNewSession: true/,
    /receiptParentMustBePreprovisioned: true/,
    /defaultProductionWiringProvided: false/,
  ]) assert.match(source, marker);
  for (const entry of ['src/entry/web.ts', 'src/entry/wechat.ts', 'src/entry/douyin.ts']) {
    assert.doesNotMatch(
      readFileSync(entry, 'utf8'),
      /arena-a7-formal-evidence-store-adapters-candidate-v1/u,
    );
  }
});

test('A7 structural budget evidence is exact, independently reviewed and never self-approves', () => {
  const source = readFileSync(
    path.join(RELEASE_ROOT, A7_STRUCTURAL_BUDGET_EVIDENCE_FILE),
    'utf8',
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'requiredArtifactObservationCount: 130',
    'requiredEnvironmentObservationCount: 6',
    'submissionBindsCurrentCatalogPolicySourceAndBuild: true',
    'independentReviewerRequired: true',
    'timestampsRequireCanonicalUtcInstants: true',
    'boundedCanonicalEvidenceStringsRequired: true',
    'sharedEvidenceValueContractRequired: true',
    'arena-v2-a7-formal-budget-evidence-value-candidate-v1.js',
    'canonicalAsciiIdentifiersAndWhitespaceFreeLocatorsRequired: true',
    'artifactObservationsBindFormalBudgetEncodedMediaFormatIdentity: true',
    'textureObservationsBindFormalBudgetDecodedFormatIdentity: true',
    'currentTextureDimensionsMustMatchFormalBudgetCatalogMetadata: true',
    'environmentEvidenceRecordsRemainDistinctFromGovernanceRecords: true',
    'evidenceRecordLocatorsAndHashesMustRemainDomainDistinct: true',
    'acceptedEvaluationProjectsToA7V2ObservationInput: true',
    'acceptedEvidenceDoesNotDefineOrApproveLimits: true',
    'runsMeasurementTools: false',
    'writesFilesOrEvidence: false',
    'grantsBudgetApproval: false',
    'hardGate: false',
    'hardGateUsable: false',
    'publishesRelease: false',
    'producesA7V2ObservationInputOnly: true',
    'definesOrApprovesStructuralLimits: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
  ]) assert.ok(source.includes(marker), `A7结构预算证据缺少${marker}`);
  assert.doesNotMatch(source, /from\s+['"](?:three|node:child_process)['"]/u);
  assert.doesNotMatch(source, /\b(?:window|document)\s*[.[]|\bMath\.random\s*\(/u);
});

test('A7 structural budget limit proposal remains separate, deferred and non-approving', () => {
  const source = readFileSync(
    path.join(RELEASE_ROOT, A7_STRUCTURAL_BUDGET_LIMIT_PROPOSAL_FILE),
    'utf8',
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    "proposalStatus: 'proposed-not-independently-approved'",
    'requiresAcceptedIndependentStructuralEvidence: true',
    'requires130ArtifactLimitsInCanonicalOrder: true',
    'requiresSixEnvironmentLimitsInCanonicalOrder: true',
    'proposedMaximumCannotBeBelowAcceptedObservation: true',
    'headroomAdequacyRequiresIndependentDisposition: true',
    'proposerMustDifferFromEvidenceCollectorAndReviewer: true',
    'proposalCannotChangeCurrentV2Policy: true',
    'timestampsRequireCanonicalUtcInstants: true',
    'boundedCanonicalEvidenceStringsRequired: true',
    'sharedEvidenceValueContractRequired: true',
    'arena-v2-a7-formal-budget-evidence-value-candidate-v1.js',
    'canonicalAsciiIdentifiersAndWhitespaceFreeLocatorsRequired: true',
    'artifactLimitsBindFormalBudgetEncodedMediaFormatIdentity: true',
    'encodedMediaFormat: policyArtifact.encodedMediaFormat',
    'artifactLimitsBindFormalBudgetTextureDecodedMetadataIdentity: true',
    'decodedTextureFormat: policyArtifact.decodedTextureFormat',
    'textureMaximumFootprintUsesFormalBudgetDecodedFormat: true',
    'textureMaximumDimensionsDecodedBytesAndGpuBytesMustRemainCoherent: true',
    'environmentEvidenceRecordsRemainDistinctFromGovernanceRecords: true',
    'evidenceRecordLocatorsAndHashesMustRemainDomainDistinct: true',
    'grantsBudgetApproval: false',
    'hardGate: false',
    'hardGateUsable: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
  ]) assert.ok(source.includes(marker), `A7结构预算上限提案缺少${marker}`);
  assert.doesNotMatch(source, /from\s+['"](?:three|node:child_process)['"]/u);
  assert.doesNotMatch(source, /\b(?:window|document)\s*[.[]|\bMath\.random\s*\(/u);
});

test('A7 budget approval decision is independent and cannot mutate current policy', () => {
  const source = readFileSync(
    path.join(RELEASE_ROOT, A7_STRUCTURAL_BUDGET_INDEPENDENT_APPROVAL_FILE),
    'utf8',
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'requiresImmutableStructuralLimitProposal: true',
    'approverMustDifferFromCollectorReviewerAndProposer: true',
    'approvedRequiresArtifactAndEnvironmentHeadroomAdequacy: true',
    'approvedRequiresApplicabilityObservationFloorAndLifecycleClosure: true',
    'approvedRequiresObservedEnvironmentLifecycleSuccess: true',
    'everyObservedEnvironmentLifecycleSatisfied',
    'zeroHeadroomRequiresExactIndependentDisposition: true',
    'timestampsRequireCanonicalUtcInstants: true',
    'boundedCanonicalEvidenceStringsRequired: true',
    'sharedEvidenceValueContractRequired: true',
    'arena-v2-a7-formal-budget-evidence-value-candidate-v1.js',
    'canonicalAsciiIdentifiersAndWhitespaceFreeLocatorsRequired: true',
    'environmentEvidenceRecordsRemainDistinctFromGovernanceRecords: true',
    'approvedDecisionOnlyFeedsNewImmutablePolicyAssembly: true',
    'decisionRecordDoesNotMutateCurrentV2Policy: true',
    'evidenceRecordLocatorsAndHashesMustRemainDomainDistinct: true',
    'grantsBudgetApproval: false',
    'hardGate: false',
    'hardGateUsable: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
  ]) assert.ok(source.includes(marker), `A7结构预算独立批准缺少${marker}`);
  assert.doesNotMatch(source, /from\s+['"](?:three|node:child_process)['"]/u);
  assert.doesNotMatch(source, /\b(?:window|document)\s*[.[]|\bMath\.random\s*\(/u);
});

test('A7 approved policy assembly stays production unreachable and leaves V2 intact', () => {
  const source = readFileSync(
    path.join(RELEASE_ROOT, A7_APPROVED_BUDGET_POLICY_ASSEMBLY_FILE),
    'utf8',
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'requiresApprovedIndependentDecision: true',
    'assemblerMustDifferFromCollectorReviewerProposerAndApprover: true',
    'timestampsRequireCanonicalUtcInstants: true',
    'boundedCanonicalEvidenceStringsRequired: true',
    'sharedEvidenceValueContractRequired: true',
    'arena-v2-a7-formal-budget-evidence-value-candidate-v1.js',
    'canonicalAsciiIdentifiersAndWhitespaceFreeLocatorsRequired: true',
    'environmentEvidenceRecordsRemainDistinctFromGovernanceRecords: true',
    'approvedPolicyRetainsBaseEncodedMediaFormatIdentity: true',
    'approvedPolicyRetainsBaseTextureDecodedMetadataIdentity: true',
    'approvedPolicyRetainsAcceptedDecodedAudioObservation: true',
    'approvedPolicyRetainsCompleteAcceptedObservationFloors: true',
    'encodedMediaFormat: entry.encodedMediaFormat',
    'decodedTextureFormat: entry.decodedTextureFormat',
    'currentDecodedTextureBytes: entry.observed.decodedTextureBytes',
    'currentTextureWidthPixels: entry.observed.widthPixels',
    'currentTextureHeightPixels: entry.observed.heightPixels',
    'currentDecodedAudioBytes: entry.observed.decodedAudioBytes',
    'acceptedObservation: entry.observed',
    'approvedPolicyCandidateMayOnlyFeedA7V3BudgetEvidence: true',
    'assemblyDoesNotReplaceCurrentV2Policy: true',
    'evidenceRecordLocatorsAndHashesMustRemainDomainDistinct: true',
    'currentV2PolicyMutationApplied: false',
    'eligibleForA7V3BudgetEvidenceBinding: true',
    'approvedPolicyCandidateHardGateUsable: true',
    'hardGate: false',
    'hardGateUsable: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
  ]) assert.ok(source.includes(marker), `A7新预算Policy装配缺少${marker}`);
  assert.doesNotMatch(source, /from\s+['"](?:three|node:child_process)['"]/u);
  assert.doesNotMatch(source, /\b(?:window|document)\s*[.[]|\bMath\.random\s*\(/u);
});

test('P7 automation and freeze candidates cannot self-execute or publish', () => {
  const producer = readFileSync(
    path.join(RELEASE_ROOT, 'arena-v2-p7-automation-evidence-producer-candidate-v1.ts'),
    'utf8',
  );
  assert.match(producer, /executesOnlyThroughInjectedRunner: true/);
  assert.match(producer, /fixedConcurrency: 1/);
  assert.match(producer, /failurePolicy: 'fail-fast'/);
  assert.doesNotMatch(producer, /defaultRunner|child_process|\bspawn\s*\(/);

  const freeze = readFileSync(
    path.join(RELEASE_ROOT, 'arena-v2-p7-release-freeze-manifest-candidate-v1.ts'),
    'utf8',
  );
  for (const marker of [
    /publishes: false/, /writesGitTag: false/, /uploadsArtifacts: false/,
    /signsArtifacts: false/, /readsOrWritesFiles: false/, /mergesBranches: false/,
  ]) assert.match(freeze, marker);
  assert.doesNotMatch(freeze, /from\s+['"]node:|\b(?:spawn|execFile|writeFile|rename)\s*\(/);

  const assembly = readFileSync(
    path.join(
      RELEASE_ROOT,
      'arena-v2-p7-release-freeze-assembly-session-candidate-v1.ts',
    ),
    'utf8',
  );
  for (const marker of [
    /publishes: false/, /readsOrWritesFiles: false/, /modifiesBranch: false/,
    /writesGitTag: false/, /uploadsArtifacts: false/, /signsArtifacts: false/,
  ]) assert.match(assembly, marker);
  assert.doesNotMatch(
    assembly,
    /from\s+['"]node:|\b(?:spawn|execFile|writeFile|rename)\s*\(/,
  );
});
