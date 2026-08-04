import { createHash } from 'node:crypto';
import type { BigIntStats } from 'node:fs';
import { lstat } from 'node:fs/promises';
import path from 'node:path';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceBoundedString,
  assertEvidenceGitCommit,
  assertEvidenceRelativePath,
  assertEvidenceSha256,
} from '@number-strategy-jump/arena-evidence-contracts';
import {
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND,
} from '../../packages/arena-device-acceptance/src/arena-device-acceptance-definition.js';
import {
  ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS,
  createArenaDeviceAcceptanceBundle,
  createArenaDeviceAcceptanceReport,
} from '../../packages/arena-device-acceptance/src/arena-device-acceptance-bundle.js';
import {
  ARENA_P1_SUPPLY_DEVICE_CHECK_ID,
  ARENA_P1_SUPPLY_ACCEPTANCE_PLATFORM,
  ARENA_P1_SUPPLY_DEVICE_TARGET_ID,
  createArenaP1SupplyAcceptanceBuildAttestationV1,
  createArenaP1SupplyDeviceAcceptanceV1Definition,
} from '../../packages/arena-device-acceptance/src/arena-p1-supply-device-acceptance-v1.js';
import type {
  ArenaP1SupplyAcceptanceBuildAttestationV1,
  ArenaP1SupplyAcceptancePlatform,
} from '../../packages/arena-device-acceptance/src/arena-p1-supply-device-acceptance-v1.js';
import {
  readVerifiedEvidenceArtifact,
  resolveEvidenceRoot,
} from './evidence-file-verifier.js';

const MAXIMUM_JSON_BYTES = 5 * 1024 * 1024;
const VERIFIER_OPTION_KEYS = new Set(['bundleValue', 'artifactsRoot', 'expectedIdentity']);
const EXPECTED_IDENTITY_KEYS = new Set([
  'commit',
  'repositoryFingerprint',
  'buildId',
  'adapterModuleHash',
  'assetManifestHash',
  'productionReachabilityAuditHash',
  'platformAttestationHashes',
]);
const PLATFORM_HASH_KEYS = new Set(['web', 'wechat', 'douyin']);
const ARTIFACT_MANIFEST_KEYS = new Set(['schemaVersion', 'purpose', 'platform', 'artifacts']);
const ARTIFACT_MANIFEST_ENTRY_KEYS = new Set(['role', 'path', 'sha256', 'byteLength']);
const REACHABILITY_AUDIT_KEYS = new Set([
  'schemaVersion',
  'purpose',
  'commit',
  'repositoryFingerprint',
  'buildId',
  'defaultProductReachable',
  'releaseArtifactReachable',
  'auditedProductionEntries',
  'auditedReleaseArtifacts',
]);
const RUN_LOG_KEYS = new Set([
  'schemaVersion',
  'purpose',
  'commit',
  'buildId',
  'targetId',
  'runId',
  'checkIds',
  'resourcePeaks',
  'cleanup',
]);
const RESOURCE_COUNT_KEYS = new Set([
  'markerCount',
  'pendingReplacementPairCount',
  'recentEventHashCount',
  'voiceCount',
  'particleCount',
  'listenerCount',
  'gpuHandleCount',
  'asyncCallbackCount',
]);
const CLEANUP_KEYS = new Set([...RESOURCE_COUNT_KEYS, 'destroyCallCount']);
const PLATFORM_ORDER = Object.freeze([
  ARENA_P1_SUPPLY_ACCEPTANCE_PLATFORM.WEB,
  ARENA_P1_SUPPLY_ACCEPTANCE_PLATFORM.WECHAT,
  ARENA_P1_SUPPLY_ACCEPTANCE_PLATFORM.DOUYIN,
]);
const ARTIFACT_ROLE_ORDER = Object.freeze([
  'adapter-module',
  'asset-manifest',
  'harness-module',
  'production-reachability-audit',
] as const);
const WEB_VIEWPORT_ARTIFACT_IDS = Object.freeze([
  'web-390x844-screenshot',
  'web-390x844-video',
  'web-1440x900-screenshot',
  'web-1440x900-video',
]);
const REQUIRED_CHECK_IDS = Object.freeze(
  Object.values(ARENA_P1_SUPPLY_DEVICE_CHECK_ID).sort(compareText),
);

type DeviceBundle = ReturnType<typeof createArenaDeviceAcceptanceBundle>;
type DeviceRecord = DeviceBundle['records'][number];
type DeviceArtifact = DeviceRecord['artifacts'][number];
type ArtifactRole = typeof ARTIFACT_ROLE_ORDER[number];

interface ExpectedIdentity {
  readonly commit: string;
  readonly repositoryFingerprint: string;
  readonly buildId: string;
  readonly adapterModuleHash: string;
  readonly assetManifestHash: string;
  readonly productionReachabilityAuditHash: string;
  readonly platformAttestationHashes: Readonly<Record<ArenaP1SupplyAcceptancePlatform, string>>;
}

interface VerifiedArtifact {
  readonly path: string;
  readonly kind: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly fileIdentity: string;
  readonly text: string | null;
}

interface ArtifactManifestEntry {
  readonly role: ArtifactRole;
  readonly path: string;
  readonly sha256: string;
  readonly byteLength: number;
}

interface ArtifactManifest {
  readonly schemaVersion: 1;
  readonly purpose: 'p1-supply-acceptance-artifact-manifest';
  readonly platform: ArenaP1SupplyAcceptancePlatform;
  readonly artifacts: readonly ArtifactManifestEntry[];
}

interface PathState {
  readonly dev: bigint;
  readonly ino: bigint;
  readonly mode: bigint;
  readonly size: bigint;
  readonly mtimeNs: bigint;
  readonly ctimeNs: bigint;
}

interface RootIdentity {
  readonly lexicalPath: string;
  readonly resolvedPath: string;
  readonly state: PathState;
}

export interface ArenaP1SupplyDeviceEvidenceVerification {
  readonly definition: ReturnType<typeof createArenaP1SupplyDeviceAcceptanceV1Definition>;
  readonly bundle: DeviceBundle;
  readonly report: ReturnType<typeof createArenaDeviceAcceptanceReport>;
  readonly expectedIdentity: ExpectedIdentity;
  readonly attestations: readonly ArenaP1SupplyAcceptanceBuildAttestationV1[];
  readonly artifacts: readonly VerifiedArtifact[];
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function platform(value: unknown, name: string): ArenaP1SupplyAcceptancePlatform {
  if (
    value !== ARENA_P1_SUPPLY_ACCEPTANCE_PLATFORM.WEB
    && value !== ARENA_P1_SUPPLY_ACCEPTANCE_PLATFORM.WECHAT
    && value !== ARENA_P1_SUPPLY_ACCEPTANCE_PLATFORM.DOUYIN
  ) throw new RangeError(`${name} 不受支持。`);
  return value;
}

function normalizeExpectedIdentity(value: unknown): ExpectedIdentity {
  const source = cloneFrozenData(value, 'P1 supply expected clean identity');
  assertKnownKeys(source, EXPECTED_IDENTITY_KEYS, 'P1 supply expected clean identity');
  assertKnownKeys(
    source.platformAttestationHashes,
    PLATFORM_HASH_KEYS,
    'P1 supply expected clean identity.platformAttestationHashes',
  );
  const platformAttestationHashes = Object.freeze({
    web: assertEvidenceSha256(
      source.platformAttestationHashes.web,
      'P1 supply expected web attestation hash',
    ),
    wechat: assertEvidenceSha256(
      source.platformAttestationHashes.wechat,
      'P1 supply expected wechat attestation hash',
    ),
    douyin: assertEvidenceSha256(
      source.platformAttestationHashes.douyin,
      'P1 supply expected douyin attestation hash',
    ),
  });
  if (new Set(Object.values(platformAttestationHashes)).size !== PLATFORM_ORDER.length) {
    throw new RangeError('P1 supply 三平台 attestationHash 必须各自唯一。');
  }
  return Object.freeze({
    commit: assertEvidenceGitCommit(source.commit, 'P1 supply expected commit'),
    repositoryFingerprint: assertEvidenceSha256(
      source.repositoryFingerprint,
      'P1 supply expected repository fingerprint',
    ),
    buildId: assertEvidenceBoundedString(
      source.buildId,
      256,
      'P1 supply expected buildId',
      { rejectControlCharacters: true },
    ),
    adapterModuleHash: assertEvidenceSha256(
      source.adapterModuleHash,
      'P1 supply expected adapter module hash',
    ),
    assetManifestHash: assertEvidenceSha256(
      source.assetManifestHash,
      'P1 supply expected asset manifest hash',
    ),
    productionReachabilityAuditHash: assertEvidenceSha256(
      source.productionReachabilityAuditHash,
      'P1 supply expected production reachability audit hash',
    ),
    platformAttestationHashes,
  });
}

function canonicalAttestationHash(
  attestation: ArenaP1SupplyAcceptanceBuildAttestationV1,
): string {
  return sha256(JSON.stringify({
    schemaVersion: attestation.schemaVersion,
    purpose: attestation.purpose,
    commit: attestation.commit,
    sourceDirty: attestation.sourceDirty,
    repositoryFingerprint: attestation.repositoryFingerprint,
    buildId: attestation.buildId,
    platform: attestation.platform,
    adapterModuleHash: attestation.adapterModuleHash,
    harnessModuleHash: attestation.harnessModuleHash,
    productionReachabilityAuditHash: attestation.productionReachabilityAuditHash,
    assetManifestHash: attestation.assetManifestHash,
    artifactManifestHash: attestation.artifactManifestHash,
  }));
}

function samePathState(left: PathState, right: PathState): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function pathState(value: BigIntStats): PathState {
  return Object.freeze({
    dev: value.dev,
    ino: value.ino,
    mode: value.mode,
    size: value.size,
    mtimeNs: value.mtimeNs,
    ctimeNs: value.ctimeNs,
  });
}

async function lstatEvidenceRoot(root: string, phase: string): Promise<BigIntStats> {
  try {
    return await lstat(root, { bigint: true });
  } catch (cause) {
    throw new Error(`P1 supply artifactsRoot generation 在${phase}不可读取。`, { cause });
  }
}

async function realpathEvidenceRoot(root: string, phase: string): Promise<string> {
  try {
    return await resolveEvidenceRoot(root);
  } catch (cause) {
    throw new Error(`P1 supply artifactsRoot generation 在${phase}无法解析。`, { cause });
  }
}

function assertEvidenceRootDirectory(state: BigIntStats, phase: string): void {
  if (state.isSymbolicLink()) {
    throw new Error(`P1 supply artifactsRoot generation 在${phase}变成符号链接。`);
  }
  if (!state.isDirectory()) {
    throw new Error(`P1 supply artifactsRoot generation 在${phase}不再是目录。`);
  }
}

async function captureRootIdentity(rootValue: string): Promise<RootIdentity> {
  const lexicalPath = path.resolve(rootValue);
  const before = await lstatEvidenceRoot(lexicalPath, '初始校验前');
  assertEvidenceRootDirectory(before, '初始校验前');
  const resolvedPath = await realpathEvidenceRoot(lexicalPath, '初始校验中');
  if (resolvedPath !== lexicalPath) {
    throw new Error('P1 supply artifactsRoot 必须使用无符号链接的 canonical 路径。');
  }
  const after = await lstatEvidenceRoot(lexicalPath, '初始解析后');
  assertEvidenceRootDirectory(after, '初始解析后');
  const beforeState = pathState(before);
  const afterState = pathState(after);
  if (!samePathState(beforeState, afterState)) {
    throw new Error('P1 supply artifactsRoot 在初始校验期间发生变化。');
  }
  return Object.freeze({ lexicalPath, resolvedPath, state: afterState });
}

async function assertRootIdentity(identity: RootIdentity): Promise<void> {
  const before = await lstatEvidenceRoot(identity.lexicalPath, '复核前');
  assertEvidenceRootDirectory(before, '复核前');
  const beforeState = pathState(before);
  if (!samePathState(identity.state, beforeState)) {
    throw new Error('P1 supply artifactsRoot generation 在复核前已被替换。');
  }
  const resolvedPath = await realpathEvidenceRoot(identity.lexicalPath, '复核解析中');
  if (resolvedPath !== identity.resolvedPath) {
    throw new Error('P1 supply artifactsRoot generation 在复核解析中被替换。');
  }
  const after = await lstatEvidenceRoot(identity.lexicalPath, '复核解析后');
  assertEvidenceRootDirectory(after, '复核解析后');
  const afterState = pathState(after);
  if (
    !samePathState(identity.state, afterState)
    || !samePathState(beforeState, afterState)
  ) throw new Error('P1 supply artifactsRoot generation 在复核解析期间发生变化。');
}

async function captureNoSymlinkPath(
  root: string,
  relativePath: string,
  label: string,
): Promise<readonly PathState[]> {
  const segments = relativePath.split('/');
  const states: PathState[] = [];
  let current = root;
  for (const segment of segments) {
    current = path.join(current, segment);
    const state = await lstat(current, { bigint: true });
    if (state.isSymbolicLink()) throw new Error(`${label} 不能包含符号链接。`);
    states.push(Object.freeze({
      dev: state.dev,
      ino: state.ino,
      mode: state.mode,
      size: state.size,
      mtimeNs: state.mtimeNs,
      ctimeNs: state.ctimeNs,
    }));
  }
  return Object.freeze(states);
}

async function readArtifact(
  root: string,
  artifact: DeviceArtifact,
): Promise<VerifiedArtifact> {
  const relativePath = assertEvidenceRelativePath(
    artifact.path,
    `P1 supply artifact ${artifact.id}.path`,
  );
  const before = await captureNoSymlinkPath(root, relativePath, `artifact ${relativePath}`);
  const checked = await readVerifiedEvidenceArtifact({
    root,
    relativePath,
    expectedByteLength: artifact.byteLength,
    expectedSha256: artifact.sha256,
    maximumBytes: artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST
      || artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG
      ? MAXIMUM_JSON_BYTES
      : null,
    includeText: artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST
      || artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG,
    label: `P1 supply artifact ${relativePath}`,
  });
  const lexicalPath = path.resolve(root, relativePath);
  if (checked.resolvedPath !== lexicalPath) {
    throw new Error(`artifact ${relativePath} 不能通过符号链接解析。`);
  }
  const after = await captureNoSymlinkPath(root, relativePath, `artifact ${relativePath}`);
  if (
    before.length !== after.length
    || before.some((state, index) => !samePathState(state, after[index] as PathState))
  ) throw new Error(`artifact ${relativePath} 在校验期间发生变化。`);
  return Object.freeze({
    path: relativePath,
    kind: artifact.kind,
    byteLength: checked.byteLength,
    sha256: checked.sha256,
    fileIdentity: checked.fileIdentity,
    text: checked.text,
  });
}

function collectArtifactDescriptors(bundle: DeviceBundle): readonly DeviceArtifact[] {
  const byPath = new Map<string, DeviceArtifact>();
  for (const record of bundle.records) {
    for (const artifact of record.artifacts) {
      const previous = byPath.get(artifact.path);
      if (previous === undefined) {
        byPath.set(artifact.path, artifact);
        continue;
      }
      if (
        previous.kind !== ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST
        || artifact.kind !== ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST
        || previous.sha256 !== artifact.sha256
        || previous.byteLength !== artifact.byteLength
      ) throw new Error(`P1 supply artifact 路径 ${artifact.path} 被不一致地重复引用。`);
    }
  }
  return Object.freeze([...byPath.values()].sort((left, right) => compareText(left.path, right.path)));
}

async function verifyAllArtifacts(
  bundle: DeviceBundle,
  rootValue: string,
): Promise<readonly VerifiedArtifact[]> {
  const rootIdentity = await captureRootIdentity(rootValue);
  const root = rootIdentity.resolvedPath;
  await assertRootIdentity(rootIdentity);
  const descriptors = collectArtifactDescriptors(bundle);
  const verified: VerifiedArtifact[] = [];
  const byFile = new Map<string, string>();
  const byHash = new Map<string, string>();
  for (const descriptor of descriptors) {
    await assertRootIdentity(rootIdentity);
    let checked: VerifiedArtifact;
    try {
      checked = await readArtifact(root, descriptor);
    } catch (error) {
      await assertRootIdentity(rootIdentity);
      throw error;
    }
    await assertRootIdentity(rootIdentity);
    const previousFile = byFile.get(checked.fileIdentity);
    if (previousFile !== undefined) {
      throw new Error(`artifact ${checked.path} 与 ${previousFile} 指向同一文件。`);
    }
    const previousHash = byHash.get(checked.sha256);
    if (previousHash !== undefined) {
      throw new Error(`artifact ${checked.path} 与 ${previousHash} 内容重复。`);
    }
    byFile.set(checked.fileIdentity, checked.path);
    byHash.set(checked.sha256, checked.path);
    verified.push(checked);
  }
  await assertRootIdentity(rootIdentity);
  return Object.freeze(verified);
}

function parseJson(text: string | null, name: string): unknown {
  if (text === null) throw new Error(`${name} 缺少 JSON 文本。`);
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(`${name} 不是有效 JSON。`, { cause: error });
  }
}

function findArtifactByPath(
  artifacts: readonly VerifiedArtifact[],
  relativePath: string,
  name: string,
): VerifiedArtifact {
  const found = artifacts.filter(({ path: artifactPath }) => artifactPath === relativePath);
  if (found.length !== 1) throw new Error(`${name} 必须精确引用一个已验证 artifact。`);
  return found[0] as VerifiedArtifact;
}

function findArtifactByHash(
  artifacts: readonly VerifiedArtifact[],
  hash: string,
  name: string,
): VerifiedArtifact {
  const found = artifacts.filter(({ sha256: artifactHash }) => artifactHash === hash);
  if (found.length !== 1) throw new Error(`${name} 必须精确绑定一个已验证 artifact。`);
  return found[0] as VerifiedArtifact;
}

function manifestRole(value: unknown, name: string): ArtifactRole {
  if (!ARTIFACT_ROLE_ORDER.includes(value as ArtifactRole)) {
    throw new RangeError(`${name} 不受支持。`);
  }
  return value as ArtifactRole;
}

function normalizeArtifactManifest(value: unknown): ArtifactManifest {
  const source = cloneFrozenData(value, 'P1 supply artifact manifest');
  assertKnownKeys(source, ARTIFACT_MANIFEST_KEYS, 'P1 supply artifact manifest');
  if (source.schemaVersion !== 1) throw new RangeError('P1 supply artifact manifest schema 必须为 1。');
  if (source.purpose !== 'p1-supply-acceptance-artifact-manifest') {
    throw new RangeError('P1 supply artifact manifest purpose 不受支持。');
  }
  if (!Array.isArray(source.artifacts) || source.artifacts.length !== ARTIFACT_ROLE_ORDER.length) {
    throw new RangeError('P1 supply artifact manifest 必须精确包含四个角色。');
  }
  const entries = source.artifacts.map((value: unknown, index): ArtifactManifestEntry => {
    const name = `P1 supply artifact manifest.artifacts[${index}]`;
    assertKnownKeys(value, ARTIFACT_MANIFEST_ENTRY_KEYS, name);
    const role = manifestRole(value.role, `${name}.role`);
    if (role !== ARTIFACT_ROLE_ORDER[index]) {
      throw new RangeError('P1 supply artifact manifest 角色顺序不稳定。');
    }
    return Object.freeze({
      role,
      path: assertEvidenceRelativePath(value.path, `${name}.path`),
      sha256: assertEvidenceSha256(value.sha256, `${name}.sha256`),
      byteLength: assertIntegerAtLeast(value.byteLength, 1, `${name}.byteLength`),
    });
  });
  if (new Set(entries.map(({ path: entryPath }) => entryPath)).size !== entries.length) {
    throw new RangeError('P1 supply artifact manifest 路径不能重复。');
  }
  return Object.freeze({
    schemaVersion: 1,
    purpose: 'p1-supply-acceptance-artifact-manifest',
    platform: platform(source.platform, 'P1 supply artifact manifest.platform'),
    artifacts: Object.freeze(entries),
  });
}

function strictSortedPaths(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) throw new RangeError(`${name} 不能为空。`);
  const paths = value.map((item, index) => assertEvidenceRelativePath(item, `${name}[${index}]`));
  if (new Set(paths).size !== paths.length) throw new RangeError(`${name} 不能重复。`);
  const sorted = [...paths].sort(compareText);
  if (paths.some((item, index) => item !== sorted[index])) {
    throw new RangeError(`${name} 必须稳定排序。`);
  }
  return Object.freeze(paths);
}

function strictSortedStrings(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) throw new RangeError(`${name} 不能为空。`);
  const strings = value.map((item, index) => assertEvidenceBoundedString(
    item,
    256,
    `${name}[${index}]`,
    { rejectControlCharacters: true },
  ));
  if (new Set(strings).size !== strings.length) throw new RangeError(`${name} 不能重复。`);
  const sorted = [...strings].sort(compareText);
  if (strings.some((item, index) => item !== sorted[index])) {
    throw new RangeError(`${name} 必须稳定排序。`);
  }
  return Object.freeze(strings);
}

function resourceCounts(
  value: unknown,
  name: string,
): Readonly<Record<string, number>> {
  assertKnownKeys(value, RESOURCE_COUNT_KEYS, name);
  const result = Object.freeze({
    markerCount: assertIntegerAtLeast(value.markerCount, 0, `${name}.markerCount`),
    pendingReplacementPairCount: assertIntegerAtLeast(
      value.pendingReplacementPairCount,
      0,
      `${name}.pendingReplacementPairCount`,
    ),
    recentEventHashCount: assertIntegerAtLeast(
      value.recentEventHashCount,
      0,
      `${name}.recentEventHashCount`,
    ),
    voiceCount: assertIntegerAtLeast(value.voiceCount, 0, `${name}.voiceCount`),
    particleCount: assertIntegerAtLeast(value.particleCount, 0, `${name}.particleCount`),
    listenerCount: assertIntegerAtLeast(value.listenerCount, 0, `${name}.listenerCount`),
    gpuHandleCount: assertIntegerAtLeast(value.gpuHandleCount, 0, `${name}.gpuHandleCount`),
    asyncCallbackCount: assertIntegerAtLeast(
      value.asyncCallbackCount,
      0,
      `${name}.asyncCallbackCount`,
    ),
  });
  if (result.markerCount > 3) throw new RangeError(`${name}.markerCount 不能超过 3。`);
  if (result.pendingReplacementPairCount > 3) {
    throw new RangeError(`${name}.pendingReplacementPairCount 不能超过 3。`);
  }
  if (result.recentEventHashCount > 64) {
    throw new RangeError(`${name}.recentEventHashCount 不能超过 64。`);
  }
  return result;
}

function verifyRunLog(
  record: DeviceRecord,
  artifacts: readonly VerifiedArtifact[],
  expected: ExpectedIdentity,
): void {
  const logDescriptors = record.artifacts.filter(({ id }) => id === 'acceptance-log');
  if (logDescriptors.length !== 1
    || logDescriptors[0]?.kind !== ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG) {
    throw new Error(`P1 supply record ${record.recordId} 必须精确包含 acceptance-log。`);
  }
  const descriptor = logDescriptors[0] as DeviceArtifact;
  const verified = findArtifactByPath(
    artifacts,
    descriptor.path,
    `P1 supply record ${record.recordId} acceptance log`,
  );
  const source = cloneFrozenData(
    parseJson(verified.text, `P1 supply record ${record.recordId} acceptance log`),
    `P1 supply record ${record.recordId} acceptance log`,
  );
  assertKnownKeys(source, RUN_LOG_KEYS, `P1 supply record ${record.recordId} acceptance log`);
  if (source.schemaVersion !== 1 || source.purpose !== 'p1-supply-device-run-evidence') {
    throw new RangeError(`P1 supply record ${record.recordId} acceptance log schema/purpose 不受支持。`);
  }
  if (source.commit !== expected.commit
    || source.buildId !== expected.buildId
    || source.targetId !== record.targetId
    || source.runId !== record.runId) {
    throw new Error(`P1 supply record ${record.recordId} acceptance log identity 不一致。`);
  }
  const checkIds = strictSortedStrings(
    source.checkIds,
    `P1 supply record ${record.recordId} acceptance log.checkIds`,
  );
  if (checkIds.length !== REQUIRED_CHECK_IDS.length
    || checkIds.some((id, index) => id !== REQUIRED_CHECK_IDS[index])) {
    throw new Error(`P1 supply record ${record.recordId} acceptance log 必须覆盖全部 11 checks。`);
  }
  resourceCounts(
    source.resourcePeaks,
    `P1 supply record ${record.recordId} acceptance log.resourcePeaks`,
  );
  const cleanup = source.cleanup as Record<string, unknown>;
  assertKnownKeys(
    cleanup,
    CLEANUP_KEYS,
    `P1 supply record ${record.recordId} acceptance log.cleanup`,
  );
  assertIntegerAtLeast(
    cleanup.destroyCallCount,
    2,
    `P1 supply record ${record.recordId} acceptance log.cleanup.destroyCallCount`,
  );
  const cleanupCounts = resourceCounts(
    Object.fromEntries([...RESOURCE_COUNT_KEYS].map((key) => [key, cleanup[key]])),
    `P1 supply record ${record.recordId} acceptance log.cleanup`,
  );
  if (Object.values(cleanupCounts).some((count) => count !== 0)) {
    throw new Error(`P1 supply record ${record.recordId} 双 destroy 后资源必须全部归零。`);
  }
  const artifactById = new Map(record.artifacts.map((artifact) => [artifact.id, artifact]));
  for (const check of record.checks) {
    const kinds = new Set(check.artifactIds.map((id) => artifactById.get(id)?.kind));
    for (const kind of [
      ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG,
      ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.SCREENSHOT,
      ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.VIDEO,
    ]) {
      if (!kinds.has(kind)) {
        throw new Error(`P1 supply check ${check.id} 必须引用内容寻址日志、截图和录像。`);
      }
    }
  }
}

function verifyReachabilityAudit(
  value: unknown,
  expected: ExpectedIdentity,
): void {
  const source = cloneFrozenData(value, 'P1 supply production reachability audit');
  assertKnownKeys(source, REACHABILITY_AUDIT_KEYS, 'P1 supply production reachability audit');
  if (source.schemaVersion !== 1) throw new RangeError('P1 supply reachability schema 必须为 1。');
  if (source.purpose !== 'p1-supply-production-reachability-audit') {
    throw new RangeError('P1 supply reachability purpose 不受支持。');
  }
  if (source.commit !== expected.commit
    || source.repositoryFingerprint !== expected.repositoryFingerprint
    || source.buildId !== expected.buildId) {
    throw new Error('P1 supply reachability audit 与 clean identity 不一致。');
  }
  if (source.defaultProductReachable !== false) {
    throw new Error('P1 supply harness 不能由默认 Product 入口到达。');
  }
  if (source.releaseArtifactReachable !== false) {
    throw new Error('P1 supply harness 不能进入 release 发布产物。');
  }
  strictSortedPaths(source.auditedProductionEntries, 'P1 supply audited production entries');
  strictSortedPaths(source.auditedReleaseArtifacts, 'P1 supply audited release artifacts');
}

function assertAttestationIdentity(
  attestation: ArenaP1SupplyAcceptanceBuildAttestationV1,
  expected: ExpectedIdentity,
): void {
  if (attestation.commit !== expected.commit
    || attestation.repositoryFingerprint !== expected.repositoryFingerprint
    || attestation.buildId !== expected.buildId
    || attestation.adapterModuleHash !== expected.adapterModuleHash
    || attestation.assetManifestHash !== expected.assetManifestHash
    || attestation.productionReachabilityAuditHash
      !== expected.productionReachabilityAuditHash) {
    throw new Error(`P1 supply ${attestation.platform} attestation 与预期 clean identity 不一致。`);
  }
  const recomputed = canonicalAttestationHash(attestation);
  if (attestation.attestationHash !== recomputed) {
    throw new Error(`P1 supply ${attestation.platform} attestationHash 重算不一致。`);
  }
  if (attestation.attestationHash !== expected.platformAttestationHashes[attestation.platform]) {
    throw new Error(`P1 supply ${attestation.platform} attestationHash 与预期不一致。`);
  }
}

function attestationArtifactForRecord(record: DeviceRecord): DeviceArtifact {
  const manifests = record.artifacts.filter(({ kind }) => (
    kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST
  ));
  if (manifests.length !== 1) {
    throw new Error(`P1 supply record ${record.recordId} 必须精确包含一个 build attestation。`);
  }
  return manifests[0] as DeviceArtifact;
}

function expectedTargetPlatform(record: DeviceRecord): ArenaP1SupplyAcceptancePlatform {
  if (record.targetId === ARENA_P1_SUPPLY_DEVICE_TARGET_ID.WEB_BROWSER) {
    return ARENA_P1_SUPPLY_ACCEPTANCE_PLATFORM.WEB;
  }
  if (record.targetId.startsWith('wechat-')) return ARENA_P1_SUPPLY_ACCEPTANCE_PLATFORM.WECHAT;
  return ARENA_P1_SUPPLY_ACCEPTANCE_PLATFORM.DOUYIN;
}

function verifyExactTargetSet(bundle: DeviceBundle): void {
  const expected = Object.values(ARENA_P1_SUPPLY_DEVICE_TARGET_ID).sort(compareText);
  const actual = bundle.records.map(({ targetId }) => targetId).sort(compareText);
  if (actual.length !== expected.length || actual.some((targetId, index) => targetId !== expected[index])) {
    throw new Error('P1 supply evidence 必须精确包含七个 target 各一条记录。');
  }
  const web = bundle.records.find(({ targetId }) => (
    targetId === ARENA_P1_SUPPLY_DEVICE_TARGET_ID.WEB_BROWSER
  ));
  if (!web) throw new Error('P1 supply evidence 缺少 Web browser target。');
  const ids = new Set(web.artifacts.map(({ id }) => id));
  for (const artifactId of WEB_VIEWPORT_ARTIFACT_IDS) {
    if (!ids.has(artifactId)) throw new Error(`Web browser evidence 缺少 ${artifactId} 的 390x844/1440x900 证据。`);
  }
}

function verifyArtifactManifest(
  manifest: ArtifactManifest,
  attestation: ArenaP1SupplyAcceptanceBuildAttestationV1,
  artifacts: readonly VerifiedArtifact[],
): void {
  if (manifest.platform !== attestation.platform) {
    throw new Error('P1 supply artifact manifest 平台与 attestation 不一致。');
  }
  const entries = new Map(manifest.artifacts.map((entry) => [entry.role, entry]));
  const expectedHashes: Readonly<Record<ArtifactRole, string>> = {
    'adapter-module': attestation.adapterModuleHash,
    'asset-manifest': attestation.assetManifestHash,
    'harness-module': attestation.harnessModuleHash,
    'production-reachability-audit': attestation.productionReachabilityAuditHash,
  };
  for (const role of ARTIFACT_ROLE_ORDER) {
    const entry = entries.get(role);
    if (!entry) throw new Error(`P1 supply artifact manifest 缺少 ${role}。`);
    if (entry.sha256 !== expectedHashes[role]) {
      throw new Error(`P1 supply artifact manifest ${role} 与 attestation 不一致。`);
    }
    const verified = findArtifactByPath(artifacts, entry.path, `${role} path`);
    if (verified.sha256 !== entry.sha256 || verified.byteLength !== entry.byteLength) {
      throw new Error(`P1 supply artifact manifest ${role} 内容寻址不一致。`);
    }
  }
}

function cloneVerificationResult(
  definition: ReturnType<typeof createArenaP1SupplyDeviceAcceptanceV1Definition>,
  bundle: DeviceBundle,
  report: ReturnType<typeof createArenaDeviceAcceptanceReport>,
  expectedIdentity: ExpectedIdentity,
  attestations: readonly ArenaP1SupplyAcceptanceBuildAttestationV1[],
  artifacts: readonly VerifiedArtifact[],
): ArenaP1SupplyDeviceEvidenceVerification {
  return Object.freeze({
    definition,
    bundle,
    report,
    expectedIdentity,
    attestations: Object.freeze([...attestations]),
    artifacts: Object.freeze([...artifacts]),
  });
}

export async function verifyArenaP1SupplyDeviceEvidence(
  value: unknown,
): Promise<ArenaP1SupplyDeviceEvidenceVerification> {
  const options = cloneFrozenData(value, 'verifyArenaP1SupplyDeviceEvidence options');
  assertKnownKeys(options, VERIFIER_OPTION_KEYS, 'verifyArenaP1SupplyDeviceEvidence options');
  const expectedIdentity = normalizeExpectedIdentity(options.expectedIdentity);
  const artifactsRoot = assertEvidenceBoundedString(
    options.artifactsRoot,
    4_096,
    'P1 supply artifactsRoot',
    { rejectControlCharacters: true },
  );
  const definition = createArenaP1SupplyDeviceAcceptanceV1Definition();
  const bundle = createArenaDeviceAcceptanceBundle(definition, options.bundleValue);
  if (bundle.commit !== expectedIdentity.commit || bundle.buildId !== expectedIdentity.buildId) {
    throw new Error('P1 supply bundle 与预期 clean identity 不一致。');
  }
  verifyExactTargetSet(bundle);
  const report = createArenaDeviceAcceptanceReport(definition, bundle);
  if (report.status !== ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.READY) {
    throw new Error('P1 supply 七目标必须全部通过，部分 target 不能视为通过。');
  }
  const verifiedArtifacts = await verifyAllArtifacts(bundle, artifactsRoot);
  for (const record of bundle.records) verifyRunLog(record, verifiedArtifacts, expectedIdentity);
  const attestationByPlatform = new Map<
    ArenaP1SupplyAcceptancePlatform,
    ArenaP1SupplyAcceptanceBuildAttestationV1
  >();
  const attestationPathByPlatform = new Map<ArenaP1SupplyAcceptancePlatform, string>();
  for (const record of bundle.records) {
    const descriptor = attestationArtifactForRecord(record);
    const verified = findArtifactByPath(
      verifiedArtifacts,
      descriptor.path,
      `record ${record.recordId} build attestation`,
    );
    const attestation = createArenaP1SupplyAcceptanceBuildAttestationV1(
      parseJson(verified.text, `P1 supply ${record.targetId} build attestation`),
    );
    const expectedPlatform = expectedTargetPlatform(record);
    if (attestation.platform !== expectedPlatform) {
      throw new Error(`P1 supply ${record.targetId} attestation 平台不一致。`);
    }
    assertAttestationIdentity(attestation, expectedIdentity);
    const previous = attestationByPlatform.get(attestation.platform);
    const previousPath = attestationPathByPlatform.get(attestation.platform);
    if (previous !== undefined && (
      previous.attestationHash !== attestation.attestationHash
      || previousPath !== descriptor.path
    )) throw new Error(`P1 supply ${attestation.platform} 必须复用唯一 build attestation。`);
    attestationByPlatform.set(attestation.platform, attestation);
    attestationPathByPlatform.set(attestation.platform, descriptor.path);
  }
  const attestations = PLATFORM_ORDER.map((platformId) => {
    const attestation = attestationByPlatform.get(platformId);
    if (!attestation) throw new Error(`P1 supply 缺少 ${platformId} build attestation。`);
    return attestation;
  });
  for (const attestation of attestations) {
    const manifestArtifact = findArtifactByHash(
      verifiedArtifacts,
      attestation.artifactManifestHash,
      `P1 supply ${attestation.platform} artifact manifest`,
    );
    const manifest = normalizeArtifactManifest(parseJson(
      manifestArtifact.text,
      `P1 supply ${attestation.platform} artifact manifest`,
    ));
    verifyArtifactManifest(manifest, attestation, verifiedArtifacts);
  }
  const reachabilityArtifact = findArtifactByHash(
    verifiedArtifacts,
    expectedIdentity.productionReachabilityAuditHash,
    'P1 supply production reachability audit',
  );
  verifyReachabilityAudit(
    parseJson(reachabilityArtifact.text, 'P1 supply production reachability audit'),
    expectedIdentity,
  );
  return cloneVerificationResult(
    definition,
    bundle,
    report,
    expectedIdentity,
    attestations,
    verifiedArtifacts,
  );
}
