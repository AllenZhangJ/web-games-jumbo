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
} from './arena-v2-a7-formal-budget-evidence-value-candidate-v1.js';
import {
  assertArenaV2A7FormalEvidenceLocatorCandidateV3,
  assertArenaV2A7FormalEvidenceMediaTypeCandidateV3,
  validateArenaV2A7FormalEvidenceRecordIndexCandidateV3,
  type ArenaV2A7FormalEvidenceRecordIndexEntryCandidateV3,
  type ArenaV2A7FormalEvidenceRecordVerificationIndexEntryCandidateV3,
} from './arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v3.js';

export const ARENA_V2_A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;
const DETERMINISTIC_IDENTITY_HASH_PATTERN = /^[0-9a-f]{8}$/u;

function assertDeterministicIdentityHash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !DETERMINISTIC_IDENTITY_HASH_PATTERN.test(value)) {
    throw new TypeError(`${name}必须是8位小写确定性身份hash。`);
  }
  return value;
}

export type ArenaV2A7FormalEvidenceRetrievalVerifierStateCandidateV1 =
  | 'created'
  | 'running'
  | 'completed'
  | 'failed'
  | 'destroyed';

export interface ArenaV2A7FormalEvidenceReadRequestCandidateV1 {
  readonly schemaVersion: 1;
  readonly verificationSessionIdentityHash: string;
  readonly retrievalPlanIdentityHash: string;
  readonly recordIndexIdentityHash: string;
  readonly storeSnapshotIdentityHash: string;
  readonly recordIndex: number;
  readonly recordCount: number;
  readonly expectedRecord: Readonly<ArenaV2A7FormalEvidenceRecordIndexEntryCandidateV3>;
  readonly retrievalAdapterId: string;
}

export interface ArenaV2A7FormalEvidenceReadResultCandidateV1 {
  readonly recordId: string;
  readonly evidenceLocator: string;
  readonly evidenceMediaType: string;
  readonly evidenceRecordedAtUtc: string;
  readonly evidenceProducerId: string;
  readonly bytes: Uint8Array;
}

export interface ArenaV2A7FormalEvidenceSha256RequestCandidateV1 {
  readonly schemaVersion: 1;
  readonly verificationSessionIdentityHash: string;
  readonly retrievalPlanIdentityHash: string;
  readonly recordIndexIdentityHash: string;
  readonly storeSnapshotIdentityHash: string;
  readonly recordId: string;
  readonly evidenceLocator: string;
  readonly sha256AdapterId: string;
  readonly bytes: Uint8Array;
}

export interface ArenaV2A7FormalEvidenceVerificationPayloadCandidateV1 {
  readonly schemaVersion: 1;
  readonly verificationSessionIdentityHash: string;
  readonly retrievalPlanIdentityHash: string;
  readonly recordIndexIdentityHash: string;
  readonly storeSnapshotIdentityHash: string;
  readonly recordId: string;
  readonly verifiedEvidenceLocator: string;
  readonly verifiedEvidenceMediaType: string;
  readonly verifiedEvidenceByteLength: number;
  readonly verifiedEvidenceRecordedAtUtc: string;
  readonly verifiedEvidenceProducerId: string;
  readonly verifiedEvidenceSha256: string;
  readonly verifierId: string;
  readonly verifiedAtUtc: string;
  readonly retrievalAdapterId: string;
  readonly sha256AdapterId: string;
  readonly receiptWriterAdapterId: string;
}

export interface ArenaV2A7FormalEvidenceVerificationReceiptWriteItemCandidateV1 {
  readonly recordIndex: number;
  readonly recordCount: number;
  readonly verificationPayload: Readonly<
  ArenaV2A7FormalEvidenceVerificationPayloadCandidateV1
  >;
  readonly verificationPayloadIdentityHash: string;
}

export interface ArenaV2A7FormalEvidenceVerificationReceiptWriteRequestCandidateV1 {
  readonly schemaVersion: 1;
  readonly verificationSessionIdentityHash: string;
  readonly retrievalPlanIdentityHash: string;
  readonly recordIndexIdentityHash: string;
  readonly storeSnapshotIdentityHash: string;
  readonly receiptWriterAdapterId: string;
  readonly receipts: readonly Readonly<
  ArenaV2A7FormalEvidenceVerificationReceiptWriteItemCandidateV1
  >[];
}

export interface ArenaV2A7FormalEvidenceVerificationReceiptWriteResultCandidateV1 {
  readonly recordId: string;
  readonly recordIndexIdentityHash: string;
  readonly verificationPayloadIdentityHash: string;
  readonly verificationReceiptLocator: string;
  readonly verificationReceiptMediaType: string;
  readonly verificationReceiptByteLength: number;
  readonly verificationReceiptSha256: string;
}

export interface ArenaV2A7FormalEvidenceVerificationReceiptWriteBatchResultCandidateV1 {
  readonly verificationSessionIdentityHash: string;
  readonly retrievalPlanIdentityHash: string;
  readonly recordIndexIdentityHash: string;
  readonly storeSnapshotIdentityHash: string;
  readonly receipts: readonly Readonly<
  ArenaV2A7FormalEvidenceVerificationReceiptWriteResultCandidateV1
  >[];
}

export type ArenaV2A7FormalEvidenceReaderCandidateV1 = (
  request: Readonly<ArenaV2A7FormalEvidenceReadRequestCandidateV1>,
) => Promise<unknown>;

export type ArenaV2A7FormalEvidenceSha256HasherCandidateV1 = (
  request: Readonly<ArenaV2A7FormalEvidenceSha256RequestCandidateV1>,
) => Promise<unknown>;

export type ArenaV2A7FormalEvidenceVerificationReceiptWriterCandidateV1 = (
  request: Readonly<ArenaV2A7FormalEvidenceVerificationReceiptWriteRequestCandidateV1>,
) => Promise<unknown>;

export interface ArenaV2A7FormalEvidenceRetrievalVerifierOptionsCandidateV1 {
  readonly formalEvidenceRecordIndex: unknown;
  readonly formalEvidenceRetrievalPlanIdentityHash: string;
  readonly formalEvidenceRecordIndexIdentityHash: string;
  readonly formalEvidenceStoreSnapshotIdentityHash: string;
  readonly verifierId: string;
  readonly verifiedAtUtc: string;
  readonly retrievalAdapterId: string;
  readonly sha256AdapterId: string;
  readonly receiptWriterAdapterId: string;
  readonly evidenceReader: ArenaV2A7FormalEvidenceReaderCandidateV1;
  readonly sha256Hasher: ArenaV2A7FormalEvidenceSha256HasherCandidateV1;
  readonly verificationReceiptWriter:
  ArenaV2A7FormalEvidenceVerificationReceiptWriterCandidateV1;
}

export interface ArenaV2A7FormalEvidenceVerificationReceiptIndexEntryCandidateV1
  extends ArenaV2A7FormalEvidenceRecordVerificationIndexEntryCandidateV3 {
  readonly verificationPayloadIdentityHash: string;
}

interface CanonicalVerificationContextCandidateV1 {
  readonly formalEvidenceRecordIndex: readonly Readonly<
  ArenaV2A7FormalEvidenceRecordIndexEntryCandidateV3
  >[];
  readonly formalEvidenceRetrievalPlanIdentityHash: string;
  readonly formalEvidenceRecordIndexIdentityHash: string;
  readonly formalEvidenceStoreSnapshotIdentityHash: string;
  readonly verifierId: string;
  readonly verifiedAtUtc: string;
  readonly retrievalAdapterId: string;
  readonly sha256AdapterId: string;
  readonly receiptWriterAdapterId: string;
  readonly verificationSessionIdentityHash: string;
}

const OPTION_KEYS = new Set([
  'formalEvidenceRecordIndex',
  'formalEvidenceRetrievalPlanIdentityHash',
  'formalEvidenceRecordIndexIdentityHash',
  'formalEvidenceStoreSnapshotIdentityHash',
  'verifierId',
  'verifiedAtUtc',
  'retrievalAdapterId',
  'sha256AdapterId',
  'receiptWriterAdapterId',
  'evidenceReader',
  'sha256Hasher',
  'verificationReceiptWriter',
]);
const READ_RESULT_KEYS = new Set([
  'recordId',
  'evidenceLocator',
  'evidenceMediaType',
  'evidenceRecordedAtUtc',
  'evidenceProducerId',
  'bytes',
]);
const WRITE_BATCH_RESULT_KEYS = new Set([
  'verificationSessionIdentityHash',
  'retrievalPlanIdentityHash',
  'recordIndexIdentityHash',
  'storeSnapshotIdentityHash',
  'receipts',
]);
const WRITE_RESULT_KEYS = new Set([
  'recordId',
  'recordIndexIdentityHash',
  'verificationPayloadIdentityHash',
  'verificationReceiptLocator',
  'verificationReceiptMediaType',
  'verificationReceiptByteLength',
  'verificationReceiptSha256',
]);
const NATIVE_PROMISE_THEN = Promise.prototype.then;

function captureExactDataRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key === 'symbol')) {
    throw new TypeError(`${name}不得包含Symbol字段。`);
  }
  const stringKeys = ownKeys as string[];
  if (
    stringKeys.length !== keys.size
    || stringKeys.some((key) => !keys.has(key))
  ) throw new TypeError(`${name}字段集合不匹配。`);
  const captured: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
    captured[key] = descriptor.value;
  }
  return Object.freeze(captured);
}

function awaitNativePromise(value: unknown, name: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    try {
      Reflect.apply(NATIVE_PROMISE_THEN, value, [resolve, reject]);
    } catch {
      reject(new TypeError(`${name}必须返回原生或foreign Promise。`));
    }
  });
}

function sumSafePositiveIntegers(values: readonly number[], name: string): number {
  let total = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === undefined || !Number.isSafeInteger(value) || value < 1) {
      throw new RangeError(`${name}[${index}]必须是正安全整数。`);
    }
    if (total > Number.MAX_SAFE_INTEGER - value) {
      throw new RangeError(`${name}聚合结果超出安全整数范围。`);
    }
    total += value;
  }
  return total;
}

function createCanonicalContext(
  source: Readonly<Record<string, unknown>>,
): Readonly<CanonicalVerificationContextCandidateV1> {
  const formalEvidenceRecordIndex =
    validateArenaV2A7FormalEvidenceRecordIndexCandidateV3(
      source.formalEvidenceRecordIndex,
    );
  const formalEvidenceRetrievalPlanIdentityHash = assertDeterministicIdentityHash(
    source.formalEvidenceRetrievalPlanIdentityHash,
    'A7 Evidence verifier formalEvidenceRetrievalPlanIdentityHash',
  );
  const formalEvidenceRecordIndexIdentityHash = assertDeterministicIdentityHash(
    source.formalEvidenceRecordIndexIdentityHash,
    'A7 Evidence verifier formalEvidenceRecordIndexIdentityHash',
  );
  const computedRecordIndexIdentityHash = createDeterministicDataHash(
    formalEvidenceRecordIndex,
    'Arena V2 A7 formal evidence record index candidate V3',
  );
  if (formalEvidenceRecordIndexIdentityHash !== computedRecordIndexIdentityHash) {
    throw new RangeError('A7 Evidence verifier record index identity发生漂移。');
  }
  const formalEvidenceStoreSnapshotIdentityHash = assertEvidenceSha256(
    source.formalEvidenceStoreSnapshotIdentityHash,
    'A7 Evidence verifier formalEvidenceStoreSnapshotIdentityHash',
  );
  const verifierId = assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
    source.verifierId,
    'A7 Evidence verifier verifierId',
  );
  const producerIds = new Set(
    formalEvidenceRecordIndex.map(({ evidenceProducerId }) => evidenceProducerId),
  );
  if (producerIds.has(verifierId)) {
    throw new RangeError('A7 Evidence verifier不得兼任任一Evidence Producer。');
  }
  const verifiedAtUtc = assertEvidenceUtcInstant(
    source.verifiedAtUtc,
    'A7 Evidence verifier verifiedAtUtc',
  );
  const futureRecord = formalEvidenceRecordIndex.find(
    ({ evidenceRecordedAtUtc }) => verifiedAtUtc < evidenceRecordedAtUtc,
  );
  if (futureRecord !== undefined) {
    throw new RangeError(`A7 Evidence verifier核验时间早于记录：${futureRecord.recordId}。`);
  }
  const retrievalAdapterId = assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
    source.retrievalAdapterId,
    'A7 Evidence verifier retrievalAdapterId',
  );
  const sha256AdapterId = assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
    source.sha256AdapterId,
    'A7 Evidence verifier sha256AdapterId',
  );
  const receiptWriterAdapterId =
    assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
      source.receiptWriterAdapterId,
      'A7 Evidence verifier receiptWriterAdapterId',
    );
  if (new Set([
    retrievalAdapterId,
    sha256AdapterId,
    receiptWriterAdapterId,
  ]).size !== 3) {
    throw new RangeError('A7 Evidence verifier读取、哈希与回执写入Adapter ID必须互异。');
  }
  const verificationSessionIdentityHash = createDeterministicDataHash({
    schemaVersion:
      ARENA_V2_A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_CANDIDATE_V1_SCHEMA_VERSION,
    formalEvidenceRetrievalPlanIdentityHash,
    formalEvidenceRecordIndexIdentityHash,
    formalEvidenceStoreSnapshotIdentityHash,
    verifierId,
    verifiedAtUtc,
    retrievalAdapterId,
    sha256AdapterId,
    receiptWriterAdapterId,
  }, 'Arena V2 A7 formal Evidence retrieval verification session candidate V1');
  return Object.freeze({
    formalEvidenceRecordIndex,
    formalEvidenceRetrievalPlanIdentityHash,
    formalEvidenceRecordIndexIdentityHash,
    formalEvidenceStoreSnapshotIdentityHash,
    verifierId,
    verifiedAtUtc,
    retrievalAdapterId,
    sha256AdapterId,
    receiptWriterAdapterId,
    verificationSessionIdentityHash,
  });
}

function createReadRequest(
  context: Readonly<CanonicalVerificationContextCandidateV1>,
  expectedRecord: Readonly<ArenaV2A7FormalEvidenceRecordIndexEntryCandidateV3>,
  recordIndex: number,
): Readonly<ArenaV2A7FormalEvidenceReadRequestCandidateV1> {
  return Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_CANDIDATE_V1_SCHEMA_VERSION,
    verificationSessionIdentityHash: context.verificationSessionIdentityHash,
    retrievalPlanIdentityHash: context.formalEvidenceRetrievalPlanIdentityHash,
    recordIndexIdentityHash: context.formalEvidenceRecordIndexIdentityHash,
    storeSnapshotIdentityHash: context.formalEvidenceStoreSnapshotIdentityHash,
    recordIndex,
    recordCount: context.formalEvidenceRecordIndex.length,
    expectedRecord,
    retrievalAdapterId: context.retrievalAdapterId,
  });
}

function normalizeReadResult(
  value: unknown,
  expectedRecord: Readonly<ArenaV2A7FormalEvidenceRecordIndexEntryCandidateV3>,
): Readonly<ArenaV2A7FormalEvidenceReadResultCandidateV1> {
  const source = captureExactDataRecord(
    value,
    READ_RESULT_KEYS,
    `A7 Evidence reader result ${expectedRecord.recordId}`,
  );
  const recordId = assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
    source.recordId,
    `A7 Evidence reader result ${expectedRecord.recordId}.recordId`,
  );
  const evidenceLocator = assertArenaV2A7FormalEvidenceLocatorCandidateV3(
    source.evidenceLocator,
    `A7 Evidence reader result ${expectedRecord.recordId}.evidenceLocator`,
  );
  const evidenceMediaType = assertArenaV2A7FormalEvidenceMediaTypeCandidateV3(
    source.evidenceMediaType,
    `A7 Evidence reader result ${expectedRecord.recordId}.evidenceMediaType`,
  );
  const evidenceRecordedAtUtc = assertEvidenceUtcInstant(
    source.evidenceRecordedAtUtc,
    `A7 Evidence reader result ${expectedRecord.recordId}.evidenceRecordedAtUtc`,
  );
  const evidenceProducerId = assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
    source.evidenceProducerId,
    `A7 Evidence reader result ${expectedRecord.recordId}.evidenceProducerId`,
  );
  if (!(source.bytes instanceof Uint8Array)) {
    throw new TypeError(`A7 Evidence reader result ${expectedRecord.recordId}.bytes必须是Uint8Array。`);
  }
  const bytes = new Uint8Array(source.bytes.byteLength);
  bytes.set(source.bytes);
  if (
    recordId !== expectedRecord.recordId
    || evidenceLocator !== expectedRecord.evidenceLocator
    || evidenceMediaType !== expectedRecord.evidenceMediaType
    || evidenceRecordedAtUtc !== expectedRecord.evidenceRecordedAtUtc
    || evidenceProducerId !== expectedRecord.evidenceProducerId
    || bytes.byteLength !== expectedRecord.evidenceByteLength
  ) throw new RangeError(`A7 Evidence reader observation发生漂移：${expectedRecord.recordId}。`);
  return Object.freeze({
    recordId,
    evidenceLocator,
    evidenceMediaType,
    evidenceRecordedAtUtc,
    evidenceProducerId,
    bytes,
  });
}

function createVerificationPayload(
  context: Readonly<CanonicalVerificationContextCandidateV1>,
  record: Readonly<ArenaV2A7FormalEvidenceRecordIndexEntryCandidateV3>,
): Readonly<ArenaV2A7FormalEvidenceVerificationPayloadCandidateV1> {
  return Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_CANDIDATE_V1_SCHEMA_VERSION,
    verificationSessionIdentityHash: context.verificationSessionIdentityHash,
    retrievalPlanIdentityHash: context.formalEvidenceRetrievalPlanIdentityHash,
    recordIndexIdentityHash: context.formalEvidenceRecordIndexIdentityHash,
    storeSnapshotIdentityHash: context.formalEvidenceStoreSnapshotIdentityHash,
    recordId: record.recordId,
    verifiedEvidenceLocator: record.evidenceLocator,
    verifiedEvidenceMediaType: record.evidenceMediaType,
    verifiedEvidenceByteLength: record.evidenceByteLength,
    verifiedEvidenceRecordedAtUtc: record.evidenceRecordedAtUtc,
    verifiedEvidenceProducerId: record.evidenceProducerId,
    verifiedEvidenceSha256: record.evidenceSha256,
    verifierId: context.verifierId,
    verifiedAtUtc: context.verifiedAtUtc,
    retrievalAdapterId: context.retrievalAdapterId,
    sha256AdapterId: context.sha256AdapterId,
    receiptWriterAdapterId: context.receiptWriterAdapterId,
  });
}

function normalizeWriteResult(
  value: unknown,
  context: Readonly<CanonicalVerificationContextCandidateV1>,
  payload: Readonly<ArenaV2A7FormalEvidenceVerificationPayloadCandidateV1>,
  verificationPayloadIdentityHash: string,
): Readonly<ArenaV2A7FormalEvidenceVerificationReceiptWriteResultCandidateV1> {
  const source = captureExactDataRecord(
    value,
    WRITE_RESULT_KEYS,
    `A7 verification receipt writer result ${payload.recordId}`,
  );
  if (
    source.recordId !== payload.recordId
    || source.recordIndexIdentityHash !== context.formalEvidenceRecordIndexIdentityHash
    || source.verificationPayloadIdentityHash !== verificationPayloadIdentityHash
  ) throw new RangeError(`A7 verification receipt writer identity发生漂移：${payload.recordId}。`);
  const verificationReceiptByteLength = assertIntegerAtLeast(
    source.verificationReceiptByteLength,
    1,
    `A7 verification receipt ${payload.recordId}.byteLength`,
  );
  if (!Number.isSafeInteger(verificationReceiptByteLength)) {
    throw new RangeError(`A7 verification receipt ${payload.recordId}.byteLength必须是安全整数。`);
  }
  return Object.freeze({
    recordId: payload.recordId,
    recordIndexIdentityHash: context.formalEvidenceRecordIndexIdentityHash,
    verificationPayloadIdentityHash,
    verificationReceiptLocator: assertArenaV2A7FormalEvidenceLocatorCandidateV3(
      source.verificationReceiptLocator,
      `A7 verification receipt ${payload.recordId}.locator`,
    ),
    verificationReceiptMediaType: assertArenaV2A7FormalEvidenceMediaTypeCandidateV3(
      source.verificationReceiptMediaType,
      `A7 verification receipt ${payload.recordId}.mediaType`,
    ),
    verificationReceiptByteLength,
    verificationReceiptSha256: assertEvidenceSha256(
      source.verificationReceiptSha256,
      `A7 verification receipt ${payload.recordId}.sha256`,
    ),
  });
}

export type ArenaV2A7FormalEvidenceRetrievalVerificationResultCandidateV1 = Readonly<{
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly verificationStatus: 'completed';
  readonly hardGate: false;
  readonly defaultReleaseBundleWired: false;
  readonly defaultEntryWired: false;
  readonly verificationSessionIdentityHash: string;
  readonly formalEvidenceRetrievalPlanIdentityHash: string;
  readonly formalEvidenceRecordIndexIdentityHash: string;
  readonly formalEvidenceStoreSnapshotIdentityHash: string;
  readonly verifierId: string;
  readonly verifiedAtUtc: string;
  readonly retrievalAdapterId: string;
  readonly sha256AdapterId: string;
  readonly receiptWriterAdapterId: string;
  readonly formalEvidenceRecordVerificationDirectory: readonly Readonly<
  ArenaV2A7FormalEvidenceRecordVerificationIndexEntryCandidateV3
  >[];
  readonly verificationReceiptIndex: readonly Readonly<
  ArenaV2A7FormalEvidenceVerificationReceiptIndexEntryCandidateV1
  >[];
  readonly verificationReceiptCount: number;
  readonly totalVerificationReceiptBytes: number;
  readonly verificationReceiptIndexIdentityHash: string;
  readonly identityHash: string;
}>;

export class ArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1 {
  #state: ArenaV2A7FormalEvidenceRetrievalVerifierStateCandidateV1 = 'created';
  #context: Readonly<CanonicalVerificationContextCandidateV1> | null;
  #evidenceReader: ArenaV2A7FormalEvidenceReaderCandidateV1 | null;
  #sha256Hasher: ArenaV2A7FormalEvidenceSha256HasherCandidateV1 | null;
  #verificationReceiptWriter:
  ArenaV2A7FormalEvidenceVerificationReceiptWriterCandidateV1 | null;
  #result: ArenaV2A7FormalEvidenceRetrievalVerificationResultCandidateV1 | null = null;

  constructor(value: unknown) {
    const source = captureExactDataRecord(value, OPTION_KEYS, 'A7 Evidence verifier options');
    if (
      typeof source.evidenceReader !== 'function'
      || typeof source.sha256Hasher !== 'function'
      || typeof source.verificationReceiptWriter !== 'function'
    ) throw new TypeError('A7 Evidence verifier三个执行端口都必须是函数数据字段。');
    this.#context = createCanonicalContext(source);
    this.#evidenceReader = source.evidenceReader as ArenaV2A7FormalEvidenceReaderCandidateV1;
    this.#sha256Hasher = source.sha256Hasher as ArenaV2A7FormalEvidenceSha256HasherCandidateV1;
    this.#verificationReceiptWriter = source.verificationReceiptWriter as
      ArenaV2A7FormalEvidenceVerificationReceiptWriterCandidateV1;
  }

  get state(): ArenaV2A7FormalEvidenceRetrievalVerifierStateCandidateV1 {
    return this.#state;
  }

  start(): Promise<ArenaV2A7FormalEvidenceRetrievalVerificationResultCandidateV1> {
    if (this.#state !== 'created') {
      throw new Error(`A7 Evidence verifier不能从${this.#state}重复start。`);
    }
    this.#state = 'running';
    return this.#run();
  }

  getResult(): ArenaV2A7FormalEvidenceRetrievalVerificationResultCandidateV1 {
    if (this.#state !== 'completed' || this.#result === null) {
      throw new Error('A7 Evidence verifier尚无可读的完整结果。');
    }
    return this.#result;
  }

  destroy(): void {
    if (this.#state === 'running') throw new Error('A7 Evidence verifier运行中不得destroy。');
    if (this.#state === 'destroyed') return;
    this.#releaseInputs();
    this.#result = null;
    this.#state = 'destroyed';
  }

  #releaseInputs(): void {
    this.#context = null;
    this.#evidenceReader = null;
    this.#sha256Hasher = null;
    this.#verificationReceiptWriter = null;
  }

  async #run(): Promise<ArenaV2A7FormalEvidenceRetrievalVerificationResultCandidateV1> {
    try {
      const context = this.#context;
      const evidenceReader = this.#evidenceReader;
      const sha256Hasher = this.#sha256Hasher;
      const verificationReceiptWriter = this.#verificationReceiptWriter;
      if (
        context === null
        || evidenceReader === null
        || sha256Hasher === null
        || verificationReceiptWriter === null
      ) throw new Error('A7 Evidence verifier运行依赖已被释放。');
      const receiptIndex: ArenaV2A7FormalEvidenceVerificationReceiptIndexEntryCandidateV1[] = [];
      const sourceLocators = new Set(
        context.formalEvidenceRecordIndex.map(({ evidenceLocator }) => evidenceLocator),
      );
      const sourceShas = new Set(
        context.formalEvidenceRecordIndex.map(({ evidenceSha256 }) => evidenceSha256),
      );
      const pendingReceiptWrites:
      ArenaV2A7FormalEvidenceVerificationReceiptWriteItemCandidateV1[] = [];
      const receiptLocators = new Set<string>();
      const receiptShas = new Set<string>();
      for (
        let recordIndex = 0;
        recordIndex < context.formalEvidenceRecordIndex.length;
        recordIndex += 1
      ) {
        const record = context.formalEvidenceRecordIndex[recordIndex]!;
        const readRequest = createReadRequest(context, record, recordIndex);
        const readResult = normalizeReadResult(
          await awaitNativePromise(
            evidenceReader(readRequest),
            `A7 Evidence reader ${record.recordId}`,
          ),
          record,
        );
        const hashBytes = new Uint8Array(readResult.bytes.byteLength);
        hashBytes.set(readResult.bytes);
        const observedSha256 = assertEvidenceSha256(
          await awaitNativePromise(
            sha256Hasher(Object.freeze({
              schemaVersion:
                ARENA_V2_A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_CANDIDATE_V1_SCHEMA_VERSION,
              verificationSessionIdentityHash: context.verificationSessionIdentityHash,
              retrievalPlanIdentityHash:
                context.formalEvidenceRetrievalPlanIdentityHash,
              recordIndexIdentityHash: context.formalEvidenceRecordIndexIdentityHash,
              storeSnapshotIdentityHash:
                context.formalEvidenceStoreSnapshotIdentityHash,
              recordId: record.recordId,
              evidenceLocator: record.evidenceLocator,
              sha256AdapterId: context.sha256AdapterId,
              bytes: hashBytes,
            })),
            `A7 Evidence SHA-256 hasher ${record.recordId}`,
          ),
          `A7 Evidence observed SHA-256 ${record.recordId}`,
        );
        if (observedSha256 !== record.evidenceSha256) {
          throw new RangeError(`A7 Evidence读取内容SHA发生漂移：${record.recordId}。`);
        }
        const verificationPayload = createVerificationPayload(context, record);
        const verificationPayloadIdentityHash = createDeterministicDataHash(
          verificationPayload,
          `Arena V2 A7 formal Evidence verification payload ${record.recordId}`,
        );
        pendingReceiptWrites.push(Object.freeze({
          recordIndex,
          recordCount: context.formalEvidenceRecordIndex.length,
          verificationPayload,
          verificationPayloadIdentityHash,
        }));
      }
      const frozenPendingReceiptWrites = Object.freeze(pendingReceiptWrites);
      const rawWriteBatchResult = captureExactDataRecord(
        await awaitNativePromise(
          verificationReceiptWriter(Object.freeze({
            schemaVersion:
              ARENA_V2_A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_CANDIDATE_V1_SCHEMA_VERSION,
            verificationSessionIdentityHash: context.verificationSessionIdentityHash,
            retrievalPlanIdentityHash:
              context.formalEvidenceRetrievalPlanIdentityHash,
            recordIndexIdentityHash: context.formalEvidenceRecordIndexIdentityHash,
            storeSnapshotIdentityHash:
              context.formalEvidenceStoreSnapshotIdentityHash,
            receiptWriterAdapterId: context.receiptWriterAdapterId,
            receipts: frozenPendingReceiptWrites,
          })),
          'A7 verification receipt atomic batch writer',
        ),
        WRITE_BATCH_RESULT_KEYS,
        'A7 verification receipt atomic batch writer result',
      );
      if (
        rawWriteBatchResult.verificationSessionIdentityHash
          !== context.verificationSessionIdentityHash
        || rawWriteBatchResult.retrievalPlanIdentityHash
          !== context.formalEvidenceRetrievalPlanIdentityHash
        || rawWriteBatchResult.recordIndexIdentityHash
          !== context.formalEvidenceRecordIndexIdentityHash
        || rawWriteBatchResult.storeSnapshotIdentityHash
          !== context.formalEvidenceStoreSnapshotIdentityHash
      ) throw new RangeError('A7 verification receipt batch writer identity发生漂移。');
      const rawWriteResults = cloneFrozenData(
        rawWriteBatchResult.receipts,
        'A7 verification receipt atomic batch writer receipts',
      );
      if (
        !Array.isArray(rawWriteResults)
        || rawWriteResults.length !== frozenPendingReceiptWrites.length
      ) throw new RangeError('A7 verification receipt batch writer必须精确返回全部回执。');
      for (let index = 0; index < frozenPendingReceiptWrites.length; index += 1) {
        const pending = frozenPendingReceiptWrites[index]!;
        const record = context.formalEvidenceRecordIndex[index]!;
        const writeResult = normalizeWriteResult(
          rawWriteResults[index],
          context,
          pending.verificationPayload,
          pending.verificationPayloadIdentityHash,
        );
        if (
          sourceLocators.has(writeResult.verificationReceiptLocator)
          || receiptLocators.has(writeResult.verificationReceiptLocator)
        ) throw new RangeError(`A7验证回执Locator发生复用：${record.recordId}。`);
        if (
          sourceShas.has(writeResult.verificationReceiptSha256)
          || receiptShas.has(writeResult.verificationReceiptSha256)
        ) throw new RangeError(`A7验证回执SHA发生复用：${record.recordId}。`);
        receiptLocators.add(writeResult.verificationReceiptLocator);
        receiptShas.add(writeResult.verificationReceiptSha256);
        receiptIndex.push(Object.freeze({
          recordId: record.recordId,
          formalEvidenceRetrievalPlanIdentityHash:
            context.formalEvidenceRetrievalPlanIdentityHash,
          formalEvidenceStoreSnapshotIdentityHash:
            context.formalEvidenceStoreSnapshotIdentityHash,
          verifiedEvidenceLocator: record.evidenceLocator,
          verifiedEvidenceMediaType: record.evidenceMediaType,
          verifiedEvidenceByteLength: record.evidenceByteLength,
          verifiedEvidenceRecordedAtUtc: record.evidenceRecordedAtUtc,
          verifiedEvidenceProducerId: record.evidenceProducerId,
          verifiedEvidenceSha256: record.evidenceSha256,
          verifierId: context.verifierId,
          verifiedAtUtc: context.verifiedAtUtc,
          verificationReceiptLocator: writeResult.verificationReceiptLocator,
          verificationReceiptMediaType: writeResult.verificationReceiptMediaType,
          verificationReceiptByteLength: writeResult.verificationReceiptByteLength,
          verificationReceiptSha256: writeResult.verificationReceiptSha256,
          verificationPayloadIdentityHash: pending.verificationPayloadIdentityHash,
        }));
      }
      const frozenReceiptIndex = Object.freeze(receiptIndex);
      const formalEvidenceRecordVerificationDirectory = Object.freeze(
        frozenReceiptIndex.map((entry) => Object.freeze({
          recordId: entry.recordId,
          formalEvidenceRetrievalPlanIdentityHash:
            entry.formalEvidenceRetrievalPlanIdentityHash,
          formalEvidenceStoreSnapshotIdentityHash:
            entry.formalEvidenceStoreSnapshotIdentityHash,
          verifiedEvidenceLocator: entry.verifiedEvidenceLocator,
          verifiedEvidenceMediaType: entry.verifiedEvidenceMediaType,
          verifiedEvidenceByteLength: entry.verifiedEvidenceByteLength,
          verifiedEvidenceRecordedAtUtc: entry.verifiedEvidenceRecordedAtUtc,
          verifiedEvidenceProducerId: entry.verifiedEvidenceProducerId,
          verifiedEvidenceSha256: entry.verifiedEvidenceSha256,
          verifierId: entry.verifierId,
          verifiedAtUtc: entry.verifiedAtUtc,
          verificationReceiptLocator: entry.verificationReceiptLocator,
          verificationReceiptMediaType: entry.verificationReceiptMediaType,
          verificationReceiptByteLength: entry.verificationReceiptByteLength,
          verificationReceiptSha256: entry.verificationReceiptSha256,
        })),
      );
      const totalVerificationReceiptBytes = sumSafePositiveIntegers(
        frozenReceiptIndex.map(
          ({ verificationReceiptByteLength }) => verificationReceiptByteLength,
        ),
        'A7 verification receipt bytes',
      );
      const verificationReceiptIndexIdentityHash = createDeterministicDataHash(
        frozenReceiptIndex,
        'Arena V2 A7 formal Evidence verification receipt index candidate V1',
      );
      const core = Object.freeze({
        schemaVersion:
          ARENA_V2_A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_CANDIDATE_V1_SCHEMA_VERSION,
        status: 'production-unreachable' as const,
        implementationStatus: 'code-written-not-run' as const,
        validationStatus: 'not-run' as const,
        verificationStatus: 'completed' as const,
        hardGate: false as const,
        defaultReleaseBundleWired: false as const,
        defaultEntryWired: false as const,
        verificationSessionIdentityHash: context.verificationSessionIdentityHash,
        formalEvidenceRetrievalPlanIdentityHash:
          context.formalEvidenceRetrievalPlanIdentityHash,
        formalEvidenceRecordIndexIdentityHash:
          context.formalEvidenceRecordIndexIdentityHash,
        formalEvidenceStoreSnapshotIdentityHash:
          context.formalEvidenceStoreSnapshotIdentityHash,
        verifierId: context.verifierId,
        verifiedAtUtc: context.verifiedAtUtc,
        retrievalAdapterId: context.retrievalAdapterId,
        sha256AdapterId: context.sha256AdapterId,
        receiptWriterAdapterId: context.receiptWriterAdapterId,
        formalEvidenceRecordVerificationDirectory,
        verificationReceiptIndex: frozenReceiptIndex,
        verificationReceiptCount: frozenReceiptIndex.length,
        totalVerificationReceiptBytes,
        verificationReceiptIndexIdentityHash,
      });
      const result = Object.freeze({
        ...core,
        identityHash: createDeterministicDataHash(
          core,
          'Arena V2 A7 formal Evidence retrieval verification result candidate V1',
        ),
      });
      this.#result = result;
      this.#releaseInputs();
      this.#state = 'completed';
      return result;
    } catch (error) {
      this.#result = null;
      this.#releaseInputs();
      this.#state = 'failed';
      throw error;
    }
  }
}

export function createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1(
  value: unknown,
): ArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1 {
  return new ArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1(value);
}

export const ARENA_V2_A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  currentGate: 'incomplete' as const,
  hardGate: false as const,
  defaultReleaseBundleWired: false as const,
  defaultEntryWired: false as const,
  validationStatus: 'not-run' as const,
  readsOnlyThroughInjectedEvidenceReader: true as const,
  hashesOnlyThroughInjectedSha256Adapter: true as const,
  writesOnlyThroughInjectedReceiptWriter: true as const,
  receiptWriterMustCommitOneAtomicBatch: true as const,
  hasNoDefaultFileNetworkOrProcessCapability: true as const,
  formalEvidenceRetrievalPlanIdentityRequired: true as const,
  formalEvidenceStoreSnapshotIdentityRequired: true as const,
  everyReadHashPayloadAndReceiptBatchBindsStoreSnapshot: true as const,
  finalVerificationDirectoryRetainsRetrievalPlanIdentity: true as const,
  fixedConcurrency: 1 as const,
  failurePolicy: 'fail-closed-no-partial-result' as const,
  verifierMustRemainIndependentFromAllEvidenceProducers: true as const,
  receiptLocatorAndShaMustRemainDistinctFromSourceAndOtherReceipts: true as const,
  releasesInjectedPortsAfterSettlement: true as const,
  producesA7PassOrReleaseApproval: false as const,
});
