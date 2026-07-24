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
} from '@number-strategy-jump/arena-human-match-study-verification';
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
  type VerifiedEvidenceFile,
} from './evidence-file-verifier.js';
import {
  verifyArenaBuildManifestDirectory,
} from './arena-build-manifest-files.js';

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

type HumanFairnessDefinition = ReturnType<typeof createArenaStage9HumanFairnessV1Definition>;
type HumanFairnessBundle = ReturnType<typeof createHumanMatchStudyBundle>;

interface IngestWorkspaceEntry {
  readonly sourceSha256: string;
  readonly sourceByteLength: number;
  readonly revision: number;
  readonly receiptCount: number;
  readonly archivedPath: string;
}

interface IngestPackageEntry {
  readonly packageId: string;
  readonly enrollmentIndex: number;
  readonly sourceFileName: string;
  readonly sourceSha256: string;
  readonly sourceByteLength: number;
  readonly archivedPath: string;
}

interface IngestManifest {
  readonly schemaVersion: number;
  readonly definitionId: string;
  readonly definitionHash: string;
  readonly commit: string;
  readonly buildId: string;
  readonly workspace: IngestWorkspaceEntry;
  readonly packages: readonly IngestPackageEntry[];
}

function assertExactKeys(
  value: unknown,
  keys: ReadonlySet<string>,
  label: string,
): asserts value is Record<string, unknown> {
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

function canonicalJsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function sameDeterministicData(left: unknown, right: unknown, label: string): boolean {
  return createDeterministicDataHash(left, `${label} left`)
    === createDeterministicDataHash(right, `${label} right`);
}

function requiredVerifiedText(file: VerifiedEvidenceFile, label: string): string {
  if (file.text === null) throw new Error(`${label} 缺少文本内容。`);
  return file.text;
}

async function verifyReplays(
  definition: HumanFairnessDefinition,
  bundle: HumanFairnessBundle,
  rootValue: string,
) {
  const root = await resolveEvidenceRoot(rootValue);
  const paths = new Set<string>();
  const files = new Set<string>();
  const hashes = new Set<string>();
  const verifiedMatches: ReturnType<typeof verifyHumanMatchStudyReplay>[] = [];
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
        replay: JSON.parse(requiredVerifiedText(verifiedFile, artifact.path)) as unknown,
      }));
    }
  }
  return Object.freeze(verifiedMatches);
}

async function verifyIngestAudit(
  definition: HumanFairnessDefinition,
  bundle: HumanFairnessBundle,
  artifactsRootValue: string,
) {
  const artifactsRoot = await resolveEvidenceRoot(artifactsRootValue);
  const manifestSource = await readVerifiedEvidenceArtifact({
    root: artifactsRoot,
    relativePath: 'capture-package-manifest.json',
    expectedByteLength: null,
    expectedSha256: null,
    maximumBytes: MAXIMUM_INGEST_MANIFEST_BYTES,
    label: 'human fairness ingest manifest',
  });
  const manifestValue: unknown = JSON.parse(
    requiredVerifiedText(manifestSource, 'human fairness ingest manifest'),
  );
  assertExactKeys(manifestValue, INGEST_MANIFEST_KEYS, 'Human Match Study ingest manifest');
  const manifest = manifestValue as unknown as IngestManifest;
  if (
    manifest.schemaVersion !== 1
    || manifest.definitionId !== definition.id
    || manifest.definitionHash !== definition.getContentHash()
    || manifest.commit !== bundle.commit
    || manifest.buildId !== bundle.buildId
  ) throw new Error('Human Match Study ingest manifest 与 Bundle 身份不一致。');
  const workspaceValue = manifest.workspace;
  assertExactKeys(
    workspaceValue,
    INGEST_WORKSPACE_KEYS,
    'Human Match Study ingest manifest.workspace',
  );
  const manifestWorkspace = workspaceValue as unknown as IngestWorkspaceEntry;
  if (manifestWorkspace.archivedPath !== 'workspace-audit.json') {
    throw new Error('Human Match Study workspace audit 必须使用固定归档路径。');
  }
  const source = await readVerifiedEvidenceArtifact({
    root: artifactsRoot,
    relativePath: manifestWorkspace.archivedPath,
    expectedByteLength: manifestWorkspace.sourceByteLength,
    expectedSha256: manifestWorkspace.sourceSha256,
    maximumBytes: MAXIMUM_WORKSPACE_BYTES,
    label: 'human fairness workspace audit',
  });
  const workspace = createHumanMatchStudyWorkspace(
    definition,
    JSON.parse(requiredVerifiedText(source, 'human fairness workspace audit')) as unknown,
  );
  if (workspace.activeTrial !== null) {
    throw new Error('Human Match Study workspace audit 仍有 active trial。');
  }
  if (
    workspace.revision !== manifestWorkspace.revision
    || workspace.receipts.length !== manifestWorkspace.receiptCount
    || workspace.receipts.length !== bundle.records.length
  ) throw new Error('Human Match Study workspace receipts 与 Bundle records 数量不一致。');
  if (!Array.isArray(manifest.packages) || manifest.packages.length !== bundle.records.length) {
    throw new Error('Human Match Study ingest manifest packages 数量不一致。');
  }
  const paths = new Set<string>();
  for (const [index, receipt] of workspace.receipts.entries()) {
    const record = bundle.records[index];
    const packageEntryValue = manifest.packages[index];
    if (!record || packageEntryValue === undefined) {
      throw new Error(`Human Match Study ingest 索引 ${index} 缺失。`);
    }
    assertExactKeys(
      packageEntryValue,
      INGEST_PACKAGE_KEYS,
      `Human Match Study ingest manifest.packages[${index}]`,
    );
    const packageEntry = packageEntryValue as unknown as IngestPackageEntry;
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
      JSON.parse(requiredVerifiedText(rawSource, `human fairness raw capture package ${index}`)) as unknown,
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
      const recordMatch = record.matches[matchIndex];
      if (!recordMatch) throw new Error(`Bundle record ${index} 缺少 match ${matchIndex}。`);
      const artifact = recordMatch.replayArtifact;
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
}: Readonly<{
  bundleValue: unknown;
  artifactsRoot: string;
  buildRoot: string;
}>) {
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
