import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, parse, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const LOCK_NAME = 'arena-a0.3-source-freeze.lock';
const require = createRequire(import.meta.url);

export const ARENA_SILHOUETTE_TOOLCHAIN_PATHS = Object.freeze([
  'scripts/art/arena-silhouette-source-freeze.ts',
  'scripts/art/arena-silhouette-human-kit-validation.ts',
  'scripts/art/check-arena-silhouette-gate.ts',
  'scripts/art/check-arena-silhouette-human-test-kit.ts',
  'scripts/art/evaluate-arena-silhouette-human-responses.ts',
  'scripts/art/generate-arena-silhouette-blind-test.ts',
  'scripts/art/generate-arena-silhouette-gate.ts',
  'scripts/art/generate-arena-silhouette-human-test-kit.ts',
  'scripts/art/intake-arena-silhouette-human-response.ts',
  'scripts/art/render-arena-silhouettes.ts',
  'scripts/art/test-arena-silhouette-gate-fail-closed.ts',
  'scripts/art/test-arena-silhouette-human-evaluator-fail-closed.ts',
  'scripts/art/test-arena-silhouette-human-response-intake-fail-closed.ts',
  'scripts/art/test-arena-silhouette-human-test-kit-fail-closed.ts',
] as const);

export const ARENA_SILHOUETTE_SOURCE_PATHS = Object.freeze([
  'package.json',
  'package-lock.json',
  'packages/arena-presentation-three/src/arena-camera.ts',
  'packages/arena-presentation-runtime/src/six-sector-direction-resolver.ts',
  'packages/arena-product-presentation/src/arena-v2-formal-presentation-asset-catalog-candidate-v1.ts',
  'packages/arena-product-presentation/src/arena-v2-a3-a6-production-approval-evidence-ledger-candidate-v1.ts',
  'governance/formal-assets/arena-stage7-formal-assets-v1.json',
  'public/assets/arena/characters/kaykit-adventurers/parkour-apprentice-rogue.glb',
  'public/assets/arena/characters/kaykit-skeletons/clockwork-warrior.glb',
  'public/assets/arena/equipment/kaykit-adventurers/shield-round.glb',
  'docs/quality/art/reference-sources/project-character-renders/character-b01-rogue-front-side.png',
  'docs/quality/art/reference-sources/project-character-renders/character-b02-skeleton-front-three-quarter.png',
  'licenses/kaykit-adventurers-CC0-LICENSE.txt',
  'licenses/kaykit-skeletons-CC0-LICENSE.txt',
  'governance/third-party/proofs/kaykit-adventurers-source.txt',
  'governance/third-party/proofs/kaykit-skeletons-source.txt',
] as const);

export const ARENA_SILHOUETTE_CRITICAL_PATHS = Object.freeze([
  ...ARENA_SILHOUETTE_SOURCE_PATHS,
  ...ARENA_SILHOUETTE_TOOLCHAIN_PATHS,
].sort());

type Json = ReturnType<typeof JSON.parse>;
type Artifact = Readonly<{ path: string; byteLength: number; sha256: string }>;
export type ArenaSilhouetteRuntimeToolchainV1 = Readonly<{
  nodeVersion: string;
  platform: NodeJS.Platform;
  arch: string;
  threeVersion: string;
  sharpVersion: string;
}>;

export type ArenaSilhouetteSourceFreezeV1 = Readonly<{
  schemaVersion: 1;
  status: 'clean-at-render-start';
  sourceCommit: string;
  sourceCommitDate: string;
  criticalArtifacts: readonly Artifact[];
  toolchainPaths: readonly string[];
  runtimeToolchain: ArenaSilhouetteRuntimeToolchainV1;
  expectedDirtyRoot: 'docs/quality/art/silhouette/';
  cleanCheckFingerprint: string;
  lockProtocol: 'git-dir-exclusive-lock+double-head-status+head-byte-compare-v1';
}>;

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function installedPackageVersion(packageName: 'three' | 'sharp'): string {
  let directory = dirname(require.resolve(packageName));
  const root = parse(directory).root;
  while (directory !== root) {
    const manifestPath = resolve(directory, 'package.json');
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { name?: unknown; version?: unknown };
      if (manifest.name === packageName && typeof manifest.version === 'string' && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.version)) return manifest.version;
    }
    directory = dirname(directory);
  }
  throw new Error(`A0.3 cannot resolve installed ${packageName} package version`);
}

export function readArenaSilhouetteRuntimeToolchain(): ArenaSilhouetteRuntimeToolchainV1 {
  return Object.freeze({
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    threeVersion: installedPackageVersion('three'),
    sharpVersion: installedPackageVersion('sharp'),
  });
}

function gitText(args: readonly string[]): string {
  return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' }).trim();
}

function gitBytes(args: readonly string[]): Buffer {
  return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
}

function artifactAtHead(sourceCommit: string, path: string): Artifact {
  execFileSync('git', ['-C', ROOT, 'ls-files', '--error-unmatch', '--', path], { stdio: 'ignore' });
  const workingBytes = readFileSync(resolve(ROOT, path));
  const committedBytes = gitBytes(['show', `${sourceCommit}:${path}`]);
  if (!workingBytes.equals(committedBytes)) throw new Error(`A0.3 clean-source byte drift: ${path}`);
  return Object.freeze({ path, byteLength: workingBytes.byteLength, sha256: sha256(workingBytes) });
}

function cleanStatus(): string {
  return gitText(['status', '--porcelain=v1', '--untracked-files=all']);
}

function collectCleanSourceFreeze(expectedSourceCommit: string): ArenaSilhouetteSourceFreezeV1 {
  const repositoryRoot = gitText(['rev-parse', '--show-toplevel']);
  if (resolve(repositoryRoot) !== ROOT) throw new Error('A0.3 source-freeze repository root drift');
  const sourceCommit = gitText(['rev-parse', 'HEAD']);
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) throw new Error('A0.3 sourceCommit must be a full Git object id');
  if (sourceCommit !== expectedSourceCommit) throw new Error(`A0.3 target sourceCommit mismatch: expected ${expectedSourceCommit}, received ${sourceCommit}`);
  if (cleanStatus() !== '') throw new Error('A0.3 render requires a globally clean worktree before the first output');
  const criticalArtifacts = Object.freeze(ARENA_SILHOUETTE_CRITICAL_PATHS.map((path) => artifactAtHead(sourceCommit, path)));
  const sourceCommitAfterHash = gitText(['rev-parse', 'HEAD']);
  if (sourceCommitAfterHash !== sourceCommit || cleanStatus() !== '') throw new Error('A0.3 source changed during clean-source preflight');
  const sourceCommitDate = gitText(['show', '-s', '--format=%cI', sourceCommit]);
  if (gitText(['rev-parse', 'HEAD']) !== sourceCommit || cleanStatus() !== '') throw new Error('A0.3 source changed at clean-source preflight commit');
  const runtimeToolchain = readArenaSilhouetteRuntimeToolchain();
  const cleanCheckFingerprint = sha256(JSON.stringify({ sourceCommit, sourceCommitDate, criticalArtifacts, runtimeToolchain }));
  return Object.freeze({
    schemaVersion: 1,
    status: 'clean-at-render-start',
    sourceCommit,
    sourceCommitDate,
    criticalArtifacts,
    toolchainPaths: ARENA_SILHOUETTE_TOOLCHAIN_PATHS,
    runtimeToolchain,
    expectedDirtyRoot: 'docs/quality/art/silhouette/',
    cleanCheckFingerprint,
    lockProtocol: 'git-dir-exclusive-lock+double-head-status+head-byte-compare-v1',
  });
}

export function acquireArenaSilhouetteCleanSourceFreeze(expectedSourceCommit: string): Readonly<{
  sourceFreeze: ArenaSilhouetteSourceFreezeV1;
  release: () => void;
}> {
  if (!/^[0-9a-f]{40}$/.test(expectedSourceCommit)) throw new Error('A0.3 expected sourceCommit must be supplied as a full Git object id');
  const gitPath = gitText(['rev-parse', '--git-path', LOCK_NAME]);
  const lockPath = isAbsolute(gitPath) ? gitPath : resolve(ROOT, gitPath);
  const descriptor = openSync(lockPath, 'wx');
  let released = false;
  try {
    writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, purpose: 'arena-a0.3-clean-source-render' })}\n`);
    fsyncSync(descriptor);
    const sourceFreeze = collectCleanSourceFreeze(expectedSourceCommit);
    return Object.freeze({
      sourceFreeze,
      release: () => {
        if (released) return;
        released = true;
        closeSync(descriptor);
        unlinkSync(lockPath);
      },
    });
  } catch (error) {
    closeSync(descriptor);
    unlinkSync(lockPath);
    throw error;
  }
}

function exactArtifact(value: Json, expected: Artifact, label: string): void {
  if (
    !value
    || typeof value !== 'object'
    || Object.keys(value).sort().join(',') !== 'byteLength,path,sha256'
    || value.path !== expected.path
    || value.byteLength !== expected.byteLength
    || value.sha256 !== expected.sha256
  ) throw new Error(`${label} identity drift`);
}

export function validateArenaSilhouetteInheritedSourceFreeze(value: unknown, callerPath: string): ArenaSilhouetteSourceFreezeV1 {
  const source = value as Json;
  const runtimeToolchain = readArenaSilhouetteRuntimeToolchain();
  if (
    !source
    || source.schemaVersion !== 1
    || source.status !== 'clean-at-render-start'
    || !/^[0-9a-f]{40}$/.test(source.sourceCommit)
    || typeof source.sourceCommitDate !== 'string'
    || source.lockProtocol !== 'git-dir-exclusive-lock+double-head-status+head-byte-compare-v1'
    || JSON.stringify(source.toolchainPaths) !== JSON.stringify(ARENA_SILHOUETTE_TOOLCHAIN_PATHS)
    || !source.runtimeToolchain
    || Object.keys(source.runtimeToolchain).sort().join(',') !== 'arch,nodeVersion,platform,sharpVersion,threeVersion'
    || JSON.stringify(source.runtimeToolchain) !== JSON.stringify(runtimeToolchain)
    || source.expectedDirtyRoot !== 'docs/quality/art/silhouette/'
    || source.criticalArtifacts?.length !== ARENA_SILHOUETTE_CRITICAL_PATHS.length
    || !ARENA_SILHOUETTE_TOOLCHAIN_PATHS.includes(callerPath as typeof ARENA_SILHOUETTE_TOOLCHAIN_PATHS[number])
  ) throw new Error('A0.3 inherited source-freeze contract drift');
  if (gitText(['rev-parse', 'HEAD']) !== source.sourceCommit) throw new Error('A0.3 HEAD changed after render source-freeze');
  const statusEntries = gitBytes(['status', '--porcelain=v1', '-z', '--untracked-files=all']).toString('utf8').split('\0').filter(Boolean);
  for (let index = 0; index < statusEntries.length; index += 1) {
    const entry = statusEntries[index]!;
    const status = entry.slice(0, 2);
    const path = entry.slice(3);
    if (status.includes('R') || status.includes('C') || !path.startsWith(source.expectedDirtyRoot)) throw new Error(`A0.3 unexpected post-render worktree drift: ${path}`);
  }
  const expectedArtifacts = ARENA_SILHOUETTE_CRITICAL_PATHS.map((path) => artifactAtHead(source.sourceCommit, path));
  for (let index = 0; index < expectedArtifacts.length; index += 1) {
    exactArtifact(source.criticalArtifacts[index], expectedArtifacts[index]!, `A0.3 critical artifact ${expectedArtifacts[index]!.path}`);
  }
  const expectedFingerprint = sha256(JSON.stringify({ sourceCommit: source.sourceCommit, sourceCommitDate: source.sourceCommitDate, criticalArtifacts: expectedArtifacts, runtimeToolchain }));
  if (source.cleanCheckFingerprint !== expectedFingerprint) throw new Error('A0.3 inherited source-freeze fingerprint drift');
  return source as ArenaSilhouetteSourceFreezeV1;
}
