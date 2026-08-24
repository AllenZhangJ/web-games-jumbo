import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY,
  type ArenaStage7FormalAssetBudgetArtifactV2Candidate,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1,
  ARENA_V2_FORMAL_MATERIAL_TEXTURE_ASSET_RECORDS_CANDIDATE_V1,
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1,
  ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1,
  ARENA_V2_FORMAL_VISUAL_ASSET_RECORDS_CANDIDATE_V1,
} from './arena-v2-formal-presentation-asset-catalog-candidate-v1.js';

export const ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;
export const ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_ID =
  'arena-v2.a3-a6.production-approval-evidence-ledger.candidate.v1' as const;

export const ARENA_V2_A3_A6_PRODUCTION_APPROVAL_REQUIRED_EVIDENCE_SLOT_IDS_V1 =
  Object.freeze([
    'art-direction-review',
    'production-rights-review',
    'approved-structure-budget',
    'browser-integration-capture',
    'device-visual-performance',
    'human-readability',
    'lifecycle-release',
  ] as const);

const GAP_REASON_IDS = Object.freeze([
  'production-art-review-missing',
  'production-rights-review-missing',
  'approved-structure-budget-missing',
  'browser-capture-missing',
  'device-evidence-missing',
  'human-review-missing',
  'lifecycle-evidence-missing',
] as const);

const ROOT_KEYS = Object.freeze([
  'schemaVersion',
  'id',
  'contentVersion',
  'status',
  'implementationStatus',
  'validationStatus',
  'grantsApproval',
  'hardGate',
  'assetUsePermitted',
  'formalReady',
  'defaultFormalBundleConsumes',
  'defaultPreloaderConsumes',
  'defaultEntryConsumes',
  'participatesInGameplayAuthority',
  'createsOrModifiesAssets',
  'loadsAssets',
  'p7AdvanceComputedHere',
  'catalogContentHash',
  'budgetPolicyIdentity',
  'requiredEvidenceSlotIds',
  'entries',
] as const);
const POLICY_IDENTITY_KEYS = Object.freeze([
  'policyId',
  'policyContentHash',
  'artifactCount',
  'status',
  'implementationStatus',
  'validationStatus',
  'approvalStatus',
  'hardGateUsable',
] as const);
const ENTRY_KEYS = Object.freeze([
  'catalogContentHash',
  'budgetPolicyIdentity',
  'assetId',
  'artifactPath',
  'kind',
  'byteLength',
  'sha256',
  'maturity',
  'sourceEvidence',
  'sourceApprovalRecorded',
  'productionApprovalStatus',
  'budgetCandidateCovered',
  'assetUsePermitted',
  'formalReady',
  'requiredEvidenceSlots',
  'gapReasonIds',
] as const);
const SOURCE_EVIDENCE_KEYS = Object.freeze([
  'sourceLocator',
  'sourceRevision',
  'licenseId',
  'rightsHolder',
  'proofDocument',
  'sourceApproverId',
  'sourceApprovedAt',
] as const);
const EVIDENCE_SLOT_KEYS = Object.freeze([
  'slotId',
  'status',
  'evidenceIdentity',
  'reviewerId',
  'reviewedAt',
] as const);

type PlainDataRecord = Readonly<Record<string, unknown>>;
type SourceProvenance = Readonly<{
  sourceLocator: string;
  sourceRevision: string;
  licenseId: string;
  rightsHolder: string;
  approvedBy: string | null;
  approvedAt: string | null;
  proofDocument: string;
}>;
type CatalogAsset = Readonly<{
  assetId: string;
  artifactPath: string;
  encodedMediaFormat: 'glb' | 'ogg' | 'png';
  byteLength: number;
  decodedTextureFormat: 'not-applicable' | 'rgba8';
  widthPixels: number;
  heightPixels: number;
  sha256: string;
  maturity: 'verified-intake-only' | 'authored-candidate-not-approved';
  provenance: SourceProvenance;
}>;

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function dataRecord(value: unknown, keys: readonly string[], name: string): PlainDataRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是plain data object。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name}原型必须是Object.prototype或null。`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key === 'symbol')) {
    throw new TypeError(`${name}不得包含Symbol字段。`);
  }
  const actual = ownKeys as string[];
  if (actual.length !== keys.length || keys.some((key) => !actual.includes(key))) {
    throw new TypeError(`${name}字段必须exact-key闭合。`);
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
  return value as PlainDataRecord;
}

function denseDataArray(value: unknown, name: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key === 'symbol')) {
    throw new TypeError(`${name}不得包含Symbol字段。`);
  }
  const allowed = new Set([
    'length',
    ...Array.from({ length: value.length }, (_, index) => String(index)),
  ]);
  if (ownKeys.some((key) => typeof key === 'string' && !allowed.has(key))) {
    throw new TypeError(`${name}不得包含额外字段。`);
  }
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}[${index}]必须是稠密数据项。`);
    }
  }
  return value;
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${name}必须是非空字符串。`);
  }
  return value;
}

function safePositiveInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new RangeError(`${name}必须是正安全整数。`);
  }
  return value as number;
}

function catalogAssets(): readonly CatalogAsset[] {
  const values: CatalogAsset[] = [
    ...ARENA_V2_FORMAL_VISUAL_ASSET_RECORDS_CANDIDATE_V1.map((record) => ({
      assetId: record.runtimeDefinition.id,
      artifactPath: record.artifactPath,
      encodedMediaFormat: record.encodedMediaFormat,
      byteLength: record.byteLength,
      decodedTextureFormat: 'not-applicable' as const,
      widthPixels: 0,
      heightPixels: 0,
      sha256: record.sha256,
      maturity: record.maturity,
      provenance: record.provenance,
    })),
    ...ARENA_V2_FORMAL_MATERIAL_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.map((record) => ({
      assetId: record.textureAssetId,
      artifactPath: record.artifactPath,
      encodedMediaFormat: record.encodedMediaFormat,
      byteLength: record.byteLength,
      decodedTextureFormat: record.decodedTextureFormat,
      widthPixels: record.width,
      heightPixels: record.height,
      sha256: record.sha256,
      maturity: record.maturity,
      provenance: record.provenance,
    })),
    ...ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.map((record) => ({
      assetId: record.audioAssetId,
      artifactPath: record.artifactPath,
      encodedMediaFormat: record.encodedMediaFormat,
      byteLength: record.byteLength,
      decodedTextureFormat: 'not-applicable' as const,
      widthPixels: 0,
      heightPixels: 0,
      sha256: record.sha256,
      maturity: record.maturity,
      provenance: record.provenance,
    })),
    ...ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.map((record) => ({
      assetId: record.vfxAssetId,
      artifactPath: record.artifactPath,
      encodedMediaFormat: record.encodedMediaFormat,
      byteLength: record.byteLength,
      decodedTextureFormat: record.decodedTextureFormat,
      widthPixels: record.width,
      heightPixels: record.height,
      sha256: record.sha256,
      maturity: record.maturity,
      provenance: record.provenance,
    })),
  ];
  values.sort((left, right) => compareText(left.assetId, right.assetId));
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const value of values) {
    if (ids.has(value.assetId) || paths.has(value.artifactPath)) {
      throw new RangeError(`Arena V2正式Catalog身份重复：${value.assetId}。`);
    }
    ids.add(value.assetId);
    paths.add(value.artifactPath);
  }
  if (values.length !== 130 || ids.size !== 130 || paths.size !== 130) {
    throw new RangeError('Arena V2逐资产批准账本要求当前Catalog精确闭合130项。');
  }
  return Object.freeze(values.map((value) => Object.freeze(value)));
}

const CATALOG_ASSETS = catalogAssets();
const BUDGET_ARTIFACT_BY_ID: ReadonlyMap<
  string,
  ArenaStage7FormalAssetBudgetArtifactV2Candidate
> = new Map(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS.map((artifact) => (
  [artifact.id, artifact] as const
)));

const EMPTY_EVIDENCE_SLOTS = Object.freeze(
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_REQUIRED_EVIDENCE_SLOT_IDS_V1.map((slotId) => (
    Object.freeze({
      slotId,
      status: 'missing' as const,
      evidenceIdentity: null,
      reviewerId: null,
      reviewedAt: null,
    })
  )),
);

const CANONICAL_ENTRIES = Object.freeze(CATALOG_ASSETS.map((asset) => {
  const budget = BUDGET_ARTIFACT_BY_ID.get(asset.assetId);
  if (
    budget === undefined
    || budget.path !== asset.artifactPath
    || budget.currentEncodedBytes !== asset.byteLength
    || budget.maximumEncodedBytes !== asset.byteLength
    || budget.encodedMediaFormat !== asset.encodedMediaFormat
    || budget.decodedTextureFormat !== asset.decodedTextureFormat
    || budget.widthPixels !== asset.widthPixels
    || budget.heightPixels !== asset.heightPixels
    || budget.sha256 !== asset.sha256
  ) {
    throw new RangeError(`Arena V2逐资产批准账本缺少V2预算身份：${asset.assetId}。`);
  }
  const sourceApprovalRecorded = asset.provenance.approvedBy !== null
    && asset.provenance.approvedAt !== null;
  if ((asset.provenance.approvedBy === null) !== (asset.provenance.approvedAt === null)) {
    throw new RangeError(`Arena V2来源批准人和日期必须同时存在或同时缺失：${asset.assetId}。`);
  }
  return Object.freeze({
    catalogContentHash: ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.contentHash,
    budgetPolicyIdentity: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY,
    assetId: asset.assetId,
    artifactPath: asset.artifactPath,
    kind: budget.kind,
    byteLength: asset.byteLength,
    sha256: asset.sha256,
    maturity: asset.maturity,
    sourceEvidence: Object.freeze({
      sourceLocator: asset.provenance.sourceLocator,
      sourceRevision: asset.provenance.sourceRevision,
      licenseId: asset.provenance.licenseId,
      rightsHolder: asset.provenance.rightsHolder,
      proofDocument: asset.provenance.proofDocument,
      sourceApproverId: asset.provenance.approvedBy,
      sourceApprovedAt: asset.provenance.approvedAt,
    }),
    sourceApprovalRecorded,
    productionApprovalStatus: 'missing-not-approved' as const,
    budgetCandidateCovered: true as const,
    assetUsePermitted: false as const,
    formalReady: false as const,
    requiredEvidenceSlots: EMPTY_EVIDENCE_SLOTS,
    gapReasonIds: GAP_REASON_IDS,
  });
}));

if (BUDGET_ARTIFACT_BY_ID.size !== CANONICAL_ENTRIES.length) {
  throw new RangeError('Arena V2逐资产批准账本拒绝V2预算未知项或漏项。');
}

function parsePolicyIdentity(value: unknown, name: string) {
  const source = dataRecord(value, POLICY_IDENTITY_KEYS, name);
  const expected = ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY;
  if (
    source.policyId !== expected.policyId
    || source.policyContentHash !== expected.policyContentHash
    || source.artifactCount !== expected.artifactCount
    || source.status !== expected.status
    || source.implementationStatus !== expected.implementationStatus
    || source.validationStatus !== expected.validationStatus
    || source.approvalStatus !== expected.approvalStatus
    || source.hardGateUsable !== expected.hardGateUsable
  ) throw new RangeError(`${name}与V2预算候选身份漂移。`);
  return Object.freeze({ ...expected });
}

function parseStringTuple(
  value: unknown,
  expected: readonly string[],
  name: string,
): readonly string[] {
  const values = denseDataArray(value, name);
  if (
    values.length !== expected.length
    || values.some((item, index) => item !== expected[index])
  ) throw new RangeError(`${name}必须与规范顺序逐项一致。`);
  return Object.freeze(expected.slice());
}

function parseEvidenceSlots(value: unknown, name: string) {
  const values = denseDataArray(value, name);
  if (values.length !== EMPTY_EVIDENCE_SLOTS.length) {
    throw new RangeError(`${name}必须精确包含全部生产批准证据槽。`);
  }
  return Object.freeze(values.map((raw, index) => {
    const source = dataRecord(raw, EVIDENCE_SLOT_KEYS, `${name}[${index}]`);
    const expected = EMPTY_EVIDENCE_SLOTS[index]!;
    if (
      source.slotId !== expected.slotId
      || source.status !== 'missing'
      || source.evidenceIdentity !== null
      || source.reviewerId !== null
      || source.reviewedAt !== null
    ) throw new RangeError(`${name}[${index}]不得伪造生产批准证据。`);
    return Object.freeze({ ...expected });
  }));
}

function parseEntry(value: unknown, expected: (typeof CANONICAL_ENTRIES)[number], index: number) {
  const name = `Arena V2逐资产批准账本entries[${index}]`;
  const source = dataRecord(value, ENTRY_KEYS, name);
  const sourceEvidence = dataRecord(
    source.sourceEvidence,
    SOURCE_EVIDENCE_KEYS,
    `${name}.sourceEvidence`,
  );
  const expectedSource = expected.sourceEvidence;
  if (
    source.catalogContentHash !== expected.catalogContentHash
    || source.assetId !== expected.assetId
    || source.artifactPath !== expected.artifactPath
    || source.kind !== expected.kind
    || source.byteLength !== expected.byteLength
    || source.sha256 !== expected.sha256
    || source.maturity !== expected.maturity
    || source.sourceApprovalRecorded !== expected.sourceApprovalRecorded
    || source.productionApprovalStatus !== 'missing-not-approved'
    || source.budgetCandidateCovered !== true
    || source.assetUsePermitted !== false
    || source.formalReady !== false
    || sourceEvidence.sourceLocator !== expectedSource.sourceLocator
    || sourceEvidence.sourceRevision !== expectedSource.sourceRevision
    || sourceEvidence.licenseId !== expectedSource.licenseId
    || sourceEvidence.rightsHolder !== expectedSource.rightsHolder
    || sourceEvidence.proofDocument !== expectedSource.proofDocument
    || sourceEvidence.sourceApproverId !== expectedSource.sourceApproverId
    || sourceEvidence.sourceApprovedAt !== expectedSource.sourceApprovedAt
  ) throw new RangeError(`${name}与当前Catalog或缺失批准事实漂移。`);
  nonEmptyString(source.assetId, `${name}.assetId`);
  nonEmptyString(source.artifactPath, `${name}.artifactPath`);
  safePositiveInteger(source.byteLength, `${name}.byteLength`);
  if (typeof source.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(source.sha256)) {
    throw new RangeError(`${name}.sha256必须是小写64位SHA-256。`);
  }
  const parsedSourceEvidence = Object.freeze({
    sourceLocator: nonEmptyString(sourceEvidence.sourceLocator, `${name}.sourceLocator`),
    sourceRevision: nonEmptyString(sourceEvidence.sourceRevision, `${name}.sourceRevision`),
    licenseId: nonEmptyString(sourceEvidence.licenseId, `${name}.licenseId`),
    rightsHolder: nonEmptyString(sourceEvidence.rightsHolder, `${name}.rightsHolder`),
    proofDocument: nonEmptyString(sourceEvidence.proofDocument, `${name}.proofDocument`),
    sourceApproverId: sourceEvidence.sourceApproverId as string | null,
    sourceApprovedAt: sourceEvidence.sourceApprovedAt as string | null,
  });
  return Object.freeze({
    catalogContentHash: expected.catalogContentHash,
    budgetPolicyIdentity: parsePolicyIdentity(
      source.budgetPolicyIdentity,
      `${name}.budgetPolicyIdentity`,
    ),
    assetId: expected.assetId,
    artifactPath: expected.artifactPath,
    kind: expected.kind,
    byteLength: expected.byteLength,
    sha256: expected.sha256,
    maturity: expected.maturity,
    sourceEvidence: parsedSourceEvidence,
    sourceApprovalRecorded: expected.sourceApprovalRecorded,
    productionApprovalStatus: 'missing-not-approved' as const,
    budgetCandidateCovered: true as const,
    assetUsePermitted: false as const,
    formalReady: false as const,
    requiredEvidenceSlots: parseEvidenceSlots(
      source.requiredEvidenceSlots,
      `${name}.requiredEvidenceSlots`,
    ),
    gapReasonIds: parseStringTuple(source.gapReasonIds, GAP_REASON_IDS, `${name}.gapReasonIds`),
  });
}

export const ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_INPUT =
  Object.freeze({
    schemaVersion:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_SCHEMA_VERSION,
    id: ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_ID,
    contentVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    grantsApproval: false as const,
    hardGate: false as const,
    assetUsePermitted: false as const,
    formalReady: false as const,
    defaultFormalBundleConsumes: false as const,
    defaultPreloaderConsumes: false as const,
    defaultEntryConsumes: false as const,
    participatesInGameplayAuthority: false as const,
    createsOrModifiesAssets: false as const,
    loadsAssets: false as const,
    p7AdvanceComputedHere: false as const,
    catalogContentHash: ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.contentHash,
    budgetPolicyIdentity: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY,
    requiredEvidenceSlotIds:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_REQUIRED_EVIDENCE_SLOT_IDS_V1,
    entries: CANONICAL_ENTRIES,
  });

export function createArenaV2A3A6ProductionApprovalEvidenceLedgerCandidateV1(value: unknown) {
  const source = dataRecord(value, ROOT_KEYS, 'Arena V2逐资产生产批准证据账本候选V1');
  if (
    source.schemaVersion
      !== ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_SCHEMA_VERSION
    || source.id !== ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_ID
    || source.contentVersion !== 1
    || source.status !== 'production-unreachable'
    || source.implementationStatus !== 'code-written-not-run'
    || source.validationStatus !== 'not-run'
    || source.grantsApproval !== false
    || source.hardGate !== false
    || source.assetUsePermitted !== false
    || source.formalReady !== false
    || source.defaultFormalBundleConsumes !== false
    || source.defaultPreloaderConsumes !== false
    || source.defaultEntryConsumes !== false
    || source.participatesInGameplayAuthority !== false
    || source.createsOrModifiesAssets !== false
    || source.loadsAssets !== false
    || source.p7AdvanceComputedHere !== false
    || source.catalogContentHash
      !== ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.contentHash
  ) throw new RangeError('Arena V2逐资产生产批准证据账本治理或Catalog身份漂移。');
  const entriesInput = denseDataArray(source.entries, 'Arena V2逐资产批准账本entries');
  if (entriesInput.length !== CANONICAL_ENTRIES.length) {
    throw new RangeError('Arena V2逐资产批准账本必须精确包含130项。');
  }
  const entries = Object.freeze(entriesInput.map((entry, index) => (
    parseEntry(entry, CANONICAL_ENTRIES[index]!, index)
  )));
  const ids = new Set<string>();
  const paths = new Set<string>();
  let previousId: string | null = null;
  for (const entry of entries) {
    if (
      ids.has(entry.assetId)
      || paths.has(entry.artifactPath)
      || (previousId !== null && compareText(previousId, entry.assetId) >= 0)
    ) throw new RangeError(`Arena V2逐资产批准账本重复或排序错误：${entry.assetId}。`);
    ids.add(entry.assetId);
    paths.add(entry.artifactPath);
    previousId = entry.assetId;
  }
  const core = Object.freeze({
    schemaVersion:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_SCHEMA_VERSION,
    id: ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_ID,
    contentVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    grantsApproval: false as const,
    hardGate: false as const,
    assetUsePermitted: false as const,
    formalReady: false as const,
    defaultFormalBundleConsumes: false as const,
    defaultPreloaderConsumes: false as const,
    defaultEntryConsumes: false as const,
    participatesInGameplayAuthority: false as const,
    createsOrModifiesAssets: false as const,
    loadsAssets: false as const,
    p7AdvanceComputedHere: false as const,
    catalogContentHash:
      ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.contentHash,
    budgetPolicyIdentity: parsePolicyIdentity(
      source.budgetPolicyIdentity,
      'Arena V2逐资产批准账本budgetPolicyIdentity',
    ),
    requiredEvidenceSlotIds: parseStringTuple(
      source.requiredEvidenceSlotIds,
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_REQUIRED_EVIDENCE_SLOT_IDS_V1,
      'Arena V2逐资产批准账本requiredEvidenceSlotIds',
    ),
    entries,
    summary: Object.freeze({
      assetCount: entries.length,
      sourceApprovalRecordedAssetCount:
        entries.filter(({ sourceApprovalRecorded }) => sourceApprovalRecorded).length,
      productionApprovedAssetCount: 0 as const,
      productionApprovalMissingAssetCount: entries.length,
      budgetCandidateCoveredAssetCount:
        entries.filter(({ budgetCandidateCovered }) => budgetCandidateCovered).length,
      assetUsePermittedCount: 0 as const,
      formalReadyAssetCount: 0 as const,
      requiredEvidenceSlotCountPerAsset: EMPTY_EVIDENCE_SLOTS.length,
      missingEvidenceSlotCount: entries.length * EMPTY_EVIDENCE_SLOTS.length,
    }),
  });
  return Object.freeze({
    ...core,
    contentHash: createDeterministicDataHash(
      core,
      'Arena V2 A3-A6 production approval evidence ledger candidate V1',
    ),
  });
}

export const ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1 =
  createArenaV2A3A6ProductionApprovalEvidenceLedgerCandidateV1(
    ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_INPUT,
  );

export const ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY =
  Object.freeze({
    ledgerId: ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.id,
    contentHash: ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.contentHash,
    catalogContentHash:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.catalogContentHash,
    budgetPolicyIdentity:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1
        .budgetPolicyIdentity,
    assetCount:
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.summary.assetCount,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    grantsApproval: false as const,
    hardGate: false as const,
  });

export type ArenaV2A3A6ProductionApprovalEvidenceLedgerCandidateV1 =
  typeof ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1;
