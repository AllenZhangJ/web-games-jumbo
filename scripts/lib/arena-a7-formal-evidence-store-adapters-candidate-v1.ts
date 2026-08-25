import { createHash } from 'node:crypto';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  assertIntegerAtLeast,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceSha256,
  assertEvidenceUtcInstant,
} from '@number-strategy-jump/arena-evidence-contracts';
import {
  assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1,
} from '../../packages/arena-release/src/arena-v2-a7-formal-budget-evidence-value-candidate-v1.js';
import {
  assertArenaV2A7FormalEvidenceLocatorCandidateV3,
  assertArenaV2A7FormalEvidenceMediaTypeCandidateV3,
  validateArenaV2A7FormalEvidenceRecordIndexCandidateV3,
} from '../../packages/arena-release/src/arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v3.js';
import {
  ARENA_V2_A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_CANDIDATE_V1_SCHEMA_VERSION,
} from '../../packages/arena-release/src/arena-v2-a7-formal-evidence-retrieval-verifier-candidate-v1.js';
import type {
  ArenaV2A7FormalEvidenceReadRequestCandidateV1,
  ArenaV2A7FormalEvidenceReaderCandidateV1,
  ArenaV2A7FormalEvidenceSha256RequestCandidateV1,
  ArenaV2A7FormalEvidenceSha256HasherCandidateV1,
  ArenaV2A7FormalEvidenceVerificationPayloadCandidateV1,
  ArenaV2A7FormalEvidenceVerificationReceiptWriterCandidateV1,
} from '../../packages/arena-release/src/arena-v2-a7-formal-evidence-retrieval-verifier-candidate-v1.js';
import {
  writeArenaEvidenceDirectoryExclusive,
  type ArenaAtomicEvidenceDirectoryEntry,
} from './arena-atomic-evidence-directory.js';
import {
  readVerifiedEvidenceArtifact,
  readVerifiedEvidenceArtifactBytes,
  resolveEvidenceRoot,
} from './evidence-file-verifier.js';

export const ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTERS_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;
export const ARENA_V2_A7_FORMAL_EVIDENCE_STORE_SNAPSHOT_MANIFEST_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;
const DETERMINISTIC_IDENTITY_HASH_PATTERN = /^[0-9a-f]{8}$/u;

function assertDeterministicIdentityHash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !DETERMINISTIC_IDENTITY_HASH_PATTERN.test(value)) {
    throw new TypeError(`${name}必须是8位小写确定性身份hash。`);
  }
  return value;
}
export const ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTER_IDS_CANDIDATE_V1 = Object.freeze({
  retrievalAdapterId: 'node-evidence-store-reader-v1' as const,
  sha256AdapterId: 'node-sha256-hasher-v1' as const,
  receiptWriterAdapterId: 'node-receipt-writer-v1' as const,
});

export interface ArenaV2A7FormalEvidenceStoreSnapshotManifestInputCandidateV1 {
  readonly schemaVersion: 1;
  readonly snapshotId: string;
  readonly snapshotRevision: string;
  readonly createdAtUtc: string;
  readonly formalEvidenceRecordIndexIdentityHash: string;
  readonly formalEvidenceRecordCount: number;
}

export interface ArenaV2A7FormalEvidenceStoreAdaptersOptionsCandidateV1 {
  readonly evidenceRoot: string;
  readonly maximumEvidenceBytesPerRecord: number;
  readonly expectedEvidenceStoreSnapshotIdentityHash: string;
}

export interface ArenaV2A7FormalEvidenceStoreAdaptersCandidateV1 {
  readonly retrievalAdapterId:
  typeof ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTER_IDS_CANDIDATE_V1.retrievalAdapterId;
  readonly sha256AdapterId:
  typeof ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTER_IDS_CANDIDATE_V1.sha256AdapterId;
  readonly receiptWriterAdapterId:
  typeof ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTER_IDS_CANDIDATE_V1.receiptWriterAdapterId;
  readonly evidenceReader: ArenaV2A7FormalEvidenceReaderCandidateV1;
  readonly sha256Hasher: ArenaV2A7FormalEvidenceSha256HasherCandidateV1;
  readonly verificationReceiptWriter:
  ArenaV2A7FormalEvidenceVerificationReceiptWriterCandidateV1;
}

export interface ArenaV2A7FormalEvidenceMetadataSidecarCandidateV1 {
  readonly schemaVersion: 1;
  readonly recordId: string;
  readonly evidenceLocator: string;
  readonly evidenceMediaType: string;
  readonly evidenceRecordedAtUtc: string;
  readonly evidenceProducerId: string;
}

export interface ArenaV2A7FormalEvidenceVerificationReceiptCandidateV1 {
  readonly schemaVersion: 1;
  readonly verificationSessionIdentityHash: string;
  readonly retrievalPlanIdentityHash: string;
  readonly recordIndexIdentityHash: string;
  readonly storeSnapshotIdentityHash: string;
  readonly verificationPayload:
  ArenaV2A7FormalEvidenceVerificationPayloadCandidateV1;
  readonly verificationPayloadIdentityHash: string;
}

interface ReceiptReadbackExpectationCandidateV1 {
  readonly fileName: string;
  readonly receiptBytes: Buffer;
  readonly receiptSha256: string;
  readonly metadataBytes: Buffer;
  readonly metadataSha256: string;
}

interface EvidenceRootDirectoryIdentityCandidateV1 {
  readonly resolvedPath: string;
  readonly device: bigint;
  readonly inode: bigint;
}

const OPTION_KEYS = new Set([
  'evidenceRoot',
  'maximumEvidenceBytesPerRecord',
  'expectedEvidenceStoreSnapshotIdentityHash',
]);
const STORE_SNAPSHOT_INPUT_KEYS = new Set([
  'schemaVersion',
  'snapshotId',
  'snapshotRevision',
  'createdAtUtc',
  'formalEvidenceRecordIndexIdentityHash',
  'formalEvidenceRecordCount',
]);
const STORE_SNAPSHOT_STORED_KEYS = new Set([
  ...STORE_SNAPSHOT_INPUT_KEYS,
  'snapshotIdentityHash',
]);
const METADATA_KEYS = new Set([
  'schemaVersion',
  'recordId',
  'evidenceLocator',
  'evidenceMediaType',
  'evidenceRecordedAtUtc',
  'evidenceProducerId',
]);
const READ_REQUEST_KEYS = new Set([
  'schemaVersion',
  'verificationSessionIdentityHash',
  'retrievalPlanIdentityHash',
  'recordIndexIdentityHash',
  'storeSnapshotIdentityHash',
  'recordIndex',
  'recordCount',
  'expectedRecord',
  'retrievalAdapterId',
]);
const SHA256_REQUEST_KEYS = new Set([
  'schemaVersion',
  'verificationSessionIdentityHash',
  'retrievalPlanIdentityHash',
  'recordIndexIdentityHash',
  'storeSnapshotIdentityHash',
  'recordId',
  'evidenceLocator',
  'sha256AdapterId',
  'bytes',
]);
const WRITE_REQUEST_KEYS = new Set([
  'schemaVersion',
  'verificationSessionIdentityHash',
  'retrievalPlanIdentityHash',
  'recordIndexIdentityHash',
  'storeSnapshotIdentityHash',
  'receiptWriterAdapterId',
  'receipts',
]);
const WRITE_ITEM_KEYS = new Set([
  'recordIndex',
  'recordCount',
  'verificationPayload',
  'verificationPayloadIdentityHash',
]);
const VERIFICATION_PAYLOAD_KEYS = new Set([
  'schemaVersion',
  'verificationSessionIdentityHash',
  'retrievalPlanIdentityHash',
  'recordIndexIdentityHash',
  'storeSnapshotIdentityHash',
  'recordId',
  'verifiedEvidenceLocator',
  'verifiedEvidenceMediaType',
  'verifiedEvidenceByteLength',
  'verifiedEvidenceRecordedAtUtc',
  'verifiedEvidenceProducerId',
  'verifiedEvidenceSha256',
  'verifierId',
  'verifiedAtUtc',
  'retrievalAdapterId',
  'sha256AdapterId',
  'receiptWriterAdapterId',
]);
const VERIFICATION_RECEIPT_KEYS = new Set([
  'schemaVersion',
  'verificationSessionIdentityHash',
  'retrievalPlanIdentityHash',
  'recordIndexIdentityHash',
  'storeSnapshotIdentityHash',
  'verificationPayload',
  'verificationPayloadIdentityHash',
]);
const MAXIMUM_METADATA_BYTES = 64 * 1_024;
const EVIDENCE_LOCATOR_SCHEME_PREFIX = 'evidence://' as const;
const STORE_SNAPSHOT_RELATIVE_PATH = 'arena-v2/store-snapshot.json' as const;

async function readDirectoryIdentity(
  directoryPath: string,
  name: string,
): Promise<Readonly<EvidenceRootDirectoryIdentityCandidateV1>> {
  const resolvedPath = await resolveEvidenceRoot(directoryPath);
  const before = await stat(resolvedPath, { bigint: true });
  if (!before.isDirectory()) throw new TypeError(`${name}必须是目录。`);
  const resolvedAfterStat = await resolveEvidenceRoot(directoryPath);
  const after = await stat(resolvedAfterStat, { bigint: true });
  if (
    !after.isDirectory()
    || resolvedAfterStat !== resolvedPath
    || after.dev !== before.dev
    || after.ino !== before.ino
  ) throw new Error(`${name}在身份捕获期间发生漂移。`);
  return Object.freeze({
    resolvedPath,
    device: before.dev,
    inode: before.ino,
  });
}

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  const actualKeys = Reflect.ownKeys(value);
  if (
    actualKeys.some((key) => typeof key !== 'string')
    || actualKeys.length !== keys.size
    || (actualKeys as string[]).some((key) => !keys.has(key))
  ) throw new TypeError(`${name}字段集合不匹配。`);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
}

function evidenceReadRequest(
  value: unknown,
): Readonly<ArenaV2A7FormalEvidenceReadRequestCandidateV1> {
  const name = 'A7 Evidence Store Reader request';
  const source = cloneFrozenData(value, name);
  exactRecord(source, READ_REQUEST_KEYS, name);
  if (source.schemaVersion !== 1) throw new RangeError(`${name}.schemaVersion必须为1。`);
  const recordIndex = assertIntegerAtLeast(source.recordIndex, 0, `${name}.recordIndex`);
  const recordCount = assertIntegerAtLeast(source.recordCount, 1, `${name}.recordCount`);
  if (
    !Number.isSafeInteger(recordIndex)
    || !Number.isSafeInteger(recordCount)
    || recordCount > 583
    || recordIndex >= recordCount
  ) throw new RangeError(`${name} index/count无效。`);
  const expectedRecord = validateArenaV2A7FormalEvidenceRecordIndexCandidateV3(
    Object.freeze([source.expectedRecord]),
  )[0]!;
  const retrievalAdapterId =
    assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
      source.retrievalAdapterId,
      `${name}.retrievalAdapterId`,
    );
  if (
    retrievalAdapterId
      !== ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTER_IDS_CANDIDATE_V1.retrievalAdapterId
  ) throw new RangeError('A7 Evidence Store Reader Adapter ID发生漂移。');
  return Object.freeze({
    schemaVersion: 1,
    verificationSessionIdentityHash: assertDeterministicIdentityHash(
      source.verificationSessionIdentityHash,
      `${name}.verificationSessionIdentityHash`,
    ),
    retrievalPlanIdentityHash: assertDeterministicIdentityHash(
      source.retrievalPlanIdentityHash,
      `${name}.retrievalPlanIdentityHash`,
    ),
    recordIndexIdentityHash: assertDeterministicIdentityHash(
      source.recordIndexIdentityHash,
      `${name}.recordIndexIdentityHash`,
    ),
    storeSnapshotIdentityHash: assertEvidenceSha256(
      source.storeSnapshotIdentityHash,
      `${name}.storeSnapshotIdentityHash`,
    ),
    recordIndex,
    recordCount,
    expectedRecord,
    retrievalAdapterId,
  });
}

function evidenceSha256Request(
  value: unknown,
  maximumEvidenceBytesPerRecord: number,
): Readonly<ArenaV2A7FormalEvidenceSha256RequestCandidateV1> {
  const name = 'A7 Evidence Store Hasher request';
  exactRecord(value, SHA256_REQUEST_KEYS, name);
  if (value.schemaVersion !== 1) throw new RangeError(`${name}.schemaVersion必须为1。`);
  const sha256AdapterId = assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
    value.sha256AdapterId,
    `${name}.sha256AdapterId`,
  );
  if (
    sha256AdapterId
      !== ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTER_IDS_CANDIDATE_V1.sha256AdapterId
  ) throw new RangeError('A7 Evidence Store Hasher Adapter ID发生漂移。');
  if (!(value.bytes instanceof Uint8Array) || !(value.bytes.buffer instanceof ArrayBuffer)) {
    throw new TypeError(`${name}.bytes必须是非共享Uint8Array。`);
  }
  if (value.bytes.byteLength === 0 || value.bytes.byteLength > maximumEvidenceBytesPerRecord) {
    throw new RangeError(`${name}.bytes超出显式单记录边界。`);
  }
  const bytes = new Uint8Array(value.bytes.byteLength);
  bytes.set(value.bytes);
  return Object.freeze({
    schemaVersion: 1,
    verificationSessionIdentityHash: assertDeterministicIdentityHash(
      value.verificationSessionIdentityHash,
      `${name}.verificationSessionIdentityHash`,
    ),
    retrievalPlanIdentityHash: assertDeterministicIdentityHash(
      value.retrievalPlanIdentityHash,
      `${name}.retrievalPlanIdentityHash`,
    ),
    recordIndexIdentityHash: assertDeterministicIdentityHash(
      value.recordIndexIdentityHash,
      `${name}.recordIndexIdentityHash`,
    ),
    storeSnapshotIdentityHash: assertEvidenceSha256(
      value.storeSnapshotIdentityHash,
      `${name}.storeSnapshotIdentityHash`,
    ),
    recordId: assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
      value.recordId,
      `${name}.recordId`,
    ),
    evidenceLocator: assertArenaV2A7FormalEvidenceLocatorCandidateV3(
      value.evidenceLocator,
      `${name}.evidenceLocator`,
    ),
    sha256AdapterId,
    bytes,
  });
}

function locatorRelativePath(locatorValue: unknown, name: string): string {
  const locator = assertArenaV2A7FormalEvidenceLocatorCandidateV3(locatorValue, name);
  const relativePath = locator.slice(EVIDENCE_LOCATOR_SCHEME_PREFIX.length);
  if (
    relativePath.length === 0
    || relativePath.includes('\\')
    || relativePath.includes('\0')
    || path.isAbsolute(relativePath)
  ) throw new RangeError(`${name}无法映射为Evidence Store相对路径。`);
  return relativePath;
}

function parseMetadataSidecar(
  text: string,
  name: string,
): Readonly<ArenaV2A7FormalEvidenceMetadataSidecarCandidateV1> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    throw new SyntaxError(`${name}不是合法JSON。`, { cause: error });
  }
  return validateArenaV2A7FormalEvidenceMetadataSidecarCandidateV1(parsed, name);
}

export function validateArenaV2A7FormalEvidenceMetadataSidecarCandidateV1(
  value: unknown,
  name = 'A7 Evidence metadata sidecar',
): Readonly<ArenaV2A7FormalEvidenceMetadataSidecarCandidateV1> {
  const source = cloneFrozenData(value, name);
  exactRecord(source, METADATA_KEYS, name);
  if (source.schemaVersion !== 1) throw new RangeError(`${name}.schemaVersion必须为1。`);
  return Object.freeze({
    schemaVersion: 1,
    recordId: assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
      source.recordId,
      `${name}.recordId`,
    ),
    evidenceLocator: assertArenaV2A7FormalEvidenceLocatorCandidateV3(
      source.evidenceLocator,
      `${name}.evidenceLocator`,
    ),
    evidenceMediaType: assertArenaV2A7FormalEvidenceMediaTypeCandidateV3(
      source.evidenceMediaType,
      `${name}.evidenceMediaType`,
    ),
    evidenceRecordedAtUtc: assertEvidenceUtcInstant(
      source.evidenceRecordedAtUtc,
      `${name}.evidenceRecordedAtUtc`,
    ),
    evidenceProducerId: assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
      source.evidenceProducerId,
      `${name}.evidenceProducerId`,
    ),
  });
}

export function serializeArenaV2A7FormalEvidenceMetadataSidecarCandidateV1(
  value: unknown,
): string {
  const canonical = validateArenaV2A7FormalEvidenceMetadataSidecarCandidateV1(value);
  return canonicalReceiptJson(
    canonical,
    'A7 canonical Evidence metadata sidecar',
  ).toString('utf8');
}

function verificationPayload(
  value: unknown,
  name: string,
): Readonly<ArenaV2A7FormalEvidenceVerificationPayloadCandidateV1> {
  const source = cloneFrozenData(value, name);
  exactRecord(source, VERIFICATION_PAYLOAD_KEYS, name);
  if (source.schemaVersion !== 1) throw new RangeError(`${name}.schemaVersion必须为1。`);
  const verifiedEvidenceRecordedAtUtc = assertEvidenceUtcInstant(
    source.verifiedEvidenceRecordedAtUtc,
    `${name}.verifiedEvidenceRecordedAtUtc`,
  );
  const verifiedAtUtc = assertEvidenceUtcInstant(source.verifiedAtUtc, `${name}.verifiedAtUtc`);
  if (verifiedAtUtc < verifiedEvidenceRecordedAtUtc) {
    throw new RangeError(`${name}.verifiedAtUtc不得早于Evidence记录时间。`);
  }
  const verifiedEvidenceByteLength = assertIntegerAtLeast(
    source.verifiedEvidenceByteLength,
    1,
    `${name}.verifiedEvidenceByteLength`,
  );
  if (!Number.isSafeInteger(verifiedEvidenceByteLength)) {
    throw new RangeError(`${name}.verifiedEvidenceByteLength必须是安全整数。`);
  }
  const retrievalAdapterId = assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
    source.retrievalAdapterId,
    `${name}.retrievalAdapterId`,
  );
  const sha256AdapterId = assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
    source.sha256AdapterId,
    `${name}.sha256AdapterId`,
  );
  const receiptWriterAdapterId = assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
    source.receiptWriterAdapterId,
    `${name}.receiptWriterAdapterId`,
  );
  if (
    retrievalAdapterId
      !== ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTER_IDS_CANDIDATE_V1.retrievalAdapterId
    || sha256AdapterId
      !== ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTER_IDS_CANDIDATE_V1.sha256AdapterId
    || receiptWriterAdapterId
      !== ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTER_IDS_CANDIDATE_V1.receiptWriterAdapterId
  ) throw new RangeError(`${name} Adapter ID发生漂移。`);
  return Object.freeze({
    schemaVersion: 1,
    verificationSessionIdentityHash: assertDeterministicIdentityHash(
      source.verificationSessionIdentityHash,
      `${name}.verificationSessionIdentityHash`,
    ),
    retrievalPlanIdentityHash: assertDeterministicIdentityHash(
      source.retrievalPlanIdentityHash,
      `${name}.retrievalPlanIdentityHash`,
    ),
    recordIndexIdentityHash: assertDeterministicIdentityHash(
      source.recordIndexIdentityHash,
      `${name}.recordIndexIdentityHash`,
    ),
    storeSnapshotIdentityHash: assertEvidenceSha256(
      source.storeSnapshotIdentityHash,
      `${name}.storeSnapshotIdentityHash`,
    ),
    recordId: assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
      source.recordId,
      `${name}.recordId`,
    ),
    verifiedEvidenceLocator: assertArenaV2A7FormalEvidenceLocatorCandidateV3(
      source.verifiedEvidenceLocator,
      `${name}.verifiedEvidenceLocator`,
    ),
    verifiedEvidenceMediaType: assertArenaV2A7FormalEvidenceMediaTypeCandidateV3(
      source.verifiedEvidenceMediaType,
      `${name}.verifiedEvidenceMediaType`,
    ),
    verifiedEvidenceByteLength,
    verifiedEvidenceRecordedAtUtc,
    verifiedEvidenceProducerId:
      assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
        source.verifiedEvidenceProducerId,
        `${name}.verifiedEvidenceProducerId`,
      ),
    verifiedEvidenceSha256: assertEvidenceSha256(
      source.verifiedEvidenceSha256,
      `${name}.verifiedEvidenceSha256`,
    ),
    verifierId: assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
      source.verifierId,
      `${name}.verifierId`,
    ),
    verifiedAtUtc,
    retrievalAdapterId,
    sha256AdapterId,
    receiptWriterAdapterId,
  });
}

function assertPathWithinRoot(root: string, candidate: string, name: string): void {
  const relative = path.relative(root, candidate);
  if (
    relative === ''
    || relative === '..'
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) throw new RangeError(`${name}逃逸Evidence Store根目录。`);
}

function canonicalReceiptJson(value: unknown, name: string): Buffer {
  const source = cloneFrozenData(value, name);
  const json = JSON.stringify(source);
  if (typeof json !== 'string') throw new TypeError(`${name}无法序列化。`);
  return Buffer.from(`${json}\n`, 'utf8');
}

export function serializeArenaV2A7FormalEvidenceVerificationReceiptCandidateV1(
  value: unknown,
): string {
  const name = 'A7 canonical Evidence verification receipt';
  const source = cloneFrozenData(value, name);
  exactRecord(source, VERIFICATION_RECEIPT_KEYS, name);
  if (
    source.schemaVersion
      !== ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTERS_CANDIDATE_V1_SCHEMA_VERSION
  ) throw new RangeError(`${name}.schemaVersion必须为1。`);
  const verificationSessionIdentityHash = assertDeterministicIdentityHash(
    source.verificationSessionIdentityHash,
    `${name}.verificationSessionIdentityHash`,
  );
  const retrievalPlanIdentityHash = assertDeterministicIdentityHash(
    source.retrievalPlanIdentityHash,
    `${name}.retrievalPlanIdentityHash`,
  );
  const recordIndexIdentityHash = assertDeterministicIdentityHash(
    source.recordIndexIdentityHash,
    `${name}.recordIndexIdentityHash`,
  );
  const storeSnapshotIdentityHash = assertEvidenceSha256(
    source.storeSnapshotIdentityHash,
    `${name}.storeSnapshotIdentityHash`,
  );
  const payload = verificationPayload(
    source.verificationPayload,
    `${name}.verificationPayload`,
  );
  const verificationPayloadIdentityHash = assertDeterministicIdentityHash(
    source.verificationPayloadIdentityHash,
    `${name}.verificationPayloadIdentityHash`,
  );
  const expectedPayloadIdentityHash = createDeterministicDataHash(
    payload,
    `Arena V2 A7 formal Evidence verification payload ${payload.recordId}`,
  );
  if (
    verificationPayloadIdentityHash !== expectedPayloadIdentityHash
    || payload.verificationSessionIdentityHash !== verificationSessionIdentityHash
    || payload.retrievalPlanIdentityHash !== retrievalPlanIdentityHash
    || payload.recordIndexIdentityHash !== recordIndexIdentityHash
    || payload.storeSnapshotIdentityHash !== storeSnapshotIdentityHash
  ) throw new RangeError(`${name}外层身份与Payload不闭合。`);
  return canonicalReceiptJson(Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTERS_CANDIDATE_V1_SCHEMA_VERSION,
    verificationSessionIdentityHash,
    retrievalPlanIdentityHash,
    recordIndexIdentityHash,
    storeSnapshotIdentityHash,
    verificationPayload: payload,
    verificationPayloadIdentityHash,
  }), name).toString('utf8');
}

export function createArenaV2A7FormalEvidenceStoreSnapshotManifestCandidateV1(
  value: unknown,
) {
  const source = cloneFrozenData(value, 'A7 Evidence Store Snapshot Manifest input');
  exactRecord(source, STORE_SNAPSHOT_INPUT_KEYS, 'A7 Evidence Store Snapshot Manifest input');
  if (
    source.schemaVersion
      !== ARENA_V2_A7_FORMAL_EVIDENCE_STORE_SNAPSHOT_MANIFEST_CANDIDATE_V1_SCHEMA_VERSION
  ) throw new RangeError('A7 Evidence Store Snapshot Manifest schemaVersion必须为1。');
  const formalEvidenceRecordCount = assertIntegerAtLeast(
    source.formalEvidenceRecordCount,
    1,
    'A7 Evidence Store Snapshot Manifest formalEvidenceRecordCount',
  );
  if (!Number.isSafeInteger(formalEvidenceRecordCount) || formalEvidenceRecordCount > 583) {
    throw new RangeError('A7 Evidence Store Snapshot Manifest记录数无效。');
  }
  const core = Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_EVIDENCE_STORE_SNAPSHOT_MANIFEST_CANDIDATE_V1_SCHEMA_VERSION,
    snapshotId: assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
      source.snapshotId,
      'A7 Evidence Store Snapshot Manifest snapshotId',
    ),
    snapshotRevision: assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
      source.snapshotRevision,
      'A7 Evidence Store Snapshot Manifest snapshotRevision',
    ),
    createdAtUtc: assertEvidenceUtcInstant(
      source.createdAtUtc,
      'A7 Evidence Store Snapshot Manifest createdAtUtc',
    ),
    formalEvidenceRecordIndexIdentityHash: assertDeterministicIdentityHash(
      source.formalEvidenceRecordIndexIdentityHash,
      'A7 Evidence Store Snapshot Manifest formalEvidenceRecordIndexIdentityHash',
    ),
    formalEvidenceRecordCount,
  });
  return Object.freeze({
    ...core,
    snapshotIdentityHash: createHash('sha256')
      .update(canonicalReceiptJson(core, 'Arena V2 A7 formal Evidence Store Snapshot Manifest core'))
      .digest('hex'),
  });
}

export function validateArenaV2A7FormalEvidenceStoreSnapshotManifestCandidateV1(
  value: unknown,
) {
  const source = cloneFrozenData(value, 'A7 stored Evidence Store Snapshot Manifest');
  exactRecord(
    source,
    STORE_SNAPSHOT_STORED_KEYS,
    'A7 stored Evidence Store Snapshot Manifest',
  );
  const canonical = createArenaV2A7FormalEvidenceStoreSnapshotManifestCandidateV1({
    schemaVersion: source.schemaVersion,
    snapshotId: source.snapshotId,
    snapshotRevision: source.snapshotRevision,
    createdAtUtc: source.createdAtUtc,
    formalEvidenceRecordIndexIdentityHash:
      source.formalEvidenceRecordIndexIdentityHash,
    formalEvidenceRecordCount: source.formalEvidenceRecordCount,
  });
  if (source.snapshotIdentityHash !== canonical.snapshotIdentityHash) {
    throw new RangeError('A7 Evidence Store Snapshot Manifest身份漂移。');
  }
  return canonical;
}

export function serializeArenaV2A7FormalEvidenceStoreSnapshotManifestCandidateV1(
  value: unknown,
): string {
  const canonical = validateArenaV2A7FormalEvidenceStoreSnapshotManifestCandidateV1(value);
  return canonicalReceiptJson(
    canonical,
    'A7 canonical Evidence Store Snapshot Manifest',
  ).toString('utf8');
}

async function readExpectedStoreSnapshot(
  root: string,
  expectedSnapshotIdentityHash: string,
  expectedRecordIndexIdentityHash: string,
  expectedRecordCount: number,
) {
  const snapshotFile = await readVerifiedEvidenceArtifact({
    root,
    relativePath: STORE_SNAPSHOT_RELATIVE_PATH,
    expectedByteLength: null,
    expectedSha256: null,
    maximumBytes: MAXIMUM_METADATA_BYTES,
    includeText: true,
    label: 'A7 Evidence Store Snapshot Manifest',
  });
  if (snapshotFile.text === null) {
    throw new Error('A7 Evidence Store Snapshot Manifest未返回文本。');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshotFile.text) as unknown;
  } catch (error) {
    throw new SyntaxError('A7 Evidence Store Snapshot Manifest不是合法JSON。', { cause: error });
  }
  const snapshot = validateArenaV2A7FormalEvidenceStoreSnapshotManifestCandidateV1(parsed);
  const canonicalSnapshotText =
    serializeArenaV2A7FormalEvidenceStoreSnapshotManifestCandidateV1(snapshot);
  const canonicalSnapshotBytes = Buffer.from(canonicalSnapshotText, 'utf8');
  const canonicalSnapshotSha256 = createHash('sha256')
    .update(canonicalSnapshotBytes)
    .digest('hex');
  if (
    snapshotFile.byteLength !== canonicalSnapshotBytes.byteLength
    || snapshotFile.sha256 !== canonicalSnapshotSha256
    || snapshotFile.text !== canonicalSnapshotText
  ) throw new RangeError('A7 Evidence Store Snapshot Manifest必须使用唯一规范字节。');
  if (
    snapshot.snapshotIdentityHash !== expectedSnapshotIdentityHash
    || snapshot.formalEvidenceRecordIndexIdentityHash
      !== expectedRecordIndexIdentityHash
    || snapshot.formalEvidenceRecordCount !== expectedRecordCount
  ) throw new RangeError('A7 Evidence Store Snapshot Manifest与检索请求身份漂移。');
  return snapshot;
}

export function createArenaV2A7FormalEvidenceStoreAdaptersCandidateV1(
  value: unknown,
): Readonly<ArenaV2A7FormalEvidenceStoreAdaptersCandidateV1> {
  const source = cloneFrozenData(value, 'A7 Evidence Store Adapter options');
  exactRecord(source, OPTION_KEYS, 'A7 Evidence Store Adapter options');
  if (typeof source.evidenceRoot !== 'string' || !path.isAbsolute(source.evidenceRoot)) {
    throw new TypeError('A7 Evidence Store Adapter evidenceRoot必须是绝对路径。');
  }
  const evidenceRoot = path.resolve(source.evidenceRoot);
  const maximumEvidenceBytesPerRecord = assertIntegerAtLeast(
    source.maximumEvidenceBytesPerRecord,
    1,
    'A7 Evidence Store Adapter maximumEvidenceBytesPerRecord',
  );
  if (!Number.isSafeInteger(maximumEvidenceBytesPerRecord)) {
    throw new RangeError('A7 Evidence Store Adapter单记录上限必须是安全整数。');
  }
  const expectedEvidenceStoreSnapshotIdentityHash = assertEvidenceSha256(
    source.expectedEvidenceStoreSnapshotIdentityHash,
    'A7 Evidence Store Adapter expectedEvidenceStoreSnapshotIdentityHash',
  );
  let pinnedEvidenceRootIdentity:
  Promise<Readonly<EvidenceRootDirectoryIdentityCandidateV1>> | null = null;
  let pinnedReceiptParentIdentity:
  Promise<Readonly<EvidenceRootDirectoryIdentityCandidateV1>> | null = null;
  const resolvePinnedEvidenceRoot = async (): Promise<string> => {
    pinnedEvidenceRootIdentity ??= readDirectoryIdentity(
      evidenceRoot,
      'A7 Evidence Store Root',
    );
    const expected = await pinnedEvidenceRootIdentity;
    const observed = await readDirectoryIdentity(evidenceRoot, 'A7 Evidence Store Root');
    if (
      observed.resolvedPath !== expected.resolvedPath
      || observed.device !== expected.device
      || observed.inode !== expected.inode
    ) throw new Error('A7 Evidence Store Root目录身份发生漂移。');
    return expected.resolvedPath;
  };
  const resolvePinnedReceiptParent = async (root: string): Promise<string> => {
    const receiptParent = path.join(root, 'arena-v2', 'a7', 'verification-receipts');
    pinnedReceiptParentIdentity ??= readDirectoryIdentity(
      receiptParent,
      'A7 Evidence Store Receipt Parent',
    );
    const expected = await pinnedReceiptParentIdentity;
    const observed = await readDirectoryIdentity(
      receiptParent,
      'A7 Evidence Store Receipt Parent',
    );
    if (
      observed.resolvedPath !== expected.resolvedPath
      || observed.device !== expected.device
      || observed.inode !== expected.inode
    ) throw new Error('A7 Evidence Store Receipt Parent目录身份发生漂移。');
    assertPathWithinRoot(root, expected.resolvedPath, 'A7 receipt parent');
    return expected.resolvedPath;
  };

  const evidenceReader: ArenaV2A7FormalEvidenceReaderCandidateV1 = async (request) => {
    const canonicalRequest = evidenceReadRequest(request);
    if (canonicalRequest.storeSnapshotIdentityHash !== expectedEvidenceStoreSnapshotIdentityHash) {
      throw new RangeError('A7 Evidence Store Reader Snapshot身份漂移。');
    }
    if (canonicalRequest.expectedRecord.evidenceByteLength > maximumEvidenceBytesPerRecord) {
      throw new RangeError(
        `A7 Evidence Store记录超过显式读取上限：${
          canonicalRequest.expectedRecord.recordId
        }。`,
      );
    }
    const root = await resolvePinnedEvidenceRoot();
    const storeSnapshot = await readExpectedStoreSnapshot(
      root,
      expectedEvidenceStoreSnapshotIdentityHash,
      canonicalRequest.recordIndexIdentityHash,
      canonicalRequest.recordCount,
    );
    if (storeSnapshot.createdAtUtc < canonicalRequest.expectedRecord.evidenceRecordedAtUtc) {
      throw new RangeError(
        `A7 Evidence Store Snapshot早于记录：${canonicalRequest.expectedRecord.recordId}。`,
      );
    }
    const relativePath = locatorRelativePath(
      canonicalRequest.expectedRecord.evidenceLocator,
      `A7 Evidence Store locator ${canonicalRequest.expectedRecord.recordId}`,
    );
    const metadataRelativePath = `${relativePath}.metadata.json`;
    const metadataFile = await readVerifiedEvidenceArtifact({
      root,
      relativePath: metadataRelativePath,
      expectedByteLength: null,
      expectedSha256: null,
      maximumBytes: MAXIMUM_METADATA_BYTES,
      includeText: true,
      label: `A7 Evidence metadata ${canonicalRequest.expectedRecord.recordId}`,
    });
    if (metadataFile.text === null) {
      throw new Error(
        `A7 Evidence metadata未返回文本：${canonicalRequest.expectedRecord.recordId}。`,
      );
    }
    const metadata = parseMetadataSidecar(
      metadataFile.text,
      `A7 Evidence metadata ${canonicalRequest.expectedRecord.recordId}`,
    );
    const canonicalMetadataText =
      serializeArenaV2A7FormalEvidenceMetadataSidecarCandidateV1(metadata);
    const canonicalMetadataBytes = Buffer.from(canonicalMetadataText, 'utf8');
    const canonicalMetadataSha256 = createHash('sha256')
      .update(canonicalMetadataBytes)
      .digest('hex');
    if (
      metadataFile.byteLength !== canonicalMetadataBytes.byteLength
      || metadataFile.sha256 !== canonicalMetadataSha256
      || metadataFile.text !== canonicalMetadataText
    ) throw new RangeError('A7 Evidence metadata sidecar必须使用唯一规范字节。');
    if (
      metadata.recordId !== canonicalRequest.expectedRecord.recordId
      || metadata.evidenceLocator !== canonicalRequest.expectedRecord.evidenceLocator
      || metadata.evidenceMediaType !== canonicalRequest.expectedRecord.evidenceMediaType
      || metadata.evidenceRecordedAtUtc
        !== canonicalRequest.expectedRecord.evidenceRecordedAtUtc
      || metadata.evidenceProducerId !== canonicalRequest.expectedRecord.evidenceProducerId
    ) throw new RangeError('A7 Evidence metadata sidecar与Expected Record身份漂移。');
    const evidenceFile = await readVerifiedEvidenceArtifactBytes({
      root,
      relativePath,
      expectedByteLength: canonicalRequest.expectedRecord.evidenceByteLength,
      expectedSha256: null,
      maximumBytes: maximumEvidenceBytesPerRecord,
      label: `A7 Evidence bytes ${canonicalRequest.expectedRecord.recordId}`,
    });
    const storeSnapshotAfterRead = await readExpectedStoreSnapshot(
      root,
      expectedEvidenceStoreSnapshotIdentityHash,
      canonicalRequest.recordIndexIdentityHash,
      canonicalRequest.recordCount,
    );
    if (
      storeSnapshotAfterRead.createdAtUtc
        < canonicalRequest.expectedRecord.evidenceRecordedAtUtc
    ) {
      throw new RangeError(
        `A7 Evidence Store Snapshot在记录返回前早于记录：${
          canonicalRequest.expectedRecord.recordId
        }。`,
      );
    }
    await resolvePinnedEvidenceRoot();
    return Object.freeze({
      recordId: metadata.recordId,
      evidenceLocator: metadata.evidenceLocator,
      evidenceMediaType: metadata.evidenceMediaType,
      evidenceRecordedAtUtc: metadata.evidenceRecordedAtUtc,
      evidenceProducerId: metadata.evidenceProducerId,
      bytes: evidenceFile.bytes,
    });
  };

  const sha256Hasher: ArenaV2A7FormalEvidenceSha256HasherCandidateV1 = async (request) => {
    const canonicalRequest = evidenceSha256Request(request, maximumEvidenceBytesPerRecord);
    if (canonicalRequest.storeSnapshotIdentityHash !== expectedEvidenceStoreSnapshotIdentityHash) {
      throw new RangeError('A7 Evidence Store Hasher Snapshot身份漂移。');
    }
    return createHash('sha256').update(canonicalRequest.bytes).digest('hex');
  };

  const verificationReceiptWriter:
  ArenaV2A7FormalEvidenceVerificationReceiptWriterCandidateV1 = async (request) => {
    const writeRequest = cloneFrozenData(
      request,
      'A7 Evidence Store Receipt Writer request',
    );
    exactRecord(
      writeRequest,
      WRITE_REQUEST_KEYS,
      'A7 Evidence Store Receipt Writer request',
    );
    if (writeRequest.schemaVersion !== 1) {
      throw new RangeError('A7 Evidence Store Receipt Writer schemaVersion必须为1。');
    }
    if (
      writeRequest.receiptWriterAdapterId
        !== ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTER_IDS_CANDIDATE_V1.receiptWriterAdapterId
    ) throw new RangeError('A7 Evidence Store Receipt Writer Adapter ID发生漂移。');
    if (!Array.isArray(writeRequest.receipts)) {
      throw new TypeError('A7 Evidence Store Receipt Writer receipts必须是数组。');
    }
    const canonicalReceipts = Object.freeze(writeRequest.receipts.map((value, index) => {
      const name = `A7 Evidence Store receipt[${index}]`;
      const entry = cloneFrozenData(value, name);
      exactRecord(entry, WRITE_ITEM_KEYS, name);
      const recordIndex = assertIntegerAtLeast(entry.recordIndex, 0, `${name}.recordIndex`);
      const recordCount = assertIntegerAtLeast(entry.recordCount, 1, `${name}.recordCount`);
      if (!Number.isSafeInteger(recordIndex) || !Number.isSafeInteger(recordCount)) {
        throw new RangeError(`${name} index/count必须是安全整数。`);
      }
      const payload = verificationPayload(entry.verificationPayload, `${name}.verificationPayload`);
      if (payload.verifiedEvidenceByteLength > maximumEvidenceBytesPerRecord) {
        throw new RangeError(`${name} Payload超过显式单记录边界。`);
      }
      const verificationPayloadIdentityHash = assertDeterministicIdentityHash(
        entry.verificationPayloadIdentityHash,
        `${name}.verificationPayloadIdentityHash`,
      );
      const expectedPayloadIdentityHash = createDeterministicDataHash(
        payload,
        `Arena V2 A7 formal Evidence verification payload ${payload.recordId}`,
      );
      if (verificationPayloadIdentityHash !== expectedPayloadIdentityHash) {
        throw new RangeError(`${name} verificationPayloadIdentityHash与Payload不闭合。`);
      }
      return Object.freeze({
        recordIndex,
        recordCount,
        verificationPayload: payload,
        verificationPayloadIdentityHash,
      });
    }));
    if (
      writeRequest.storeSnapshotIdentityHash !== expectedEvidenceStoreSnapshotIdentityHash
      || canonicalReceipts.length === 0
      || canonicalReceipts.length > 583
      || new Set(canonicalReceipts.map((entry) => (
        entry.verificationPayload.recordId
      ))).size !== canonicalReceipts.length
      || new Set(canonicalReceipts.map((entry) => (
        entry.verificationPayloadIdentityHash
      ))).size !== canonicalReceipts.length
    ) throw new RangeError('A7 Evidence Store回执批次数量或身份无效。');
    const sessionIdentity = assertDeterministicIdentityHash(
      writeRequest.verificationSessionIdentityHash,
      'A7 Evidence Store verificationSessionIdentityHash',
    );
    const retrievalPlanIdentity = assertDeterministicIdentityHash(
      writeRequest.retrievalPlanIdentityHash,
      'A7 Evidence Store retrievalPlanIdentityHash',
    );
    const recordIndexIdentity = assertDeterministicIdentityHash(
      writeRequest.recordIndexIdentityHash,
      'A7 Evidence Store recordIndexIdentityHash',
    );
    const receiptWriterAdapterId =
      assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
        writeRequest.receiptWriterAdapterId,
        'A7 Evidence Store receiptWriterAdapterId',
      );
    canonicalReceipts.forEach((entry, index) => {
      const payload = entry.verificationPayload;
      const expectedSessionIdentity = createDeterministicDataHash({
        schemaVersion:
          ARENA_V2_A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_CANDIDATE_V1_SCHEMA_VERSION,
        formalEvidenceRetrievalPlanIdentityHash: retrievalPlanIdentity,
        formalEvidenceRecordIndexIdentityHash: recordIndexIdentity,
        formalEvidenceStoreSnapshotIdentityHash:
          expectedEvidenceStoreSnapshotIdentityHash,
        verifierId: payload.verifierId,
        verifiedAtUtc: payload.verifiedAtUtc,
        retrievalAdapterId: payload.retrievalAdapterId,
        sha256AdapterId: payload.sha256AdapterId,
        receiptWriterAdapterId: payload.receiptWriterAdapterId,
      }, 'Arena V2 A7 formal Evidence retrieval verification session candidate V1');
      if (
        entry.recordIndex !== index
        || entry.recordCount !== canonicalReceipts.length
        || payload.verificationSessionIdentityHash !== sessionIdentity
        || payload.retrievalPlanIdentityHash !== retrievalPlanIdentity
        || payload.recordIndexIdentityHash !== recordIndexIdentity
        || payload.storeSnapshotIdentityHash !== expectedEvidenceStoreSnapshotIdentityHash
        || payload.receiptWriterAdapterId !== receiptWriterAdapterId
        || expectedSessionIdentity !== sessionIdentity
      ) throw new RangeError(`A7 Evidence Store回执Payload批次身份漂移：index=${index}。`);
    });
    const root = await resolvePinnedEvidenceRoot();
    const storeSnapshot = await readExpectedStoreSnapshot(
      root,
      expectedEvidenceStoreSnapshotIdentityHash,
      recordIndexIdentity,
      canonicalReceipts.length,
    );
    const resolvedReceiptParent = await resolvePinnedReceiptParent(root);
    const sessionDirectory = path.join(resolvedReceiptParent, sessionIdentity);
    assertPathWithinRoot(root, sessionDirectory, 'A7 receipt session directory');
    const entries: ArenaAtomicEvidenceDirectoryEntry[] = [];
    const readbackExpectations: ReceiptReadbackExpectationCandidateV1[] = [];
    const receipts = canonicalReceipts.map((entry, index) => {
      if (
        storeSnapshot.createdAtUtc
          < entry.verificationPayload.verifiedEvidenceRecordedAtUtc
      ) throw new RangeError(`A7 Evidence Store回执Payload时间漂移：index=${index}。`);
      const verificationPayloadIdentityHash = entry.verificationPayloadIdentityHash;
      const fileName = `${index.toString().padStart(4, '0')}.json`;
      const evidenceLocator = assertArenaV2A7FormalEvidenceLocatorCandidateV3(
        `evidence://arena-v2/a7/verification-receipts/`
          + `${sessionIdentity}/committed/${fileName}`,
        `A7 Evidence Store receipt[${index}].locator`,
      );
      const receiptBytes = Buffer.from(
        serializeArenaV2A7FormalEvidenceVerificationReceiptCandidateV1({
          schemaVersion:
            ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTERS_CANDIDATE_V1_SCHEMA_VERSION,
          verificationSessionIdentityHash: sessionIdentity,
          retrievalPlanIdentityHash: retrievalPlanIdentity,
          recordIndexIdentityHash: recordIndexIdentity,
          storeSnapshotIdentityHash: expectedEvidenceStoreSnapshotIdentityHash,
          verificationPayload: entry.verificationPayload,
          verificationPayloadIdentityHash,
        }),
        'utf8',
      );
      const verificationReceiptSha256 = createHash('sha256')
        .update(receiptBytes)
        .digest('hex');
      const metadataBytes = Buffer.from(
        serializeArenaV2A7FormalEvidenceMetadataSidecarCandidateV1({
          schemaVersion: 1,
          recordId: entry.verificationPayload.recordId,
          evidenceLocator,
          evidenceMediaType: 'application/json',
          evidenceRecordedAtUtc: entry.verificationPayload.verifiedAtUtc,
          evidenceProducerId: receiptWriterAdapterId,
        }),
        'utf8',
      );
      const metadataSha256 = createHash('sha256')
        .update(metadataBytes)
        .digest('hex');
      entries.push(
        Object.freeze({ relativePath: fileName, contents: receiptBytes }),
        Object.freeze({
          relativePath: `${fileName}.metadata.json`,
          contents: metadataBytes,
        }),
      );
      readbackExpectations.push(Object.freeze({
        fileName,
        receiptBytes,
        receiptSha256: verificationReceiptSha256,
        metadataBytes,
        metadataSha256,
      }));
      return Object.freeze({
        recordId: entry.verificationPayload.recordId,
        recordIndexIdentityHash: recordIndexIdentity,
        verificationPayloadIdentityHash,
        verificationReceiptLocator: evidenceLocator,
        verificationReceiptMediaType: 'application/json',
        verificationReceiptByteLength: receiptBytes.byteLength,
        verificationReceiptSha256,
      });
    });
    await writeArenaEvidenceDirectoryExclusive(sessionDirectory, entries, {
      afterPublish: async (committedDirectoryPath) => {
        await readExpectedStoreSnapshot(
          root,
          expectedEvidenceStoreSnapshotIdentityHash,
          recordIndexIdentity,
          canonicalReceipts.length,
        );
        const expectedCommittedDirectoryPath = path.join(sessionDirectory, 'committed');
        if (committedDirectoryPath !== expectedCommittedDirectoryPath) {
          throw new Error('A7 Evidence Store回执提交目录身份漂移。');
        }
        const resolvedCommittedDirectoryPath = await realpath(committedDirectoryPath);
        if (resolvedCommittedDirectoryPath !== expectedCommittedDirectoryPath) {
          throw new Error('A7 Evidence Store回执提交目录被替换。');
        }
        assertPathWithinRoot(
          root,
          resolvedCommittedDirectoryPath,
          'A7 receipt committed directory',
        );
        for (const expectation of readbackExpectations) {
          const receiptRelativePath = path.relative(
            root,
            path.join(resolvedCommittedDirectoryPath, expectation.fileName),
          );
          const receiptFile = await readVerifiedEvidenceArtifactBytes({
            root,
            relativePath: receiptRelativePath,
            expectedByteLength: expectation.receiptBytes.byteLength,
            expectedSha256: expectation.receiptSha256,
            maximumBytes: expectation.receiptBytes.byteLength,
            label: `A7 committed receipt ${expectation.fileName}`,
          });
          if (!Buffer.from(receiptFile.bytes).equals(expectation.receiptBytes)) {
            throw new Error(`A7 committed receipt内容漂移：${expectation.fileName}。`);
          }
          const metadataRelativePath = `${receiptRelativePath}.metadata.json`;
          const metadataFile = await readVerifiedEvidenceArtifact({
            root,
            relativePath: metadataRelativePath,
            expectedByteLength: expectation.metadataBytes.byteLength,
            expectedSha256: expectation.metadataSha256,
            maximumBytes: expectation.metadataBytes.byteLength,
            includeText: true,
            label: `A7 committed receipt metadata ${expectation.fileName}`,
          });
          if (metadataFile.text !== expectation.metadataBytes.toString('utf8')) {
            throw new Error(`A7 committed receipt metadata漂移：${expectation.fileName}。`);
          }
        }
        await resolvePinnedReceiptParent(root);
        await resolvePinnedEvidenceRoot();
      },
    });
    return Object.freeze({
      verificationSessionIdentityHash: sessionIdentity,
      retrievalPlanIdentityHash: retrievalPlanIdentity,
      recordIndexIdentityHash: recordIndexIdentity,
      storeSnapshotIdentityHash: expectedEvidenceStoreSnapshotIdentityHash,
      receipts: Object.freeze(receipts),
    });
  };

  return Object.freeze({
    ...ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTER_IDS_CANDIDATE_V1,
    evidenceReader,
    sha256Hasher,
    verificationReceiptWriter,
  });
}

export const ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTERS_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  currentGate: 'incomplete' as const,
  hardGate: false as const,
  defaultReleaseBundleWired: false as const,
  defaultEntryWired: false as const,
  validationStatus: 'not-run' as const,
  explicitEvidenceRootRequired: true as const,
  evidenceRootDirectoryIdentityPinnedByFactory: true as const,
  evidenceRootIdentityRevalidatedBeforeReadWriteAndReturn: true as const,
  receiptParentDirectoryIdentityPinnedByFactory: true as const,
  receiptParentIdentityRevalidatedBeforeCommittedReturn: true as const,
  expectedEvidenceStoreSnapshotIdentityRequired: true as const,
  adapterIdsOwnedAndEnforcedByFactory: true as const,
  readerAndHasherRequestsCanonicalizedBeforeUse: true as const,
  hasherCopiesNonSharedBytesBeforeHashing: true as const,
  readerSidecarMatchesExpectedRecordBeforeEvidenceRead: true as const,
  writerPayloadRespectsFactoryByteLimitBeforeIo: true as const,
  writerClosesBatchIdentityBeforeIo: true as const,
  writerRecomputesSessionIdentityFromEveryPayload: true as const,
  writerValidatesCanonicalPayloadAndRecomputesIdentityHash: true as const,
  writerRejectsNestedAdapterIdentitySpoofingBeforeIo: true as const,
  readerHasherAndWriterPinnedToSameSnapshot: true as const,
  storeSnapshotManifestRequiredAtCanonicalRootPath: true as const,
  storeSnapshotManifestRevalidatedBeforeReadWriteAndReturn: true as const,
  storeSnapshotManifestRevalidatedAfterEveryEvidenceRead: true as const,
  storeSnapshotCreatedAtMustCoverEveryEvidenceRecord: true as const,
  storeSnapshotManifestMustUseCanonicalExactBytes: true as const,
  canonicalStoreSnapshotManifestSerializerProvided: true as const,
  sidecarMetadataRequired: true as const,
  sourceMetadataSidecarMustUseCanonicalExactBytes: true as const,
  canonicalSourceMetadataSidecarSerializerProvided: true as const,
  receiptMetadataUsesCanonicalSidecarSerializer: true as const,
  receiptBodyUsesCanonicalSerializer: true as const,
  stableOpenFileAndPathIdentityRequired: true as const,
  symlinkEscapeRejected: true as const,
  explicitPerRecordByteLimitRequired: true as const,
  sha256ComputedFromRetrievedBytes: true as const,
  receiptBatchPublishedThroughCommittedDirectory: true as const,
  committedReceiptBatchReadBackBeforeReturn: true as const,
  committedReceiptBytesMetadataAndShaMustMatch: true as const,
  readbackFailureRemovesOnlyNewSession: true as const,
  receiptParentMustBePreprovisioned: true as const,
  existingReceiptSessionCannotBeOverwritten: true as const,
  defaultProductionWiringProvided: false as const,
});
