import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  assertEvidenceSha256,
  assertEvidenceUtcInstant,
} from '@number-strategy-jump/arena-evidence-contracts';
import {
  createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1,
} from './arena-v2-a7-formal-budget-approved-policy-assembly-candidate-v1.js';
import {
  assertArenaV2A7CurrentFormalAssetCatalogLegacyBindingCandidateV2,
} from './arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v2.js';
import {
  validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1,
  type ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1,
} from './arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v1.js';
import {
  assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1,
  assertArenaV2A7FormalBudgetEvidenceLocatorCandidateV1,
} from './arena-v2-a7-formal-budget-evidence-value-candidate-v1.js';

export const ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V3_SCHEMA_VERSION =
  3 as const;
export const ARENA_V2_A7_FORMAL_EVIDENCE_RECORD_MAXIMUM_COUNT_CANDIDATE_V3 =
  583 as const;

export type ArenaV2A7FormalVisualMediaFreezeStatusCandidateV3 =
  | 'INCOMPLETE'
  | 'FAIL'
  | 'PASS';

export type ArenaV2A7FormalEvidenceRecordKindCandidateV3 =
  | 'formal-budget'
  | 'phase'
  | 'asset-license'
  | 'asset-approval'
  | 'environment-build'
  | 'delivery'
  | 'capture'
  | 'review'
  | 'structural-environment'
  | 'structural-report'
  | 'structural-evaluation'
  | 'structural-proposal'
  | 'structural-independent-approval'
  | 'structural-assembly';

export interface ArenaV2A7FormalEvidenceRecordIndexEntryCandidateV3 {
  readonly recordId: string;
  readonly kind: ArenaV2A7FormalEvidenceRecordKindCandidateV3;
  readonly evidenceLocator: string;
  readonly evidenceMediaType: string;
  readonly evidenceByteLength: number;
  readonly evidenceRecordedAtUtc: string;
  readonly evidenceProducerId: string;
  readonly evidenceSha256: string;
}

export interface ArenaV2A7FormalEvidenceRecordVerificationIndexEntryCandidateV3 {
  readonly recordId: string;
  readonly formalEvidenceRetrievalPlanIdentityHash: string;
  readonly formalEvidenceStoreSnapshotIdentityHash: string;
  readonly verifiedEvidenceLocator: string;
  readonly verifiedEvidenceMediaType: string;
  readonly verifiedEvidenceByteLength: number;
  readonly verifiedEvidenceRecordedAtUtc: string;
  readonly verifiedEvidenceProducerId: string;
  readonly verifiedEvidenceSha256: string;
  readonly verifierId: string;
  readonly verifiedAtUtc: string;
  readonly verificationReceiptLocator: string;
  readonly verificationReceiptMediaType: string;
  readonly verificationReceiptByteLength: number;
  readonly verificationReceiptSha256: string;
}

const OPTION_KEYS = new Set(['evidence']);
const INPUT_KEYS = new Set([
  'schemaVersion',
  'legacyEvidence',
  'approvedPolicyAssemblyInput',
  'approvedPolicyAssemblyIdentity',
  'formalEvidenceRecordLocatorDirectory',
  'formalEvidenceStoreSnapshotIdentityHash',
  'formalEvidenceRecordVerificationDirectory',
]);
const FORMAL_EVIDENCE_RECORD_LOCATOR_KEYS = new Set([
  'recordId',
  'evidenceLocator',
  'evidenceMediaType',
  'evidenceByteLength',
  'evidenceRecordedAtUtc',
  'evidenceProducerId',
]);
const FORMAL_EVIDENCE_RECORD_INDEX_KEYS = new Set([
  'recordId',
  'kind',
  'evidenceLocator',
  'evidenceMediaType',
  'evidenceByteLength',
  'evidenceRecordedAtUtc',
  'evidenceProducerId',
  'evidenceSha256',
]);
const FORMAL_EVIDENCE_RECORD_KINDS = new Set<
ArenaV2A7FormalEvidenceRecordKindCandidateV3
>([
  'formal-budget',
  'phase',
  'asset-license',
  'asset-approval',
  'environment-build',
  'delivery',
  'capture',
  'review',
  'structural-environment',
  'structural-report',
  'structural-evaluation',
  'structural-proposal',
  'structural-independent-approval',
  'structural-assembly',
]);
const FORMAL_EVIDENCE_RECORD_VERIFICATION_KEYS = new Set([
  'recordId',
  'formalEvidenceRetrievalPlanIdentityHash',
  'formalEvidenceStoreSnapshotIdentityHash',
  'verifiedEvidenceLocator',
  'verifiedEvidenceMediaType',
  'verifiedEvidenceByteLength',
  'verifiedEvidenceRecordedAtUtc',
  'verifiedEvidenceProducerId',
  'verifiedEvidenceSha256',
  'verifierId',
  'verifiedAtUtc',
  'verificationReceiptLocator',
  'verificationReceiptMediaType',
  'verificationReceiptByteLength',
  'verificationReceiptSha256',
]);
const FORMAL_EVIDENCE_RETRIEVAL_PLAN_INPUT_KEYS = new Set([
  'legacyEvidence',
  'approvedPolicyAssemblyInput',
  'approvedPolicyAssemblyIdentity',
  'formalEvidenceRecordLocatorDirectory',
  'formalEvidenceStoreSnapshotIdentityHash',
]);
const FORMAL_EVIDENCE_MEDIA_TYPE_PATTERN =
  /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/u;
const FORMAL_EVIDENCE_LOCATOR_PREFIX = 'evidence://arena-v2/' as const;
const FORMAL_EVIDENCE_LOCATOR_SEGMENT_PATTERN = /^[a-z0-9][a-z0-9._-]*$/u;
const STORED_KEYS = new Set([
  'schemaVersion',
  'status',
  'implementationStatus',
  'currentGate',
  'defaultReleaseBundleWired',
  'defaultEntryWired',
  'validationStatus',
  'publishes',
  'createsOrModifiesAssets',
  'participatesInGameplayAuthority',
  'p7AdvanceComputedHere',
  'p7ReleaseFreezeManifestOwnedHere',
  'evidenceStatus',
  'hardGate',
  'formalVisualMediaReady',
  'budgetSummary',
  'coverageSummary',
  'incompleteReasons',
  'failureReasons',
  'formalEvidenceRecordIndex',
  'formalEvidenceRecordIndexIdentityHash',
  'formalEvidenceRetrievalPlanIdentityHash',
  'formalEvidenceStoreSnapshotIdentityHash',
  'formalEvidenceRecordVerificationIndex',
  'formalEvidenceRecordVerificationIndexIdentityHash',
  'explicitNonActions',
  'legacyEvidence',
  'approvedPolicyAssembly',
  'evidence',
  'evidenceIdentityHash',
]);
const EXPLICIT_NON_ACTIONS = Object.freeze([
  'does-not-replace-current-v2-budget-policy',
  'does-not-activate-approved-policy-candidate',
  'does-not-approve-assets',
  'does-not-create-or-modify-assets',
  'does-not-run-builds-captures-device-or-human-review',
  'does-not-compute-p7-advance',
  'does-not-publish-release',
] as const);

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

function isLegacyBudgetReason(reason: string): boolean {
  return reason.startsWith('formal-budget-evidence:')
    || reason.endsWith(':per-item-budget-uncovered')
    || (reason.startsWith('budget:') && !reason.startsWith('budget:delivery:'));
}

function sumSafeNonNegativeIntegers(
  values: readonly number[],
  name: string,
): number {
  let total = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === undefined || !Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(`${name}[${index}]必须是非负安全整数。`);
    }
    if (total > Number.MAX_SAFE_INTEGER - value) {
      throw new RangeError(`${name}聚合结果超出安全整数范围。`);
    }
    total += value;
  }
  return total;
}

function assertFormalEvidenceMediaType(value: unknown, name: string): string {
  const result = assertArenaV2A7FormalBudgetEvidenceLocatorCandidateV1(value, name);
  if (
    result.length > 128
    || result !== result.toLowerCase()
    || !FORMAL_EVIDENCE_MEDIA_TYPE_PATTERN.test(result)
  ) throw new RangeError(`${name}必须是小写、无参数且不超过128字符的规范媒体类型。`);
  return result;
}

function assertFormalEvidenceLocator(value: unknown, name: string): string {
  const result = assertArenaV2A7FormalBudgetEvidenceLocatorCandidateV1(value, name);
  if (!result.startsWith(FORMAL_EVIDENCE_LOCATOR_PREFIX)) {
    throw new RangeError(`${name}必须位于evidence://arena-v2规范证据库。`);
  }
  const path = result.slice(FORMAL_EVIDENCE_LOCATOR_PREFIX.length);
  const segments = path.split('/');
  if (
    segments.length === 0
    || segments.some((segment) => !FORMAL_EVIDENCE_LOCATOR_SEGMENT_PATTERN.test(segment))
  ) {
    throw new RangeError(`${name}必须使用无空段、无跳转、无查询片段的小写规范路径。`);
  }
  return result;
}

export function assertArenaV2A7FormalEvidenceMediaTypeCandidateV3(
  value: unknown,
  name: string,
): string {
  return assertFormalEvidenceMediaType(value, name);
}

export function assertArenaV2A7FormalEvidenceLocatorCandidateV3(
  value: unknown,
  name: string,
): string {
  return assertFormalEvidenceLocator(value, name);
}

export function validateArenaV2A7FormalEvidenceRecordIndexCandidateV3(
  value: unknown,
): readonly Readonly<ArenaV2A7FormalEvidenceRecordIndexEntryCandidateV3>[] {
  const source = cloneFrozenData(value, 'A7 V3 formal Evidence record index');
  if (!Array.isArray(source)) {
    throw new TypeError('A7 V3 formal Evidence record index必须是数组。');
  }
  if (
    source.length === 0
    || source.length > ARENA_V2_A7_FORMAL_EVIDENCE_RECORD_MAXIMUM_COUNT_CANDIDATE_V3
  ) throw new RangeError('A7 V3 formal Evidence record index数量必须位于1到583。');
  const recordIds = new Set<string>();
  const locators = new Set<string>();
  const evidenceShas = new Set<string>();
  const result = source.map((entry, index) => {
    exactRecord(entry, FORMAL_EVIDENCE_RECORD_INDEX_KEYS, `A7 V3 Evidence index[${index}]`);
    const recordId = assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
      entry.recordId,
      `A7 V3 Evidence index[${index}].recordId`,
    );
    if (
      typeof entry.kind !== 'string'
      || !FORMAL_EVIDENCE_RECORD_KINDS.has(
        entry.kind as ArenaV2A7FormalEvidenceRecordKindCandidateV3,
      )
    ) throw new RangeError(`A7 V3 Evidence index[${index}].kind不受支持。`);
    const kind = entry.kind as ArenaV2A7FormalEvidenceRecordKindCandidateV3;
    const evidenceLocator = assertFormalEvidenceLocator(
      entry.evidenceLocator,
      `A7 V3 Evidence index[${index}].evidenceLocator`,
    );
    const evidenceMediaType = assertFormalEvidenceMediaType(
      entry.evidenceMediaType,
      `A7 V3 Evidence index[${index}].evidenceMediaType`,
    );
    const evidenceByteLength = assertIntegerAtLeast(
      entry.evidenceByteLength,
      1,
      `A7 V3 Evidence index[${index}].evidenceByteLength`,
    );
    if (!Number.isSafeInteger(evidenceByteLength)) {
      throw new RangeError(`A7 V3 Evidence index[${index}].evidenceByteLength必须是安全整数。`);
    }
    const evidenceRecordedAtUtc = assertEvidenceUtcInstant(
      entry.evidenceRecordedAtUtc,
      `A7 V3 Evidence index[${index}].evidenceRecordedAtUtc`,
    );
    const evidenceProducerId = assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
      entry.evidenceProducerId,
      `A7 V3 Evidence index[${index}].evidenceProducerId`,
    );
    const evidenceSha256 = assertEvidenceSha256(
      entry.evidenceSha256,
      `A7 V3 Evidence index[${index}].evidenceSha256`,
    );
    if (recordIds.has(recordId) || locators.has(evidenceLocator) || evidenceShas.has(evidenceSha256)) {
      throw new RangeError('A7 V3 formal Evidence record index的ID、Locator与SHA必须分别唯一。');
    }
    recordIds.add(recordId);
    locators.add(evidenceLocator);
    evidenceShas.add(evidenceSha256);
    return Object.freeze({
      recordId,
      kind,
      evidenceLocator,
      evidenceMediaType,
      evidenceByteLength,
      evidenceRecordedAtUtc,
      evidenceProducerId,
      evidenceSha256,
    });
  });
  sumSafeNonNegativeIntegers(
    result.map(({ evidenceByteLength }) => evidenceByteLength),
    'A7 V3 formal Evidence index字节',
  );
  return Object.freeze(result);
}

function assertSourceAndEnvironmentBuildBinding(
  legacyEvidence: ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1,
  approvedPolicyAssembly: ReturnType<
    typeof createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1
  >,
): void {
  const policy = approvedPolicyAssembly.approvedPolicyCandidate;
  if (policy.sourceIdentity.sourceCommit !== legacyEvidence.evidence.sourceIdentity.sourceCommit) {
    throw new RangeError('A7 V3视觉/媒体证据与已批准预算候选必须绑定同一source commit。');
  }
  if (policy.environments.length !== legacyEvidence.evidence.environmentBuilds.length) {
    throw new RangeError('A7 V3必须精确绑定同一P7六环境build set。');
  }
  for (let index = 0; index < policy.environments.length; index += 1) {
    const expected = policy.environments[index];
    const actual = legacyEvidence.evidence.environmentBuilds[index];
    if (
      expected === undefined
      || actual === undefined
      || expected.environmentId !== actual.environmentId
      || expected.buildIdentitySha256 !== actual.buildIdentitySha256
    ) throw new RangeError(`A7 V3六环境build identity漂移：index=${index}。`);
  }
}

function createFormalEvidenceRecordIndex(
  legacyEvidence: ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1,
  approvedPolicyAssembly: ReturnType<
    typeof createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1
  >,
  locatorDirectoryInput: unknown,
) {
  const legacy = legacyEvidence.evidence;
  const policyEvidence = approvedPolicyAssembly.approvedPolicyCandidate.evidenceIdentity;
  if (!Array.isArray(locatorDirectoryInput)) {
    throw new TypeError('A7 V3视觉/结构Evidence Locator目录必须是数组。');
  }
  if (
    locatorDirectoryInput.length
      > ARENA_V2_A7_FORMAL_EVIDENCE_RECORD_MAXIMUM_COUNT_CANDIDATE_V3
  ) throw new RangeError('A7 V3视觉/结构Evidence Locator目录超过有界最大记录数。');
  const metadataByRecordId = new Map<string, Readonly<{
    evidenceLocator: string;
    evidenceMediaType: string;
    evidenceByteLength: number;
    evidenceRecordedAtUtc: string;
    evidenceProducerId: string;
  }>>();
  const locatorOwners = new Map<string, string>();
  for (let index = 0; index < locatorDirectoryInput.length; index += 1) {
    const sourceEntry = locatorDirectoryInput[index];
    exactRecord(
      sourceEntry,
      FORMAL_EVIDENCE_RECORD_LOCATOR_KEYS,
      `A7 V3视觉/结构Evidence Locator目录[${index}]`,
    );
    const recordId = assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
      sourceEntry.recordId,
      `A7 V3视觉/结构Evidence Locator目录[${index}].recordId`,
    );
    const evidenceLocator = assertFormalEvidenceLocator(
      sourceEntry.evidenceLocator,
      `A7 V3视觉/结构Evidence Locator目录[${index}].evidenceLocator`,
    );
    const evidenceMediaType = assertFormalEvidenceMediaType(
      sourceEntry.evidenceMediaType,
      `A7 V3视觉/结构Evidence Locator目录[${index}].evidenceMediaType`,
    );
    const evidenceByteLength = assertIntegerAtLeast(
      sourceEntry.evidenceByteLength,
      1,
      `A7 V3视觉/结构Evidence Locator目录[${index}].evidenceByteLength`,
    );
    const evidenceRecordedAtUtc = assertEvidenceUtcInstant(
      sourceEntry.evidenceRecordedAtUtc,
      `A7 V3视觉/结构Evidence Locator目录[${index}].evidenceRecordedAtUtc`,
    );
    const evidenceProducerId = assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
      sourceEntry.evidenceProducerId,
      `A7 V3视觉/结构Evidence Locator目录[${index}].evidenceProducerId`,
    );
    if (metadataByRecordId.has(recordId)) {
      throw new RangeError(`A7 V3视觉/结构Evidence Locator recordId不得重复：${recordId}。`);
    }
    const existingLocatorOwner = locatorOwners.get(evidenceLocator);
    if (existingLocatorOwner !== undefined) {
      throw new RangeError(
        `A7 V3视觉/结构Evidence Locator不得跨证据槽重复：`
          + `${existingLocatorOwner}与${recordId}。`,
      );
    }
    metadataByRecordId.set(recordId, Object.freeze({
      evidenceLocator,
      evidenceMediaType,
      evidenceByteLength,
      evidenceRecordedAtUtc,
      evidenceProducerId,
    }));
    locatorOwners.set(evidenceLocator, recordId);
  }
  const records: ArenaV2A7FormalEvidenceRecordIndexEntryCandidateV3[] = [];
  const recordIds = new Set<string>();
  const materializedRecordIds = new Set<string>();
  const evidenceShaOwners = new Map<string, string>();
  const append = (
    kind: ArenaV2A7FormalEvidenceRecordKindCandidateV3,
    recordId: string,
    evidenceSha256: string | null,
    expectedEvidenceLocator: string | null = null,
    expectedRecordedAtUtc: string | null = null,
    expectedProducerId: string | null = null,
  ): void => {
    if (recordIds.has(recordId)) {
      throw new RangeError(`A7 V3视觉/结构Evidence recordId不得重复：${recordId}。`);
    }
    recordIds.add(recordId);
    if (evidenceSha256 === null) return;
    const metadata = metadataByRecordId.get(recordId);
    if (metadata === undefined) {
      throw new RangeError(`A7 V3视觉/结构Evidence缺少Locator：${recordId}。`);
    }
    if (
      expectedEvidenceLocator !== null
      && metadata.evidenceLocator !== expectedEvidenceLocator
    ) {
      throw new RangeError(`A7 V3视觉/结构Evidence Locator与上游记录漂移：${recordId}。`);
    }
    if (
      expectedRecordedAtUtc !== null
      && metadata.evidenceRecordedAtUtc !== expectedRecordedAtUtc
    ) {
      throw new RangeError(`A7 V3视觉/结构Evidence记录时间与上游治理时间漂移：${recordId}。`);
    }
    if (
      expectedProducerId !== null
      && metadata.evidenceProducerId !== expectedProducerId
    ) {
      throw new RangeError(`A7 V3视觉/结构Evidence Producer与上游治理角色漂移：${recordId}。`);
    }
    const existingOwner = evidenceShaOwners.get(evidenceSha256);
    if (existingOwner !== undefined) {
      throw new RangeError(
        `A7 V3视觉/结构Evidence SHA不得跨证据槽重复：${existingOwner}与${recordId}。`,
      );
    }
    evidenceShaOwners.set(evidenceSha256, recordId);
    materializedRecordIds.add(recordId);
    records.push(Object.freeze({
      recordId,
      kind,
      evidenceLocator: metadata.evidenceLocator,
      evidenceMediaType: metadata.evidenceMediaType,
      evidenceByteLength: metadata.evidenceByteLength,
      evidenceRecordedAtUtc: metadata.evidenceRecordedAtUtc,
      evidenceProducerId: metadata.evidenceProducerId,
      evidenceSha256,
    }));
  };

  append(
    'formal-budget',
    `formal-budget:${legacy.formalBudgetEvidence.policyId}`,
    legacy.formalBudgetEvidence.evidenceSha256,
  );
  for (const entry of legacy.phaseEvidence) {
    append('phase', `phase:${entry.phaseId}`, entry.evidenceSha256);
  }
  for (const entry of legacy.assets) {
    append('asset-license', `asset-license:${entry.assetId}`, entry.license.evidenceSha256);
    append('asset-approval', `asset-approval:${entry.assetId}`, entry.approval.evidenceSha256);
  }
  for (const entry of legacy.environmentBuilds) {
    append(
      'environment-build',
      `environment-build:${entry.environmentId}`,
      entry.evidenceSha256,
    );
  }
  for (const entry of legacy.deliveries) {
    append('delivery', `delivery:${entry.platformId}`, entry.evidenceSha256);
  }
  for (const entry of legacy.captures) {
    append('capture', `capture:${entry.captureId}`, entry.evidenceSha256);
  }
  for (const entry of legacy.reviews) {
    append('review', `review:${entry.dimensionId}`, entry.evidenceSha256);
  }
  for (const entry of policyEvidence.structuralEnvironmentEvidenceRecords) {
    append(
      'structural-environment',
      `structural-environment:${policyEvidence.structuralEvidenceSubmissionIdentity}`
        + `:${entry.environmentId}`,
      entry.evidenceSha256,
      entry.evidenceLocator,
      policyEvidence.structuralEvidenceCapturedAtUtc,
      approvedPolicyAssembly.approvedPolicyCandidate.governanceProvenance.collectorId,
    );
  }
  append(
    'structural-report',
    `structural-report:${policyEvidence.structuralEvidenceSubmissionIdentity}`,
    policyEvidence.structuralEvidenceReportSha256,
    policyEvidence.structuralEvidenceReportLocator,
    policyEvidence.structuralEvidenceCapturedAtUtc,
    approvedPolicyAssembly.approvedPolicyCandidate.governanceProvenance.collectorId,
  );
  append(
    'structural-evaluation',
    `structural-evaluation:${policyEvidence.structuralEvidenceEvaluationIdentity}`,
    policyEvidence.structuralEvidenceVerificationRecordSha256,
    policyEvidence.structuralEvidenceVerificationRecordLocator,
    approvedPolicyAssembly.approvedPolicyCandidate.governanceProvenance.reviewedAtUtc,
    approvedPolicyAssembly.approvedPolicyCandidate.governanceProvenance.reviewerId,
  );
  append(
    'structural-proposal',
    `structural-proposal:${policyEvidence.structuralLimitProposalIdentity}`,
    policyEvidence.structuralLimitProposalRecordSha256,
    policyEvidence.structuralLimitProposalRecordLocator,
    approvedPolicyAssembly.approvedPolicyCandidate.governanceProvenance.proposedAtUtc,
    approvedPolicyAssembly.approvedPolicyCandidate.governanceProvenance.proposerId,
  );
  append(
    'structural-independent-approval',
    `structural-independent-approval:${policyEvidence.independentApprovalDecisionIdentity}`,
    policyEvidence.independentApprovalRecordSha256,
    policyEvidence.independentApprovalRecordLocator,
    approvedPolicyAssembly.approvedPolicyCandidate.governanceProvenance.decidedAtUtc,
    approvedPolicyAssembly.approvedPolicyCandidate.governanceProvenance.approverId,
  );
  append(
    'structural-assembly',
    `structural-assembly:${approvedPolicyAssembly.approvedPolicyAssemblyIdentity}`,
    approvedPolicyAssembly.assemblyRecordSha256,
    approvedPolicyAssembly.assemblyRecordLocator,
    approvedPolicyAssembly.assembledAtUtc,
    approvedPolicyAssembly.assemblerId,
  );
  if (metadataByRecordId.size !== records.length) {
    const recordId = [...metadataByRecordId.keys()].find(
      (entry) => !materializedRecordIds.has(entry),
    );
    throw new RangeError(
      `A7 V3视觉/结构Evidence Locator目录存在无对应非空证据的记录：${recordId ?? 'unknown'}。`,
    );
  }
  return validateArenaV2A7FormalEvidenceRecordIndexCandidateV3(records);
}

export function createArenaV2A7FormalEvidenceRetrievalPlanCandidateV3(
  value: unknown,
) {
  const source = cloneFrozenData(value, 'A7 V3 formal Evidence retrieval plan input');
  exactRecord(
    source,
    FORMAL_EVIDENCE_RETRIEVAL_PLAN_INPUT_KEYS,
    'A7 V3 formal Evidence retrieval plan input',
  );
  const legacyEvidence = validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(
    source.legacyEvidence,
  );
  const approvedPolicyAssembly =
    createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1(
      source.approvedPolicyAssemblyInput,
    );
  const approvedPolicyAssemblyIdentity = assertEvidenceSha256(
    source.approvedPolicyAssemblyIdentity,
    'A7 V3 retrieval plan approvedPolicyAssemblyIdentity',
  );
  if (
    approvedPolicyAssembly.approvedPolicyAssemblyIdentity
      !== approvedPolicyAssemblyIdentity
    || approvedPolicyAssembly.assemblyStatus
      !== 'approved-policy-candidate-assembled-not-activated'
    || !approvedPolicyAssembly.eligibleForA7V3BudgetEvidenceBinding
    || !approvedPolicyAssembly.approvedPolicyCandidateHardGateUsable
    || approvedPolicyAssembly.currentV2PolicyMutationApplied
    || approvedPolicyAssembly.hardGate
    || approvedPolicyAssembly.hardGateUsable
  ) throw new RangeError('A7 V3 retrieval plan只接受未激活且独立批准闭合的Policy Assembly。');
  assertArenaV2A7CurrentFormalAssetCatalogLegacyBindingCandidateV2(legacyEvidence);
  assertSourceAndEnvironmentBuildBinding(legacyEvidence, approvedPolicyAssembly);
  const formalEvidenceRecordIndex = createFormalEvidenceRecordIndex(
    legacyEvidence,
    approvedPolicyAssembly,
    source.formalEvidenceRecordLocatorDirectory,
  );
  const formalEvidenceRecordIndexIdentityHash = createDeterministicDataHash(
    formalEvidenceRecordIndex,
    'Arena V2 A7 formal evidence record index candidate V3',
  );
  const formalEvidenceStoreSnapshotIdentityHash = assertEvidenceSha256(
    source.formalEvidenceStoreSnapshotIdentityHash,
    'A7 V3 retrieval plan formalEvidenceStoreSnapshotIdentityHash',
  );
  const core = Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    defaultReleaseBundleWired: false as const,
    defaultEntryWired: false as const,
    grantsA7Pass: false as const,
    approvedPolicyAssemblyIdentity,
    formalEvidenceRecordIndex,
    formalEvidenceRecordIndexIdentityHash,
    formalEvidenceStoreSnapshotIdentityHash,
  });
  return Object.freeze({
    ...core,
    retrievalPlanIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 A7 formal Evidence retrieval plan candidate V3',
    ),
  });
}

export type ArenaV2A7FormalEvidenceRetrievalPlanCandidateV3 = ReturnType<
  typeof createArenaV2A7FormalEvidenceRetrievalPlanCandidateV3
>;

function createFormalEvidenceRecordVerificationIndex(
  evidenceRecordIndex: readonly ArenaV2A7FormalEvidenceRecordIndexEntryCandidateV3[],
  formalEvidenceRetrievalPlanIdentityHash: string,
  formalEvidenceStoreSnapshotIdentityHash: string,
  verificationDirectoryInput: unknown,
) {
  if (!Array.isArray(verificationDirectoryInput)) {
    throw new TypeError('A7 V3视觉/结构Evidence独立验证目录必须是数组。');
  }
  if (
    verificationDirectoryInput.length !== evidenceRecordIndex.length
    || verificationDirectoryInput.length
      > ARENA_V2_A7_FORMAL_EVIDENCE_RECORD_MAXIMUM_COUNT_CANDIDATE_V3
  ) throw new RangeError('A7 V3视觉/结构Evidence独立验证目录必须精确覆盖全部非空记录。');

  const sourceLocatorOwners = new Map(
    evidenceRecordIndex.map((entry) => [entry.evidenceLocator, entry.recordId] as const),
  );
  const sourceShaOwners = new Map(
    evidenceRecordIndex.map((entry) => [entry.evidenceSha256, entry.recordId] as const),
  );
  const sourceProducerIds = new Set(
    evidenceRecordIndex.map(({ evidenceProducerId }) => evidenceProducerId),
  );
  const receiptLocatorOwners = new Map<string, string>();
  const receiptShaOwners = new Map<string, string>();
  const verificationByRecordId = new Map<
  string,
  ArenaV2A7FormalEvidenceRecordVerificationIndexEntryCandidateV3
  >();
  for (let index = 0; index < verificationDirectoryInput.length; index += 1) {
    const sourceEntry = verificationDirectoryInput[index];
    exactRecord(
      sourceEntry,
      FORMAL_EVIDENCE_RECORD_VERIFICATION_KEYS,
      `A7 V3视觉/结构Evidence独立验证目录[${index}]`,
    );
    const recordId = assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
      sourceEntry.recordId,
      `A7 V3视觉/结构Evidence独立验证目录[${index}].recordId`,
    );
    if (verificationByRecordId.has(recordId)) {
      throw new RangeError(`A7 V3视觉/结构Evidence独立验证recordId不得重复：${recordId}。`);
    }
    const verifiedRetrievalPlanIdentityHash = assertEvidenceSha256(
      sourceEntry.formalEvidenceRetrievalPlanIdentityHash,
      `A7 V3视觉/结构Evidence独立验证目录[${index}]`
        + '.formalEvidenceRetrievalPlanIdentityHash',
    );
    if (verifiedRetrievalPlanIdentityHash !== formalEvidenceRetrievalPlanIdentityHash) {
      throw new RangeError(`A7 V3视觉/结构Evidence Retrieval Plan身份漂移：${recordId}。`);
    }
    const verifiedStoreSnapshotIdentityHash = assertEvidenceSha256(
      sourceEntry.formalEvidenceStoreSnapshotIdentityHash,
      `A7 V3视觉/结构Evidence独立验证目录[${index}]`
        + '.formalEvidenceStoreSnapshotIdentityHash',
    );
    if (verifiedStoreSnapshotIdentityHash !== formalEvidenceStoreSnapshotIdentityHash) {
      throw new RangeError(`A7 V3视觉/结构Evidence Store Snapshot身份漂移：${recordId}。`);
    }
    const verifiedEvidenceLocator = assertFormalEvidenceLocator(
      sourceEntry.verifiedEvidenceLocator,
      `A7 V3视觉/结构Evidence独立验证目录[${index}].verifiedEvidenceLocator`,
    );
    const verifiedEvidenceMediaType = assertFormalEvidenceMediaType(
      sourceEntry.verifiedEvidenceMediaType,
      `A7 V3视觉/结构Evidence独立验证目录[${index}].verifiedEvidenceMediaType`,
    );
    const verifiedEvidenceByteLength = assertIntegerAtLeast(
      sourceEntry.verifiedEvidenceByteLength,
      1,
      `A7 V3视觉/结构Evidence独立验证目录[${index}].verifiedEvidenceByteLength`,
    );
    const verifiedEvidenceRecordedAtUtc = assertEvidenceUtcInstant(
      sourceEntry.verifiedEvidenceRecordedAtUtc,
      `A7 V3视觉/结构Evidence独立验证目录[${index}].verifiedEvidenceRecordedAtUtc`,
    );
    const verifiedEvidenceProducerId =
      assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
        sourceEntry.verifiedEvidenceProducerId,
        `A7 V3视觉/结构Evidence独立验证目录[${index}].verifiedEvidenceProducerId`,
      );
    const verifiedEvidenceSha256 = assertEvidenceSha256(
      sourceEntry.verifiedEvidenceSha256,
      `A7 V3视觉/结构Evidence独立验证目录[${index}].verifiedEvidenceSha256`,
    );
    const verifierId = assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
      sourceEntry.verifierId,
      `A7 V3视觉/结构Evidence独立验证目录[${index}].verifierId`,
    );
    const verifiedAtUtc = assertEvidenceUtcInstant(
      sourceEntry.verifiedAtUtc,
      `A7 V3视觉/结构Evidence独立验证目录[${index}].verifiedAtUtc`,
    );
    const verificationReceiptLocator = assertFormalEvidenceLocator(
      sourceEntry.verificationReceiptLocator,
      `A7 V3视觉/结构Evidence独立验证目录[${index}].verificationReceiptLocator`,
    );
    const verificationReceiptMediaType = assertFormalEvidenceMediaType(
      sourceEntry.verificationReceiptMediaType,
      `A7 V3视觉/结构Evidence独立验证目录[${index}].verificationReceiptMediaType`,
    );
    const verificationReceiptByteLength = assertIntegerAtLeast(
      sourceEntry.verificationReceiptByteLength,
      1,
      `A7 V3视觉/结构Evidence独立验证目录[${index}].verificationReceiptByteLength`,
    );
    const verificationReceiptSha256 = assertEvidenceSha256(
      sourceEntry.verificationReceiptSha256,
      `A7 V3视觉/结构Evidence独立验证目录[${index}].verificationReceiptSha256`,
    );
    const sourceLocatorOwner = sourceLocatorOwners.get(verificationReceiptLocator);
    const sourceShaOwner = sourceShaOwners.get(verificationReceiptSha256);
    const existingLocatorOwner = receiptLocatorOwners.get(verificationReceiptLocator);
    const existingShaOwner = receiptShaOwners.get(verificationReceiptSha256);
    if (sourceLocatorOwner !== undefined || existingLocatorOwner !== undefined) {
      throw new RangeError(
        `A7 V3视觉/结构Evidence验证回执Locator不得复用证据或其他回执：${recordId}。`,
      );
    }
    if (sourceShaOwner !== undefined || existingShaOwner !== undefined) {
      throw new RangeError(
        `A7 V3视觉/结构Evidence验证回执SHA不得复用证据或其他回执：${recordId}。`,
      );
    }
    receiptLocatorOwners.set(verificationReceiptLocator, recordId);
    receiptShaOwners.set(verificationReceiptSha256, recordId);
    verificationByRecordId.set(recordId, Object.freeze({
      recordId,
      formalEvidenceRetrievalPlanIdentityHash: verifiedRetrievalPlanIdentityHash,
      formalEvidenceStoreSnapshotIdentityHash: verifiedStoreSnapshotIdentityHash,
      verifiedEvidenceLocator,
      verifiedEvidenceMediaType,
      verifiedEvidenceByteLength,
      verifiedEvidenceRecordedAtUtc,
      verifiedEvidenceProducerId,
      verifiedEvidenceSha256,
      verifierId,
      verifiedAtUtc,
      verificationReceiptLocator,
      verificationReceiptMediaType,
      verificationReceiptByteLength,
      verificationReceiptSha256,
    }));
  }

  const result = evidenceRecordIndex.map((record) => {
    const verification = verificationByRecordId.get(record.recordId);
    if (verification === undefined) {
      throw new RangeError(`A7 V3视觉/结构Evidence缺少独立验证回执：${record.recordId}。`);
    }
    if (
      verification.verifiedEvidenceLocator !== record.evidenceLocator
      || verification.verifiedEvidenceMediaType !== record.evidenceMediaType
      || verification.verifiedEvidenceByteLength !== record.evidenceByteLength
      || verification.verifiedEvidenceRecordedAtUtc !== record.evidenceRecordedAtUtc
      || verification.verifiedEvidenceProducerId !== record.evidenceProducerId
      || verification.verifiedEvidenceSha256 !== record.evidenceSha256
    ) throw new RangeError(`A7 V3视觉/结构Evidence独立验证观察发生漂移：${record.recordId}。`);
    if (sourceProducerIds.has(verification.verifierId)) {
      throw new RangeError(
        `A7 V3视觉/结构Evidence Verifier不得兼任任一Evidence Producer：${record.recordId}。`,
      );
    }
    if (verification.verifiedAtUtc < record.evidenceRecordedAtUtc) {
      throw new RangeError(`A7 V3视觉/结构Evidence验证时间不得早于记录时间：${record.recordId}。`);
    }
    return verification;
  });
  return Object.freeze(result);
}

function assertApprovedPolicyMediaIdentityBinding(
  approvedPolicyAssembly: ReturnType<
    typeof createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1
  >,
) {
  const approvedArtifacts = approvedPolicyAssembly.approvedPolicyCandidate.artifacts;
  const baseArtifacts = ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS;
  if (approvedArtifacts.length !== baseArtifacts.length) {
    throw new RangeError('A7 V3已批准预算必须精确保留当前130项媒体Source身份。');
  }
  for (let index = 0; index < baseArtifacts.length; index += 1) {
    const approved = approvedArtifacts[index];
    const base = baseArtifacts[index];
    if (approved === undefined || base === undefined) {
      throw new RangeError(`A7 V3已批准预算媒体Source身份缺失：index=${index}。`);
    }
    const approvedDecodedAudioBytes = approved.currentDecodedAudioBytes;
    if (
      approved.assetId !== base.id
      || approved.artifactPath !== base.path
      || approved.kind !== base.kind
      || approved.encodedMediaFormat !== base.encodedMediaFormat
      || approved.decodedTextureFormat !== base.decodedTextureFormat
      || approved.artifactSha256 !== base.sha256
      || approved.currentEncodedBytes !== base.currentEncodedBytes
      || approved.currentDecodedTextureBytes !== base.decodedTextureBytes
      || approved.currentTextureWidthPixels !== base.widthPixels
      || approved.currentTextureHeightPixels !== base.heightPixels
      || !Number.isSafeInteger(approvedDecodedAudioBytes)
      || approvedDecodedAudioBytes < 0
      || (base.kind === 'audio') !== (approvedDecodedAudioBytes > 0)
      || approved.maximums.decodedAudioBytes < approvedDecodedAudioBytes
      || (base.kind !== 'audio' && approved.maximums.decodedAudioBytes !== 0)
    ) throw new RangeError(`A7 V3已批准预算媒体Source身份漂移：index=${index}。`);
  }
  return Object.freeze({
    artifactCount: approvedArtifacts.length,
    encodedMediaFormatIdentityCoverage: true as const,
    decodedTextureFormatIdentityCoverage: true as const,
    textureDimensionAndDecodedByteIdentityCoverage: true as const,
    decodedAudioObservationAndMaximumCoverage: true as const,
  });
}

function assertApprovedPolicyObservationFloors(
  approvedPolicyAssembly: ReturnType<
    typeof createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1
  >,
) {
  const policy = approvedPolicyAssembly.approvedPolicyCandidate;
  for (let index = 0; index < policy.artifacts.length; index += 1) {
    const entry = policy.artifacts[index];
    if (entry === undefined) {
      throw new RangeError(`A7 V3已批准预算缺少资产观察：index=${index}。`);
    }
    const observed = entry.acceptedObservation;
    const maximum = entry.maximums;
    const observedIntegers = [
      observed.currentEncodedBytes,
      observed.nodeCount,
      observed.jointCount,
      observed.animationClipCount,
      observed.primitiveCount,
      observed.materialCount,
      observed.textureCount,
      observed.widthPixels,
      observed.heightPixels,
      observed.decodedTextureBytes,
      observed.decodedAudioBytes,
      observed.maximumMeasuredResidentBytes,
      observed.maximumMeasuredGpuBytes,
    ];
    const maximumPairs: readonly (readonly [number, number])[] = [
      [maximum.encodedBytes, observed.currentEncodedBytes],
      [maximum.nodeCount, observed.nodeCount],
      [maximum.jointCount, observed.jointCount],
      [maximum.animationClipCount, observed.animationClipCount],
      [maximum.primitiveCount, observed.primitiveCount],
      [maximum.materialCount, observed.materialCount],
      [maximum.textureCount, observed.textureCount],
      [maximum.widthPixels, observed.widthPixels],
      [maximum.heightPixels, observed.heightPixels],
      [maximum.decodedTextureBytes, observed.decodedTextureBytes],
      [maximum.decodedAudioBytes, observed.decodedAudioBytes],
      [maximum.residentBytes, observed.maximumMeasuredResidentBytes],
      [maximum.gpuBytes, observed.maximumMeasuredGpuBytes],
    ];
    if (
      observedIntegers.some((value) => !Number.isSafeInteger(value) || value < 0)
      || maximumPairs.some(([limit, floor]) => (
        !Number.isSafeInteger(limit) || limit < floor
      ))
      || entry.currentEncodedBytes !== observed.currentEncodedBytes
      || entry.currentDecodedTextureBytes !== observed.decodedTextureBytes
      || entry.currentTextureWidthPixels !== observed.widthPixels
      || entry.currentTextureHeightPixels !== observed.heightPixels
      || entry.currentDecodedAudioBytes !== observed.decodedAudioBytes
    ) throw new RangeError(`A7 V3已批准预算资产maximum低于观察或投影漂移：index=${index}。`);
  }
  for (let index = 0; index < policy.environments.length; index += 1) {
    const entry = policy.environments[index];
    const evidenceRecord =
      policy.evidenceIdentity.structuralEnvironmentEvidenceRecords[index];
    if (entry === undefined) {
      throw new RangeError(`A7 V3已批准预算缺少环境观察：index=${index}。`);
    }
    if (evidenceRecord === undefined) {
      throw new RangeError(`A7 V3已批准预算缺少环境原始证据身份：index=${index}。`);
    }
    const observed = entry.acceptedObservation;
    const maximum = entry.maximums;
    if (
      entry.environmentId !== evidenceRecord.environmentId
      || observed.evidenceLocator !== evidenceRecord.evidenceLocator
      || observed.evidenceSha256 !== evidenceRecord.evidenceSha256
      || entry.buildIdentitySha256 !== observed.buildIdentitySha256
      || !Number.isSafeInteger(observed.peakResidentBytes)
      || observed.peakResidentBytes < 0
      || !Number.isSafeInteger(observed.peakGpuBytes)
      || observed.peakGpuBytes < 0
      || !Number.isSafeInteger(observed.peakAudioDecodedBytes)
      || observed.peakAudioDecodedBytes < 0
      || !Number.isFinite(observed.peakAssetUploadMilliseconds)
      || observed.peakAssetUploadMilliseconds < 0
      || !Number.isSafeInteger(maximum.peakResidentBytes)
      || !Number.isSafeInteger(maximum.peakGpuBytes)
      || !Number.isSafeInteger(maximum.peakAudioDecodedBytes)
      || !Number.isFinite(maximum.assetUploadMilliseconds)
      || maximum.peakResidentBytes < observed.peakResidentBytes
      || maximum.peakGpuBytes < observed.peakGpuBytes
      || maximum.peakAudioDecodedBytes < observed.peakAudioDecodedBytes
      || maximum.assetUploadMilliseconds < observed.peakAssetUploadMilliseconds
      || !observed.contextRestoreCompleted
      || !observed.cleanupReturnedToBaseline
      || !entry.requiresContextRestoreCompleted
      || !entry.requiresCleanupReturnedToBaseline
    ) throw new RangeError(`A7 V3已批准预算环境maximum或生命周期观察无效：index=${index}。`);
  }
  return Object.freeze({
    artifactObservationFloorCount: policy.artifacts.length,
    environmentObservationFloorCount: policy.environments.length,
    everyMaximumAtOrAboveAcceptedObservation: true as const,
    everyObservedEnvironmentLifecycleSatisfied: true as const,
    everyEnvironmentObservationBoundToOriginalEvidenceIdentity: true as const,
  });
}

function assertApprovedPolicyGovernanceProvenance(
  approvedPolicyAssembly: ReturnType<
    typeof createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1
  >,
) {
  const policy = approvedPolicyAssembly.approvedPolicyCandidate;
  const provenance = policy.governanceProvenance;
  const actorIds = [
    provenance.collectorId,
    provenance.reviewerId,
    provenance.proposerId,
    provenance.approverId,
  ] as const;
  if (
    new Set(actorIds).size !== actorIds.length
    || provenance.capturedAtUtc
      !== policy.evidenceIdentity.structuralEvidenceCapturedAtUtc
    || provenance.approverId !== policy.approvalSummary.approverId
    || provenance.capturedAtUtc > provenance.reviewedAtUtc
    || provenance.reviewedAtUtc > provenance.proposedAtUtc
    || provenance.proposedAtUtc > provenance.decidedAtUtc
  ) {
    throw new RangeError('A7 V3已批准预算独立治理角色或时间线发生漂移。');
  }
  return Object.freeze({
    independentActorCount: actorIds.length,
    collectorReviewerProposerAndApproverRemainDistinct: true as const,
    capturedReviewedProposedAndDecidedTimelineOrdered: true as const,
  });
}

function assertApprovedPolicyIndependentApprovalClosure(
  approvedPolicyAssembly: ReturnType<
    typeof createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1
  >,
) {
  const policy = approvedPolicyAssembly.approvedPolicyCandidate;
  const summary = policy.approvalSummary;
  const expectedZeroHeadroomDispositionCount =
    policy.structuralSummary.zeroHeadroomAssetCount
      + policy.structuralSummary.zeroHeadroomEnvironmentCount;
  if (
    summary.decisionStatus !== 'approved'
    || !summary.artifactHeadroomAdequacyVerified
    || !summary.environmentHeadroomAdequacyVerified
    || !summary.applicabilityAndObservationFloorVerified
    || !summary.lifecycleRequirementsVerified
    || !summary.everyObservedEnvironmentLifecycleSatisfied
    || !summary.everyZeroHeadroomDispositionAccepted
    || summary.zeroHeadroomDispositionCount
      !== expectedZeroHeadroomDispositionCount
  ) {
    throw new RangeError('A7 V3已批准预算的独立批准摘要或零余量处置数量未闭合。');
  }
  return Object.freeze({
    decisionStatus: 'approved' as const,
    zeroHeadroomDispositionCount: summary.zeroHeadroomDispositionCount,
    expectedZeroHeadroomDispositionCount,
    everyIndependentApprovalFactClosed: true as const,
  });
}

function assertApprovedPolicyAssemblyGovernanceEnvelope(
  approvedPolicyAssembly: ReturnType<
    typeof createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1
  >,
) {
  const policy = approvedPolicyAssembly.approvedPolicyCandidate;
  const provenance = policy.governanceProvenance;
  const actorIds = [
    provenance.collectorId,
    provenance.reviewerId,
    provenance.proposerId,
    provenance.approverId,
    approvedPolicyAssembly.assemblerId,
  ] as const;
  const upstreamLocators = new Set([
    ...policy.evidenceIdentity.structuralEnvironmentEvidenceRecords.map(
      (entry) => entry.evidenceLocator,
    ),
    policy.evidenceIdentity.structuralEvidenceReportLocator,
    policy.evidenceIdentity.structuralEvidenceVerificationRecordLocator,
    policy.evidenceIdentity.structuralLimitProposalRecordLocator,
    policy.evidenceIdentity.independentApprovalRecordLocator,
  ]);
  const upstreamHashes = new Set([
    ...policy.evidenceIdentity.structuralEnvironmentEvidenceRecords.map(
      (entry) => entry.evidenceSha256,
    ),
    policy.evidenceIdentity.structuralEvidenceReportSha256,
    policy.evidenceIdentity.structuralEvidenceVerificationRecordSha256,
    policy.evidenceIdentity.structuralLimitProposalRecordSha256,
    policy.evidenceIdentity.independentApprovalRecordSha256,
  ]);
  if (
    new Set(actorIds).size !== actorIds.length
    || approvedPolicyAssembly.assembledAtUtc < provenance.decidedAtUtc
    || upstreamLocators.has(approvedPolicyAssembly.assemblyRecordLocator)
    || upstreamHashes.has(approvedPolicyAssembly.assemblyRecordSha256)
  ) {
    throw new RangeError('A7 V3已批准预算第五角色、装配时间或装配记录分域未闭合。');
  }
  return Object.freeze({
    independentActorCountIncludingAssembler: actorIds.length,
    assemblerRemainsDistinctFromPriorFourActors: true as const,
    assembledAtOrAfterDecision: true as const,
    assemblyRecordRemainsDistinctFromUpstreamEvidence: true as const,
  });
}

/**
 * Replaces only V2's intentionally unresolved budget gate with a separately
 * approved immutable policy candidate. It still never publishes or advances P7.
 */
export function evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
  value: unknown,
) {
  const source = cloneFrozenData(value, 'Arena V2 A7 visual/media evidence V3 options');
  exactRecord(source, OPTION_KEYS, 'Arena V2 A7 visual/media evidence V3 options');
  exactRecord(source.evidence, INPUT_KEYS, 'Arena V2 A7 visual/media evidence V3');
  if (
    source.evidence.schemaVersion
      !== ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V3_SCHEMA_VERSION
  ) throw new RangeError('Arena V2 A7 visual/media evidence V3 schemaVersion无效。');
  const legacyEvidence = validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(
    source.evidence.legacyEvidence,
  );
  const approvedPolicyAssembly =
    createArenaV2A7FormalBudgetApprovedPolicyAssemblyCandidateV1(
      source.evidence.approvedPolicyAssemblyInput,
    );
  if (
    source.evidence.approvedPolicyAssemblyIdentity
      !== approvedPolicyAssembly.approvedPolicyAssemblyIdentity
    || approvedPolicyAssembly.assemblyStatus
      !== 'approved-policy-candidate-assembled-not-activated'
    || !approvedPolicyAssembly.eligibleForA7V3BudgetEvidenceBinding
    || !approvedPolicyAssembly.approvedPolicyCandidateHardGateUsable
    || approvedPolicyAssembly.currentV2PolicyMutationApplied
    || approvedPolicyAssembly.hardGate
    || approvedPolicyAssembly.hardGateUsable
  ) throw new RangeError('A7 V3只接受未激活但独立批准闭合的新不可变预算Policy候选。');

  const catalogCoverage =
    assertArenaV2A7CurrentFormalAssetCatalogLegacyBindingCandidateV2(
      legacyEvidence,
    );
  assertSourceAndEnvironmentBuildBinding(legacyEvidence, approvedPolicyAssembly);
  const approvedPolicyMediaIdentityCoverage =
    assertApprovedPolicyMediaIdentityBinding(approvedPolicyAssembly);
  const approvedPolicyObservationFloorCoverage =
    assertApprovedPolicyObservationFloors(approvedPolicyAssembly);
  const approvedPolicyGovernanceProvenanceCoverage =
    assertApprovedPolicyGovernanceProvenance(approvedPolicyAssembly);
  const approvedPolicyIndependentApprovalClosureCoverage =
    assertApprovedPolicyIndependentApprovalClosure(approvedPolicyAssembly);
  const approvedPolicyAssemblyGovernanceEnvelopeCoverage =
    assertApprovedPolicyAssemblyGovernanceEnvelope(approvedPolicyAssembly);
  const formalEvidenceRetrievalPlan =
    createArenaV2A7FormalEvidenceRetrievalPlanCandidateV3({
      legacyEvidence: source.evidence.legacyEvidence,
      approvedPolicyAssemblyInput: source.evidence.approvedPolicyAssemblyInput,
      approvedPolicyAssemblyIdentity:
        source.evidence.approvedPolicyAssemblyIdentity,
      formalEvidenceRecordLocatorDirectory:
        source.evidence.formalEvidenceRecordLocatorDirectory,
      formalEvidenceStoreSnapshotIdentityHash:
        source.evidence.formalEvidenceStoreSnapshotIdentityHash,
    });
  const formalEvidenceRecordIndex =
    formalEvidenceRetrievalPlan.formalEvidenceRecordIndex;
  const formalEvidenceRecordVerificationIndex =
    createFormalEvidenceRecordVerificationIndex(
      formalEvidenceRecordIndex,
      formalEvidenceRetrievalPlan.retrievalPlanIdentityHash,
      formalEvidenceRetrievalPlan.formalEvidenceStoreSnapshotIdentityHash,
      source.evidence.formalEvidenceRecordVerificationDirectory,
    );
  const totalFormalEvidenceBytes = sumSafeNonNegativeIntegers(
    formalEvidenceRecordIndex.map(({ evidenceByteLength }) => evidenceByteLength),
    'A7 V3视觉/结构Evidence字节',
  );
  const formalEvidenceRecordIndexIdentityHash =
    formalEvidenceRetrievalPlan.formalEvidenceRecordIndexIdentityHash;
  const totalFormalEvidenceVerificationReceiptBytes = sumSafeNonNegativeIntegers(
    formalEvidenceRecordVerificationIndex.map(
      ({ verificationReceiptByteLength }) => verificationReceiptByteLength,
    ),
    'A7 V3视觉/结构Evidence验证回执字节',
  );
  const formalEvidenceRecordVerificationIndexIdentityHash = createDeterministicDataHash(
    formalEvidenceRecordVerificationIndex,
    'Arena V2 A7 formal evidence record verification index candidate V3',
  );
  const baseIncompleteReasons = legacyEvidence.incompleteReasons.filter(
    (reason) => !isLegacyBudgetReason(reason),
  );
  const baseFailureReasons = legacyEvidence.failureReasons.filter(
    (reason) => !isLegacyBudgetReason(reason),
  );
  const incompleteReasons = Object.freeze([...baseIncompleteReasons]);
  const failureReasons = Object.freeze([...baseFailureReasons]);
  const evidenceStatus: ArenaV2A7FormalVisualMediaFreezeStatusCandidateV3 =
    incompleteReasons.length > 0 ? 'INCOMPLETE'
      : failureReasons.length > 0 ? 'FAIL' : 'PASS';
  const policy = approvedPolicyAssembly.approvedPolicyCandidate;
  const totalCurrentEncodedBytes = sumSafeNonNegativeIntegers(
    policy.artifacts.map((entry) => entry.currentEncodedBytes),
    'A7 V3预算当前编码字节',
  );
  const totalMaximumEncodedBytes = sumSafeNonNegativeIntegers(
    policy.artifacts.map((entry) => entry.maximums.encodedBytes),
    'A7 V3预算最大编码字节',
  );
  const evidence = Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V3_SCHEMA_VERSION,
    legacyEvidence: legacyEvidence.evidence,
    approvedPolicyAssemblyInput: source.evidence.approvedPolicyAssemblyInput,
    approvedPolicyAssemblyIdentity:
      approvedPolicyAssembly.approvedPolicyAssemblyIdentity,
    formalEvidenceRecordLocatorDirectory: Object.freeze(
      formalEvidenceRecordIndex.map(({
        recordId,
        evidenceLocator,
        evidenceMediaType,
        evidenceByteLength,
        evidenceRecordedAtUtc,
        evidenceProducerId,
      }) => Object.freeze({
        recordId,
        evidenceLocator,
        evidenceMediaType,
        evidenceByteLength,
        evidenceRecordedAtUtc,
        evidenceProducerId,
      })),
    ),
    formalEvidenceRecordVerificationDirectory:
      formalEvidenceRecordVerificationIndex,
    formalEvidenceRetrievalPlanIdentityHash:
      formalEvidenceRetrievalPlan.retrievalPlanIdentityHash,
    formalEvidenceStoreSnapshotIdentityHash:
      formalEvidenceRetrievalPlan.formalEvidenceStoreSnapshotIdentityHash,
    approvedPolicy: Object.freeze({
      policyId: policy.policyId,
      policyRevision: policy.policyRevision,
      policyContentHash: policy.policyContentHash,
      approvedPolicyAssemblyIdentity:
        approvedPolicyAssembly.approvedPolicyAssemblyIdentity,
      structuralEvidenceReportSha256:
        policy.evidenceIdentity.structuralEvidenceReportSha256,
      independentApprovalRecordSha256:
        policy.evidenceIdentity.independentApprovalRecordSha256,
    }),
  });
  const core = Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V3_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    currentGate: evidenceStatus === 'PASS'
      ? 'candidate-pass-not-wired' as const
      : 'incomplete' as const,
    defaultReleaseBundleWired: false as const,
    defaultEntryWired: false as const,
    validationStatus: 'not-run' as const,
    publishes: false as const,
    createsOrModifiesAssets: false as const,
    participatesInGameplayAuthority: false as const,
    p7AdvanceComputedHere: false as const,
    p7ReleaseFreezeManifestOwnedHere: false as const,
    evidenceStatus,
    hardGate: evidenceStatus === 'PASS',
    formalVisualMediaReady: evidenceStatus === 'PASS',
    budgetSummary: Object.freeze({
      policyId: policy.policyId,
      policyRevision: policy.policyRevision,
      policyContentHash: policy.policyContentHash,
      policyArtifactCount: policy.artifacts.length,
      policyEnvironmentCount: policy.environments.length,
      approvalStatus: policy.approvalStatus,
      structuralLimitsStatus: policy.structuralLimitsStatus,
      hardGateUsableForA7V3BudgetCheck:
        policy.hardGateUsableForA7V3BudgetCheck,
      catalogCoverage,
      approvedPolicyMediaIdentityCoverage,
      approvedPolicyObservationFloorCoverage,
      approvedPolicyGovernanceProvenanceCoverage,
      approvedPolicyIndependentApprovalClosureCoverage,
      approvedPolicyAssemblyGovernanceEnvelopeCoverage,
      measured: Object.freeze({
        totalCurrentEncodedBytes,
        totalMaximumEncodedBytes,
        deliveryBytes: legacyEvidence.budgetSummary.measured.deliveryBytes,
      }),
    }),
    coverageSummary: Object.freeze({
      ...legacyEvidence.coverageSummary,
      formalBudgetObservationCount: policy.artifacts.length,
      formalBudgetCatalogArtifactCount: policy.artifacts.length,
      formalBudgetEnvironmentCount: policy.environments.length,
      formalEvidenceRecordCount: formalEvidenceRecordIndex.length,
      totalFormalEvidenceBytes,
      formalEvidenceVerificationReceiptCount:
        formalEvidenceRecordVerificationIndex.length,
      totalFormalEvidenceVerificationReceiptBytes,
      zeroHeadroomDispositionCount:
        policy.approvalSummary.zeroHeadroomDispositionCount,
    }),
    incompleteReasons,
    failureReasons,
    formalEvidenceRecordIndex,
    formalEvidenceRecordIndexIdentityHash,
    formalEvidenceRetrievalPlanIdentityHash:
      formalEvidenceRetrievalPlan.retrievalPlanIdentityHash,
    formalEvidenceStoreSnapshotIdentityHash:
      formalEvidenceRetrievalPlan.formalEvidenceStoreSnapshotIdentityHash,
    formalEvidenceRecordVerificationIndex,
    formalEvidenceRecordVerificationIndexIdentityHash,
    explicitNonActions: EXPLICIT_NON_ACTIONS,
    legacyEvidence,
    approvedPolicyAssembly,
    evidence,
  });
  return Object.freeze({
    ...core,
    evidenceIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 A7 formal visual/media freeze evidence candidate V3',
    ),
  });
}

export type ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3 = ReturnType<
  typeof evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3
>;

/** Recomputes stored V3 evidence and rejects self-reported gate or identity drift. */
export function validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3(
  value: unknown,
): ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3 {
  const source = cloneFrozenData(value, 'Arena V2 A7 stored visual/media evidence V3');
  exactRecord(source, STORED_KEYS, 'Arena V2 A7 stored visual/media evidence V3');
  const canonical = evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV3({
    evidence: {
      schemaVersion:
        ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V3_SCHEMA_VERSION,
      legacyEvidence: source.legacyEvidence,
      approvedPolicyAssemblyInput:
        (source.evidence as Record<string, unknown>).approvedPolicyAssemblyInput,
      approvedPolicyAssemblyIdentity:
        (source.evidence as Record<string, unknown>).approvedPolicyAssemblyIdentity,
      formalEvidenceRecordLocatorDirectory:
        (source.evidence as Record<string, unknown>).formalEvidenceRecordLocatorDirectory,
      formalEvidenceStoreSnapshotIdentityHash:
        (source.evidence as Record<string, unknown>).formalEvidenceStoreSnapshotIdentityHash,
      formalEvidenceRecordVerificationDirectory:
        (source.evidence as Record<string, unknown>).formalEvidenceRecordVerificationDirectory,
    },
  });
  if (
    source.evidenceIdentityHash !== canonical.evidenceIdentityHash
    || createDeterministicDataHash(
      source,
      'Arena V2 A7 stored visual/media evidence V3 comparison',
    ) !== createDeterministicDataHash(
      canonical,
      'Arena V2 A7 stored visual/media evidence V3 comparison',
    )
  ) throw new RangeError('Arena V2 A7 stored visual/media evidence V3身份或结果发生漂移。');
  return canonical;
}

export const ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V3 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V3_SCHEMA_VERSION,
    id: 'arena-v2.a7.formal-visual-media-freeze-evidence.candidate.v3' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    currentGate: 'incomplete' as const,
    defaultReleaseBundleWired: false as const,
    defaultEntryWired: false as const,
    validationStatus: 'not-run' as const,
    currentPassInstanceExists: false as const,
    hardGate: false as const,
    formalAssetCatalogCount: 130 as const,
    formalEvidenceRecordMaximumCount:
      ARENA_V2_A7_FORMAL_EVIDENCE_RECORD_MAXIMUM_COUNT_CANDIDATE_V3,
    requiresApprovedPolicyAssembly: true as const,
    requiresSameSourceAndSixEnvironmentBuildSet: true as const,
    budgetByteAggregatesMustRemainSafeIntegers: true as const,
    approvedPolicyRetainsBaseEncodedMediaFormatIdentity: true as const,
    approvedPolicyRetainsBaseTextureDecodedMetadataIdentity: true as const,
    approvedPolicyRetainsAcceptedDecodedAudioObservation: true as const,
    approvedPolicyRevalidatesAcceptedObservationFloorsAndLifecycle: true as const,
    approvedPolicyRevalidatesEnvironmentObservationEvidenceIdentity: true as const,
    approvedPolicyRevalidatesIndependentGovernanceRolesAndTimeline: true as const,
    approvedPolicyRevalidatesIndependentApprovalClosureSummary: true as const,
    approvedPolicyRevalidatesAssemblyGovernanceEnvelope: true as const,
    formalEvidenceRecordIndexOwnedByA7V3: true as const,
    formalEvidenceRecordIdsMustRemainDistinct: true as const,
    formalEvidenceRecordLocatorsRequired: true as const,
    formalEvidenceRecordLocatorsMustRemainDistinct: true as const,
    formalEvidenceRecordMediaTypeAndByteLengthRequired: true as const,
    formalEvidenceRecordCanonicalUtcTimeRequired: true as const,
    formalEvidenceRecordGovernanceTimelineBindingRequired: true as const,
    formalEvidenceRecordProducerIdentityRequired: true as const,
    formalEvidenceRecordGovernanceRoleBindingRequired: true as const,
    formalEvidenceRecordCanonicalStoreLocatorRequired: true as const,
    formalEvidenceRecordIndexIdentityOwnedByA7V3: true as const,
    formalEvidenceRetrievalPlanOwnedByA7V3: true as const,
    formalEvidenceRetrievalPlanDoesNotGrantPass: true as const,
    formalEvidenceStoreSnapshotIdentityRequired: true as const,
    everyVerificationReceiptBindsSameStoreSnapshot: true as const,
    everyVerificationReceiptBindsDerivedRetrievalPlan: true as const,
    formalEvidenceRecordIndependentVerificationRequired: true as const,
    formalEvidenceRecordVerifierMustRemainDistinctFromProducer: true as const,
    formalEvidenceRecordVerifierMustRemainIndependentFromAllProducers: true as const,
    formalEvidenceRecordVerificationReceiptIdentityOwnedByA7V3: true as const,
    formalEvidenceByteLengthAggregateMustRemainSafeInteger: true as const,
    formalEvidenceRecordShasMustRemainDistinct: true as const,
    replacesOnlyObsoleteV1V2BudgetGate: true as const,
    currentV2PolicyRemainsUnchanged: true as const,
    createsOrModifiesAssets: false as const,
    producesDeviceHumanOrApprovalEvidence: false as const,
    p7ReleaseFreezeManifestOwnedHere: false as const,
    p7AdvanceComputedHere: false as const,
  });
