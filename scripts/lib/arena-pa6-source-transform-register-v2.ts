import { createHash } from 'node:crypto';
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  type BigIntStats,
} from 'node:fs';
import { register } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MessageChannel, type MessagePort } from 'node:worker_threads';
import {
  requireArenaPa6ReadStepVariantV1,
  type ArenaPa6ReadStepVariantId,
} from './arena-pa6-read-step-variants-v1.js';
import { transformArenaPa6TargetSourceV2 } from './arena-pa6-source-transform-hook-v2.js';

export const ARENA_PA6_LOADER_CONFIG_ENV_V2 = 'ARENA_PA6_LOADER_CONFIG_V2' as const;
export const ARENA_PA6_LOADER_ATTESTATION_SCHEMA_VERSION_V2 = 2 as const;

const MATCH_CORE_RELATIVE_PATH = 'packages/arena-match/src/match-core.ts';
const ACTION_AFFORDANCE_RELATIVE_PATH = 'packages/arena-core/src/action-affordance.ts';
const WORKSPACE_PACKAGES_RELATIVE_PATH = 'packages';
const WORKSPACE_PACKAGE_PREFIX = '@number-strategy-jump/';
const WORKSPACE_PACKAGE_DIRECTORY_PATTERN = /^arena-[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ArenaPa6LoaderTargetV2 {
  readonly relativePath: string;
  readonly sourceSha256: string;
}

export interface ArenaPa6WorkspaceSourceEntryV2 {
  readonly packageId: string;
  readonly relativePath: string;
  readonly sourceSha256: string;
}

export interface ArenaPa6WorkspaceRedirectHitV2 {
  readonly packageId: string;
  readonly count: number;
}

export interface ArenaPa6WorkspaceSourceModuleV2 {
  readonly packageId: string;
  readonly relativePath: string;
  readonly sourceSha256: string;
}

export interface ArenaPa6LoaderConfigV2 {
  readonly schemaVersion: typeof ARENA_PA6_LOADER_ATTESTATION_SCHEMA_VERSION_V2;
  readonly variantId: ArenaPa6ReadStepVariantId;
  readonly repositoryRoot: string;
  readonly sourceFingerprint: string;
  readonly profileRead: 'broad' | 'split';
  readonly resolverRead: 'sequential' | 'multi-intent';
  readonly workspaceSourceEntries: readonly ArenaPa6WorkspaceSourceEntryV2[];
  readonly targets: Readonly<{
    readonly matchCore: ArenaPa6LoaderTargetV2;
    readonly actionAffordance: ArenaPa6LoaderTargetV2;
  }>;
}

export interface ArenaPa6LoaderFileAttestationV2 {
  readonly relativePath: string;
  readonly sourceSha256: string;
  readonly transformedSha256: string;
}

export interface ArenaPa6LoaderAttestationV2 {
  readonly schemaVersion: typeof ARENA_PA6_LOADER_ATTESTATION_SCHEMA_VERSION_V2;
  readonly variantId: ArenaPa6ReadStepVariantId;
  readonly sourceFingerprint: string;
  readonly profileRead: 'broad' | 'split';
  readonly resolverRead: 'sequential' | 'multi-intent';
  readonly files: Readonly<{
    readonly matchCore: ArenaPa6LoaderFileAttestationV2;
    readonly actionAffordance: ArenaPa6LoaderFileAttestationV2;
  }>;
  readonly sourceAnchorCounts: Readonly<{
    readonly localProfile: 1;
    readonly botProfile: 1;
    readonly previewDecision: 1;
  }>;
  readonly workspaceSourceGraph: Readonly<{
    readonly redirectHits: readonly ArenaPa6WorkspaceRedirectHitV2[];
    readonly sourceModules: readonly ArenaPa6WorkspaceSourceModuleV2[];
    readonly sourceModuleCount: number;
    readonly sourceModuleSetSha256: string;
    readonly distLoads: 0;
  }>;
  readonly replacementCounts: Readonly<{
    readonly profileReads: 0 | 2;
    readonly previewDecision: 0 | 1;
  }>;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], name: string): void {
  const actual = Object.keys(value).sort();
  const orderedExpected = [...expected].sort();
  if (actual.length !== orderedExpected.length
    || actual.some((key, index) => key !== orderedExpected[index])) {
    throw new TypeError(`${name} 字段集合不精确。`);
  }
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function sameStat(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function readStableRegularFile(filePath: string): Buffer {
  const before = lstatSync(filePath, { bigint: true });
  if (!before.isFile() || before.isSymbolicLink()) {
    throw new Error(`PA6 loader target 必须是普通文件：${filePath}`);
  }
  const descriptor = openSync(filePath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  let content: Buffer;
  try {
    const openedBefore = fstatSync(descriptor, { bigint: true });
    if (!sameStat(before, openedBefore)) throw new Error('PA6 loader target open identity 漂移。');
    content = readFileSync(descriptor);
    const openedAfter = fstatSync(descriptor, { bigint: true });
    if (!sameStat(openedBefore, openedAfter)) throw new Error('PA6 loader target 读取期间漂移。');
  } finally {
    closeSync(descriptor);
  }
  const after = lstatSync(filePath, { bigint: true });
  if (!sameStat(before, after)) throw new Error('PA6 loader target 路径读取期间漂移。');
  return content;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireCanonicalDirectory(directoryPath: string, name: string): void {
  const stat = lstatSync(directoryPath, { bigint: true });
  if (!stat.isDirectory() || stat.isSymbolicLink()
    || realpathSync.native(directoryPath) !== directoryPath) {
    throw new Error(`${name} 必须是 canonical 普通目录。`);
  }
}

function readWorkspacePackageId(packageJsonPath: string, expectedPackageId: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readStableRegularFile(packageJsonPath).toString('utf8')) as unknown;
  } catch (error: unknown) {
    throw new Error(
      `PA6 workspace package.json 无法稳定解析：${packageJsonPath}`,
      { cause: error },
    );
  }
  if (!isPlainRecord(parsed)) throw new TypeError('PA6 workspace package.json 必须是 record。');
  const descriptor = Object.getOwnPropertyDescriptor(parsed, 'name');
  if (descriptor === undefined || !Object.hasOwn(descriptor, 'value')
    || descriptor.value !== expectedPackageId) {
    throw new Error(`PA6 workspace package name 与固定目录不一致：${packageJsonPath}`);
  }
  return descriptor.value as string;
}

export function buildArenaPa6WorkspaceSourceEntryManifestV2(
  repositoryRoot: string,
): readonly ArenaPa6WorkspaceSourceEntryV2[] {
  if (!path.isAbsolute(repositoryRoot) || realpathSync.native(repositoryRoot) !== repositoryRoot) {
    throw new Error('PA6 workspace manifest 必须从 canonical repository root 构建。');
  }
  const packagesRoot = path.join(repositoryRoot, WORKSPACE_PACKAGES_RELATIVE_PATH);
  requireCanonicalDirectory(packagesRoot, 'PA6 workspace packages root');
  const packageEntries = readdirSync(packagesRoot, { withFileTypes: true })
    .sort((left, right) => compareStrings(left.name, right.name));
  for (const entry of packageEntries) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) {
      throw new Error(`PA6 workspace packages root 包含非普通目录：${entry.name}`);
    }
  }
  const packageDirectories = packageEntries.map((entry) => entry.name);
  if (packageDirectories.length === 0) throw new Error('PA6 workspace manifest 不能为空。');
  const seenPackageIds = new Set<string>();
  const entries = packageDirectories.map((directoryName) => {
    if (!WORKSPACE_PACKAGE_DIRECTORY_PATTERN.test(directoryName)) {
      throw new Error(`PA6 workspace package 目录名非法：${directoryName}`);
    }
    const packageRoot = path.join(packagesRoot, directoryName);
    requireCanonicalDirectory(packageRoot, `PA6 workspace package ${directoryName}`);
    const packageId = `${WORKSPACE_PACKAGE_PREFIX}${directoryName}`;
    readWorkspacePackageId(path.join(packageRoot, 'package.json'), packageId);
    if (seenPackageIds.has(packageId)) throw new Error(`PA6 workspace package 重复：${packageId}`);
    seenPackageIds.add(packageId);
    const relativePath = `packages/${directoryName}/src/index.ts`;
    const sourcePath = path.join(repositoryRoot, relativePath);
    const sourceSha256 = sha256(readStableRegularFile(sourcePath));
    if (realpathSync.native(sourcePath) !== sourcePath) {
      throw new Error(`PA6 workspace source entry 不得路径逃逸：${relativePath}`);
    }
    return Object.freeze({ packageId, relativePath, sourceSha256 });
  });
  return Object.freeze(entries);
}

function parseWorkspaceSourceEntry(
  value: unknown,
  name: string,
): ArenaPa6WorkspaceSourceEntryV2 {
  if (!isPlainRecord(value)) throw new TypeError(`${name} 必须是 record。`);
  exactKeys(value, ['packageId', 'relativePath', 'sourceSha256'], name);
  if (typeof value.packageId !== 'string'
    || !value.packageId.startsWith(WORKSPACE_PACKAGE_PREFIX)
    || typeof value.relativePath !== 'string'
    || !/^packages\/arena-[a-z0-9]+(?:-[a-z0-9]+)*\/src\/index\.ts$/.test(value.relativePath)
    || typeof value.sourceSha256 !== 'string'
    || !/^[0-9a-f]{64}$/.test(value.sourceSha256)) {
    throw new Error(`${name} identity 非法。`);
  }
  const directoryName = value.packageId.slice(WORKSPACE_PACKAGE_PREFIX.length);
  if (value.relativePath !== `packages/${directoryName}/src/index.ts`) {
    throw new Error(`${name} package/path identity 漂移。`);
  }
  return Object.freeze({
    packageId: value.packageId,
    relativePath: value.relativePath,
    sourceSha256: value.sourceSha256,
  });
}

function parseWorkspaceSourceModule(
  value: unknown,
  name: string,
): ArenaPa6WorkspaceSourceModuleV2 {
  if (!isPlainRecord(value)) throw new TypeError(`${name} 必须是 record。`);
  exactKeys(value, ['packageId', 'relativePath', 'sourceSha256'], name);
  if (typeof value.packageId !== 'string'
    || !value.packageId.startsWith(WORKSPACE_PACKAGE_PREFIX)
    || typeof value.relativePath !== 'string'
    || !/^packages\/arena-[a-z0-9]+(?:-[a-z0-9]+)*\/src\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.ts$/.test(
      value.relativePath,
    )
    || value.relativePath.split('/').some((segment) => segment === '.' || segment === '..')
    || typeof value.sourceSha256 !== 'string'
    || !/^[0-9a-f]{64}$/.test(value.sourceSha256)) {
    throw new Error(`${name} identity 非法。`);
  }
  const directoryName = value.packageId.slice(WORKSPACE_PACKAGE_PREFIX.length);
  if (!value.relativePath.startsWith(`packages/${directoryName}/src/`)) {
    throw new Error(`${name} package/path identity 漂移。`);
  }
  return Object.freeze({
    packageId: value.packageId,
    relativePath: value.relativePath,
    sourceSha256: value.sourceSha256,
  });
}

function sourceModuleSetSha256(modules: readonly ArenaPa6WorkspaceSourceModuleV2[]): string {
  return sha256(JSON.stringify(modules));
}

function validateWorkspaceSourceEntries(
  value: unknown,
  repositoryRoot: string,
): readonly ArenaPa6WorkspaceSourceEntryV2[] {
  if (!Array.isArray(value)) throw new TypeError('PA6 workspaceSourceEntries 必须是 array。');
  const parsed = value.map((entry, index) => parseWorkspaceSourceEntry(
    entry,
    `PA6 workspaceSourceEntries[${index}]`,
  ));
  const expected = buildArenaPa6WorkspaceSourceEntryManifestV2(repositoryRoot);
  if (parsed.length !== expected.length) throw new Error('PA6 workspace source manifest 数量漂移。');
  for (let index = 0; index < expected.length; index += 1) {
    const actual = parsed[index]!;
    const wanted = expected[index]!;
    if (actual.packageId !== wanted.packageId
      || actual.relativePath !== wanted.relativePath
      || actual.sourceSha256 !== wanted.sourceSha256) {
      throw new Error(`PA6 workspace source manifest[${index}] 漂移。`);
    }
  }
  return Object.freeze(parsed);
}

function parseTarget(
  value: unknown,
  name: string,
  expectedRelativePath: string,
): ArenaPa6LoaderTargetV2 {
  if (!isPlainRecord(value)) throw new TypeError(`${name} 必须是 record。`);
  exactKeys(value, ['relativePath', 'sourceSha256'], name);
  if (value.relativePath !== expectedRelativePath) throw new Error(`${name}.relativePath 漂移。`);
  if (typeof value.sourceSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(value.sourceSha256)) {
    throw new Error(`${name}.sourceSha256 非法。`);
  }
  return Object.freeze({
    relativePath: value.relativePath,
    sourceSha256: value.sourceSha256,
  });
}

export function validateArenaPa6LoaderConfigV2(value: unknown): ArenaPa6LoaderConfigV2 {
  if (!isPlainRecord(value)) throw new TypeError('PA6 loader config 必须是 record。');
  exactKeys(value, [
    'schemaVersion', 'variantId', 'repositoryRoot', 'sourceFingerprint',
    'profileRead', 'resolverRead', 'workspaceSourceEntries', 'targets',
  ], 'PA6 loader config');
  if (value.schemaVersion !== ARENA_PA6_LOADER_ATTESTATION_SCHEMA_VERSION_V2) {
    throw new Error('PA6 loader config schema 漂移。');
  }
  const variant = requireArenaPa6ReadStepVariantV1(value.variantId);
  if (typeof value.repositoryRoot !== 'string'
    || !path.isAbsolute(value.repositoryRoot)
    || realpathSync.native(value.repositoryRoot) !== value.repositoryRoot) {
    throw new Error('PA6 loader repositoryRoot 必须是 canonical absolute path。');
  }
  if (typeof value.sourceFingerprint !== 'string'
    || !/^[0-9a-f]{64}$/.test(value.sourceFingerprint)) {
    throw new Error('PA6 loader sourceFingerprint 非法。');
  }
  if (value.profileRead !== variant.profileRead || value.resolverRead !== variant.resolverRead) {
    throw new Error('PA6 loader variant/read path identity 不一致。');
  }
  if (!isPlainRecord(value.targets)) throw new TypeError('PA6 loader targets 必须是 record。');
  exactKeys(value.targets, ['matchCore', 'actionAffordance'], 'PA6 loader targets');
  return Object.freeze({
    schemaVersion: ARENA_PA6_LOADER_ATTESTATION_SCHEMA_VERSION_V2,
    variantId: variant.id,
    repositoryRoot: value.repositoryRoot,
    sourceFingerprint: value.sourceFingerprint,
    profileRead: variant.profileRead,
    resolverRead: variant.resolverRead,
    workspaceSourceEntries: validateWorkspaceSourceEntries(
      value.workspaceSourceEntries,
      value.repositoryRoot,
    ),
    targets: Object.freeze({
      matchCore: parseTarget(
        value.targets.matchCore,
        'PA6 loader matchCore target',
        MATCH_CORE_RELATIVE_PATH,
      ),
      actionAffordance: parseTarget(
        value.targets.actionAffordance,
        'PA6 loader actionAffordance target',
        ACTION_AFFORDANCE_RELATIVE_PATH,
      ),
    }),
  });
}

export function createArenaPa6LoaderConfigV2(options: {
  readonly repositoryRoot: string;
  readonly sourceFingerprint: string;
  readonly variantId: ArenaPa6ReadStepVariantId;
}): ArenaPa6LoaderConfigV2 {
  const repositoryRoot = realpathSync.native(options.repositoryRoot);
  if (repositoryRoot !== options.repositoryRoot) {
    throw new Error('PA6 loader config 必须从 canonical repository root 创建。');
  }
  const variant = requireArenaPa6ReadStepVariantV1(options.variantId);
  const workspaceSourceEntries = buildArenaPa6WorkspaceSourceEntryManifestV2(repositoryRoot);
  const target = (relativePath: string): ArenaPa6LoaderTargetV2 => {
    const sourcePath = path.join(repositoryRoot, relativePath);
    return Object.freeze({ relativePath, sourceSha256: sha256(readStableRegularFile(sourcePath)) });
  };
  return validateArenaPa6LoaderConfigV2({
    schemaVersion: ARENA_PA6_LOADER_ATTESTATION_SCHEMA_VERSION_V2,
    variantId: variant.id,
    repositoryRoot,
    sourceFingerprint: options.sourceFingerprint,
    profileRead: variant.profileRead,
    resolverRead: variant.resolverRead,
    workspaceSourceEntries,
    targets: {
      matchCore: target(MATCH_CORE_RELATIVE_PATH),
      actionAffordance: target(ACTION_AFFORDANCE_RELATIVE_PATH),
    },
  });
}

function validateAttestedFile(
  value: unknown,
  expected: ArenaPa6LoaderTargetV2,
  name: string,
): ArenaPa6LoaderFileAttestationV2 {
  if (!isPlainRecord(value)) throw new TypeError(`${name} 必须是 record。`);
  exactKeys(value, ['relativePath', 'sourceSha256', 'transformedSha256'], name);
  if (value.relativePath !== expected.relativePath || value.sourceSha256 !== expected.sourceSha256) {
    throw new Error(`${name} source identity 漂移。`);
  }
  if (typeof value.transformedSha256 !== 'string'
    || !/^[0-9a-f]{64}$/.test(value.transformedSha256)) {
    throw new Error(`${name}.transformedSha256 非法。`);
  }
  return Object.freeze({
    relativePath: value.relativePath,
    sourceSha256: value.sourceSha256,
    transformedSha256: value.transformedSha256,
  });
}

function validateWorkspaceSourceGraph(
  value: unknown,
  expectedConfig: ArenaPa6LoaderConfigV2,
): ArenaPa6LoaderAttestationV2['workspaceSourceGraph'] {
  if (!isPlainRecord(value)) throw new TypeError('PA6 workspaceSourceGraph 必须是 record。');
  exactKeys(value, [
    'redirectHits', 'sourceModules', 'sourceModuleCount', 'sourceModuleSetSha256', 'distLoads',
  ], 'PA6 workspaceSourceGraph');
  if (value.distLoads !== 0) throw new Error('PA6 workspace distLoads 必须严格为 0。');
  if (!Array.isArray(value.redirectHits) || !Array.isArray(value.sourceModules)) {
    throw new TypeError('PA6 workspace source graph hits/modules 必须是 array。');
  }
  const manifestByPackageId = new Map(
    expectedConfig.workspaceSourceEntries.map((entry) => [entry.packageId, entry]),
  );
  const redirectHits = value.redirectHits.map((candidate, index) => {
    const name = `PA6 workspace redirectHits[${index}]`;
    if (!isPlainRecord(candidate)) throw new TypeError(`${name} 必须是 record。`);
    exactKeys(candidate, ['packageId', 'count'], name);
    if (typeof candidate.packageId !== 'string'
      || !manifestByPackageId.has(candidate.packageId)
      || !Number.isSafeInteger(candidate.count) || (candidate.count as number) < 1) {
      throw new Error(`${name} identity/count 非法。`);
    }
    return Object.freeze({ packageId: candidate.packageId, count: candidate.count as number });
  });
  const sourceModules = value.sourceModules.map((candidate, index) => {
    const module = parseWorkspaceSourceModule(candidate, `PA6 workspace sourceModules[${index}]`);
    if (!manifestByPackageId.has(module.packageId)) {
      throw new Error(`PA6 workspace sourceModules[${index}] package 未纳入固定 manifest。`);
    }
    const sourcePath = path.join(expectedConfig.repositoryRoot, module.relativePath);
    if (realpathSync.native(sourcePath) !== sourcePath
      || sha256(readStableRegularFile(sourcePath)) !== module.sourceSha256) {
      throw new Error(`PA6 workspace sourceModules[${index}] source identity 漂移。`);
    }
    return module;
  });
  if (redirectHits.length === 0 || sourceModules.length === 0) {
    throw new Error('PA6 workspace source graph 命中或实际源码模块集合为空。');
  }
  for (let index = 0; index < redirectHits.length; index += 1) {
    const hit = redirectHits[index]!;
    if (index > 0 && compareStrings(redirectHits[index - 1]!.packageId, hit.packageId) >= 0) {
      throw new Error('PA6 workspace redirectHits 必须按 packageId 严格排序且唯一。');
    }
  }
  for (let index = 0; index < sourceModules.length; index += 1) {
    const module = sourceModules[index]!;
    if (index > 0
      && compareStrings(sourceModules[index - 1]!.relativePath, module.relativePath) >= 0) {
      throw new Error('PA6 workspace sourceModules 必须按 relativePath 严格排序且唯一。');
    }
  }
  const packageIds = new Set(redirectHits.map(({ packageId }) => packageId));
  if (!packageIds.has('@number-strategy-jump/arena-core')
    || !packageIds.has('@number-strategy-jump/arena-match')) {
    throw new Error('PA6 workspace source graph 未真实加载 arena-core/arena-match。');
  }
  const sourceModulesByRelativePath = new Map(
    sourceModules.map((module) => [module.relativePath, module]),
  );
  for (const { packageId } of redirectHits) {
    const entry = manifestByPackageId.get(packageId)!;
    const loadedEntry = sourceModulesByRelativePath.get(entry.relativePath);
    if (loadedEntry?.packageId !== packageId
      || loadedEntry.sourceSha256 !== entry.sourceSha256) {
      throw new Error(`PA6 workspace root redirect 未执行同字节 source entry：${packageId}`);
    }
  }
  for (const module of sourceModules) {
    if (!packageIds.has(module.packageId)) {
      throw new Error(`PA6 workspace source module 缺少对应 root redirect：${module.packageId}`);
    }
  }
  if (!Number.isSafeInteger(value.sourceModuleCount)
    || value.sourceModuleCount !== sourceModules.length) {
    throw new Error('PA6 workspace sourceModuleCount 与实际模块集合不一致。');
  }
  if (typeof value.sourceModuleSetSha256 !== 'string'
    || !/^[0-9a-f]{64}$/.test(value.sourceModuleSetSha256)
    || value.sourceModuleSetSha256 !== sourceModuleSetSha256(sourceModules)) {
    throw new Error('PA6 workspace sourceModuleSetSha256 无法由实际模块集合重算。');
  }
  return Object.freeze({
    redirectHits: Object.freeze(redirectHits),
    sourceModules: Object.freeze(sourceModules),
    sourceModuleCount: sourceModules.length,
    sourceModuleSetSha256: value.sourceModuleSetSha256,
    distLoads: 0,
  });
}

export function validateArenaPa6LoaderAttestationV2(
  value: unknown,
  expectedConfig: ArenaPa6LoaderConfigV2,
): ArenaPa6LoaderAttestationV2 {
  expectedConfig = validateArenaPa6LoaderConfigV2(expectedConfig);
  if (!isPlainRecord(value)) throw new TypeError('PA6 loader attestation 必须是 record。');
  exactKeys(value, [
    'schemaVersion', 'variantId', 'sourceFingerprint', 'profileRead', 'resolverRead',
    'files', 'sourceAnchorCounts', 'workspaceSourceGraph', 'replacementCounts',
  ], 'PA6 loader attestation');
  if (value.schemaVersion !== ARENA_PA6_LOADER_ATTESTATION_SCHEMA_VERSION_V2
    || value.variantId !== expectedConfig.variantId
    || value.sourceFingerprint !== expectedConfig.sourceFingerprint
    || value.profileRead !== expectedConfig.profileRead
    || value.resolverRead !== expectedConfig.resolverRead) {
    throw new Error('PA6 loader attestation identity 漂移。');
  }
  if (!isPlainRecord(value.files)) throw new TypeError('PA6 loader attestation files 非法。');
  exactKeys(value.files, ['matchCore', 'actionAffordance'], 'PA6 loader attestation files');
  if (!isPlainRecord(value.sourceAnchorCounts)) {
    throw new TypeError('PA6 loader sourceAnchorCounts 非法。');
  }
  exactKeys(
    value.sourceAnchorCounts,
    ['localProfile', 'botProfile', 'previewDecision'],
    'PA6 loader sourceAnchorCounts',
  );
  if (value.sourceAnchorCounts.localProfile !== 1
    || value.sourceAnchorCounts.botProfile !== 1
    || value.sourceAnchorCounts.previewDecision !== 1) {
    throw new Error('PA6 loader source anchor count 漂移。');
  }
  const workspaceSourceGraph = validateWorkspaceSourceGraph(
    value.workspaceSourceGraph,
    expectedConfig,
  );
  if (!isPlainRecord(value.replacementCounts)) {
    throw new TypeError('PA6 loader replacementCounts 非法。');
  }
  exactKeys(
    value.replacementCounts,
    ['profileReads', 'previewDecision'],
    'PA6 loader replacementCounts',
  );
  const expectedProfileReplacements = expectedConfig.profileRead === 'broad' ? 2 : 0;
  const expectedPreviewReplacements = expectedConfig.resolverRead === 'sequential' ? 1 : 0;
  if (value.replacementCounts.profileReads !== expectedProfileReplacements
    || value.replacementCounts.previewDecision !== expectedPreviewReplacements) {
    throw new Error('PA6 loader replacement count 与 variant 不一致。');
  }
  const matchCoreFile = validateAttestedFile(
    value.files.matchCore,
    expectedConfig.targets.matchCore,
    'PA6 loader matchCore attestation',
  );
  const actionAffordanceFile = validateAttestedFile(
    value.files.actionAffordance,
    expectedConfig.targets.actionAffordance,
    'PA6 loader actionAffordance attestation',
  );
  const sourceModuleByRelativePath = new Map(
    workspaceSourceGraph.sourceModules.map((module) => [module.relativePath, module]),
  );
  for (const file of [matchCoreFile, actionAffordanceFile]) {
    const sourceModule = sourceModuleByRelativePath.get(file.relativePath);
    if (sourceModule?.sourceSha256 !== file.sourceSha256) {
      throw new Error(`PA6 loader target 未包含在实际执行 sourceModules：${file.relativePath}`);
    }
  }
  const matchCoreTransform = transformArenaPa6TargetSourceV2({
    targetName: 'matchCore',
    source: readStableRegularFile(path.join(
      expectedConfig.repositoryRoot,
      expectedConfig.targets.matchCore.relativePath,
    )).toString('utf8'),
    profileRead: expectedConfig.profileRead,
    resolverRead: expectedConfig.resolverRead,
  });
  const actionAffordanceTransform = transformArenaPa6TargetSourceV2({
    targetName: 'actionAffordance',
    source: readStableRegularFile(path.join(
      expectedConfig.repositoryRoot,
      expectedConfig.targets.actionAffordance.relativePath,
    )).toString('utf8'),
    profileRead: expectedConfig.profileRead,
    resolverRead: expectedConfig.resolverRead,
  });
  if (matchCoreFile.transformedSha256 !== sha256(matchCoreTransform.source)
    || actionAffordanceFile.transformedSha256 !== sha256(actionAffordanceTransform.source)
    || matchCoreTransform.sourceAnchorCounts.localProfile !== value.sourceAnchorCounts.localProfile
    || matchCoreTransform.sourceAnchorCounts.botProfile !== value.sourceAnchorCounts.botProfile
    || actionAffordanceTransform.sourceAnchorCounts.previewDecision
      !== value.sourceAnchorCounts.previewDecision
    || matchCoreTransform.replacementCounts.profileReads
      !== value.replacementCounts.profileReads
    || actionAffordanceTransform.replacementCounts.previewDecision
      !== value.replacementCounts.previewDecision) {
    throw new Error('PA6 loader transformed hash/count 无法由固定源码变换重算。');
  }
  return Object.freeze({
    schemaVersion: ARENA_PA6_LOADER_ATTESTATION_SCHEMA_VERSION_V2,
    variantId: expectedConfig.variantId,
    sourceFingerprint: expectedConfig.sourceFingerprint,
    profileRead: expectedConfig.profileRead,
    resolverRead: expectedConfig.resolverRead,
    files: Object.freeze({
      matchCore: matchCoreFile,
      actionAffordance: actionAffordanceFile,
    }),
    sourceAnchorCounts: Object.freeze({
      localProfile: 1,
      botProfile: 1,
      previewDecision: 1,
    }),
    workspaceSourceGraph,
    replacementCounts: Object.freeze({
      profileReads: expectedProfileReplacements as 0 | 2,
      previewDecision: expectedPreviewReplacements as 0 | 1,
    }),
  });
}

let activeConfig: ArenaPa6LoaderConfigV2 | null = null;
let attestationPromise: Promise<ArenaPa6LoaderAttestationV2> | null = null;
let attestationPort: MessagePort | null = null;
let finalizeRequested = false;

function registerFromEnvironment(): void {
  const raw = process.env[ARENA_PA6_LOADER_CONFIG_ENV_V2];
  if (raw === undefined) return;
  Reflect.deleteProperty(process.env, ARENA_PA6_LOADER_CONFIG_ENV_V2);
  if (Buffer.byteLength(raw, 'utf8') > 64 * 1024) throw new Error('PA6 loader config 超出上限。');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('PA6 loader config 不是完整 JSON。');
  }
  const config = validateArenaPa6LoaderConfigV2(parsed);
  const channel = new MessageChannel();
  activeConfig = config;
  attestationPort = channel.port1;
  attestationPromise = new Promise<ArenaPa6LoaderAttestationV2>((resolve, reject) => {
    const port = channel.port1;
    const finish = (callback: () => void): void => {
      port.removeAllListeners();
      port.close();
      callback();
    };
    port.once('message', (value: unknown) => {
      try {
        const attestation = validateArenaPa6LoaderAttestationV2(value, config);
        finish(() => resolve(attestation));
      } catch (error: unknown) {
        finish(() => reject(error));
      }
    });
    port.once('messageerror', () => {
      finish(() => reject(new Error('PA6 loader attestation message 无法反序列化。')));
    });
  });
  const hookUrl = pathToFileURL(path.join(
    config.repositoryRoot,
    'scripts/lib/arena-pa6-source-transform-hook-v2.ts',
  ));
  register(hookUrl, {
    parentURL: import.meta.url,
    data: Object.freeze({
      config,
      port: channel.port2,
    }),
    transferList: [channel.port2],
  });
}

registerFromEnvironment();

export function requireArenaPa6ActiveLoaderConfigV2(): ArenaPa6LoaderConfigV2 {
  if (activeConfig === null) throw new Error('PA6 loader 未通过 preload config 激活。');
  return activeConfig;
}

export async function readArenaPa6LoaderAttestationV2(
  timeoutMs = 30_000,
): Promise<ArenaPa6LoaderAttestationV2> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new RangeError('PA6 loader attestation timeout 必须是正安全整数。');
  }
  if (attestationPromise === null) throw new Error('PA6 loader attestation 不可用。');
  if (!finalizeRequested) {
    finalizeRequested = true;
    if (attestationPort === null) throw new Error('PA6 loader attestation port 不可用。');
    attestationPort.postMessage(Object.freeze({ schemaVersion: 2, type: 'finalize' }));
  }
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      attestationPromise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('PA6 loader attestation timeout。')), timeoutMs);
        timer.unref();
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
