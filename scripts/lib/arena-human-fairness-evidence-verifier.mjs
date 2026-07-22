import { createHash } from 'node:crypto';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  createArenaStage9HumanFairnessV1Definition,
} from '@number-strategy-jump/arena-human-match-study';
import {
  createHumanMatchStudyBundle,
} from '@number-strategy-jump/arena-human-match-study';
import {
  createHumanMatchStudyReport,
} from '@number-strategy-jump/arena-human-match-study';
import {
  verifyHumanMatchStudyReplay,
} from '../../src/arena/study/human-match-study-replay-verifier.js';
import {
  materializeHumanMatchStudyCapturePackage,
  validateHumanMatchStudyCapturePackage,
} from '@number-strategy-jump/arena-human-match-study';
import {
  createHumanMatchStudyWorkspace,
} from '@number-strategy-jump/arena-human-match-study';
import {
  readVerifiedEvidenceArtifact,
  resolveEvidenceRoot,
} from './evidence-file-verifier.mjs';
import {
  verifyArenaBuildManifestDirectory,
} from './arena-build-manifest-files.mjs';

const MAXIMUM_REPLAY_BYTES = 64 * 1024 * 1024;
const MAXIMUM_WORKSPACE_BYTES = 5 * 1024 * 1024;
const MAXIMUM_INGEST_MANIFEST_BYTES = 5 * 1024 * 1024;
const MAXIMUM_CAPTURE_PACKAGE_BYTES = 256 * 1024 * 1024;

const INGEST_MANIFEST_KEYS = new Set([
  'schemaVersion',
  'definitionId',
  'definitionHash',
  'commit',
  'buildId',
  'workspace',
  'packages',
]);
const INGEST_WORKSPACE_KEYS = new Set([
  'sourceSha256',
  'sourceByteLength',
  'revision',
  'receiptCount',
  'archivedPath',
]);
const INGEST_PACKAGE_KEYS = new Set([
  'packageId',
  'enrollmentIndex',
  'sourceFileName',
  'sourceSha256',
  'sourceByteLength',
  'archivedPath',
]);

function assertExactKeys(value, keys, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} 必须是对象。`);
  }
  for (const key of Object.keys(value)) {
    if (!keys.has(key)) throw new RangeError(`${label} 包含未知字段 ${key}。`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new RangeError(`${label} 缺少字段 ${key}。`);
  }
}

function canonicalJsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function sameDeterministicData(left, right, label) {
  return createDeterministicDataHash(left, `${label} left`)
    === createDeterministicDataHash(right, `${label} right`);
}

async function verifyReplays(definition, bundle, rootValue) {
  const root = await resolveEvidenceRoot(rootValue);
  const paths = new Set();
  const files = new Set();
  const hashes = new Set();
  const verifiedMatches = [];
  for (const record of bundle.records) {
    for (const match of record.matches) {
      const artifact = match.replayArtifact;
      const verifiedFile = await readVerifiedEvidenceArtifact({
        root,
        relativePath: artifact.path,
        expectedByteLength: artifact.byteLength,
        expectedSha256: artifact.sha256,
        maximumBytes: MAXIMUM_REPLAY_BYTES,
        label: `replay artifact ${artifact.path}`,
      });
      if (paths.has(verifiedFile.resolvedPath)) {
        throw new Error(`replay artifact ${artifact.path} 重复使用同一路径。`);
      }
      if (files.has(verifiedFile.fileIdentity)) {
        throw new Error(`replay artifact ${artifact.path} 重复使用同一文件。`);
      }
      if (hashes.has(verifiedFile.sha256)) {
        throw new Error(`replay artifact ${artifact.path} 重复使用相同内容。`);
      }
      paths.add(verifiedFile.resolvedPath);
      files.add(verifiedFile.fileIdentity);
      hashes.add(verifiedFile.sha256);
      verifiedMatches.push(verifyHumanMatchStudyReplay({
        definition,
        record,
        matchIndex: match.matchIndex,
        replay: JSON.parse(verifiedFile.text),
      }));
    }
  }
  return Object.freeze(verifiedMatches);
}

async function verifyIngestAudit(definition, bundle, artifactsRootValue) {
  const artifactsRoot = await resolveEvidenceRoot(artifactsRootValue);
  const manifestSource = await readVerifiedEvidenceArtifact({
    root: artifactsRoot,
    relativePath: 'capture-package-manifest.json',
    expectedByteLength: null,
    expectedSha256: null,
    maximumBytes: MAXIMUM_INGEST_MANIFEST_BYTES,
    label: 'human fairness ingest manifest',
  });
  const manifest = JSON.parse(manifestSource.text);
  assertExactKeys(manifest, INGEST_MANIFEST_KEYS, 'Human Match Study ingest manifest');
  if (
    manifest.schemaVersion !== 1
    || manifest.definitionId !== definition.id
    || manifest.definitionHash !== definition.getContentHash()
    || manifest.commit !== bundle.commit
    || manifest.buildId !== bundle.buildId
  ) throw new Error('Human Match Study ingest manifest 与 Bundle 身份不一致。');
  assertExactKeys(
    manifest.workspace,
    INGEST_WORKSPACE_KEYS,
    'Human Match Study ingest manifest.workspace',
  );
  if (manifest.workspace.archivedPath !== 'workspace-audit.json') {
    throw new Error('Human Match Study workspace audit 必须使用固定归档路径。');
  }
  const source = await readVerifiedEvidenceArtifact({
    root: artifactsRoot,
    relativePath: manifest.workspace.archivedPath,
    expectedByteLength: manifest.workspace.sourceByteLength,
    expectedSha256: manifest.workspace.sourceSha256,
    maximumBytes: MAXIMUM_WORKSPACE_BYTES,
    label: 'human fairness workspace audit',
  });
  const workspace = createHumanMatchStudyWorkspace(definition, JSON.parse(source.text));
  if (workspace.activeTrial !== null) {
    throw new Error('Human Match Study workspace audit 仍有 active trial。');
  }
  if (
    workspace.revision !== manifest.workspace.revision
    || workspace.receipts.length !== manifest.workspace.receiptCount
    || workspace.receipts.length !== bundle.records.length
  ) throw new Error('Human Match Study workspace receipts 与 Bundle records 数量不一致。');
  if (!Array.isArray(manifest.packages) || manifest.packages.length !== bundle.records.length) {
    throw new Error('Human Match Study ingest manifest packages 数量不一致。');
  }
  const paths = new Set();
  for (const [index, receipt] of workspace.receipts.entries()) {
    const record = bundle.records[index];
    const packageEntry = manifest.packages[index];
    assertExactKeys(
      packageEntry,
      INGEST_PACKAGE_KEYS,
      `Human Match Study ingest manifest.packages[${index}]`,
    );
    if (
      receipt.trialId !== record.recordId
      || receipt.assignment.assignmentId !== record.assignment.assignmentId
      || receipt.assignment.enrollmentIndex !== record.assignment.enrollmentIndex
      || receipt.status !== record.status
      || receipt.terminationReason !== record.terminationReason
      || packageEntry.packageId !== receipt.packageReceipt.packageId
      || packageEntry.enrollmentIndex !== record.assignment.enrollmentIndex
      || packageEntry.sourceFileName !== receipt.packageReceipt.fileName
      || packageEntry.sourceSha256 !== receipt.packageReceipt.sha256
      || packageEntry.sourceByteLength !== receipt.packageReceipt.byteLength
      || paths.has(packageEntry.archivedPath)
    ) throw new Error(`workspace/package receipt ${index} 与 Bundle record 不一致。`);
    paths.add(packageEntry.archivedPath);
    const rawSource = await readVerifiedEvidenceArtifact({
      root: artifactsRoot,
      relativePath: packageEntry.archivedPath,
      expectedByteLength: packageEntry.sourceByteLength,
      expectedSha256: packageEntry.sourceSha256,
      maximumBytes: MAXIMUM_CAPTURE_PACKAGE_BYTES,
      label: `human fairness raw capture package ${index}`,
    });
    const capturePackage = validateHumanMatchStudyCapturePackage(
      definition,
      JSON.parse(rawSource.text),
    );
    if (
      capturePackage.packageId !== packageEntry.packageId
      || capturePackage.recordId !== record.recordId
      || capturePackage.commit !== record.commit
      || capturePackage.buildId !== record.buildId
    ) throw new Error(`raw capture package ${index} 与 Bundle record 身份不一致。`);
    const materialized = materializeHumanMatchStudyCapturePackage(
      definition,
      capturePackage,
      record.matches.map(({ replayArtifact }) => replayArtifact),
    );
    if (!sameDeterministicData(
      materialized,
      record,
      `Human Match Study materialized record ${index}`,
    )) throw new Error(`raw capture package ${index} 无法重建 Bundle record。`);
    for (const [matchIndex, match] of capturePackage.matches.entries()) {
      const bytes = canonicalJsonBytes(match.replay);
      const artifact = record.matches[matchIndex].replayArtifact;
      if (
        bytes.byteLength !== artifact.byteLength
        || createHash('sha256').update(bytes).digest('hex') !== artifact.sha256
      ) throw new Error(`raw capture package ${index} match ${matchIndex} 与 Replay 不一致。`);
    }
  }
  return Object.freeze({
    revision: workspace.revision,
    receiptCount: workspace.receipts.length,
    sha256: source.sha256,
    ingestManifestSha256: manifestSource.sha256,
    rawPackageCount: manifest.packages.length,
  });
}

export async function verifyArenaHumanFairnessEvidence({
  bundleValue,
  artifactsRoot,
  buildRoot,
}) {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const buildManifest = await verifyArenaBuildManifestDirectory(
    buildRoot,
    { requireCleanSource: true },
  );
  if (buildManifest.target !== 'web' || buildManifest.getArtifact('study.html') === null) {
    throw new Error('Human Match Study 必须绑定包含 study.html 的 clean Web 构建。');
  }
  const bundle = createHumanMatchStudyBundle(definition, bundleValue);
  if (bundle.commit !== buildManifest.commit || bundle.buildId !== buildManifest.buildId) {
    throw new Error('Human Match Study Bundle 与 clean Web build 不一致。');
  }
  const workspaceAudit = await verifyIngestAudit(definition, bundle, artifactsRoot);
  const report = createHumanMatchStudyReport(definition, bundle.records);
  const verifiedMatches = await verifyReplays(definition, bundle, artifactsRoot);
  return Object.freeze({
    definition,
    bundle,
    buildManifest,
    workspaceAudit,
    verifiedMatches,
    report,
  });
}
