import { spawn, type ChildProcess } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID, type Hash } from 'node:crypto';
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  type BigIntStats,
} from 'node:fs';
import { link, open, rename, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import type { ArenaPa6FormalReadStepRoundV2 } from '../arena-formal-survival-bot-pressure.js';
import {
  ARENA_PA6_LOADER_CONFIG_ENV_V2,
  createArenaPa6LoaderConfigV2,
  validateArenaPa6LoaderAttestationV2,
  type ArenaPa6LoaderAttestationV2,
  type ArenaPa6LoaderConfigV2,
} from './arena-pa6-source-transform-register-v2.js';
import {
  ARENA_PA6_READ_STEP_ABBA_SCHEDULE_V1,
  ARENA_PA6_READ_STEP_ABBA_COMPARISONS_V1,
  ARENA_PA6_READ_STEP_CASES_V1,
  ARENA_PA6_READ_STEP_HARD_LIMIT_TICKS,
  ARENA_PA6_READ_STEP_VARIANTS_V1,
  ARENA_PA6_READ_STEP_VARIANT,
  assertArenaPa6AbbaScheduleV1,
  assertArenaPa6FixedCasesV1,
  requireArenaPa6ReadStepVariantV1,
  type ArenaPa6ReadStepScheduledRoundV1,
  type ArenaPa6ReadStepVariantId,
} from './arena-pa6-read-step-variants-v1.js';

export const ARENA_PA6_ABBA_SCHEMA_VERSION = 2 as const;
export const ARENA_PA6_ABBA_MINIMUM_GROUPS = 3 as const;
export const ARENA_PA6_ABBA_DEFAULT_TIMEOUT_MS = 30 * 60 * 1_000;
export const ARENA_PA6_ABBA_DEFAULT_OUTPUT_CAP_BYTES = 64 * 1024 * 1024;
export const ARENA_PA6_ABBA_INCLUSIVE_P95_LIMIT_MICROS = 225;
export const ARENA_PA6_ABBA_MINIMUM_RECOVERY_MICROS = 30.1;

const MAX_STRICT_DATA_DEPTH = 64;
const MAX_STRICT_DATA_NODES = 2_000_000;

function createArenaPa6LoaderSourceGraphIdentityV2(
  attestation: ArenaPa6LoaderAttestationV2,
): string {
  return createDeterministicDataHash({
    sourceFingerprint: attestation.sourceFingerprint,
    sourceFiles: {
      matchCore: attestation.files.matchCore.sourceSha256,
      actionAffordance: attestation.files.actionAffordance.sourceSha256,
    },
    workspaceSourceGraph: attestation.workspaceSourceGraph,
  }, 'PA6 loader source graph identity');
}

interface StrictCloneState {
  readonly active: Set<object>;
  nodes: number;
}

/** Copies only own enumerable data fields and rejects hostile/object-graph ambiguity. */
export function cloneArenaPa6StrictDataV1(
  value: unknown,
  name = 'PA6 data',
): unknown {
  const state: StrictCloneState = { active: new Set<object>(), nodes: 0 };
  const visit = (candidate: unknown, depth: number): unknown => {
    state.nodes += 1;
    if (state.nodes > MAX_STRICT_DATA_NODES || depth > MAX_STRICT_DATA_DEPTH) {
      throw new RangeError(`${name} 超出结构上限。`);
    }
    if (candidate === null || typeof candidate === 'string' || typeof candidate === 'boolean') {
      return candidate;
    }
    if (typeof candidate === 'number') {
      if (!Number.isFinite(candidate)) throw new RangeError(`${name} 包含非有限数。`);
      return candidate;
    }
    if (typeof candidate !== 'object') {
      throw new TypeError(`${name} 只能包含 JSON data。`);
    }
    if (state.active.has(candidate)) throw new TypeError(`${name} 不能包含 cycle。`);
    state.active.add(candidate);
    try {
      if (Array.isArray(candidate)) {
        const lengthDescriptor = Object.getOwnPropertyDescriptor(candidate, 'length');
        if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, 'value')
          || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) {
          throw new TypeError(`${name} array length 非法。`);
        }
        const length = lengthDescriptor.value as number;
        const keys = Reflect.ownKeys(candidate);
        if (keys.length !== length + 1 || !keys.includes('length')) {
          throw new TypeError(`${name} array 不能 sparse 或包含额外字段。`);
        }
        const result: unknown[] = [];
        for (let index = 0; index < length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(candidate, String(index));
          if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
            throw new TypeError(`${name} array 只能包含连续数据索引。`);
          }
          result.push(visit(descriptor.value, depth + 1));
        }
        return Object.freeze(result);
      }
      const prototype = Object.getPrototypeOf(candidate);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError(`${name} object 必须是 plain record。`);
      }
      const result: Record<string, unknown> = {};
      for (const key of Reflect.ownKeys(candidate)) {
        if (typeof key !== 'string') throw new TypeError(`${name} 不接受 Symbol 字段。`);
        if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
          throw new TypeError(`${name} 包含不安全字段。`);
        }
        const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
        if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
          throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
        }
        result[key] = visit(descriptor.value, depth + 1);
      }
      return Object.freeze(result);
    } finally {
      state.active.delete(candidate);
    }
  };
  return visit(value, 0);
}

function exactRecord(
  value: unknown,
  expectedKeys: readonly string[],
  name: string,
): Readonly<Record<string, unknown>> {
  const cloned = cloneArenaPa6StrictDataV1(value, name);
  if (cloned === null || typeof cloned !== 'object' || Array.isArray(cloned)) {
    throw new TypeError(`${name} 必须是 record。`);
  }
  const keys = Object.keys(cloned).sort();
  const expected = [...expectedKeys].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${name} 字段集合不精确。`);
  }
  return cloned as Readonly<Record<string, unknown>>;
}

function safeInteger(value: unknown, name: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是 >=${minimum} 的安全整数。`);
  }
  return value as number;
}

function finite(value: unknown, name: string, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    throw new RangeError(`${name} 必须是 >=${minimum} 的有限数。`);
  }
  return value;
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

export interface ArenaPa6SourceIdentityV1 {
  readonly head: string;
  readonly dirty: boolean;
  readonly fingerprint: string;
}

function runGitBuffer(cwd: string, args: readonly string[]): Buffer<ArrayBufferLike> {
  return execFileSync('git', [...args], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function readGitHead(cwd: string): string {
  const raw = runGitBuffer(cwd, ['rev-parse', '--verify', 'HEAD']);
  const head = raw.toString('ascii').replace(/[\r\n]+$/, '');
  if (!/^[0-9a-f]{40}$/.test(head)) throw new Error('PA6 source HEAD 非法。');
  return head;
}

function readCanonicalRepositoryRoot(cwd: string): string {
  const canonicalCwd = realpathSync.native(cwd);
  const raw = runGitBuffer(canonicalCwd, ['rev-parse', '--show-toplevel']);
  if (raw.length < 2 || raw[raw.length - 1] !== 0x0a || raw.includes(0)) {
    throw new Error('PA6 repository root 输出非法。');
  }
  const withoutLf = raw.subarray(0, raw.length - 1);
  const rootBytes = withoutLf[withoutLf.length - 1] === 0x0d
    ? withoutLf.subarray(0, withoutLf.length - 1)
    : withoutLf;
  if (rootBytes.length === 0 || rootBytes.includes(0x0a) || rootBytes.includes(0x0d)) {
    throw new Error('PA6 repository root 包含不安全分隔符。');
  }
  const canonicalGitRoot = realpathSync.native(rootBytes);
  if (canonicalGitRoot !== canonicalCwd) {
    throw new Error('PA6 source identity 必须从 repository root 读取。');
  }
  return canonicalGitRoot;
}

function splitNulPaths(raw: Buffer<ArrayBufferLike>, name: string): readonly Buffer[] {
  if (raw.length === 0) return Object.freeze([]);
  if (raw[raw.length - 1] !== 0) throw new Error(`${name} 缺少 NUL 终止符。`);
  const result: Buffer[] = [];
  let start = 0;
  for (let index = 0; index < raw.length; index += 1) {
    if (raw[index] !== 0) continue;
    if (index === start) throw new Error(`${name} 包含空路径。`);
    result.push(Buffer.from(raw.subarray(start, index)));
    start = index + 1;
  }
  return Object.freeze(result);
}

function assertSafeRelativeGitPath(value: Buffer): void {
  if (value.length === 0 || value[0] === 0x2f || value.includes(0)) {
    throw new Error('PA6 repository path 非法。');
  }
  let start = 0;
  for (let index = 0; index <= value.length; index += 1) {
    if (index < value.length && value[index] !== 0x2f) continue;
    const component = value.subarray(start, index);
    if (component.length === 0) throw new Error('PA6 repository path 包含空组件。');
    if (component.equals(Buffer.from('.')) || component.equals(Buffer.from('..'))) {
      throw new Error('PA6 repository path 不得逃逸 root。');
    }
    start = index + 1;
  }
}

function updateFingerprintFrame(hash: Hash, label: string, value: Buffer | string): void {
  const labelBytes = Buffer.from(label, 'utf8');
  const valueBytes = typeof value === 'string' ? Buffer.from(value, 'utf8') : value;
  const length = Buffer.allocUnsafe(8);
  length.writeBigUInt64BE(BigInt(valueBytes.length));
  hash.update(labelBytes);
  hash.update(Buffer.from([0]));
  hash.update(length);
  hash.update(valueBytes);
}

function sameStat(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function absoluteBuffer(root: Buffer, relative: Buffer): Buffer {
  return Buffer.concat([root, Buffer.from('/'), relative]);
}

function parentBuffer(root: Buffer, relative: Buffer): Buffer {
  const separator = relative.lastIndexOf(0x2f);
  return separator === -1
    ? root
    : absoluteBuffer(root, relative.subarray(0, separator));
}

function assertSafeCanonicalParent(root: Buffer, relative: Buffer): Buffer {
  const lexicalParent = parentBuffer(root, relative);
  const canonicalParent = realpathSync.native(lexicalParent, { encoding: 'buffer' });
  if (!canonicalParent.equals(lexicalParent)) {
    throw new Error('PA6 repository path parent 包含 symlink 或逃逸。');
  }
  return canonicalParent;
}

function readPathFingerprint(
  hash: Hash,
  root: Buffer,
  relative: Buffer,
): void {
  assertSafeRelativeGitPath(relative);
  updateFingerprintFrame(hash, 'path', relative);
  const absolute = absoluteBuffer(root, relative);
  let before: BigIntStats;
  try {
    before = lstatSync(absolute, { bigint: true });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      updateFingerprintFrame(hash, 'kind', 'missing');
      return;
    }
    throw error;
  }
  const canonicalParent = assertSafeCanonicalParent(root, relative);
  updateFingerprintFrame(hash, 'mode', before.mode.toString(16));
  if (before.isSymbolicLink()) {
    const target = readlinkSync(absolute, { encoding: 'buffer' });
    const after = lstatSync(absolute, { bigint: true });
    if (!sameStat(before, after)
      || !assertSafeCanonicalParent(root, relative).equals(canonicalParent)) {
      throw new Error('PA6 symlink 读取期间漂移。');
    }
    updateFingerprintFrame(hash, 'kind', 'symlink');
    updateFingerprintFrame(hash, 'target', target);
    return;
  }
  if (!before.isFile()) throw new Error('PA6 repository source 只允许普通文件或 symlink。');
  const descriptor = openSync(absolute, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  let content: Buffer<ArrayBufferLike>;
  try {
    const openedBefore = fstatSync(descriptor, { bigint: true });
    if (!openedBefore.isFile() || !sameStat(before, openedBefore)) {
      throw new Error('PA6 regular file open identity 漂移。');
    }
    content = readFileSync(descriptor);
    const openedAfter = fstatSync(descriptor, { bigint: true });
    if (!sameStat(openedBefore, openedAfter)) {
      throw new Error('PA6 regular file 读取期间漂移。');
    }
  } finally {
    closeSync(descriptor);
  }
  const after = lstatSync(absolute, { bigint: true });
  if (!sameStat(before, after)
    || !assertSafeCanonicalParent(root, relative).equals(canonicalParent)) {
    throw new Error('PA6 regular file path 读取期间漂移。');
  }
  updateFingerprintFrame(hash, 'kind', 'regular');
  updateFingerprintFrame(hash, 'size', before.size.toString(10));
  updateFingerprintFrame(hash, 'content', createHash('sha256').update(content).digest());
}

type ArenaPa6RepositorySnapshotV1 = ArenaPa6SourceIdentityV1;

function readArenaPa6RepositorySnapshotOnceV1(cwd: string): ArenaPa6RepositorySnapshotV1 {
  const canonicalRoot = readCanonicalRepositoryRoot(cwd);
  const rootBuffer = Buffer.from(canonicalRoot);
  const head = readGitHead(canonicalRoot);
  const headPathsRaw = runGitBuffer(canonicalRoot, [
    'ls-tree', '-r', '-z', '--name-only', head,
  ]);
  const indexPathsRaw = runGitBuffer(canonicalRoot, ['ls-files', '-z', '--cached']);
  const indexStageRaw = runGitBuffer(canonicalRoot, ['ls-files', '-z', '--stage']);
  const untrackedPathsRaw = runGitBuffer(canonicalRoot, [
    'ls-files', '-z', '--others', '--exclude-standard',
  ]);
  const statusRaw = runGitBuffer(canonicalRoot, [
    'status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignored=no',
  ]);
  const paths = new Map<string, { readonly path: Buffer; tracked: boolean; untracked: boolean }>();
  const add = (pathValue: Buffer, category: 'tracked' | 'untracked'): void => {
    assertSafeRelativeGitPath(pathValue);
    const key = pathValue.toString('hex');
    const existing = paths.get(key);
    if (existing === undefined) {
      paths.set(key, {
        path: Buffer.from(pathValue),
        tracked: category === 'tracked',
        untracked: category === 'untracked',
      });
      return;
    }
    if (category === 'tracked') existing.tracked = true;
    else existing.untracked = true;
  };
  for (const pathValue of splitNulPaths(headPathsRaw, 'PA6 HEAD paths')) add(pathValue, 'tracked');
  for (const pathValue of splitNulPaths(indexPathsRaw, 'PA6 index paths')) add(pathValue, 'tracked');
  for (const pathValue of splitNulPaths(untrackedPathsRaw, 'PA6 untracked paths')) add(pathValue, 'untracked');
  const hash = createHash('sha256');
  updateFingerprintFrame(hash, 'schema', 'arena.pa6.repository-worktree-fingerprint.v1');
  updateFingerprintFrame(hash, 'head', head);
  updateFingerprintFrame(hash, 'index-stage', indexStageRaw);
  updateFingerprintFrame(hash, 'status', statusRaw);
  const orderedPaths = [...paths.values()].sort((left, right) => Buffer.compare(left.path, right.path));
  for (const entry of orderedPaths) {
    updateFingerprintFrame(hash, 'category', `${entry.tracked ? 'tracked' : ''}:${entry.untracked ? 'untracked' : ''}`);
    readPathFingerprint(hash, rootBuffer, entry.path);
  }
  return Object.freeze({
    head,
    dirty: statusRaw.length > 0,
    fingerprint: hash.digest('hex'),
  });
}

export function assertArenaPa6SourceIdentityEqualV1(
  actual: ArenaPa6SourceIdentityV1,
  expected: ArenaPa6SourceIdentityV1,
  name: string,
): void {
  if (actual.head !== expected.head
    || actual.dirty !== expected.dirty
    || actual.fingerprint !== expected.fingerprint) {
    throw new Error(`${name} source identity 漂移。`);
  }
}

export function readArenaPa6SourceIdentityV1(cwd = process.cwd()): ArenaPa6SourceIdentityV1 {
  const first = readArenaPa6RepositorySnapshotOnceV1(cwd);
  const second = readArenaPa6RepositorySnapshotOnceV1(cwd);
  assertArenaPa6SourceIdentityEqualV1(second, first, 'PA6 repository 双读');
  if (!/^[0-9a-f]{64}$/.test(first.fingerprint)) {
    throw new Error('PA6 source fingerprint 非法。');
  }
  return first;
}

function validatedArenaPa6SourceIdentityV1(
  value: unknown,
  name: string,
): ArenaPa6SourceIdentityV1 {
  const record = exactRecord(value, ['head', 'dirty', 'fingerprint'], name);
  if (typeof record.head !== 'string' || !/^[0-9a-f]{40}$/.test(record.head)) {
    throw new Error(`${name}.head 非法。`);
  }
  if (typeof record.dirty !== 'boolean') throw new TypeError(`${name}.dirty 必须是 boolean。`);
  if (typeof record.fingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(record.fingerprint)) {
    throw new Error(`${name}.fingerprint 非法。`);
  }
  return Object.freeze({
    head: record.head,
    dirty: record.dirty,
    fingerprint: record.fingerprint,
  });
}

export type ArenaPa6SourceIdentityReaderV1 = (cwd?: string) => ArenaPa6SourceIdentityV1;

export async function runArenaPa6StableSourceWindowV1<T>(options: {
  readonly expectedSource: ArenaPa6SourceIdentityV1;
  readonly cwd?: string | undefined;
  readonly name: string;
  readonly operation: () => T | Promise<T>;
  readonly readSourceIdentity?: ArenaPa6SourceIdentityReaderV1 | undefined;
}): Promise<T> {
  const expected = validatedArenaPa6SourceIdentityV1(
    options.expectedSource,
    `${options.name} expected source`,
  );
  const reader = options.readSourceIdentity ?? readArenaPa6SourceIdentityV1;
  const before = reader(options.cwd);
  assertArenaPa6SourceIdentityEqualV1(before, expected, `${options.name} 前置`);

  let result: T | undefined;
  let operationFailed = false;
  let operationFailure: unknown;
  try {
    result = await options.operation();
  } catch (error: unknown) {
    operationFailed = true;
    operationFailure = error;
  }

  let sourceFailed = false;
  let sourceFailure: unknown;
  try {
    const after = reader(options.cwd);
    assertArenaPa6SourceIdentityEqualV1(after, expected, `${options.name} 后置`);
  } catch (error: unknown) {
    sourceFailed = true;
    sourceFailure = error;
  }
  if (operationFailed && sourceFailed) {
    throw new AggregateError(
      [operationFailure, sourceFailure],
      `${options.name} 执行与 source 后置校验同时失败。`,
    );
  }
  if (sourceFailed) throw sourceFailure;
  if (operationFailed) throw operationFailure;
  return result as T;
}

export interface ArenaPa6EnvironmentV1 {
  readonly node: string;
  readonly platform: NodeJS.Platform;
  readonly arch: string;
  readonly release: string;
  readonly cpuModel: string;
  readonly logicalCpuCount: number;
  readonly totalMemoryBytes: number;
}

export function readArenaPa6EnvironmentV1(): ArenaPa6EnvironmentV1 {
  const cpus = os.cpus();
  return Object.freeze({
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    release: os.release(),
    cpuModel: cpus[0]?.model ?? 'unknown',
    logicalCpuCount: cpus.length,
    totalMemoryBytes: os.totalmem(),
  });
}

export interface ArenaPa6PlanV1 {
  readonly schemaVersion: typeof ARENA_PA6_ABBA_SCHEMA_VERSION;
  readonly groupCount: number;
  readonly hardLimitTicks: 2_500;
  readonly caseCount: 20;
  readonly caseSetIdentity: string;
  readonly scheduleIdentity: string;
  readonly planIdentity: string;
  readonly variants: typeof ARENA_PA6_READ_STEP_VARIANTS_V1;
  readonly cases: typeof ARENA_PA6_READ_STEP_CASES_V1;
  readonly schedule: typeof ARENA_PA6_READ_STEP_ABBA_SCHEDULE_V1;
}

export function createArenaPa6PlanV1(groupCount: number): ArenaPa6PlanV1 {
  safeInteger(groupCount, 'PA6 groupCount', ARENA_PA6_ABBA_MINIMUM_GROUPS);
  assertArenaPa6FixedCasesV1(ARENA_PA6_READ_STEP_CASES_V1);
  assertArenaPa6AbbaScheduleV1(ARENA_PA6_READ_STEP_ABBA_SCHEDULE_V1);
  const caseSetIdentity = createDeterministicDataHash(
    ARENA_PA6_READ_STEP_CASES_V1,
    'PA6 fixed case set',
  );
  const scheduleIdentity = createDeterministicDataHash(
    ARENA_PA6_READ_STEP_ABBA_SCHEDULE_V1,
    'PA6 fixed ABBA schedule',
  );
  const identitySource = Object.freeze({
    schemaVersion: ARENA_PA6_ABBA_SCHEMA_VERSION,
    groupCount,
    hardLimitTicks: ARENA_PA6_READ_STEP_HARD_LIMIT_TICKS,
    cases: ARENA_PA6_READ_STEP_CASES_V1,
    variants: ARENA_PA6_READ_STEP_VARIANTS_V1,
    schedule: ARENA_PA6_READ_STEP_ABBA_SCHEDULE_V1,
  });
  return Object.freeze({
    schemaVersion: ARENA_PA6_ABBA_SCHEMA_VERSION,
    groupCount,
    hardLimitTicks: ARENA_PA6_READ_STEP_HARD_LIMIT_TICKS,
    caseCount: 20,
    caseSetIdentity,
    scheduleIdentity,
    planIdentity: createDeterministicDataHash(identitySource, 'PA6 ABBA plan'),
    variants: ARENA_PA6_READ_STEP_VARIANTS_V1,
    cases: ARENA_PA6_READ_STEP_CASES_V1,
    schedule: ARENA_PA6_READ_STEP_ABBA_SCHEDULE_V1,
  });
}

export interface ArenaPa6RawRoundV1 {
  readonly comparisonId: string;
  readonly sequence: ArenaPa6ReadStepScheduledRoundV1['sequence'];
  readonly variantId: ArenaPa6ReadStepVariantId;
  readonly measurement: ArenaPa6FormalRoundV1;
}

export interface ArenaPa6PercentilesV1 {
  readonly sampleCount: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
}

export type ArenaPa6FormalRoundV1 = ArenaPa6FormalReadStepRoundV2;

export interface ArenaPa6GroupResultV1 {
  readonly schemaVersion: typeof ARENA_PA6_ABBA_SCHEMA_VERSION;
  readonly groupIndex: number;
  readonly planIdentity: string;
  readonly source: ArenaPa6SourceIdentityV1;
  readonly environment: ArenaPa6EnvironmentV1;
  readonly warmup: Readonly<{
    readonly variants: readonly ArenaPa6ReadStepVariantId[];
    readonly sampleCount: 0;
    readonly parityIdentity: string;
    readonly denominatorTicks: number;
  }>;
  readonly rawRounds: readonly ArenaPa6RawRoundV1[];
  readonly gates: Readonly<{
    readonly inclusiveP95Passed: boolean;
    readonly recoveryMicros: number;
    readonly recoveryPassed: boolean;
    readonly processCpuSameDirection: boolean;
    readonly passed: boolean;
  }>;
}

const ARENA_PA6_PROGRESS_SCHEMA_VERSION = 1 as const;

type ArenaPa6ProgressPhaseV1 =
  | 'group-start'
  | 'start-worker'
  | 'warmup'
  | 'measure'
  | 'shutdown-worker'
  | 'comparison-complete'
  | 'group-complete';

type ArenaPa6ProgressWorkerRoleV1 = 'A' | 'B' | null;

type ArenaPa6ProgressSequenceV1 = ArenaPa6ReadStepScheduledRoundV1['sequence'] | null;

interface ArenaPa6ProgressV1 {
  readonly schemaVersion: typeof ARENA_PA6_PROGRESS_SCHEMA_VERSION;
  readonly runToken: string;
  readonly groupIndex: number;
  readonly phase: ArenaPa6ProgressPhaseV1;
  readonly comparisonId: string | null;
  readonly workerRole: ArenaPa6ProgressWorkerRoleV1;
  readonly variantId: ArenaPa6ReadStepVariantId | null;
  readonly sequence: ArenaPa6ProgressSequenceV1;
  readonly completedComparisonIds: readonly string[];
  readonly completedRoundCount: number;
}

function assertArenaPa6ProgressStateV1(progress: ArenaPa6ProgressV1): void {
  const comparisons = ARENA_PA6_READ_STEP_ABBA_COMPARISONS_V1;
  const schedule = ARENA_PA6_READ_STEP_ABBA_SCHEDULE_V1;
  const completedComparisonIds = progress.completedComparisonIds;
  const assertCommonFields = (comparisonIndex: number, expectedRoundCount: number): void => {
    if (completedComparisonIds.length !== comparisonIndex
      || completedComparisonIds.some((id, index) => id !== comparisons[index]!.id)
      || progress.completedRoundCount !== expectedRoundCount) {
      throw new Error('PA6 progress completed state 漂移。');
    }
  };
  if (progress.phase === 'group-start') {
    if (progress.comparisonId !== null || progress.workerRole !== null
      || progress.variantId !== null || progress.sequence !== null
      || completedComparisonIds.length !== 0 || progress.completedRoundCount !== 0) {
      throw new Error('PA6 progress group-start 状态非法。');
    }
    return;
  }
  if (progress.phase === 'group-complete') {
    if (progress.comparisonId !== null || progress.workerRole !== null
      || progress.variantId !== null || progress.sequence !== null
      || completedComparisonIds.length !== comparisons.length
      || completedComparisonIds.some((id, index) => id !== comparisons[index]!.id)
      || progress.completedRoundCount !== schedule.length) {
      throw new Error('PA6 progress group-complete 状态非法。');
    }
    return;
  }
  if (progress.comparisonId === null) throw new Error('PA6 progress comparisonId 缺失。');
  const comparisonIndex = comparisons.findIndex(({ id }) => id === progress.comparisonId);
  if (comparisonIndex < 0) throw new Error('PA6 progress comparisonId 非法。');
  const comparison = comparisons[comparisonIndex]!;
  if (progress.phase === 'start-worker' || progress.phase === 'warmup') {
    assertCommonFields(comparisonIndex, comparisonIndex * 4);
    const expectedVariant = progress.workerRole === 'A' ? comparison.a
      : progress.workerRole === 'B' ? comparison.b : null;
    if (expectedVariant === null || progress.variantId !== expectedVariant
      || progress.sequence !== null) {
      throw new Error('PA6 progress worker 状态非法。');
    }
    return;
  }
  if (progress.phase === 'measure') {
    if (progress.sequence === null) throw new Error('PA6 progress measure sequence 缺失。');
    const sequenceIndex = ['A1', 'B1', 'B2', 'A2'].indexOf(progress.sequence);
    if (sequenceIndex < 0) throw new Error('PA6 progress measure sequence 非法。');
    const scheduled = schedule[comparisonIndex * 4 + sequenceIndex]!;
    assertCommonFields(comparisonIndex, comparisonIndex * 4 + sequenceIndex);
    const expectedRole = progress.sequence === 'A1' || progress.sequence === 'A2' ? 'A' : 'B';
    if (progress.workerRole !== expectedRole || progress.variantId !== scheduled.variantId) {
      throw new Error('PA6 progress measure 状态非法。');
    }
    return;
  }
  if (progress.phase === 'shutdown-worker') {
    if (progress.completedRoundCount !== (comparisonIndex + 1) * 4
      || completedComparisonIds.length !== comparisonIndex
      || completedComparisonIds.some((id, index) => id !== comparisons[index]!.id)
      || progress.sequence !== null) {
      throw new Error('PA6 progress shutdown 状态非法。');
    }
    const expectedVariant = progress.workerRole === 'A' ? comparison.a
      : progress.workerRole === 'B' ? comparison.b : null;
    if (expectedVariant === null || progress.variantId !== expectedVariant) {
      throw new Error('PA6 progress shutdown worker 非法。');
    }
    return;
  }
  if (progress.phase === 'comparison-complete') {
    if (progress.workerRole !== null || progress.variantId !== null || progress.sequence !== null
      || completedComparisonIds.length !== comparisonIndex + 1
      || completedComparisonIds.some((id, index) => id !== comparisons[index]!.id)
      || progress.completedRoundCount !== (comparisonIndex + 1) * 4) {
      throw new Error('PA6 progress comparison-complete 状态非法。');
    }
    return;
  }
  throw new Error('PA6 progress phase 状态非法。');
}

function arenaPa6ProgressOrderV1(progress: ArenaPa6ProgressV1): number {
  const comparisonIndex = progress.phase === 'group-start' ? -1
    : progress.phase === 'group-complete'
      ? ARENA_PA6_READ_STEP_ABBA_COMPARISONS_V1.length
      : ARENA_PA6_READ_STEP_ABBA_COMPARISONS_V1.findIndex(
        ({ id }) => id === progress.comparisonId,
      );
  const phaseRank = progress.phase === 'group-start' ? 0
    : progress.phase === 'start-worker' ? progress.workerRole === 'A' ? 1 : 2
      : progress.phase === 'warmup' ? progress.workerRole === 'A' ? 3 : 4
        : progress.phase === 'measure' ? ({ A1: 5, B1: 6, B2: 7, A2: 8 } as const)[progress.sequence!]
          : progress.phase === 'shutdown-worker' ? progress.workerRole === 'B' ? 9 : 10
            : progress.phase === 'comparison-complete' ? 11 : 0;
  return progress.completedRoundCount * 1_000 + (comparisonIndex + 1) * 100 + phaseRank;
}

function assertArenaPa6ProgressV1(value: unknown): asserts value is ArenaPa6ProgressV1 {
  const record = exactRecord(value, [
    'schemaVersion', 'runToken', 'groupIndex', 'phase', 'comparisonId', 'workerRole',
    'variantId', 'sequence', 'completedComparisonIds', 'completedRoundCount',
  ], 'PA6 progress');
  if (record.schemaVersion !== ARENA_PA6_PROGRESS_SCHEMA_VERSION) {
    throw new Error('PA6 progress schema 漂移。');
  }
  nonEmptyString(record.runToken, 'PA6 progress runToken');
  safeInteger(record.groupIndex, 'PA6 progress groupIndex');
  if (![
    'group-start', 'start-worker', 'warmup', 'measure', 'shutdown-worker',
    'comparison-complete', 'group-complete',
  ].includes(record.phase as string)) {
    throw new Error('PA6 progress phase 非法。');
  }
  if (record.comparisonId !== null) nonEmptyString(record.comparisonId, 'PA6 progress comparisonId');
  if (record.workerRole !== null && record.workerRole !== 'A' && record.workerRole !== 'B') {
    throw new Error('PA6 progress workerRole 非法。');
  }
  if (record.variantId !== null) requireArenaPa6ReadStepVariantV1(record.variantId);
  if (record.sequence !== null && !['A1', 'B1', 'B2', 'A2'].includes(record.sequence as string)) {
    throw new Error('PA6 progress sequence 非法。');
  }
  if (!Array.isArray(record.completedComparisonIds)
    || record.completedComparisonIds.some((id) => typeof id !== 'string' || id.length === 0)) {
    throw new Error('PA6 progress completedComparisonIds 非法。');
  }
  safeInteger(record.completedRoundCount, 'PA6 progress completedRoundCount');
  assertArenaPa6ProgressStateV1(record as unknown as ArenaPa6ProgressV1);
}

async function writeArenaPa6ProgressAtomicV1(
  progressPath: string | undefined,
  progress: ArenaPa6ProgressV1,
): Promise<void> {
  if (progressPath === undefined) return;
  if (!path.isAbsolute(progressPath)) throw new TypeError('PA6 progress file 必须是绝对路径。');
  assertArenaPa6ProgressV1(progress);
  const temporary = `${progressPath}.tmp`;
  const payload = `${JSON.stringify(cloneArenaPa6StrictDataV1(progress, 'PA6 progress'))}\n`;
  let handle: Awaited<ReturnType<typeof open>> | null = null;
  try {
    handle = await open(temporary, 'wx', 0o600);
    await handle.writeFile(payload, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temporary, progressPath);
  } finally {
    if (handle !== null) await handle.close().catch(() => undefined);
    await unlink(temporary).catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    });
  }
}

function readArenaPa6ProgressBestEffortV1(
  progressPath: string | undefined,
  expectedGroupIndex?: number,
  expectedRunToken?: string,
): ArenaPa6ProgressV1 | null {
  if (progressPath === undefined) return null;
  try {
    const stats = lstatSync(progressPath);
    if (!stats.isFile() || stats.size > 64 * 1024) return null;
    const parsed = JSON.parse(readFileSync(progressPath, 'utf8')) as unknown;
    assertArenaPa6ProgressV1(parsed);
    if (expectedGroupIndex !== undefined && parsed.groupIndex !== expectedGroupIndex) return null;
    if (expectedRunToken !== undefined && parsed.runToken !== expectedRunToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

interface ArenaPa6GateRoundV1 {
  readonly comparisonId: string;
  readonly variantId: ArenaPa6ReadStepVariantId;
  readonly inclusiveP95Micros: number;
  readonly processCpuMicrosPerTick: number;
}

function calculateArenaPa6GroupGatesV1(
  rounds: readonly ArenaPa6GateRoundV1[],
): ArenaPa6GroupResultV1['gates'] {
  const combined = rounds.filter((round) => (
    round.comparisonId === 'combined'
      && round.variantId === ARENA_PA6_READ_STEP_VARIANT.C_B_D
  ));
  const baseline = rounds.filter((round) => (
    round.comparisonId === 'combined'
      && round.variantId === ARENA_PA6_READ_STEP_VARIANT.B_ONLY
  ));
  if (combined.length !== 2 || baseline.length !== 2) {
    throw new Error('PA6 combined ABBA pair 数量漂移。');
  }
  const candidateP95 = Math.max(...combined.map(({ inclusiveP95Micros }) => (
    inclusiveP95Micros
  )));
  const recoveryMicros = Math.min(...baseline.map(({ inclusiveP95Micros }, index) => (
    inclusiveP95Micros - combined[index]!.inclusiveP95Micros
  )));
  if (!Number.isFinite(recoveryMicros)) throw new RangeError('PA6 recovery 非有限。');
  const inclusiveP95Passed = candidateP95 <= ARENA_PA6_ABBA_INCLUSIVE_P95_LIMIT_MICROS;
  const recoveryPassed = recoveryMicros >= ARENA_PA6_ABBA_MINIMUM_RECOVERY_MICROS;
  const processCpuSameDirection = baseline.every(({ processCpuMicrosPerTick }, index) => (
    combined[index]!.processCpuMicrosPerTick < processCpuMicrosPerTick
  ));
  return Object.freeze({
    inclusiveP95Passed,
    recoveryMicros,
    recoveryPassed,
    processCpuSameDirection,
    passed: inclusiveP95Passed && recoveryPassed && processCpuSameDirection,
  });
}

const ARENA_PA6_EXPECTED_SOURCE_ENV_V2 = 'ARENA_PA6_EXPECTED_SOURCE_V2';
const ARENA_PA6_VARIANT_WORKER_SCHEMA_VERSION = 2 as const;

export interface ArenaPa6VariantWorkerClientV2 {
  readonly variantId: ArenaPa6ReadStepVariantId;
  readonly attestation: ArenaPa6LoaderAttestationV2;
  readonly request: (
    type: 'warmup' | 'measure' | 'probe-read-model' | 'probe-resolver',
  ) => Promise<unknown>;
  readonly shutdown: (expected: {
    readonly warmupCompleted: boolean;
    readonly measurementCount: number;
  }) => Promise<void>;
  readonly terminate: () => Promise<void>;
}

function terminateArenaPa6ChildV2(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    let forceTimer: NodeJS.Timeout | null = null;
    const finish = (): void => {
      if (forceTimer !== null) clearTimeout(forceTimer);
      resolve();
    };
    child.once('close', finish);
    child.kill('SIGTERM');
    forceTimer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }, 1_000);
    forceTimer.unref();
  });
}

export async function startArenaPa6VariantWorkerV2(options: {
  readonly cwd: string;
  readonly variantId: ArenaPa6ReadStepVariantId;
  readonly expectedSource: ArenaPa6SourceIdentityV1;
  readonly timeoutMs: number;
  readonly outputCapBytes: number;
  readonly workerEntryPath?: string | undefined;
  readonly registerPath?: string | undefined;
}): Promise<ArenaPa6VariantWorkerClientV2> {
  const timeoutMs = safeInteger(options.timeoutMs, 'PA6 variant timeoutMs', 1);
  const outputCapBytes = safeInteger(options.outputCapBytes, 'PA6 variant output cap', 1);
  const config = createArenaPa6LoaderConfigV2({
    repositoryRoot: options.cwd,
    sourceFingerprint: options.expectedSource.fingerprint,
    variantId: options.variantId,
  });
  const workerEntryPath = options.workerEntryPath
    ?? path.join(options.cwd, 'scripts/arena-pa6-read-step-variant-worker.ts');
  const registerPath = options.registerPath
    ?? path.join(options.cwd, 'scripts/lib/arena-pa6-source-transform-register-v2.ts');
  const child = spawn(process.execPath, [
    '--expose-gc',
    '--import',
    'tsx',
    '--import',
    pathToFileURL(registerPath).href,
    workerEntryPath,
    '--ipc-worker',
  ], {
    cwd: options.cwd,
    env: {
      ...process.env,
      [ARENA_PA6_LOADER_CONFIG_ENV_V2]: JSON.stringify(config),
      [ARENA_PA6_EXPECTED_SOURCE_ENV_V2]: JSON.stringify(options.expectedSource),
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  if (child.stdout === null || child.stderr === null || child.channel === null) {
    await terminateArenaPa6ChildV2(child);
    throw new Error('PA6 variant worker stdio/IPC channel 创建失败。');
  }
  let protocolBytes = 0;
  let readySettled = false;
  let terminalFailure: Error | null = null;
  let pending: Readonly<{
    requestId: number;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }> | null = null;
  let nextRequestId = 1;
  let shutdownRequested = false;
  let closeResolve: ((value: {
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }) => void) | null = null;
  const closePromise = new Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>((resolve) => {
    closeResolve = resolve;
  });
  let readyResolve: ((value: ArenaPa6LoaderAttestationV2) => void) | null = null;
  let readyReject: ((error: Error) => void) | null = null;
  const readyPromise = new Promise<ArenaPa6LoaderAttestationV2>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  const fail = (error: Error): void => {
    if (terminalFailure !== null) return;
    terminalFailure = error;
    if (!readySettled) {
      readySettled = true;
      readyReject?.(error);
    }
    if (pending !== null) {
      clearTimeout(pending.timer);
      pending.reject(error);
      pending = null;
    }
    void terminateArenaPa6ChildV2(child);
  };
  const accountProtocolValue = (value: unknown): unknown => {
    const cloned = cloneArenaPa6StrictDataV1(value, 'PA6 worker IPC message');
    protocolBytes += Buffer.byteLength(JSON.stringify(cloned), 'utf8');
    if (protocolBytes > outputCapBytes) {
      throw new RangeError('PA6 worker IPC 超出输出上限。');
    }
    return cloned;
  };
  const rejectStream = (name: 'stdout' | 'stderr', chunk: Buffer): void => {
    protocolBytes += chunk.length;
    if (protocolBytes > outputCapBytes) {
      fail(new RangeError(`PA6 worker ${name} 超出输出上限。`));
      return;
    }
    fail(new Error(`PA6 worker ${name} 必须为空。`));
  };
  child.stdout.on('data', (chunk: Buffer) => rejectStream('stdout', chunk));
  child.stderr.on('data', (chunk: Buffer) => rejectStream('stderr', chunk));
  child.on('error', (error) => fail(error));
  child.on('message', (value: unknown) => {
    try {
      const safe = accountProtocolValue(value);
      const record = exactRecord(
        safe,
        readySettled
          ? (Object.getOwnPropertyDescriptor(safe as object, 'type')?.value === 'failed'
            ? ['schemaVersion', 'type', 'requestId', 'error']
            : ['schemaVersion', 'type', 'requestId', 'result'])
          : ['schemaVersion', 'type', 'variantId', 'source', 'loaderAttestation'],
        'PA6 worker IPC response',
      );
      if (!readySettled) {
        if (record.schemaVersion !== ARENA_PA6_VARIANT_WORKER_SCHEMA_VERSION
          || record.type !== 'ready' || record.variantId !== options.variantId) {
          throw new Error('PA6 worker ready identity 漂移。');
        }
        const source = validatedArenaPa6SourceIdentityV1(record.source, 'PA6 worker ready source');
        assertArenaPa6SourceIdentityEqualV1(source, options.expectedSource, 'PA6 worker ready');
        const attestation = validateArenaPa6LoaderAttestationV2(
          record.loaderAttestation,
          config,
        );
        readySettled = true;
        readyResolve?.(attestation);
        return;
      }
      if (pending === null) throw new Error('PA6 worker 返回 unsolicited response。');
      if (record.schemaVersion !== ARENA_PA6_VARIANT_WORKER_SCHEMA_VERSION
        || record.requestId !== pending.requestId) {
        throw new Error('PA6 worker response identity 漂移。');
      }
      const active = pending;
      pending = null;
      clearTimeout(active.timer);
      if (record.type === 'failed') {
        throw new Error(`PA6 worker failed: ${nonEmptyString(record.error, 'PA6 worker error')}`);
      }
      if (record.type !== 'result') throw new Error('PA6 worker response type 非法。');
      active.resolve(record.result);
    } catch (error: unknown) {
      fail(error instanceof Error ? error : new Error('PA6 worker IPC validation failure。'));
    }
  });
  child.on('close', (code, signal) => {
    closeResolve?.(Object.freeze({ code, signal }));
    if (terminalFailure !== null) {
      return;
    }
    if (!shutdownRequested || code !== 0 || signal !== null) {
      const error = new Error('PA6 worker 非正常或提前退出。');
      fail(error);
    }
  });
  const readyTimer = setTimeout(() => fail(new Error('PA6 worker ready timeout。')), timeoutMs);
  readyTimer.unref();
  let attestation: ArenaPa6LoaderAttestationV2;
  try {
    attestation = await readyPromise;
  } catch (startupFailure: unknown) {
    let cleanupFailure: unknown | null = null;
    try {
      await terminateArenaPa6ChildV2(child);
      await closePromise;
    } catch (error: unknown) {
      cleanupFailure = error;
    }
    if (cleanupFailure !== null) {
      throw new AggregateError(
        [startupFailure, cleanupFailure],
        'PA6 worker startup 与 cleanup 同时失败。',
      );
    }
    throw startupFailure;
  } finally {
    clearTimeout(readyTimer);
  }
  const requestRaw = (type: ArenaPa6WorkerRequestV2['type']): Promise<unknown> => {
    if (terminalFailure !== null) return Promise.reject(terminalFailure);
    if (pending !== null || shutdownRequested) {
      return Promise.reject(new Error('PA6 worker request lifecycle 非法。'));
    }
    const requestId = nextRequestId;
    nextRequestId += 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => fail(new Error(`PA6 worker ${type} timeout。`)), timeoutMs);
      timer.unref();
      pending = Object.freeze({ requestId, resolve, reject, timer });
      child.send(Object.freeze({
        schemaVersion: ARENA_PA6_VARIANT_WORKER_SCHEMA_VERSION,
        requestId,
        type,
      }), (error) => {
        if (error !== null) fail(error);
      });
    });
  };
  const client: ArenaPa6VariantWorkerClientV2 = {
    variantId: options.variantId,
    attestation,
    request: (type: 'warmup' | 'measure' | 'probe-read-model' | 'probe-resolver') => (
      requestRaw(type)
    ),
    shutdown: async (expected: {
      readonly warmupCompleted: boolean;
      readonly measurementCount: number;
    }) => {
      const shutdownResult = requestRaw('shutdown');
      shutdownRequested = true;
      const result = exactRecord(
        await shutdownResult,
        ['variantId', 'warmupCompleted', 'measurementCount', 'source'],
        'PA6 worker shutdown result',
      );
      if (result.variantId !== options.variantId
        || result.warmupCompleted !== expected.warmupCompleted
        || result.measurementCount !== expected.measurementCount) {
        throw new Error('PA6 worker shutdown lifecycle identity 漂移。');
      }
      const source = validatedArenaPa6SourceIdentityV1(result.source, 'PA6 worker shutdown source');
      assertArenaPa6SourceIdentityEqualV1(source, options.expectedSource, 'PA6 worker shutdown');
      const close = await closePromise;
      if (close.code !== 0 || close.signal !== null) {
        throw new Error('PA6 worker shutdown 后非正常退出。');
      }
    },
    terminate: async () => {
      await terminateArenaPa6ChildV2(child);
      await closePromise;
    },
  };
  return Object.freeze(client);
}

type ArenaPa6WorkerRequestV2 = Readonly<{
  type: 'warmup' | 'measure' | 'probe-read-model' | 'probe-resolver' | 'shutdown';
}>;

async function closeArenaPa6VariantWorkerV2(
  client: ArenaPa6VariantWorkerClientV2,
  expected: { readonly warmupCompleted: boolean; readonly measurementCount: number },
  operationFailure: unknown | null,
): Promise<void> {
  let closeFailure: unknown | null = null;
  try {
    if (operationFailure === null) await client.shutdown(expected);
    else await client.terminate();
  } catch (error: unknown) {
    closeFailure = error;
    try {
      await client.terminate();
    } catch (terminateFailure: unknown) {
      closeFailure = new AggregateError(
        [error, terminateFailure],
        'PA6 worker graceful close 与 forced cleanup 同时失败。',
      );
    }
  }
  if (operationFailure !== null && closeFailure !== null) {
    throw new AggregateError(
      [operationFailure, closeFailure],
      'PA6 worker operation 与 cleanup 同时失败。',
    );
  }
  if (closeFailure !== null) throw closeFailure;
  if (operationFailure !== null) throw operationFailure;
}

export async function runArenaPa6VariantProbeV2(options: {
  readonly cwd?: string | undefined;
  readonly variantId: ArenaPa6ReadStepVariantId;
  readonly expectedSource?: ArenaPa6SourceIdentityV1 | undefined;
  readonly probe: 'probe-read-model' | 'probe-resolver';
  readonly timeoutMs?: number | undefined;
  readonly outputCapBytes?: number | undefined;
}): Promise<Readonly<{
  loaderAttestation: ArenaPa6LoaderAttestationV2;
  result: unknown;
}>> {
  const cwd = options.cwd ?? process.cwd();
  const source = options.expectedSource ?? readArenaPa6SourceIdentityV1(cwd);
  const client = await startArenaPa6VariantWorkerV2({
    cwd,
    variantId: requireArenaPa6ReadStepVariantV1(options.variantId).id,
    expectedSource: source,
    timeoutMs: options.timeoutMs ?? 30_000,
    outputCapBytes: options.outputCapBytes ?? 8 * 1024 * 1024,
  });
  let failure: unknown | null = null;
  let result: unknown;
  try {
    result = await client.request(options.probe);
  } catch (error: unknown) {
    failure = error;
  }
  await closeArenaPa6VariantWorkerV2(client, {
    warmupCompleted: false,
    measurementCount: 0,
  }, failure);
  return Object.freeze({ loaderAttestation: client.attestation, result: result! });
}

export function runArenaPa6GroupWorkerV1(options: {
  readonly groupIndex: number;
  readonly groupCount: number;
  readonly expectedPlanIdentity: string;
  readonly expectedSource: ArenaPa6SourceIdentityV1;
  readonly timeoutMs: number;
  readonly outputCapBytes: number;
  readonly cwd?: string | undefined;
  readonly readSourceIdentity?: ArenaPa6SourceIdentityReaderV1 | undefined;
  readonly progressPath?: string | undefined;
  readonly progressToken?: string | undefined;
}): Promise<ArenaPa6GroupResultV1> {
  const groupIndex = safeInteger(options.groupIndex, 'PA6 groupIndex');
  const timeoutMs = safeInteger(options.timeoutMs, 'PA6 group variant timeoutMs', 1);
  const outputCapBytes = safeInteger(
    options.outputCapBytes,
    'PA6 group variant outputCapBytes',
    1,
  );
  const plan = createArenaPa6PlanV1(options.groupCount);
  if (groupIndex >= plan.groupCount) throw new RangeError('PA6 groupIndex 超出 groupCount。');
  if (plan.planIdentity !== options.expectedPlanIdentity) {
    throw new Error('PA6 worker plan identity 漂移。');
  }
  return runArenaPa6StableSourceWindowV1<ArenaPa6GroupResultV1>({
    expectedSource: options.expectedSource,
    cwd: options.cwd,
    name: `PA6 worker group ${groupIndex} warmup+12 rounds`,
    readSourceIdentity: options.readSourceIdentity,
    operation: async () => {
      const rawRounds: ArenaPa6RawRoundV1[] = [];
      const warmupVariants: ArenaPa6ReadStepVariantId[] = [];
      const warmupParity = new Set<string>();
      const warmupDenominators = new Set<number>();
      const sourceRedirectIdentities = new Set<string>();
      const completedComparisonIds = new Set<string>();
      const reportProgress = async (progress: {
        readonly phase: ArenaPa6ProgressPhaseV1;
        readonly comparisonId?: string | null;
        readonly workerRole?: ArenaPa6ProgressWorkerRoleV1;
        readonly variantId?: ArenaPa6ReadStepVariantId | null;
        readonly sequence?: ArenaPa6ProgressSequenceV1;
      }): Promise<void> => {
        try {
        await writeArenaPa6ProgressAtomicV1(options.progressPath, Object.freeze({
          schemaVersion: ARENA_PA6_PROGRESS_SCHEMA_VERSION,
          runToken: options.progressToken ?? '',
          groupIndex,
            phase: progress.phase,
            comparisonId: progress.comparisonId ?? null,
            workerRole: progress.workerRole ?? null,
            variantId: progress.variantId ?? null,
            sequence: progress.sequence ?? null,
            completedComparisonIds: Object.freeze([...completedComparisonIds]),
            completedRoundCount: rawRounds.length,
          }));
        } catch {
          // 进度文件是诊断旁路；不能阻断 worker cleanup 或改变测量门禁。
        }
      };
      await reportProgress({ phase: 'group-start' });
      for (const comparison of ARENA_PA6_READ_STEP_ABBA_COMPARISONS_V1) {
        await reportProgress({
          phase: 'start-worker',
          comparisonId: comparison.id,
          workerRole: 'A',
          variantId: comparison.a,
        });
        await runArenaPa6StableSourceWindowV1({
          expectedSource: options.expectedSource,
          cwd: options.cwd,
          name: `PA6 group ${groupIndex} comparison ${comparison.id} worker A`,
          readSourceIdentity: options.readSourceIdentity,
          operation: async () => {
            const clientA = await startArenaPa6VariantWorkerV2({
              cwd: options.cwd ?? process.cwd(),
              variantId: comparison.a,
              expectedSource: options.expectedSource,
              timeoutMs,
              outputCapBytes,
            });
            let failureA: unknown | null = null;
            try {
              await reportProgress({
                phase: 'start-worker',
                comparisonId: comparison.id,
                workerRole: 'B',
                variantId: comparison.b,
              });
              await runArenaPa6StableSourceWindowV1({
                expectedSource: options.expectedSource,
                cwd: options.cwd,
                name: `PA6 group ${groupIndex} comparison ${comparison.id} worker B`,
                readSourceIdentity: options.readSourceIdentity,
                operation: async () => {
                  const clientB = await startArenaPa6VariantWorkerV2({
                    cwd: options.cwd ?? process.cwd(),
                    variantId: comparison.b,
                    expectedSource: options.expectedSource,
                    timeoutMs,
                    outputCapBytes,
                  });
                  let failureB: unknown | null = null;
                  try {
                    for (const attestation of [clientA.attestation, clientB.attestation]) {
                      sourceRedirectIdentities.add(
                        createArenaPa6LoaderSourceGraphIdentityV2(attestation),
                      );
                    }
                    await reportProgress({
                      phase: 'warmup',
                      comparisonId: comparison.id,
                      workerRole: 'A',
                      variantId: comparison.a,
                    });
                    const warmupA = exactRecord(
                      await clientA.request('warmup'),
                      ['variantId', 'parityIdentity', 'denominatorTicks'],
                      `PA6 ${comparison.id} warmup A`,
                    );
                    await reportProgress({
                      phase: 'warmup',
                      comparisonId: comparison.id,
                      workerRole: 'B',
                      variantId: comparison.b,
                    });
                    const warmupB = exactRecord(
                      await clientB.request('warmup'),
                      ['variantId', 'parityIdentity', 'denominatorTicks'],
                      `PA6 ${comparison.id} warmup B`,
                    );
                    if (warmupA.variantId !== comparison.a || warmupB.variantId !== comparison.b) {
                      throw new Error(`PA6 ${comparison.id} warmup variant identity 漂移。`);
                    }
                    warmupVariants.push(comparison.a, comparison.b);
                    warmupParity.add(nonEmptyString(
                      warmupA.parityIdentity,
                      `PA6 ${comparison.id} warmup A parity`,
                    ));
                    warmupParity.add(nonEmptyString(
                      warmupB.parityIdentity,
                      `PA6 ${comparison.id} warmup B parity`,
                    ));
                    warmupDenominators.add(safeInteger(
                      warmupA.denominatorTicks,
                      `PA6 ${comparison.id} warmup A denominator`,
                      1,
                    ));
                    warmupDenominators.add(safeInteger(
                      warmupB.denominatorTicks,
                      `PA6 ${comparison.id} warmup B denominator`,
                      1,
                    ));
                    const scheduled = [
                      { sequence: 'A1' as const, client: clientA, variantId: comparison.a },
                      { sequence: 'B1' as const, client: clientB, variantId: comparison.b },
                      { sequence: 'B2' as const, client: clientB, variantId: comparison.b },
                      { sequence: 'A2' as const, client: clientA, variantId: comparison.a },
                    ];
                    for (const item of scheduled) {
                      await reportProgress({
                        phase: 'measure',
                        comparisonId: comparison.id,
                        workerRole: item.client === clientA ? 'A' : 'B',
                        variantId: item.variantId,
                        sequence: item.sequence,
                      });
                      const measurement = await item.client.request('measure');
                      assertRoundMeasurement(
                        measurement,
                        item.variantId,
                        plan.caseSetIdentity,
                        createArenaPa6LoaderConfigV2({
                          repositoryRoot: options.cwd ?? process.cwd(),
                          sourceFingerprint: options.expectedSource.fingerprint,
                          variantId: item.variantId,
                        }),
                      );
                      rawRounds.push(Object.freeze({
                        comparisonId: comparison.id,
                        sequence: item.sequence,
                        variantId: item.variantId,
                        measurement: measurement as ArenaPa6FormalRoundV1,
                      }));
                    }
                  } catch (error: unknown) {
                    failureB = error;
                  }
                  await reportProgress({
                    phase: 'shutdown-worker',
                    comparisonId: comparison.id,
                    workerRole: 'B',
                    variantId: comparison.b,
                  });
                  await closeArenaPa6VariantWorkerV2(clientB, {
                    warmupCompleted: true,
                    measurementCount: 2,
                  }, failureB);
                },
              });
            } catch (error: unknown) {
              failureA = error;
            }
            await reportProgress({
              phase: 'shutdown-worker',
              comparisonId: comparison.id,
              workerRole: 'A',
              variantId: comparison.a,
            });
            await closeArenaPa6VariantWorkerV2(clientA, {
              warmupCompleted: true,
              measurementCount: 2,
            }, failureA);
          },
        });
        completedComparisonIds.add(comparison.id);
        await reportProgress({
          phase: 'comparison-complete',
          comparisonId: comparison.id,
        });
      }
      if (warmupParity.size !== 1 || warmupDenominators.size !== 1
        || sourceRedirectIdentities.size !== 1
        || rawRounds.length !== ARENA_PA6_READ_STEP_ABBA_SCHEDULE_V1.length) {
        throw new Error('PA6 warmup parity/denominator/source redirect 或 ABBA round 数量漂移。');
      }
      const gateRounds: ArenaPa6GateRoundV1[] = rawRounds.map((round) => ({
        comparisonId: round.comparisonId,
        variantId: round.variantId,
        inclusiveP95Micros: round.measurement.inclusiveCpuMicros.p95,
        processCpuMicrosPerTick: round.measurement.processCpu.microsPerTick,
      }));
      const result: ArenaPa6GroupResultV1 = Object.freeze({
        schemaVersion: ARENA_PA6_ABBA_SCHEMA_VERSION,
        groupIndex,
        planIdentity: plan.planIdentity,
        source: options.expectedSource,
        environment: readArenaPa6EnvironmentV1(),
        warmup: Object.freeze({
          variants: Object.freeze(warmupVariants),
          sampleCount: 0,
          parityIdentity: [...warmupParity][0]!,
          denominatorTicks: [...warmupDenominators][0]!,
        }),
        rawRounds: Object.freeze(rawRounds),
        gates: calculateArenaPa6GroupGatesV1(gateRounds),
      });
      assertArenaPa6GroupResultV1(result, {
        expectedGroupIndex: groupIndex,
        plan,
        source: options.expectedSource,
        repositoryRoot: options.cwd ?? process.cwd(),
      });
      await reportProgress({ phase: 'group-complete' });
      return result;
    },
  });
}

interface ArenaPa6ValidatedPercentilesV1 {
  readonly sampleCount: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
}

function assertPercentiles(value: unknown, name: string): ArenaPa6ValidatedPercentilesV1 {
  const record = exactRecord(value, ['sampleCount', 'p50', 'p95', 'p99'], name);
  const sampleCount = safeInteger(record.sampleCount, `${name}.sampleCount`, 1);
  const p50 = finite(record.p50, `${name}.p50`);
  const p95 = finite(record.p95, `${name}.p95`);
  const p99 = finite(record.p99, `${name}.p99`);
  if (p50 > p95 || p95 > p99) throw new RangeError(`${name} percentile 次序非法。`);
  return Object.freeze({ sampleCount, p50, p95, p99 });
}

function assertRoundMeasurement(
  value: unknown,
  expectedVariant: ArenaPa6ReadStepVariantId,
  expectedCaseSetIdentity: string,
  expectedLoaderConfig: ArenaPa6LoaderConfigV2,
): Readonly<Record<string, unknown>> {
  const record = exactRecord(value, [
    'schemaVersion', 'variantId', 'loaderAttestation', 'caseSetIdentity',
    'parityIdentity', 'caseCount',
    'uniqueSeedCount', 'hardLimitTicks', 'doubleRunsPerCase', 'denominatorTicks',
    'selfCpuMicros', 'inclusiveCpuMicros', 'inclusiveWallMicros', 'processCpu',
    'counts', 'gc', 'resources', 'cases',
  ], 'PA6 round measurement');
  if (record.schemaVersion !== 2 || record.variantId !== expectedVariant) {
    throw new Error('PA6 round schema/variant identity 漂移。');
  }
  validateArenaPa6LoaderAttestationV2(record.loaderAttestation, expectedLoaderConfig);
  if (record.caseSetIdentity !== expectedCaseSetIdentity
    || record.caseCount !== 20 || record.uniqueSeedCount !== 20
    || record.hardLimitTicks !== 2_500 || record.doubleRunsPerCase !== 2) {
    throw new Error('PA6 round fixed workload identity 漂移。');
  }
  nonEmptyString(record.parityIdentity, 'PA6 round parityIdentity');
  const denominatorTicks = safeInteger(record.denominatorTicks, 'PA6 round denominatorTicks', 1);
  const selfCpu = assertPercentiles(record.selfCpuMicros, 'PA6 self CPU');
  const inclusiveCpu = assertPercentiles(record.inclusiveCpuMicros, 'PA6 inclusive CPU');
  const inclusiveWall = assertPercentiles(record.inclusiveWallMicros, 'PA6 inclusive wall');
  if (selfCpu.sampleCount !== denominatorTicks
    || inclusiveCpu.sampleCount !== denominatorTicks
    || inclusiveWall.sampleCount !== denominatorTicks) {
    throw new Error('PA6 measurement sampleCount 与 denominator 不一致。');
  }
  const processCpu = exactRecord(
    record.processCpu,
    ['userMicros', 'systemMicros', 'totalMicros', 'microsPerTick'],
    'PA6 process CPU',
  );
  const processUser = finite(processCpu.userMicros, 'PA6 process user');
  const processSystem = finite(processCpu.systemMicros, 'PA6 process system');
  const processTotal = finite(processCpu.totalMicros, 'PA6 process total');
  const processPerTick = finite(processCpu.microsPerTick, 'PA6 process per tick');
  if (processTotal !== processUser + processSystem
    || processPerTick !== processTotal / denominatorTicks) {
    throw new Error('PA6 process CPU identity 与 denominator 不一致。');
  }
  const counts = exactRecord(record.counts, [
    'scheduledFullAudits', 'sessionsCreated', 'sessionsDestroyed', 'completedCases',
  ], 'PA6 counts');
  safeInteger(counts.scheduledFullAudits, 'PA6 audit count');
  const created = safeInteger(counts.sessionsCreated, 'PA6 created sessions');
  const destroyed = safeInteger(counts.sessionsDestroyed, 'PA6 destroyed sessions');
  if (created !== 40 || destroyed !== created || counts.completedCases !== 20) {
    throw new Error('PA6 lifecycle/case count 不闭合。');
  }
  const gc = exactRecord(record.gc, ['exposed', 'forcedCollections'], 'PA6 GC');
  if (typeof gc.exposed !== 'boolean') throw new TypeError('PA6 gc.exposed 必须是 boolean。');
  const forced = safeInteger(gc.forcedCollections, 'PA6 forced GC');
  if ((gc.exposed && forced !== 2) || (!gc.exposed && forced !== 0)) {
    throw new Error('PA6 GC 计数与能力不一致。');
  }
  const resources = exactRecord(record.resources, [
    'maximumWorldEquipmentCount', 'maximumRuntimeCount', 'maximumActiveSupplyCount',
    'maximumEventsPerTick', 'heapBeforeBytes', 'heapAfterBytes', 'heapDeltaBytes',
  ], 'PA6 resources');
  const maximumWorldEquipmentCount = safeInteger(
    resources.maximumWorldEquipmentCount,
    'PA6 world equipment',
  );
  const maximumRuntimeCount = safeInteger(resources.maximumRuntimeCount, 'PA6 runtime equipment');
  const maximumActiveSupplyCount = safeInteger(resources.maximumActiveSupplyCount, 'PA6 active supply');
  const maximumEventsPerTick = safeInteger(resources.maximumEventsPerTick, 'PA6 events per tick');
  if (maximumWorldEquipmentCount > 3 || maximumRuntimeCount > 5
    || maximumActiveSupplyCount > 3 || maximumEventsPerTick > 10) {
    throw new Error('PA6 resource limit 超限。');
  }
  safeInteger(resources.heapBeforeBytes, 'PA6 heap before');
  safeInteger(resources.heapAfterBytes, 'PA6 heap after');
  finite(resources.heapDeltaBytes, 'PA6 heap delta', Number.NEGATIVE_INFINITY);
  if (!Array.isArray(record.cases) || record.cases.length !== 20) {
    throw new Error('PA6 round 必须包含 20 个 case 结果。');
  }
  let caseDerivedDenominator = 0;
  for (let index = 0; index < record.cases.length; index += 1) {
    const item = exactRecord(record.cases[index], [
      'caseId', 'caseIdentity', 'seed', 'traceHash', 'finalHash', 'finalTick', 'totalEvents',
    ], `PA6 cases[${index}]`);
    const expected = ARENA_PA6_READ_STEP_CASES_V1[index]!;
    if (item.caseId !== expected.caseId || item.caseIdentity !== expected.caseIdentity
      || item.seed !== expected.seed) {
      throw new Error(`PA6 case ${index} identity/seed 漂移。`);
    }
    nonEmptyString(item.traceHash, `PA6 cases[${index}].traceHash`);
    nonEmptyString(item.finalHash, `PA6 cases[${index}].finalHash`);
    const finalTick = safeInteger(item.finalTick, `PA6 cases[${index}].finalTick`);
    if (finalTick < 2_401 || finalTick > 2_500) throw new Error('PA6 finalTick 越界。');
    caseDerivedDenominator += finalTick * 2;
    safeInteger(item.totalEvents, `PA6 cases[${index}].totalEvents`);
  }
  if (caseDerivedDenominator !== denominatorTicks) {
    throw new Error('PA6 case-derived denominator 不一致。');
  }
  return record;
}

export function assertArenaPa6GroupResultV1(
  value: unknown,
  options: {
    readonly expectedGroupIndex: number;
    readonly plan: ArenaPa6PlanV1;
    readonly source: ArenaPa6SourceIdentityV1;
    readonly repositoryRoot?: string | undefined;
  },
): asserts value is ArenaPa6GroupResultV1 {
  const record = exactRecord(value, [
    'schemaVersion', 'groupIndex', 'planIdentity', 'source', 'environment',
    'warmup', 'rawRounds', 'gates',
  ], 'PA6 group');
  if (record.schemaVersion !== ARENA_PA6_ABBA_SCHEMA_VERSION
    || record.groupIndex !== options.expectedGroupIndex
    || record.planIdentity !== options.plan.planIdentity) {
    throw new Error('PA6 group schema/index/plan identity 漂移。');
  }
  const source = validatedArenaPa6SourceIdentityV1(record.source, 'PA6 group source');
  assertArenaPa6SourceIdentityEqualV1(source, options.source, 'PA6 group');
  const environment = exactRecord(record.environment, [
    'node', 'platform', 'arch', 'release', 'cpuModel', 'logicalCpuCount', 'totalMemoryBytes',
  ], 'PA6 environment');
  for (const key of ['node', 'platform', 'arch', 'release', 'cpuModel'] as const) {
    nonEmptyString(environment[key], `PA6 environment.${key}`);
  }
  safeInteger(environment.logicalCpuCount, 'PA6 logical CPU count', 1);
  safeInteger(environment.totalMemoryBytes, 'PA6 total memory', 1);
  const warmup = exactRecord(
    record.warmup,
    ['variants', 'sampleCount', 'parityIdentity', 'denominatorTicks'],
    'PA6 warmup',
  );
  const expectedWarmupVariants = ARENA_PA6_READ_STEP_ABBA_COMPARISONS_V1.flatMap(
    ({ a, b }) => [a, b],
  );
  if (!Array.isArray(warmup.variants)
    || warmup.sampleCount !== 0
    || warmup.variants.length !== expectedWarmupVariants.length
    || warmup.variants.some((id, index) => id !== expectedWarmupVariants[index])) {
    throw new Error('PA6 warmup variant/样本隔离漂移。');
  }
  const warmupParityIdentity = nonEmptyString(warmup.parityIdentity, 'PA6 warmup parityIdentity');
  const warmupDenominatorTicks = safeInteger(
    warmup.denominatorTicks,
    'PA6 warmup denominatorTicks',
    1,
  );
  if (!Array.isArray(record.rawRounds)
    || record.rawRounds.length !== ARENA_PA6_READ_STEP_ABBA_SCHEDULE_V1.length) {
    throw new Error('PA6 raw rounds 数量漂移。');
  }
  const parity = new Set<string>();
  const denominators = new Set<number>();
  const scheduledFullAuditCounts = new Set<number>();
  const sourceRedirectIdentities = new Set<string>();
  const gateRounds: ArenaPa6GateRoundV1[] = [];
  for (let index = 0; index < record.rawRounds.length; index += 1) {
    const raw = exactRecord(
      record.rawRounds[index],
      ['comparisonId', 'sequence', 'variantId', 'measurement'],
      `PA6 rawRounds[${index}]`,
    );
    const expected = ARENA_PA6_READ_STEP_ABBA_SCHEDULE_V1[index]!;
    if (raw.comparisonId !== expected.comparisonId
      || raw.sequence !== expected.sequence
      || raw.variantId !== expected.variantId) {
      throw new Error(`PA6 rawRounds[${index}] ABBA schedule 漂移。`);
    }
    const loaderConfig = createArenaPa6LoaderConfigV2({
      repositoryRoot: options.repositoryRoot ?? process.cwd(),
      sourceFingerprint: options.source.fingerprint,
      variantId: expected.variantId,
    });
    const measurement = assertRoundMeasurement(
      raw.measurement,
      expected.variantId,
      options.plan.caseSetIdentity,
      loaderConfig,
    );
    const loaderAttestation = validateArenaPa6LoaderAttestationV2(
      measurement.loaderAttestation,
      loaderConfig,
    );
    sourceRedirectIdentities.add(createArenaPa6LoaderSourceGraphIdentityV2(loaderAttestation));
    parity.add(measurement.parityIdentity as string);
    denominators.add(measurement.denominatorTicks as number);
    const inclusiveCpu = exactRecord(
      measurement.inclusiveCpuMicros,
      ['sampleCount', 'p50', 'p95', 'p99'],
      `PA6 rawRounds[${index}].inclusiveCpuMicros`,
    );
    const processCpu = exactRecord(
      measurement.processCpu,
      ['userMicros', 'systemMicros', 'totalMicros', 'microsPerTick'],
      `PA6 rawRounds[${index}].processCpu`,
    );
    const counts = exactRecord(measurement.counts, [
      'scheduledFullAudits', 'sessionsCreated', 'sessionsDestroyed', 'completedCases',
    ], `PA6 rawRounds[${index}].counts`);
    scheduledFullAuditCounts.add(counts.scheduledFullAudits as number);
    gateRounds.push({
      comparisonId: expected.comparisonId,
      variantId: expected.variantId,
      inclusiveP95Micros: inclusiveCpu.p95 as number,
      processCpuMicrosPerTick: processCpu.microsPerTick as number,
    });
  }
  if (parity.size !== 1 || denominators.size !== 1 || scheduledFullAuditCounts.size !== 1
    || sourceRedirectIdentities.size !== 1
    || !parity.has(warmupParityIdentity) || !denominators.has(warmupDenominatorTicks)) {
    throw new Error('PA6 group parity/denominator/audit count 不一致。');
  }
  const gates = exactRecord(record.gates, [
    'inclusiveP95Passed', 'recoveryMicros', 'recoveryPassed',
    'processCpuSameDirection', 'passed',
  ], 'PA6 gates');
  for (const key of ['inclusiveP95Passed', 'recoveryPassed', 'processCpuSameDirection', 'passed'] as const) {
    if (typeof gates[key] !== 'boolean') throw new TypeError(`PA6 gates.${key} 必须是 boolean。`);
  }
  finite(gates.recoveryMicros, 'PA6 recovery', Number.NEGATIVE_INFINITY);
  const recomputedGates = calculateArenaPa6GroupGatesV1(gateRounds);
  if (gates.inclusiveP95Passed !== recomputedGates.inclusiveP95Passed
    || gates.recoveryMicros !== recomputedGates.recoveryMicros
    || gates.recoveryPassed !== recomputedGates.recoveryPassed
    || gates.processCpuSameDirection !== recomputedGates.processCpuSameDirection
    || gates.passed !== recomputedGates.passed) {
    throw new Error('PA6 gate 与 raw rounds 重算结果不一致。');
  }
}

export type ArenaPa6FailureKindV1 =
  | 'timeout'
  | 'output-cap'
  | 'spawn'
  | 'stderr'
  | 'non-zero-exit'
  | 'protocol'
  | 'unknown';

class ArenaPa6TaggedFailureV1 extends Error {
  readonly kind: ArenaPa6FailureKindV1;

  constructor(kind: ArenaPa6FailureKindV1, error: Error) {
    super(error.message || 'PA6 unknown failure');
    this.name = error.name || 'Error';
    this.kind = kind;
  }
}

class ArenaPa6ChildFailureV1 extends Error {
  readonly kind: ArenaPa6FailureKindV1;
  readonly progress: ArenaPa6ProgressV1 | null;

  constructor(
    error: Error,
    progress: ArenaPa6ProgressV1 | null,
    kind: ArenaPa6FailureKindV1,
  ) {
    super(error.message);
    this.name = error.name;
    this.kind = kind;
    this.progress = progress;
  }
}

function findArenaPa6FailureProgressV1(value: unknown): ArenaPa6ProgressV1 | null {
  if (value instanceof ArenaPa6ChildFailureV1) return value.progress;
  if (value instanceof AggregateError) {
    for (const nested of value.errors) {
      const progress = findArenaPa6FailureProgressV1(nested);
      if (progress !== null) return progress;
    }
  }
  return null;
}

function createArenaPa6TaggedFailureV1(
  kind: ArenaPa6FailureKindV1,
  error: unknown,
): Error {
  const normalized = error instanceof Error ? error : new Error('PA6 unknown failure');
  return new ArenaPa6TaggedFailureV1(kind, normalized);
}

function findArenaPa6FailureReasonV1(value: unknown): Readonly<{
  readonly kind: ArenaPa6FailureKindV1;
  readonly name: string;
  readonly message: string;
}> | null {
  if (value instanceof ArenaPa6ChildFailureV1) {
    return Object.freeze({ kind: value.kind, name: value.name, message: value.message });
  }
  if (value instanceof ArenaPa6TaggedFailureV1) {
    return Object.freeze({ kind: value.kind, name: value.name, message: value.message });
  }
  if (value instanceof AggregateError) {
    for (const nested of value.errors) {
      const reason = findArenaPa6FailureReasonV1(nested);
      if (reason !== null) return reason;
    }
  }
  return null;
}

function normalizeArenaPa6FailureReasonV1(value: unknown): Readonly<{
  readonly kind: ArenaPa6FailureKindV1;
  readonly name: string;
  readonly message: string;
}> {
  const nestedReason = findArenaPa6FailureReasonV1(value);
  if (nestedReason !== null) return nestedReason;
  if (value instanceof Error) {
    return Object.freeze({
      kind: 'unknown',
      name: value.name || 'Error',
      message: value.message || 'PA6 unknown failure',
    });
  }
  return Object.freeze({
    kind: 'unknown',
    name: 'UnknownError',
    message: 'PA6 unknown failure',
  });
}

export interface ArenaPa6ChildResultV1 {
  readonly stdout: string;
  readonly parsed: unknown;
}

export function runArenaPa6StrictJsonChildV1(options: {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly timeoutMs: number;
  readonly outputCapBytes: number;
  readonly env?: NodeJS.ProcessEnv;
  readonly progressPath?: string | undefined;
  readonly expectedProgressGroupIndex?: number | undefined;
  readonly expectedProgressToken?: string | undefined;
  readonly inactivityTimeoutMs?: number | undefined;
  readonly progressPollMs?: number | undefined;
}): Promise<ArenaPa6ChildResultV1> {
  const timeoutMs = safeInteger(options.timeoutMs, 'PA6 child timeoutMs', 1);
  const outputCapBytes = safeInteger(options.outputCapBytes, 'PA6 child outputCapBytes', 1);
  const inactivityTimeoutMs = options.inactivityTimeoutMs === undefined
    ? null
    : safeInteger(options.inactivityTimeoutMs, 'PA6 child inactivityTimeoutMs', 1);
  if (inactivityTimeoutMs !== null && options.progressPath === undefined) {
    throw new TypeError('PA6 inactivity timeout 必须绑定 progress file。');
  }
  const progressPollMs = safeInteger(
    options.progressPollMs
      ?? Math.max(1, Math.min(1_000, Math.floor((inactivityTimeoutMs ?? timeoutMs) / 4))),
    'PA6 progressPollMs',
    1,
  );
  return new Promise((resolve, reject) => {
    const child = spawn(options.command, [...options.args], {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });
    let stdout: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    let stderr: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    let totalOutputBytes = 0;
    let settled = false;
    let pendingFailure: Error | null = null;
    let killTimer: NodeJS.Timeout | null = null;
    let timer: NodeJS.Timeout | null = null;
    let progressPollTimer: NodeJS.Timeout | null = null;
    let lastProgress: ArenaPa6ProgressV1 | null = null;
    let lastProgressOrder: number | null = null;
    let observeProgress: () => boolean = () => false;
    const progressTrackingEnabled = inactivityTimeoutMs !== null;
    const stopProgressPolling = (): void => {
      if (progressPollTimer !== null) {
        clearInterval(progressPollTimer);
        progressPollTimer = null;
      }
    };
    const latestProgress = (): ArenaPa6ProgressV1 | null => lastProgress
      ?? readArenaPa6ProgressBestEffortV1(
        options.progressPath,
        options.expectedProgressGroupIndex,
        options.expectedProgressToken,
      );
    const signalChildTree = (signal: NodeJS.Signals): void => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      if (process.platform !== 'win32' && child.pid !== undefined) {
        try {
          process.kill(-child.pid, signal);
          return;
        } catch (error: unknown) {
          if ((error as NodeJS.ErrnoException).code === 'ESRCH') return;
        }
      }
      try {
        child.kill(signal);
      } catch {
        // close/error handlers still settle the promise; never escape the kill path.
      }
    };
    const fail = (error: Error): void => {
      if (settled || pendingFailure !== null) return;
      pendingFailure = error;
      if (timer !== null) clearTimeout(timer);
      stopProgressPolling();
      if (child.exitCode === null && child.signalCode === null) {
        signalChildTree('SIGTERM');
        killTimer = setTimeout(() => {
          signalChildTree('SIGKILL');
        }, 1_000);
      }
    };
    const resetInactivityTimer = (): void => {
      if (!progressTrackingEnabled || inactivityTimeoutMs === null) return;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        if (observeProgress()) return;
        fail(createArenaPa6TaggedFailureV1(
          'timeout',
          new Error('PA6 child inactivity timeout。'),
        ));
      }, inactivityTimeoutMs);
    };
    observeProgress = (): boolean => {
      const progress = readArenaPa6ProgressBestEffortV1(
        options.progressPath,
        options.expectedProgressGroupIndex,
        options.expectedProgressToken,
      );
      if (progress === null) return false;
      const order = arenaPa6ProgressOrderV1(progress);
      if (lastProgressOrder !== null && order <= lastProgressOrder) return false;
      lastProgress = progress;
      lastProgressOrder = order;
      resetInactivityTimer();
      return true;
    };
    const append = (
      current: Buffer<ArrayBufferLike>,
      chunk: Buffer<ArrayBufferLike>,
      streamName: string,
    ): Buffer<ArrayBufferLike> => {
      totalOutputBytes += chunk.length;
      const nextLength = current.length + chunk.length;
      if (totalOutputBytes > outputCapBytes) {
        fail(createArenaPa6TaggedFailureV1(
          'output-cap',
          new RangeError(`PA6 child ${streamName} 超出输出上限。`),
        ));
        return current;
      }
      return Buffer.concat([current, chunk], nextLength);
    };
    child.stdout.on('data', (chunk: Buffer) => { stdout = append(stdout, chunk, 'stdout'); });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = append(stderr, chunk, 'stderr');
      if (pendingFailure === null) {
        const summary = chunk.toString('utf8').trim().slice(0, 4_096);
        fail(createArenaPa6TaggedFailureV1(
          'stderr',
          new Error(summary.length === 0 ? 'PA6 child stderr 必须为空。' : `PA6 child stderr: ${summary}`),
        ));
      }
    });
    child.on('error', (error) => fail(createArenaPa6TaggedFailureV1('spawn', error)));
    if (progressTrackingEnabled) {
      observeProgress();
      resetInactivityTimer();
      progressPollTimer = setInterval(() => { observeProgress(); }, progressPollMs);
      progressPollTimer.unref();
    } else {
      timer = setTimeout(() => fail(
        createArenaPa6TaggedFailureV1('timeout', new Error('PA6 child timeout。')),
      ), timeoutMs);
    }
    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      if (killTimer !== null) clearTimeout(killTimer);
      stopProgressPolling();
      if (pendingFailure !== null) {
        reject(new ArenaPa6ChildFailureV1(
          pendingFailure,
          latestProgress(),
          findArenaPa6FailureReasonV1(pendingFailure)?.kind ?? 'unknown',
        ));
        return;
      }
      if (stderr.length !== 0) {
        const stderrSummary = stderr.toString('utf8').trim().slice(0, 4_096);
        reject(new ArenaPa6ChildFailureV1(
          createArenaPa6TaggedFailureV1(
            'stderr',
            new Error(stderrSummary.length === 0
              ? 'PA6 child stderr 必须为空。'
              : `PA6 child stderr: ${stderrSummary}`),
          ),
          latestProgress(),
          'stderr',
        ));
        return;
      }
      if (code !== 0 || signal !== null) {
        reject(new ArenaPa6ChildFailureV1(
          createArenaPa6TaggedFailureV1('non-zero-exit', new Error('PA6 child 非正常退出。')),
          latestProgress(),
          'non-zero-exit',
        ));
        return;
      }
      const text = stdout.toString('utf8');
      if (text.length === 0 || !text.endsWith('\n') || text.slice(0, -1).includes('\n')) {
        reject(new ArenaPa6ChildFailureV1(
          createArenaPa6TaggedFailureV1(
            'protocol',
            new Error('PA6 child 必须输出单行完整 JSON。'),
          ),
          latestProgress(),
          'protocol',
        ));
        return;
      }
      try {
        const parsed = JSON.parse(text.slice(0, -1)) as unknown;
        resolve(Object.freeze({ stdout: text, parsed }));
      } catch {
        reject(new ArenaPa6ChildFailureV1(
          createArenaPa6TaggedFailureV1(
            'protocol',
            new Error('PA6 child 输出不是完整 JSON。'),
          ),
          latestProgress(),
          'protocol',
        ));
      }
    });
  });
}

export async function publishArenaPa6ReportAtomicV1(
  outputPath: string,
  report: unknown,
): Promise<void> {
  if (typeof outputPath !== 'string' || outputPath.length === 0 || !path.isAbsolute(outputPath)) {
    throw new TypeError('PA6 output 必须是绝对路径。');
  }
  const directory = path.dirname(outputPath);
  const temporary = path.join(
    directory,
    `.${path.basename(outputPath)}.pa6-tmp-${process.pid}-${randomUUID()}`,
  );
  const payload = `${JSON.stringify(cloneArenaPa6StrictDataV1(report, 'PA6 report'))}\n`;
  let handle: Awaited<ReturnType<typeof open>> | null = null;
  try {
    handle = await open(temporary, 'wx', 0o600);
    await handle.writeFile(payload, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
    await link(temporary, outputPath);
  } finally {
    if (handle !== null) await handle.close().catch(() => undefined);
    await unlink(temporary).catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    });
  }
}

export interface ArenaPa6AbbaReportV1 {
  readonly schemaVersion: typeof ARENA_PA6_ABBA_SCHEMA_VERSION;
  readonly status: 'passed' | 'failed';
  readonly source: ArenaPa6SourceIdentityV1;
  readonly environment: ArenaPa6EnvironmentV1;
  readonly plan: ArenaPa6PlanV1;
  readonly rawGroups: readonly ArenaPa6GroupResultV1[];
  readonly failure?: ArenaPa6FailureV1;
}

export interface ArenaPa6FailureV1 {
  readonly completedGroups: readonly number[];
  readonly current: Readonly<{
    readonly groupIndex: number;
    readonly phase: ArenaPa6ProgressPhaseV1 | 'unknown';
    readonly comparisonId: string | null;
    readonly workerRole: ArenaPa6ProgressWorkerRoleV1;
    readonly variantId: ArenaPa6ReadStepVariantId | null;
    readonly sequence: ArenaPa6ProgressSequenceV1;
    readonly completedComparisonIds: readonly string[];
    readonly completedRoundCount: number;
  }>;
  readonly reason: Readonly<{
    readonly kind: ArenaPa6FailureKindV1;
    readonly name: string;
    readonly message: string;
  }>;
}

function assertArenaPa6FailureV1(value: unknown): asserts value is ArenaPa6FailureV1 {
  const failure = exactRecord(
    value,
    ['completedGroups', 'current', 'reason'],
    'PA6 failure',
  );
  if (!Array.isArray(failure.completedGroups)
    || failure.completedGroups.some((groupIndex) => !Number.isSafeInteger(groupIndex))) {
    throw new Error('PA6 failure completedGroups 非法。');
  }
  const current = exactRecord(failure.current, [
    'groupIndex', 'phase', 'comparisonId', 'workerRole', 'variantId', 'sequence',
    'completedComparisonIds', 'completedRoundCount',
  ], 'PA6 failure current');
  safeInteger(current.groupIndex, 'PA6 failure current.groupIndex');
  if (![
    'unknown', 'group-start', 'start-worker', 'warmup', 'measure', 'shutdown-worker',
    'comparison-complete', 'group-complete',
  ].includes(current.phase as string)) {
    throw new Error('PA6 failure current.phase 非法。');
  }
  if (current.comparisonId !== null) {
    nonEmptyString(current.comparisonId, 'PA6 failure current.comparisonId');
  }
  if (current.workerRole !== null && current.workerRole !== 'A' && current.workerRole !== 'B') {
    throw new Error('PA6 failure current.workerRole 非法。');
  }
  if (current.variantId !== null) requireArenaPa6ReadStepVariantV1(current.variantId);
  if (current.sequence !== null && !['A1', 'B1', 'B2', 'A2'].includes(current.sequence as string)) {
    throw new Error('PA6 failure current.sequence 非法。');
  }
  if (!Array.isArray(current.completedComparisonIds)
    || current.completedComparisonIds.some((id) => typeof id !== 'string' || id.length === 0)) {
    throw new Error('PA6 failure current.completedComparisonIds 非法。');
  }
  safeInteger(current.completedRoundCount, 'PA6 failure current.completedRoundCount');
  const reason = exactRecord(failure.reason, [
    'kind', 'name', 'message',
  ], 'PA6 failure reason');
  if (![
    'timeout', 'output-cap', 'spawn', 'stderr', 'non-zero-exit', 'protocol', 'unknown',
  ].includes(reason.kind as string)) {
    throw new Error('PA6 failure reason.kind 非法。');
  }
  nonEmptyString(reason.name, 'PA6 failure reason.name');
  nonEmptyString(reason.message, 'PA6 failure reason.message');
}

export function assertArenaPa6AbbaReportSourceIdentityV1(
  value: unknown,
  expectedSource: ArenaPa6SourceIdentityV1,
): asserts value is ArenaPa6AbbaReportV1 {
  const cloned = cloneArenaPa6StrictDataV1(value, 'PA6 report');
  if (cloned === null || typeof cloned !== 'object' || Array.isArray(cloned)) {
    throw new TypeError('PA6 report 必须是 record。');
  }
  const baseKeys = ['schemaVersion', 'status', 'source', 'environment', 'plan', 'rawGroups'];
  const expectedKeys = Object.hasOwn(cloned, 'failure')
    ? [...baseKeys, 'failure']
    : baseKeys;
  const keys = Object.keys(cloned).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  if (keys.length !== sortedExpectedKeys.length
    || keys.some((key, index) => key !== sortedExpectedKeys[index])) {
    throw new TypeError('PA6 report 字段集合不精确。');
  }
  const report = cloned as Readonly<Record<string, unknown>>;
  if (report.schemaVersion !== ARENA_PA6_ABBA_SCHEMA_VERSION
    || (report.status !== 'passed' && report.status !== 'failed')
    || !Array.isArray(report.rawGroups)) {
    throw new Error('PA6 report schema/status/groups 非法。');
  }
  const source = validatedArenaPa6SourceIdentityV1(report.source, 'PA6 report source');
  assertArenaPa6SourceIdentityEqualV1(source, expectedSource, 'PA6 report');
  if (Object.hasOwn(report, 'failure')) assertArenaPa6FailureV1(report.failure);
}

function createArenaPa6FailedReportV1(options: {
  readonly source: ArenaPa6SourceIdentityV1;
  readonly environment: ArenaPa6EnvironmentV1;
  readonly plan: ArenaPa6PlanV1;
  readonly completedGroups: readonly ArenaPa6GroupResultV1[];
  readonly currentGroupIndex: number;
  readonly failure: unknown;
  readonly progress: ArenaPa6ProgressV1 | null;
}): ArenaPa6AbbaReportV1 {
  const progress = options.progress;
  const current = Object.freeze({
    groupIndex: progress?.groupIndex ?? options.currentGroupIndex,
    phase: progress?.phase ?? 'unknown' as const,
    comparisonId: progress?.comparisonId ?? null,
    workerRole: progress?.workerRole ?? null,
    variantId: progress?.variantId ?? null,
    sequence: progress?.sequence ?? null,
    completedComparisonIds: Object.freeze([...(progress?.completedComparisonIds ?? [])]),
    completedRoundCount: progress?.completedRoundCount ?? 0,
  });
  const report: ArenaPa6AbbaReportV1 = Object.freeze({
    schemaVersion: ARENA_PA6_ABBA_SCHEMA_VERSION,
    status: 'failed',
    source: options.source,
    environment: options.environment,
    plan: options.plan,
    rawGroups: Object.freeze([...options.completedGroups]),
    failure: Object.freeze({
      completedGroups: Object.freeze(options.completedGroups.map(({ groupIndex }) => groupIndex)),
      current,
      reason: normalizeArenaPa6FailureReasonV1(options.failure),
    }),
  });
  assertArenaPa6AbbaReportSourceIdentityV1(report, options.source);
  return report;
}

export async function runArenaPa6AbbaV1(options: {
  readonly groupCount: number;
  readonly timeoutMs?: number;
  readonly outputCapBytes?: number;
  readonly cwd?: string | undefined;
  readonly entryPath?: string | undefined;
  readonly readSourceIdentity?: ArenaPa6SourceIdentityReaderV1 | undefined;
}): Promise<ArenaPa6AbbaReportV1> {
  const cwd = options.cwd ?? process.cwd();
  const timeoutMs = safeInteger(
    options.timeoutMs ?? ARENA_PA6_ABBA_DEFAULT_TIMEOUT_MS,
    'PA6 child/variant timeoutMs',
    1,
  );
  const outputCapBytes = safeInteger(
    options.outputCapBytes ?? ARENA_PA6_ABBA_DEFAULT_OUTPUT_CAP_BYTES,
    'PA6 child/variant outputCapBytes',
    1,
  );
  const plan = createArenaPa6PlanV1(options.groupCount);
  const sourceReader = options.readSourceIdentity ?? readArenaPa6SourceIdentityV1;
  const source = sourceReader(cwd);
  const environment = readArenaPa6EnvironmentV1();
  const environmentIdentity = createDeterministicDataHash(environment, 'PA6 environment');
  const entryPath = options.entryPath ?? path.resolve(cwd, 'scripts/arena-pa6-read-step-abba.ts');
  const groups: ArenaPa6GroupResultV1[] = [];
  for (let groupIndex = 0; groupIndex < plan.groupCount; groupIndex += 1) {
    const progressToken = randomUUID();
    const progressPath = path.join(
      os.tmpdir(),
      `.arena-pa6-progress-${process.pid}-${groupIndex}-${randomUUID()}.json`,
    );
    await writeArenaPa6ProgressAtomicV1(progressPath, Object.freeze({
      schemaVersion: ARENA_PA6_PROGRESS_SCHEMA_VERSION,
      runToken: progressToken,
      groupIndex,
      phase: 'group-start',
      comparisonId: null,
      workerRole: null,
      variantId: null,
      sequence: null,
      completedComparisonIds: Object.freeze([]),
      completedRoundCount: 0,
    })).catch(() => undefined);
    try {
      const child = await runArenaPa6StableSourceWindowV1({
        expectedSource: source,
        cwd,
        name: `PA6 parent child group ${groupIndex}`,
        readSourceIdentity: sourceReader,
        operation: () => runArenaPa6StrictJsonChildV1({
          command: process.execPath,
          args: [
            '--expose-gc',
            '--import',
            'tsx',
            entryPath,
            `--worker-group=${groupIndex}`,
            `--groups=${plan.groupCount}`,
            `--expected-head=${source.head}`,
            `--expected-dirty=${source.dirty ? 'true' : 'false'}`,
            `--expected-fingerprint=${source.fingerprint}`,
            `--expected-plan-identity=${plan.planIdentity}`,
            `--timeout-ms=${timeoutMs}`,
            `--output-cap-bytes=${outputCapBytes}`,
            `--progress-file=${progressPath}`,
            `--progress-token=${progressToken}`,
          ],
          cwd,
          timeoutMs,
          outputCapBytes,
          progressPath,
          expectedProgressGroupIndex: groupIndex,
          expectedProgressToken: progressToken,
          inactivityTimeoutMs: timeoutMs,
        }),
      });
      try {
        assertArenaPa6GroupResultV1(child.parsed, {
          expectedGroupIndex: groupIndex,
          plan,
          source,
          repositoryRoot: cwd,
        });
      } catch (error: unknown) {
        throw createArenaPa6TaggedFailureV1('protocol', error);
      }
      if (createDeterministicDataHash(child.parsed.environment, 'PA6 environment')
        !== environmentIdentity) {
        throw createArenaPa6TaggedFailureV1(
          'protocol',
          new Error('PA6 group environment identity 漂移。'),
        );
      }
      groups.push(child.parsed);
    } catch (error: unknown) {
      return createArenaPa6FailedReportV1({
        source,
        environment,
        plan,
        completedGroups: groups,
        currentGroupIndex: groupIndex,
        failure: error,
        progress: findArenaPa6FailureProgressV1(error)
          ?? readArenaPa6ProgressBestEffortV1(progressPath, groupIndex, progressToken),
      });
    } finally {
      await unlink(progressPath).catch(() => undefined);
      await unlink(`${progressPath}.tmp`).catch(() => undefined);
    }
  }
  const report: ArenaPa6AbbaReportV1 = Object.freeze({
    schemaVersion: ARENA_PA6_ABBA_SCHEMA_VERSION,
    status: groups.every(({ gates }) => gates.passed) ? 'passed' : 'failed',
    source,
    environment,
    plan,
    rawGroups: Object.freeze(groups),
  });
  assertArenaPa6AbbaReportSourceIdentityV1(report, source);
  return report;
}

export interface ArenaPa6CliOptionsV1 {
  readonly mode: 'plan' | 'run' | 'worker';
  readonly groups: number;
  readonly output: string | null;
  readonly progressPath: string | null;
  readonly progressToken: string | null;
  readonly timeoutMs: number;
  readonly outputCapBytes: number;
  readonly workerGroup: number | null;
  readonly expectedHead: string | null;
  readonly expectedDirty: boolean | null;
  readonly expectedFingerprint: string | null;
  readonly expectedPlanIdentity: string | null;
}

export function parseArenaPa6CliV1(args: readonly string[]): ArenaPa6CliOptionsV1 {
  const allowed = new Set([
    'plan', 'groups', 'output', 'timeout-ms', 'output-cap-bytes', 'worker-group',
    'expected-head', 'expected-dirty', 'expected-fingerprint', 'expected-plan-identity',
    'progress-file', 'progress-token',
  ]);
  const values = new Map<string, string | true>();
  for (const argument of args) {
    if (typeof argument !== 'string' || !argument.startsWith('--')) {
      throw new TypeError('PA6 CLI 只接受 --exact-key=value。');
    }
    const source = argument.slice(2);
    const separator = source.indexOf('=');
    const key = separator === -1 ? source : source.slice(0, separator);
    const value = separator === -1 ? true : source.slice(separator + 1);
    if (!allowed.has(key)) throw new RangeError(`PA6 CLI 未知参数 ${key}。`);
    if (values.has(key)) throw new RangeError(`PA6 CLI 参数 ${key} 不能重复。`);
    if (key === 'plan') {
      if (value !== true) throw new TypeError('PA6 --plan 不接受 value。');
    } else if (value === true || value.length === 0) {
      throw new TypeError(`PA6 --${key} 必须提供 value。`);
    }
    values.set(key, value);
  }
  const integerOption = (key: string, fallback: number, minimum: number): number => {
    const raw = values.get(key);
    if (raw === undefined) return fallback;
    if (typeof raw !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(raw)) {
      throw new TypeError(`PA6 --${key} 必须是十进制整数。`);
    }
    return safeInteger(Number(raw), `PA6 --${key}`, minimum);
  };
  const groups = integerOption('groups', ARENA_PA6_ABBA_MINIMUM_GROUPS, ARENA_PA6_ABBA_MINIMUM_GROUPS);
  const workerGroupRaw = values.get('worker-group');
  const workerGroup = workerGroupRaw === undefined
    ? null
    : integerOption('worker-group', 0, 0);
  const plan = values.has('plan');
  if (plan && workerGroup !== null) throw new Error('PA6 --plan 与 worker mode 互斥。');
  const expectedHead = values.get('expected-head');
  const expectedDirty = values.get('expected-dirty');
  const expectedFingerprint = values.get('expected-fingerprint');
  const expectedPlanIdentity = values.get('expected-plan-identity');
  if (workerGroup === null) {
    if (expectedHead !== undefined || expectedDirty !== undefined
      || expectedFingerprint !== undefined || expectedPlanIdentity !== undefined) {
      throw new Error('PA6 expected identity 参数只允许 worker mode。');
    }
  } else {
    if (typeof expectedHead !== 'string' || !/^[0-9a-f]{40}$/.test(expectedHead)
      || (expectedDirty !== 'true' && expectedDirty !== 'false')
      || typeof expectedFingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(expectedFingerprint)
      || typeof expectedPlanIdentity !== 'string' || expectedPlanIdentity.length === 0
      || values.has('output')) {
      throw new Error('PA6 worker identity 参数不完整或包含非法 output。');
    }
  }
  const output = values.get('output');
  if (output !== undefined && (typeof output !== 'string' || !path.isAbsolute(output))) {
    throw new TypeError('PA6 --output 必须是绝对路径。');
  }
  const progressFile = values.get('progress-file');
  const progressToken = values.get('progress-token');
  if (progressFile !== undefined && (typeof progressFile !== 'string' || !path.isAbsolute(progressFile))) {
    throw new TypeError('PA6 --progress-file 必须是绝对路径。');
  }
  if (workerGroup === null && progressFile !== undefined) {
    throw new Error('PA6 --progress-file 只允许 worker mode。');
  }
  if (workerGroup === null && progressToken !== undefined) {
    throw new Error('PA6 --progress-token 只允许 worker mode。');
  }
  if ((progressFile === undefined) !== (progressToken === undefined)) {
    throw new Error('PA6 progress file/token 必须成对提供。');
  }
  if (progressToken !== undefined) nonEmptyString(progressToken, 'PA6 --progress-token');
  return Object.freeze({
    mode: workerGroup !== null ? 'worker' : plan ? 'plan' : 'run',
    groups,
    output: typeof output === 'string' ? output : null,
    progressPath: typeof progressFile === 'string' ? progressFile : null,
    progressToken: typeof progressToken === 'string' ? progressToken : null,
    timeoutMs: integerOption('timeout-ms', ARENA_PA6_ABBA_DEFAULT_TIMEOUT_MS, 1),
    outputCapBytes: integerOption(
      'output-cap-bytes',
      ARENA_PA6_ABBA_DEFAULT_OUTPUT_CAP_BYTES,
      1,
    ),
    workerGroup,
    expectedHead: typeof expectedHead === 'string' ? expectedHead : null,
    expectedDirty: expectedDirty === 'true' ? true : expectedDirty === 'false' ? false : null,
    expectedFingerprint: typeof expectedFingerprint === 'string' ? expectedFingerprint : null,
    expectedPlanIdentity: typeof expectedPlanIdentity === 'string'
      ? expectedPlanIdentity
      : null,
  });
}
