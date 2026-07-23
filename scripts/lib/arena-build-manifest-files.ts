import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  ARENA_BUILD_MANIFEST_FILENAME,
  ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
  createArenaBuildManifest,
  type ArenaBuildArtifact,
  type ArenaBuildDefaultEntry,
  type ArenaBuildManifest,
} from '@number-strategy-jump/arena-device-acceptance';

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

async function collectDirectory(
  root: string,
  relativeDirectory: string,
  output: ArenaBuildArtifact[],
): Promise<void> {
  const directory = path.join(root, ...relativeDirectory.split('/').filter(Boolean));
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => compareText(left.name, right.name));
  for (const entry of entries) {
    const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
    if (relativePath === ARENA_BUILD_MANIFEST_FILENAME) continue;
    if (entry.isSymbolicLink()) {
      throw new Error(`构建目录不能包含符号链接：${relativePath}。`);
    }
    if (entry.isDirectory()) {
      await collectDirectory(root, relativePath, output);
      continue;
    }
    if (!entry.isFile()) throw new Error(`构建目录包含不支持的节点：${relativePath}。`);
    const bytes = await readFile(path.join(root, ...relativePath.split('/')));
    output.push(Object.freeze({
      path: relativePath,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      byteLength: bytes.byteLength,
    }));
  }
}

export async function collectArenaBuildArtifacts(
  outDir: string,
): Promise<readonly ArenaBuildArtifact[]> {
  const artifacts: ArenaBuildArtifact[] = [];
  await collectDirectory(path.resolve(outDir), '', artifacts);
  return Object.freeze(artifacts.sort((left, right) => compareText(left.path, right.path)));
}

export async function writeArenaBuildManifest({
  outDir,
  buildId,
  commit,
  sourceDirty,
  target,
  defaultEntry,
}: Readonly<{
  outDir: string;
  buildId: string;
  commit: string;
  sourceDirty: boolean;
  target: string;
  defaultEntry: ArenaBuildDefaultEntry;
}>): Promise<ArenaBuildManifest> {
  const directory = path.resolve(outDir);
  const manifest = createArenaBuildManifest({
    schemaVersion: ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
    buildId,
    commit,
    sourceDirty,
    target,
    defaultEntry,
    artifacts: await collectArenaBuildArtifacts(directory),
  });
  await writeFile(
    path.join(directory, ARENA_BUILD_MANIFEST_FILENAME),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return manifest;
}

export async function verifyArenaBuildManifestDirectory(outDir: string, {
  requireCleanSource = false,
}: Readonly<{ requireCleanSource?: boolean }> = {}): Promise<ArenaBuildManifest> {
  const directory = path.resolve(outDir);
  const manifestPath = path.join(directory, ARENA_BUILD_MANIFEST_FILENAME);
  const manifestMetadata = await lstat(manifestPath);
  if (!manifestMetadata.isFile() || manifestMetadata.isSymbolicLink()) {
    throw new Error(`构建 Manifest 不是普通文件：${manifestPath}。`);
  }
  const source: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));
  const manifest = createArenaBuildManifest(source);
  if (requireCleanSource && manifest.sourceDirty) {
    throw new Error(`构建 ${manifest.buildId}/${manifest.target} 来自非干净工作区。`);
  }
  const actual = await collectArenaBuildArtifacts(directory);
  if (actual.length !== manifest.artifacts.length) {
    throw new Error(
      `构建 ${manifest.target} 文件数量不一致：${actual.length} != ${manifest.artifacts.length}。`,
    );
  }
  for (let index = 0; index < actual.length; index += 1) {
    const expected = manifest.artifacts[index];
    const found = actual[index];
    if (!expected || !found) throw new Error(`构建产物索引 ${index} 缺失。`);
    if (
      found.path !== expected.path
      || found.sha256 !== expected.sha256
      || found.byteLength !== expected.byteLength
    ) throw new Error(`构建产物 ${found.path} 与 Manifest 不一致。`);
  }
  return manifest;
}
