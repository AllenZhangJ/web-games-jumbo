import {
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_CANDIDATE_V1,
  createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1,
  type ArenaV2A7FormalEvidenceReaderCandidateV1,
  type ArenaV2A7FormalEvidenceSha256HasherCandidateV1,
  type ArenaV2A7FormalEvidenceVerificationReceiptWriterCandidateV1,
} from '../src/arena-v2-a7-formal-evidence-retrieval-verifier-candidate-v1.js';
import type {
  ArenaV2A7FormalEvidenceRecordIndexEntryCandidateV3,
} from '../src/arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v3.js';

function sha(index: number): string {
  return index.toString(16).padStart(64, '0');
}

const RECORDS = Object.freeze([
  Object.freeze({
    recordId: 'formal-budget:test-policy',
    kind: 'formal-budget' as const,
    evidenceLocator: 'evidence://arena-v2/a7/test-only/formal-budget',
    evidenceMediaType: 'application/json',
    evidenceByteLength: 3,
    evidenceRecordedAtUtc: '2026-08-15T17:00:00.000Z',
    evidenceProducerId: 'formal-budget-producer',
    evidenceSha256: sha(1),
  }),
  Object.freeze({
    recordId: 'capture:test-capture',
    kind: 'capture' as const,
    evidenceLocator: 'evidence://arena-v2/a7/test-only/capture',
    evidenceMediaType: 'video/webm',
    evidenceByteLength: 2,
    evidenceRecordedAtUtc: '2026-08-15T17:10:00.000Z',
    evidenceProducerId: 'capture-producer',
    evidenceSha256: sha(2),
  }),
] satisfies readonly Readonly<ArenaV2A7FormalEvidenceRecordIndexEntryCandidateV3>[]);

const RECORD_INDEX_IDENTITY = createDeterministicDataHash(
  RECORDS,
  'Arena V2 A7 formal evidence record index candidate V3',
);
const RETRIEVAL_PLAN_IDENTITY = 'a7e10090';

const BYTES_BY_RECORD_ID = Object.freeze({
  'formal-budget:test-policy': new Uint8Array([1, 2, 3]),
  'capture:test-capture': new Uint8Array([4, 5]),
});

function receiptBatchResult(
  request: Parameters<
  ArenaV2A7FormalEvidenceVerificationReceiptWriterCandidateV1
  >[0],
) {
  return {
    verificationSessionIdentityHash: request.verificationSessionIdentityHash,
    retrievalPlanIdentityHash: request.retrievalPlanIdentityHash,
    recordIndexIdentityHash: request.recordIndexIdentityHash,
    storeSnapshotIdentityHash: request.storeSnapshotIdentityHash,
    receipts: request.receipts.map((entry, index) => ({
      recordId: entry.verificationPayload.recordId,
      recordIndexIdentityHash: request.recordIndexIdentityHash,
      verificationPayloadIdentityHash: entry.verificationPayloadIdentityHash,
      verificationReceiptLocator:
        `evidence://arena-v2/a7/test-only/actual-verification-receipt-${index}`,
      verificationReceiptMediaType: 'application/json',
      verificationReceiptByteLength: 100 + index,
      verificationReceiptSha256: sha(100 + index),
    })),
  };
}

function options(
  evidenceReader: ArenaV2A7FormalEvidenceReaderCandidateV1,
  sha256Hasher: ArenaV2A7FormalEvidenceSha256HasherCandidateV1,
  verificationReceiptWriter:
  ArenaV2A7FormalEvidenceVerificationReceiptWriterCandidateV1,
) {
  return {
    formalEvidenceRecordIndex: RECORDS,
    formalEvidenceRetrievalPlanIdentityHash: RETRIEVAL_PLAN_IDENTITY,
    formalEvidenceRecordIndexIdentityHash: RECORD_INDEX_IDENTITY,
    formalEvidenceStoreSnapshotIdentityHash: sha(91),
    verifierId: 'independent-evidence-verifier',
    verifiedAtUtc: '2026-08-15T18:00:00.000Z',
    retrievalAdapterId: 'evidence-store-reader-v1',
    sha256AdapterId: 'sha256-hasher-v1',
    receiptWriterAdapterId: 'verification-receipt-writer-v1',
    evidenceReader,
    sha256Hasher,
    verificationReceiptWriter,
  };
}

function validReader() {
  return async (
    request: Parameters<ArenaV2A7FormalEvidenceReaderCandidateV1>[0],
  ) => {
    const bytes = BYTES_BY_RECORD_ID[
      request.expectedRecord.recordId as keyof typeof BYTES_BY_RECORD_ID
    ];
    return {
      recordId: request.expectedRecord.recordId,
      evidenceLocator: request.expectedRecord.evidenceLocator,
      evidenceMediaType: request.expectedRecord.evidenceMediaType,
      evidenceRecordedAtUtc: request.expectedRecord.evidenceRecordedAtUtc,
      evidenceProducerId: request.expectedRecord.evidenceProducerId,
      bytes: new Uint8Array(bytes),
    };
  };
}

function validHasher() {
  return async (
    request: Parameters<ArenaV2A7FormalEvidenceSha256HasherCandidateV1>[0],
  ) => RECORDS.find(
    ({ recordId }) => recordId === request.recordId,
  )!.evidenceSha256;
}

function validWriter() {
  return async (
    request: Parameters<
    ArenaV2A7FormalEvidenceVerificationReceiptWriterCandidateV1
    >[0],
  ) => receiptBatchResult(request);
}

describe('Arena V2 A7 formal Evidence retrieval verifier candidate V1', () => {
  it('retrieves and hashes every record in order before one atomic receipt batch write', async () => {
    const calls: string[] = [];
    let active = 0;
    let maximumActive = 0;
    const verifier = createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1(options(
      async (request) => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        calls.push(`read:${request.expectedRecord.recordId}`);
        await Promise.resolve();
        active -= 1;
        return validReader()(request);
      },
      async (request) => {
        calls.push(`hash:${request.recordId}`);
        return validHasher()(request);
      },
      async (request) => {
        calls.push(`write:${request.receipts.length}`);
        expect(request.receipts.map(({ recordIndex }) => recordIndex)).toEqual([0, 1]);
        return receiptBatchResult(request);
      },
    ));

    const result = await verifier.start();
    expect(calls).toEqual([
      'read:formal-budget:test-policy',
      'hash:formal-budget:test-policy',
      'read:capture:test-capture',
      'hash:capture:test-capture',
      'write:2',
    ]);
    expect(maximumActive).toBe(1);
    expect(result).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      verificationStatus: 'completed',
      hardGate: false,
      formalEvidenceStoreSnapshotIdentityHash: sha(91),
      verificationReceiptCount: 2,
      totalVerificationReceiptBytes: 201,
    });
    expect(result.formalEvidenceRecordVerificationDirectory).toHaveLength(2);
    expect(result.formalEvidenceRecordVerificationDirectory.every((entry) => (
      entry.formalEvidenceStoreSnapshotIdentityHash === sha(91)
      && entry.formalEvidenceRetrievalPlanIdentityHash === RETRIEVAL_PLAN_IDENTITY
    ))).toBe(true);
    expect(result.verificationReceiptIndex.every((entry) => (
      /^[a-f0-9]{8}$/u.test(entry.verificationPayloadIdentityHash)
    ))).toBe(true);
    expect(result.verificationReceiptIndexIdentityHash).toMatch(/^[a-f0-9]{8}$/u);
    expect(result.identityHash).toMatch(/^[a-f0-9]{8}$/u);
    expect(verifier.state).toBe('completed');
    expect(verifier.getResult()).toBe(result);
  });

  it('fails closed before receipt writing when metadata, bytes or content SHA drifts', async () => {
    let writes = 0;
    const metadataDrift = createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1(options(
      async (request) => ({
        ...await validReader()(request),
        evidenceMediaType: 'text/plain',
      }),
      validHasher(),
      async (request) => {
        writes += 1;
        return receiptBatchResult(request);
      },
    ));
    await expect(metadataDrift.start()).rejects.toThrow(/observation发生漂移/u);
    expect(writes).toBe(0);
    expect(metadataDrift.state).toBe('failed');
    expect(() => metadataDrift.getResult()).toThrow(/尚无可读/u);

    const shaDrift = createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1(options(
      validReader(),
      async () => sha(999),
      async (request) => {
        writes += 1;
        return receiptBatchResult(request);
      },
    ));
    await expect(shaDrift.start()).rejects.toThrow(/读取内容SHA发生漂移/u);
    expect(writes).toBe(0);
  });

  it('rejects receipt batch identity drift and locator or SHA reuse without a result', async () => {
    const identityDrift = createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1(options(
      validReader(),
      validHasher(),
      async (request) => ({
        ...receiptBatchResult(request),
        verificationSessionIdentityHash: 'f'.repeat(8),
      }),
    ));
    await expect(identityDrift.start()).rejects.toThrow(/batch writer identity发生漂移/u);

    const snapshotDrift = createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1(options(
      validReader(),
      validHasher(),
      async (request) => ({
        ...receiptBatchResult(request),
        storeSnapshotIdentityHash: sha(999),
      }),
    ));
    await expect(snapshotDrift.start()).rejects.toThrow(/batch writer identity发生漂移/u);

    const duplicateLocator = createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1(options(
      validReader(),
      validHasher(),
      async (request) => {
        const result = receiptBatchResult(request);
        return {
          ...result,
          receipts: result.receipts.map((entry) => ({
            ...entry,
            verificationReceiptLocator:
              'evidence://arena-v2/a7/test-only/reused-receipt',
          })),
        };
      },
    ));
    await expect(duplicateLocator.start()).rejects.toThrow(/回执Locator发生复用/u);

    const sourceShaReuse = createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1(options(
      validReader(),
      validHasher(),
      async (request) => {
        const result = receiptBatchResult(request);
        return {
          ...result,
          receipts: result.receipts.map((entry, index) => ({
            ...entry,
            verificationReceiptSha256: index === 0
              ? RECORDS[0]!.evidenceSha256
              : entry.verificationReceiptSha256,
          })),
        };
      },
    ));
    await expect(sourceShaReuse.start()).rejects.toThrow(/回执SHA发生复用/u);
  });

  it('rejects index drift, producer/verifier overlap, early time and adapter aliasing', () => {
    const base = options(validReader(), validHasher(), validWriter());
    expect(() => createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1({
      ...base,
      formalEvidenceRecordIndexIdentityHash: 'f'.repeat(8),
    })).toThrow(/record index identity发生漂移/u);
    expect(() => createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1({
      ...base,
      verifierId: RECORDS[1]!.evidenceProducerId,
    })).toThrow(/不得兼任任一Evidence Producer/u);
    expect(() => createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1({
      ...base,
      verifiedAtUtc: '2026-08-15T17:05:00.000Z',
    })).toThrow(/核验时间早于记录/u);
    expect(() => createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1({
      ...base,
      sha256AdapterId: base.retrievalAdapterId,
    })).toThrow(/Adapter ID必须互异/u);
  });

  it('rejects hostile async returns and accessors, then preserves single-use lifecycle', async () => {
    let thenCalls = 0;
    const hostile = createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1(options(
      (() => ({
        then() {
          thenCalls += 1;
        },
      })) as unknown as ArenaV2A7FormalEvidenceReaderCandidateV1,
      validHasher(),
      validWriter(),
    ));
    await expect(hostile.start()).rejects.toThrow(/Promise/u);
    expect(thenCalls).toBe(0);

    let getterCalls = 0;
    const accessorResult = {
      recordId: RECORDS[0]!.recordId,
      evidenceLocator: RECORDS[0]!.evidenceLocator,
      evidenceMediaType: RECORDS[0]!.evidenceMediaType,
      evidenceRecordedAtUtc: RECORDS[0]!.evidenceRecordedAtUtc,
      evidenceProducerId: RECORDS[0]!.evidenceProducerId,
    } as Record<string, unknown>;
    Object.defineProperty(accessorResult, 'bytes', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return new Uint8Array([1, 2, 3]);
      },
    });
    const accessor = createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1(options(
      async () => accessorResult,
      validHasher(),
      validWriter(),
    ));
    await expect(accessor.start()).rejects.toThrow(/数据字段/u);
    expect(getterCalls).toBe(0);

    let verifier: ReturnType<
    typeof createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1
    >;
    verifier = createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1(options(
      async (request) => {
        expect(() => verifier.start()).toThrow(/running/u);
        expect(() => verifier.destroy()).toThrow(/运行中/u);
        return validReader()(request);
      },
      validHasher(),
      validWriter(),
    ));
    await verifier.start();
    verifier.destroy();
    verifier.destroy();
    expect(verifier.state).toBe('destroyed');
    expect(() => verifier.getResult()).toThrow(/尚无可读/u);
  });

  it('keeps the candidate production unreachable and without default I/O capability', () => {
    expect(ARENA_V2_A7_FORMAL_EVIDENCE_RETRIEVAL_VERIFIER_CANDIDATE_V1).toEqual({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      currentGate: 'incomplete',
      hardGate: false,
      defaultReleaseBundleWired: false,
      defaultEntryWired: false,
      validationStatus: 'not-run',
      readsOnlyThroughInjectedEvidenceReader: true,
      hashesOnlyThroughInjectedSha256Adapter: true,
      writesOnlyThroughInjectedReceiptWriter: true,
      receiptWriterMustCommitOneAtomicBatch: true,
      hasNoDefaultFileNetworkOrProcessCapability: true,
      formalEvidenceRetrievalPlanIdentityRequired: true,
      formalEvidenceStoreSnapshotIdentityRequired: true,
      everyReadHashPayloadAndReceiptBatchBindsStoreSnapshot: true,
      finalVerificationDirectoryRetainsRetrievalPlanIdentity: true,
      fixedConcurrency: 1,
      failurePolicy: 'fail-closed-no-partial-result',
      verifierMustRemainIndependentFromAllEvidenceProducers: true,
      receiptLocatorAndShaMustRemainDistinctFromSourceAndOtherReceipts: true,
      releasesInjectedPortsAfterSettlement: true,
      producesA7PassOrReleaseApproval: false,
    });
  });
});
