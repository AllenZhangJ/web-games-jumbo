import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  ARENA_P1_SUPPLY_ACCEPTANCE_BUILD_ATTESTATION_PURPOSE,
  ARENA_P1_SUPPLY_ACCEPTANCE_BUILD_ATTESTATION_SCHEMA_VERSION,
  createArenaP1SupplyAcceptanceBuildAttestationV1,
  type ArenaP1SupplyAcceptanceBuildAttestationV1,
} from '@number-strategy-jump/arena-device-acceptance';
import { build, type Metafile } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_ROOT = path.join(ROOT, 'dist');
const OUTPUT_ROOT = path.join(DIST_ROOT, 'arena-p1-supply-acceptance');
const EXEC_FILE = promisify(execFile);
const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const BUILD_IDENTITY_FILENAME = 'arena-p1-supply-build-identity.json';
const FORMAL_INDEX_PATH = 'web/arena-p1-supply-formal-build-index-v1.json';
const ADAPTER_MODULE_PATH =
  'packages/arena-presentation-runtime/dist/arena-supply-presentation-adapter.js';
const A1_MANIFEST_SOURCE_PATH =
  'docs/quality/art/supply/arena-a1.0-supply-presentation-contract-v2.json';
const FORMAL_ADAPTER_PATH = 'web/shared/arena-supply-presentation-adapter.js';
const FORMAL_A1_MANIFEST_PATH =
  'web/shared/arena-a1.0-supply-presentation-contract-v2.json';
const FORMAL_REACHABILITY_PATH =
  'web/shared/arena-p1-supply-production-reachability-audit-v1.json';
const TARGETS = Object.freeze(['web', 'wechat', 'douyin'] as const);
const SOURCE_PATHS = Object.freeze([
  'package-lock.json',
  A1_MANIFEST_SOURCE_PATH,
  'packages/arena-device-acceptance/dist/arena-p1-supply-device-acceptance-v1.js',
  'packages/arena-device-acceptance/dist/index.js',
  'packages/arena-device-acceptance/src/arena-p1-supply-device-acceptance-v1.ts',
  'packages/arena-device-acceptance/src/index.ts',
  'packages/arena-presentation-contracts/src/arena-supply-presentation-contract.ts',
  ADAPTER_MODULE_PATH,
  'packages/arena-presentation-runtime/src/arena-supply-presentation-adapter.ts',
  'scripts/arena-p1-supply-acceptance-index.html',
  'scripts/build-arena-p1-supply-acceptance.ts',
  'src/arena-p1-supply-acceptance.css',
  'src/entry/arena-p1-supply-acceptance-host.ts',
  'src/entry/arena-p1-supply-acceptance-runtime.ts',
  'src/entry/douyin-p1-supply-acceptance.ts',
  'src/entry/web-p1-supply-acceptance.ts',
  'src/entry/wechat-p1-supply-acceptance.ts',
] as const);
const AUDITED_PRODUCTION_ENTRIES = Object.freeze([
  'src/entry/douyin.ts',
  'src/entry/web.ts',
  'src/entry/wechat.ts',
]);
const AUDITED_RELEASE_ARTIFACTS = Object.freeze([
  'dist/douyin/game.js',
  'dist/web/index.html',
  'dist/wechat/game.js',
]);
const FORBIDDEN_PRODUCTION_INPUTS = new Set([
  'scripts/build-arena-p1-supply-acceptance.ts',
  'src/entry/arena-p1-supply-acceptance-host.ts',
  'src/entry/arena-p1-supply-acceptance-runtime.ts',
  'src/entry/douyin-p1-supply-acceptance.ts',
  'src/entry/web-p1-supply-acceptance.ts',
  'src/entry/wechat-p1-supply-acceptance.ts',
]);

type Target = typeof TARGETS[number];
type BuildMode = 'development-isolated' | 'formal-clean-evidence';

interface SourceIdentity {
  readonly headCommit: string;
  readonly sourceDirty: boolean;
  readonly repositoryFingerprint: string;
  readonly sourceFiles: readonly Readonly<{ path: string; sha256: string }>[];
}

interface StoredArtifact {
  readonly path: string;
  readonly sha256: string;
  readonly byteLength: number;
}

interface TargetBuildResult {
  readonly target: Target;
  readonly entryPoint: string;
  readonly bundlePath: string;
  readonly bundleSha256: string;
  readonly bundleByteLength: number;
  readonly bundledInputs: readonly Readonly<{ path: string; sha256: string }>[];
  readonly entryDirectImportPaths: readonly string[];
  readonly neutralHostDirectImportPaths: readonly string[];
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function parseMode(argv: readonly string[]): BuildMode {
  if (argv.length === 0) return 'development-isolated';
  if (argv.length !== 1 || !argv[0]?.startsWith('--mode=')) {
    throw new TypeError('P1 supply build 仅接受 --mode=development-isolated|formal-clean-evidence。');
  }
  const mode = argv[0].slice('--mode='.length);
  if (mode !== 'development-isolated' && mode !== 'formal-clean-evidence') {
    throw new RangeError(`P1 supply build mode 无效：${mode}`);
  }
  return mode;
}

async function gitBuffer(args: readonly string[]): Promise<Buffer> {
  const result = await EXEC_FILE('git', [...args], {
    cwd: ROOT,
    encoding: 'buffer',
    maxBuffer: 16 * 1024 * 1024,
  });
  return result.stdout;
}

async function sourceIdentity(): Promise<SourceIdentity> {
  const headCommit = (await gitBuffer(['rev-parse', '--verify', 'HEAD'])).toString('utf8').trim();
  if (!GIT_COMMIT_PATTERN.test(headCommit)) throw new Error('P1 supply build 无法闭合 Git HEAD identity。');
  const status = await gitBuffer(['status', '--porcelain=v1', '--untracked-files=all', '-z']);
  const sourceFiles = Object.freeze(await Promise.all(SOURCE_PATHS.map(async (relativePath) => {
    const bytes = await readFile(path.join(ROOT, relativePath));
    return Object.freeze({ path: relativePath, sha256: sha256(bytes) });
  })));
  const repositoryFingerprint = sha256(JSON.stringify({
    headCommit,
    statusSha256: sha256(status),
    sourceFiles,
  }));
  return Object.freeze({
    headCommit,
    sourceDirty: status.length > 0,
    repositoryFingerprint,
    sourceFiles,
  });
}

function assertSameIdentity(before: SourceIdentity, after: SourceIdentity): void {
  if (
    before.headCommit !== after.headCommit
    || before.sourceDirty !== after.sourceDirty
    || before.repositoryFingerprint !== after.repositoryFingerprint
    || JSON.stringify(before.sourceFiles) !== JSON.stringify(after.sourceFiles)
  ) throw new Error('P1 supply isolated build 期间 source identity 漂移。');
}

function outputDirectory(root: string, target: Target): string {
  return path.join(root, target);
}

function entryPoint(target: Target): string {
  return path.join(ROOT, 'src', 'entry', `${target}-p1-supply-acceptance.ts`);
}

function bundleFilename(target: Target): string {
  return target === 'web' ? 'app.js' : 'game.js';
}

function normalizedRepositoryPath(inputPath: string): string {
  const absolute = path.resolve(ROOT, inputPath);
  const relative = path.relative(ROOT, absolute).split(path.sep).join('/');
  if (relative.startsWith('../') || path.isAbsolute(relative)) {
    throw new Error(`P1 supply bundle input 逃逸仓库：${inputPath}`);
  }
  return relative;
}

async function bundledInputIdentities(
  metafile: Metafile,
): Promise<readonly Readonly<{ path: string; sha256: string }>[]> {
  const paths = Object.keys(metafile.inputs).map(normalizedRepositoryPath).sort();
  return Object.freeze(await Promise.all(paths.map(async (relativePath) => Object.freeze({
    path: relativePath,
    sha256: sha256(await readFile(path.join(ROOT, relativePath))),
  }))));
}

function assertBundledInputConsistency(targets: readonly TargetBuildResult[]): void {
  const hashes = new Map<string, string>();
  for (const target of targets) {
    for (const input of target.bundledInputs) {
      const previous = hashes.get(input.path);
      if (previous !== undefined && previous !== input.sha256) {
        throw new Error(`P1 supply bundle input 在三端构建间漂移：${input.path}`);
      }
      hashes.set(input.path, input.sha256);
    }
  }
}

function allBundledInputs(
  targets: readonly TargetBuildResult[],
): readonly Readonly<{ path: string; sha256: string }>[] {
  const values = new Map<string, string>();
  for (const target of targets) {
    for (const input of target.bundledInputs) values.set(input.path, input.sha256);
  }
  return Object.freeze([...values.entries()].sort(([left], [right]) => (
    left < right ? -1 : left > right ? 1 : 0
  )).map(([inputPath, inputHash]) => Object.freeze({ path: inputPath, sha256: inputHash })));
}

function logicalBuildId(source: SourceIdentity, targets: readonly TargetBuildResult[]): string {
  const digest = sha256(JSON.stringify({
    schemaVersion: 1,
    commit: source.headCommit,
    repositoryFingerprint: source.repositoryFingerprint,
    bundledInputs: allBundledInputs(targets),
  }));
  return `arena-p1-supply-${source.headCommit.slice(0, 12)}-${digest}`;
}

function directImportPaths(metafile: Metafile, sourcePath: string): readonly string[] {
  const sourceEntry = Object.entries(metafile.inputs).find(([inputPath]) => (
    normalizedRepositoryPath(inputPath) === sourcePath
  ));
  if (sourceEntry === undefined) throw new Error(`P1 supply bundle 缺少 source input：${sourcePath}`);
  return Object.freeze(sourceEntry[1].imports.map(({ path: importedPath }) => (
    normalizedRepositoryPath(importedPath)
  )).sort());
}

async function bundleTarget(target: Target, candidateRoot: string): Promise<TargetBuildResult> {
  const outDir = outputDirectory(candidateRoot, target);
  await mkdir(outDir, { recursive: true });
  const sourceEntry = entryPoint(target);
  const bundleName = bundleFilename(target);
  const bundlePath = path.join(outDir, bundleName);
  const result = await build({
    absWorkingDir: ROOT,
    entryPoints: [sourceEntry],
    outfile: bundlePath,
    bundle: true,
    format: 'iife',
    platform: 'neutral',
    target: 'es2020',
    treeShaking: true,
    minifyIdentifiers: false,
    minifySyntax: true,
    minifyWhitespace: true,
    charset: 'utf8',
    legalComments: 'none',
    logLevel: 'silent',
    metafile: true,
    define: {
      __ARENA_P1_SUPPLY_ACCEPTANCE_TARGET__: JSON.stringify(target),
    },
  });
  if (result.metafile === undefined) throw new Error(`P1 supply ${target} bundle 缺少 metafile。`);
  const bundleBytes = await readFile(bundlePath);
  const relativeEntry = path.relative(ROOT, sourceEntry).split(path.sep).join('/');
  return Object.freeze({
    target,
    entryPoint: relativeEntry,
    bundlePath: `${target}/${bundleName}`,
    bundleSha256: sha256(bundleBytes),
    bundleByteLength: bundleBytes.byteLength,
    bundledInputs: await bundledInputIdentities(result.metafile),
    entryDirectImportPaths: directImportPaths(result.metafile, relativeEntry),
    neutralHostDirectImportPaths: directImportPaths(
      result.metafile,
      'src/entry/arena-p1-supply-acceptance-host.ts',
    ),
  });
}

async function writeTargetShell(target: Target, candidateRoot: string): Promise<void> {
  const outDir = outputDirectory(candidateRoot, target);
  if (target === 'web') {
    await Promise.all([
      writeFile(
        path.join(outDir, 'index.html'),
        await readFile(path.join(ROOT, 'scripts', 'arena-p1-supply-acceptance-index.html')),
      ),
      writeFile(
        path.join(outDir, 'arena-p1-supply-acceptance.css'),
        await readFile(path.join(ROOT, 'src', 'arena-p1-supply-acceptance.css')),
      ),
    ]);
    return;
  }
  await Promise.all([
    writeFile(
      path.join(outDir, 'game.json'),
      `${JSON.stringify({ deviceOrientation: 'portrait', showStatusBar: false }, null, 2)}\n`,
    ),
    writeFile(
      path.join(outDir, 'project.config.json'),
      `${JSON.stringify({
        appid: '',
        projectname: `arena-p1-supply-acceptance-${target}`,
        ...(target === 'wechat' ? { compileType: 'game' } : {}),
        setting: { urlCheck: true, es6: true, minified: true },
      }, null, 2)}\n`,
    ),
  ]);
}

async function writeJsonArtifact(
  candidateRoot: string,
  relativePath: string,
  value: unknown,
): Promise<StoredArtifact> {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  const absolutePath = path.join(candidateRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);
  return Object.freeze({ path: relativePath, sha256: sha256(bytes), byteLength: bytes.byteLength });
}

async function writeFileArtifact(
  candidateRoot: string,
  relativePath: string,
  bytes: Buffer,
): Promise<StoredArtifact> {
  const absolutePath = path.join(candidateRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);
  return Object.freeze({ path: relativePath, sha256: sha256(bytes), byteLength: bytes.byteLength });
}

function canonicalAttestationHash(
  value: Omit<ArenaP1SupplyAcceptanceBuildAttestationV1, 'attestationHash'>,
): string {
  return sha256(JSON.stringify({
    schemaVersion: value.schemaVersion,
    purpose: value.purpose,
    commit: value.commit,
    sourceDirty: value.sourceDirty,
    repositoryFingerprint: value.repositoryFingerprint,
    buildId: value.buildId,
    platform: value.platform,
    adapterModuleHash: value.adapterModuleHash,
    harnessModuleHash: value.harnessModuleHash,
    productionReachabilityAuditHash: value.productionReachabilityAuditHash,
    assetManifestHash: value.assetManifestHash,
    artifactManifestHash: value.artifactManifestHash,
  }));
}

async function assertProductionReachabilityIsolation(): Promise<void> {
  for (const relativeEntry of AUDITED_PRODUCTION_ENTRIES) {
    const result = await build({
      absWorkingDir: ROOT,
      entryPoints: [relativeEntry],
      outdir: path.join(DIST_ROOT, '.arena-p1-supply-production-audit'),
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'neutral',
      target: 'es2020',
      treeShaking: true,
      preserveSymlinks: true,
      legalComments: 'none',
      logLevel: 'silent',
      metafile: true,
    });
    if (result.metafile === undefined) {
      throw new Error(`P1 supply production graph 缺少 metafile：${relativeEntry}`);
    }
    for (const inputPath of Object.keys(result.metafile.inputs)) {
      const normalized = normalizedRepositoryPath(inputPath);
      if (FORBIDDEN_PRODUCTION_INPUTS.has(normalized)) {
        throw new Error(`P1 supply acceptance 被生产入口传递到达：${relativeEntry} -> ${normalized}`);
      }
    }
  }
  const buildEntry = await readFile(path.join(ROOT, 'scripts', 'build.ts'), 'utf8');
  if (/arena-p1-supply-acceptance|p1-supply-acceptance-host/.test(buildEntry)) {
    throw new Error('P1 supply acceptance 被默认 scripts/build.ts 直接接线。');
  }
}

function exactRecord(value: unknown, keys: readonly string[], name: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${name} exact-key 校验失败。`);
  }
  return value as Record<string, unknown>;
}

function candidatePath(candidateRoot: string, relativePath: string): string {
  if (path.isAbsolute(relativePath) || relativePath.split('/').includes('..')) {
    throw new Error(`P1 supply formal artifact path 逃逸：${relativePath}`);
  }
  const absolute = path.resolve(candidateRoot, relativePath);
  const relative = path.relative(candidateRoot, absolute);
  if (relative.startsWith('../') || path.isAbsolute(relative)) {
    throw new Error(`P1 supply formal artifact path 逃逸：${relativePath}`);
  }
  return absolute;
}

async function candidateArtifact(
  candidateRoot: string,
  relativePath: string,
): Promise<Readonly<{ bytes: Buffer; sha256: string; byteLength: number }>> {
  const bytes = await readFile(candidatePath(candidateRoot, relativePath));
  return Object.freeze({ bytes, sha256: sha256(bytes), byteLength: bytes.byteLength });
}

function parseCandidateJson(bytes: Buffer, name: string): unknown {
  try {
    return JSON.parse(bytes.toString('utf8')) as unknown;
  } catch (error) {
    throw new Error(`${name} 不是合法 JSON。`, { cause: error });
  }
}

async function verifyFormalCandidate(
  candidateRoot: string,
  source: SourceIdentity,
  buildId: string,
  targets: readonly TargetBuildResult[],
): Promise<void> {
  const rootEntries = (await readdir(candidateRoot)).sort();
  if (JSON.stringify(rootEntries) !== JSON.stringify([...TARGETS].sort())) {
    throw new Error('P1 supply formal root 只能包含 web/wechat/douyin 三个子树。');
  }
  const indexArtifact = await candidateArtifact(candidateRoot, FORMAL_INDEX_PATH);
  const index = exactRecord(parseCandidateJson(indexArtifact.bytes, 'P1 supply formal index'), [
    'schemaVersion',
    'purpose',
    'formalGate',
    'deviceEvidenceStatus',
    'commit',
    'sourceDirty',
    'repositoryFingerprint',
    'buildId',
    'expectedIdentity',
    'platformArtifacts',
  ], 'P1 supply formal index');
  if (index.schemaVersion !== 1
    || index.purpose !== 'p1-supply-acceptance-formal-build-index'
    || index.formalGate !== false
    || index.deviceEvidenceStatus !== 'not-run'
    || index.commit !== source.headCommit
    || index.sourceDirty !== false
    || index.repositoryFingerprint !== source.repositoryFingerprint
    || index.buildId !== buildId) {
    throw new Error('P1 supply formal index identity 不一致。');
  }
  const expected = exactRecord(index.expectedIdentity, [
    'commit',
    'repositoryFingerprint',
    'buildId',
    'adapterModuleHash',
    'assetManifestHash',
    'productionReachabilityAuditHash',
    'platformAttestationHashes',
  ], 'P1 supply formal expectedIdentity');
  if (expected.commit !== source.headCommit
    || expected.repositoryFingerprint !== source.repositoryFingerprint
    || expected.buildId !== buildId) {
    throw new Error('P1 supply formal expectedIdentity 漂移。');
  }
  const platformAttestationHashes = exactRecord(
    expected.platformAttestationHashes,
    TARGETS,
    'P1 supply platform attestation hashes',
  );
  const platformArtifacts = exactRecord(
    index.platformArtifacts,
    TARGETS,
    'P1 supply platform artifact index',
  );
  const targetById = new Map(targets.map((target) => [target.target, target]));
  const seenHashPaths = new Map<string, string>();
  const bindUniqueArtifact = (artifactHash: string, artifactPath: string): void => {
    const previousPath = seenHashPaths.get(artifactHash);
    if (previousPath !== undefined && previousPath !== artifactPath) {
      throw new Error(`P1 supply formal artifact 内容在多个路径重复：${previousPath}/${artifactPath}`);
    }
    seenHashPaths.set(artifactHash, artifactPath);
  };
  const sharedPaths = new Map<string, Set<string>>();
  const attestationHashes = new Set<string>();
  for (const platformId of TARGETS) {
    const paths = exactRecord(platformArtifacts[platformId], [
      'attestationPath',
      'artifactManifestPath',
      'harnessPath',
    ], `P1 supply ${platformId} artifact index`);
    for (const key of ['attestationPath', 'artifactManifestPath', 'harnessPath']) {
      if (typeof paths[key] !== 'string') throw new TypeError(`P1 supply ${platformId}.${key} 无效。`);
    }
    const attestationArtifact = await candidateArtifact(
      candidateRoot,
      paths.attestationPath as string,
    );
    bindUniqueArtifact(attestationArtifact.sha256, paths.attestationPath as string);
    const attestation = createArenaP1SupplyAcceptanceBuildAttestationV1(
      parseCandidateJson(attestationArtifact.bytes, `P1 supply ${platformId} attestation`),
    );
    if (attestation.platform !== platformId
      || attestation.commit !== source.headCommit
      || attestation.sourceDirty !== false
      || attestation.repositoryFingerprint !== source.repositoryFingerprint
      || attestation.buildId !== buildId
      || attestation.attestationHash !== canonicalAttestationHash(attestation)
      || attestation.attestationHash !== platformAttestationHashes[platformId]) {
      throw new Error(`P1 supply ${platformId} attestation identity/hash 不一致。`);
    }
    attestationHashes.add(attestation.attestationHash);
    const manifestArtifact = await candidateArtifact(
      candidateRoot,
      paths.artifactManifestPath as string,
    );
    if (manifestArtifact.sha256 !== attestation.artifactManifestHash) {
      throw new Error(`P1 supply ${platformId} manifest hash 不一致。`);
    }
    bindUniqueArtifact(manifestArtifact.sha256, paths.artifactManifestPath as string);
    const manifest = exactRecord(
      parseCandidateJson(manifestArtifact.bytes, `P1 supply ${platformId} manifest`),
      ['schemaVersion', 'purpose', 'platform', 'artifacts'],
      `P1 supply ${platformId} manifest`,
    );
    if (manifest.schemaVersion !== 1
      || manifest.purpose !== 'p1-supply-acceptance-artifact-manifest'
      || manifest.platform !== platformId
      || !Array.isArray(manifest.artifacts)
      || manifest.artifacts.length !== 4) {
      throw new Error(`P1 supply ${platformId} manifest shape 不一致。`);
    }
    const expectedRoles = [
      'adapter-module',
      'asset-manifest',
      'harness-module',
      'production-reachability-audit',
    ] as const;
    const target = targetById.get(platformId);
    if (target === undefined) throw new Error(`P1 supply 缺少 ${platformId} target result。`);
    const expectedRoleHashes: Readonly<Record<typeof expectedRoles[number], string>> = {
      'adapter-module': attestation.adapterModuleHash,
      'asset-manifest': attestation.assetManifestHash,
      'harness-module': attestation.harnessModuleHash,
      'production-reachability-audit': attestation.productionReachabilityAuditHash,
    };
    const expectedRolePaths: Readonly<Record<typeof expectedRoles[number], string>> = {
      'adapter-module': FORMAL_ADAPTER_PATH,
      'asset-manifest': FORMAL_A1_MANIFEST_PATH,
      'harness-module': target.bundlePath,
      'production-reachability-audit': FORMAL_REACHABILITY_PATH,
    };
    for (let indexValue = 0; indexValue < expectedRoles.length; indexValue += 1) {
      const role = expectedRoles[indexValue] as typeof expectedRoles[number];
      const entry = exactRecord(
        manifest.artifacts[indexValue],
        ['role', 'path', 'sha256', 'byteLength'],
        `P1 supply ${platformId} manifest ${role}`,
      );
      if (entry.role !== role
        || entry.path !== expectedRolePaths[role]
        || entry.sha256 !== expectedRoleHashes[role]
        || typeof entry.byteLength !== 'number'
        || !Number.isSafeInteger(entry.byteLength)
        || entry.byteLength < 1) {
        throw new Error(`P1 supply ${platformId} manifest ${role} identity 不一致。`);
      }
      const artifact = await candidateArtifact(candidateRoot, entry.path as string);
      if (artifact.sha256 !== entry.sha256 || artifact.byteLength !== entry.byteLength) {
        throw new Error(`P1 supply ${platformId} manifest ${role} 最终字节不一致。`);
      }
      bindUniqueArtifact(artifact.sha256, entry.path as string);
      const pathsForRole = sharedPaths.get(role) ?? new Set<string>();
      pathsForRole.add(entry.path as string);
      sharedPaths.set(role, pathsForRole);
    }
  }
  if (attestationHashes.size !== TARGETS.length
    || sharedPaths.get('adapter-module')?.size !== 1
    || sharedPaths.get('asset-manifest')?.size !== 1
    || sharedPaths.get('production-reachability-audit')?.size !== 1
    || sharedPaths.get('harness-module')?.size !== TARGETS.length) {
    throw new Error('P1 supply formal 三平台共享/唯一 artifact 关系不闭合。');
  }
  const adapter = await candidateArtifact(candidateRoot, FORMAL_ADAPTER_PATH);
  const sourceAdapterHash = source.sourceFiles.find(({ path: sourcePath }) => (
    sourcePath === ADAPTER_MODULE_PATH
  ))?.sha256;
  if (adapter.sha256 !== sourceAdapterHash || adapter.sha256 !== expected.adapterModuleHash) {
    throw new Error('P1 supply formal adapter 最终字节未绑定 source/bundled input。');
  }
  const a1 = await candidateArtifact(candidateRoot, FORMAL_A1_MANIFEST_PATH);
  parseCandidateJson(a1.bytes, 'P1 supply A1.0-v2 manifest');
  const sourceA1Hash = source.sourceFiles.find(({ path: sourcePath }) => (
    sourcePath === A1_MANIFEST_SOURCE_PATH
  ))?.sha256;
  if (a1.sha256 !== sourceA1Hash || a1.sha256 !== expected.assetManifestHash) {
    throw new Error('P1 supply formal A1.0-v2 最终字节未直接绑定 source identity。');
  }
  const reachabilityArtifact = await candidateArtifact(candidateRoot, FORMAL_REACHABILITY_PATH);
  if (reachabilityArtifact.sha256 !== expected.productionReachabilityAuditHash) {
    throw new Error('P1 supply formal reachability 最终字节 hash 不一致。');
  }
  const reachability = exactRecord(
    parseCandidateJson(reachabilityArtifact.bytes, 'P1 supply reachability audit'),
    [
      'schemaVersion',
      'purpose',
      'commit',
      'repositoryFingerprint',
      'buildId',
      'defaultProductReachable',
      'releaseArtifactReachable',
      'auditedProductionEntries',
      'auditedReleaseArtifacts',
    ],
    'P1 supply reachability audit',
  );
  if (reachability.schemaVersion !== 1
    || reachability.purpose !== 'p1-supply-production-reachability-audit'
    || reachability.commit !== source.headCommit
    || reachability.repositoryFingerprint !== source.repositoryFingerprint
    || reachability.buildId !== buildId
    || reachability.defaultProductReachable !== false
    || reachability.releaseArtifactReachable !== false
    || JSON.stringify(reachability.auditedProductionEntries) !== JSON.stringify(AUDITED_PRODUCTION_ENTRIES)
    || JSON.stringify(reachability.auditedReleaseArtifacts) !== JSON.stringify(AUDITED_RELEASE_ARTIFACTS)) {
    throw new Error('P1 supply formal reachability exact shape/identity 不一致。');
  }
}

async function writeFormalEvidence(
  candidateRoot: string,
  source: SourceIdentity,
  buildId: string,
  targets: readonly TargetBuildResult[],
): Promise<void> {
  await assertProductionReachabilityIsolation();
  const adapter = await writeFileArtifact(
    candidateRoot,
    FORMAL_ADAPTER_PATH,
    await readFile(path.join(ROOT, ADAPTER_MODULE_PATH)),
  );
  const inputs = allBundledInputs(targets);
  const bundledAdapter = inputs.find(({ path: inputPath }) => inputPath === ADAPTER_MODULE_PATH);
  if (bundledAdapter === undefined || bundledAdapter.sha256 !== adapter.sha256) {
    throw new Error('P1 supply formal adapter artifact 未绑定实际 bundled input。');
  }
  const a1ManifestBytes = await readFile(path.join(ROOT, A1_MANIFEST_SOURCE_PATH));
  JSON.parse(a1ManifestBytes.toString('utf8')) as unknown;
  const assetManifest = await writeFileArtifact(
    candidateRoot,
    FORMAL_A1_MANIFEST_PATH,
    a1ManifestBytes,
  );
  const reachability = await writeJsonArtifact(candidateRoot, FORMAL_REACHABILITY_PATH, {
    schemaVersion: 1,
    purpose: 'p1-supply-production-reachability-audit',
    commit: source.headCommit,
    repositoryFingerprint: source.repositoryFingerprint,
    buildId,
    defaultProductReachable: false,
    releaseArtifactReachable: false,
    auditedProductionEntries: AUDITED_PRODUCTION_ENTRIES,
    auditedReleaseArtifacts: AUDITED_RELEASE_ARTIFACTS,
  });

  const attestations = {} as Record<Target, ArenaP1SupplyAcceptanceBuildAttestationV1>;
  const platformArtifacts = {} as Record<Target, Readonly<Record<string, string>>>;
  for (const target of targets) {
    const harness: StoredArtifact = Object.freeze({
      path: target.bundlePath,
      sha256: target.bundleSha256,
      byteLength: target.bundleByteLength,
    });
    const manifestPath = `${target.target}/arena-p1-supply-artifact-manifest-v1.json`;
    const manifest = await writeJsonArtifact(candidateRoot, manifestPath, {
      schemaVersion: 1,
      purpose: 'p1-supply-acceptance-artifact-manifest',
      platform: target.target,
      artifacts: [
        { role: 'adapter-module', ...adapter },
        { role: 'asset-manifest', ...assetManifest },
        { role: 'harness-module', ...harness },
        { role: 'production-reachability-audit', ...reachability },
      ],
    });
    const withoutHash: Omit<ArenaP1SupplyAcceptanceBuildAttestationV1, 'attestationHash'> = {
      schemaVersion: ARENA_P1_SUPPLY_ACCEPTANCE_BUILD_ATTESTATION_SCHEMA_VERSION,
      purpose: ARENA_P1_SUPPLY_ACCEPTANCE_BUILD_ATTESTATION_PURPOSE,
      commit: source.headCommit,
      sourceDirty: false,
      repositoryFingerprint: source.repositoryFingerprint,
      buildId,
      platform: target.target,
      adapterModuleHash: adapter.sha256,
      harnessModuleHash: harness.sha256,
      productionReachabilityAuditHash: reachability.sha256,
      assetManifestHash: assetManifest.sha256,
      artifactManifestHash: manifest.sha256,
    };
    const attestation = createArenaP1SupplyAcceptanceBuildAttestationV1({
      ...withoutHash,
      attestationHash: canonicalAttestationHash(withoutHash),
    });
    const attestationPath = `${target.target}/arena-p1-supply-build-attestation-v1.json`;
    await writeJsonArtifact(candidateRoot, attestationPath, attestation);
    attestations[target.target] = attestation;
    platformArtifacts[target.target] = Object.freeze({
      attestationPath,
      artifactManifestPath: manifestPath,
      harnessPath: harness.path,
    });
  }
  await writeJsonArtifact(candidateRoot, FORMAL_INDEX_PATH, {
    schemaVersion: 1,
    purpose: 'p1-supply-acceptance-formal-build-index',
    formalGate: false,
    deviceEvidenceStatus: 'not-run',
    commit: source.headCommit,
    sourceDirty: false,
    repositoryFingerprint: source.repositoryFingerprint,
    buildId,
    expectedIdentity: {
      commit: source.headCommit,
      repositoryFingerprint: source.repositoryFingerprint,
      buildId,
      adapterModuleHash: adapter.sha256,
      assetManifestHash: assetManifest.sha256,
      productionReachabilityAuditHash: reachability.sha256,
      platformAttestationHashes: Object.fromEntries(TARGETS.map((target) => [
        target,
        attestations[target].attestationHash,
      ])),
    },
    platformArtifacts,
  });
  await verifyFormalCandidate(candidateRoot, source, buildId, targets);
}

async function writeBuildIdentities(
  candidateRoot: string,
  mode: BuildMode,
  source: SourceIdentity,
  buildId: string,
  targets: readonly TargetBuildResult[],
): Promise<void> {
  for (const target of targets) {
    if (!SHA256_PATTERN.test(target.bundleSha256)) throw new Error('P1 supply bundle hash 无效。');
    const identity = Object.freeze({
      schemaVersion: 1,
      artifactId: 'arena.p1.supply.acceptance.isolated-build.v1',
      buildMode: mode,
      developmentIsolated: mode === 'development-isolated',
      cleanSourceAttested: mode === 'formal-clean-evidence' && !source.sourceDirty,
      formalGate: false,
      buildId,
      sourceIdentity: source,
      target,
    });
    await writeFile(
      path.join(outputDirectory(candidateRoot, target.target), BUILD_IDENTITY_FILENAME),
      `${JSON.stringify(identity, null, 2)}\n`,
    );
  }
}

async function exists(value: string): Promise<boolean> {
  try {
    await access(value);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

interface CandidatePublicationResult {
  readonly staleBackupPath: string | null;
}

async function cleanupCommittedBackup(
  backupRoot: string | null,
): Promise<CandidatePublicationResult> {
  if (backupRoot === null) {
    return Object.freeze({ staleBackupPath: null });
  }
  try {
    await rm(backupRoot, { recursive: true, force: true });
    return Object.freeze({ staleBackupPath: null });
  } catch {
    return Object.freeze({ staleBackupPath: backupRoot });
  }
}

async function publishCandidate(candidateRoot: string): Promise<CandidatePublicationResult> {
  let backupRoot: string | null = null;
  if (await exists(OUTPUT_ROOT)) {
    backupRoot = await mkdtemp(path.join(DIST_ROOT, '.arena-p1-supply-acceptance.previous-'));
    await rm(backupRoot, { recursive: true, force: true });
    await rename(OUTPUT_ROOT, backupRoot);
  }
  try {
    await rename(candidateRoot, OUTPUT_ROOT);
  } catch (error) {
    const cleanupErrors: unknown[] = [];
    if (backupRoot !== null) {
      try { await rename(backupRoot, OUTPUT_ROOT); } catch (restoreError) {
        cleanupErrors.push(restoreError);
      }
    }
    if (cleanupErrors.length > 0) {
      throw new AggregateError([error, ...cleanupErrors], 'P1 supply 原子发布和回滚均失败。');
    }
    throw error;
  }
  return cleanupCommittedBackup(backupRoot);
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const before = await sourceIdentity();
  if (mode === 'formal-clean-evidence' && before.sourceDirty) {
    throw new Error('P1 supply formal clean evidence 拒绝 dirty source。');
  }
  await mkdir(DIST_ROOT, { recursive: true });
  const candidateRoot = await mkdtemp(path.join(DIST_ROOT, '.arena-p1-supply-acceptance.candidate-'));
  let published = false;
  try {
    const targets: TargetBuildResult[] = [];
    for (const target of TARGETS) {
      targets.push(await bundleTarget(target, candidateRoot));
      await writeTargetShell(target, candidateRoot);
    }
    const frozenTargets = Object.freeze(targets);
    assertBundledInputConsistency(frozenTargets);
    const buildId = logicalBuildId(before, frozenTargets);
    await writeBuildIdentities(candidateRoot, mode, before, buildId, frozenTargets);
    if (mode === 'formal-clean-evidence') {
      await writeFormalEvidence(candidateRoot, before, buildId, frozenTargets);
    }
    const after = await sourceIdentity();
    assertSameIdentity(before, after);
    const publication = await publishCandidate(candidateRoot);
    published = true;
    const cleanupWarning = publication.staleBackupPath === null
      ? ''
      : `; warning=stale-backup; staleBackupPath=${publication.staleBackupPath}`;
    process.stdout.write(
      `P1 supply isolated build completed: dist/arena-p1-supply-acceptance/{web,wechat,douyin}; mode=${mode}; sourceDirty=${String(before.sourceDirty)}${cleanupWarning}\n`,
    );
  } finally {
    if (!published) await rm(candidateRoot, { recursive: true, force: true });
  }
}

await main();
