import { readFile, readdir } from 'node:fs/promises';
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
const P7_TEST_FILES = Object.freeze(P7_FILES.map((file) => file.replace(/\.ts$/u, '.test.ts')));
const A7_FILES = Object.freeze([
  'arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v1.ts',
  'arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v2.ts',
  'arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v3.ts',
]);
const A7_TEST_FILES = Object.freeze(A7_FILES.map((file) => file.replace(/\.ts$/u, '.test.ts')));
const A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_FILE =
  'arena-v2-a7-formal-evidence-retrieval-verifier-candidate-v1.ts';
const A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_TEST_FILE =
  'arena-v2-a7-formal-evidence-retrieval-verifier-candidate-v1.test.ts';
const A7_FORMAL_BUDGET_EVIDENCE_VALUE_FILE =
  'arena-v2-a7-formal-budget-evidence-value-candidate-v1.ts';
const A7_FORMAL_EVIDENCE_STORE_ADAPTER_FILE =
  'scripts/lib/arena-a7-formal-evidence-store-adapters-candidate-v1.ts';
const A7_FORMAL_EVIDENCE_STORE_ADAPTER_TEST_FILE =
  'tests/arena/a7-formal-evidence-store-adapters-candidate-v1.test.ts';
const A7_STRUCTURAL_BUDGET_EVIDENCE_FILE =
  'arena-v2-a7-formal-budget-structural-evidence-candidate-v1.ts';
const A7_STRUCTURAL_BUDGET_EVIDENCE_TEST_FILE =
  'arena-v2-a7-formal-budget-structural-evidence-candidate-v1.test.ts';
const A7_STRUCTURAL_BUDGET_LIMIT_PROPOSAL_FILE =
  'arena-v2-a7-formal-budget-structural-limit-proposal-candidate-v1.ts';
const A7_STRUCTURAL_BUDGET_LIMIT_PROPOSAL_TEST_FILE =
  'arena-v2-a7-formal-budget-structural-limit-proposal-candidate-v1.test.ts';
const A7_STRUCTURAL_BUDGET_INDEPENDENT_APPROVAL_FILE =
  'arena-v2-a7-formal-budget-independent-approval-decision-candidate-v1.ts';
const A7_STRUCTURAL_BUDGET_INDEPENDENT_APPROVAL_TEST_FILE =
  'arena-v2-a7-formal-budget-independent-approval-decision-candidate-v1.test.ts';
const A7_APPROVED_BUDGET_POLICY_ASSEMBLY_FILE =
  'arena-v2-a7-formal-budget-approved-policy-assembly-candidate-v1.ts';
const A7_APPROVED_BUDGET_POLICY_ASSEMBLY_TEST_FILE =
  'arena-v2-a7-formal-budget-approved-policy-assembly-candidate-v1.test.ts';
const SHARED_FORMAL_BUDGET_FILE =
  'packages/arena-presentation-contracts/src/arena-stage7-formal-asset-budget-v1.ts';
const PROPOSED_FORMAL_BUDGET_V2_FILE =
  'packages/arena-presentation-contracts/src/arena-stage7-formal-asset-budget-v2-candidate.ts';
const A3_A6_READINESS_FILE =
  'packages/arena-product-presentation/src/arena-v2-a3-a6-formal-asset-readiness-candidate-v1.ts';
const A3_A6_APPROVAL_EVIDENCE_LEDGER_FILE =
  'packages/arena-product-presentation/src/arena-v2-a3-a6-production-approval-evidence-ledger-candidate-v1.ts';
const A3_A6_PRODUCTION_WORK_QUEUE_FILE =
  'packages/arena-product-presentation/src/arena-v2-a3-a6-formal-asset-production-work-queue-candidate-v1.ts';
const A3_MAP_PRODUCTION_REVIEW_PREPARATION_FILE =
  'packages/arena-product-presentation/src/arena-v2-a3-map-production-review-preparation-candidate-v1.ts';
const A3_SURVIVAL_ENEMY_PRODUCTION_REVIEW_PREPARATION_FILE =
  'packages/arena-product-presentation/src/arena-v2-a3-survival-enemy-production-review-preparation-candidate-v1.ts';
const A4_PLAYABLE_CHARACTER_PRODUCTION_REVIEW_PREPARATION_FILE =
  'packages/arena-product-presentation-three/src/arena-v2-a4-playable-character-production-review-preparation-candidate-v1.ts';
const A4_WEAPON_ATTACHMENT_PRODUCTION_REVIEW_PREPARATION_FILE =
  'packages/arena-product-presentation-three/src/arena-v2-a4-weapon-attachment-production-review-preparation-candidate-v1.ts';
const A4_FORMAL_MATERIAL_TEXTURE_PRODUCTION_REVIEW_PREPARATION_FILE =
  'packages/arena-product-presentation-three/src/arena-v2-a4-formal-material-texture-production-review-preparation-candidate-v1.ts';
const A4_WEAPON_IMPACT_AUDIO_PRODUCTION_REVIEW_PREPARATION_FILE =
  'packages/arena-product-presentation-three/src/arena-v2-a4-weapon-impact-audio-production-review-preparation-candidate-v1.ts';
const A4_WEAPON_PHASE_AUDIO_PRODUCTION_REVIEW_PREPARATION_FILE =
  'packages/arena-product-presentation-three/src/arena-v2-a4-weapon-phase-audio-production-review-preparation-candidate-v1.ts';
const A5_CORE_FEEDBACK_VFX_PRODUCTION_REVIEW_PREPARATION_FILE =
  'packages/arena-product-presentation-three/src/arena-v2-a5-core-feedback-vfx-production-review-preparation-candidate-v1.ts';
const A5_MODE_AND_SUPPLY_AUDIO_PRODUCTION_REVIEW_PREPARATION_FILE =
  'packages/arena-product-presentation-three/src/arena-v2-a5-mode-and-supply-audio-production-review-preparation-candidate-v1.ts';
const A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_FILE =
  'packages/arena-product-presentation-three/src/arena-v2-a3-a6-formal-asset-production-review-program-candidate-v1.ts';
const A3_A6_PRODUCTION_REVIEW_EVIDENCE_SUBMISSION_FILE =
  'packages/arena-product-presentation-three/src/arena-v2-a3-a6-production-review-evidence-submission-candidate-v1.ts';
const A3_A6_PRODUCTION_REVIEW_EVIDENCE_INDEPENDENT_EVALUATION_FILE =
  'packages/arena-product-presentation-three/src/arena-v2-a3-a6-production-review-evidence-independent-evaluation-candidate-v1.ts';
const A3_A6_PRODUCTION_REVIEW_ACCEPTED_EVIDENCE_SET_FILE =
  'packages/arena-product-presentation-three/src/arena-v2-a3-a6-production-review-accepted-evidence-set-candidate-v1.ts';
const A3_A6_PRODUCTION_APPROVAL_DECISION_RECORD_FILE =
  'packages/arena-product-presentation-three/src/arena-v2-a3-a6-production-approval-decision-record-candidate-v1.ts';
const CANDIDATE_FILE_SET = new Set<string>([
  ...P7_FILES,
  ...A7_FILES,
  A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_FILE,
  A7_FORMAL_BUDGET_EVIDENCE_VALUE_FILE,
  A7_STRUCTURAL_BUDGET_EVIDENCE_FILE,
  A7_STRUCTURAL_BUDGET_LIMIT_PROPOSAL_FILE,
  A7_STRUCTURAL_BUDGET_INDEPENDENT_APPROVAL_FILE,
  A7_APPROVED_BUDGET_POLICY_ASSEMBLY_FILE,
]);
const DEFAULT_ENTRIES = Object.freeze([
  'src/entry/web.ts',
  'src/entry/wechat.ts',
  'src/entry/douyin.ts',
]);
const CANDIDATE_REFERENCE = /arena-v2-(?:p7-|a7-formal-(?:visual-media|evidence-retrieval-verifier|budget-(?:structural|independent|approved))|a3-a6-(?:formal-asset-readiness|production-approval-evidence-ledger|formal-asset-production-work-queue|formal-asset-production-review-program|production-review-(?:evidence-(?:submission|independent-evaluation)|accepted-evidence-set)|production-approval-decision-record)|a3-(?:map|survival-enemy)-production-review-preparation|a4-(?:playable-character|weapon-attachment|formal-material-texture|weapon-(?:impact|phase)-audio)-production-review-preparation|a5-(?:core-feedback-vfx|mode-and-supply-audio)-production-review-preparation)|arena-stage7-formal-asset-budget-v2|ArenaV2(?:P7|A7|A3A6|A3Map|A3SurvivalEnemy|A4PlayableCharacter|A4WeaponAttachment|A4FormalMaterialTexture|A4WeaponImpactAudio|A4WeaponPhaseAudio|A5CoreFeedbackVfx|A5ModeAndSupplyAudio)|ARENA_(?:V2_(?:P7|A7|A3_A6|A3_MAP|A3_SURVIVAL_ENEMY|A4_PLAYABLE_CHARACTER|A4_WEAPON_ATTACHMENT|A4_FORMAL_MATERIAL_TEXTURE|A4_WEAPON_IMPACT_AUDIO|A4_WEAPON_PHASE_AUDIO|A5_CORE_FEEDBACK_VFX|A5_MODE_AND_SUPPLY_AUDIO)|STAGE7_FORMAL_ASSET_BUDGET_V2)/u;
const FORBIDDEN_RUNTIME = /from\s+['"](?:three|node:(?:child_process|fs|net|http|https))['"]|\b(?:window|document)\s*[.[]|\bMath\.random\s*\(|\b(?:Date|performance)\.now\s*\(/u;

async function source(root: string, relative: string): Promise<string> {
  return readFile(path.join(root, relative), 'utf8');
}

function assertMarker(text: string, marker: string, name: string): void {
  if (!text.includes(marker)) throw new Error(`${name}缺少${marker}。`);
}

function assertAcyclic(sources: ReadonlyMap<string, string>): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (file: string): void => {
    if (visiting.has(file)) throw new Error(`P7候选依赖形成循环：${file}。`);
    if (visited.has(file)) return;
    visiting.add(file);
    const imports = [...(sources.get(file) ?? '').matchAll(
      /from\s+['"]\.\/(arena-v2-p7-[^'"]+)\.js['"]/gu,
    )].map((match) => `${match[1]}.ts`);
    for (const dependency of imports) {
      if (!sources.has(dependency)) throw new Error(`${file}引用未知P7候选${dependency}。`);
      visit(dependency);
    }
    visiting.delete(file);
    visited.add(file);
  };
  for (const file of sources.keys()) visit(file);
}

async function main(): Promise<void> {
  const root = process.cwd();
  const releaseRoot = path.join(root, 'packages/arena-release/src');
  const candidateSources = new Map<string, string>();
  for (const file of P7_FILES) {
    const text = await readFile(path.join(releaseRoot, file), 'utf8');
    candidateSources.set(file, text);
    assertMarker(text, "status: 'production-unreachable'", file);
    assertMarker(text, "implementationStatus: 'code-written-not-run'", file);
    assertMarker(text, "currentGate: 'incomplete'", file);
    assertMarker(text, 'hardGate: false', file);
    assertMarker(text, "validationStatus: 'not-run'", file);
    assertMarker(text, 'defaultReleaseBundleWired: false', file);
    if (FORBIDDEN_RUNTIME.test(text)) throw new Error(`${file}包含P7候选禁止的运行时依赖。`);
  }
  assertAcyclic(candidateSources);

  const preregistration = candidateSources.get(
    'arena-v2-p7-preregistration-candidate-v1.ts',
  )!;
  for (const marker of [
    'environmentBuildSetIdentityFrozen: true',
    'minimumTotalScore: 90',
    'minimumScorePerDimension: 80',
  ]) assertMarker(preregistration, marker, 'P7 preregistration identity');

  const evaluation = candidateSources.get(
    'arena-v2-p7-evidence-evaluation-candidate-v1.ts',
  )!;
  for (const marker of [
    'scoreEvidenceMissingYieldsIncomplete: true',
    'missingEvidenceShaUsesNull: true',
    'environmentBuildSetIdentityRequired: true',
    'scoreAndDefectGatesFromPreregistration: true',
    'missingAndAuditGatesFromPreregistration: true',
  ]) assertMarker(evaluation, marker, 'P7 evidence evaluation closure');

  const stageReportV1 = candidateSources.get('arena-v2-p7-stage-report-candidate-v1.ts')!;
  for (const marker of [
    'evidenceIndexCount: 29',
    'preservesMissingEvidenceSlots: true',
    'environmentBuildSetIdentityPropagated: true',
  ]) assertMarker(stageReportV1, marker, 'P7 stage report V1 evidence index');

  const a7Sources = new Map<string, string>();
  for (const file of A7_FILES) {
    const a7 = await readFile(path.join(releaseRoot, file), 'utf8');
    a7Sources.set(file, a7);
    for (const marker of [
      "status: 'production-unreachable'",
      "implementationStatus: 'code-written-not-run'",
      "validationStatus: 'not-run'",
      'defaultReleaseBundleWired: false',
      'defaultEntryWired: false',
      'publishes: false',
      'createsOrModifiesAssets: false',
      'participatesInGameplayAuthority: false',
      'currentPassInstanceExists: false',
      'p7ReleaseFreezeManifestOwnedHere: false',
      'p7AdvanceComputedHere: false',
    ]) assertMarker(a7, marker, `${file} formal visual/media freeze evidence`);
    if (FORBIDDEN_RUNTIME.test(a7)) {
      throw new Error(`${file}包含A7候选禁止的运行时依赖。`);
    }
  }
  const formalEvidenceRetrievalVerifier = await readFile(
    path.join(releaseRoot, A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_FILE),
    'utf8',
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "currentGate: 'incomplete'",
    'hardGate: false',
    'defaultReleaseBundleWired: false',
    'defaultEntryWired: false',
    "validationStatus: 'not-run'",
    'readsOnlyThroughInjectedEvidenceReader: true',
    'hashesOnlyThroughInjectedSha256Adapter: true',
    'writesOnlyThroughInjectedReceiptWriter: true',
    'receiptWriterMustCommitOneAtomicBatch: true',
    'hasNoDefaultFileNetworkOrProcessCapability: true',
    'formalEvidenceRetrievalPlanIdentityRequired: true',
    'formalEvidenceStoreSnapshotIdentityRequired: true',
    'everyReadHashPayloadAndReceiptBatchBindsStoreSnapshot: true',
    'finalVerificationDirectoryRetainsRetrievalPlanIdentity: true',
    'fixedConcurrency: 1',
    "failurePolicy: 'fail-closed-no-partial-result'",
    'verifierMustRemainIndependentFromAllEvidenceProducers: true',
    'receiptLocatorAndShaMustRemainDistinctFromSourceAndOtherReceipts: true',
    'releasesInjectedPortsAfterSettlement: true',
    'producesA7PassOrReleaseApproval: false',
    'validateArenaV2A7FormalEvidenceRecordIndexCandidateV3',
    'verificationReceiptIndexIdentityHash',
  ]) assertMarker(
    formalEvidenceRetrievalVerifier,
    marker,
    'A7 formal Evidence retrieval verifier',
  );
  if (FORBIDDEN_RUNTIME.test(formalEvidenceRetrievalVerifier)) {
    throw new Error(
      `${A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_FILE}包含取回核验器禁止的默认运行时依赖。`,
    );
  }
  const formalEvidenceStoreAdapter = await source(
    root,
    A7_FORMAL_EVIDENCE_STORE_ADAPTER_FILE,
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "currentGate: 'incomplete'",
    'hardGate: false',
    'defaultReleaseBundleWired: false',
    'defaultEntryWired: false',
    "validationStatus: 'not-run'",
    'explicitEvidenceRootRequired: true',
    'evidenceRootDirectoryIdentityPinnedByFactory: true',
    'evidenceRootIdentityRevalidatedBeforeReadWriteAndReturn: true',
    'receiptParentDirectoryIdentityPinnedByFactory: true',
    'receiptParentIdentityRevalidatedBeforeCommittedReturn: true',
    'expectedEvidenceStoreSnapshotIdentityRequired: true',
    'adapterIdsOwnedAndEnforcedByFactory: true',
    'readerAndHasherRequestsCanonicalizedBeforeUse: true',
    'hasherCopiesNonSharedBytesBeforeHashing: true',
    'readerSidecarMatchesExpectedRecordBeforeEvidenceRead: true',
    'writerPayloadRespectsFactoryByteLimitBeforeIo: true',
    'writerClosesBatchIdentityBeforeIo: true',
    'writerRecomputesSessionIdentityFromEveryPayload: true',
    'writerValidatesCanonicalPayloadAndRecomputesIdentityHash: true',
    'writerRejectsNestedAdapterIdentitySpoofingBeforeIo: true',
    'readerHasherAndWriterPinnedToSameSnapshot: true',
    'storeSnapshotManifestRequiredAtCanonicalRootPath: true',
    'storeSnapshotManifestRevalidatedBeforeReadWriteAndReturn: true',
    'storeSnapshotManifestRevalidatedAfterEveryEvidenceRead: true',
    'storeSnapshotCreatedAtMustCoverEveryEvidenceRecord: true',
    'storeSnapshotManifestMustUseCanonicalExactBytes: true',
    'canonicalStoreSnapshotManifestSerializerProvided: true',
    'sidecarMetadataRequired: true',
    'sourceMetadataSidecarMustUseCanonicalExactBytes: true',
    'canonicalSourceMetadataSidecarSerializerProvided: true',
    'receiptMetadataUsesCanonicalSidecarSerializer: true',
    'receiptBodyUsesCanonicalSerializer: true',
    'stableOpenFileAndPathIdentityRequired: true',
    'symlinkEscapeRejected: true',
    'explicitPerRecordByteLimitRequired: true',
    'sha256ComputedFromRetrievedBytes: true',
    'receiptBatchPublishedThroughCommittedDirectory: true',
    'committedReceiptBatchReadBackBeforeReturn: true',
    'committedReceiptBytesMetadataAndShaMustMatch: true',
    'readbackFailureRemovesOnlyNewSession: true',
    'receiptParentMustBePreprovisioned: true',
    'existingReceiptSessionCannotBeOverwritten: true',
    'defaultProductionWiringProvided: false',
    'readVerifiedEvidenceArtifactBytes',
    'writeArenaEvidenceDirectoryExclusive',
  ]) assertMarker(formalEvidenceStoreAdapter, marker, 'A7 formal Evidence Store Adapter');
  const a7V1 = a7Sources.get(A7_FILES[0]!)!;
  const a7V2 = a7Sources.get(A7_FILES[1]!)!;
  const a7V3 = a7Sources.get(A7_FILES[2]!)!;
  for (const marker of [
    "currentGate: 'incomplete'",
    'hardGate: false',
    'formalVisualMediaReady: false',
    'formalAssetCatalogCount: 130',
    "formalBudgetPolicyApprovalStatus: 'proposed-not-approved'",
    "formalBudgetStructuralLimitsStatus: 'unresolved-not-approved'",
    'ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS',
    'exactIdPathByteShaCoverage: true',
    'encodedMediaFormatPolicyCoverage: true',
    'textureDecodedFormatPolicyCoverage: true',
    'textureDimensionCoverage: true',
    "'formal-budget-v2-policy:proposed-not-approved'",
    "'formal-budget-v2-structural-limits:unresolved-not-approved'",
  ]) assertMarker(a7V2, marker, 'A7 V2 130-item unapproved budget closure');
  for (const marker of [
    'evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3',
    'validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3',
    'formalAssetCatalogCount: 130',
    'requiresApprovedPolicyAssembly: true',
    'requiresSameSourceAndSixEnvironmentBuildSet: true',
    'budgetByteAggregatesMustRemainSafeIntegers: true',
    'approvedPolicyRetainsBaseEncodedMediaFormatIdentity: true',
    'approvedPolicyRetainsBaseTextureDecodedMetadataIdentity: true',
    'approvedPolicyRetainsAcceptedDecodedAudioObservation: true',
    'approvedPolicyMediaIdentityCoverage',
    'textureDimensionAndDecodedByteIdentityCoverage: true',
    'decodedAudioObservationAndMaximumCoverage: true',
    'approvedPolicyRevalidatesAcceptedObservationFloorsAndLifecycle: true',
    'approvedPolicyObservationFloorCoverage',
    'approvedPolicyRevalidatesEnvironmentObservationEvidenceIdentity: true',
    'everyEnvironmentObservationBoundToOriginalEvidenceIdentity: true',
    'approvedPolicyRevalidatesIndependentGovernanceRolesAndTimeline: true',
    'approvedPolicyGovernanceProvenanceCoverage',
    'approvedPolicyRevalidatesIndependentApprovalClosureSummary: true',
    'approvedPolicyIndependentApprovalClosureCoverage',
    'approvedPolicyRevalidatesAssemblyGovernanceEnvelope: true',
    'approvedPolicyAssemblyGovernanceEnvelopeCoverage',
    'formalEvidenceRecordIndexOwnedByA7V3: true',
    'formalEvidenceRecordIdsMustRemainDistinct: true',
    'formalEvidenceRecordLocatorsRequired: true',
    'formalEvidenceRecordLocatorsMustRemainDistinct: true',
    'formalEvidenceRecordMaximumCount:',
    'formalEvidenceRecordMediaTypeAndByteLengthRequired: true',
    'formalEvidenceByteLengthAggregateMustRemainSafeInteger: true',
    'formalEvidenceRecordCanonicalUtcTimeRequired: true',
    'formalEvidenceRecordGovernanceTimelineBindingRequired: true',
    'formalEvidenceRecordProducerIdentityRequired: true',
    'formalEvidenceRecordGovernanceRoleBindingRequired: true',
    'formalEvidenceRecordCanonicalStoreLocatorRequired: true',
    'formalEvidenceRecordIndexIdentityOwnedByA7V3: true',
    'formalEvidenceRecordIndexIdentityHash',
    'formalEvidenceRetrievalPlanOwnedByA7V3: true',
    'formalEvidenceRetrievalPlanDoesNotGrantPass: true',
    'formalEvidenceStoreSnapshotIdentityRequired: true',
    'everyVerificationReceiptBindsSameStoreSnapshot: true',
    'everyVerificationReceiptBindsDerivedRetrievalPlan: true',
    'createArenaV2A7FormalEvidenceRetrievalPlanCandidateV3',
    'retrievalPlanIdentityHash',
    'formalEvidenceRecordIndependentVerificationRequired: true',
    'formalEvidenceRecordVerifierMustRemainDistinctFromProducer: true',
    'formalEvidenceRecordVerifierMustRemainIndependentFromAllProducers: true',
    'formalEvidenceRecordVerificationReceiptIdentityOwnedByA7V3: true',
    'createFormalEvidenceRecordVerificationIndex',
    'formalEvidenceRecordVerificationIndexIdentityHash',
    'assertFormalEvidenceLocator',
    'evidence://arena-v2/',
    'evidenceRecordedAtUtc',
    'evidenceProducerId',
    'totalFormalEvidenceBytes',
    'assertFormalEvidenceMediaType',
    'evidenceByteLength',
    'formalEvidenceRecordShasMustRemainDistinct: true',
    'createFormalEvidenceRecordIndex',
    'formalEvidenceRecordLocatorDirectory',
    'replacesOnlyObsoleteV1V2BudgetGate: true',
    'currentV2PolicyRemainsUnchanged: true',
    'currentPassInstanceExists: false',
    'hardGate: false',
    'defaultReleaseBundleWired: false',
    'defaultEntryWired: false',
    'p7ReleaseFreezeManifestOwnedHere: false',
    'p7AdvanceComputedHere: false',
  ]) assertMarker(a7V3, marker, 'A7 V3 approved budget evidence binding');

  const structuralBudgetEvidence = await readFile(
    path.join(releaseRoot, A7_STRUCTURAL_BUDGET_EVIDENCE_FILE),
    'utf8',
  );
  for (const marker of [
    'createArenaV2A7FormalBudgetStructuralEvidenceSubmissionCandidateV1',
    'createArenaV2A7FormalBudgetStructuralEvidenceEvaluationCandidateV1',
    'createArenaV2A7FormalBudgetEvidenceProjectionCandidateV1',
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
  ]) assertMarker(structuralBudgetEvidence, marker, 'A7 structural budget evidence');
  if (FORBIDDEN_RUNTIME.test(structuralBudgetEvidence)) {
    throw new Error(`${A7_STRUCTURAL_BUDGET_EVIDENCE_FILE}包含证据合同禁止的运行时依赖。`);
  }

  const structuralBudgetLimitProposal = await readFile(
    path.join(releaseRoot, A7_STRUCTURAL_BUDGET_LIMIT_PROPOSAL_FILE),
    'utf8',
  );
  for (const marker of [
    'createArenaV2A7FormalBudgetStructuralLimitProposalCandidateV1',
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
    'acceptedEnvironmentObservationsRetainEvidenceLocatorAndSha256: true',
    'evidenceLocator: observation.evidenceLocator as string',
    'proposalRetainsStructuralEvidenceCaptureProvenance: true',
    'structuralEvidenceSubmissionIdentity: evaluation.submissionIdentity',
    'structuralEvidenceObservationBatchId: evaluation.observationBatchId',
    'structuralEvidenceCapturedAtUtc: evaluation.capturedAtUtc',
    'structuralEvidenceReviewedAtUtc: evaluation.reviewedAtUtc',
    'proposalRetainsStructuralEvidenceReviewTimeline: true',
    'evidenceRecordLocatorsAndHashesMustRemainDomainDistinct: true',
    'grantsBudgetApproval: false',
    'hardGate: false',
    'hardGateUsable: false',
    'writesFilesOrPolicy: false',
    'runsMeasurementTools: false',
    'publishesRelease: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
  ]) assertMarker(
    structuralBudgetLimitProposal,
    marker,
    'A7 structural budget limit proposal',
  );
  if (FORBIDDEN_RUNTIME.test(structuralBudgetLimitProposal)) {
    throw new Error(
      `${A7_STRUCTURAL_BUDGET_LIMIT_PROPOSAL_FILE}包含上限提案禁止的运行时依赖。`,
    );
  }

  const structuralBudgetIndependentApproval = await readFile(
    path.join(releaseRoot, A7_STRUCTURAL_BUDGET_INDEPENDENT_APPROVAL_FILE),
    'utf8',
  );
  for (const marker of [
    'createArenaV2A7FormalBudgetIndependentApprovalDecisionCandidateV1',
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'requiresImmutableStructuralLimitProposal: true',
    'approverMustDifferFromCollectorReviewerAndProposer: true',
    'approvedRequiresArtifactAndEnvironmentHeadroomAdequacy: true',
    'approvedRequiresApplicabilityObservationFloorAndLifecycleClosure: true',
    'approvedRequiresObservedEnvironmentLifecycleSuccess: true',
    'everyObservedEnvironmentLifecycleSatisfied',
    'approvedDecisionRetainsStructuralEvidenceCaptureProvenance: true',
    'approvedDecisionRetainsIndependentGovernanceTimeline: true',
    'structuralEvidenceSubmissionIdentity: proposal.structuralEvidenceSubmissionIdentity',
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
    'writesFilesOrPolicy: false',
    'runsMeasurementTools: false',
    'publishesRelease: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
  ]) assertMarker(
    structuralBudgetIndependentApproval,
    marker,
    'A7 structural budget independent approval decision',
  );
  if (FORBIDDEN_RUNTIME.test(structuralBudgetIndependentApproval)) {
    throw new Error(
      `${A7_STRUCTURAL_BUDGET_INDEPENDENT_APPROVAL_FILE}包含独立批准记录禁止的运行时依赖。`,
    );
  }

  const approvedBudgetPolicyAssembly = await readFile(
    path.join(releaseRoot, A7_APPROVED_BUDGET_POLICY_ASSEMBLY_FILE),
    'utf8',
  );
  for (const marker of [
    'createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1',
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
    'approvedPolicyBindsAcceptedEnvironmentObservationsToEvidenceRecords: true',
    'approvedPolicyRetainsStructuralEvidenceCaptureProvenance: true',
    'approvedPolicyRetainsIndependentGovernanceRolesAndTimeline: true',
    'approvedPolicyRetainsIndependentApprovalClosureSummary: true',
    'assemblyEnvelopeRemainsOutsidePolicyGovernanceProvenance: true',
    'governanceProvenance: Object.freeze',
    'independentGovernanceRolesRemainDistinct: true',
    'independentGovernanceTimelineOrdered: true',
    'everyObservedEnvironmentLifecycleSatisfied:',
    'decision.structuralEvidenceObservationBatchId',
    'decision.structuralEvidenceCapturedAtUtc',
    'acceptedEnvironmentObservationEvidenceIdentityClosed: true',
    'entry.observed.evidenceLocator === evidenceRecord.evidenceLocator',
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
    'writesFilesOrPolicy: false',
    'publishesRelease: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
  ]) assertMarker(
    approvedBudgetPolicyAssembly,
    marker,
    'A7 approved budget policy assembly',
  );
  if (FORBIDDEN_RUNTIME.test(approvedBudgetPolicyAssembly)) {
    throw new Error(
      `${A7_APPROVED_BUDGET_POLICY_ASSEMBLY_FILE}包含Policy装配禁止的运行时依赖。`,
    );
  }

  const sharedFormalBudget = await source(root, SHARED_FORMAL_BUDGET_FILE);
  for (const marker of [
    "'arena.stage7.formal-asset-budget.v1'",
    "ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_CONTENT_HASH = '532faaa2'",
    'ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS',
  ]) assertMarker(sharedFormalBudget, marker, 'shared formal asset budget V1');
  if (FORBIDDEN_RUNTIME.test(sharedFormalBudget)) {
    throw new Error(`${SHARED_FORMAL_BUDGET_FILE}包含正式预算数据合同禁止的运行时依赖。`);
  }
  const proposedFormalBudgetV2 = await source(root, PROPOSED_FORMAL_BUDGET_V2_FILE);
  for (const marker of [
    "'arena.stage7.formal-asset-budget.v2-candidate'",
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    "approvalStatus: 'proposed-not-approved'",
    'contentVersion: 4',
    'hardGate: false',
    'hardGateUsable: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    "status: 'unresolved-not-approved'",
    'createsOrModifiesAssets: false',
    'loadsAssets: false',
    'ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS',
    'readonly widthPixels: number',
    'readonly heightPixels: number',
    'readonly encodedMediaFormat: ArenaStage7FormalAssetEncodedMediaFormatV2',
    'ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2',
    'readonly decodedTextureFormat: ArenaStage7FormalAssetTextureDecodedFormatV2',
    'ARENA_STAGE7_FORMAL_ASSET_TEXTURE_DECODED_FORMAT_V2',
    "encodedMediaFormatMetadataOwner: 'formal-presentation-asset-catalog'",
    "textureDimensionMetadataOwner: 'formal-presentation-asset-catalog'",
  ]) assertMarker(proposedFormalBudgetV2, marker, 'proposed formal asset budget V2');
  if (FORBIDDEN_RUNTIME.test(proposedFormalBudgetV2)) {
    throw new Error(`${PROPOSED_FORMAL_BUDGET_V2_FILE}包含候选预算数据合同禁止的运行时依赖。`);
  }
  assertMarker(
    a7V1,
    "from '@number-strategy-jump/arena-presentation-contracts'",
    'A7 shared formal budget consumption',
  );

  const readiness = await source(root, A3_A6_READINESS_FILE);
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'formalReady: false',
    'hardGate: false',
    'defaultCompositionWired: false',
    'defaultEntryWired: false',
    'createsOrModifiesAssets: false',
    'grantsApproval: false',
    'participatesInGameplayAuthority: false',
    'p7AdvanceComputedHere: false',
    'proposedFormalBudgetPolicyV2Identity',
    "status: 'candidate-coverage-only'",
    'encodedMediaFormatSourceProjectionClosed: true',
    'textureDimensionSourceProjectionClosed: true',
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'assetUsePermitted: false',
    'hardGateUsable: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
  ]) assertMarker(readiness, marker, 'A3-A6 formal asset readiness candidate');
  if (FORBIDDEN_RUNTIME.test(readiness)) {
    throw new Error(`${A3_A6_READINESS_FILE}包含正式资产就绪候选禁止的运行时依赖。`);
  }
  const approvalEvidenceLedger = await source(root, A3_A6_APPROVAL_EVIDENCE_LEDGER_FILE);
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    "productionApprovalStatus: 'missing-not-approved'",
    'grantsApproval: false',
    'hardGate: false',
    'assetUsePermitted: false',
    'formalReady: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    'participatesInGameplayAuthority: false',
    'createsOrModifiesAssets: false',
    'loadsAssets: false',
    'p7AdvanceComputedHere: false',
  ]) assertMarker(approvalEvidenceLedger, marker, 'A3-A6 production approval evidence ledger');
  if (FORBIDDEN_RUNTIME.test(approvalEvidenceLedger)) {
    throw new Error(`${A3_A6_APPROVAL_EVIDENCE_LEDGER_FILE}包含批准证据账本禁止的运行时依赖。`);
  }
  const productionWorkQueue = await source(root, A3_A6_PRODUCTION_WORK_QUEUE_FILE);
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    "allowedScope: 'contract-source-budget-and-review-preparation-only'",
    "nextPreparationBatchId: WORK_BATCHES[0]!.batchId",
    'productionBlockoutAllowed: false',
    'integrationAllowed: false',
    'finalAllowed: false',
    'grantsApproval: false',
    'assetUsePermitted: false',
    'createsOrModifiesAssets: false',
    'loadsAssets: false',
    'participatesInGameplayAuthority: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    "usedSkillIds: Object.freeze(['game-art-director'] as const)",
  ]) assertMarker(productionWorkQueue, marker, 'A3-A6 formal asset production work queue');
  if (FORBIDDEN_RUNTIME.test(productionWorkQueue)) {
    throw new Error(`${A3_A6_PRODUCTION_WORK_QUEUE_FILE}包含资产准备队列禁止的运行时依赖。`);
  }
  const mapProductionReviewPreparation = await source(
    root,
    A3_MAP_PRODUCTION_REVIEW_PREPARATION_FILE,
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'formalReady: false',
    'grantsApproval: false',
    'assetUsePermitted: false',
    'createsOrModifiesAssets: false',
    'loadsAssets: false',
    'participatesInGameplayAuthority: false',
    'changesRuleCollisionOrRoute: false',
    'derivesMovementMetricsFromArt: false',
    'usesRegisteredMobilityEnvelope: true',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    "currentAllowedScope: 'source-brief-structure-budget-and-review-preparation-only'",
    "usedSkillIds: Object.freeze(['level-design', 'game-art-director'] as const)",
    'registeredSequentialRouteIsNotClaimedAsValidatedCriticalPath: true',
    "reviewStatus: 'not-run'",
    'productionBlockoutAllowed: false',
    'integrationAllowed: false',
    'finalAllowed: false',
  ]) assertMarker(
    mapProductionReviewPreparation,
    marker,
    'A3 map production review preparation candidate',
  );
  if (FORBIDDEN_RUNTIME.test(mapProductionReviewPreparation)) {
    throw new Error(
      `${A3_MAP_PRODUCTION_REVIEW_PREPARATION_FILE}包含地图评审准备候选禁止的运行时依赖。`,
    );
  }
  const survivalEnemyProductionReviewPreparation = await source(
    root,
    A3_SURVIVAL_ENEMY_PRODUCTION_REVIEW_PREPARATION_FILE,
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'formalReady: false',
    'grantsApproval: false',
    'assetUsePermitted: false',
    'createsOrModifiesAssets: false',
    'createsReferenceImages: false',
    'usesAiGeneration: false',
    'loadsAssets: false',
    'participatesInGameplayAuthority: false',
    'changesEnemyFamilyCount: false',
    'changesPressurePolicy: false',
    'changesCollisionMovementOrActionTiming: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    "currentAllowedScope: 'source-brief-silhouette-animation-budget-and-review-preparation-only'",
    "usedSkillIds: Object.freeze(['character-design-sheet', 'game-art-director'] as const)",
    'oneFamilyMustRemainOneFamilyAtEveryPressureStage: true',
    "reviewStatus: 'not-run'",
    'productionBlockoutAllowed: false',
    'integrationAllowed: false',
    'finalAllowed: false',
  ]) assertMarker(
    survivalEnemyProductionReviewPreparation,
    marker,
    'A3 survival enemy production review preparation candidate',
  );
  if (FORBIDDEN_RUNTIME.test(survivalEnemyProductionReviewPreparation)) {
    throw new Error(
      `${A3_SURVIVAL_ENEMY_PRODUCTION_REVIEW_PREPARATION_FILE}包含敌人评审准备候选禁止的运行时依赖。`,
    );
  }
  const playableCharacterProductionReviewPreparation = await source(
    root,
    A4_PLAYABLE_CHARACTER_PRODUCTION_REVIEW_PREPARATION_FILE,
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'formalReady: false',
    'grantsApproval: false',
    'assetUsePermitted: false',
    'createsOrModifiesAssets: false',
    'createsReferenceImages: false',
    'loadsAssets: false',
    'participatesInGameplayAuthority: false',
    'changesCharacterCount: false',
    'changesInputContract: false',
    'addsCharacterSkills: false',
    'changesCollisionMovementJumpOrActionTiming: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    "currentAllowedScope: 'source-brief-handling-pose-value-pattern-animation-budget-and-review-preparation-only'",
    "usedSkillIds: Object.freeze(['character-design-sheet', 'game-art-director'] as const)",
    'sixGameplayDefinitionsAreNotSixApprovedDistinctModels: true',
    'sharedModelReuseDoesNotWaiveRoleReadability: true',
    "reviewStatus: 'not-run'",
    'productionBlockoutAllowed: false',
    'integrationAllowed: false',
    'finalAllowed: false',
  ]) assertMarker(
    playableCharacterProductionReviewPreparation,
    marker,
    'A4 playable character production review preparation candidate',
  );
  if (FORBIDDEN_RUNTIME.test(playableCharacterProductionReviewPreparation)) {
    throw new Error(
      `${A4_PLAYABLE_CHARACTER_PRODUCTION_REVIEW_PREPARATION_FILE}包含角色评审准备候选禁止的运行时依赖。`,
    );
  }
  const weaponAttachmentProductionReviewPreparation = await source(
    root,
    A4_WEAPON_ATTACHMENT_PRODUCTION_REVIEW_PREPARATION_FILE,
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'formalReady: false',
    'grantsApproval: false',
    'assetUsePermitted: false',
    'createsOrModifiesAssets: false',
    'downloadsAssets: false',
    'convertsAssets: false',
    'loadsAssets: false',
    'participatesInGameplayAuthority: false',
    'changesWeaponCount: false',
    'changesInputContract: false',
    'changesActionTimingHitOrMovement: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    "currentAllowedScope: 'source-brief-silhouette-grip-ground-action-budget-and-review-preparation-only'",
    "usedSkillIds: Object.freeze(['game-3d-assets', 'game-art-director'] as const)",
    'candidateTransformIsNotScreenshotEvidence: true',
    'attachmentDoesNotInferHitOrMovement: true',
    "reviewStatus: 'not-run'",
    'productionBlockoutAllowed: false',
    'integrationAllowed: false',
    'finalAllowed: false',
  ]) assertMarker(
    weaponAttachmentProductionReviewPreparation,
    marker,
    'A4 weapon attachment production review preparation candidate',
  );
  if (FORBIDDEN_RUNTIME.test(weaponAttachmentProductionReviewPreparation)) {
    throw new Error(
      `${A4_WEAPON_ATTACHMENT_PRODUCTION_REVIEW_PREPARATION_FILE}包含武器附件评审准备候选禁止的运行时依赖。`,
    );
  }
  const formalMaterialTextureProductionReviewPreparation = await source(
    root,
    A4_FORMAL_MATERIAL_TEXTURE_PRODUCTION_REVIEW_PREPARATION_FILE,
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'formalReady: false',
    'grantsApproval: false',
    'assetUsePermitted: false',
    'createsOrModifiesAssets: false',
    'downloadsAssets: false',
    'convertsAssets: false',
    'loadsAssets: false',
    'participatesInGameplayAuthority: false',
    'changesMaterialProfiles: false',
    'changesLightingRuntime: false',
    'infersGameplayFromColorOrMaterial: false',
    'changesMapWeaponCharacterOrEnemyRules: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    "currentAllowedScope: 'source-binding-color-space-memory-lighting-and-review-preparation-only'",
    "usedSkillIds: Object.freeze(['threejs-materials-lighting', 'game-art-director'] as const)",
    "requiredAlbedoColorSpace: 'srgb'",
    "imageBasedLightingPolicy: 'not-selected'",
    'rgba8EstimateIsNotRuntimePeakMeasurement: true',
    'catalogBindingIsNotRuntimeMaterialProof: true',
    "reviewStatus: 'not-run'",
    'productionBlockoutAllowed: false',
    'integrationAllowed: false',
    'finalAllowed: false',
  ]) assertMarker(
    formalMaterialTextureProductionReviewPreparation,
    marker,
    'A4 formal material texture production review preparation candidate',
  );
  if (FORBIDDEN_RUNTIME.test(formalMaterialTextureProductionReviewPreparation)) {
    throw new Error(
      `${A4_FORMAL_MATERIAL_TEXTURE_PRODUCTION_REVIEW_PREPARATION_FILE}包含材质贴图评审准备候选禁止的运行时依赖。`,
    );
  }
  const weaponImpactAudioProductionReviewPreparation = await source(
    root,
    A4_WEAPON_IMPACT_AUDIO_PRODUCTION_REVIEW_PREPARATION_FILE,
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'formalReady: false',
    'grantsApproval: false',
    'assetUsePermitted: false',
    'createsOrModifiesAssets: false',
    'downloadsAssets: false',
    'convertsAssets: false',
    'loadsOrDecodesAssets: false',
    'playsAudio: false',
    'participatesInGameplayAuthority: false',
    'changesWeaponCount: false',
    'changesActionTimingHitRingOutOrMovement: false',
    'changesAudioRuntimeOrMix: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    "currentAllowedScope: 'source-identity-causality-mix-budget-and-review-preparation-only'",
    "usedSkillIds: Object.freeze(['audio-design', 'game-art-director'] as const)",
    "impactActionLookupPolicy: 'exact-action-definition-id'",
    "route: 'voice-gain→SFX→Master→limiter→destination'",
    'audioNeverInfersHitRingOutOrMovement: true',
    'limiterIsSafetyNotMixApproval: true',
    "reviewStatus: 'not-run'",
    'productionBlockoutAllowed: false',
    'integrationAllowed: false',
    'finalAllowed: false',
  ]) assertMarker(
    weaponImpactAudioProductionReviewPreparation,
    marker,
    'A4 weapon impact audio production review preparation candidate',
  );
  if (FORBIDDEN_RUNTIME.test(weaponImpactAudioProductionReviewPreparation)) {
    throw new Error(
      `${A4_WEAPON_IMPACT_AUDIO_PRODUCTION_REVIEW_PREPARATION_FILE}包含命中音频评审准备候选禁止的运行时依赖。`,
    );
  }
  const weaponPhaseAudioProductionReviewPreparation = await source(
    root,
    A4_WEAPON_PHASE_AUDIO_PRODUCTION_REVIEW_PREPARATION_FILE,
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'formalReady: false',
    'grantsApproval: false',
    'assetUsePermitted: false',
    'createsOrModifiesAssets: false',
    'downloadsAssets: false',
    'convertsAssets: false',
    'loadsOrDecodesAssets: false',
    'playsAudio: false',
    'participatesInGameplayAuthority: false',
    'changesWeaponOrActionCount: false',
    'changesActionTimingControlHitRingOutOrMovement: false',
    'changesAudioOwnerRuntimeOrMix: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    "currentAllowedScope: 'source-phase-causality-mix-budget-and-review-preparation-only'",
    "usedSkillIds: Object.freeze(['audio-design', 'game-art-director'] as const)",
    "source: 'ActionStarted+participant.action.phase'",
    'releaseAudioIsNotImpactConfirmation: true',
    'restoredMidActionSilenceMustNotBackfill: true',
    "reviewStatus: 'not-run'",
    'productionBlockoutAllowed: false',
    'integrationAllowed: false',
    'finalAllowed: false',
  ]) assertMarker(
    weaponPhaseAudioProductionReviewPreparation,
    marker,
    'A4 weapon phase audio production review preparation candidate',
  );
  if (FORBIDDEN_RUNTIME.test(weaponPhaseAudioProductionReviewPreparation)) {
    throw new Error(
      `${A4_WEAPON_PHASE_AUDIO_PRODUCTION_REVIEW_PREPARATION_FILE}包含阶段音频评审准备候选禁止的运行时依赖。`,
    );
  }
  const coreFeedbackVfxProductionReviewPreparation = await source(
    root,
    A5_CORE_FEEDBACK_VFX_PRODUCTION_REVIEW_PREPARATION_FILE,
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'formalReady: false',
    'grantsApproval: false',
    'assetUsePermitted: false',
    'createsOrModifiesAssets: false',
    'createsReferenceImages: false',
    'usesAiGeneration: false',
    'downloadsAssets: false',
    'loadsOrDecodesAssets: false',
    'rendersEffects: false',
    'participatesInGameplayAuthority: false',
    'changesFeedbackSemanticsOrCausality: false',
    'changesVfxRuntimeLayerParticleOrOverdrawBudgets: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    "currentAllowedScope: 'source-shape-timing-color-particle-budget-lifecycle-and-review-preparation-only'",
    "'vfx-realtime', 'particle-systems', 'game-art-director'",
    'rgba8EstimateIsNotGpuMemoryMeasurement: true',
    'ringOutAndMovementFallMustRemainCausallyDistinct: true',
    'maximumAverageOverdraw: 2',
    'distortionAllowed: false',
    "reviewStatus: 'not-run'",
    'productionBlockoutAllowed: false',
    'integrationAllowed: false',
    'finalAllowed: false',
  ]) assertMarker(
    coreFeedbackVfxProductionReviewPreparation,
    marker,
    'A5 core feedback VFX production review preparation candidate',
  );
  if (FORBIDDEN_RUNTIME.test(coreFeedbackVfxProductionReviewPreparation)) {
    throw new Error(
      `${A5_CORE_FEEDBACK_VFX_PRODUCTION_REVIEW_PREPARATION_FILE}包含核心反馈VFX评审准备候选禁止的运行时依赖。`,
    );
  }
  const modeAndSupplyAudioProductionReviewPreparation = await source(
    root,
    A5_MODE_AND_SUPPLY_AUDIO_PRODUCTION_REVIEW_PREPARATION_FILE,
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'formalReady: false',
    'grantsApproval: false',
    'assetUsePermitted: false',
    'createsOrModifiesAssets: false',
    'downloadsAssets: false',
    'convertsAssets: false',
    'loadsOrDecodesAssets: false',
    'playsAudio: false',
    'participatesInGameplayAuthority: false',
    'changesModeSupplyFallRespawnOrResultSemantics: false',
    'changesAudioRuntimeQueueVoiceOrMixBudgets: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    "currentAllowedScope: 'source-causality-priority-mix-mute-lifecycle-and-review-preparation-only'",
    "usedSkillIds: Object.freeze(['audio-design', 'game-art-director'] as const)",
    "source: 'validated-mode-events-and-explicit-supply-authority-facts'",
    'supplyVoicePriority: 1',
    'matchEndedVoicePriority: 3',
    'audioNeverInfersModeSupplyFallRespawnOrResult: true',
    'supplyNeverInfersLifecycleFromMarkerDisappearance: true',
    'supplyWarningEmphasisMayNotOverrideLowSemanticVoicePriority: true',
    'maximumConcurrentVoices: 8',
    "reviewStatus: 'not-run'",
    'productionBlockoutAllowed: false',
    'integrationAllowed: false',
    'finalAllowed: false',
  ]) assertMarker(
    modeAndSupplyAudioProductionReviewPreparation,
    marker,
    'A5 mode and supply audio production review preparation candidate',
  );
  if (FORBIDDEN_RUNTIME.test(modeAndSupplyAudioProductionReviewPreparation)) {
    throw new Error(
      `${A5_MODE_AND_SUPPLY_AUDIO_PRODUCTION_REVIEW_PREPARATION_FILE}包含模式与供给音频评审准备候选禁止的运行时依赖。`,
    );
  }
  const formalAssetProductionReviewProgram = await source(
    root,
    A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_FILE,
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'formalReady: false',
    'grantsApproval: false',
    'assetUsePermitted: false',
    'executesReviews: false',
    'createsOrModifiesAssets: false',
    'loadsOrDecodesAssets: false',
    'rendersOrPlaysAssets: false',
    'participatesInGameplayAuthority: false',
    'changesBatchOrderScopeOrBudget: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    "currentAllowedScope: 'source-review-program-handoff-and-gap-routing-only'",
    'preparationCodeWrittenDoesNotMeanValidated: true',
    'reviewProgramDoesNotExecuteCommands: true',
    'eachBatchRequiresIndependentApprovalEvidence: true',
    'failedOrUnavailableReviewMayBeDeferredWithoutChangingStatus: true',
    'productionCannotStartFromThisProgram: true',
    'reviewUnitCount: totalReviewUnitCount',
    'productionBlockoutAllowed: false',
    'integrationAllowed: false',
    'finalAllowed: false',
  ]) assertMarker(
    formalAssetProductionReviewProgram,
    marker,
    'A3-A6 formal asset production review program candidate',
  );
  if (FORBIDDEN_RUNTIME.test(formalAssetProductionReviewProgram)) {
    throw new Error(
      `${A3_A6_FORMAL_ASSET_PRODUCTION_REVIEW_PROGRAM_FILE}包含统一评审程序候选禁止的运行时依赖。`,
    );
  }
  const productionReviewEvidenceSubmission = await source(
    root,
    A3_A6_PRODUCTION_REVIEW_EVIDENCE_SUBMISSION_FILE,
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'formalReady: false',
    'grantsApproval: false',
    'assetUsePermitted: false',
    "currentAllowedScope: 'plain-data-evidence-reference-validation-and-handoff-only'",
    'inputIsExactKeyPlainData: true',
    'unknownBatchAssetSlotOrPreparationFailsClosed: true',
    'artifactPathAndShaMustMatchCurrentLedger: true',
    'observedOutcomeDoesNotGrantApproval: true',
    'requiresIndependentEvaluation: true',
    'mutatesLedger: false',
    'executesEvidenceCapture: false',
    'readsEvidenceBytes: false',
    'writesFilesOrLedger: false',
    'participatesInGameplayAuthority: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    "submissionStatus: 'captured-reference-awaiting-independent-evaluation'",
    'independentEvaluationCompleted: false',
    'ledgerMutationApplied: false',
    "ledgerSlotStatusAfterSubmission: 'missing'",
    "productionApprovalStatusAfterSubmission: 'missing-not-approved'",
  ]) assertMarker(
    productionReviewEvidenceSubmission,
    marker,
    'A3-A6 production review evidence submission candidate',
  );
  if (FORBIDDEN_RUNTIME.test(productionReviewEvidenceSubmission)) {
    throw new Error(
      `${A3_A6_PRODUCTION_REVIEW_EVIDENCE_SUBMISSION_FILE}包含证据提交候选禁止的运行时依赖。`,
    );
  }
  const productionReviewEvidenceIndependentEvaluation = await source(
    root,
    A3_A6_PRODUCTION_REVIEW_EVIDENCE_INDEPENDENT_EVALUATION_FILE,
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'formalReady: false',
    'grantsApproval: false',
    'assetUsePermitted: false',
    "currentAllowedScope: 'plain-data-independent-evidence-evaluation-handoff-only'",
    'reviewerMustDifferFromCollector: true',
    'acceptedRequiresMatchingEvidenceSha: true',
    'acceptedRequiresVerifiedContentAndEnvironment: true',
    'acceptedRequiresCollectorObservedPass: true',
    'evaluationAcceptanceDoesNotGrantApproval: true',
    'mutatesLedger: false',
    'executesEvidenceCaptureOrVerification: false',
    'readsEvidenceBytes: false',
    'writesFilesOrLedger: false',
    'participatesInGameplayAuthority: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    'independentEvaluationCompleted: true',
    'ledgerMutationApplied: false',
    "ledgerSlotStatusAfterEvaluation: 'missing'",
    "productionApprovalStatusAfterEvaluation: 'missing-not-approved'",
  ]) assertMarker(
    productionReviewEvidenceIndependentEvaluation,
    marker,
    'A3-A6 production review evidence independent evaluation candidate',
  );
  if (FORBIDDEN_RUNTIME.test(productionReviewEvidenceIndependentEvaluation)) {
    throw new Error(
      `${A3_A6_PRODUCTION_REVIEW_EVIDENCE_INDEPENDENT_EVALUATION_FILE}包含独立证据评估候选禁止的运行时依赖。`,
    );
  }
  const productionReviewAcceptedEvidenceSet = await source(
    root,
    A3_A6_PRODUCTION_REVIEW_ACCEPTED_EVIDENCE_SET_FILE,
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'formalReady: false',
    'grantsApproval: false',
    'assetUsePermitted: false',
    "currentAllowedScope: 'plain-data-seven-slot-accepted-evidence-aggregation-only'",
    'requiresAllSevenAcceptedEvaluationsInCanonicalOrder: true',
    'requiresSingleCurrentAssetBatchAndPreparationIdentity: true',
    'completeEvidenceSetDoesNotGrantApproval: true',
    'requiresSeparateIndependentProductionApprovalDecision: true',
    'mutatesLedger: false',
    'executesEvidenceCaptureVerificationOrReview: false',
    'readsEvidenceBytes: false',
    'writesFilesOrLedger: false',
    'participatesInGameplayAuthority: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    'completeAcceptedEvidenceSet: true',
    "productionApprovalDecisionStatus: 'pending-not-decided'",
    'ledgerMutationApplied: false',
    "ledgerSlotStatusAfterAggregation: 'missing'",
    "productionApprovalStatusAfterAggregation: 'missing-not-approved'",
  ]) assertMarker(
    productionReviewAcceptedEvidenceSet,
    marker,
    'A3-A6 production review accepted evidence set candidate',
  );
  if (FORBIDDEN_RUNTIME.test(productionReviewAcceptedEvidenceSet)) {
    throw new Error(
      `${A3_A6_PRODUCTION_REVIEW_ACCEPTED_EVIDENCE_SET_FILE}包含七槽证据聚合候选禁止的运行时依赖。`,
    );
  }
  const productionApprovalDecisionRecord = await source(
    root,
    A3_A6_PRODUCTION_APPROVAL_DECISION_RECORD_FILE,
  );
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'formalReady: false',
    'grantsApproval: false',
    'assetUsePermitted: false',
    "currentAllowedScope: 'plain-data-independent-production-approval-decision-record-only'",
    'requiresCompleteSevenSlotAcceptedEvidenceSet: true',
    'approverMustDifferFromCollectorsAndReviewers: true',
    'approvedRequiresSourceRightsBudgetAndDependencyClosure: true',
    'approvedDecisionOnlyFeedsNewImmutableLedgerAssembly: true',
    'decisionRecordDoesNotMutateCurrentLedger: true',
    'mutatesLedger: false',
    'executesEvidenceOrApprovalWork: false',
    'readsEvidenceBytes: false',
    'writesFilesOrLedger: false',
    'participatesInGameplayAuthority: false',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    'eligibleForNewImmutableLedgerAssembly: approvalDecision === \'approved\'',
    'ledgerMutationApplied: false',
    "currentLedgerProductionApprovalStatus: 'missing-not-approved'",
    'grantsApprovalForCurrentLedger: false',
  ]) assertMarker(
    productionApprovalDecisionRecord,
    marker,
    'A3-A6 production approval decision record candidate',
  );
  if (FORBIDDEN_RUNTIME.test(productionApprovalDecisionRecord)) {
    throw new Error(
      `${A3_A6_PRODUCTION_APPROVAL_DECISION_RECORD_FILE}包含生产批准决策记录候选禁止的运行时依赖。`,
    );
  }
  const presentationContractsIndex = await source(
    root,
    'packages/arena-presentation-contracts/src/index.ts',
  );
  assertMarker(
    presentationContractsIndex,
    "export * from './arena-stage7-formal-asset-budget-v1.js';",
    'arena-presentation-contracts index',
  );
  assertMarker(
    presentationContractsIndex,
    "export * from './arena-stage7-formal-asset-budget-v2-candidate.js';",
    'arena-presentation-contracts index',
  );
  assertMarker(
    await source(root, 'packages/arena-product-presentation/src/index.ts'),
    "export * from './arena-v2-a3-a6-formal-asset-readiness-candidate-v1.js';",
    'arena-product-presentation index',
  );
  assertMarker(
    await source(root, 'packages/arena-product-presentation/src/index.ts'),
    "export * from './arena-v2-a3-a6-production-approval-evidence-ledger-candidate-v1.js';",
    'arena-product-presentation index',
  );
  assertMarker(
    await source(root, 'packages/arena-product-presentation/src/index.ts'),
    "export * from './arena-v2-a3-a6-formal-asset-production-work-queue-candidate-v1.js';",
    'arena-product-presentation index',
  );
  assertMarker(
    await source(root, 'packages/arena-product-presentation/src/index.ts'),
    "export * from './arena-v2-a3-map-production-review-preparation-candidate-v1.js';",
    'arena-product-presentation index',
  );
  assertMarker(
    await source(root, 'packages/arena-product-presentation/src/index.ts'),
    "export * from './arena-v2-a3-survival-enemy-production-review-preparation-candidate-v1.js';",
    'arena-product-presentation index',
  );
  assertMarker(
    await source(root, 'packages/arena-product-presentation-three/src/index.ts'),
    "export * from './arena-v2-a4-playable-character-production-review-preparation-candidate-v1.js';",
    'arena-product-presentation-three index',
  );
  assertMarker(
    await source(root, 'packages/arena-product-presentation-three/src/index.ts'),
    "export * from './arena-v2-a4-weapon-attachment-production-review-preparation-candidate-v1.js';",
    'arena-product-presentation-three index',
  );
  assertMarker(
    await source(root, 'packages/arena-product-presentation-three/src/index.ts'),
    "export * from './arena-v2-a4-formal-material-texture-production-review-preparation-candidate-v1.js';",
    'arena-product-presentation-three index',
  );
  assertMarker(
    await source(root, 'packages/arena-product-presentation-three/src/index.ts'),
    "export * from './arena-v2-a4-weapon-impact-audio-production-review-preparation-candidate-v1.js';",
    'arena-product-presentation-three index',
  );
  assertMarker(
    await source(root, 'packages/arena-product-presentation-three/src/index.ts'),
    "export * from './arena-v2-a4-weapon-phase-audio-production-review-preparation-candidate-v1.js';",
    'arena-product-presentation-three index',
  );
  assertMarker(
    await source(root, 'packages/arena-product-presentation-three/src/index.ts'),
    "export * from './arena-v2-a5-core-feedback-vfx-production-review-preparation-candidate-v1.js';",
    'arena-product-presentation-three index',
  );
  assertMarker(
    await source(root, 'packages/arena-product-presentation-three/src/index.ts'),
    "export * from './arena-v2-a5-mode-and-supply-audio-production-review-preparation-candidate-v1.js';",
    'arena-product-presentation-three index',
  );
  assertMarker(
    await source(root, 'packages/arena-product-presentation-three/src/index.ts'),
    "export * from './arena-v2-a3-a6-formal-asset-production-review-program-candidate-v1.js';",
    'arena-product-presentation-three index',
  );
  assertMarker(
    await source(root, 'packages/arena-product-presentation-three/src/index.ts'),
    "export * from './arena-v2-a3-a6-production-review-evidence-submission-candidate-v1.js';",
    'arena-product-presentation-three index',
  );
  assertMarker(
    await source(root, 'packages/arena-product-presentation-three/src/index.ts'),
    "export * from './arena-v2-a3-a6-production-review-evidence-independent-evaluation-candidate-v1.js';",
    'arena-product-presentation-three index',
  );
  assertMarker(
    await source(root, 'packages/arena-product-presentation-three/src/index.ts'),
    "export * from './arena-v2-a3-a6-production-review-accepted-evidence-set-candidate-v1.js';",
    'arena-product-presentation-three index',
  );
  assertMarker(
    await source(root, 'packages/arena-product-presentation-three/src/index.ts'),
    "export * from './arena-v2-a3-a6-production-approval-decision-record-candidate-v1.js';",
    'arena-product-presentation-three index',
  );

  const index = await readFile(path.join(releaseRoot, 'index.ts'), 'utf8');
  for (const file of P7_FILES) {
    assertMarker(index, `export * from './${file.replace(/\.ts$/u, '.js')}';`, 'arena-release index');
  }
  for (const file of A7_FILES) {
    assertMarker(index, `export * from './${file.replace(/\.ts$/u, '.js')}';`, 'arena-release index');
  }
  assertMarker(
    index,
    `export * from './${A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_FILE.replace(/\.ts$/u, '.js')}';`,
    'arena-release index',
  );
  assertMarker(
    index,
    `export * from './${A7_STRUCTURAL_BUDGET_EVIDENCE_FILE.replace(/\.ts$/u, '.js')}';`,
    'arena-release index',
  );

  for (const relative of DEFAULT_ENTRIES) {
    const defaultEntrySource = await source(root, relative);
    if (
      CANDIDATE_REFERENCE.test(defaultEntrySource)
      || defaultEntrySource.includes('arena-a7-formal-evidence-store-adapters-candidate-v1')
    ) {
      throw new Error(`${relative}不得默认接入P7/A7候选。`);
    }
  }
  for (const entry of await readdir(releaseRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name === 'index.ts'
      || CANDIDATE_FILE_SET.has(entry.name)) continue;
    if (CANDIDATE_REFERENCE.test(await readFile(path.join(releaseRoot, entry.name), 'utf8'))) {
      throw new Error(`${entry.name}不得把P7/A7候选接入既有Release Bundle。`);
    }
  }

  const producer = candidateSources.get('arena-v2-p7-automation-evidence-producer-candidate-v1.ts')!;
  for (const marker of [
    'executesOnlyThroughInjectedRunner: true',
    'fixedConcurrency: 1',
    "failurePolicy: 'fail-fast'",
    'releasesRunnerAfterSettlement: true',
  ]) assertMarker(producer, marker, 'P7 automation producer');
  if (/defaultRunner|child_process|\bspawn\s*\(|\bexec(?:File)?\s*\(/u.test(producer)) {
    throw new Error('P7 automation producer不得拥有默认runner或进程执行能力。');
  }

  const freeze = candidateSources.get('arena-v2-p7-release-freeze-manifest-candidate-v1.ts')!;
  for (const marker of [
    'publishes: false', 'readsOrWritesFiles: false', 'modifiesBranch: false',
    'mergesBranches: false', 'writesGitTag: false',
    'uploadsArtifacts: false', 'signsArtifacts: false',
    'rejectsMissingEvaluationEvidenceSha: true',
    'environmentBuildSetIdentityRequired: true',
    'formalVisualMediaEvidenceRequired: true',
    'formalVisualMediaPassRequired: true',
    'formalVisualMediaSameSourceContentAndBuildSetRequired: true',
    'formalVisualMediaSamePackageLockAndToolchainRequired: true',
    'approvedPolicySource.packageLockSha256',
    'approvedPolicySource.toolchainIdentitySha256',
    'functionalAutomationAndFormalMediaEvidenceDomainsMustRemainDistinct: true',
    'consumesA7OwnedFormalEvidenceRecordIndex: true',
    'consumesA7OwnedFormalEvidenceVerificationIndex: true',
    'formalVisualMediaEvidence.formalEvidenceRecordIndex',
    'formalVisualMediaEvidence.formalEvidenceRecordIndexIdentityHash',
    'formalVisualMediaEvidence.formalEvidenceRetrievalPlanIdentityHash',
    'formalVisualMediaEvidence.formalEvidenceStoreSnapshotIdentityHash',
    'formalVisualMediaEvidence.formalEvidenceRecordVerificationIndex',
    'formalVisualMediaEvidence.formalEvidenceRecordVerificationIndexIdentityHash',
    'collision.evidenceLocator',
    'verificationCollision.verificationReceiptLocator',
    'formalVisualMediaEvidenceRecordCount:',
    'formalVisualMediaEvidenceTotalBytes:',
    'formalVisualMediaEvidenceVerificationReceiptCount:',
    'formalVisualMediaEvidenceVerificationReceiptTotalBytes:',
    'currentFormalAssetCatalogRequired: true',
    'currentFormalAssetCatalogExactAssetIdentityRequired: true',
    'formalVisualMediaEvidenceSchemaRequired: 3',
    'approvedFormalAssetBudgetPolicyAssemblyRequired: true',
    'approvedFormalAssetBudgetStructuralLimitsRequired: true',
    'releaseFreezeIdentityRetainsApprovedBudgetPolicyAndAssembly: true',
    'releaseFreezeIdentityRetainsA7RetrievalPlanAndStoreSnapshot: true',
    'formalAssetBudgetPolicyId: approvedBudgetPolicy.policyId',
    'formalAssetBudgetPolicyRevision: approvedBudgetPolicy.policyRevision',
    'formalAssetBudgetApprovedPolicyAssemblyIdentity:',
    'currentV2BudgetPolicyCannotQualifyFreeze: true',
  ]) assertMarker(freeze, marker, 'P7 release-freeze manifest');
  if (/from\s+['"]node:|\b(?:spawn|execFile|writeFile|rename)\s*\(/u.test(freeze)) {
    throw new Error('P7 release-freeze manifest不得执行发布或文件动作。');
  }

  const assembly = candidateSources.get(
    'arena-v2-p7-release-freeze-assembly-session-candidate-v1.ts',
  )!;
  for (const marker of [
    'publishes: false', 'readsOrWritesFiles: false', 'modifiesBranch: false',
    'writesGitTag: false', 'uploadsArtifacts: false', 'signsArtifacts: false',
    'automationStageReportSessionWired: true',
    'formalVisualMediaEvidenceWired: true',
    'formalVisualMediaPassRequiredForFreeze: true',
    'formalVisualMediaSameSourceContentAndBuildSetRequired: true',
    'formalVisualMediaSamePackageLockAndToolchainRequired: true',
    'assertFormalVisualMediaBuildSourceIdentity',
    'currentFormalAssetCatalogRequired: true',
    'currentFormalAssetCatalogExactAssetIdentityRequired: true',
    'formalVisualMediaEvidenceSchemaRequired: 3',
    'approvedFormalAssetBudgetPolicyAssemblyRequired: true',
    'approvedFormalAssetBudgetStructuralLimitsRequired: true',
    'currentV2BudgetPolicyCannotQualifyFreeze: true',
    'releaseFreezeQualificationManifestWired: true',
  ]) assertMarker(assembly, marker, 'P7 release-freeze assembly session');
  if (/from\s+['"]node:|\b(?:spawn|execFile|writeFile|rename)\s*\(/u.test(assembly)) {
    throw new Error('P7 release-freeze assembly session不得执行发布或文件动作。');
  }

  for (const testFile of P7_TEST_FILES) {
    await readFile(path.join(root, 'packages/arena-release/test', testFile), 'utf8');
  }
  for (const testFile of A7_TEST_FILES) {
    await readFile(path.join(root, 'packages/arena-release/test', testFile), 'utf8');
  }
  await readFile(
    path.join(
      root,
      'packages/arena-release/test',
      A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_TEST_FILE,
    ),
    'utf8',
  );
  await readFile(path.join(root, A7_FORMAL_EVIDENCE_STORE_ADAPTER_TEST_FILE), 'utf8');
  await readFile(
    path.join(
      root,
      'packages/arena-release/test',
      A7_STRUCTURAL_BUDGET_EVIDENCE_TEST_FILE,
    ),
    'utf8',
  );
  await readFile(
    path.join(
      root,
      'packages/arena-release/test',
      A7_APPROVED_BUDGET_POLICY_ASSEMBLY_TEST_FILE,
    ),
    'utf8',
  );
  await readFile(
    path.join(
      root,
      'packages/arena-release/test',
      A7_STRUCTURAL_BUDGET_INDEPENDENT_APPROVAL_TEST_FILE,
    ),
    'utf8',
  );
  await readFile(
    path.join(
      root,
      'packages/arena-release/test',
      A7_STRUCTURAL_BUDGET_LIMIT_PROPOSAL_TEST_FILE,
    ),
    'utf8',
  );
  await readFile(
    path.join(root, 'packages/arena-presentation-contracts/test/arena-stage7-formal-asset-budget-v1.test.ts'),
    'utf8',
  );
  const proposedFormalBudgetV2Test = await readFile(
    path.join(
      root,
      'packages/arena-presentation-contracts/test/arena-stage7-formal-asset-budget-v2-candidate.test.ts',
    ),
    'utf8',
  );
  for (const marker of [
    'toHaveLength(130)',
    'code-written-not-run',
    'validationStatus: \'not-run\'',
    'proposed-not-approved',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
    'ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_CONTENT_HASH',
    'freezes canonical source texture dimensions in policy metadata',
    'contentVersion).toBe(4)',
    'freezes the encoded media container identity for every current artifact',
  ]) assertMarker(proposedFormalBudgetV2Test, marker, 'proposed formal asset budget V2 test');
  await readFile(
    path.join(root, 'packages/arena-product-presentation/test/arena-v2-a3-a6-production-approval-evidence-ledger-candidate-v1.test.ts'),
    'utf8',
  );
  await readFile(
    path.join(root, 'packages/arena-product-presentation/test/arena-v2-a3-a6-formal-asset-readiness-candidate-v1.test.ts'),
    'utf8',
  );
  await readFile(
    path.join(root, 'packages/arena-product-presentation/test/arena-v2-a3-a6-formal-asset-production-work-queue-candidate-v1.test.ts'),
    'utf8',
  );
  await readFile(
    path.join(root, 'packages/arena-product-presentation/test/arena-v2-a3-map-production-review-preparation-candidate-v1.test.ts'),
    'utf8',
  );
  await readFile(
    path.join(root, 'packages/arena-product-presentation/test/arena-v2-a3-survival-enemy-production-review-preparation-candidate-v1.test.ts'),
    'utf8',
  );
  await readFile(
    path.join(root, 'packages/arena-product-presentation-three/test/arena-v2-a4-playable-character-production-review-preparation-candidate-v1.test.ts'),
    'utf8',
  );
  await readFile(
    path.join(root, 'packages/arena-product-presentation-three/test/arena-v2-a4-weapon-attachment-production-review-preparation-candidate-v1.test.ts'),
    'utf8',
  );
  await readFile(
    path.join(root, 'packages/arena-product-presentation-three/test/arena-v2-a4-formal-material-texture-production-review-preparation-candidate-v1.test.ts'),
    'utf8',
  );
  await readFile(
    path.join(root, 'packages/arena-product-presentation-three/test/arena-v2-a4-weapon-impact-audio-production-review-preparation-candidate-v1.test.ts'),
    'utf8',
  );
  await readFile(
    path.join(root, 'packages/arena-product-presentation-three/test/arena-v2-a4-weapon-phase-audio-production-review-preparation-candidate-v1.test.ts'),
    'utf8',
  );
  await readFile(
    path.join(root, 'packages/arena-product-presentation-three/test/arena-v2-a5-core-feedback-vfx-production-review-preparation-candidate-v1.test.ts'),
    'utf8',
  );
  await readFile(
    path.join(root, 'packages/arena-product-presentation-three/test/arena-v2-a5-mode-and-supply-audio-production-review-preparation-candidate-v1.test.ts'),
    'utf8',
  );
  await readFile(
    path.join(root, 'packages/arena-product-presentation-three/test/arena-v2-a3-a6-formal-asset-production-review-program-candidate-v1.test.ts'),
    'utf8',
  );
  await readFile(
    path.join(root, 'packages/arena-product-presentation-three/test/arena-v2-a3-a6-production-review-evidence-submission-candidate-v1.test.ts'),
    'utf8',
  );
  await readFile(
    path.join(root, 'packages/arena-product-presentation-three/test/arena-v2-a3-a6-production-review-evidence-independent-evaluation-candidate-v1.test.ts'),
    'utf8',
  );
  await readFile(
    path.join(root, 'packages/arena-product-presentation-three/test/arena-v2-a3-a6-production-review-accepted-evidence-set-candidate-v1.test.ts'),
    'utf8',
  );
  await readFile(
    path.join(root, 'packages/arena-product-presentation-three/test/arena-v2-a3-a6-production-approval-decision-record-candidate-v1.test.ts'),
    'utf8',
  );
  console.log(JSON.stringify({
    status: 'passed',
    candidateFileCount: P7_FILES.length,
    a7EvidenceCandidateCount: A7_FILES.length,
    formalAssetPrerequisiteCandidateCount: 24,
    deferredTestFileCount: P7_TEST_FILES.length + 26,
    hardGate: false,
  }));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
