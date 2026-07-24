import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createArenaStage7FormalAssetBudgetV1Policy } from '../../src/arena/presentation/assets/formal-asset-budget-policy.js';
import {
  readVerifiedEvidenceArtifact,
  resolveEvidenceRoot,
} from '../lib/evidence-file-verifier.js';
import { loadRepositoryPolicy } from './repository-policy.js';

const DEFAULT_MANIFEST = 'governance/third-party/arena-runtime-assets-v1.json';
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const UTC_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const FLOATING_REVISIONS = new Set(['head', 'latest', 'main', 'master', 'stable', 'trunk']);

interface ArtifactRecord {
  readonly id: string;
  readonly path: string;
  readonly sha256: string;
  readonly byteLength: number;
}

interface SourceRecord {
  readonly id: string;
  readonly locator: string;
  readonly revision: string;
  readonly license: ArtifactRecord & Readonly<{ id: string }>;
  readonly proof: Omit<ArtifactRecord, 'id'>;
  readonly artifacts: readonly ArtifactRecord[];
}

interface ThirdPartyManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly approvedBy: string;
  readonly approvedAt: string;
  readonly sources: readonly SourceRecord[];
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} 必须是对象。`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.join('\0') !== wanted.join('\0')) {
    throw new RangeError(`${label} 字段不符合契约。`);
  }
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} 不能为空。`);
  return value;
}

function artifact(value: unknown, label: string, withId: boolean): ArtifactRecord {
  const source = object(value, label);
  exactKeys(source, withId
    ? ['id', 'path', 'sha256', 'byteLength']
    : ['path', 'sha256', 'byteLength'], label);
  const sha256 = text(source.sha256, `${label}.sha256`);
  if (!SHA256_PATTERN.test(sha256)) throw new RangeError(`${label}.sha256 不合法。`);
  if (!Number.isSafeInteger(source.byteLength) || Number(source.byteLength) < 1) {
    throw new RangeError(`${label}.byteLength 必须是正安全整数。`);
  }
  return Object.freeze({
    id: withId ? text(source.id, `${label}.id`) : label,
    path: text(source.path, `${label}.path`),
    sha256,
    byteLength: Number(source.byteLength),
  });
}

function parseManifest(value: unknown, expectedApprover: string): ThirdPartyManifest {
  const source = object(value, 'ThirdPartyManifest');
  exactKeys(source, ['schemaVersion', 'id', 'approvedBy', 'approvedAt', 'sources'], 'ThirdPartyManifest');
  if (source.schemaVersion !== 1) throw new RangeError('ThirdPartyManifest.schemaVersion 必须为 1。');
  if (text(source.approvedBy, 'ThirdPartyManifest.approvedBy') !== expectedApprover) {
    throw new RangeError(`ThirdPartyManifest.approvedBy 必须是项目负责人 ${expectedApprover}。`);
  }
  const approvedAt = text(source.approvedAt, 'ThirdPartyManifest.approvedAt');
  if (!UTC_INSTANT_PATTERN.test(approvedAt) || Number.isNaN(Date.parse(approvedAt))) {
    throw new RangeError('ThirdPartyManifest.approvedAt 必须是 UTC 时间。');
  }
  if (!Array.isArray(source.sources) || source.sources.length === 0) {
    throw new RangeError('ThirdPartyManifest.sources 不能为空。');
  }
  const sources = source.sources.map((valueItem, sourceIndex) => {
    const label = `ThirdPartyManifest.sources[${sourceIndex}]`;
    const item = object(valueItem, label);
    exactKeys(item, ['id', 'locator', 'revision', 'license', 'proof', 'artifacts'], label);
    const locator = text(item.locator, `${label}.locator`);
    if (!locator.startsWith('https://')) throw new RangeError(`${label}.locator 必须使用 HTTPS。`);
    const revision = text(item.revision, `${label}.revision`);
    if (FLOATING_REVISIONS.has(revision.toLowerCase())) {
      throw new RangeError(`${label}.revision 不能是浮动版本 ${revision}。`);
    }
    const licenseSource = object(item.license, `${label}.license`);
    exactKeys(licenseSource, ['id', 'path', 'sha256', 'byteLength'], `${label}.license`);
    const licenseArtifact = artifact(licenseSource, `${label}.license`, true);
    const proofArtifact = artifact(item.proof, `${label}.proof`, false);
    if (!Array.isArray(item.artifacts) || item.artifacts.length === 0) {
      throw new RangeError(`${label}.artifacts 不能为空。`);
    }
    return Object.freeze({
      id: text(item.id, `${label}.id`),
      locator,
      revision,
      license: Object.freeze({ ...licenseArtifact, id: text(licenseSource.id, `${label}.license.id`) }),
      proof: Object.freeze({
        path: proofArtifact.path,
        sha256: proofArtifact.sha256,
        byteLength: proofArtifact.byteLength,
      }),
      artifacts: Object.freeze(item.artifacts.map((entry, artifactIndex) => (
        artifact(entry, `${label}.artifacts[${artifactIndex}]`, true)
      ))),
    });
  });
  return Object.freeze({
    schemaVersion: 1,
    id: text(source.id, 'ThirdPartyManifest.id'),
    approvedBy: expectedApprover,
    approvedAt,
    sources: Object.freeze(sources),
  });
}

export async function verifyThirdPartyAssets(options: Readonly<{
  repositoryRoot?: string;
  manifestPath?: string;
  expectedApprover?: string;
}> = {}): Promise<Readonly<{ sourceCount: number; artifactCount: number }>> {
  const repositoryRoot = path.resolve(options.repositoryRoot ?? process.cwd());
  const root = await resolveEvidenceRoot(repositoryRoot);
  const manifestPath = options.manifestPath ?? DEFAULT_MANIFEST;
  const expectedApprover = options.expectedApprover
    ?? (await loadRepositoryPolicy(repositoryRoot)).owner.name;
  const manifest = parseManifest(
    JSON.parse(await readFile(path.join(repositoryRoot, manifestPath), 'utf8')) as unknown,
    expectedApprover,
  );
  const expected = createArenaStage7FormalAssetBudgetV1Policy().artifacts
    .map(({ id, path: artifactPath }) => `${id}\0${artifactPath}`)
    .sort();
  const actual: string[] = [];
  const sourceIds = new Set<string>();
  const artifactIds = new Set<string>();
  const artifactPaths = new Set<string>();
  for (const source of manifest.sources) {
    if (sourceIds.has(source.id)) throw new RangeError(`重复的第三方来源 ${source.id}。`);
    sourceIds.add(source.id);
    for (const evidence of [source.license, source.proof]) {
      await readVerifiedEvidenceArtifact({
        root,
        relativePath: evidence.path,
        expectedSha256: evidence.sha256,
        expectedByteLength: evidence.byteLength,
        maximumBytes: 1024 * 1024,
        includeText: false,
        label: `third-party evidence ${evidence.path}`,
      });
    }
    for (const entry of source.artifacts) {
      if (artifactIds.has(entry.id)) throw new RangeError(`重复的第三方产物 ID ${entry.id}。`);
      if (artifactPaths.has(entry.path)) throw new RangeError(`重复的第三方产物路径 ${entry.path}。`);
      artifactIds.add(entry.id);
      artifactPaths.add(entry.path);
      actual.push(`${entry.id}\0${entry.path}`);
      await readVerifiedEvidenceArtifact({
        root,
        relativePath: entry.path,
        expectedSha256: entry.sha256,
        expectedByteLength: entry.byteLength,
        maximumBytes: 64 * 1024 * 1024,
        includeText: false,
        label: `third-party artifact ${entry.path}`,
      });
    }
  }
  actual.sort();
  if (actual.join('\n') !== expected.join('\n')) {
    throw new RangeError('第三方产物基线必须精确覆盖 Formal Asset Budget 中的全部运行时产物。');
  }
  return Object.freeze({ sourceCount: sourceIds.size, artifactCount: actual.length });
}

async function main(): Promise<void> {
  const report = await verifyThirdPartyAssets();
  console.log(JSON.stringify({ status: 'passed', ...report }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
