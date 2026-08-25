import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1,
} from '../../packages/arena-release/src/arena-v2-a7-formal-evidence-retrieval-verifier-candidate-v1.js';
import type {
  ArenaV2A7FormalEvidenceRecordIndexEntryCandidateV3,
} from '../../packages/arena-release/src/arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v3.js';
import {
  ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTERS_CANDIDATE_V1,
  ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTER_IDS_CANDIDATE_V1,
  createArenaV2A7FormalEvidenceStoreSnapshotManifestCandidateV1,
  createArenaV2A7FormalEvidenceStoreAdaptersCandidateV1,
  serializeArenaV2A7FormalEvidenceMetadataSidecarCandidateV1,
  serializeArenaV2A7FormalEvidenceStoreSnapshotManifestCandidateV1,
  serializeArenaV2A7FormalEvidenceVerificationReceiptCandidateV1,
} from '../../scripts/lib/arena-a7-formal-evidence-store-adapters-candidate-v1.js';
import {
  writeArenaEvidenceDirectoryExclusive,
} from '../../scripts/lib/arena-atomic-evidence-directory.js';

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function writeStoredRecord(
  root: string,
  record: Readonly<ArenaV2A7FormalEvidenceRecordIndexEntryCandidateV3>,
  bytes: Uint8Array,
): Promise<void> {
  const relativePath = record.evidenceLocator.slice('evidence://'.length);
  const filePath = path.join(root, ...relativePath.split('/'));
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
  await writeFile(
    `${filePath}.metadata.json`,
    serializeArenaV2A7FormalEvidenceMetadataSidecarCandidateV1({
      schemaVersion: 1,
      recordId: record.recordId,
      evidenceLocator: record.evidenceLocator,
      evidenceMediaType: record.evidenceMediaType,
      evidenceRecordedAtUtc: record.evidenceRecordedAtUtc,
      evidenceProducerId: record.evidenceProducerId,
    }),
  );
}

async function writeStoreSnapshot(
  root: string,
  recordIndexIdentityHash: string,
  recordCount: number,
  createdAtUtc = '2026-08-15T17:30:00.000Z',
): Promise<string> {
  const snapshot = createArenaV2A7FormalEvidenceStoreSnapshotManifestCandidateV1({
    schemaVersion: 1,
    snapshotId: 'adapter-test-snapshot',
    snapshotRevision: 'revision-001',
    createdAtUtc,
    formalEvidenceRecordIndexIdentityHash: recordIndexIdentityHash,
    formalEvidenceRecordCount: recordCount,
  });
  const snapshotPath = path.join(root, 'arena-v2', 'store-snapshot.json');
  await mkdir(path.dirname(snapshotPath), { recursive: true });
  await writeFile(
    snapshotPath,
    serializeArenaV2A7FormalEvidenceStoreSnapshotManifestCandidateV1(snapshot),
  );
  return snapshot.snapshotIdentityHash;
}

test('A7 Store Snapshot serializer produces one canonical text for reordered input', () => {
  const snapshot = createArenaV2A7FormalEvidenceStoreSnapshotManifestCandidateV1({
    schemaVersion: 1,
    snapshotId: 'adapter-test-serializer-snapshot',
    snapshotRevision: 'revision-001',
    createdAtUtc: '2026-08-15T17:30:00.000Z',
    formalEvidenceRecordIndexIdentityHash: 'a'.repeat(8),
    formalEvidenceRecordCount: 1,
  });
  const reordered = {
    snapshotIdentityHash: snapshot.snapshotIdentityHash,
    formalEvidenceRecordCount: snapshot.formalEvidenceRecordCount,
    formalEvidenceRecordIndexIdentityHash:
      snapshot.formalEvidenceRecordIndexIdentityHash,
    createdAtUtc: snapshot.createdAtUtc,
    snapshotRevision: snapshot.snapshotRevision,
    snapshotId: snapshot.snapshotId,
    schemaVersion: snapshot.schemaVersion,
  };

  assert.equal(
    serializeArenaV2A7FormalEvidenceStoreSnapshotManifestCandidateV1(reordered),
    serializeArenaV2A7FormalEvidenceStoreSnapshotManifestCandidateV1(snapshot),
  );
});

test('A7 Store Adapter factory owns and enforces all three adapter identities', async () => {
  const adapters = createArenaV2A7FormalEvidenceStoreAdaptersCandidateV1({
    evidenceRoot: os.tmpdir(),
    maximumEvidenceBytesPerRecord: 1_024,
    expectedEvidenceStoreSnapshotIdentityHash: 'a'.repeat(64),
  });
  assert.equal(
    adapters.retrievalAdapterId,
    ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTER_IDS_CANDIDATE_V1.retrievalAdapterId,
  );
  assert.equal(
    adapters.sha256AdapterId,
    ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTER_IDS_CANDIDATE_V1.sha256AdapterId,
  );
  assert.equal(
    adapters.receiptWriterAdapterId,
    ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTER_IDS_CANDIDATE_V1.receiptWriterAdapterId,
  );
  await assert.rejects(adapters.evidenceReader({
    schemaVersion: 1,
    verificationSessionIdentityHash: 'b'.repeat(8),
    retrievalPlanIdentityHash: 'c'.repeat(8),
    recordIndexIdentityHash: 'd'.repeat(8),
    storeSnapshotIdentityHash: 'a'.repeat(64),
    recordIndex: 0,
    recordCount: 1,
    expectedRecord: Object.freeze({
      recordId: 'capture:adapter-id-test',
      kind: 'capture' as const,
      evidenceLocator: 'evidence://arena-v2/a7/source/adapter-id-test.bin',
      evidenceMediaType: 'application/octet-stream',
      evidenceByteLength: 1,
      evidenceRecordedAtUtc: '2026-08-15T17:00:00.000Z',
      evidenceProducerId: 'adapter-id-test-producer',
      evidenceSha256: 'e'.repeat(64),
    }),
    retrievalAdapterId: 'spoofed-reader-v1',
  }), /Reader Adapter ID/u);
  await assert.rejects(adapters.sha256Hasher({
    schemaVersion: 1,
    verificationSessionIdentityHash: 'b'.repeat(8),
    retrievalPlanIdentityHash: 'c'.repeat(8),
    recordIndexIdentityHash: 'd'.repeat(8),
    storeSnapshotIdentityHash: 'a'.repeat(64),
    recordId: 'capture:adapter-id-test',
    evidenceLocator: 'evidence://arena-v2/a7/source/adapter-id-test.bin',
    sha256AdapterId: 'spoofed-hasher-v1',
    bytes: new Uint8Array([1]),
  }), /Hasher Adapter ID/u);
  await assert.rejects(adapters.verificationReceiptWriter({
    schemaVersion: 1,
    verificationSessionIdentityHash: 'b'.repeat(8),
    retrievalPlanIdentityHash: 'c'.repeat(8),
    recordIndexIdentityHash: 'd'.repeat(8),
    storeSnapshotIdentityHash: 'a'.repeat(64),
    receiptWriterAdapterId: 'spoofed-writer-v1',
    receipts: Object.freeze([]),
  }), /Receipt Writer Adapter ID/u);
  const payload = Object.freeze({
    schemaVersion: 1 as const,
    verificationSessionIdentityHash: 'b'.repeat(8),
    retrievalPlanIdentityHash: 'c'.repeat(8),
    recordIndexIdentityHash: 'd'.repeat(8),
    storeSnapshotIdentityHash: 'a'.repeat(64),
    recordId: 'capture:adapter-id-test',
    verifiedEvidenceLocator: 'evidence://arena-v2/a7/source/adapter-id-test.bin',
    verifiedEvidenceMediaType: 'application/octet-stream',
    verifiedEvidenceByteLength: 1,
    verifiedEvidenceRecordedAtUtc: '2026-08-15T17:00:00.000Z',
    verifiedEvidenceProducerId: 'adapter-id-test-producer',
    verifiedEvidenceSha256: 'e'.repeat(64),
    verifierId: 'adapter-id-test-verifier',
    verifiedAtUtc: '2026-08-15T18:00:00.000Z',
    ...ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTER_IDS_CANDIDATE_V1,
  });
  await assert.rejects(adapters.verificationReceiptWriter({
    schemaVersion: 1,
    verificationSessionIdentityHash: 'b'.repeat(8),
    retrievalPlanIdentityHash: 'c'.repeat(8),
    recordIndexIdentityHash: 'd'.repeat(8),
    storeSnapshotIdentityHash: 'a'.repeat(64),
    receiptWriterAdapterId: adapters.receiptWriterAdapterId,
    receipts: Object.freeze([Object.freeze({
      recordIndex: 0,
      recordCount: 1,
      verificationPayload: Object.freeze({
        ...payload,
        retrievalAdapterId: 'spoofed-reader-v1',
      }),
      verificationPayloadIdentityHash: 'f'.repeat(8),
    })]),
  }), /verificationPayload Adapter ID/u);
  await assert.rejects(adapters.verificationReceiptWriter({
    schemaVersion: 1,
    verificationSessionIdentityHash: 'b'.repeat(8),
    retrievalPlanIdentityHash: 'c'.repeat(8),
    recordIndexIdentityHash: 'd'.repeat(8),
    storeSnapshotIdentityHash: 'a'.repeat(64),
    receiptWriterAdapterId: adapters.receiptWriterAdapterId,
    receipts: Object.freeze([Object.freeze({
      recordIndex: 0,
      recordCount: 1,
      verificationPayload: payload,
      verificationPayloadIdentityHash: 'f'.repeat(8),
    })]),
  }), /verificationPayloadIdentityHash与Payload不闭合/u);
  await assert.rejects(adapters.verificationReceiptWriter({
    schemaVersion: 1,
    verificationSessionIdentityHash: 'b'.repeat(8),
    retrievalPlanIdentityHash: 'c'.repeat(8),
    recordIndexIdentityHash: 'd'.repeat(8),
    storeSnapshotIdentityHash: 'a'.repeat(64),
    receiptWriterAdapterId: adapters.receiptWriterAdapterId,
    receipts: Object.freeze([Object.freeze({
      recordIndex: 0,
      recordCount: 1,
      verificationPayload: payload,
      verificationPayloadIdentityHash: createDeterministicDataHash(
        payload,
        `Arena V2 A7 formal Evidence verification payload ${payload.recordId}`,
      ),
    })]),
  }), /Payload批次身份漂移/u);
  const oversizedPayload = Object.freeze({
    ...payload,
    verifiedEvidenceByteLength: 1_025,
  });
  await assert.rejects(adapters.verificationReceiptWriter({
    schemaVersion: 1,
    verificationSessionIdentityHash: 'b'.repeat(8),
    retrievalPlanIdentityHash: 'c'.repeat(8),
    recordIndexIdentityHash: 'd'.repeat(8),
    storeSnapshotIdentityHash: 'a'.repeat(64),
    receiptWriterAdapterId: adapters.receiptWriterAdapterId,
    receipts: Object.freeze([Object.freeze({
      recordIndex: 0,
      recordCount: 1,
      verificationPayload: oversizedPayload,
      verificationPayloadIdentityHash: createDeterministicDataHash(
        oversizedPayload,
        `Arena V2 A7 formal Evidence verification payload ${oversizedPayload.recordId}`,
      ),
    })]),
  }), /Payload超过显式单记录边界/u);
});

test('A7 Store Reader and Hasher reject non-canonical requests before Store work', async () => {
  const adapters = createArenaV2A7FormalEvidenceStoreAdaptersCandidateV1({
    evidenceRoot: path.join(os.tmpdir(), 'arena-a7-request-closure-must-not-read'),
    maximumEvidenceBytesPerRecord: 1_024,
    expectedEvidenceStoreSnapshotIdentityHash: 'a'.repeat(64),
  });
  const expectedRecord = {
    recordId: 'capture:request-closure',
    kind: 'capture' as const,
    evidenceLocator: 'evidence://arena-v2/a7/source/request-closure.bin',
    evidenceMediaType: 'application/octet-stream',
    evidenceByteLength: 1,
    evidenceRecordedAtUtc: '2026-08-15T17:00:00.000Z',
    evidenceProducerId: 'request-closure-producer',
    evidenceSha256: 'e'.repeat(64),
  };
  const readRequest = {
    schemaVersion: 1 as const,
    verificationSessionIdentityHash: 'b'.repeat(8),
    retrievalPlanIdentityHash: 'c'.repeat(8),
    recordIndexIdentityHash: 'd'.repeat(8),
    storeSnapshotIdentityHash: 'a'.repeat(64),
    recordIndex: 0,
    recordCount: 1,
    expectedRecord,
    retrievalAdapterId: adapters.retrievalAdapterId,
  };
  await assert.rejects(adapters.evidenceReader({
    ...readRequest,
    futureField: true,
  } as never), /字段集合不匹配/u);
  const accessorRecord = { ...expectedRecord };
  Object.defineProperty(accessorRecord, 'recordId', {
    enumerable: true,
    get: () => expectedRecord.recordId,
  });
  await assert.rejects(adapters.evidenceReader({
    ...readRequest,
    expectedRecord: accessorRecord,
  } as never), /数据字段/u);

  const hashRequest = {
    schemaVersion: 1 as const,
    verificationSessionIdentityHash: 'b'.repeat(8),
    retrievalPlanIdentityHash: 'c'.repeat(8),
    recordIndexIdentityHash: 'd'.repeat(8),
    storeSnapshotIdentityHash: 'a'.repeat(64),
    recordId: expectedRecord.recordId,
    evidenceLocator: expectedRecord.evidenceLocator,
    sha256AdapterId: adapters.sha256AdapterId,
    bytes: new Uint8Array([1]),
  };
  await assert.rejects(adapters.sha256Hasher({
    ...hashRequest,
    futureField: true,
  } as never), /字段集合不匹配/u);
  await assert.rejects(adapters.sha256Hasher({
    ...hashRequest,
    bytes: new Uint8Array(new SharedArrayBuffer(1)),
  }), /非共享Uint8Array/u);
});

test('A7 Store Reader closes canonical sidecar identity before reading Evidence bytes', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-a7-sidecar-identity-'));
  try {
    const expectedRecord = Object.freeze({
      recordId: 'capture:sidecar-identity',
      kind: 'capture' as const,
      evidenceLocator: 'evidence://arena-v2/a7/source/sidecar-identity.bin',
      evidenceMediaType: 'application/octet-stream',
      evidenceByteLength: 1,
      evidenceRecordedAtUtc: '2026-08-15T17:00:00.000Z',
      evidenceProducerId: 'sidecar-identity-producer',
      evidenceSha256: 'e'.repeat(64),
    });
    const recordIndexIdentityHash = createDeterministicDataHash(
      Object.freeze([expectedRecord]),
      'Arena V2 A7 formal evidence record index candidate V3',
    );
    const snapshotIdentityHash = await writeStoreSnapshot(
      root,
      recordIndexIdentityHash,
      1,
    );
    const relativePath = expectedRecord.evidenceLocator.slice('evidence://'.length);
    const evidencePath = path.join(root, ...relativePath.split('/'));
    await mkdir(path.dirname(evidencePath), { recursive: true });
    await writeFile(
      `${evidencePath}.metadata.json`,
      serializeArenaV2A7FormalEvidenceMetadataSidecarCandidateV1({
        schemaVersion: 1,
        recordId: expectedRecord.recordId,
        evidenceLocator: expectedRecord.evidenceLocator,
        evidenceMediaType: expectedRecord.evidenceMediaType,
        evidenceRecordedAtUtc: expectedRecord.evidenceRecordedAtUtc,
        evidenceProducerId: 'sidecar-identity-spoofed-producer',
      }),
    );
    const adapters = createArenaV2A7FormalEvidenceStoreAdaptersCandidateV1({
      evidenceRoot: root,
      maximumEvidenceBytesPerRecord: 1_024,
      expectedEvidenceStoreSnapshotIdentityHash: snapshotIdentityHash,
    });
    await assert.rejects(adapters.evidenceReader({
      schemaVersion: 1,
      verificationSessionIdentityHash: 'b'.repeat(8),
      retrievalPlanIdentityHash: 'c'.repeat(8),
      recordIndexIdentityHash,
      storeSnapshotIdentityHash: snapshotIdentityHash,
      recordIndex: 0,
      recordCount: 1,
      expectedRecord,
      retrievalAdapterId: adapters.retrievalAdapterId,
    }), /sidecar与Expected Record身份漂移/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('A7 Store Adapter pins the first resolved Evidence Root directory identity', async () => {
  const container = await mkdtemp(path.join(os.tmpdir(), 'arena-a7-root-identity-'));
  try {
    const firstRoot = path.join(container, 'first-root');
    const secondRoot = path.join(container, 'second-root');
    const rootAlias = path.join(container, 'current-root');
    await mkdir(firstRoot, { recursive: true });
    await mkdir(secondRoot, { recursive: true });
    const bytes = new Uint8Array([1, 2, 3]);
    const expectedRecord = Object.freeze({
      recordId: 'capture:root-identity',
      kind: 'capture' as const,
      evidenceLocator: 'evidence://arena-v2/a7/source/root-identity.bin',
      evidenceMediaType: 'application/octet-stream',
      evidenceByteLength: bytes.byteLength,
      evidenceRecordedAtUtc: '2026-08-15T17:00:00.000Z',
      evidenceProducerId: 'root-identity-producer',
      evidenceSha256: sha256(bytes),
    });
    const recordIndexIdentityHash = createDeterministicDataHash(
      Object.freeze([expectedRecord]),
      'Arena V2 A7 formal evidence record index candidate V3',
    );
    for (const root of [firstRoot, secondRoot]) {
      await writeStoredRecord(root, expectedRecord, bytes);
      await writeStoreSnapshot(root, recordIndexIdentityHash, 1);
    }
    const snapshotIdentityHash = await writeStoreSnapshot(
      firstRoot,
      recordIndexIdentityHash,
      1,
    );
    await symlink(firstRoot, rootAlias);
    const adapters = createArenaV2A7FormalEvidenceStoreAdaptersCandidateV1({
      evidenceRoot: rootAlias,
      maximumEvidenceBytesPerRecord: 1_024,
      expectedEvidenceStoreSnapshotIdentityHash: snapshotIdentityHash,
    });
    const request = Object.freeze({
      schemaVersion: 1 as const,
      verificationSessionIdentityHash: 'b'.repeat(8),
      retrievalPlanIdentityHash: 'c'.repeat(8),
      recordIndexIdentityHash,
      storeSnapshotIdentityHash: snapshotIdentityHash,
      recordIndex: 0,
      recordCount: 1,
      expectedRecord,
      retrievalAdapterId: adapters.retrievalAdapterId,
    });
    await adapters.evidenceReader(request);
    await rm(rootAlias, { force: true });
    await symlink(secondRoot, rootAlias);
    await assert.rejects(
      adapters.evidenceReader(request),
      /Root目录身份发生漂移/u,
    );
  } finally {
    await rm(container, { recursive: true, force: true });
  }
});

test('A7 Store Writer pins the first resolved receipt parent directory identity', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-a7-receipt-parent-'));
  try {
    const bytes = new Uint8Array([4, 5, 6]);
    const records = Object.freeze([Object.freeze({
      recordId: 'capture:receipt-parent-identity',
      kind: 'capture' as const,
      evidenceLocator: 'evidence://arena-v2/a7/source/receipt-parent-identity.bin',
      evidenceMediaType: 'application/octet-stream',
      evidenceByteLength: bytes.byteLength,
      evidenceRecordedAtUtc: '2026-08-15T17:00:00.000Z',
      evidenceProducerId: 'receipt-parent-identity-producer',
      evidenceSha256: sha256(bytes),
    })]);
    const recordIndexIdentityHash = createDeterministicDataHash(
      records,
      'Arena V2 A7 formal evidence record index candidate V3',
    );
    await writeStoredRecord(root, records[0]!, bytes);
    const snapshotIdentityHash = await writeStoreSnapshot(
      root,
      recordIndexIdentityHash,
      records.length,
    );
    const receiptParent = path.join(
      root,
      'arena-v2',
      'a7',
      'verification-receipts',
    );
    const firstReceiptStore = path.join(root, 'receipt-store-first');
    const secondReceiptStore = path.join(root, 'receipt-store-second');
    await mkdir(path.dirname(receiptParent), { recursive: true });
    await mkdir(firstReceiptStore, { recursive: true });
    await mkdir(secondReceiptStore, { recursive: true });
    await symlink(firstReceiptStore, receiptParent);
    const adapters = createArenaV2A7FormalEvidenceStoreAdaptersCandidateV1({
      evidenceRoot: root,
      maximumEvidenceBytesPerRecord: 1_024,
      expectedEvidenceStoreSnapshotIdentityHash: snapshotIdentityHash,
    });
    const createVerifier = (verifiedAtUtc: string) => (
      createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1({
        formalEvidenceRecordIndex: records,
        formalEvidenceRetrievalPlanIdentityHash: 'a'.repeat(8),
        formalEvidenceRecordIndexIdentityHash: recordIndexIdentityHash,
        formalEvidenceStoreSnapshotIdentityHash: snapshotIdentityHash,
        verifierId: 'receipt-parent-identity-verifier',
        verifiedAtUtc,
        ...adapters,
      })
    );
    await createVerifier('2026-08-15T18:00:00.000Z').start();
    await rm(receiptParent, { force: true });
    await symlink(secondReceiptStore, receiptParent);
    await assert.rejects(
      createVerifier('2026-08-15T18:01:00.000Z').start(),
      /Receipt Parent目录身份发生漂移/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('A7 explicit Store Adapters retrieve bytes and publish one committed receipt batch', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-a7-store-'));
  try {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const records = Object.freeze([Object.freeze({
      recordId: 'capture:adapter-test',
      kind: 'capture' as const,
      evidenceLocator: 'evidence://arena-v2/a7/source/adapter-test.bin',
      evidenceMediaType: 'application/octet-stream',
      evidenceByteLength: bytes.byteLength,
      evidenceRecordedAtUtc: '2026-08-15T17:00:00.000Z',
      evidenceProducerId: 'adapter-test-producer',
      evidenceSha256: sha256(bytes),
    })]);
    const recordIndexIdentity = createDeterministicDataHash(
      records,
      'Arena V2 A7 formal evidence record index candidate V3',
    );
    await writeStoredRecord(root, records[0]!, bytes);
    const storeSnapshotIdentity = await writeStoreSnapshot(
      root,
      recordIndexIdentity,
      records.length,
    );
    await mkdir(
      path.join(root, 'arena-v2', 'a7', 'verification-receipts'),
      { recursive: true },
    );
    const adapters = createArenaV2A7FormalEvidenceStoreAdaptersCandidateV1({
      evidenceRoot: root,
      maximumEvidenceBytesPerRecord: 1_024,
      expectedEvidenceStoreSnapshotIdentityHash: storeSnapshotIdentity,
    });
    const createVerifier = () => createArenaV2A7FormalEvidenceRetrievalVerifierCandidateV1({
      formalEvidenceRecordIndex: records,
      formalEvidenceRetrievalPlanIdentityHash: 'a'.repeat(8),
      formalEvidenceRecordIndexIdentityHash: recordIndexIdentity,
      formalEvidenceStoreSnapshotIdentityHash: storeSnapshotIdentity,
      verifierId: 'adapter-test-independent-verifier',
      verifiedAtUtc: '2026-08-15T18:00:00.000Z',
      ...adapters,
      retrievalAdapterId: 'node-evidence-store-reader-v1',
      sha256AdapterId: 'node-sha256-hasher-v1',
      receiptWriterAdapterId: 'node-receipt-writer-v1',
    });

    const verifier = createVerifier();
    const result = await verifier.start();
    assert.equal(result.verificationReceiptCount, 1);
    const receipt = result.formalEvidenceRecordVerificationDirectory[0]!;
    const receiptRelative = receipt.verificationReceiptLocator.slice('evidence://'.length);
    const receiptBytes = await readFile(path.join(root, ...receiptRelative.split('/')));
    assert.equal(receiptBytes.byteLength, receipt.verificationReceiptByteLength);
    assert.equal(sha256(receiptBytes), receipt.verificationReceiptSha256);
    assert.match(receipt.verificationReceiptLocator, /\/committed\/0000\.json$/u);
    const storedReceipt = JSON.parse(receiptBytes.toString('utf8')) as Record<string, unknown>;
    assert.equal(
      receiptBytes.toString('utf8'),
      serializeArenaV2A7FormalEvidenceVerificationReceiptCandidateV1({
        verificationPayloadIdentityHash: storedReceipt.verificationPayloadIdentityHash,
        verificationPayload: storedReceipt.verificationPayload,
        storeSnapshotIdentityHash: storedReceipt.storeSnapshotIdentityHash,
        recordIndexIdentityHash: storedReceipt.recordIndexIdentityHash,
        retrievalPlanIdentityHash: storedReceipt.retrievalPlanIdentityHash,
        verificationSessionIdentityHash: storedReceipt.verificationSessionIdentityHash,
        schemaVersion: storedReceipt.schemaVersion,
      }),
    );
    const receiptMetadataBytes = await readFile(
      path.join(root, ...`${receiptRelative}.metadata.json`.split('/')),
    );
    assert.equal(
      receiptMetadataBytes.toString('utf8'),
      serializeArenaV2A7FormalEvidenceMetadataSidecarCandidateV1({
        schemaVersion: 1,
        recordId: records[0]!.recordId,
        evidenceLocator: receipt.verificationReceiptLocator,
        evidenceMediaType: 'application/json',
        evidenceRecordedAtUtc: '2026-08-15T18:00:00.000Z',
        evidenceProducerId: adapters.receiptWriterAdapterId,
      }),
    );

    await assert.rejects(createVerifier().start(), /EEXIST|exist|存在/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('A7 Store Reader rejects a final-file symlink escaping the explicit root', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-a7-store-root-'));
  const outside = await mkdtemp(path.join(os.tmpdir(), 'arena-a7-store-outside-'));
  try {
    const bytes = new Uint8Array([9, 8, 7]);
    const record = Object.freeze({
      recordId: 'capture:escape-test',
      kind: 'capture' as const,
      evidenceLocator: 'evidence://arena-v2/a7/source/escape-test.bin',
      evidenceMediaType: 'application/octet-stream',
      evidenceByteLength: bytes.byteLength,
      evidenceRecordedAtUtc: '2026-08-15T17:00:00.000Z',
      evidenceProducerId: 'escape-test-producer',
      evidenceSha256: sha256(bytes),
    });
    const outsideFile = path.join(outside, 'escape-test.bin');
    await writeFile(outsideFile, bytes);
    const relativePath = record.evidenceLocator.slice('evidence://'.length);
    const filePath = path.join(root, ...relativePath.split('/'));
    await mkdir(path.dirname(filePath), { recursive: true });
    await symlink(outsideFile, filePath);
    await writeFile(`${filePath}.metadata.json`, serializeArenaV2A7FormalEvidenceMetadataSidecarCandidateV1({
      schemaVersion: 1,
      recordId: record.recordId,
      evidenceLocator: record.evidenceLocator,
      evidenceMediaType: record.evidenceMediaType,
      evidenceRecordedAtUtc: record.evidenceRecordedAtUtc,
      evidenceProducerId: record.evidenceProducerId,
    }));
    const storeSnapshotIdentity = await writeStoreSnapshot(root, 'd'.repeat(8), 1);
    const adapters = createArenaV2A7FormalEvidenceStoreAdaptersCandidateV1({
      evidenceRoot: root,
      maximumEvidenceBytesPerRecord: 1_024,
      expectedEvidenceStoreSnapshotIdentityHash: storeSnapshotIdentity,
    });
    await assert.rejects(adapters.evidenceReader({
      schemaVersion: 1,
      verificationSessionIdentityHash: 'b'.repeat(8),
      retrievalPlanIdentityHash: 'c'.repeat(8),
      recordIndexIdentityHash: 'd'.repeat(8),
      storeSnapshotIdentityHash: storeSnapshotIdentity,
      recordIndex: 0,
      recordCount: 1,
      expectedRecord: record,
      retrievalAdapterId: 'node-evidence-store-reader-v1',
    }), /逃逸证据根目录|symbolic|符号链接/u);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test('A7 Store Reader rejects evidence recorded after the pinned Store Snapshot', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-a7-store-timeline-'));
  try {
    const record = Object.freeze({
      recordId: 'capture:future-record',
      kind: 'capture' as const,
      evidenceLocator: 'evidence://arena-v2/a7/source/future-record.bin',
      evidenceMediaType: 'application/octet-stream',
      evidenceByteLength: 1,
      evidenceRecordedAtUtc: '2026-08-15T18:00:00.000Z',
      evidenceProducerId: 'future-record-producer',
      evidenceSha256: sha256(new Uint8Array([1])),
    });
    const recordIndexIdentity = createDeterministicDataHash(
      [record],
      'Arena V2 A7 formal evidence record index candidate V3',
    );
    const storeSnapshotIdentity = await writeStoreSnapshot(
      root,
      recordIndexIdentity,
      1,
      '2026-08-15T17:30:00.000Z',
    );
    const adapters = createArenaV2A7FormalEvidenceStoreAdaptersCandidateV1({
      evidenceRoot: root,
      maximumEvidenceBytesPerRecord: 1_024,
      expectedEvidenceStoreSnapshotIdentityHash: storeSnapshotIdentity,
    });
    await assert.rejects(adapters.evidenceReader({
      schemaVersion: 1,
      verificationSessionIdentityHash: 'a'.repeat(8),
      retrievalPlanIdentityHash: 'b'.repeat(8),
      recordIndexIdentityHash: recordIndexIdentity,
      storeSnapshotIdentityHash: storeSnapshotIdentity,
      recordIndex: 0,
      recordCount: 1,
      expectedRecord: record,
      retrievalAdapterId: 'node-evidence-store-reader-v1',
    }), /Snapshot早于记录/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('A7 Store Reader rejects a semantically equal non-canonical Snapshot Manifest', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-a7-store-canonical-snapshot-'));
  try {
    const record = Object.freeze({
      recordId: 'capture:canonical-snapshot-test',
      kind: 'capture' as const,
      evidenceLocator: 'evidence://arena-v2/a7/source/canonical-snapshot-test.bin',
      evidenceMediaType: 'application/octet-stream',
      evidenceByteLength: 1,
      evidenceRecordedAtUtc: '2026-08-15T17:00:00.000Z',
      evidenceProducerId: 'canonical-snapshot-test-producer',
      evidenceSha256: sha256(new Uint8Array([1])),
    });
    const recordIndexIdentity = createDeterministicDataHash(
      [record],
      'Arena V2 A7 formal evidence record index candidate V3',
    );
    const snapshot = createArenaV2A7FormalEvidenceStoreSnapshotManifestCandidateV1({
      schemaVersion: 1,
      snapshotId: 'adapter-test-non-canonical-snapshot',
      snapshotRevision: 'revision-001',
      createdAtUtc: '2026-08-15T17:30:00.000Z',
      formalEvidenceRecordIndexIdentityHash: recordIndexIdentity,
      formalEvidenceRecordCount: 1,
    });
    const snapshotPath = path.join(root, 'arena-v2', 'store-snapshot.json');
    await mkdir(path.dirname(snapshotPath), { recursive: true });
    await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
    const adapters = createArenaV2A7FormalEvidenceStoreAdaptersCandidateV1({
      evidenceRoot: root,
      maximumEvidenceBytesPerRecord: 1_024,
      expectedEvidenceStoreSnapshotIdentityHash: snapshot.snapshotIdentityHash,
    });

    await assert.rejects(adapters.evidenceReader({
      schemaVersion: 1,
      verificationSessionIdentityHash: 'a'.repeat(8),
      retrievalPlanIdentityHash: 'b'.repeat(8),
      recordIndexIdentityHash: recordIndexIdentity,
      storeSnapshotIdentityHash: snapshot.snapshotIdentityHash,
      recordIndex: 0,
      recordCount: 1,
      expectedRecord: record,
      retrievalAdapterId: 'node-evidence-store-reader-v1',
    }), /唯一规范字节/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('A7 Store Reader rejects a semantically equal non-canonical metadata sidecar', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-a7-store-canonical-sidecar-'));
  try {
    const bytes = new Uint8Array([7]);
    const record = Object.freeze({
      recordId: 'capture:canonical-sidecar-test',
      kind: 'capture' as const,
      evidenceLocator: 'evidence://arena-v2/a7/source/canonical-sidecar-test.bin',
      evidenceMediaType: 'application/octet-stream',
      evidenceByteLength: bytes.byteLength,
      evidenceRecordedAtUtc: '2026-08-15T17:00:00.000Z',
      evidenceProducerId: 'canonical-sidecar-test-producer',
      evidenceSha256: sha256(bytes),
    });
    const recordIndexIdentity = createDeterministicDataHash(
      [record],
      'Arena V2 A7 formal evidence record index candidate V3',
    );
    const storeSnapshotIdentity = await writeStoreSnapshot(
      root,
      recordIndexIdentity,
      1,
    );
    const relativePath = record.evidenceLocator.slice('evidence://'.length);
    const filePath = path.join(root, ...relativePath.split('/'));
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes);
    await writeFile(`${filePath}.metadata.json`, `${JSON.stringify({
      schemaVersion: 1,
      recordId: record.recordId,
      evidenceLocator: record.evidenceLocator,
      evidenceMediaType: record.evidenceMediaType,
      evidenceRecordedAtUtc: record.evidenceRecordedAtUtc,
      evidenceProducerId: record.evidenceProducerId,
    }, null, 2)}\n`);
    const adapters = createArenaV2A7FormalEvidenceStoreAdaptersCandidateV1({
      evidenceRoot: root,
      maximumEvidenceBytesPerRecord: 1_024,
      expectedEvidenceStoreSnapshotIdentityHash: storeSnapshotIdentity,
    });

    await assert.rejects(adapters.evidenceReader({
      schemaVersion: 1,
      verificationSessionIdentityHash: 'a'.repeat(8),
      retrievalPlanIdentityHash: 'b'.repeat(8),
      recordIndexIdentityHash: recordIndexIdentity,
      storeSnapshotIdentityHash: storeSnapshotIdentity,
      recordIndex: 0,
      recordCount: 1,
      expectedRecord: record,
      retrievalAdapterId: 'node-evidence-store-reader-v1',
    }), /metadata sidecar必须使用唯一规范字节/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('atomic Evidence directory leaves no committed target when prepublish fails', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-a7-atomic-directory-'));
  const target = path.join(root, 'session');
  try {
    await assert.rejects(writeArenaEvidenceDirectoryExclusive(
      target,
      [{ relativePath: 'receipt.json', contents: '{}\n' }],
      { beforePublish: () => { throw new Error('stop before publish'); } },
    ), /stop before publish/u);
    await assert.rejects(readFile(path.join(target, 'committed', 'receipt.json')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('atomic Evidence directory removes only its new session when postpublish readback fails', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-a7-atomic-readback-'));
  const target = path.join(root, 'session');
  try {
    await assert.rejects(writeArenaEvidenceDirectoryExclusive(
      target,
      [{ relativePath: 'receipt.json', contents: '{}\n' }],
      {
        afterPublish: async (committedDirectoryPath) => {
          assert.equal(committedDirectoryPath, path.join(target, 'committed'));
          assert.equal(
            await readFile(path.join(committedDirectoryPath, 'receipt.json'), 'utf8'),
            '{}\n',
          );
          throw new Error('stop after readback');
        },
      },
    ), /stop after readback/u);
    await assert.rejects(readFile(path.join(target, 'committed', 'receipt.json')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('A7 Store Adapter metadata remains deferred and not default wired', () => {
  assert.deepEqual(ARENA_V2_A7_FORMAL_EVIDENCE_STORE_ADAPTERS_CANDIDATE_V1, {
    status: 'production-unreachable',
    implementationStatus: 'code-written-not-run',
    currentGate: 'incomplete',
    hardGate: false,
    defaultReleaseBundleWired: false,
    defaultEntryWired: false,
    validationStatus: 'not-run',
    explicitEvidenceRootRequired: true,
    evidenceRootDirectoryIdentityPinnedByFactory: true,
    evidenceRootIdentityRevalidatedBeforeReadWriteAndReturn: true,
    receiptParentDirectoryIdentityPinnedByFactory: true,
    receiptParentIdentityRevalidatedBeforeCommittedReturn: true,
    expectedEvidenceStoreSnapshotIdentityRequired: true,
    adapterIdsOwnedAndEnforcedByFactory: true,
    readerAndHasherRequestsCanonicalizedBeforeUse: true,
    hasherCopiesNonSharedBytesBeforeHashing: true,
    readerSidecarMatchesExpectedRecordBeforeEvidenceRead: true,
    writerPayloadRespectsFactoryByteLimitBeforeIo: true,
    writerClosesBatchIdentityBeforeIo: true,
    writerRecomputesSessionIdentityFromEveryPayload: true,
    writerValidatesCanonicalPayloadAndRecomputesIdentityHash: true,
    writerRejectsNestedAdapterIdentitySpoofingBeforeIo: true,
    readerHasherAndWriterPinnedToSameSnapshot: true,
    storeSnapshotManifestRequiredAtCanonicalRootPath: true,
    storeSnapshotManifestRevalidatedBeforeReadWriteAndReturn: true,
    storeSnapshotManifestRevalidatedAfterEveryEvidenceRead: true,
    storeSnapshotCreatedAtMustCoverEveryEvidenceRecord: true,
    storeSnapshotManifestMustUseCanonicalExactBytes: true,
    canonicalStoreSnapshotManifestSerializerProvided: true,
    sidecarMetadataRequired: true,
    sourceMetadataSidecarMustUseCanonicalExactBytes: true,
    canonicalSourceMetadataSidecarSerializerProvided: true,
    receiptMetadataUsesCanonicalSidecarSerializer: true,
    receiptBodyUsesCanonicalSerializer: true,
    stableOpenFileAndPathIdentityRequired: true,
    symlinkEscapeRejected: true,
    explicitPerRecordByteLimitRequired: true,
    sha256ComputedFromRetrievedBytes: true,
    receiptBatchPublishedThroughCommittedDirectory: true,
    committedReceiptBatchReadBackBeforeReturn: true,
    committedReceiptBytesMetadataAndShaMustMatch: true,
    readbackFailureRemovesOnlyNewSession: true,
    receiptParentMustBePreprovisioned: true,
    existingReceiptSessionCannotBeOverwritten: true,
    defaultProductionWiringProvided: false,
  });
});
