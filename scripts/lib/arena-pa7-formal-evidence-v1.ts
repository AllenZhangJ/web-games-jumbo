import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readlinkSync,
  realpathSync,
} from 'node:fs';
import type { BigIntStats } from 'node:fs';
import {
  link,
  lstat,
  open,
  readFile,
  unlink,
} from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { types as utilTypes } from 'node:util';
import {
  ARENA_PA7_FORMAL_CASE_COUNT,
  ARENA_PA7_FORMAL_CONTRACT_ID,
  ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION,
  ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK,
  ARENA_PA7_FORMAL_FAILURE_KINDS,
  ARENA_PA7_FORMAL_GATE_IDS,
  ARENA_PA7_FORMAL_HARD_LIMIT_TICKS,
  ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES,
  ARENA_PA7_FORMAL_LOADER_ATTESTATION_HASH_FLAG,
  ARENA_PA7_FORMAL_NODE_IMPORT_SPECIFIER,
  ARENA_PA7_FORMAL_PROGRESS_PATH_ENV,
  ARENA_PA7_FORMAL_REQUEST_V1,
  ARENA_PA7_FORMAL_RUN_TOKEN_ENV,
  ARENA_PA7_FORMAL_WORKER_FLAG,
  ARENA_PA7_FORMAL_WORKER_SCRIPT_RELATIVE_PATH,
  cloneArenaPa7FormalStrictDataV1,
  createArenaPa7FormalEvidenceHashV1,
  validateArenaPa7FormalEvidenceV1,
  validateArenaPa7FormalProgressSequenceV1,
  validateArenaPa7FormalRunPayloadV1,
} from './arena-pa7-formal-contract-v1.js';
import type {
  ArenaPa7FormalBuildIdentityV1,
  ArenaPa7FormalEnvironmentIdentityV1,
  ArenaPa7FormalEvidenceCleanupV1,
  ArenaPa7FormalEvidenceV1,
  ArenaPa7FormalFailureV1,
  ArenaPa7FormalGateV1,
  ArenaPa7FormalProgressV1,
  ArenaPa7FormalRunPayloadV1,
  ArenaPa7FormalSourceIdentityV1,
} from './arena-pa7-formal-contract-v1.js';

export const ARENA_PA7_FORMAL_DEFAULT_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1_000;
export const ARENA_PA7_FORMAL_DEFAULT_OUTPUT_CAP_BYTES = 256 * 1_024 * 1_024;
export const ARENA_PA7_FORMAL_DEFAULT_PROGRESS_POLL_MS = 250;
export const ARENA_PA7_FORMAL_DEFAULT_TERM_GRACE_MS = 1_000;
export const ARENA_PA7_FORMAL_DEFAULT_KILL_WAIT_MS = 2_000;
export const ARENA_PA7_FORMAL_REQUIRED_PRODUCTION_MODULE_PATHS_V1 = Object.freeze([
  'packages/arena-v1-composition/src/arena-v2-survival-supply-bot-composition.ts',
  ARENA_PA7_FORMAL_WORKER_SCRIPT_RELATIVE_PATH,
  'scripts/lib/arena-pa7-formal-contract-v1.ts',
  'scripts/lib/arena-pa7-formal-evidence-v1.ts',
] as const);

type FormalFailureKind = typeof ARENA_PA7_FORMAL_FAILURE_KINDS[number];
type FormalFailurePhase = ArenaPa7FormalFailureV1['phase'];
type FormalGateId = typeof ARENA_PA7_FORMAL_GATE_IDS[number];

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const HEAD_PATTERN = /^[0-9a-f]{40}$/;
const MAX_GIT_OUTPUT_BYTES = 128 * 1_024 * 1_024;
const MAX_DIAGNOSTIC_LENGTH = 4_096;
const MAX_PROGRESS_FILE_BYTES = 64 * 1_024;
const MAX_PROGRESS_STABLE_READ_ATTEMPTS = 3;
const SOURCE_UNAVAILABLE_HEAD = '0'.repeat(40);
const SOURCE_UNAVAILABLE_HASH = '0'.repeat(64);

interface StrictRecord {
  readonly [key: string]: unknown;
}

export interface ArenaPa7FormalBuildAttestationV1 {
  readonly buildId: string;
  readonly buildHash: string;
  readonly productionVariantId: 'C+B+D';
  readonly loaderAttestationHash: string;
  readonly packageLockHash: string;
  readonly contentSelectionHash: string;
  readonly compositionContractHash: string;
}

export interface ArenaPa7FormalIsolationAttestationV1 {
  readonly isolationEvidenceId: string;
  readonly isolationEvidenceHash: string;
}

export interface ArenaPa7FormalSourceSnapshotV1 {
  readonly headCommit: string;
  readonly sourceDirty: boolean;
  readonly repositoryFingerprint: string;
  readonly packageLockHash: string;
  readonly productionModuleHashes: readonly Readonly<{
    readonly relativePath: string;
    readonly sha256: string;
  }>[];
}

export interface ArenaPa7FormalWorkerCommandV1 {
  readonly command: string;
  readonly args: readonly string[];
}

export interface ArenaPa7FormalWorkerCleanupV1 {
  readonly childProcessesStarted: number;
  readonly childProcessesExited: number;
  readonly termSignalsSent: number;
  readonly killSignalsSent: number;
  readonly temporaryPathsCreated: number;
  readonly temporaryPathsRemoved: number;
  readonly pendingCleanupCount: number;
  readonly cleanupErrors: readonly string[];
}

export interface ArenaPa7FormalWorkerResultV1 {
  readonly payload: ArenaPa7FormalRunPayloadV1;
  readonly progress: ArenaPa7FormalProgressV1;
  readonly cleanup: ArenaPa7FormalWorkerCleanupV1;
}

export interface ArenaPa7FormalPublicationStatsV1 {
  readonly temporaryPathsCreated: number;
  readonly temporaryPathsRemoved: number;
  readonly cleanupErrors: readonly string[];
}

export interface ArenaPa7FormalRunResultV1 {
  readonly evidence: ArenaPa7FormalEvidenceV1;
  readonly publishedPath: string | null;
}

export interface ArenaPa7FormalEvidenceRunOptionsV1 {
  readonly cwd: string;
  readonly outputPath: string;
  readonly productionModulePaths: readonly string[];
  readonly buildAttestation: ArenaPa7FormalBuildAttestationV1;
  readonly isolationAttestation: ArenaPa7FormalIsolationAttestationV1;
  readonly gateAttestation: readonly ArenaPa7FormalGateV1[];
  readonly worker: ArenaPa7FormalWorkerCommandV1;
  readonly inactivityTimeoutMs?: number;
  readonly outputCapBytes?: number;
  readonly progressPollMs?: number;
  readonly termGraceMs?: number;
  readonly killWaitMs?: number;
}

export interface ArenaPa7FormalGateConfigurationV1 {
  readonly schemaVersion: 1;
  readonly productionModulePaths: readonly string[];
  readonly buildAttestation: ArenaPa7FormalBuildAttestationV1;
  readonly isolationAttestation: ArenaPa7FormalIsolationAttestationV1;
  readonly gateAttestation: readonly ArenaPa7FormalGateV1[];
  readonly worker: ArenaPa7FormalWorkerCommandV1;
  readonly inactivityTimeoutMs: number;
  readonly outputCapBytes: number;
  readonly progressPollMs: number;
  readonly termGraceMs: number;
  readonly killWaitMs: number;
}

export interface ArenaPa7FormalEvidenceDependenciesV1 {
  readonly captureSource?: (
    cwd: string,
    productionModulePaths: readonly string[],
  ) => ArenaPa7FormalSourceSnapshotV1 | Promise<ArenaPa7FormalSourceSnapshotV1>;
  readonly captureBuild?: (
    attestation: ArenaPa7FormalBuildAttestationV1,
  ) => ArenaPa7FormalBuildIdentityV1 | Promise<ArenaPa7FormalBuildIdentityV1>;
  readonly captureEnvironment?: (
    attestation: ArenaPa7FormalIsolationAttestationV1,
  ) => ArenaPa7FormalEnvironmentIdentityV1 | Promise<ArenaPa7FormalEnvironmentIdentityV1>;
  readonly runWorker?: (
    options: ArenaPa7FormalStrictWorkerOptionsV1,
  ) => ArenaPa7FormalWorkerResultV1 | Promise<ArenaPa7FormalWorkerResultV1>;
  readonly publish?: (
    outputPath: string,
    evidence: ArenaPa7FormalEvidenceV1,
    options?: ArenaPa7FormalPublicationOptionsV1,
  ) => ArenaPa7FormalPublicationStatsV1 | Promise<ArenaPa7FormalPublicationStatsV1>;
  readonly now?: () => Date;
  readonly token?: () => string;
}

export interface ArenaPa7FormalStrictWorkerOptionsV1 {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly temporaryDirectory: string;
  readonly runToken: string;
  readonly inactivityTimeoutMs: number;
  readonly outputCapBytes: number;
  readonly progressPollMs: number;
  readonly termGraceMs: number;
  readonly killWaitMs: number;
  readonly progressReadHooks?: Readonly<{
    readonly afterPathBefore?: (progressPath: string) => void;
    readonly afterDescriptorRead?: (progressPath: string) => void;
    readonly afterProgressAccepted?: (progress: ArenaPa7FormalProgressV1) => void;
  }>;
}

export interface ArenaPa7FormalPublicationOptionsV1 {
  readonly token?: string;
  readonly beforePublish?: () => unknown | Promise<unknown>;
}

interface FailureDescription {
  readonly name: string | null;
  readonly message: string | null;
}

interface PendingFailure {
  readonly kind: FormalFailureKind;
  readonly phase: FormalFailurePhase;
  readonly cause: unknown;
}

function sha256Bytes(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableHash(value: unknown): string {
  return sha256Bytes(JSON.stringify(cloneArenaPa7FormalStrictDataV1(value, 'PA7 hash input')));
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

function safeInteger(value: unknown, name: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return value as number;
}

function sha256(value: unknown, name: string): string {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是 64 位小写 SHA-256。`);
  }
  return value;
}

function dataHash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}$/.test(value)) {
    throw new TypeError(`${name} 必须是 8 位小写 data hash。`);
  }
  return value;
}

function strictRecord(value: unknown, keys: readonly string[], name: string): StrictRecord {
  const cloned = cloneArenaPa7FormalStrictDataV1(value, name);
  if (cloned === null || typeof cloned !== 'object' || Array.isArray(cloned)) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const actual = Object.keys(cloned);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) {
    throw new TypeError(`${name} exact-key 校验失败。`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(cloned, key)) throw new TypeError(`${name} 缺少字段 ${key}。`);
  }
  return cloned as StrictRecord;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalRepositoryPath(value: unknown, name: string): string {
  const result = nonEmptyString(value, name);
  const parts = result.split('/');
  if (path.isAbsolute(result) || result.includes('\\') || result.includes('\0')
    || parts.some((part) => part === '' || part === '.' || part === '..')) {
    throw new TypeError(`${name} 必须是规范仓库相对路径。`);
  }
  return result;
}

function describeThrown(value: unknown): FailureDescription {
  if (value === null || value === undefined) return { name: null, message: null };
  if (typeof value === 'string') {
    return { name: 'ThrownString', message: value.slice(0, MAX_DIAGNOSTIC_LENGTH) };
  }
  if (typeof value !== 'object' || utilTypes.isProxy(value)) {
    return { name: `Thrown${typeof value}`, message: null };
  }
  if (!utilTypes.isNativeError(value)) return { name: 'ThrownObject', message: null };
  const messageDescriptor = Object.getOwnPropertyDescriptor(value, 'message');
  const message = messageDescriptor && Object.hasOwn(messageDescriptor, 'value')
    && typeof messageDescriptor.value === 'string'
    ? messageDescriptor.value.slice(0, MAX_DIAGNOSTIC_LENGTH)
    : null;
  return { name: 'Error', message };
}

function cleanupMessage(value: unknown): string {
  const description = describeThrown(value);
  return `${description.name ?? 'Unknown'}: ${description.message ?? 'no diagnostic'}`;
}

function ownErrorCode(value: unknown): string | null {
  if (value === null || typeof value !== 'object' || utilTypes.isProxy(value)) return null;
  const descriptor = Object.getOwnPropertyDescriptor(value, 'code');
  return descriptor && Object.hasOwn(descriptor, 'value') && typeof descriptor.value === 'string'
    ? descriptor.value : null;
}

function mergeErrors(primary: unknown, cleanupErrors: readonly unknown[], message: string): unknown {
  if (cleanupErrors.length === 0) return primary;
  return new AggregateError([primary, ...cleanupErrors], message);
}

function readCommandBuffer(cwd: string, command: string, args: readonly string[]): Buffer {
  const result = execFileSync(command, [...args], {
    cwd,
    encoding: 'buffer',
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (!Buffer.isBuffer(result)) throw new TypeError(`${command} 输出 identity 未知。`);
  return result;
}

function readCommandLine(cwd: string, command: string, args: readonly string[], name: string): string {
  const output = readCommandBuffer(cwd, command, args).toString('utf8');
  if (!output.endsWith('\n') || output.slice(0, -1).includes('\n')) {
    throw new Error(`${name} 必须是单行完整输出。`);
  }
  return nonEmptyString(output.slice(0, -1), name);
}

function splitNullTerminated(value: Buffer, name: string): readonly string[] {
  if (value.length === 0) return Object.freeze([]);
  if (value.at(-1) !== 0) throw new Error(`${name} 缺少 NUL 终止符。`);
  const decoded = value.toString('utf8');
  const items = decoded.slice(0, -1).split('\0');
  if (items.some((item) => item.length === 0 || Buffer.from(item, 'utf8').toString('utf8') !== item)) {
    throw new Error(`${name} 包含无效路径。`);
  }
  return Object.freeze(items);
}

function fileIdentity(cwdReal: string, relativePath: string): Readonly<{
  readonly relativePath: string;
  readonly kind: 'file' | 'symlink' | 'missing';
  readonly sha256: string;
}> {
  const canonical = canonicalRepositoryPath(relativePath, 'PA7 repository path');
  const absolute = path.resolve(cwdReal, ...canonical.split('/'));
  if (absolute === cwdReal || !absolute.startsWith(`${cwdReal}${path.sep}`)) {
    throw new Error(`PA7 repository path 逃逸：${canonical}`);
  }
  let before: BigIntStats;
  try {
    before = lstatSync(absolute, { bigint: true });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return Object.freeze({ relativePath: canonical, kind: 'missing', sha256: SOURCE_UNAVAILABLE_HASH });
    }
    throw error;
  }
  if (before.isSymbolicLink()) {
    const target = readlinkSync(absolute, 'utf8');
    const after = lstatSync(absolute, { bigint: true });
    if (before.dev !== after.dev || before.ino !== after.ino
      || before.size !== after.size || before.mtimeNs !== after.mtimeNs
      || before.ctimeNs !== after.ctimeNs) {
      throw new Error(`PA7 source capture 期间符号链接漂移：${canonical}`);
    }
    return Object.freeze({ relativePath: canonical, kind: 'symlink', sha256: sha256Bytes(target) });
  }
  if (!before.isFile()) throw new Error(`PA7 repository path 类型不受支持：${canonical}`);
  const descriptor = openSync(absolute, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const handleBefore = fstatSync(descriptor, { bigint: true });
    if (!handleBefore.isFile()
      || before.dev !== handleBefore.dev || before.ino !== handleBefore.ino
      || before.size !== handleBefore.size || before.mtimeNs !== handleBefore.mtimeNs
      || before.ctimeNs !== handleBefore.ctimeNs) {
      throw new Error(`PA7 source path/fd identity 在打开时漂移：${canonical}`);
    }
    const bytes = readFileSync(descriptor);
    const handleAfter = fstatSync(descriptor, { bigint: true });
    const pathAfter = lstatSync(absolute, { bigint: true });
    if (!pathAfter.isFile() || pathAfter.isSymbolicLink()
      || handleBefore.dev !== handleAfter.dev || handleBefore.ino !== handleAfter.ino
      || handleBefore.size !== handleAfter.size || handleBefore.mtimeNs !== handleAfter.mtimeNs
      || handleBefore.ctimeNs !== handleAfter.ctimeNs
      || handleAfter.dev !== pathAfter.dev || handleAfter.ino !== pathAfter.ino
      || handleAfter.size !== pathAfter.size || handleAfter.mtimeNs !== pathAfter.mtimeNs
      || handleAfter.ctimeNs !== pathAfter.ctimeNs) {
      throw new Error(`PA7 source capture 期间文件漂移：${canonical}`);
    }
    return Object.freeze({ relativePath: canonical, kind: 'file', sha256: sha256Bytes(bytes) });
  } finally {
    closeSync(descriptor);
  }
}

export function captureArenaPa7FormalRegularFileHashV1(
  cwd: string,
  relativePath: string,
): string {
  if (!path.isAbsolute(cwd)) throw new TypeError('PA7 regular file hash cwd 必须是绝对路径。');
  return regularRepositoryFileHash(realpathSync(cwd), relativePath, 'PA7 regular file hash');
}

function regularRepositoryFileHash(cwdReal: string, relativePath: string, name: string): string {
  const canonical = canonicalRepositoryPath(relativePath, name);
  const absolute = path.resolve(cwdReal, ...canonical.split('/'));
  const resolved = realpathSync(absolute);
  if (!resolved.startsWith(`${cwdReal}${path.sep}`)) throw new Error(`${name} realpath 逃逸。`);
  const identity = fileIdentity(cwdReal, canonical);
  if (identity.kind !== 'file') throw new Error(`${name} 必须是非符号链接普通文件。`);
  return identity.sha256;
}

export function captureArenaPa7FormalSourceSnapshotV1(
  cwd: string,
  productionModulePaths: readonly string[],
): ArenaPa7FormalSourceSnapshotV1 {
  if (!path.isAbsolute(cwd)) throw new TypeError('PA7 cwd 必须是绝对路径。');
  const cwdReal = realpathSync(cwd);
  const cwdStats = lstatSync(cwdReal);
  if (!cwdStats.isDirectory() || cwdStats.isSymbolicLink()) throw new Error('PA7 cwd 必须是实际目录。');
  const modulesSource = cloneArenaPa7FormalStrictDataV1(productionModulePaths, 'PA7 production modules');
  if (!Array.isArray(modulesSource) || modulesSource.length === 0) {
    throw new Error('PA7 production modules 必须非空。');
  }
  const modulePaths = modulesSource.map((item, index) => (
    canonicalRepositoryPath(item, `PA7 production modules[${index}]`)
  )).sort(compareText);
  if (new Set(modulePaths).size !== modulePaths.length) throw new Error('PA7 production modules 不得重复。');

  const headCommit = readCommandLine(cwdReal, 'git', ['rev-parse', '--verify', 'HEAD'], 'PA7 HEAD');
  if (!HEAD_PATTERN.test(headCommit)) throw new Error('PA7 HEAD identity 非法。');
  const status = readCommandBuffer(
    cwdReal,
    'git',
    ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
  );
  const sourcePaths = splitNullTerminated(
    readCommandBuffer(cwdReal, 'git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z']),
    'PA7 git file list',
  ).map((item) => canonicalRepositoryPath(item, 'PA7 git file')).sort(compareText);
  if (new Set(sourcePaths).size !== sourcePaths.length) throw new Error('PA7 git file list 包含重复路径。');
  const files = sourcePaths.map((item) => fileIdentity(cwdReal, item));
  const packageLockHash = regularRepositoryFileHash(cwdReal, 'package-lock.json', 'PA7 package-lock');
  const productionModuleHashes = Object.freeze(modulePaths.map((relativePath) => Object.freeze({
    relativePath,
    sha256: regularRepositoryFileHash(cwdReal, relativePath, `PA7 production module ${relativePath}`),
  })));
  const repositoryFingerprint = stableHash({
    headCommit,
    status: status.toString('base64'),
    files,
  });
  return Object.freeze({
    headCommit,
    sourceDirty: status.length !== 0,
    repositoryFingerprint,
    packageLockHash,
    productionModuleHashes,
  });
}

export function captureArenaPa7FormalBuildIdentityV1(
  value: ArenaPa7FormalBuildAttestationV1,
): ArenaPa7FormalBuildIdentityV1 {
  const record = strictRecord(
    value,
    [
      'buildId', 'buildHash', 'productionVariantId', 'loaderAttestationHash', 'packageLockHash',
      'contentSelectionHash', 'compositionContractHash',
    ],
    'PA7 build attestation',
  );
  const buildId = nonEmptyString(record.buildId, 'PA7 buildId');
  const buildHash = sha256(record.buildHash, 'PA7 buildHash');
  if (record.productionVariantId !== 'C+B+D') throw new Error('PA7 productionVariantId 必须是 C+B+D。');
  const loaderAttestationHash = sha256(record.loaderAttestationHash, 'PA7 loader attestation');
  sha256(record.packageLockHash, 'PA7 attested package-lock hash');
  dataHash(record.contentSelectionHash, 'PA7 attested content selection hash');
  dataHash(record.compositionContractHash, 'PA7 attested composition contract hash');
  const packageManagerVersion = readCommandLine(process.cwd(), 'npm', ['--version'], 'PA7 npm version');
  return Object.freeze({
    nodeVersion: nonEmptyString(process.version, 'PA7 Node version'),
    packageManagerVersion: `npm@${packageManagerVersion}`,
    platform: nonEmptyString(process.platform, 'PA7 platform'),
    architecture: nonEmptyString(process.arch, 'PA7 architecture'),
    buildId,
    buildHash,
    productionVariantId: 'C+B+D',
    loaderAttestationHash,
  });
}

export function captureArenaPa7FormalEnvironmentIdentityV1(
  value: ArenaPa7FormalIsolationAttestationV1,
): ArenaPa7FormalEnvironmentIdentityV1 {
  const record = strictRecord(
    value,
    ['isolationEvidenceId', 'isolationEvidenceHash'],
    'PA7 isolation attestation',
  );
  const cpus = os.cpus();
  if (cpus.length === 0) throw new Error('PA7 CPU identity 未知。');
  const cpuModels = [...new Set(cpus.map(({ model }) => model.trim()).filter(Boolean))].sort(compareText);
  if (cpuModels.length === 0) throw new Error('PA7 CPU model 未知。');
  return Object.freeze({
    cpuModel: cpuModels.join(' | '),
    logicalCpuCount: safeInteger(cpus.length, 'PA7 logical CPU count', 1),
    totalMemoryBytes: safeInteger(os.totalmem(), 'PA7 total memory', 1),
    isolationEvidenceId: nonEmptyString(record.isolationEvidenceId, 'PA7 isolation evidence id'),
    isolationEvidenceHash: sha256(record.isolationEvidenceHash, 'PA7 isolation evidence hash'),
  });
}

function validateGateAttestation(value: unknown): readonly ArenaPa7FormalGateV1[] {
  const source = cloneArenaPa7FormalStrictDataV1(value, 'PA7 gate attestation');
  if (!Array.isArray(source) || source.length !== ARENA_PA7_FORMAL_GATE_IDS.length) {
    throw new Error('PA7 gate attestation 数量漂移。');
  }
  return Object.freeze(source.map((item, index) => {
    const record = strictRecord(
      item,
      ['id', 'passed', 'evidenceHash', 'failureReason'],
      `PA7 gate attestation[${index}]`,
    );
    const id = ARENA_PA7_FORMAL_GATE_IDS[index]!;
    if (record.id !== id) throw new Error(`PA7 gate attestation[${index}] ID/顺序漂移。`);
    if (typeof record.passed !== 'boolean') throw new TypeError(`PA7 gate ${id}.passed 非法。`);
    const evidenceHash = sha256(record.evidenceHash, `PA7 gate ${id}.evidenceHash`);
    const failureReason = record.failureReason;
    if (record.passed) {
      if (failureReason !== null) throw new Error(`PA7 gate ${id} 通过时 failureReason 必须为 null。`);
    } else if (typeof failureReason !== 'string'
      || !(ARENA_PA7_FORMAL_FAILURE_KINDS as readonly string[]).includes(failureReason)) {
      throw new Error(`PA7 gate ${id} failureReason 非法。`);
    }
    return Object.freeze({
      id,
      passed: record.passed,
      evidenceHash,
      failureReason: failureReason as FormalFailureKind | null,
    });
  }));
}

function validateBuildAttestation(value: unknown): ArenaPa7FormalBuildAttestationV1 {
  const record = strictRecord(
    value,
    [
      'buildId', 'buildHash', 'productionVariantId', 'loaderAttestationHash', 'packageLockHash',
      'contentSelectionHash', 'compositionContractHash',
    ],
    'PA7 build attestation',
  );
  if (record.productionVariantId !== 'C+B+D') {
    throw new Error('PA7 build attestation productionVariantId 必须是 C+B+D。');
  }
  return Object.freeze({
    buildId: nonEmptyString(record.buildId, 'PA7 build attestation.buildId'),
    buildHash: sha256(record.buildHash, 'PA7 build attestation.buildHash'),
    productionVariantId: 'C+B+D',
    loaderAttestationHash: sha256(
      record.loaderAttestationHash,
      'PA7 build attestation.loaderAttestationHash',
    ),
    packageLockHash: sha256(record.packageLockHash, 'PA7 build attestation.packageLockHash'),
    contentSelectionHash: dataHash(
      record.contentSelectionHash,
      'PA7 build attestation.contentSelectionHash',
    ),
    compositionContractHash: dataHash(
      record.compositionContractHash,
      'PA7 build attestation.compositionContractHash',
    ),
  });
}

function validateIsolationAttestation(value: unknown): ArenaPa7FormalIsolationAttestationV1 {
  const record = strictRecord(
    value,
    ['isolationEvidenceId', 'isolationEvidenceHash'],
    'PA7 isolation attestation',
  );
  return Object.freeze({
    isolationEvidenceId: nonEmptyString(
      record.isolationEvidenceId,
      'PA7 isolation attestation.isolationEvidenceId',
    ),
    isolationEvidenceHash: sha256(
      record.isolationEvidenceHash,
      'PA7 isolation attestation.isolationEvidenceHash',
    ),
  });
}

function validateProductionModulePaths(value: unknown): readonly string[] {
  const source = cloneArenaPa7FormalStrictDataV1(value, 'PA7 production module paths');
  if (!Array.isArray(source) || source.length === 0) {
    throw new Error('PA7 production module paths 必须非空。');
  }
  const paths = source.map((item, index) => (
    canonicalRepositoryPath(item, `PA7 production module paths[${index}]`)
  ));
  if (paths.some((item, index) => index > 0 && paths[index - 1]! >= item)) {
    throw new Error('PA7 production module paths 必须唯一且排序。');
  }
  for (const required of ARENA_PA7_FORMAL_REQUIRED_PRODUCTION_MODULE_PATHS_V1) {
    if (!paths.includes(required)) {
      throw new Error(`PA7 production module 闭包缺少正式模块 ${required}。`);
    }
  }
  return Object.freeze(paths);
}

function validateFormalWorkerCommand(
  value: unknown,
  loaderAttestationHash: string,
): ArenaPa7FormalWorkerCommandV1 {
  const record = strictRecord(value, ['command', 'args'], 'PA7 formal worker');
  if (record.command !== process.execPath) {
    throw new Error('PA7 正式 worker 必须使用当前 Node executable。');
  }
  const args = cloneArenaPa7FormalStrictDataV1(record.args, 'PA7 formal worker args');
  if (!Array.isArray(args) || args.some((item) => typeof item !== 'string')) {
    throw new TypeError('PA7 正式 worker 参数必须是字符串数组。');
  }
  const expected = [
    '--import',
    ARENA_PA7_FORMAL_NODE_IMPORT_SPECIFIER,
    ARENA_PA7_FORMAL_WORKER_SCRIPT_RELATIVE_PATH,
    ARENA_PA7_FORMAL_WORKER_FLAG,
    ARENA_PA7_FORMAL_LOADER_ATTESTATION_HASH_FLAG,
    loaderAttestationHash,
  ];
  if (args.length !== expected.length || args.some((item, index) => item !== expected[index])) {
    throw new Error('PA7 正式 worker 参数必须精确匹配冻结 Node/import/runner/flag/loader 形状。');
  }
  return Object.freeze({
    command: process.execPath,
    args: Object.freeze([...expected]),
  });
}

export function validateArenaPa7FormalGateConfigurationV1(
  value: unknown,
): ArenaPa7FormalGateConfigurationV1 {
  const record = strictRecord(
    value,
    [
      'schemaVersion', 'productionModulePaths', 'buildAttestation', 'isolationAttestation',
      'gateAttestation', 'worker', 'inactivityTimeoutMs', 'outputCapBytes', 'progressPollMs',
      'termGraceMs', 'killWaitMs',
    ],
    'PA7 formal gate configuration',
  );
  if (record.schemaVersion !== 1) throw new Error('PA7 gate configuration schemaVersion 不受支持。');
  const productionModulePaths = validateProductionModulePaths(record.productionModulePaths);
  const buildAttestation = validateBuildAttestation(record.buildAttestation);
  const worker = validateFormalWorkerCommand(record.worker, buildAttestation.loaderAttestationHash);
  return Object.freeze({
    schemaVersion: 1,
    productionModulePaths,
    buildAttestation,
    isolationAttestation: validateIsolationAttestation(record.isolationAttestation),
    gateAttestation: validateGateAttestation(record.gateAttestation),
    worker,
    inactivityTimeoutMs: safeInteger(record.inactivityTimeoutMs, 'PA7 inactivityTimeoutMs', 1),
    outputCapBytes: safeInteger(record.outputCapBytes, 'PA7 outputCapBytes', 1),
    progressPollMs: safeInteger(record.progressPollMs, 'PA7 progressPollMs', 1),
    termGraceMs: safeInteger(record.termGraceMs, 'PA7 termGraceMs', 1),
    killWaitMs: safeInteger(record.killWaitMs, 'PA7 killWaitMs', 1),
  });
}

function sameProgress(left: ArenaPa7FormalProgressV1, right: ArenaPa7FormalProgressV1): boolean {
  return left.runToken === right.runToken
    && left.sequence === right.sequence
    && left.completedCases === right.completedCases
    && left.currentCaseIndex === right.currentCaseIndex
    && left.currentCaseId === right.currentCaseId
    && left.currentPass === right.currentPass
    && left.currentTick === right.currentTick
    && left.lastCommittedCaseEvidenceHash === right.lastCommittedCaseEvidenceHash;
}

interface ProgressStepRange {
  readonly minimum: number;
  readonly maximum: number;
}

function addProgressStepRanges(
  left: ProgressStepRange,
  right: ProgressStepRange,
): ProgressStepRange {
  return Object.freeze({
    minimum: left.minimum + right.minimum,
    maximum: left.maximum + right.maximum,
  });
}

function rangeWithOffset(range: ProgressStepRange, offset: number): ProgressStepRange {
  return Object.freeze({
    minimum: range.minimum + offset,
    maximum: range.maximum + offset,
  });
}

function stepsToTerminalFromTick(currentTick: number): ProgressStepRange {
  return Object.freeze({
    minimum: Math.max(2_401, currentTick) - currentTick,
    maximum: ARENA_PA7_FORMAL_HARD_LIMIT_TICKS - currentTick,
  });
}

function stepsToCommitCurrentCase(previous: ArenaPa7FormalProgressV1): ProgressStepRange {
  const tick = previous.currentTick;
  if (tick === null || previous.currentPass === null) {
    throw new Error('PA7 sampled progress 已完成终态不得继续前进。');
  }
  if (previous.currentPass === 2) {
    return rangeWithOffset(stepsToTerminalFromTick(tick), 1);
  }
  return addProgressStepRanges(
    rangeWithOffset(stepsToTerminalFromTick(tick), 1),
    Object.freeze({ minimum: 2_402, maximum: 2_501 }),
  );
}

function sampledStepRange(
  previous: ArenaPa7FormalProgressV1,
  progress: ArenaPa7FormalProgressV1,
): ProgressStepRange {
  if (progress.completedCases === previous.completedCases) {
    if (previous.currentCaseIndex === null || progress.currentCaseIndex === null
      || previous.currentPass === null || progress.currentPass === null
      || previous.currentTick === null || progress.currentTick === null) {
      throw new Error('PA7 sampled progress 完成终态不存在伪进度。');
    }
    if (progress.currentCaseIndex !== previous.currentCaseIndex
      || progress.currentCaseId !== previous.currentCaseId) {
      throw new Error('PA7 sampled progress 同 case identity 不得漂移。');
    }
    if (progress.currentPass === previous.currentPass) {
      const steps = progress.currentTick - previous.currentTick;
      if (steps <= 0) throw new Error('PA7 sampled progress pause/重复状态不得伪造 sequence 前进。');
      return Object.freeze({ minimum: steps, maximum: steps });
    }
    if (previous.currentPass !== 1 || progress.currentPass !== 2) {
      throw new Error('PA7 sampled progress pass 回退或非法切换。');
    }
    return rangeWithOffset(
      stepsToTerminalFromTick(previous.currentTick),
      1 + progress.currentTick,
    );
  }

  const throughCommit = stepsToCommitCurrentCase(previous);
  if (progress.completedCases === ARENA_PA7_FORMAL_CASE_COUNT) {
    if (progress.currentCaseIndex !== null || progress.currentCaseId !== null
      || progress.currentPass !== null || progress.currentTick !== null) {
      throw new Error('PA7 sampled progress 末 case commit 后 current 必须全 null。');
    }
    return throughCommit;
  }
  if (progress.currentPass === 1 && progress.currentTick !== null) {
    return rangeWithOffset(throughCommit, progress.currentTick);
  }
  if (progress.currentPass === 2 && progress.currentTick !== null) {
    return addProgressStepRanges(
      throughCommit,
      Object.freeze({
        minimum: 2_402 + progress.currentTick,
        maximum: 2_501 + progress.currentTick,
      }),
    );
  }
  throw new Error('PA7 sampled progress case commit 后 current 状态非法。');
}

export function validateArenaPa7FormalSampledProgressV1(
  value: unknown,
  expectedToken: string,
  previous: ArenaPa7FormalProgressV1 | null,
): Readonly<{ readonly progress: ArenaPa7FormalProgressV1; readonly advanced: boolean }> {
  const progress = validateArenaPa7FormalProgressSequenceV1([value])[0]!;
  if (progress.runToken !== expectedToken) throw new Error('PA7 progress runToken 漂移。');
  if (previous === null) return Object.freeze({ progress, advanced: true });
  if (sameProgress(previous, progress)) return Object.freeze({ progress: previous, advanced: false });
  if (progress.completedCases < previous.completedCases
    || progress.completedCases > previous.completedCases + 1) {
    throw new Error('PA7 progress completedCases 不得跳 case。');
  }
  if (progress.completedCases === previous.completedCases
    && progress.lastCommittedCaseEvidenceHash !== previous.lastCommittedCaseEvidenceHash) {
    throw new Error('PA7 progress 同 case commit hash 漂移。');
  }
  if (progress.completedCases > previous.completedCases
    && progress.lastCommittedCaseEvidenceHash === previous.lastCommittedCaseEvidenceHash) {
    throw new Error('PA7 progress case 前进但 commit hash 未更新。');
  }
  const sequenceDelta = progress.sequence - previous.sequence;
  if (!Number.isSafeInteger(sequenceDelta) || sequenceDelta <= 0) {
    throw new Error('PA7 sampled progress sequence 必须严格前进。');
  }
  const range = sampledStepRange(previous, progress);
  if (sequenceDelta < range.minimum || sequenceDelta > range.maximum) {
    throw new Error(
      `PA7 sampled progress 不存在合法逐 tick 可达路径（sequence delta=${sequenceDelta}, expected=${range.minimum}..${range.maximum}）。`,
    );
  }
  return Object.freeze({ progress, advanced: true });
}

function sameProgressFileIdentity(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function sameProgressFileInode(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function sameProgressFileContentIdentity(left: BigIntStats, right: BigIntStats): boolean {
  return sameProgressFileInode(left, right)
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs;
}

function readProgressFile(
  progressPath: string,
  expectedToken: string,
  previous: ArenaPa7FormalProgressV1 | null,
  hooks?: ArenaPa7FormalStrictWorkerOptionsV1['progressReadHooks'],
): Readonly<{ readonly progress: ArenaPa7FormalProgressV1; readonly advanced: boolean }> | null {
  let text: string | null = null;
  for (let attempt = 0; attempt < MAX_PROGRESS_STABLE_READ_ATTEMPTS; attempt += 1) {
    let pathBefore: BigIntStats;
    try {
      pathBefore = lstatSync(progressPath, { bigint: true });
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT' && attempt === 0) return null;
      throw new Error('PA7 progress path 在稳定读取期间消失。');
    }
    if (!pathBefore.isFile() || pathBefore.isSymbolicLink()) {
      throw new Error('PA7 progress path 必须是非符号链接普通文件。');
    }
    if (pathBefore.size < 2n || pathBefore.size > BigInt(MAX_PROGRESS_FILE_BYTES)) {
      throw new Error('PA7 progress 文件大小不受支持。');
    }
    hooks?.afterPathBefore?.(progressPath);
    const descriptor = openSync(progressPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    try {
      const fdBefore = fstatSync(descriptor, { bigint: true });
      if (!fdBefore.isFile()) throw new Error('PA7 progress fd 必须是普通文件。');
      if (!sameProgressFileInode(pathBefore, fdBefore)) continue;
      if (!sameProgressFileIdentity(pathBefore, fdBefore)) {
        throw new Error('PA7 progress 同 inode metadata 在打开时漂移。');
      }
      const candidateText = readFileSync(descriptor, 'utf8');
      hooks?.afterDescriptorRead?.(progressPath);
      const fdAfter = fstatSync(descriptor, { bigint: true });
      if (!fdAfter.isFile() || !sameProgressFileContentIdentity(fdBefore, fdAfter)) {
        throw new Error('PA7 progress fd 在读取期间漂移。');
      }
      const pathAfter = lstatSync(progressPath, { bigint: true });
      if (!pathAfter.isFile() || pathAfter.isSymbolicLink()) {
        throw new Error('PA7 progress path-after 必须是非符号链接普通文件。');
      }
      if (!sameProgressFileInode(fdAfter, pathAfter)) {
        // POSIX rename-over may update the superseded inode ctime by changing its link count.
        // The open descriptor's bytes remained stable, while path-after proves a new regular generation.
        continue;
      }
      if (!sameProgressFileIdentity(fdBefore, fdAfter)) {
        throw new Error('PA7 progress fd 同 inode ctime 在读取期间漂移。');
      }
      if (!sameProgressFileIdentity(fdAfter, pathAfter)) {
        throw new Error('PA7 progress 同 inode metadata 在读取后漂移。');
      }
      text = candidateText;
      break;
    } finally {
      closeSync(descriptor);
    }
  }
  if (text === null) throw new Error('PA7 progress 普通文件代际持续替换，无法获得稳定样本。');
  if (!text.endsWith('\n') || text.slice(0, -1).includes('\n')) {
    throw new Error('PA7 progress 必须是单行完整 JSON。');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(0, -1)) as unknown;
  } catch {
    throw new Error('PA7 progress JSON 不完整或损坏。');
  }
  return validateArenaPa7FormalSampledProgressV1(parsed, expectedToken, previous);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function processGroupAlive(child: ChildProcess): boolean {
  if (child.pid === undefined) return false;
  if (process.platform === 'win32') return child.exitCode === null && child.signalCode === null;
  try {
    process.kill(-child.pid, 0);
    return true;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false;
    return true;
  }
}

function signalProcessGroup(child: ChildProcess, signal: NodeJS.Signals): boolean {
  if (child.pid === undefined || !processGroupAlive(child)) return false;
  if (process.platform !== 'win32') {
    process.kill(-child.pid, signal);
    return true;
  }
  return child.kill(signal);
}

async function waitForProcessGroupExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (processGroupAlive(child)) {
    if (Date.now() >= deadline) return false;
    await delay(Math.min(20, Math.max(1, deadline - Date.now())));
  }
  return true;
}

export class ArenaPa7FormalWorkerFailureV1 extends Error {
  readonly kind: FormalFailureKind;
  readonly phase: FormalFailurePhase;
  readonly progress: ArenaPa7FormalProgressV1;
  readonly cleanup: ArenaPa7FormalWorkerCleanupV1;
  readonly primaryCause: unknown;

  constructor(options: {
    readonly kind: FormalFailureKind;
    readonly phase: FormalFailurePhase;
    readonly progress: ArenaPa7FormalProgressV1;
    readonly cleanup: ArenaPa7FormalWorkerCleanupV1;
    readonly primaryCause: unknown;
  }) {
    const description = describeThrown(options.primaryCause);
    super(description.message ?? `PA7 worker ${options.kind}`);
    this.name = 'ArenaPa7FormalWorkerFailureV1';
    this.kind = options.kind;
    this.phase = options.phase;
    this.progress = options.progress;
    this.cleanup = options.cleanup;
    this.primaryCause = options.primaryCause;
  }
}

function initialProgress(runToken: string): ArenaPa7FormalProgressV1 {
  return Object.freeze({
    runToken,
    sequence: 0,
    completedCases: 0,
    currentCaseIndex: 0,
    currentCaseId: 'formal-survival-bot-000',
    currentPass: 1,
    currentTick: 0,
    lastCommittedCaseEvidenceHash: null,
  });
}

export async function runArenaPa7StrictJsonWorkerV1(
  options: ArenaPa7FormalStrictWorkerOptionsV1,
): Promise<ArenaPa7FormalWorkerResultV1> {
  const command = nonEmptyString(options.command, 'PA7 worker command');
  const argsSource = cloneArenaPa7FormalStrictDataV1(options.args, 'PA7 worker args');
  if (!Array.isArray(argsSource) || argsSource.some((item) => typeof item !== 'string')) {
    throw new TypeError('PA7 worker args 必须是字符串数组。');
  }
  const cwd = realpathSync(nonEmptyString(options.cwd, 'PA7 worker cwd'));
  const temporaryDirectory = realpathSync(nonEmptyString(
    options.temporaryDirectory,
    'PA7 worker temporary directory',
  ));
  const runToken = nonEmptyString(options.runToken, 'PA7 run token');
  const inactivityTimeoutMs = safeInteger(options.inactivityTimeoutMs, 'PA7 inactivity timeout', 1);
  const outputCapBytes = safeInteger(options.outputCapBytes, 'PA7 output cap', 1);
  const progressPollMs = safeInteger(options.progressPollMs, 'PA7 progress poll', 1);
  const termGraceMs = safeInteger(options.termGraceMs, 'PA7 TERM grace', 1);
  const killWaitMs = safeInteger(options.killWaitMs, 'PA7 KILL wait', 1);
  const progressReadHooks = options.progressReadHooks;
  const progressPath = path.join(
    temporaryDirectory,
    `.arena-pa7-progress-${process.pid}-${randomUUID()}.json`,
  );
  const progressTemporaryPath = `${progressPath}.tmp`;
  let lastProgress = initialProgress(runToken);
  let stdout: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let stderr: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let outputBytes = 0;
  let settled = false;
  let pendingFailure: PendingFailure | null = null;
  let inactivityTimer: NodeJS.Timeout | null = null;
  let progressTimer: NodeJS.Timeout | null = null;
  let childProcessesStarted = 0;
  let childProcessesExited = 0;
  let termSignalsSent = 0;
  let killSignalsSent = 0;
  const cleanupErrors: unknown[] = [];

  const child = spawn(command, [...argsSource] as string[], {
    cwd,
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      [ARENA_PA7_FORMAL_PROGRESS_PATH_ENV]: progressPath,
      [ARENA_PA7_FORMAL_RUN_TOKEN_ENV]: runToken,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (child.pid !== undefined) childProcessesStarted = 1;

  const stopTimers = (): void => {
    if (inactivityTimer !== null) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
    if (progressTimer !== null) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  };

  const cleanupTemporaryPaths = async (): Promise<Readonly<{ created: number; removed: number }>> => {
    let created = 0;
    let removed = 0;
    for (const candidate of [progressPath, progressTemporaryPath]) {
      try {
        await lstat(candidate);
        created += 1;
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
        cleanupErrors.push(error);
        continue;
      }
      try {
        await unlink(candidate);
        removed += 1;
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    return Object.freeze({ created, removed });
  };

  const terminateTree = async (): Promise<void> => {
    try {
      if (signalProcessGroup(child, 'SIGTERM')) termSignalsSent += 1;
    } catch (error) {
      cleanupErrors.push(error);
    }
    if (await waitForProcessGroupExit(child, termGraceMs)) return;
    try {
      if (signalProcessGroup(child, 'SIGKILL')) killSignalsSent += 1;
    } catch (error) {
      cleanupErrors.push(error);
    }
    if (!(await waitForProcessGroupExit(child, killWaitMs))) {
      cleanupErrors.push(new Error('PA7 worker 进程组在 SIGKILL 后仍存活。'));
    }
  };

  const makeCleanup = (
    temporary: Readonly<{ created: number; removed: number }>,
  ): ArenaPa7FormalWorkerCleanupV1 => Object.freeze({
    childProcessesStarted,
    childProcessesExited,
    termSignalsSent,
    killSignalsSent,
    temporaryPathsCreated: temporary.created,
    temporaryPathsRemoved: temporary.removed,
    pendingCleanupCount: (childProcessesStarted - childProcessesExited)
      + (temporary.created - temporary.removed),
    cleanupErrors: Object.freeze(cleanupErrors.map(cleanupMessage)),
  });

  return new Promise((resolve, reject) => {
    const rejectFailure = async (failure: PendingFailure): Promise<void> => {
      if (settled) return;
      settled = true;
      stopTimers();
      await terminateTree();
      childProcessesExited = processGroupAlive(child) ? 0 : childProcessesStarted;
      child.stdout?.destroy();
      child.stderr?.destroy();
      const temporary = await cleanupTemporaryPaths();
      reject(new ArenaPa7FormalWorkerFailureV1({
        kind: failure.kind,
        phase: failure.phase,
        progress: lastProgress,
        cleanup: makeCleanup(temporary),
        primaryCause: mergeErrors(
          failure.cause,
          cleanupErrors,
          'PA7 worker 主错误与清理错误并存。',
        ),
      }));
    };

    const fail = (kind: FormalFailureKind, phase: FormalFailurePhase, cause: unknown): void => {
      if (settled || pendingFailure !== null) return;
      pendingFailure = Object.freeze({ kind, phase, cause });
      void rejectFailure(pendingFailure);
    };

    const resetInactivityTimer = (): void => {
      if (inactivityTimer !== null) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        fail('timeout', lastProgress.currentPass === 2 ? 'run-second' : 'run-first', new Error(
          'PA7 worker 未在 inactivity window 内提供合法单调进度。',
        ));
      }, inactivityTimeoutMs);
      inactivityTimer.unref();
    };

    const observeProgress = (): void => {
      if (settled) return;
      try {
        const observation = readProgressFile(
          progressPath,
          runToken,
          lastProgress,
          progressReadHooks,
        );
        if (observation === null || !observation.advanced) return;
        lastProgress = observation.progress;
        progressReadHooks?.afterProgressAccepted?.(lastProgress);
        resetInactivityTimer();
      } catch (error) {
        fail('progress-invalid', lastProgress.currentPass === 2 ? 'run-second' : 'run-first', error);
      }
    };

    const append = (
      current: Buffer<ArrayBufferLike>,
      chunk: Buffer<ArrayBufferLike>,
      stream: 'stdout' | 'stderr',
    ): Buffer<ArrayBufferLike> => {
      outputBytes += chunk.length;
      if (outputBytes > outputCapBytes) {
        fail('case-execution', lastProgress.currentPass === 2 ? 'run-second' : 'run-first', new Error(
          `PA7 worker ${stream} 超出输出上限。`,
        ));
        return current;
      }
      return Buffer.concat([current, chunk]);
    };

    child.stdout?.on('data', (chunk: Buffer<ArrayBufferLike>) => {
      stdout = append(stdout, chunk, 'stdout');
    });
    child.stderr?.on('data', (chunk: Buffer<ArrayBufferLike>) => {
      stderr = append(stderr, chunk, 'stderr');
      fail('case-execution', lastProgress.currentPass === 2 ? 'run-second' : 'run-first', new Error(
        'PA7 worker stderr 必须为空。',
      ));
    });
    child.once('error', (error) => fail('runner-startup', 'spawn', error));

    resetInactivityTimer();
    progressTimer = setInterval(observeProgress, progressPollMs);
    progressTimer.unref();

    child.once('close', (code, signal) => {
      if (settled || pendingFailure !== null) return;
      stopTimers();
      childProcessesExited = 1;
      if (stderr.length !== 0) {
        fail('case-execution', lastProgress.currentPass === 2 ? 'run-second' : 'run-first', new Error(
          'PA7 worker stderr 必须为空。',
        ));
        return;
      }
      if (code !== 0 || signal !== null) {
        fail('case-execution', lastProgress.currentPass === 2 ? 'run-second' : 'run-first', new Error(
          `PA7 worker 非正常退出（code=${String(code)}, signal=${String(signal)}）。`,
        ));
        return;
      }
      if (processGroupAlive(child)) {
        childProcessesExited = 0;
        fail('cleanup-failed', 'cleanup', new Error('PA7 worker root 退出后仍有子孙进程存活。'));
        return;
      }
      const text = stdout.toString('utf8');
      if (text.length === 0 || !text.endsWith('\n') || text.slice(0, -1).includes('\n')) {
        fail('case-validation', 'aggregate', new Error('PA7 worker 必须输出单行完整 JSON。'));
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(text.slice(0, -1)) as unknown;
      } catch {
        fail('case-validation', 'aggregate', new Error('PA7 worker 输出为部分或损坏 JSON。'));
        return;
      }
      let payload: ArenaPa7FormalRunPayloadV1;
      try {
        payload = validateArenaPa7FormalRunPayloadV1(parsed);
      } catch (error) {
        fail('case-validation', 'aggregate', error);
        return;
      }
      try {
        const finalObservation = readProgressFile(
          progressPath,
          runToken,
          lastProgress,
          progressReadHooks,
        );
        if (finalObservation === null) throw new Error('PA7 worker final progress 文件缺失。');
        lastProgress = finalObservation.progress;
        const stableObservation = readProgressFile(
          progressPath,
          runToken,
          lastProgress,
          progressReadHooks,
        );
        if (stableObservation === null || stableObservation.advanced) {
          throw new Error('PA7 worker final progress 在 child close 后不稳定。');
        }
        if (lastProgress.runToken !== payload.runToken || !sameProgress(lastProgress, payload.progressFinal)) {
          throw new Error('PA7 worker payload/progress final identity 不一致。');
        }
      } catch (error) {
        fail('progress-invalid', 'aggregate', error);
        return;
      }
      settled = true;
      void cleanupTemporaryPaths().then((temporary) => {
        const cleanup = makeCleanup(temporary);
        if (cleanup.pendingCleanupCount !== 0 || cleanup.cleanupErrors.length !== 0) {
          reject(new ArenaPa7FormalWorkerFailureV1({
            kind: 'cleanup-failed',
            phase: 'cleanup',
            progress: lastProgress,
            cleanup,
            primaryCause: new AggregateError(cleanupErrors, 'PA7 worker 成功后清理不完整。'),
          }));
          return;
        }
        resolve(Object.freeze({ payload, progress: lastProgress, cleanup }));
      });
    });
  });
}

function assertSafePublicationPath(outputPath: string): Readonly<{
  readonly directory: string;
  readonly basename: string;
}> {
  if (!path.isAbsolute(outputPath) || outputPath.includes('\0')) {
    throw new TypeError('PA7 evidence output 必须是绝对路径。');
  }
  const normalized = path.normalize(outputPath);
  if (normalized !== outputPath) throw new Error('PA7 evidence output 不得包含路径逃逸或冗余段。');
  const directory = path.dirname(outputPath);
  const basename = path.basename(outputPath);
  if (basename.length === 0 || basename === '.' || basename === '..') {
    throw new Error('PA7 evidence output basename 非法。');
  }
  const directoryStats = lstatSync(directory);
  const directoryReal = realpathSync(directory);
  if (!directoryStats.isDirectory() || directoryStats.isSymbolicLink() || directoryReal !== directory) {
    throw new Error('PA7 evidence output 目录不得是符号链接。');
  }
  if (path.join(directory, basename) !== outputPath) throw new Error('PA7 evidence output 路径逃逸。');
  return Object.freeze({ directory, basename });
}

async function lstatIfExists(filePath: string): Promise<Awaited<ReturnType<typeof lstat>> | null> {
  try {
    return await lstat(filePath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export class ArenaPa7FormalPublicationFailureV1 extends Error {
  readonly kind: 'publication-conflict' | 'publication-failed';
  readonly stats: ArenaPa7FormalPublicationStatsV1;
  readonly primaryCause: unknown;

  constructor(
    kind: 'publication-conflict' | 'publication-failed',
    stats: ArenaPa7FormalPublicationStatsV1,
    cause: unknown,
  ) {
    const description = describeThrown(cause);
    super(description.message ?? `PA7 ${kind}`);
    this.name = 'ArenaPa7FormalPublicationFailureV1';
    this.kind = kind;
    this.stats = stats;
    this.primaryCause = cause;
  }
}

export async function publishArenaPa7FormalEvidenceAtomicV1(
  outputPath: string,
  value: ArenaPa7FormalEvidenceV1,
  options: ArenaPa7FormalPublicationOptionsV1 = {},
): Promise<ArenaPa7FormalPublicationStatsV1> {
  const evidence = validateArenaPa7FormalEvidenceV1(value);
  const { directory, basename } = assertSafePublicationPath(outputPath);
  const token = options.token === undefined ? randomUUID() : nonEmptyString(options.token, 'PA7 publication token');
  if (!/^[A-Za-z0-9._-]+$/.test(token)) throw new Error('PA7 publication token 非法。');
  const lockPath = path.join(directory, `.${basename}.lock`);
  const temporaryPath = path.join(directory, `.${basename}.${process.pid}.${token}.tmp`);
  let lockHandle: FileHandle | null = null;
  let temporaryHandle: FileHandle | null = null;
  let lockExists = false;
  let temporaryExists = false;
  let published = false;
  let primaryError: unknown = null;
  let conflict = false;
  let created = 0;
  let removed = 0;
  const cleanupErrors: unknown[] = [];
  try {
    if (await lstatIfExists(outputPath)) {
      conflict = true;
      throw new Error('PA7 evidence target 已存在。');
    }
    try {
      lockHandle = await open(lockPath, 'wx', 0o600);
      lockExists = true;
      created += 1;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') conflict = true;
      throw error;
    }
    if (await lstatIfExists(outputPath)) {
      conflict = true;
      throw new Error('PA7 evidence target 在获得锁前已出现。');
    }
    temporaryHandle = await open(temporaryPath, 'wx', 0o600);
    temporaryExists = true;
    created += 1;
    await temporaryHandle.writeFile(`${JSON.stringify(evidence)}\n`);
    await temporaryHandle.sync();
    await temporaryHandle.close();
    temporaryHandle = null;
    if (options.beforePublish !== undefined) {
      const hookResult = options.beforePublish();
      if (utilTypes.isPromise(hookResult)) await hookResult;
      else if (hookResult !== null && typeof hookResult === 'object') {
        if (utilTypes.isProxy(hookResult)) throw new TypeError('PA7 beforePublish 不接受 Proxy。');
        const thenDescriptor = Object.getOwnPropertyDescriptor(hookResult, 'then');
        if (thenDescriptor !== undefined) throw new TypeError('PA7 beforePublish 不接受 thenable。');
      }
    }
    const temporaryText = await readFile(temporaryPath, 'utf8');
    if (!temporaryText.endsWith('\n') || temporaryText.slice(0, -1).includes('\n')) {
      throw new Error('PA7 evidence 临时文件必须是单行完整 JSON。');
    }
    const temporaryEvidence = validateArenaPa7FormalEvidenceV1(
      JSON.parse(temporaryText.slice(0, -1)) as unknown,
    );
    if (temporaryEvidence.evidenceHash !== evidence.evidenceHash) {
      throw new Error('PA7 evidence 临时文件重读 identity 漂移。');
    }
    await link(temporaryPath, outputPath);
    published = true;
  } catch (error) {
    if (ownErrorCode(error) === 'EEXIST') conflict = true;
    primaryError = error;
  }
  if (temporaryHandle !== null) {
    try {
      await temporaryHandle.close();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (temporaryExists) {
    try {
      await unlink(temporaryPath);
      temporaryExists = false;
      removed += 1;
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (lockHandle !== null) {
    try {
      await lockHandle.close();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (lockExists) {
    try {
      await unlink(lockPath);
      lockExists = false;
      removed += 1;
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (primaryError === null && cleanupErrors.length === 0 && published) {
    try {
      const publishedStats = await lstat(outputPath);
      if (!publishedStats.isFile() || publishedStats.isSymbolicLink()) {
        throw new Error('PA7 evidence published target 不是普通文件。');
      }
      const publishedText = await readFile(outputPath, 'utf8');
      if (!publishedText.endsWith('\n') || publishedText.slice(0, -1).includes('\n')) {
        throw new Error('PA7 evidence published target 必须是单行完整 JSON。');
      }
      const reread = validateArenaPa7FormalEvidenceV1(
        JSON.parse(publishedText.slice(0, -1)) as unknown,
      );
      if (reread.evidenceHash !== evidence.evidenceHash) {
        throw new Error('PA7 evidence 发布后重读 identity 漂移。');
      }
      return Object.freeze({
        temporaryPathsCreated: created,
        temporaryPathsRemoved: removed,
        cleanupErrors: Object.freeze([]),
      });
    } catch (error) {
      primaryError = error;
    }
  }
  if (published) {
    try {
      await unlink(outputPath);
      published = false;
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  const stats = Object.freeze({
    temporaryPathsCreated: created,
    temporaryPathsRemoved: removed,
    cleanupErrors: Object.freeze(cleanupErrors.map(cleanupMessage)),
  });
  const cause = mergeErrors(
    primaryError ?? new Error('PA7 evidence publication 未完成。'),
    cleanupErrors,
    'PA7 evidence 发布失败且清理不完整。',
  );
  throw new ArenaPa7FormalPublicationFailureV1(
    conflict ? 'publication-conflict' : 'publication-failed',
    stats,
    cause,
  );
}

function sourceIdentity(
  before: ArenaPa7FormalSourceSnapshotV1,
  after: ArenaPa7FormalSourceSnapshotV1,
): ArenaPa7FormalSourceIdentityV1 {
  return Object.freeze({
    headCommit: before.headCommit,
    sourceDirty: before.sourceDirty,
    repositoryFingerprintBefore: before.repositoryFingerprint,
    repositoryFingerprintAfter: after.repositoryFingerprint,
    packageLockHash: before.packageLockHash,
    productionModuleHashes: before.productionModuleHashes,
  });
}

function validateSourceSnapshot(value: unknown, name: string): ArenaPa7FormalSourceSnapshotV1 {
  const record = strictRecord(
    value,
    [
      'headCommit', 'sourceDirty', 'repositoryFingerprint', 'packageLockHash',
      'productionModuleHashes',
    ],
    name,
  );
  if (typeof record.headCommit !== 'string' || !HEAD_PATTERN.test(record.headCommit)) {
    throw new TypeError(`${name}.headCommit 非法。`);
  }
  if (typeof record.sourceDirty !== 'boolean') throw new TypeError(`${name}.sourceDirty 非法。`);
  const repositoryFingerprint = sha256(record.repositoryFingerprint, `${name}.repositoryFingerprint`);
  const packageLockHash = sha256(record.packageLockHash, `${name}.packageLockHash`);
  if (!Array.isArray(record.productionModuleHashes) || record.productionModuleHashes.length === 0) {
    throw new TypeError(`${name}.productionModuleHashes 必须非空。`);
  }
  const modules = record.productionModuleHashes.map((item, index) => {
    const module = strictRecord(item, ['relativePath', 'sha256'], `${name}.productionModuleHashes[${index}]`);
    return Object.freeze({
      relativePath: canonicalRepositoryPath(
        module.relativePath,
        `${name}.productionModuleHashes[${index}].relativePath`,
      ),
      sha256: sha256(module.sha256, `${name}.productionModuleHashes[${index}].sha256`),
    });
  });
  if (modules.some((item, index) => index > 0
    && modules[index - 1]!.relativePath >= item.relativePath)) {
    throw new Error(`${name}.productionModuleHashes 必须唯一且排序。`);
  }
  return Object.freeze({
    headCommit: record.headCommit,
    sourceDirty: record.sourceDirty,
    repositoryFingerprint,
    packageLockHash,
    productionModuleHashes: Object.freeze(modules),
  });
}

function validateBuildIdentity(value: unknown, name: string): ArenaPa7FormalBuildIdentityV1 {
  const record = strictRecord(
    value,
    [
      'nodeVersion', 'packageManagerVersion', 'platform', 'architecture', 'buildId', 'buildHash',
      'productionVariantId', 'loaderAttestationHash',
    ],
    name,
  );
  if (record.productionVariantId !== 'C+B+D') throw new Error(`${name}.productionVariantId 漂移。`);
  return Object.freeze({
    nodeVersion: nonEmptyString(record.nodeVersion, `${name}.nodeVersion`),
    packageManagerVersion: nonEmptyString(record.packageManagerVersion, `${name}.packageManagerVersion`),
    platform: nonEmptyString(record.platform, `${name}.platform`),
    architecture: nonEmptyString(record.architecture, `${name}.architecture`),
    buildId: nonEmptyString(record.buildId, `${name}.buildId`),
    buildHash: sha256(record.buildHash, `${name}.buildHash`),
    productionVariantId: 'C+B+D',
    loaderAttestationHash: sha256(record.loaderAttestationHash, `${name}.loaderAttestationHash`),
  });
}

function validateEnvironmentIdentity(value: unknown, name: string): ArenaPa7FormalEnvironmentIdentityV1 {
  const record = strictRecord(
    value,
    ['cpuModel', 'logicalCpuCount', 'totalMemoryBytes', 'isolationEvidenceId', 'isolationEvidenceHash'],
    name,
  );
  return Object.freeze({
    cpuModel: nonEmptyString(record.cpuModel, `${name}.cpuModel`),
    logicalCpuCount: safeInteger(record.logicalCpuCount, `${name}.logicalCpuCount`, 1),
    totalMemoryBytes: safeInteger(record.totalMemoryBytes, `${name}.totalMemoryBytes`, 1),
    isolationEvidenceId: nonEmptyString(record.isolationEvidenceId, `${name}.isolationEvidenceId`),
    isolationEvidenceHash: sha256(record.isolationEvidenceHash, `${name}.isolationEvidenceHash`),
  });
}

function sameStrictData(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function unavailableSourceSnapshot(): ArenaPa7FormalSourceSnapshotV1 {
  return Object.freeze({
    headCommit: SOURCE_UNAVAILABLE_HEAD,
    sourceDirty: true,
    repositoryFingerprint: SOURCE_UNAVAILABLE_HASH,
    packageLockHash: SOURCE_UNAVAILABLE_HASH,
    productionModuleHashes: Object.freeze([{ relativePath: 'unavailable', sha256: SOURCE_UNAVAILABLE_HASH }]),
  });
}

function unavailableBuildIdentity(
  input: ArenaPa7FormalBuildAttestationV1,
): ArenaPa7FormalBuildIdentityV1 {
  const record = strictRecord(
    input,
    [
      'buildId', 'buildHash', 'productionVariantId', 'loaderAttestationHash', 'packageLockHash',
      'contentSelectionHash', 'compositionContractHash',
    ],
    'PA7 unavailable build input',
  );
  return Object.freeze({
    nodeVersion: process.version || 'unavailable',
    packageManagerVersion: 'unavailable',
    platform: process.platform || 'unavailable',
    architecture: process.arch || 'unavailable',
    buildId: typeof record.buildId === 'string' && record.buildId.trim() ? record.buildId : 'unavailable',
    buildHash: typeof record.buildHash === 'string' && SHA256_PATTERN.test(record.buildHash)
      ? record.buildHash : SOURCE_UNAVAILABLE_HASH,
    productionVariantId: 'C+B+D',
    loaderAttestationHash: typeof record.loaderAttestationHash === 'string'
      && SHA256_PATTERN.test(record.loaderAttestationHash)
      ? record.loaderAttestationHash : SOURCE_UNAVAILABLE_HASH,
  });
}

function unavailableEnvironmentIdentity(
  input: ArenaPa7FormalIsolationAttestationV1,
): ArenaPa7FormalEnvironmentIdentityV1 {
  const record = strictRecord(
    input,
    ['isolationEvidenceId', 'isolationEvidenceHash'],
    'PA7 unavailable environment input',
  );
  return Object.freeze({
    cpuModel: 'unavailable',
    logicalCpuCount: 1,
    totalMemoryBytes: 1,
    isolationEvidenceId: typeof record.isolationEvidenceId === 'string' && record.isolationEvidenceId.trim()
      ? record.isolationEvidenceId : 'unavailable',
    isolationEvidenceHash: typeof record.isolationEvidenceHash === 'string'
      && SHA256_PATTERN.test(record.isolationEvidenceHash)
      ? record.isolationEvidenceHash : SOURCE_UNAVAILABLE_HASH,
  });
}

function cleanupContract(value: ArenaPa7FormalWorkerCleanupV1): ArenaPa7FormalEvidenceCleanupV1 {
  return Object.freeze({
    childProcessesStarted: value.childProcessesStarted,
    childProcessesExited: value.childProcessesExited,
    termSignalsSent: value.termSignalsSent,
    killSignalsSent: value.killSignalsSent,
    temporaryPathsCreated: value.temporaryPathsCreated,
    temporaryPathsRemoved: value.temporaryPathsRemoved,
    pendingCleanupCount: value.pendingCleanupCount,
    cleanupErrorCount: value.cleanupErrors.length,
  });
}

function withPublicationCleanup(
  cleanup: ArenaPa7FormalWorkerCleanupV1,
  stats: Readonly<{ readonly created: number; readonly removed: number; readonly errors?: readonly string[] }>,
): ArenaPa7FormalWorkerCleanupV1 {
  const errors = Object.freeze([...cleanup.cleanupErrors, ...(stats.errors ?? [])]);
  return Object.freeze({
    ...cleanup,
    temporaryPathsCreated: cleanup.temporaryPathsCreated + stats.created,
    temporaryPathsRemoved: cleanup.temporaryPathsRemoved + stats.removed,
    pendingCleanupCount: cleanup.pendingCleanupCount + (stats.created - stats.removed),
    cleanupErrors: errors,
  });
}

function zeroCleanup(): ArenaPa7FormalWorkerCleanupV1 {
  return Object.freeze({
    childProcessesStarted: 0,
    childProcessesExited: 0,
    termSignalsSent: 0,
    killSignalsSent: 0,
    temporaryPathsCreated: 0,
    temporaryPathsRemoved: 0,
    pendingCleanupCount: 0,
    cleanupErrors: Object.freeze([]),
  });
}

function failureGates(kind: FormalFailureKind, phase: FormalFailurePhase): readonly ArenaPa7FormalGateV1[] {
  return Object.freeze(ARENA_PA7_FORMAL_GATE_IDS.map((id) => Object.freeze({
    id,
    passed: false,
    evidenceHash: stableHash({ id, kind, phase, disposition: 'not-formally-passed' }),
    failureReason: kind,
  })));
}

function bindGates(
  gates: readonly ArenaPa7FormalGateV1[],
  context: Readonly<{
    readonly source: ArenaPa7FormalSourceIdentityV1;
    readonly build: ArenaPa7FormalBuildIdentityV1;
    readonly environment: ArenaPa7FormalEnvironmentIdentityV1;
    readonly progress: ArenaPa7FormalProgressV1;
    readonly semanticHash: string;
    readonly payloadHash: string | null;
    readonly cleanup: ArenaPa7FormalWorkerCleanupV1;
    readonly publicationTarget: string;
  }>,
): readonly ArenaPa7FormalGateV1[] {
  return Object.freeze(gates.map((gate) => Object.freeze({
    ...gate,
    evidenceHash: stableHash({
      gateId: gate.id,
      passed: gate.passed,
      failureReason: gate.failureReason,
      upstreamEvidenceHash: gate.evidenceHash,
      source: context.source,
      build: context.build,
      environment: context.environment,
      progress: context.progress,
      semanticHash: context.semanticHash,
      payloadHash: context.payloadHash,
      cleanup: context.cleanup,
      publicationTarget: context.publicationTarget,
    }),
  })));
}

function validateSuccessfulGates(value: unknown): readonly ArenaPa7FormalGateV1[] {
  const gates = validateGateAttestation(value);
  if (gates.some(({ passed }) => !passed)) throw new Error('PA7 formal success gate attestation 包含失败门。');
  return gates;
}

function derivePayloadBudgetGates(
  gates: readonly ArenaPa7FormalGateV1[],
  payload: ArenaPa7FormalRunPayloadV1,
  payloadHash: string,
): readonly ArenaPa7FormalGateV1[] {
  return Object.freeze(gates.map((gate) => {
    if (gate.id === 'cpu-budget') {
      const observed = payload.aggregate.cpu.p95MicrosPerTick;
      const passed = observed <= ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK;
      return Object.freeze({
        id: gate.id,
        passed,
        evidenceHash: stableHash({
          gateId: gate.id,
          payloadHash,
          observedP95MicrosPerTick: observed,
          budgetMicrosPerTick: ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK,
        }),
        failureReason: passed ? null : 'cpu-limit',
      });
    }
    if (gate.id === 'heap-budget') {
      const observed = payload.aggregate.heap.deltaBytes;
      const passed = observed <= ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES;
      return Object.freeze({
        id: gate.id,
        passed,
        evidenceHash: stableHash({
          gateId: gate.id,
          payloadHash,
          observedHeapDeltaBytes: observed,
          budgetHeapDeltaBytes: ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES,
        }),
        failureReason: passed ? null : 'heap-limit',
      });
    }
    return gate;
  }));
}

function payloadBudgetFailure(payload: ArenaPa7FormalRunPayloadV1): Readonly<{
  readonly kind: 'cpu-limit' | 'heap-limit';
  readonly message: string;
}> | null {
  if (payload.aggregate.cpu.p95MicrosPerTick > ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK) {
    return Object.freeze({
      kind: 'cpu-limit',
      message: `PA7 CPU p95 ${payload.aggregate.cpu.p95MicrosPerTick}us/tick 超过 ${ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK}us/tick。`,
    });
  }
  if (payload.aggregate.heap.deltaBytes > ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES) {
    return Object.freeze({
      kind: 'heap-limit',
      message: `PA7 heap delta ${payload.aggregate.heap.deltaBytes} bytes 超过 ${ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES} bytes。`,
    });
  }
  return null;
}

function failureFrom(
  kind: FormalFailureKind,
  phase: FormalFailurePhase,
  progress: ArenaPa7FormalProgressV1,
  source: ArenaPa7FormalSourceIdentityV1,
  cleanup: ArenaPa7FormalWorkerCleanupV1,
  cause: unknown,
): ArenaPa7FormalFailureV1 {
  const description = describeThrown(cause);
  return Object.freeze({
    kind,
    phase,
    completedCases: progress.completedCases,
    currentCaseIndex: progress.currentCaseIndex,
    currentCaseId: progress.currentCaseId,
    currentPass: progress.currentPass,
    currentTick: progress.currentTick,
    lastCommittedCaseEvidenceHash: progress.lastCommittedCaseEvidenceHash,
    sourceFingerprintBefore: source.repositoryFingerprintBefore,
    sourceFingerprintAfter: source.repositoryFingerprintAfter,
    cleanupErrors: cleanup.cleanupErrors,
    causeName: description.name,
    causeMessage: description.message,
  });
}

function createEvidence(options: {
  readonly source: ArenaPa7FormalSourceIdentityV1;
  readonly build: ArenaPa7FormalBuildIdentityV1;
  readonly environment: ArenaPa7FormalEnvironmentIdentityV1;
  readonly progress: ArenaPa7FormalProgressV1;
  readonly payload: ArenaPa7FormalRunPayloadV1 | null;
  readonly gates: readonly ArenaPa7FormalGateV1[];
  readonly cleanup: ArenaPa7FormalWorkerCleanupV1;
  readonly failure: ArenaPa7FormalFailureV1 | null;
  readonly generatedAt: string;
}): ArenaPa7FormalEvidenceV1 {
  const withoutHash = Object.freeze({
    schemaVersion: ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION,
    contractId: ARENA_PA7_FORMAL_CONTRACT_ID,
    sourceIdentity: options.source,
    buildIdentity: options.build,
    environmentIdentity: options.environment,
    request: ARENA_PA7_FORMAL_REQUEST_V1,
    progress: options.progress,
    payload: options.payload,
    gates: options.gates,
    cleanup: cleanupContract(options.cleanup),
    status: options.failure === null ? 'formal-passed' as const : 'formal-failed' as const,
    failure: options.failure,
    semanticHash: options.payload?.semanticHash ?? stableHash({
      progress: options.progress,
      failure: options.failure,
    }),
    generatedAt: options.generatedAt,
  });
  const evidence = Object.freeze({
    ...withoutHash,
    evidenceHash: createArenaPa7FormalEvidenceHashV1(withoutHash),
  });
  const validated = validateArenaPa7FormalEvidenceV1(evidence);
  return validateArenaPa7FormalEvidenceV1(JSON.parse(JSON.stringify(validated)) as unknown);
}

function sourceChanged(
  before: ArenaPa7FormalSourceSnapshotV1,
  after: ArenaPa7FormalSourceSnapshotV1,
): boolean {
  return before.headCommit !== after.headCommit
    || before.repositoryFingerprint !== after.repositoryFingerprint
    || before.packageLockHash !== after.packageLockHash
    || JSON.stringify(before.productionModuleHashes) !== JSON.stringify(after.productionModuleHashes);
}

function assertCapturedProductionModules(
  source: ArenaPa7FormalSourceSnapshotV1,
  expectedPaths: readonly string[],
  name: string,
): void {
  const actualPaths = source.productionModuleHashes.map(({ relativePath }) => relativePath);
  if (actualPaths.length !== expectedPaths.length
    || actualPaths.some((item, index) => item !== expectedPaths[index])) {
    throw new Error(`${name} production module hash 闭包与正式配置不一致。`);
  }
}

function normalizeWorkerResult(value: unknown, expectedRunToken: string): ArenaPa7FormalWorkerResultV1 {
  if (value === null || typeof value !== 'object' || utilTypes.isProxy(value)) {
    throw new TypeError('PA7 worker result 必须是普通数据对象。');
  }
  const payloadDescriptor = Object.getOwnPropertyDescriptor(value, 'payload');
  const progressDescriptor = Object.getOwnPropertyDescriptor(value, 'progress');
  const cleanupDescriptor = Object.getOwnPropertyDescriptor(value, 'cleanup');
  const keys = Reflect.ownKeys(value);
  if (keys.length !== 3 || keys.some((key) => typeof key !== 'string'
    || !['payload', 'progress', 'cleanup'].includes(key))) {
    throw new TypeError('PA7 worker result exact-key 校验失败。');
  }
  if (!payloadDescriptor || !Object.hasOwn(payloadDescriptor, 'value')
    || !progressDescriptor || !Object.hasOwn(progressDescriptor, 'value')
    || !cleanupDescriptor || !Object.hasOwn(cleanupDescriptor, 'value')) {
    throw new TypeError('PA7 worker result 不接受 getter。');
  }
  const payload = validateArenaPa7FormalRunPayloadV1(payloadDescriptor.value);
  const progress = validateArenaPa7FormalProgressSequenceV1([progressDescriptor.value])[0]!;
  if (payload.runToken !== expectedRunToken || progress.runToken !== expectedRunToken
    || !sameProgress(progress, payload.progressFinal)) {
    throw new Error('PA7 worker result runToken/progress/payload 不一致。');
  }
  const cleanupRecord = strictRecord(
    cleanupDescriptor.value,
    [
      'childProcessesStarted', 'childProcessesExited', 'termSignalsSent', 'killSignalsSent',
      'temporaryPathsCreated', 'temporaryPathsRemoved', 'pendingCleanupCount', 'cleanupErrors',
    ],
    'PA7 worker cleanup',
  );
  const errors = cleanupRecord.cleanupErrors;
  if (!Array.isArray(errors) || errors.some((item) => typeof item !== 'string')) {
    throw new TypeError('PA7 worker cleanupErrors 必须是字符串数组。');
  }
  const cleanup: ArenaPa7FormalWorkerCleanupV1 = Object.freeze({
    childProcessesStarted: safeInteger(cleanupRecord.childProcessesStarted, 'PA7 child started'),
    childProcessesExited: safeInteger(cleanupRecord.childProcessesExited, 'PA7 child exited'),
    termSignalsSent: safeInteger(cleanupRecord.termSignalsSent, 'PA7 TERM count'),
    killSignalsSent: safeInteger(cleanupRecord.killSignalsSent, 'PA7 KILL count'),
    temporaryPathsCreated: safeInteger(cleanupRecord.temporaryPathsCreated, 'PA7 temp created'),
    temporaryPathsRemoved: safeInteger(cleanupRecord.temporaryPathsRemoved, 'PA7 temp removed'),
    pendingCleanupCount: safeInteger(cleanupRecord.pendingCleanupCount, 'PA7 pending cleanup'),
    cleanupErrors: Object.freeze([...errors] as string[]),
  });
  return Object.freeze({ payload, progress, cleanup });
}

function failureDetails(error: unknown, fallbackProgress: ArenaPa7FormalProgressV1): Readonly<{
  readonly kind: FormalFailureKind;
  readonly phase: FormalFailurePhase;
  readonly progress: ArenaPa7FormalProgressV1;
  readonly cleanup: ArenaPa7FormalWorkerCleanupV1;
  readonly cause: unknown;
}> {
  if (!utilTypes.isProxy(error) && error instanceof ArenaPa7FormalWorkerFailureV1) {
    return Object.freeze({
      kind: error.kind,
      phase: error.phase,
      progress: error.progress,
      cleanup: error.cleanup,
      cause: error.primaryCause,
    });
  }
  return Object.freeze({
    kind: 'case-validation',
    phase: 'aggregate',
    progress: fallbackProgress,
    cleanup: zeroCleanup(),
    cause: error,
  });
}

function phaseForGateFailure(
  kind: FormalFailureKind,
  progress: ArenaPa7FormalProgressV1,
): FormalFailurePhase {
  if (kind === 'request-invalid' || kind === 'source-dirty' || kind === 'source-drift'
    || kind === 'build-unattested') return 'preflight';
  if (kind === 'runner-startup') return 'spawn';
  if (kind === 'cleanup-failed') return 'cleanup';
  if (kind === 'publication-conflict' || kind === 'publication-failed') return 'publish';
  if (kind === 'cpu-limit' || kind === 'heap-limit' || kind === 'resource-limit'
    || kind === 'case-validation') return 'aggregate';
  if (kind === 'timeout' || kind === 'progress-invalid' || kind === 'case-execution') {
    return progress.currentPass === 2 ? 'run-second' : 'run-first';
  }
  return 'compare';
}

async function settleNativePromise<T>(value: T | Promise<T>): Promise<Readonly<{ readonly value: T }>> {
  if (utilTypes.isPromise(value)) return Object.freeze({ value: await value });
  return Object.freeze({ value: value as T });
}

export async function runArenaPa7FormalEvidenceV1(
  options: ArenaPa7FormalEvidenceRunOptionsV1,
  dependencies: ArenaPa7FormalEvidenceDependenciesV1 = {},
): Promise<ArenaPa7FormalRunResultV1> {
  const cwd = realpathSync(nonEmptyString(options.cwd, 'PA7 cwd'));
  const outputPath = nonEmptyString(options.outputPath, 'PA7 output path');
  assertSafePublicationPath(outputPath);
  const productionModulePaths = validateProductionModulePaths(options.productionModulePaths);
  const buildAttestation = validateBuildAttestation(options.buildAttestation);
  const isolationAttestation = validateIsolationAttestation(options.isolationAttestation);
  const worker = validateFormalWorkerCommand(options.worker, buildAttestation.loaderAttestationHash);
  const timeoutMs = safeInteger(
    options.inactivityTimeoutMs ?? ARENA_PA7_FORMAL_DEFAULT_INACTIVITY_TIMEOUT_MS,
    'PA7 inactivity timeout',
    1,
  );
  const outputCapBytes = safeInteger(
    options.outputCapBytes ?? ARENA_PA7_FORMAL_DEFAULT_OUTPUT_CAP_BYTES,
    'PA7 output cap',
    1,
  );
  const progressPollMs = safeInteger(
    options.progressPollMs ?? ARENA_PA7_FORMAL_DEFAULT_PROGRESS_POLL_MS,
    'PA7 progress poll',
    1,
  );
  const termGraceMs = safeInteger(
    options.termGraceMs ?? ARENA_PA7_FORMAL_DEFAULT_TERM_GRACE_MS,
    'PA7 TERM grace',
    1,
  );
  const killWaitMs = safeInteger(
    options.killWaitMs ?? ARENA_PA7_FORMAL_DEFAULT_KILL_WAIT_MS,
    'PA7 KILL wait',
    1,
  );
  const tokenFactory = dependencies.token ?? randomUUID;
  const now = dependencies.now ?? (() => new Date());
  const captureSource = dependencies.captureSource ?? captureArenaPa7FormalSourceSnapshotV1;
  const captureBuild = dependencies.captureBuild ?? captureArenaPa7FormalBuildIdentityV1;
  const captureEnvironment = dependencies.captureEnvironment ?? captureArenaPa7FormalEnvironmentIdentityV1;
  const runWorker = dependencies.runWorker ?? runArenaPa7StrictJsonWorkerV1;
  const publish = dependencies.publish ?? publishArenaPa7FormalEvidenceAtomicV1;
  const runToken = nonEmptyString(tokenFactory(), 'PA7 generated run token');
  let progress = initialProgress(runToken);
  let before = unavailableSourceSnapshot();
  let after = before;
  let build = unavailableBuildIdentity(buildAttestation);
  let buildAfter = build;
  let environment = unavailableEnvironmentIdentity(isolationAttestation);
  let environmentAfter = environment;
  let cleanup = zeroCleanup();
  let payload: ArenaPa7FormalRunPayloadV1 | null = null;
  let payloadHash: string | null = null;
  let primary: PendingFailure | null = null;
  let primaryCause: unknown = null;
  let gates: readonly ArenaPa7FormalGateV1[] = failureGates('request-invalid', 'preflight');

  try {
    gates = validateGateAttestation(options.gateAttestation);
  } catch (error) {
    primary = Object.freeze({ kind: 'request-invalid', phase: 'preflight', cause: error });
    primaryCause = error;
  }
  if (primary === null) {
    try {
      const captured = await settleNativePromise(captureSource(cwd, productionModulePaths));
      before = validateSourceSnapshot(captured.value, 'PA7 source before');
      assertCapturedProductionModules(before, productionModulePaths, 'PA7 source before');
      after = before;
    } catch (error) {
      primary = Object.freeze({ kind: 'source-dirty', phase: 'preflight', cause: error });
      primaryCause = error;
    }
  }
  if (primary === null && before.sourceDirty) {
    primaryCause = new Error('PA7 formal gate 要求 clean source。');
    primary = Object.freeze({ kind: 'source-dirty', phase: 'preflight', cause: primaryCause });
  }
  if (primary === null) {
    try {
      const capturedBuild = await settleNativePromise(captureBuild(buildAttestation));
      const capturedEnvironment = await settleNativePromise(
        captureEnvironment(isolationAttestation),
      );
      build = validateBuildIdentity(capturedBuild.value, 'PA7 build before');
      buildAfter = build;
      environment = validateEnvironmentIdentity(capturedEnvironment.value, 'PA7 environment before');
      environmentAfter = environment;
      if (before.packageLockHash !== buildAttestation.packageLockHash) {
        throw new Error('PA7 captured package-lock 与 build attestation 不一致。');
      }
    } catch (error) {
      primary = Object.freeze({ kind: 'build-unattested', phase: 'preflight', cause: error });
      primaryCause = error;
    }
  }
  if (primary === null) {
    try {
      const rawResult = await settleNativePromise(runWorker({
        command: worker.command,
        args: worker.args,
        cwd,
        temporaryDirectory: path.dirname(outputPath),
        runToken,
        inactivityTimeoutMs: timeoutMs,
        outputCapBytes,
        progressPollMs,
        termGraceMs,
        killWaitMs,
      }));
      const result = normalizeWorkerResult(rawResult.value, runToken);
      payload = result.payload;
      payloadHash = stableHash(payload);
      progress = result.progress;
      cleanup = result.cleanup;
      if (cleanup.pendingCleanupCount !== 0 || cleanup.cleanupErrors.length !== 0
        || cleanup.childProcessesStarted !== cleanup.childProcessesExited
        || cleanup.temporaryPathsCreated !== cleanup.temporaryPathsRemoved) {
        throw new ArenaPa7FormalWorkerFailureV1({
          kind: 'cleanup-failed',
          phase: 'cleanup',
          progress,
          cleanup,
          primaryCause: new Error('PA7 worker cleanup 未闭合。'),
        });
      }
      if (payload.manifestIdentity.contentSelectionHash
          !== buildAttestation.contentSelectionHash
        || payload.manifestIdentity.compositionContractHash
          !== buildAttestation.compositionContractHash
        || payload.workloadIdentity.productionVariantId !== buildAttestation.productionVariantId
        || payload.workloadIdentity.loaderAttestationHash
          !== buildAttestation.loaderAttestationHash) {
        throw new ArenaPa7FormalWorkerFailureV1({
          kind: 'build-unattested',
          phase: 'preflight',
          progress,
          cleanup,
          primaryCause: new Error(
            'PA7 payload 的 variant/content/composition/loader identity 与正式 build 不一致。',
          ),
        });
      }
      gates = derivePayloadBudgetGates(gates, payload, payloadHash);
      const budgetFailure = payloadBudgetFailure(payload);
      if (budgetFailure !== null) {
        throw new ArenaPa7FormalWorkerFailureV1({
          kind: budgetFailure.kind,
          phase: 'aggregate',
          progress,
          cleanup,
          primaryCause: new Error(budgetFailure.message),
        });
      }
    } catch (error) {
      const details = failureDetails(error, progress);
      primary = Object.freeze({ kind: details.kind, phase: details.phase, cause: details.cause });
      primaryCause = details.cause;
      progress = details.progress;
      cleanup = details.cleanup;
    }
  }
  try {
    const captured = await settleNativePromise(captureSource(cwd, productionModulePaths));
    after = validateSourceSnapshot(captured.value, 'PA7 source after');
    assertCapturedProductionModules(after, productionModulePaths, 'PA7 source after');
  } catch (error) {
    if (primary === null) {
      primary = Object.freeze({ kind: 'source-drift', phase: 'preflight', cause: error });
      primaryCause = error;
    }
  }
  if (primary === null && sourceChanged(before, after)) {
    primaryCause = new Error('PA7 repository fingerprint/source identity 在运行前后漂移。');
    primary = Object.freeze({ kind: 'source-drift', phase: 'preflight', cause: primaryCause });
  }
  if (primary === null) {
    try {
      const capturedBuild = await settleNativePromise(captureBuild(buildAttestation));
      const capturedEnvironment = await settleNativePromise(
        captureEnvironment(isolationAttestation),
      );
      buildAfter = validateBuildIdentity(capturedBuild.value, 'PA7 build after');
      environmentAfter = validateEnvironmentIdentity(capturedEnvironment.value, 'PA7 environment after');
      if (!sameStrictData(build, buildAfter) || !sameStrictData(environment, environmentAfter)) {
        throw new Error('PA7 build/environment identity 在执行前后漂移。');
      }
    } catch (error) {
      primary = Object.freeze({ kind: 'build-unattested', phase: 'preflight', cause: error });
      primaryCause = error;
    }
  }
  if (primary === null) {
    const failedGate = gates.find(({ passed }) => !passed);
    if (failedGate !== undefined) {
      primaryCause = new Error(`PA7 gate ${failedGate.id} 未通过。`);
      primary = Object.freeze({
        kind: failedGate.failureReason!,
        phase: phaseForGateFailure(failedGate.failureReason!, progress),
        cause: primaryCause,
      });
    }
  }

  const source = sourceIdentity(before, after);
  const generatedAt = now().toISOString();
  const expectedPublicationCleanup = withPublicationCleanup(cleanup, { created: 2, removed: 2 });
  const gateContext = {
    source,
    build,
    environment,
    progress,
    semanticHash: payload?.semanticHash ?? stableHash({
      progress,
      failureKind: primary?.kind ?? null,
      failurePhase: primary?.phase ?? null,
    }),
    payloadHash,
    cleanup: expectedPublicationCleanup,
    publicationTarget: outputPath,
  } as const;
  let evidence: ArenaPa7FormalEvidenceV1;
  if (primary === null) {
    evidence = createEvidence({
      source,
      build,
      environment,
      progress,
      payload,
      gates: bindGates(validateSuccessfulGates(gates), gateContext),
      cleanup: expectedPublicationCleanup,
      failure: null,
      generatedAt,
    });
  } else {
    const failedCleanup = expectedPublicationCleanup;
    const failure = failureFrom(
      primary.kind,
      primary.phase,
      progress,
      source,
      failedCleanup,
      primaryCause,
    );
    evidence = createEvidence({
      source,
      build,
      environment,
      progress,
      payload,
      gates: bindGates(failureGates(primary.kind, primary.phase), gateContext),
      cleanup: failedCleanup,
      failure,
      generatedAt,
    });
  }

  try {
    await settleNativePromise(publish(outputPath, evidence, { token: runToken }));
    return Object.freeze({ evidence, publishedPath: outputPath });
  } catch (error) {
    const publication = !utilTypes.isProxy(error) && error instanceof ArenaPa7FormalPublicationFailureV1
      ? error
      : new ArenaPa7FormalPublicationFailureV1(
        'publication-failed',
        Object.freeze({ temporaryPathsCreated: 0, temporaryPathsRemoved: 0, cleanupErrors: Object.freeze([]) }),
        error,
      );
    const publicationCleanup = withPublicationCleanup(cleanup, {
      created: publication.stats.temporaryPathsCreated,
      removed: publication.stats.temporaryPathsRemoved,
      errors: publication.stats.cleanupErrors,
    });
    const publicationCause = primary === null
      ? publication.primaryCause
      : new AggregateError(
        [primaryCause, publication.primaryCause],
        `PA7 ${primary.kind} 且失败 evidence 未能发布。`,
      );
    const failure = failureFrom(
      publication.kind,
      'publish',
      progress,
      source,
      publicationCleanup,
      publicationCause,
    );
    const failedEvidence = createEvidence({
      source,
      build,
      environment,
      progress,
      payload,
      gates: bindGates(failureGates(publication.kind, 'publish'), {
        source,
        build,
        environment,
        progress,
        semanticHash: payload?.semanticHash ?? stableHash({ progress, publication: publication.kind }),
        payloadHash,
        cleanup: publicationCleanup,
        publicationTarget: outputPath,
      }),
      cleanup: publicationCleanup,
      failure,
      generatedAt,
    });
    return Object.freeze({ evidence: failedEvidence, publishedPath: null });
  }
}

export function gateAttestationHashV1(
  id: FormalGateId,
  evidence: unknown,
): string {
  if (!(ARENA_PA7_FORMAL_GATE_IDS as readonly string[]).includes(id)) {
    throw new Error('PA7 gate id 不受支持。');
  }
  return stableHash({ id, evidence });
}
