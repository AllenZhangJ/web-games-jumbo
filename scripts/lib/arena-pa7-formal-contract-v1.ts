import { createHash } from 'node:crypto';
import { isDeepStrictEqual, types as utilTypes } from 'node:util';
import {
  EQUIPMENT_DESPAWN_REASON,
  createEquipmentExpiredEventPayload,
  createEquipmentRecycledEventPayload,
  createEquipmentSpawnedEventPayload,
  createWorldSnapshotV2Audit,
  normalizeInputFrame,
} from '@number-strategy-jump/arena-contracts';
import { validateArenaReplay } from '@number-strategy-jump/arena-match';
import {
  ARENA_READ_STEP_EVENT_TYPES,
  createArenaReadStepScheduleV2,
} from './arena-read-step-runner-v2.js';

export const ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION = 1 as const;
export const ARENA_PA7_FORMAL_CONTRACT_ID = 'arena.pa7.formal.v1' as const;
export const ARENA_PA7_FORMAL_CASE_COUNT = 300 as const;
export const ARENA_PA7_FORMAL_UNIQUE_SEED_COUNT = 120 as const;
export const ARENA_PA7_FORMAL_HARD_LIMIT_TICKS = 2_500 as const;
export const ARENA_PA7_FORMAL_DOUBLE_RUN_COUNT = 2 as const;
export const ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK = 250 as const;
export const ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES = 32 * 1_024 * 1_024;
export const ARENA_PA7_FORMAL_WORKER_FLAG = '--pa7-worker' as const;
export const ARENA_PA7_FORMAL_LOADER_ATTESTATION_HASH_FLAG =
  '--loader-attestation-hash' as const;
export const ARENA_PA7_FORMAL_RUN_TOKEN_ENV = 'ARENA_PA7_RUN_TOKEN' as const;
export const ARENA_PA7_FORMAL_PROGRESS_PATH_ENV = 'ARENA_PA7_PROGRESS_PATH' as const;
export const ARENA_PA7_FORMAL_WORKER_SCRIPT_RELATIVE_PATH =
  'scripts/arena-formal-survival-bot-pressure.ts' as const;
export const ARENA_PA7_FORMAL_NODE_IMPORT_SPECIFIER = 'tsx' as const;

export const ARENA_PA7_FORMAL_GATE_IDS = Object.freeze([
  'request-exact',
  'source-clean-stable',
  'build-attested',
  'manifest-unique',
  'full-input-determinism',
  'full-event-determinism',
  'full-snapshot-determinism',
  'full-replay-v5',
  'per-case-terminal',
  'lifecycle-599-600-601',
  'resource-bounded',
  'cleanup-zero',
  'cpu-budget',
  'heap-budget',
  'atomic-publication',
] as const);

export const ARENA_PA7_FORMAL_FAILURE_KINDS = Object.freeze([
  'request-invalid',
  'source-dirty',
  'source-drift',
  'build-unattested',
  'runner-startup',
  'progress-invalid',
  'case-execution',
  'case-validation',
  'snapshot-mismatch',
  'replay-invalid',
  'replay-mismatch',
  'event-coverage',
  'lifecycle-boundary',
  'resource-limit',
  'cpu-limit',
  'heap-limit',
  'timeout',
  'cleanup-failed',
  'publication-conflict',
  'publication-failed',
] as const);

export const ARENA_PA7_FORMAL_FAILURE_PHASES = Object.freeze([
  'preflight',
  'spawn',
  'run-first',
  'run-second',
  'compare',
  'aggregate',
  'cleanup',
  'publish',
] as const);

export const ARENA_PA7_FORMAL_REQUEST_V1 = Object.freeze({
  caseCount: ARENA_PA7_FORMAL_CASE_COUNT,
  uniqueSeedCount: ARENA_PA7_FORMAL_UNIQUE_SEED_COUNT,
  hardLimitTicks: ARENA_PA7_FORMAL_HARD_LIMIT_TICKS,
  doubleRunsPerCase: ARENA_PA7_FORMAL_DOUBLE_RUN_COUNT,
});

const MAX_DATA_DEPTH = 64;
const MAX_DATA_NODES = 2_000_000;
const HASH_PATTERN = /^[0-9a-f]+$/;
const SAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const EVENT_TYPES = Object.freeze([...ARENA_READ_STEP_EVENT_TYPES]);
const EVENT_TYPE_SET = new Set<string>(EVENT_TYPES);
const DESPAWN_REASONS = Object.freeze(Object.values(EQUIPMENT_DESPAWN_REASON).sort(compareText));
const DESPAWN_REASON_SET = new Set<string>(DESPAWN_REASONS);
const FORMAL_PARTICIPANT_IDS = Object.freeze(['player-1', 'player-2']);
const FORMAL_PROFILE_IDS = Object.freeze(['easy', 'hard', 'normal']);
const FORMAL_INPUT_PLAN_IDS = Object.freeze([
  'center-contest', 'jump-cycle', 'left-contest', 'neutral', 'right-contest', 'zigzag',
]);
const FORMAL_PAUSE_TICKS = Object.freeze([
  1_199, 1_200, 1_201, 1_799, 1_800, 1_801, 2_399, 2_400, 2_401,
]);

export const ARENA_PA7_FORMAL_REQUIRED_EVENT_TYPES = EVENT_TYPES;
export const ARENA_PA7_FORMAL_EQUIPMENT_DESPAWN_REASONS = DESPAWN_REASONS;

type StrictRecord = Record<string, unknown>;
type FormalGateId = typeof ARENA_PA7_FORMAL_GATE_IDS[number];
type FormalFailureKind = typeof ARENA_PA7_FORMAL_FAILURE_KINDS[number];
type FormalFailurePhase = typeof ARENA_PA7_FORMAL_FAILURE_PHASES[number];

interface StrictCloneState {
  readonly active: Set<object>;
  nodes: number;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Captures JSON-like data without property reads. Proxies are rejected before
 * reflection so caller traps cannot become part of evidence validation.
 */
export function cloneArenaPa7FormalStrictDataV1(
  value: unknown,
  name = 'PA7 formal data',
): unknown {
  const state: StrictCloneState = { active: new Set<object>(), nodes: 0 };
  const visit = (candidate: unknown, depth: number, path: string): unknown => {
    state.nodes += 1;
    if (state.nodes > MAX_DATA_NODES || depth > MAX_DATA_DEPTH) {
      throw new RangeError(`${name} 超出结构上限（${path}）。`);
    }
    if (candidate === null || typeof candidate === 'string' || typeof candidate === 'boolean') {
      return candidate;
    }
    if (typeof candidate === 'number') {
      if (!Number.isFinite(candidate)) throw new RangeError(`${path} 必须是有限数。`);
      return Object.is(candidate, -0) ? 0 : candidate;
    }
    if (typeof candidate !== 'object') throw new TypeError(`${path} 只能包含 JSON data。`);
    if (utilTypes.isProxy(candidate)) throw new TypeError(`${path} 不接受 Proxy。`);
    if (utilTypes.isPromise(candidate)) throw new TypeError(`${path} 不接受异步值。`);
    if (state.active.has(candidate)) throw new TypeError(`${path} 不能包含循环引用。`);
    state.active.add(candidate);
    try {
      if (Array.isArray(candidate)) {
        const lengthDescriptor = Object.getOwnPropertyDescriptor(candidate, 'length');
        if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, 'value')
          || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) {
          throw new TypeError(`${path}.length 非法。`);
        }
        const length = lengthDescriptor.value as number;
        const keys = Reflect.ownKeys(candidate);
        if (keys.length !== length + 1 || !keys.includes('length')) {
          throw new TypeError(`${path} 不能包含 sparse、Symbol 或额外字段。`);
        }
        const result: unknown[] = [];
        for (let index = 0; index < length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(candidate, String(index));
          if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
            throw new TypeError(`${path}[${index}] 必须是可枚举数据字段。`);
          }
          result.push(visit(descriptor.value, depth + 1, `${path}[${index}]`));
        }
        return Object.freeze(result);
      }
      const prototype = Object.getPrototypeOf(candidate);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError(`${path} 必须是普通对象。`);
      }
      const result: StrictRecord = {};
      for (const key of Reflect.ownKeys(candidate)) {
        if (typeof key !== 'string') throw new TypeError(`${path} 不接受 Symbol 字段。`);
        if (SAFE_KEYS.has(key)) throw new TypeError(`${path}.${key} 是不安全字段。`);
        const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
        if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
          throw new TypeError(`${path}.${key} 必须是可枚举数据字段。`);
        }
        result[key] = visit(descriptor.value, depth + 1, `${path}.${key}`);
      }
      return Object.freeze(result);
    } finally {
      state.active.delete(candidate);
    }
  };
  return visit(value, 0, name);
}

function strictRecord(value: unknown, keys: readonly string[], name: string): StrictRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const actual = Reflect.ownKeys(value);
  if (actual.some((key) => typeof key !== 'string')) throw new TypeError(`${name} 不接受 Symbol。`);
  if (actual.length !== keys.length) throw new TypeError(`${name} 字段数量不匹配。`);
  const allowed = new Set(keys);
  for (const key of actual as string[]) {
    if (!allowed.has(key)) throw new TypeError(`${name} 包含未知字段 ${key}。`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
    }
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name} 缺少字段 ${key}。`);
  }
  return value as StrictRecord;
}

function strictArray(value: unknown, name: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  return value;
}

function safeInteger(value: unknown, name: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return value as number;
}

function finite(value: unknown, name: string, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的有限数。`);
  }
  return value;
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

function strictRelativePath(value: unknown, name: string): string {
  const path = nonEmptyString(value, name);
  const segments = path.split('/');
  if (path.startsWith('/') || path.includes('\\') || path.includes('\0')
    || segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new TypeError(`${name} 必须是规范的仓库内相对路径。`);
  }
  return path;
}

function fixedHash(value: unknown, length: number, name: string): string {
  const result = nonEmptyString(value, name);
  if (result.length !== length || !HASH_PATTERN.test(result)) {
    throw new TypeError(`${name} 必须是 ${length} 位小写十六进制 hash。`);
  }
  return result;
}

function dataHash(value: unknown, name: string): string {
  return fixedHash(value, 8, name);
}

function sha256Hash(value: unknown, name: string): string {
  return fixedHash(value, 64, name);
}

function nullableString(value: unknown, name: string): string | null {
  return value === null ? null : nonEmptyString(value, name);
}

function nullableSafeInteger(value: unknown, name: string): number | null {
  return value === null ? null : safeInteger(value, name);
}

function validateFormalCaseIdentity(record: StrictRecord, name: string): string {
  const identity = nonEmptyString(record.caseIdentity, `${name}.caseIdentity`);
  const caseIndex = safeInteger(record.caseIndex, `${name}.caseIndex`);
  const expectedCaseId = `formal-survival-bot-${String(caseIndex).padStart(3, '0')}`;
  if (record.caseId !== expectedCaseId) throw new Error(`${name}.caseId 与 formal manifest index 不一致。`);
  const fields = identity.split('|');
  if (fields.length !== 6
    || fields[0] !== String(record.seed)
    || fields[1] !== record.difficultyId
    || fields[2] !== record.inputPlanId
    || fields[3] === fields[4]
    || !isDeepStrictEqual([...fields.slice(3, 5)].sort(compareText), ['player-1', 'player-2'])
    || fields[5] !== (record.pauseAtTick === null ? 'none' : String(record.pauseAtTick))) {
    throw new Error(`${name}.caseIdentity 与 formal case manifest 字段不一致。`);
  }
  if (Object.hasOwn(record, 'playerParticipantId') || Object.hasOwn(record, 'botParticipantId')) {
    const playerParticipantId = nonEmptyString(record.playerParticipantId, `${name}.playerParticipantId`);
    const botParticipantId = nonEmptyString(record.botParticipantId, `${name}.botParticipantId`);
    if (fields[3] !== playerParticipantId || fields[4] !== botParticipantId) {
      throw new Error(`${name}.caseIdentity 与 formal role manifest 不一致。`);
    }
  }
  return identity;
}

function stringArray(
  value: unknown,
  name: string,
  options: { readonly sorted?: boolean; readonly unique?: boolean; readonly allowEmpty?: boolean } = {},
): readonly string[] {
  const array = strictArray(value, name).map((item, index) => nonEmptyString(item, `${name}[${index}]`));
  if (options.allowEmpty === false && array.length === 0) throw new RangeError(`${name} 不能为空。`);
  if (options.unique !== false && new Set(array).size !== array.length) {
    throw new RangeError(`${name} 不能包含重复项。`);
  }
  if (options.sorted && array.some((item, index) => index > 0 && array[index - 1]! >= item)) {
    throw new RangeError(`${name} 必须唯一且稳定排序。`);
  }
  return array;
}

function safeIntegerArray(
  value: unknown,
  name: string,
  options: { readonly sorted?: boolean; readonly unique?: boolean; readonly allowEmpty?: boolean } = {},
): readonly number[] {
  const array = strictArray(value, name).map((item, index) => safeInteger(item, `${name}[${index}]`));
  if (options.allowEmpty === false && array.length === 0) throw new RangeError(`${name} 不能为空。`);
  if (options.unique !== false && new Set(array).size !== array.length) {
    throw new RangeError(`${name} 不能包含重复项。`);
  }
  if (options.sorted && array.some((item, index) => index > 0 && array[index - 1]! >= item)) {
    throw new RangeError(`${name} 必须唯一且稳定排序。`);
  }
  return array;
}

function enumValue<T extends string>(value: unknown, values: readonly T[], name: string): T {
  if (typeof value !== 'string' || !(values as readonly string[]).includes(value)) {
    throw new RangeError(`${name} 不受支持。`);
  }
  return value as T;
}

function canonicalText(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalText).join(',')}]`;
  const record = value as StrictRecord;
  return `{${Object.keys(record).sort(compareText).map((key) => (
    `${JSON.stringify(key)}:${canonicalText(record[key])}`
  )).join(',')}}`;
}

function deterministicSha256(value: unknown): string {
  return createHash('sha256').update(canonicalText(value)).digest('hex');
}

function omitField(record: StrictRecord, omitted: string): Readonly<StrictRecord> {
  const result: StrictRecord = {};
  for (const key of Object.keys(record)) {
    if (key !== omitted) result[key] = record[key];
  }
  return Object.freeze(result);
}

function assertHash(value: unknown, expected: string, name: string): void {
  if (value !== expected) throw new Error(`${name} 与规范数据不一致。`);
}

function assertOrderedEqual(left: unknown, right: unknown, name: string): void {
  if (!isDeepStrictEqual(left, right)) throw new Error(`${name} 不一致。`);
}

export interface ArenaPa7FormalRequestV1 {
  readonly caseCount: typeof ARENA_PA7_FORMAL_CASE_COUNT;
  readonly uniqueSeedCount: typeof ARENA_PA7_FORMAL_UNIQUE_SEED_COUNT;
  readonly hardLimitTicks: typeof ARENA_PA7_FORMAL_HARD_LIMIT_TICKS;
  readonly doubleRunsPerCase: typeof ARENA_PA7_FORMAL_DOUBLE_RUN_COUNT;
}

export interface ArenaPa7FormalResourcePeakV1 {
  readonly observed: number;
  readonly limit: number;
}

export interface ArenaPa7FormalResourcePeaksV1 {
  readonly worldEquipmentCount: ArenaPa7FormalResourcePeakV1;
  readonly runtimeEquipmentCount: ArenaPa7FormalResourcePeakV1;
  readonly activeSupplyCount: ArenaPa7FormalResourcePeakV1;
  readonly eventsPerTick: ArenaPa7FormalResourcePeakV1;
  readonly eventWindowCount: ArenaPa7FormalResourcePeakV1;
  readonly readerCount: ArenaPa7FormalResourcePeakV1;
  readonly sessionCount: ArenaPa7FormalResourcePeakV1;
}

export interface ArenaPa7FormalCaseCleanupV1 {
  readonly sessionsCreated: number;
  readonly sessionDestroyAttempts: number;
  readonly sessionsDestroyed: number;
  readonly readersCreated: number;
  readonly readersInvalidated: number;
  readonly pendingCleanupCount: number;
  readonly cleanupErrorCount: number;
}

export interface ArenaPa7FormalLifecycleBoundaryV1 {
  readonly supplyIds: readonly string[];
  readonly waveEquipmentInstanceIds: readonly string[];
  readonly waveIndex: number;
  readonly spawnTick: number;
  readonly lifecycleOffset: number;
  readonly authorityTick: number;
  readonly snapshotTick: number;
  readonly snapshotEventSequence: number;
  readonly resyncReadiness: 'ready' | 'not-ready-pre-expiry';
  readonly pendingAuthorityTick: number | null;
  readonly pendingExpiryEquipmentInstanceIds: readonly string[];
  readonly worldEquipmentInstanceIds: readonly string[];
  readonly heldEquipmentInstanceIds: readonly string[];
  readonly retiredEquipmentInstanceIds: readonly string[];
  readonly activeSupplyEquipmentInstanceIds: readonly string[];
  readonly remainingTicks: readonly number[];
  readonly authorityEventTypes: readonly string[];
  readonly boundaryHash: string;
}

export interface ArenaPa7FormalLifecycleTraceV1 {
  readonly worldSnapshots: readonly unknown[];
  readonly authorityEvents: readonly unknown[];
}

export interface ArenaPa7FormalCaseEvidenceV1 {
  readonly schemaVersion: typeof ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION;
  readonly caseIndex: number;
  readonly caseId: string;
  readonly caseIdentity: string;
  readonly seed: number;
  readonly difficultyId: string;
  readonly inputPlanId: string;
  readonly pauseAtTick: number | null;
  readonly doubleRunCount: typeof ARENA_PA7_FORMAL_DOUBLE_RUN_COUNT;
  readonly finalTick: number;
  readonly inputFrameSequenceHash: string;
  readonly authorityEventSequenceHash: string;
  readonly worldSnapshotSequenceHash: string;
  readonly checkpointSequenceHash: string;
  readonly replayV5Hash: string;
  readonly resultHash: string;
  readonly stateHashSequenceHash: string;
  readonly finalHash: string;
  readonly fullAuditCount: number;
  readonly requiredEventTypeCounts: Readonly<Record<string, number>>;
  readonly equipmentDespawnReasonCounts: Readonly<Record<string, number>>;
  readonly lifecycleBoundaries: readonly ArenaPa7FormalLifecycleBoundaryV1[];
  readonly resourcePeaks: ArenaPa7FormalResourcePeaksV1;
  readonly cleanup: ArenaPa7FormalCaseCleanupV1;
  readonly caseEvidenceHash: string;
}

const REQUEST_KEYS = ['caseCount', 'uniqueSeedCount', 'hardLimitTicks', 'doubleRunsPerCase'] as const;
const RESOURCE_NAMES = [
  'worldEquipmentCount', 'runtimeEquipmentCount', 'activeSupplyCount', 'eventsPerTick',
  'eventWindowCount', 'readerCount', 'sessionCount',
] as const;
const RESOURCE_PEAK_KEYS = ['observed', 'limit'] as const;
const CASE_CLEANUP_KEYS = [
  'sessionsCreated', 'sessionDestroyAttempts', 'sessionsDestroyed', 'readersCreated',
  'readersInvalidated', 'pendingCleanupCount', 'cleanupErrorCount',
] as const;
const BOUNDARY_KEYS = [
  'supplyIds', 'waveEquipmentInstanceIds', 'waveIndex', 'spawnTick', 'lifecycleOffset', 'authorityTick', 'snapshotTick',
  'snapshotEventSequence', 'resyncReadiness', 'pendingAuthorityTick',
  'pendingExpiryEquipmentInstanceIds', 'worldEquipmentInstanceIds',
  'heldEquipmentInstanceIds', 'retiredEquipmentInstanceIds',
  'activeSupplyEquipmentInstanceIds', 'remainingTicks',
  'authorityEventTypes', 'boundaryHash',
] as const;
const LIFECYCLE_TRACE_KEYS = ['worldSnapshots', 'authorityEvents'] as const;
const CASE_KEYS = [
  'schemaVersion', 'caseIndex', 'caseId', 'caseIdentity', 'seed', 'difficultyId', 'inputPlanId',
  'pauseAtTick', 'doubleRunCount', 'finalTick', 'inputFrameSequenceHash',
  'authorityEventSequenceHash', 'worldSnapshotSequenceHash', 'checkpointSequenceHash',
  'replayV5Hash', 'resultHash', 'stateHashSequenceHash', 'finalHash',
  'fullAuditCount', 'requiredEventTypeCounts', 'equipmentDespawnReasonCounts',
  'lifecycleBoundaries', 'resourcePeaks', 'cleanup', 'caseEvidenceHash',
] as const;

function validateRequest(value: unknown, name: string): ArenaPa7FormalRequestV1 {
  const record = strictRecord(value, REQUEST_KEYS, name);
  if (record.caseCount !== ARENA_PA7_FORMAL_CASE_COUNT
    || record.uniqueSeedCount !== ARENA_PA7_FORMAL_UNIQUE_SEED_COUNT
    || record.hardLimitTicks !== ARENA_PA7_FORMAL_HARD_LIMIT_TICKS
    || record.doubleRunsPerCase !== ARENA_PA7_FORMAL_DOUBLE_RUN_COUNT) {
    throw new RangeError(`${name} 必须精确为 300/120/2500/double-run=2。`);
  }
  return record as unknown as ArenaPa7FormalRequestV1;
}

function validateCountRecord(value: unknown, keys: readonly string[], name: string): StrictRecord {
  const record = strictRecord(value, keys, name);
  for (const key of keys) safeInteger(record[key], `${name}.${key}`);
  return record;
}

function validateResourcePeaks(value: unknown, name: string): ArenaPa7FormalResourcePeaksV1 {
  const record = strictRecord(value, RESOURCE_NAMES, name);
  for (const resource of RESOURCE_NAMES) {
    const peak = strictRecord(record[resource], RESOURCE_PEAK_KEYS, `${name}.${resource}`);
    const observed = safeInteger(peak.observed, `${name}.${resource}.observed`);
    const limit = safeInteger(peak.limit, `${name}.${resource}.limit`, 1);
    if (observed > limit) throw new RangeError(`${name}.${resource} 超过 derived limit。`);
  }
  return record as unknown as ArenaPa7FormalResourcePeaksV1;
}

function validateCaseCleanup(value: unknown, name: string): ArenaPa7FormalCaseCleanupV1 {
  const record = validateCountRecord(value, CASE_CLEANUP_KEYS, name);
  const created = record.sessionsCreated as number;
  const attempts = record.sessionDestroyAttempts as number;
  const destroyed = record.sessionsDestroyed as number;
  const readersCreated = record.readersCreated as number;
  const readersInvalidated = record.readersInvalidated as number;
  if (created < 1 || created !== destroyed || attempts < destroyed
    || readersCreated !== readersInvalidated
    || record.pendingCleanupCount !== 0 || record.cleanupErrorCount !== 0) {
    throw new Error(`${name} 资源守恒或 cleanup-zero 不成立。`);
  }
  return record as unknown as ArenaPa7FormalCaseCleanupV1;
}

function validateLifecycleBoundary(value: unknown, name: string): ArenaPa7FormalLifecycleBoundaryV1 {
  const record = strictRecord(value, BOUNDARY_KEYS, name);
  const supplyIds = stringArray(record.supplyIds, `${name}.supplyIds`, {
    sorted: true,
    allowEmpty: false,
  });
  const waveEquipmentIds = stringArray(
    record.waveEquipmentInstanceIds,
    `${name}.waveEquipmentInstanceIds`,
    { sorted: true, allowEmpty: false },
  );
  if (supplyIds.length !== 3 || waveEquipmentIds.length !== 3) {
    throw new Error(`${name} 每波必须精确包含 3 个 supply/equipment identity。`);
  }
  const waveIndex = safeInteger(record.waveIndex, `${name}.waveIndex`);
  if (waveIndex > 1) throw new RangeError(`${name}.waveIndex 仅允许 0/1。`);
  const spawnTick = safeInteger(record.spawnTick, `${name}.spawnTick`);
  const expectedSpawnTick = waveIndex === 0 ? 1_200 : 2_400;
  if (spawnTick !== expectedSpawnTick) throw new Error(`${name}.spawnTick 与 waveIndex 不一致。`);
  const lifecycleOffset = safeInteger(record.lifecycleOffset, `${name}.lifecycleOffset`);
  const allowedOffsets = waveIndex === 0 ? [599, 600, 601] : [0, 1];
  if (!allowedOffsets.includes(lifecycleOffset)) {
    throw new RangeError(`${name}.lifecycleOffset 超出 hard-limit 可证明范围。`);
  }
  const authorityTick = safeInteger(record.authorityTick, `${name}.authorityTick`);
  const snapshotTick = safeInteger(record.snapshotTick, `${name}.snapshotTick`);
  if (authorityTick !== spawnTick + lifecycleOffset || snapshotTick !== authorityTick) {
    throw new Error(`${name} authority/snapshot tick identity 不一致。`);
  }
  safeInteger(record.snapshotEventSequence, `${name}.snapshotEventSequence`);
  const readiness = enumValue(
    record.resyncReadiness,
    ['ready', 'not-ready-pre-expiry'] as const,
    `${name}.resyncReadiness`,
  );
  const pendingAuthorityTick = nullableSafeInteger(record.pendingAuthorityTick, `${name}.pendingAuthorityTick`);
  const pending = stringArray(record.pendingExpiryEquipmentInstanceIds, `${name}.pending`, { sorted: true });
  const world = stringArray(record.worldEquipmentInstanceIds, `${name}.world`, { sorted: true });
  const held = stringArray(record.heldEquipmentInstanceIds, `${name}.held`, { sorted: true });
  const retired = stringArray(record.retiredEquipmentInstanceIds, `${name}.retired`, { sorted: true });
  const active = stringArray(record.activeSupplyEquipmentInstanceIds, `${name}.active`, { sorted: true });
  const remaining = safeIntegerArray(record.remainingTicks, `${name}.remainingTicks`, { unique: false });
  const eventTypes = stringArray(record.authorityEventTypes, `${name}.authorityEventTypes`, { unique: true });
  if (eventTypes.some((eventType) => !EVENT_TYPE_SET.has(eventType))) {
    throw new RangeError(`${name}.authorityEventTypes 包含 schedule 外事件。`);
  }
  if (readiness === 'ready') {
    if (pendingAuthorityTick !== null || pending.length !== 0) {
      throw new Error(`${name} ready 与 pending identity 不一致。`);
    }
  } else if (pendingAuthorityTick !== snapshotTick || pending.length === 0) {
    throw new Error(`${name} pending/not-ready identity 不一致。`);
  }
  for (const [field, ids] of [
    ['pending', pending], ['world', world], ['held', held], ['retired', retired], ['active', active],
  ] as const) {
    if (ids.some((id) => !waveEquipmentIds.includes(id))) {
      throw new Error(`${name}.${field} 必须属于本波 waveEquipmentInstanceIds。`);
    }
  }
  const classified = [pending, world, held, retired];
  for (let left = 0; left < classified.length; left += 1) {
    for (let right = left + 1; right < classified.length; right += 1) {
      if (classified[left]!.some((id) => classified[right]!.includes(id))) {
        throw new Error(`${name} pending/world/held/retired 必须两两互斥。`);
      }
    }
  }
  if (waveIndex === 0 && lifecycleOffset === 599) {
    const classifiedWave = [...world, ...held, ...retired].sort(compareText);
    if (readiness !== 'ready'
      || !isDeepStrictEqual(world, active)
      || !isDeepStrictEqual(classifiedWave, waveEquipmentIds)
      || remaining.length !== active.length || remaining.some((ticks) => ticks !== 1)) {
      throw new Error(`${name} +599 必须证明 wave=world⊎held⊎retired、active=world 且 remaining=1。`);
    }
  }
  if (waveIndex === 0 && lifecycleOffset === 600) {
    const classifiedWave = [...pending, ...held, ...retired].sort(compareText);
    if (active.length !== 0 || remaining.length !== 0 || world.length !== 0
      || !isDeepStrictEqual(classifiedWave, waveEquipmentIds)) {
      throw new Error(`${name} +600 必须证明 wave=pending⊎held⊎retired 且 world/active 为空。`);
    }
    if (pending.length > 0) {
      if (readiness !== 'not-ready-pre-expiry' || pendingAuthorityTick !== snapshotTick
        || !eventTypes.includes('EquipmentExpired')) {
        throw new Error(`${name} +600 pending 非空时必须 not-ready 并有精确 expiry。`);
      }
    } else if (readiness !== 'ready' || pendingAuthorityTick !== null
      || eventTypes.includes('EquipmentExpired')) {
      throw new Error(`${name} +600 pending 空时必须 ready 且不得有 EquipmentExpired。`);
    }
  }
  if (waveIndex === 0 && lifecycleOffset === 601) {
    const classifiedWave = [...held, ...retired].sort(compareText);
    if (readiness !== 'ready' || pending.length !== 0 || active.length !== 0
      || world.length !== 0 || remaining.length !== 0
      || !isDeepStrictEqual(classifiedWave, waveEquipmentIds)
      || eventTypes.includes('EquipmentExpired')) {
      throw new Error(`${name} +601 必须证明 wave=held⊎retired、ready 且不得重复 expiry。`);
    }
  }
  if (waveIndex === 1 && lifecycleOffset === 0) {
    if (readiness !== 'ready' || pending.length !== 0 || world.length !== 0
      || held.length !== 0 || retired.length !== 0 || active.length !== 0 || remaining.length !== 0
      || eventTypes.includes('EquipmentSpawned')) {
      throw new Error(`${name} 第二波 offset=0 必须是 spawn 前空快照。`);
    }
  }
  if (waveIndex === 1 && lifecycleOffset === 1) {
    const classifiedWave = [...world, ...held, ...retired].sort(compareText);
    if (readiness !== 'ready' || pending.length !== 0
      || !isDeepStrictEqual(classifiedWave, waveEquipmentIds)
      || !isDeepStrictEqual(world, active)
      || remaining.length !== active.length || remaining.some((ticks) => ticks !== 599)
      || !eventTypes.includes('EquipmentSpawned')) {
      throw new Error(`${name} 第二波 offset=1 必须证明 3 个 spawn 身份、wave 分区与 active remaining=599。`);
    }
  }
  sha256Hash(record.boundaryHash, `${name}.boundaryHash`);
  const expectedHash = deterministicSha256(omitField(record, 'boundaryHash'));
  assertHash(record.boundaryHash, expectedHash, `${name}.boundaryHash`);
  return record as unknown as ArenaPa7FormalLifecycleBoundaryV1;
}

export function createArenaPa7FormalLifecycleBoundaryHashV1(value: unknown): string {
  const source = cloneArenaPa7FormalStrictDataV1(value, 'PA7 lifecycle boundary hash input');
  const record = strictRecord(source, BOUNDARY_KEYS.filter((key) => key !== 'boundaryHash'), 'PA7 lifecycle boundary hash input');
  return deterministicSha256(record);
}

function validateLifecycleSet(value: unknown, name: string): readonly ArenaPa7FormalLifecycleBoundaryV1[] {
  const array = strictArray(value, name).map((item, index) => (
    validateLifecycleBoundary(item, `${name}[${index}]`)
  ));
  const expected = ['0:599', '0:600', '0:601', '1:0', '1:1'];
  if (array.length !== expected.length) throw new Error(`${name} 必须精确包含 5 个有序边界。`);
  for (let index = 0; index < expected.length; index += 1) {
    const boundary = array[index]!;
    if (`${boundary.waveIndex}:${boundary.lifecycleOffset}` !== expected[index]) {
      throw new Error(`${name} 必须按 ${expected.join(',')} 固定顺序。`);
    }
    if (index > 0 && boundary.snapshotEventSequence < array[index - 1]!.snapshotEventSequence) {
      throw new Error(`${name}.snapshotEventSequence 不得回退。`);
    }
  }
  const firstWave = array.slice(0, 3);
  const secondWave = array.slice(3);
  for (const wave of [firstWave, secondWave]) {
    if (wave.some((boundary) => (
      !isDeepStrictEqual(boundary.supplyIds, wave[0]!.supplyIds)
      || !isDeepStrictEqual(boundary.waveEquipmentInstanceIds, wave[0]!.waveEquipmentInstanceIds)
    ))) {
      throw new Error(`${name} 每波 supplyIds/waveEquipmentInstanceIds 必须保持一致。`);
    }
  }
  const firstWaveWorld = firstWave[0]!.worldEquipmentInstanceIds;
  const pendingAt600 = firstWave[1]!.pendingExpiryEquipmentInstanceIds;
  if (pendingAt600.some((id) => !firstWaveWorld.includes(id))) {
    throw new Error(`${name} 首波 +600 pending 必须是 +599 world 的子集。`);
  }
  const explainedAt600 = new Set([
    ...pendingAt600,
    ...firstWave[1]!.heldEquipmentInstanceIds,
    ...firstWave[1]!.retiredEquipmentInstanceIds,
  ]);
  if (firstWaveWorld.some((id) => !explainedAt600.has(id))) {
    throw new Error(`${name} 首波 +599 world 到 +600 的迁移必须由 pending/held/retired 解释。`);
  }
  for (let index = 1; index < firstWave.length; index += 1) {
    const previousRetired = firstWave[index - 1]!.retiredEquipmentInstanceIds;
    const currentRetired = firstWave[index]!.retiredEquipmentInstanceIds;
    if (previousRetired.some((id) => !currentRetired.includes(id))) {
      throw new Error(`${name} retired 集合必须单调且不得复活。`);
    }
  }
  if (pendingAt600.some((id) => !firstWave[2]!.retiredEquipmentInstanceIds.includes(id))) {
    throw new Error(`${name} +600 pending 必须在 +601 由 expiry 进入 retired。`);
  }
  const firstWaveAll = firstWave[0]!.waveEquipmentInstanceIds;
  const secondWaveIds = secondWave[0]!.waveEquipmentInstanceIds;
  if (firstWaveAll.some((id) => secondWaveIds.includes(id))) {
    throw new Error(`${name} 两波 equipment instance 集合不得重叠。`);
  }
  if (firstWave[0]!.supplyIds.some((id) => secondWave[0]!.supplyIds.includes(id))) {
    throw new Error(`${name} 两波 supplyId 集合不得重叠。`);
  }
  return array;
}

function validateCaseEvidenceCloned(value: unknown, name: string): ArenaPa7FormalCaseEvidenceV1 {
  const record = strictRecord(value, CASE_KEYS, name);
  if (record.schemaVersion !== ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION) {
    throw new RangeError(`${name}.schemaVersion 不受支持。`);
  }
  safeInteger(record.caseIndex, `${name}.caseIndex`);
  if ((record.caseIndex as number) >= ARENA_PA7_FORMAL_CASE_COUNT) {
    throw new RangeError(`${name}.caseIndex 必须位于 0..299。`);
  }
  nonEmptyString(record.caseId, `${name}.caseId`);
  safeInteger(record.seed, `${name}.seed`);
  if ((record.seed as number) > 0xffffffff) throw new RangeError(`${name}.seed 必须是 uint32。`);
  nonEmptyString(record.difficultyId, `${name}.difficultyId`);
  nonEmptyString(record.inputPlanId, `${name}.inputPlanId`);
  const pauseAtTick = nullableSafeInteger(record.pauseAtTick, `${name}.pauseAtTick`);
  if (pauseAtTick !== null && pauseAtTick >= ARENA_PA7_FORMAL_HARD_LIMIT_TICKS) {
    throw new RangeError(`${name}.pauseAtTick 必须早于 hard limit。`);
  }
  validateFormalCaseIdentity(record, name);
  if (record.doubleRunCount !== ARENA_PA7_FORMAL_DOUBLE_RUN_COUNT) {
    throw new RangeError(`${name}.doubleRunCount 必须为 2。`);
  }
  const finalTick = safeInteger(record.finalTick, `${name}.finalTick`, 2_401);
  if (finalTick > ARENA_PA7_FORMAL_HARD_LIMIT_TICKS) throw new RangeError(`${name}.finalTick 越界。`);
  for (const key of [
    'inputFrameSequenceHash', 'authorityEventSequenceHash', 'worldSnapshotSequenceHash',
    'checkpointSequenceHash', 'replayV5Hash', 'resultHash', 'stateHashSequenceHash',
  ] as const) sha256Hash(record[key], `${name}.${key}`);
  dataHash(record.finalHash, `${name}.finalHash`);
  safeInteger(record.fullAuditCount, `${name}.fullAuditCount`, 1);
  const events = validateCountRecord(record.requiredEventTypeCounts, EVENT_TYPES, `${name}.requiredEventTypeCounts`);
  if (events.MatchStarted !== 1 || events.MatchEnded !== 1
    || events.EquipmentSpawned !== 6) {
    throw new Error(`${name} 必须精确证明一个 MatchStarted/MatchEnded 与双波各三次 spawn。`);
  }
  validateCountRecord(record.equipmentDespawnReasonCounts, DESPAWN_REASONS, `${name}.equipmentDespawnReasonCounts`);
  validateLifecycleSet(record.lifecycleBoundaries, `${name}.lifecycleBoundaries`);
  const peaks = validateResourcePeaks(record.resourcePeaks, `${name}.resourcePeaks`);
  const cleanup = validateCaseCleanup(record.cleanup, `${name}.cleanup`);
  if (cleanup.sessionsCreated !== peaks.sessionCount.observed * ARENA_PA7_FORMAL_DOUBLE_RUN_COUNT
    || cleanup.readersCreated !== peaks.readerCount.observed * ARENA_PA7_FORMAL_DOUBLE_RUN_COUNT) {
    throw new Error(`${name} resource peaks 与 double-run cleanup 不一致。`);
  }
  sha256Hash(record.caseEvidenceHash, `${name}.caseEvidenceHash`);
  assertHash(
    record.caseEvidenceHash,
    deterministicSha256(omitField(record, 'caseEvidenceHash')),
    `${name}.caseEvidenceHash`,
  );
  return record as unknown as ArenaPa7FormalCaseEvidenceV1;
}

export function validateArenaPa7FormalCaseEvidenceV1(value: unknown): ArenaPa7FormalCaseEvidenceV1 {
  const source = cloneArenaPa7FormalStrictDataV1(value, 'ArenaPa7FormalCaseEvidenceV1');
  return validateCaseEvidenceCloned(source, 'ArenaPa7FormalCaseEvidenceV1');
}

export function assertArenaPa7FormalCaseEvidenceV1(
  value: unknown,
): asserts value is ArenaPa7FormalCaseEvidenceV1 {
  validateArenaPa7FormalCaseEvidenceV1(value);
}

export function createArenaPa7FormalCaseEvidenceHashV1(value: unknown): string {
  const source = cloneArenaPa7FormalStrictDataV1(value, 'PA7 case evidence hash input');
  const record = strictRecord(source, CASE_KEYS.filter((key) => key !== 'caseEvidenceHash'), 'PA7 case evidence hash input');
  return deterministicSha256(record);
}

export interface ArenaPa7FormalCaseRunV1 {
  readonly schemaVersion: typeof ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION;
  readonly caseIndex: number;
  readonly caseId: string;
  readonly caseIdentity: string;
  readonly seed: number;
  readonly difficultyId: string;
  readonly inputPlanId: string;
  readonly pauseAtTick: number | null;
  readonly playerParticipantId: string;
  readonly botParticipantId: string;
  readonly finalTick: number;
  readonly inputFrames: readonly unknown[];
  readonly authorityEvents: readonly unknown[];
  readonly worldSnapshots: readonly unknown[];
  readonly fullAuditTicks: readonly number[];
  readonly fullAuditCount: number;
  readonly checkpoints: readonly unknown[];
  readonly replayV5: Readonly<StrictRecord>;
  readonly result: Readonly<StrictRecord>;
  readonly finalHash: string;
  readonly lifecycleBoundaries: readonly ArenaPa7FormalLifecycleBoundaryV1[];
  readonly resourcePeaks: ArenaPa7FormalResourcePeaksV1;
  readonly cleanup: ArenaPa7FormalCaseCleanupV1;
}

export interface ArenaPa7FormalDoubleRunSummaryV1 {
  readonly caseIndex: number;
  readonly caseId: string;
  readonly caseIdentity: string;
  readonly seed: number;
  readonly difficultyId: string;
  readonly inputPlanId: string;
  readonly pauseAtTick: number | null;
  readonly finalTick: number;
  readonly fullAuditCount: number;
  readonly requiredEventTypeCounts: Readonly<Record<string, number>>;
  readonly equipmentDespawnReasonCounts: Readonly<Record<string, number>>;
  readonly inputFrameSequenceHash: string;
  readonly authorityEventSequenceHash: string;
  readonly worldSnapshotSequenceHash: string;
  readonly checkpointSequenceHash: string;
  readonly replayV5Hash: string;
  readonly resultHash: string;
  readonly stateHashSequenceHash: string;
  readonly finalHash: string;
  readonly lifecycleBoundaries: readonly ArenaPa7FormalLifecycleBoundaryV1[];
  readonly resourcePeaks: ArenaPa7FormalResourcePeaksV1;
  readonly cleanup: ArenaPa7FormalCaseCleanupV1;
}

const DOUBLE_RUN_SUMMARY_KEYS = [
  'caseIndex', 'caseId', 'caseIdentity', 'seed', 'difficultyId', 'inputPlanId', 'pauseAtTick',
  'finalTick', 'fullAuditCount', 'requiredEventTypeCounts', 'equipmentDespawnReasonCounts',
  'inputFrameSequenceHash', 'authorityEventSequenceHash',
  'worldSnapshotSequenceHash', 'checkpointSequenceHash', 'replayV5Hash', 'resultHash',
  'stateHashSequenceHash', 'finalHash', 'lifecycleBoundaries', 'resourcePeaks', 'cleanup',
] as const;

const CASE_RUN_KEYS = [
  'schemaVersion', 'caseIndex', 'caseId', 'caseIdentity', 'seed', 'difficultyId', 'inputPlanId',
  'pauseAtTick', 'playerParticipantId', 'botParticipantId', 'finalTick', 'inputFrames',
  'authorityEvents', 'worldSnapshots', 'fullAuditTicks',
  'fullAuditCount', 'checkpoints', 'replayV5', 'result', 'finalHash',
  'lifecycleBoundaries', 'resourcePeaks', 'cleanup',
] as const;

const INPUT_FRAME_KEYS = [
  'tick', 'participantId', 'moveX', 'moveZ', 'primaryPressed', 'primaryHeld',
  'jumpPressed', 'jumpHeld', 'slamPressed',
] as const;
const AUTHORITY_EVENT_IDENTITY_KEYS = ['id', 'sequence', 'tick', 'type'] as const;
const STATE_HASH_KEYS = ['tick', 'hash'] as const;

function sortedStrings(values: Iterable<string>): readonly string[] {
  return Object.freeze([...values].sort(compareText));
}

function deriveLifecycleBoundaries(
  snapshots: readonly ReturnType<typeof createWorldSnapshotV2Audit>[],
  events: readonly unknown[],
  eventsByAuthorityTick: ReadonlyMap<number, readonly unknown[]>,
  name: string,
): readonly ArenaPa7FormalLifecycleBoundaryV1[] {
  const wavePayloads = [1_200, 2_400].map((spawnTick, waveIndex) => {
    const payloads = events.filter((event) => {
      const record = event as StrictRecord;
      return record.type === 'EquipmentSpawned' && record.tick === spawnTick;
    }).map((event, index) => {
      const record = event as StrictRecord;
      if (!Object.hasOwn(record, 'payload')) {
        throw new TypeError(`${name}.wave${waveIndex}.EquipmentSpawned[${index}] 缺少 payload。`);
      }
      return createEquipmentSpawnedEventPayload(record.payload);
    }).sort((left, right) => compareText(left.supplyId, right.supplyId));
    if (payloads.length !== 3
      || new Set(payloads.map(({ supplyId }) => supplyId)).size !== 3
      || new Set(payloads.map(({ equipmentInstanceId }) => equipmentInstanceId)).size !== 3) {
      throw new Error(`${name}.wave${waveIndex} 必须由 3 个唯一 EquipmentSpawned payload 定义。`);
    }
    return Object.freeze(payloads);
  });

  const specs = [
    { waveIndex: 0, lifecycleOffset: 599 },
    { waveIndex: 0, lifecycleOffset: 600 },
    { waveIndex: 0, lifecycleOffset: 601 },
    { waveIndex: 1, lifecycleOffset: 0 },
    { waveIndex: 1, lifecycleOffset: 1 },
  ] as const;
  const retiredAtSnapshot = (
    snapshotTick: number,
    waveIdSet: ReadonlySet<string>,
  ): readonly string[] => {
    const retired = new Set<string>();
    for (const [index, event] of events.entries()) {
      const record = event as StrictRecord;
      const eventTick = safeInteger(record.tick, `${name}.authorityEvents[${index}].tick`);
      if (eventTick >= snapshotTick) continue;
      let retiredId: string | null = null;
      if (record.type === 'EquipmentRecycled') {
        if (!Object.hasOwn(record, 'payload')) {
          throw new TypeError(`${name}.EquipmentRecycled[${index}] 缺少 payload。`);
        }
        retiredId = createEquipmentRecycledEventPayload(record.payload).recycledEquipmentInstanceId;
      } else if (record.type === 'EquipmentExpired') {
        if (!Object.hasOwn(record, 'payload')) {
          throw new TypeError(`${name}.EquipmentExpired[${index}] 缺少 payload。`);
        }
        retiredId = createEquipmentExpiredEventPayload(record.payload).expiredEquipmentInstanceId;
      } else if (record.type === 'EquipmentDespawned') {
        retiredId = nonEmptyString(
          record.equipmentInstanceId,
          `${name}.EquipmentDespawned[${index}].equipmentInstanceId`,
        );
      }
      if (retiredId !== null && waveIdSet.has(retiredId)) retired.add(retiredId);
    }
    return sortedStrings(retired);
  };
  const boundaries = specs.map(({ waveIndex, lifecycleOffset }) => {
    const spawnTick = waveIndex === 0 ? 1_200 : 2_400;
    const snapshotTick = spawnTick + lifecycleOffset;
    const snapshot = snapshots[snapshotTick];
    if (snapshot === undefined || snapshot.activeSupplyProjection === null) {
      throw new Error(`${name} 缺少 tick${snapshotTick} 正式 supply projection。`);
    }
    const payloads = wavePayloads[waveIndex]!;
    const supplyIds = sortedStrings(payloads.map(({ supplyId }) => supplyId));
    const waveEquipmentInstanceIds = sortedStrings(
      payloads.map(({ equipmentInstanceId }) => equipmentInstanceId),
    );
    const waveIdSet = new Set(waveEquipmentInstanceIds);
    const worldEquipmentInstanceIds = sortedStrings(snapshot.equipment
      .filter(({ instanceId, locationState }) => (
        waveIdSet.has(instanceId) && (locationState === 'spawned' || locationState === 'dropped')
      ))
      .map(({ instanceId }) => instanceId));
    const heldEquipmentInstanceIds = sortedStrings(snapshot.equipment
      .filter(({ instanceId, locationState }) => waveIdSet.has(instanceId) && locationState === 'held')
      .map(({ instanceId }) => instanceId));
    const retiredEquipmentInstanceIds = retiredAtSnapshot(snapshotTick, waveIdSet);
    const projection = snapshot.activeSupplyProjection;
    const activeSupplies = projection.supplies.filter(({ equipmentInstanceId }) => (
      waveIdSet.has(equipmentInstanceId)
    ));
    if (activeSupplies.length !== projection.supplies.length) {
      throw new Error(`${name} lifecycle boundary 不接受跨波 active supply。`);
    }
    const activeSupplyEquipmentInstanceIds = sortedStrings(
      activeSupplies.map(({ equipmentInstanceId }) => equipmentInstanceId),
    );
    const remainingById = new Map(
      activeSupplies.map(({ equipmentInstanceId, remainingTicks }) => [equipmentInstanceId, remainingTicks]),
    );
    const remainingTicks = Object.freeze(activeSupplyEquipmentInstanceIds.map((id) => remainingById.get(id)!));
    const pendingExpiryEquipmentInstanceIds = sortedStrings(
      projection.pendingExpiryEquipmentInstanceIds.filter((id) => waveIdSet.has(id)),
    );
    if (pendingExpiryEquipmentInstanceIds.length !== projection.pendingExpiryEquipmentInstanceIds.length) {
      throw new Error(`${name} lifecycle boundary 不接受跨波 pending expiry。`);
    }
    const eventTick = waveIndex === 0 && (lifecycleOffset === 600 || lifecycleOffset === 601)
      ? snapshotTick
      : Math.max(0, snapshotTick - 1);
    const boundaryEvents = eventsByAuthorityTick.get(eventTick) ?? [];
    const authorityEventTypes = Object.freeze([...new Set(boundaryEvents.map((event) => (
      nonEmptyString((event as StrictRecord).type, `${name}.boundary event type`)
    )))]);
    if (waveIndex === 0 && lifecycleOffset === 600) {
      const expiryPayloads = boundaryEvents.filter((event) => (
        (event as StrictRecord).type === 'EquipmentExpired'
      )).map((event, index) => {
        const record = event as StrictRecord;
        if (!Object.hasOwn(record, 'payload')) {
          throw new TypeError(`${name}.EquipmentExpired[${index}] 缺少 payload。`);
        }
        return createEquipmentExpiredEventPayload(record.payload);
      });
      const expiredIds = sortedStrings(expiryPayloads.map(({ expiredEquipmentInstanceId }) => (
        expiredEquipmentInstanceId
      )));
      if (!isDeepStrictEqual(expiredIds, pendingExpiryEquipmentInstanceIds)) {
        throw new Error(`${name} EquipmentExpired payload 必须精确覆盖 +600 pending 集合。`);
      }
      for (const payload of expiryPayloads) {
        const spawn = payloads.find(({ equipmentInstanceId }) => (
          equipmentInstanceId === payload.equipmentInstanceId
        ));
        if (spawn === undefined || payload.expiredEquipmentInstanceId !== payload.equipmentInstanceId
          || payload.supplyId !== spawn.supplyId || payload.spawnTick !== spawn.spawnTick
          || payload.expireTick !== snapshotTick) {
          throw new Error(`${name} EquipmentExpired payload 与本波 spawn identity 不一致。`);
        }
      }
    }
    const withoutHash = Object.freeze({
      supplyIds,
      waveEquipmentInstanceIds,
      waveIndex,
      spawnTick,
      lifecycleOffset,
      authorityTick: snapshotTick,
      snapshotTick,
      snapshotEventSequence: snapshot.eventSequence,
      resyncReadiness: projection.resyncReadiness,
      pendingAuthorityTick: projection.pendingAuthorityTick,
      pendingExpiryEquipmentInstanceIds,
      worldEquipmentInstanceIds,
      heldEquipmentInstanceIds,
      retiredEquipmentInstanceIds,
      activeSupplyEquipmentInstanceIds,
      remainingTicks,
      authorityEventTypes,
    });
    return Object.freeze({
      ...withoutHash,
      boundaryHash: createArenaPa7FormalLifecycleBoundaryHashV1(withoutHash),
    });
  });
  return validateLifecycleSet(boundaries, `${name}.derivedLifecycleBoundaries`);
}

/**
 * Produces the lifecycle proof consumed by a PA7 case run from the same full
 * World/Replay trace that the validator later re-derives. Keeping this producer
 * beside the validator prevents the formal runner from copying lifecycle rules.
 */
export function createArenaPa7FormalLifecycleBoundariesV1(
  value: unknown,
): readonly ArenaPa7FormalLifecycleBoundaryV1[] {
  const source = cloneArenaPa7FormalStrictDataV1(value, 'PA7 lifecycle trace');
  const record = strictRecord(source, LIFECYCLE_TRACE_KEYS, 'PA7 lifecycle trace');
  const snapshotValues = strictArray(record.worldSnapshots, 'PA7 lifecycle trace.worldSnapshots');
  const events = strictArray(record.authorityEvents, 'PA7 lifecycle trace.authorityEvents');
  if (snapshotValues.length <= 2_401) {
    throw new RangeError('PA7 lifecycle trace 必须覆盖至少 tick0..2401。');
  }
  const snapshots = snapshotValues.map((snapshot, index) => {
    const audited = createWorldSnapshotV2Audit(snapshot);
    if (audited.tick !== index) {
      throw new Error('PA7 lifecycle trace.worldSnapshots tick 必须从 0 连续递增。');
    }
    return audited;
  });
  const eventsByAuthorityTick = new Map<number, unknown[]>();
  let previousSequence = -1;
  let previousTick = -1;
  for (const [index, event] of events.entries()) {
    if (event === null || typeof event !== 'object' || Array.isArray(event)) {
      throw new TypeError(`PA7 lifecycle trace.authorityEvents[${index}] 必须是普通对象。`);
    }
    const eventRecord = event as StrictRecord;
    for (const key of AUTHORITY_EVENT_IDENTITY_KEYS) {
      if (!Object.hasOwn(eventRecord, key)) {
        throw new TypeError(`PA7 lifecycle trace.authorityEvents[${index}] 缺少 ${key}。`);
      }
    }
    const sequence = safeInteger(
      eventRecord.sequence,
      `PA7 lifecycle trace.authorityEvents[${index}].sequence`,
    );
    if (sequence !== previousSequence + 1) {
      throw new Error('PA7 lifecycle trace.authorityEvents sequence 必须从 0 连续递增。');
    }
    previousSequence = sequence;
    const tick = safeInteger(
      eventRecord.tick,
      `PA7 lifecycle trace.authorityEvents[${index}].tick`,
    );
    if (tick < previousTick || tick >= snapshots.length) {
      throw new Error('PA7 lifecycle trace.authorityEvents tick 必须单调且位于 snapshot 范围内。');
    }
    previousTick = tick;
    const eventType = nonEmptyString(
      eventRecord.type,
      `PA7 lifecycle trace.authorityEvents[${index}].type`,
    );
    if (!EVENT_TYPE_SET.has(eventType)) {
      throw new RangeError('PA7 lifecycle trace.authorityEvents 包含 schedule 外事件。');
    }
    const bucket = eventsByAuthorityTick.get(tick) ?? [];
    bucket.push(event);
    eventsByAuthorityTick.set(tick, bucket);
  }
  let expectedEventSequence = 0;
  for (let tick = 0; tick < snapshots.length; tick += 1) {
    if (tick > 0) expectedEventSequence += (eventsByAuthorityTick.get(tick - 1) ?? []).length;
    if (snapshots[tick]!.eventSequence !== expectedEventSequence) {
      throw new Error('PA7 lifecycle trace.worldSnapshots eventSequence 与 authority events 不一致。');
    }
  }
  return Object.freeze([...deriveLifecycleBoundaries(
    snapshots,
    events,
    eventsByAuthorityTick,
    'PA7 lifecycle trace',
  )]);
}

function deriveResourceObservations(
  snapshots: readonly ReturnType<typeof createWorldSnapshotV2Audit>[],
  eventsByAuthorityTick: ReadonlyMap<number, readonly unknown[]>,
): Readonly<Record<typeof RESOURCE_NAMES[number], number>> {
  return Object.freeze({
    worldEquipmentCount: Math.max(...snapshots.map(({ equipment }) => equipment.filter(({ locationState }) => (
      locationState === 'spawned' || locationState === 'dropped'
    )).length)),
    runtimeEquipmentCount: Math.max(...snapshots.map(({ equipment }) => equipment.length)),
    activeSupplyCount: Math.max(...snapshots.map(({ activeSupplyProjection }) => (
      activeSupplyProjection?.supplies.length ?? 0
    ))),
    eventsPerTick: Math.max(0, ...[...eventsByAuthorityTick.values()].map((bucket) => bucket.length)),
    eventWindowCount: 0,
    readerCount: 0,
    sessionCount: 0,
  });
}

function mergeCaseCleanup(
  first: ArenaPa7FormalCaseCleanupV1,
  second: ArenaPa7FormalCaseCleanupV1,
): ArenaPa7FormalCaseCleanupV1 {
  return Object.freeze(Object.fromEntries(CASE_CLEANUP_KEYS.map((key) => [
    key,
    first[key] + second[key],
  ]))) as unknown as ArenaPa7FormalCaseCleanupV1;
}

function validateCaseRunCloned(value: unknown, name: string): ArenaPa7FormalCaseRunV1 {
  const record = strictRecord(value, CASE_RUN_KEYS, name);
  if (record.schemaVersion !== ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION) {
    throw new RangeError(`${name}.schemaVersion 不受支持。`);
  }
  safeInteger(record.caseIndex, `${name}.caseIndex`);
  if ((record.caseIndex as number) >= ARENA_PA7_FORMAL_CASE_COUNT) {
    throw new RangeError(`${name}.caseIndex 必须位于 0..299。`);
  }
  nonEmptyString(record.caseId, `${name}.caseId`);
  safeInteger(record.seed, `${name}.seed`);
  if ((record.seed as number) > 0xffffffff) throw new RangeError(`${name}.seed 必须是 uint32。`);
  nonEmptyString(record.difficultyId, `${name}.difficultyId`);
  nonEmptyString(record.inputPlanId, `${name}.inputPlanId`);
  nullableSafeInteger(record.pauseAtTick, `${name}.pauseAtTick`);
  const playerParticipantId = nonEmptyString(record.playerParticipantId, `${name}.playerParticipantId`);
  const botParticipantId = nonEmptyString(record.botParticipantId, `${name}.botParticipantId`);
  if (playerParticipantId === botParticipantId) throw new Error(`${name} player/bot participant 必须不同。`);
  validateFormalCaseIdentity(record, name);
  const finalTick = safeInteger(record.finalTick, `${name}.finalTick`, 2_401);
  if (finalTick > ARENA_PA7_FORMAL_HARD_LIMIT_TICKS) throw new RangeError(`${name}.finalTick 越界。`);
  const inputFrames = strictArray(record.inputFrames, `${name}.inputFrames`);
  const events = strictArray(record.authorityEvents, `${name}.authorityEvents`);
  const snapshotValues = strictArray(record.worldSnapshots, `${name}.worldSnapshots`);
  const checkpoints = strictArray(record.checkpoints, `${name}.checkpoints`);
  if (inputFrames.length === 0 || snapshotValues.length === 0 || checkpoints.length === 0) {
    throw new RangeError(`${name} 的 input/snapshot/checkpoint 序列不能为空。`);
  }
  const replay = validateArenaReplay(record.replayV5);
  if (record.seed !== replay.matchSeed) throw new Error(`${name}.seed 必须与 Replay.matchSeed 精确一致。`);
  const result = strictRecord(record.result, ['winnerId', 'reason', 'isDraw', 'endedAtTick'], `${name}.result`);
  nullableString(result.winnerId, `${name}.result.winnerId`);
  nonEmptyString(result.reason, `${name}.result.reason`);
  if (typeof result.isDraw !== 'boolean') throw new TypeError(`${name}.result.isDraw 必须是 boolean。`);
  const endedAtTick = safeInteger(result.endedAtTick, `${name}.result.endedAtTick`);
  if (endedAtTick !== finalTick - 1) {
    throw new Error(`${name}.result.endedAtTick 必须等于 post-step finalTick-1。`);
  }
  dataHash(record.finalHash, `${name}.finalHash`);
  if (replay.finalHash !== record.finalHash) throw new Error(`${name}.replayV5.finalHash 不一致。`);
  assertOrderedEqual(replay.inputFrames, inputFrames, `${name} Replay/InputFrame`);
  assertOrderedEqual(replay.events, events, `${name} Replay/events`);
  assertOrderedEqual(replay.checkpoints, checkpoints, `${name} Replay/checkpoints`);
  assertOrderedEqual(replay.result, result, `${name} Replay/result`);
  let previousSnapshotEventSequence = -1;
  let replayParticipantIds: readonly string[] | null = null;
  const replayConfig = replay.config as StrictRecord;
  if (Object.hasOwn(replayConfig, 'participantIds')) {
    replayParticipantIds = stringArray(
      replayConfig.participantIds,
      `${name}.replayV5.config.participantIds`,
      { allowEmpty: false },
    );
  }
  if (replayParticipantIds === null) {
    throw new Error(`${name}.replayV5.config 缺少 participantIds。`);
  }
  if (!isDeepStrictEqual(
    [...replayParticipantIds].sort(compareText),
    [playerParticipantId, botParticipantId].sort(compareText),
  )) throw new Error(`${name} formal role participants 与 Replay config 不一致。`);
  const snapshots = snapshotValues.map((snapshot, index) => {
    const audited = createWorldSnapshotV2Audit(snapshot);
    if (audited.tick !== index) throw new Error(`${name}.worldSnapshots tick 必须从 0 连续递增。`);
    if (audited.eventSequence < previousSnapshotEventSequence) {
      throw new Error(`${name}.worldSnapshots eventSequence 不得回退。`);
    }
    previousSnapshotEventSequence = audited.eventSequence;
    if (audited.authoritySchemaVersion !== replay.schemaVersion
      || audited.physicsBackendVersion !== replay.physicsBackendVersion
      || audited.configHash !== replay.configHash
      || audited.ruleContentHash !== replay.ruleContentHash
      || audited.matchSeed !== replay.matchSeed) {
      throw new Error(`${name}.worldSnapshots 与 Replay authority identity 不一致。`);
    }
    const snapshotParticipantIds = audited.participants.map(({ id }) => id);
    if (!isDeepStrictEqual(snapshotParticipantIds, replayParticipantIds)) {
      throw new Error(`${name}.worldSnapshots participant IDs/顺序与 Replay config 不一致。`);
    }
    if (index < finalTick && audited.result !== null) {
      throw new Error(`${name}.worldSnapshots 仅 finalTick 可携带 result。`);
    }
    return audited;
  });
  if (snapshots.length !== (record.finalTick as number) + 1) {
    throw new Error(`${name}.worldSnapshots 必须逐 tick 覆盖 0..finalTick。`);
  }
  const participantIds = snapshots[0]!.participants.map(({ id }) => id);
  const inputIdentity = new Set<string>();
  for (const [index, input] of inputFrames.entries()) {
    strictRecord(input, INPUT_FRAME_KEYS, `${name}.inputFrames[${index}]`);
    const inputRecord = input as StrictRecord;
    const tick = safeInteger(inputRecord.tick, `${name}.inputFrames[${index}].tick`);
    if (tick >= finalTick) throw new Error(`${name}.inputFrames tick 超出 authority step 范围。`);
    const participantId = nonEmptyString(inputRecord.participantId, `${name}.inputFrames[${index}].participantId`);
    const normalized = normalizeInputFrame(input, { expectedTick: tick, participantIds });
    assertOrderedEqual(normalized, input, `${name}.inputFrames[${index}] normalized identity`);
    const identity = `${tick}:${participantId}`;
    if (inputIdentity.has(identity)) throw new Error(`${name}.inputFrames 包含重复 tick/participant。`);
    inputIdentity.add(identity);
  }
  for (let tick = 0; tick < finalTick; tick += 1) {
    for (const participantId of participantIds) {
      if (!inputIdentity.has(`${tick}:${participantId}`)) {
        throw new Error(`${name}.inputFrames 缺少 tick ${tick} participant ${participantId}。`);
      }
    }
  }
  let previousEventSequence = -1;
  let previousEventTick = -1;
  const eventIds = new Set<string>();
  let matchStartedCount = 0;
  let matchEndedCount = 0;
  let firstWaveSpawnCount = 0;
  let secondWaveSpawnCount = 0;
  const eventsByAuthorityTick = new Map<number, unknown[]>();
  for (const [index, event] of events.entries()) {
    const eventRecord = event as StrictRecord;
    for (const key of AUTHORITY_EVENT_IDENTITY_KEYS) {
      if (!Object.hasOwn(eventRecord, key)) throw new TypeError(`${name}.authorityEvents[${index}] 缺少 ${key}。`);
    }
    const eventId = nonEmptyString(eventRecord.id, `${name}.authorityEvents[${index}].id`);
    if (eventIds.has(eventId)) throw new Error(`${name}.authorityEvents id 不能重复。`);
    eventIds.add(eventId);
    const sequence = safeInteger(eventRecord.sequence, `${name}.authorityEvents[${index}].sequence`);
    if (sequence !== previousEventSequence + 1) throw new Error(`${name}.authorityEvents sequence 必须从 0 连续递增。`);
    previousEventSequence = sequence;
    const tick = safeInteger(eventRecord.tick, `${name}.authorityEvents[${index}].tick`);
    if (tick >= finalTick) throw new Error(`${name}.authorityEvents tick 超出 authority step 范围。`);
    const eventType = nonEmptyString(eventRecord.type, `${name}.authorityEvents[${index}].type`);
    if (!EVENT_TYPE_SET.has(eventType)) {
      throw new RangeError(`${name}.authorityEvents[${index}].type 不在正式 schedule 集合。`);
    }
    if (eventType === 'MatchStarted') {
      matchStartedCount += 1;
      assertOrderedEqual(
        eventRecord.participantIds,
        replayParticipantIds,
        `${name}.MatchStarted participantIds`,
      );
    }
    if (eventType === 'MatchEnded') {
      matchEndedCount += 1;
      if (tick !== endedAtTick) throw new Error(`${name}.MatchEnded tick 必须等于 result.endedAtTick。`);
      for (const key of ['winnerId', 'reason', 'isDraw', 'endedAtTick'] as const) {
        if (!Object.hasOwn(eventRecord, key) || !isDeepStrictEqual(eventRecord[key], result[key])) {
          throw new Error(`${name}.MatchEnded.${key} 与 Replay result 不一致。`);
        }
      }
    }
    if (eventType === 'EquipmentSpawned') {
      if (tick === 1_200) firstWaveSpawnCount += 1;
      else if (tick === 2_400) secondWaveSpawnCount += 1;
      else throw new Error(`${name}.EquipmentSpawned 只允许出现在 tick1200/2400。`);
    }
    if (eventType === 'EquipmentDespawned') {
      nonEmptyString(
        eventRecord.equipmentInstanceId,
        `${name}.authorityEvents[${index}].equipmentInstanceId`,
      );
      if (typeof eventRecord.reason !== 'string' || !DESPAWN_REASON_SET.has(eventRecord.reason)) {
        throw new Error(`${name}.EquipmentDespawned.reason 不在冻结集合。`);
      }
    }
    if (tick < previousEventTick) throw new Error(`${name}.authorityEvents tick 不得随 sequence 回退。`);
    previousEventTick = tick;
    const bucket = eventsByAuthorityTick.get(tick) ?? [];
    bucket.push(event);
    eventsByAuthorityTick.set(tick, bucket);
  }
  const initialMatchStarted = events.filter((event) => {
    const candidate = event as StrictRecord;
    return candidate.type === 'MatchStarted' && candidate.tick === 0;
  });
  if (matchStartedCount !== 1 || matchEndedCount !== 1 || initialMatchStarted.length !== 1
    || (initialMatchStarted[0] as StrictRecord).sequence !== 0) {
    throw new Error(`${name}.authorityEvents 必须有且仅有 tick0/sequence0 MatchStarted 与一个 MatchEnded。`);
  }
  if (firstWaveSpawnCount !== 3 || secondWaveSpawnCount !== 3) {
    throw new Error(`${name}.EquipmentSpawned 必须精确为 tick1200=3、tick2400=3。`);
  }
  if ((events.at(-1) as StrictRecord | undefined)?.type !== 'MatchEnded') {
    throw new Error(`${name}.MatchEnded 必须是最后一个 authority event。`);
  }
  let expectedEventSequence = 0;
  for (let tick = 0; tick < snapshots.length; tick += 1) {
    if (tick > 0) expectedEventSequence += (eventsByAuthorityTick.get(tick - 1) ?? []).length;
    if (snapshots[tick]!.eventSequence !== expectedEventSequence) {
      throw new Error(`${name}.worldSnapshots eventSequence 与 authority events 不一致。`);
    }
  }
  let previousCheckpointTick = -1;
  const normalizedCheckpoints = checkpoints.map((checkpointValue, index) => {
    const checkpoint = strictRecord(checkpointValue, STATE_HASH_KEYS, `${name}.checkpoints[${index}]`);
    const tick = safeInteger(checkpoint.tick, `${name}.checkpoints[${index}].tick`);
    dataHash(checkpoint.hash, `${name}.checkpoints[${index}].hash`);
    if (tick <= previousCheckpointTick) {
      throw new Error(`${name}.checkpoints tick 必须严格递增。`);
    }
    previousCheckpointTick = tick;
    return checkpoint;
  });
  if (normalizedCheckpoints[0]!.tick !== 0) {
    throw new Error(`${name}.checkpoints 必须以 tick0 开始。`);
  }
  const finalCheckpoint = normalizedCheckpoints.at(-1);
  if (finalCheckpoint === undefined || finalCheckpoint.tick !== finalTick
    || finalCheckpoint.hash !== record.finalHash) {
    throw new Error(`${name}.checkpoints 必须以 finalTick/finalHash 终止。`);
  }
  const finalWorld = snapshots.at(-1)!;
  if (finalWorld.tick !== record.finalTick) throw new Error(`${name} final world tick 不一致。`);
  if (finalWorld.phase !== 'ended') throw new Error(`${name} final world phase 必须是 ended。`);
  assertOrderedEqual(finalWorld.result, result, `${name} Replay/Snapshot result`);
  const fullAuditTicks = safeIntegerArray(record.fullAuditTicks, `${name}.fullAuditTicks`, {
    sorted: true,
    allowEmpty: false,
  });
  const fullAuditCount = safeInteger(record.fullAuditCount, `${name}.fullAuditCount`, 1);
  if (fullAuditCount !== fullAuditTicks.length) throw new Error(`${name}.fullAuditCount 与序列长度不一致。`);
  const schedule = createArenaReadStepScheduleV2();
  const expectedAuditTicks: number[] = [];
  const initial = schedule.initial({ worldSnapshot: snapshots[0] } as never);
  if (initial !== null) expectedAuditTicks.push(initial.tick);
  for (let tick = 1; tick < snapshots.length; tick += 1) {
    const audit = schedule.afterStep(
      { worldSnapshot: snapshots[tick - 1] } as never,
      { worldSnapshot: snapshots[tick] } as never,
      (eventsByAuthorityTick.get(tick - 1) ?? []) as never,
    );
    if (audit !== null) expectedAuditTicks.push(audit.tick);
  }
  assertOrderedEqual(fullAuditTicks, expectedAuditTicks, `${name}.fullAuditTicks schedule`);
  const lifecycleBoundaries = validateLifecycleSet(
    record.lifecycleBoundaries,
    `${name}.lifecycleBoundaries`,
  );
  const derivedLifecycleBoundaries = deriveLifecycleBoundaries(
    snapshots,
    events,
    eventsByAuthorityTick,
    name,
  );
  assertOrderedEqual(
    lifecycleBoundaries,
    derivedLifecycleBoundaries,
    `${name}.lifecycleBoundaries 与 Replay/World 派生值`,
  );
  const resourcePeaks = validateResourcePeaks(record.resourcePeaks, `${name}.resourcePeaks`);
  const cleanup = validateCaseCleanup(record.cleanup, `${name}.cleanup`);
  const derivedResources = deriveResourceObservations(snapshots, eventsByAuthorityTick);
  for (const resource of RESOURCE_NAMES.slice(0, 4)) {
    if (resourcePeaks[resource].observed !== derivedResources[resource]) {
      throw new Error(`${name}.resourcePeaks.${resource}.observed 与 Replay/World 派生值不一致。`);
    }
  }
  if (resourcePeaks.readerCount.observed !== cleanup.readersCreated
    || resourcePeaks.sessionCount.observed !== cleanup.sessionsCreated) {
    throw new Error(`${name}.resourcePeaks reader/session 与 cleanup 创建计数不一致。`);
  }
  return Object.freeze({
    ...record,
    inputFrames: replay.inputFrames,
    authorityEvents: replay.events,
    worldSnapshots: Object.freeze(snapshots),
    fullAuditTicks: Object.freeze([...fullAuditTicks]),
    checkpoints: Object.freeze(normalizedCheckpoints),
    replayV5: replay,
    result: replay.result,
    lifecycleBoundaries,
    resourcePeaks,
    cleanup,
  }) as unknown as ArenaPa7FormalCaseRunV1;
}

function caseRunSummary(
  run: ArenaPa7FormalCaseRunV1,
  cleanup: ArenaPa7FormalCaseCleanupV1,
): ArenaPa7FormalDoubleRunSummaryV1 {
  const requiredEventTypeCounts = Object.fromEntries(EVENT_TYPES.map((eventType) => [eventType, 0]));
  const equipmentDespawnReasonCounts = Object.fromEntries(DESPAWN_REASONS.map((reason) => [reason, 0]));
  for (const event of run.authorityEvents) {
    const record = event as StrictRecord;
    const eventType = record.type as string;
    requiredEventTypeCounts[eventType] = (requiredEventTypeCounts[eventType] ?? 0) + 1;
    if (eventType === 'EquipmentDespawned' && typeof record.reason === 'string'
      && Object.hasOwn(equipmentDespawnReasonCounts, record.reason)) {
      equipmentDespawnReasonCounts[record.reason] = (
        equipmentDespawnReasonCounts[record.reason] ?? 0
      ) + 1;
    }
  }
  return Object.freeze({
    caseIndex: run.caseIndex,
    caseId: run.caseId,
    caseIdentity: run.caseIdentity,
    seed: run.seed,
    difficultyId: run.difficultyId,
    inputPlanId: run.inputPlanId,
    pauseAtTick: run.pauseAtTick,
    finalTick: run.finalTick,
    fullAuditCount: run.fullAuditCount,
    requiredEventTypeCounts: Object.freeze(requiredEventTypeCounts),
    equipmentDespawnReasonCounts: Object.freeze(equipmentDespawnReasonCounts),
    inputFrameSequenceHash: deterministicSha256(run.inputFrames),
    authorityEventSequenceHash: deterministicSha256(run.authorityEvents),
    worldSnapshotSequenceHash: deterministicSha256(run.worldSnapshots),
    checkpointSequenceHash: deterministicSha256(run.checkpoints),
    replayV5Hash: deterministicSha256(run.replayV5),
    resultHash: deterministicSha256(run.result),
    stateHashSequenceHash: deterministicSha256(run.checkpoints.map((checkpoint) => (
      (checkpoint as StrictRecord).hash
    ))),
    finalHash: run.finalHash,
    lifecycleBoundaries: run.lifecycleBoundaries,
    resourcePeaks: run.resourcePeaks,
    cleanup,
  });
}

export function createArenaPa7FormalDoubleRunSummaryV1(
  firstValue: unknown,
  secondValue: unknown,
): ArenaPa7FormalDoubleRunSummaryV1 {
  const first = validateCaseRunCloned(
    cloneArenaPa7FormalStrictDataV1(firstValue, 'PA7 first run'),
    'PA7 first run',
  );
  const second = validateCaseRunCloned(
    cloneArenaPa7FormalStrictDataV1(secondValue, 'PA7 second run'),
    'PA7 second run',
  );
  for (const key of [
    'caseIndex', 'caseId', 'caseIdentity', 'seed', 'difficultyId', 'inputPlanId',
    'pauseAtTick', 'playerParticipantId', 'botParticipantId', 'finalTick', 'inputFrames',
    'authorityEvents', 'worldSnapshots', 'fullAuditTicks',
    'fullAuditCount', 'checkpoints', 'replayV5', 'result', 'finalHash',
    'lifecycleBoundaries', 'resourcePeaks', 'cleanup',
  ] as const) assertOrderedEqual(first[key], second[key], `PA7 double run ${key}`);
  return caseRunSummary(first, mergeCaseCleanup(first.cleanup, second.cleanup));
}

export function assertArenaPa7FormalCaseEvidenceMatchesDoubleRunSummaryV1(
  caseValue: unknown,
  summaryValue: unknown,
): void {
  const evidence = validateArenaPa7FormalCaseEvidenceV1(caseValue);
  const summary = strictRecord(
    cloneArenaPa7FormalStrictDataV1(summaryValue, 'PA7 double-run summary'),
    DOUBLE_RUN_SUMMARY_KEYS,
    'PA7 double-run summary',
  );
  safeInteger(summary.caseIndex, 'PA7 double-run summary.caseIndex');
  nonEmptyString(summary.caseId, 'PA7 double-run summary.caseId');
  safeInteger(summary.seed, 'PA7 double-run summary.seed');
  nonEmptyString(summary.difficultyId, 'PA7 double-run summary.difficultyId');
  nonEmptyString(summary.inputPlanId, 'PA7 double-run summary.inputPlanId');
  nullableSafeInteger(summary.pauseAtTick, 'PA7 double-run summary.pauseAtTick');
  validateFormalCaseIdentity(summary, 'PA7 double-run summary');
  safeInteger(summary.finalTick, 'PA7 double-run summary.finalTick', 2_401);
  if ((summary.finalTick as number) > ARENA_PA7_FORMAL_HARD_LIMIT_TICKS) {
    throw new RangeError('PA7 double-run summary.finalTick 越界。');
  }
  safeInteger(summary.fullAuditCount, 'PA7 double-run summary.fullAuditCount', 1);
  validateCountRecord(
    summary.requiredEventTypeCounts,
    EVENT_TYPES,
    'PA7 double-run summary.requiredEventTypeCounts',
  );
  validateCountRecord(
    summary.equipmentDespawnReasonCounts,
    DESPAWN_REASONS,
    'PA7 double-run summary.equipmentDespawnReasonCounts',
  );
  for (const key of [
    'inputFrameSequenceHash', 'authorityEventSequenceHash', 'worldSnapshotSequenceHash',
    'checkpointSequenceHash', 'replayV5Hash', 'resultHash', 'stateHashSequenceHash',
  ] as const) sha256Hash(summary[key], `PA7 double-run summary.${key}`);
  dataHash(summary.finalHash, 'PA7 double-run summary.finalHash');
  validateLifecycleSet(summary.lifecycleBoundaries, 'PA7 double-run summary.lifecycleBoundaries');
  validateResourcePeaks(summary.resourcePeaks, 'PA7 double-run summary.resourcePeaks');
  validateCaseCleanup(summary.cleanup, 'PA7 double-run summary.cleanup');
  for (const key of DOUBLE_RUN_SUMMARY_KEYS) {
    assertOrderedEqual(
      evidence[key as keyof ArenaPa7FormalCaseEvidenceV1],
      summary[key],
      `PA7 case evidence 与 double-run summary 的 ${key}`,
    );
  }
}

export interface ArenaPa7FormalProgressV1 {
  readonly runToken: string;
  readonly sequence: number;
  readonly completedCases: number;
  readonly currentCaseIndex: number | null;
  readonly currentCaseId: string | null;
  readonly currentPass: 1 | 2 | null;
  readonly currentTick: number | null;
  readonly lastCommittedCaseEvidenceHash: string | null;
}

export interface ArenaPa7FormalWorkloadIdentityV1 {
  readonly productionVariantId: string;
  readonly caseGeneratorRevision: string;
  readonly participantIds: readonly string[];
  readonly profileIds: readonly string[];
  readonly inputPlanIds: readonly string[];
  readonly pauseAtTicks: readonly number[];
  readonly loaderAttestationHash: string;
}

export interface ArenaPa7FormalManifestIdentityV1 {
  readonly schemaVersion: number;
  readonly manifestId: string;
  readonly manifestHash: string;
  readonly definitionHash: string;
  readonly configHash: string;
  readonly contentSelectionHash: string;
  readonly compositionContractHash: string;
}

export interface ArenaPa7FormalAggregateV1 {
  readonly canonicalTotalTicks: number;
  readonly executedTotalTicks: number;
  readonly canonicalTotalEvents: number;
  readonly executedTotalEvents: number;
  readonly uniqueCaseIdentityCount: number;
  readonly uniqueSeedCount: number;
  readonly uniqueInputSequenceHashes: number;
  readonly uniqueEventSequenceHashes: number;
  readonly uniqueSnapshotSequenceHashes: number;
  readonly uniqueReplayHashes: number;
  readonly uniqueFinalHashes: number;
  readonly eventTypeCounts: Readonly<Record<string, number>>;
  readonly equipmentDespawnReasonCounts: Readonly<Record<string, number>>;
  readonly lifecycleCoverage: Readonly<{
    firstWavePickableAt599CaseCount: number;
    firstWavePendingAt600CaseCount: number;
    firstWaveReadyWithoutPendingAt600CaseCount: number;
    firstWaveHeldAt599CaseCount: number;
    firstWaveRetiredBeforeExpiryCaseCount: number;
    postExpiryNoRepeatCaseCount: number;
    secondWaveSpawnCaseCount: number;
  }>;
  readonly resourcePeaks: ArenaPa7FormalResourcePeaksV1;
  readonly cpu: Readonly<{
    totalMicros: number;
    microsPerTick: number;
    p50MicrosPerTick: number;
    p95MicrosPerTick: number;
    p99MicrosPerTick: number;
    wallDurationMillis: number;
  }>;
  readonly heap: Readonly<{
    baselineBytes: number;
    peakBytes: number;
    endingBytes: number;
    deltaBytes: number;
  }>;
}

export interface ArenaPa7FormalRunPayloadV1 {
  readonly schemaVersion: typeof ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION;
  readonly contractId: typeof ARENA_PA7_FORMAL_CONTRACT_ID;
  readonly runToken: string;
  readonly request: ArenaPa7FormalRequestV1;
  readonly workloadIdentity: ArenaPa7FormalWorkloadIdentityV1;
  readonly scheduleDefinitionHash: string;
  readonly manifestIdentity: ArenaPa7FormalManifestIdentityV1;
  readonly progressFinal: ArenaPa7FormalProgressV1;
  readonly caseEvidence: readonly ArenaPa7FormalCaseEvidenceV1[];
  readonly aggregate: ArenaPa7FormalAggregateV1;
  readonly cleanup: ArenaPa7FormalCaseCleanupV1;
  readonly semanticHash: string;
}

const PROGRESS_KEYS = [
  'runToken', 'sequence', 'completedCases', 'currentCaseIndex', 'currentCaseId', 'currentPass',
  'currentTick', 'lastCommittedCaseEvidenceHash',
] as const;
const WORKLOAD_KEYS = [
  'productionVariantId', 'caseGeneratorRevision', 'participantIds', 'profileIds', 'inputPlanIds',
  'pauseAtTicks', 'loaderAttestationHash',
] as const;
const MANIFEST_KEYS = [
  'schemaVersion', 'manifestId', 'manifestHash', 'definitionHash', 'configHash',
  'contentSelectionHash', 'compositionContractHash',
] as const;
const LIFECYCLE_COVERAGE_KEYS = [
  'firstWavePickableAt599CaseCount', 'firstWavePendingAt600CaseCount',
  'firstWaveReadyWithoutPendingAt600CaseCount', 'firstWaveHeldAt599CaseCount',
  'firstWaveRetiredBeforeExpiryCaseCount', 'postExpiryNoRepeatCaseCount',
  'secondWaveSpawnCaseCount',
] as const;
const CPU_KEYS = [
  'totalMicros', 'microsPerTick', 'p50MicrosPerTick', 'p95MicrosPerTick',
  'p99MicrosPerTick', 'wallDurationMillis',
] as const;
const HEAP_KEYS = ['baselineBytes', 'peakBytes', 'endingBytes', 'deltaBytes'] as const;
const AGGREGATE_KEYS = [
  'canonicalTotalTicks', 'executedTotalTicks', 'canonicalTotalEvents', 'executedTotalEvents',
  'uniqueCaseIdentityCount', 'uniqueSeedCount', 'uniqueInputSequenceHashes',
  'uniqueEventSequenceHashes', 'uniqueSnapshotSequenceHashes', 'uniqueReplayHashes',
  'uniqueFinalHashes', 'eventTypeCounts', 'equipmentDespawnReasonCounts', 'lifecycleCoverage',
  'resourcePeaks', 'cpu', 'heap',
] as const;
const PAYLOAD_KEYS = [
  'schemaVersion', 'contractId', 'runToken', 'request', 'workloadIdentity',
  'scheduleDefinitionHash', 'manifestIdentity', 'progressFinal', 'caseEvidence', 'aggregate',
  'cleanup', 'semanticHash',
] as const;

function validateProgress(
  value: unknown,
  name: string,
  options: { readonly final: boolean; readonly runToken?: string } = { final: false },
): ArenaPa7FormalProgressV1 {
  const record = strictRecord(value, PROGRESS_KEYS, name);
  const runToken = nonEmptyString(record.runToken, `${name}.runToken`);
  if (options.runToken !== undefined && runToken !== options.runToken) {
    throw new Error(`${name}.runToken 漂移。`);
  }
  safeInteger(record.sequence, `${name}.sequence`);
  const completed = safeInteger(record.completedCases, `${name}.completedCases`);
  if (completed > ARENA_PA7_FORMAL_CASE_COUNT) throw new RangeError(`${name}.completedCases 越界。`);
  const currentIndex = nullableSafeInteger(record.currentCaseIndex, `${name}.currentCaseIndex`);
  const currentId = nullableString(record.currentCaseId, `${name}.currentCaseId`);
  const currentPass = record.currentPass;
  if (currentPass !== null && currentPass !== 1 && currentPass !== 2) {
    throw new RangeError(`${name}.currentPass 仅允许 1/2/null。`);
  }
  const currentTick = nullableSafeInteger(record.currentTick, `${name}.currentTick`);
  if (currentTick !== null && currentTick > ARENA_PA7_FORMAL_HARD_LIMIT_TICKS) {
    throw new RangeError(`${name}.currentTick 超过 hard limit。`);
  }
  const lastHash = record.lastCommittedCaseEvidenceHash === null
    ? null : sha256Hash(record.lastCommittedCaseEvidenceHash, `${name}.lastCommittedCaseEvidenceHash`);
  const currentFields = [currentIndex, currentId, currentPass, currentTick];
  if (currentFields.some((item) => item === null) && currentFields.some((item) => item !== null)) {
    throw new Error(`${name} current case identity 必须全 null 或全非 null。`);
  }
  if (currentIndex !== null && (currentIndex !== completed || currentIndex >= ARENA_PA7_FORMAL_CASE_COUNT)) {
    throw new Error(`${name}.currentCaseIndex 必须等于 completedCases。`);
  }
  if (currentIndex !== null
    && currentId !== `formal-survival-bot-${String(currentIndex).padStart(3, '0')}`) {
    throw new Error(`${name}.currentCaseId 与 formal manifest index 不一致。`);
  }
  if ((completed === 0) !== (lastHash === null)) {
    throw new Error(`${name}.lastCommittedCaseEvidenceHash 与 completedCases 不一致。`);
  }
  if (options.final && (completed !== ARENA_PA7_FORMAL_CASE_COUNT
    || currentFields.some((item) => item !== null))) {
    throw new Error(`${name} 成功终态必须 completed=300 且 current 全 null。`);
  }
  return record as unknown as ArenaPa7FormalProgressV1;
}

export function validateArenaPa7FormalProgressSequenceV1(value: unknown): readonly ArenaPa7FormalProgressV1[] {
  const source = cloneArenaPa7FormalStrictDataV1(value, 'PA7 progress sequence');
  const progress = strictArray(source, 'PA7 progress sequence').map((item, index) => (
    validateProgress(item, `PA7 progress[${index}]`)
  ));
  if (progress.length === 0) throw new RangeError('PA7 progress sequence 不能为空。');
  const token = progress[0]!.runToken;
  for (let index = 1; index < progress.length; index += 1) {
    const previous = progress[index - 1]!;
    const current = progress[index]!;
    if (current.runToken !== token || current.sequence !== previous.sequence + 1
      || current.completedCases < previous.completedCases
      || current.completedCases > previous.completedCases + 1) {
      throw new Error(`PA7 progress[${index}] token/sequence/completedCases 回退或跳号。`);
    }
    if (current.completedCases === previous.completedCases) {
      if (current.lastCommittedCaseEvidenceHash !== previous.lastCommittedCaseEvidenceHash) {
        throw new Error(`PA7 progress[${index}] 同 completedCases 的 commit hash 不得漂移。`);
      }
      if (current.currentCaseId !== previous.currentCaseId
        || current.currentCaseIndex !== previous.currentCaseIndex) {
        throw new Error(`PA7 progress[${index}] 同 case 的 identity 不得漂移。`);
      }
      if (previous.currentPass === null || current.currentPass === null
        || previous.currentTick === null || current.currentTick === null) {
        throw new Error(`PA7 progress[${index}] 未形成严格前进。`);
      }
      if (current.currentPass === previous.currentPass) {
        if (current.currentTick !== previous.currentTick + 1) {
          throw new Error(`PA7 progress[${index}] 同 pass tick 必须严格 +1，不能重复、回退或跳跃。`);
        }
      } else if (previous.currentPass !== 1 || current.currentPass !== 2 || current.currentTick !== 0
        || previous.currentTick < 2_401) {
        throw new Error(`PA7 progress[${index}] pass 只能在合法终局 tick 后 1→2 并从 tick0 重启。`);
      }
    } else {
      if (current.lastCommittedCaseEvidenceHash === previous.lastCommittedCaseEvidenceHash) {
        throw new Error(`PA7 progress[${index}] commit hash 未前进。`);
      }
      if (previous.currentPass !== 2 || previous.currentTick === null || previous.currentTick < 2_401) {
        throw new Error(`PA7 progress[${index}] 只能在第二轮合法终局 tick 后提交 case。`);
      }
      if (current.completedCases === ARENA_PA7_FORMAL_CASE_COUNT) {
        if (current.currentCaseIndex !== null || current.currentCaseId !== null
          || current.currentPass !== null || current.currentTick !== null) {
          throw new Error(`PA7 progress[${index}] 最终完成后 current 必须清空。`);
        }
      } else if (current.currentPass !== 1 || current.currentTick !== 0) {
        throw new Error(`PA7 progress[${index}] 新 case 必须从 pass1/tick0 开始。`);
      }
    }
  }
  return Object.freeze([...progress]);
}

function validateWorkload(value: unknown, name: string): ArenaPa7FormalWorkloadIdentityV1 {
  const record = strictRecord(value, WORKLOAD_KEYS, name);
  if (record.productionVariantId !== 'C+B+D') throw new Error(`${name}.productionVariantId 必须是 C+B+D。`);
  nonEmptyString(record.caseGeneratorRevision, `${name}.caseGeneratorRevision`);
  const participantIds = stringArray(record.participantIds, `${name}.participantIds`, { sorted: true, allowEmpty: false });
  const profileIds = stringArray(record.profileIds, `${name}.profileIds`, { sorted: true, allowEmpty: false });
  const inputPlanIds = stringArray(record.inputPlanIds, `${name}.inputPlanIds`, { sorted: true, allowEmpty: false });
  const pauseAtTicks = safeIntegerArray(record.pauseAtTicks, `${name}.pauseAtTicks`, { sorted: true });
  assertOrderedEqual(participantIds, FORMAL_PARTICIPANT_IDS, `${name}.participantIds formal set`);
  assertOrderedEqual(profileIds, FORMAL_PROFILE_IDS, `${name}.profileIds formal set`);
  assertOrderedEqual(inputPlanIds, FORMAL_INPUT_PLAN_IDS, `${name}.inputPlanIds formal set`);
  assertOrderedEqual(pauseAtTicks, FORMAL_PAUSE_TICKS, `${name}.pauseAtTicks formal set`);
  sha256Hash(record.loaderAttestationHash, `${name}.loaderAttestationHash`);
  return record as unknown as ArenaPa7FormalWorkloadIdentityV1;
}

function validateManifest(value: unknown, name: string): ArenaPa7FormalManifestIdentityV1 {
  const record = strictRecord(value, MANIFEST_KEYS, name);
  safeInteger(record.schemaVersion, `${name}.schemaVersion`, 1);
  nonEmptyString(record.manifestId, `${name}.manifestId`);
  for (const key of MANIFEST_KEYS.slice(2)) dataHash(record[key], `${name}.${key}`);
  return record as unknown as ArenaPa7FormalManifestIdentityV1;
}

function validateAggregate(
  value: unknown,
  cases: readonly ArenaPa7FormalCaseEvidenceV1[],
  name: string,
): ArenaPa7FormalAggregateV1 {
  const record = strictRecord(value, AGGREGATE_KEYS, name);
  for (const key of AGGREGATE_KEYS.slice(0, 11)) safeInteger(record[key], `${name}.${key}`);
  const canonicalTicks = cases.reduce((sum, item) => sum + item.finalTick, 0);
  const canonicalEvents = cases.reduce((sum, item) => (
    sum + Object.values(item.requiredEventTypeCounts).reduce((eventSum, count) => eventSum + count, 0)
  ), 0);
  const expectedCounts = {
    canonicalTotalTicks: canonicalTicks,
    executedTotalTicks: canonicalTicks * ARENA_PA7_FORMAL_DOUBLE_RUN_COUNT,
    canonicalTotalEvents: canonicalEvents,
    executedTotalEvents: canonicalEvents * ARENA_PA7_FORMAL_DOUBLE_RUN_COUNT,
    uniqueCaseIdentityCount: new Set(cases.map((item) => item.caseIdentity)).size,
    uniqueSeedCount: new Set(cases.map((item) => item.seed)).size,
    uniqueInputSequenceHashes: new Set(cases.map((item) => item.inputFrameSequenceHash)).size,
    uniqueEventSequenceHashes: new Set(cases.map((item) => item.authorityEventSequenceHash)).size,
    uniqueSnapshotSequenceHashes: new Set(cases.map((item) => item.worldSnapshotSequenceHash)).size,
    uniqueReplayHashes: new Set(cases.map((item) => item.replayV5Hash)).size,
    uniqueFinalHashes: new Set(cases.map((item) => item.finalHash)).size,
  };
  for (const [key, expected] of Object.entries(expectedCounts)) {
    if (record[key] !== expected) throw new Error(`${name}.${key} 与 case evidence 不一致。`);
  }
  if (expectedCounts.uniqueCaseIdentityCount !== ARENA_PA7_FORMAL_CASE_COUNT
    || expectedCounts.uniqueSeedCount !== ARENA_PA7_FORMAL_UNIQUE_SEED_COUNT) {
    throw new Error(`${name} case/seed 唯一性不满足 300/120。`);
  }
  const eventCounts = validateCountRecord(record.eventTypeCounts, EVENT_TYPES, `${name}.eventTypeCounts`);
  for (const eventType of EVENT_TYPES) {
    const expected = cases.reduce((sum, item) => sum + item.requiredEventTypeCounts[eventType]!, 0);
    if (eventCounts[eventType] !== expected) throw new Error(`${name}.eventTypeCounts.${eventType} 不一致。`);
  }
  const reasonCounts = validateCountRecord(
    record.equipmentDespawnReasonCounts,
    DESPAWN_REASONS,
    `${name}.equipmentDespawnReasonCounts`,
  );
  for (const reason of DESPAWN_REASONS) {
    const expected = cases.reduce((sum, item) => sum + item.equipmentDespawnReasonCounts[reason]!, 0);
    if (reasonCounts[reason] !== expected) throw new Error(`${name}.equipmentDespawnReasonCounts.${reason} 不一致。`);
  }
  const coverage = strictRecord(record.lifecycleCoverage, LIFECYCLE_COVERAGE_KEYS, `${name}.lifecycleCoverage`);
  for (const key of LIFECYCLE_COVERAGE_KEYS) safeInteger(coverage[key], `${name}.${key}`);
  const boundaryAt = (
    item: ArenaPa7FormalCaseEvidenceV1,
    waveIndex: number,
    lifecycleOffset: number,
  ) => item.lifecycleBoundaries.find((boundary) => (
    boundary.waveIndex === waveIndex && boundary.lifecycleOffset === lifecycleOffset
  ))!;
  const expectedCoverage = {
    firstWavePickableAt599CaseCount: cases.filter((item) => (
      boundaryAt(item, 0, 599).worldEquipmentInstanceIds.length > 0
    )).length,
    firstWavePendingAt600CaseCount: cases.filter((item) => (
      boundaryAt(item, 0, 600).pendingExpiryEquipmentInstanceIds.length > 0
    )).length,
    firstWaveReadyWithoutPendingAt600CaseCount: cases.filter((item) => {
      const boundary = boundaryAt(item, 0, 600);
      return boundary.pendingExpiryEquipmentInstanceIds.length === 0
        && boundary.resyncReadiness === 'ready';
    }).length,
    firstWaveHeldAt599CaseCount: cases.filter((item) => (
      boundaryAt(item, 0, 599).heldEquipmentInstanceIds.length > 0
    )).length,
    firstWaveRetiredBeforeExpiryCaseCount: cases.filter((item) => (
      boundaryAt(item, 0, 599).retiredEquipmentInstanceIds.length > 0
    )).length,
    postExpiryNoRepeatCaseCount: cases.filter((item) => (
      !boundaryAt(item, 0, 601).authorityEventTypes.includes('EquipmentExpired')
    )).length,
    secondWaveSpawnCaseCount: cases.filter((item) => {
      const boundary = boundaryAt(item, 1, 1);
      return boundary.waveEquipmentInstanceIds.length === 3
        && boundary.authorityEventTypes.includes('EquipmentSpawned');
    }).length,
  };
  for (const [key, expected] of Object.entries(expectedCoverage)) {
    if (coverage[key] !== expected) throw new Error(`${name}.lifecycleCoverage.${key} 与 cases 不一致。`);
  }
  if (expectedCoverage.firstWavePickableAt599CaseCount === 0
    || expectedCoverage.firstWavePendingAt600CaseCount === 0
    || expectedCoverage.firstWaveHeldAt599CaseCount === 0
    || expectedCoverage.postExpiryNoRepeatCaseCount !== ARENA_PA7_FORMAL_CASE_COUNT
    || expectedCoverage.secondWaveSpawnCaseCount !== ARENA_PA7_FORMAL_CASE_COUNT) {
    throw new Error(`${name}.lifecycleCoverage 未覆盖 pickable/pending/held/post-expiry/second-wave。`);
  }
  const peaks = validateResourcePeaks(record.resourcePeaks, `${name}.resourcePeaks`);
  for (const resource of RESOURCE_NAMES) {
    const expectedObserved = Math.max(...cases.map((item) => item.resourcePeaks[resource].observed));
    const expectedLimit = cases[0]!.resourcePeaks[resource].limit;
    if (peaks[resource].observed !== expectedObserved || peaks[resource].limit !== expectedLimit
      || cases.some((item) => item.resourcePeaks[resource].limit !== expectedLimit)) {
      throw new Error(`${name}.resourcePeaks.${resource} 与 case derived limit 不一致。`);
    }
  }
  const cpu = strictRecord(record.cpu, CPU_KEYS, `${name}.cpu`);
  for (const key of CPU_KEYS) finite(cpu[key], `${name}.cpu.${key}`);
  if ((cpu.p50MicrosPerTick as number) > (cpu.p95MicrosPerTick as number)
    || (cpu.p95MicrosPerTick as number) > (cpu.p99MicrosPerTick as number)
    || cpu.microsPerTick !== (cpu.totalMicros as number) / (record.executedTotalTicks as number)) {
    throw new Error(`${name}.cpu quantile/denominator identity 不一致。`);
  }
  const heap = strictRecord(record.heap, HEAP_KEYS, `${name}.heap`);
  for (const key of HEAP_KEYS.slice(0, 3)) safeInteger(heap[key], `${name}.heap.${key}`);
  finite(heap.deltaBytes, `${name}.heap.deltaBytes`, Number.NEGATIVE_INFINITY);
  if (heap.deltaBytes !== (heap.endingBytes as number) - (heap.baselineBytes as number)
    || (heap.peakBytes as number) < Math.max(heap.baselineBytes as number, heap.endingBytes as number)) {
    throw new Error(`${name}.heap identity 不一致。`);
  }
  return record as unknown as ArenaPa7FormalAggregateV1;
}

function semanticPayloadView(record: StrictRecord): Readonly<StrictRecord> {
  const aggregate = strictRecord(record.aggregate, AGGREGATE_KEYS, 'PA7 semantic aggregate');
  const deterministicAggregate = omitField(omitField(aggregate, 'cpu') as StrictRecord, 'heap');
  return Object.freeze({
    request: record.request,
    workloadIdentity: record.workloadIdentity,
    scheduleDefinitionHash: record.scheduleDefinitionHash,
    manifestIdentity: record.manifestIdentity,
    caseEvidence: record.caseEvidence,
    aggregate: deterministicAggregate,
    cleanup: record.cleanup,
  });
}

export function createArenaPa7FormalRunSemanticHashV1(value: unknown): string {
  const source = cloneArenaPa7FormalStrictDataV1(value, 'PA7 semantic hash input');
  const record = strictRecord(source, PAYLOAD_KEYS.filter((key) => key !== 'semanticHash'), 'PA7 semantic hash input');
  return deterministicSha256(semanticPayloadView(record));
}

function validatePayloadCloned(value: unknown, name: string): ArenaPa7FormalRunPayloadV1 {
  const record = strictRecord(value, PAYLOAD_KEYS, name);
  if (record.schemaVersion !== ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION
    || record.contractId !== ARENA_PA7_FORMAL_CONTRACT_ID) {
    throw new Error(`${name} schema/contract 不受支持。`);
  }
  const runToken = nonEmptyString(record.runToken, `${name}.runToken`);
  validateRequest(record.request, `${name}.request`);
  const workload = validateWorkload(record.workloadIdentity, `${name}.workloadIdentity`);
  dataHash(record.scheduleDefinitionHash, `${name}.scheduleDefinitionHash`);
  validateManifest(record.manifestIdentity, `${name}.manifestIdentity`);
  const progress = validateProgress(record.progressFinal, `${name}.progressFinal`, { final: true, runToken });
  const cases = strictArray(record.caseEvidence, `${name}.caseEvidence`).map((item, index) => (
    validateCaseEvidenceCloned(item, `${name}.caseEvidence[${index}]`)
  ));
  if (cases.length !== ARENA_PA7_FORMAL_CASE_COUNT) throw new Error(`${name} 必须包含 300 个 case。`);
  const caseIds = new Set<string>();
  const identities = new Set<string>();
  for (let index = 0; index < cases.length; index += 1) {
    const item = cases[index]!;
    if (item.caseIndex !== index) throw new Error(`${name}.caseEvidence 必须按 0..299 排序。`);
    if (caseIds.has(item.caseId) || identities.has(item.caseIdentity)) {
      throw new Error(`${name}.caseEvidence 包含重复 case id/identity。`);
    }
    caseIds.add(item.caseId);
    identities.add(item.caseIdentity);
  }
  assertOrderedEqual(workload.participantIds, ['player-1', 'player-2'], `${name}.workload participantIds`);
  assertOrderedEqual(
    workload.profileIds,
    [...new Set(cases.map(({ difficultyId }) => difficultyId))].sort(compareText),
    `${name}.workload profileIds/case manifest`,
  );
  assertOrderedEqual(
    workload.inputPlanIds,
    [...new Set(cases.map(({ inputPlanId }) => inputPlanId))].sort(compareText),
    `${name}.workload inputPlanIds/case manifest`,
  );
  assertOrderedEqual(
    workload.pauseAtTicks,
    [...new Set(cases.flatMap(({ pauseAtTick }) => pauseAtTick === null ? [] : [pauseAtTick]))]
      .sort((left, right) => left - right),
    `${name}.workload pauseAtTicks/case manifest`,
  );
  if (progress.lastCommittedCaseEvidenceHash !== cases.at(-1)!.caseEvidenceHash) {
    throw new Error(`${name}.progressFinal 最后 commit hash 不一致。`);
  }
  validateAggregate(record.aggregate, cases, `${name}.aggregate`);
  const cleanup = validateCaseCleanup(record.cleanup, `${name}.cleanup`);
  const totals = cases.reduce((result, item) => ({
    sessionsCreated: result.sessionsCreated + item.cleanup.sessionsCreated,
    sessionDestroyAttempts: result.sessionDestroyAttempts + item.cleanup.sessionDestroyAttempts,
    sessionsDestroyed: result.sessionsDestroyed + item.cleanup.sessionsDestroyed,
    readersCreated: result.readersCreated + item.cleanup.readersCreated,
    readersInvalidated: result.readersInvalidated + item.cleanup.readersInvalidated,
  }), {
    sessionsCreated: 0, sessionDestroyAttempts: 0, sessionsDestroyed: 0,
    readersCreated: 0, readersInvalidated: 0,
  });
  for (const key of Object.keys(totals) as Array<keyof typeof totals>) {
    if (cleanup[key] !== totals[key]) throw new Error(`${name}.cleanup.${key} 与 case 总和不一致。`);
  }
  assertHash(
    record.semanticHash,
    deterministicSha256(semanticPayloadView(record)),
    `${name}.semanticHash`,
  );
  return record as unknown as ArenaPa7FormalRunPayloadV1;
}

export function validateArenaPa7FormalRunPayloadV1(value: unknown): ArenaPa7FormalRunPayloadV1 {
  return validatePayloadCloned(
    cloneArenaPa7FormalStrictDataV1(value, 'ArenaPa7FormalRunPayloadV1'),
    'ArenaPa7FormalRunPayloadV1',
  );
}

export interface ArenaPa7FormalSourceIdentityV1 {
  readonly headCommit: string;
  readonly sourceDirty: boolean;
  readonly repositoryFingerprintBefore: string;
  readonly repositoryFingerprintAfter: string;
  readonly packageLockHash: string;
  readonly productionModuleHashes: readonly Readonly<{ readonly relativePath: string; readonly sha256: string }>[];
}

export interface ArenaPa7FormalBuildIdentityV1 {
  readonly nodeVersion: string;
  readonly packageManagerVersion: string;
  readonly platform: string;
  readonly architecture: string;
  readonly buildId: string;
  readonly buildHash: string;
  readonly productionVariantId: string;
  readonly loaderAttestationHash: string;
}

export interface ArenaPa7FormalEnvironmentIdentityV1 {
  readonly cpuModel: string;
  readonly logicalCpuCount: number;
  readonly totalMemoryBytes: number;
  readonly isolationEvidenceId: string;
  readonly isolationEvidenceHash: string;
}

export interface ArenaPa7FormalGateV1 {
  readonly id: FormalGateId;
  readonly passed: boolean;
  readonly evidenceHash: string;
  readonly failureReason: FormalFailureKind | null;
}

export interface ArenaPa7FormalEvidenceCleanupV1 {
  readonly childProcessesStarted: number;
  readonly childProcessesExited: number;
  readonly termSignalsSent: number;
  readonly killSignalsSent: number;
  readonly temporaryPathsCreated: number;
  readonly temporaryPathsRemoved: number;
  readonly pendingCleanupCount: number;
  readonly cleanupErrorCount: number;
}

export interface ArenaPa7FormalFailureV1 {
  readonly kind: FormalFailureKind;
  readonly phase: FormalFailurePhase;
  readonly completedCases: number;
  readonly currentCaseIndex: number | null;
  readonly currentCaseId: string | null;
  readonly currentPass: 1 | 2 | null;
  readonly currentTick: number | null;
  readonly lastCommittedCaseEvidenceHash: string | null;
  readonly sourceFingerprintBefore: string | null;
  readonly sourceFingerprintAfter: string | null;
  readonly cleanupErrors: readonly string[];
  readonly causeName: string | null;
  readonly causeMessage: string | null;
}

export interface ArenaPa7FormalEvidenceV1 {
  readonly schemaVersion: typeof ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION;
  readonly contractId: typeof ARENA_PA7_FORMAL_CONTRACT_ID;
  readonly sourceIdentity: ArenaPa7FormalSourceIdentityV1;
  readonly buildIdentity: ArenaPa7FormalBuildIdentityV1;
  readonly environmentIdentity: ArenaPa7FormalEnvironmentIdentityV1;
  readonly request: ArenaPa7FormalRequestV1;
  readonly progress: ArenaPa7FormalProgressV1;
  readonly payload: ArenaPa7FormalRunPayloadV1 | null;
  readonly gates: readonly ArenaPa7FormalGateV1[];
  readonly cleanup: ArenaPa7FormalEvidenceCleanupV1;
  readonly status: 'formal-passed' | 'formal-failed';
  readonly failure: ArenaPa7FormalFailureV1 | null;
  readonly semanticHash: string;
  readonly evidenceHash: string;
  readonly generatedAt: string;
}

const MODULE_HASH_KEYS = ['relativePath', 'sha256'] as const;
const SOURCE_KEYS = [
  'headCommit', 'sourceDirty', 'repositoryFingerprintBefore', 'repositoryFingerprintAfter',
  'packageLockHash', 'productionModuleHashes',
] as const;
const BUILD_KEYS = [
  'nodeVersion', 'packageManagerVersion', 'platform', 'architecture', 'buildId', 'buildHash',
  'productionVariantId', 'loaderAttestationHash',
] as const;
const ENVIRONMENT_KEYS = [
  'cpuModel', 'logicalCpuCount', 'totalMemoryBytes', 'isolationEvidenceId', 'isolationEvidenceHash',
] as const;
const GATE_KEYS = ['id', 'passed', 'evidenceHash', 'failureReason'] as const;
const EVIDENCE_CLEANUP_KEYS = [
  'childProcessesStarted', 'childProcessesExited', 'termSignalsSent', 'killSignalsSent',
  'temporaryPathsCreated', 'temporaryPathsRemoved', 'pendingCleanupCount', 'cleanupErrorCount',
] as const;
const FAILURE_KEYS = [
  'kind', 'phase', 'completedCases', 'currentCaseIndex', 'currentCaseId', 'currentPass',
  'currentTick', 'lastCommittedCaseEvidenceHash', 'sourceFingerprintBefore',
  'sourceFingerprintAfter', 'cleanupErrors', 'causeName', 'causeMessage',
] as const;
const EVIDENCE_KEYS = [
  'schemaVersion', 'contractId', 'sourceIdentity', 'buildIdentity', 'environmentIdentity',
  'request', 'progress', 'payload', 'gates', 'cleanup', 'status', 'failure', 'semanticHash',
  'evidenceHash', 'generatedAt',
] as const;

function validateSource(value: unknown, name: string): ArenaPa7FormalSourceIdentityV1 {
  const record = strictRecord(value, SOURCE_KEYS, name);
  fixedHash(record.headCommit, 40, `${name}.headCommit`);
  if (typeof record.sourceDirty !== 'boolean') throw new TypeError(`${name}.sourceDirty 必须是 boolean。`);
  sha256Hash(record.repositoryFingerprintBefore, `${name}.repositoryFingerprintBefore`);
  sha256Hash(record.repositoryFingerprintAfter, `${name}.repositoryFingerprintAfter`);
  sha256Hash(record.packageLockHash, `${name}.packageLockHash`);
  const modules = strictArray(record.productionModuleHashes, `${name}.productionModuleHashes`).map((item, index) => {
    const module = strictRecord(item, MODULE_HASH_KEYS, `${name}.productionModuleHashes[${index}]`);
    strictRelativePath(module.relativePath, `${name}.productionModuleHashes[${index}].relativePath`);
    sha256Hash(module.sha256, `${name}.productionModuleHashes[${index}].sha256`);
    return module;
  });
  if (modules.length === 0 || modules.some((item, index) => (
    index > 0 && (modules[index - 1]!.relativePath as string) >= (item.relativePath as string)
  ))) throw new Error(`${name}.productionModuleHashes 必须非空、唯一且按路径排序。`);
  return record as unknown as ArenaPa7FormalSourceIdentityV1;
}

function validateBuild(value: unknown, name: string): ArenaPa7FormalBuildIdentityV1 {
  const record = strictRecord(value, BUILD_KEYS, name);
  for (const key of ['nodeVersion', 'packageManagerVersion', 'platform', 'architecture', 'buildId'] as const) {
    nonEmptyString(record[key], `${name}.${key}`);
  }
  for (const key of ['buildHash', 'loaderAttestationHash'] as const) sha256Hash(record[key], `${name}.${key}`);
  if (record.productionVariantId !== 'C+B+D') throw new Error(`${name}.productionVariantId 必须是 C+B+D。`);
  return record as unknown as ArenaPa7FormalBuildIdentityV1;
}

function validateEnvironment(value: unknown, name: string): ArenaPa7FormalEnvironmentIdentityV1 {
  const record = strictRecord(value, ENVIRONMENT_KEYS, name);
  nonEmptyString(record.cpuModel, `${name}.cpuModel`);
  safeInteger(record.logicalCpuCount, `${name}.logicalCpuCount`, 1);
  safeInteger(record.totalMemoryBytes, `${name}.totalMemoryBytes`, 1);
  nonEmptyString(record.isolationEvidenceId, `${name}.isolationEvidenceId`);
  sha256Hash(record.isolationEvidenceHash, `${name}.isolationEvidenceHash`);
  return record as unknown as ArenaPa7FormalEnvironmentIdentityV1;
}

function validateEvidenceCleanup(value: unknown, name: string): ArenaPa7FormalEvidenceCleanupV1 {
  const record = validateCountRecord(value, EVIDENCE_CLEANUP_KEYS, name);
  if ((record.childProcessesExited as number) > (record.childProcessesStarted as number)
    || (record.temporaryPathsRemoved as number) > (record.temporaryPathsCreated as number)) {
    throw new Error(`${name} cleanup 计数不可超过创建计数。`);
  }
  return record as unknown as ArenaPa7FormalEvidenceCleanupV1;
}

function validateFailure(value: unknown, name: string): ArenaPa7FormalFailureV1 {
  const record = strictRecord(value, FAILURE_KEYS, name);
  const kind = enumValue(record.kind, ARENA_PA7_FORMAL_FAILURE_KINDS, `${name}.kind`);
  const phase = enumValue(record.phase, ARENA_PA7_FORMAL_FAILURE_PHASES, `${name}.phase`);
  const completed = safeInteger(record.completedCases, `${name}.completedCases`);
  if (completed > ARENA_PA7_FORMAL_CASE_COUNT) throw new RangeError(`${name}.completedCases 越界。`);
  const currentIndex = nullableSafeInteger(record.currentCaseIndex, `${name}.currentCaseIndex`);
  const currentId = nullableString(record.currentCaseId, `${name}.currentCaseId`);
  const currentPass = record.currentPass;
  if (currentPass !== null && currentPass !== 1 && currentPass !== 2) {
    throw new RangeError(`${name}.currentPass 仅允许 1/2/null。`);
  }
  const currentTick = nullableSafeInteger(record.currentTick, `${name}.currentTick`);
  const currentFields = [currentIndex, currentId, currentPass, currentTick];
  if (currentFields.some((item) => item === null) && currentFields.some((item) => item !== null)) {
    throw new Error(`${name} current case identity 必须全 null 或全非 null。`);
  }
  if (currentIndex !== null && currentIndex !== completed) {
    throw new Error(`${name}.currentCaseIndex 必须等于 completedCases。`);
  }
  if (currentIndex !== null
    && currentId !== `formal-survival-bot-${String(currentIndex).padStart(3, '0')}`) {
    throw new Error(`${name}.currentCaseId 与 formal manifest index 不一致。`);
  }
  if (record.lastCommittedCaseEvidenceHash !== null) {
    sha256Hash(record.lastCommittedCaseEvidenceHash, `${name}.lastCommittedCaseEvidenceHash`);
  }
  if (record.sourceFingerprintBefore !== null) sha256Hash(record.sourceFingerprintBefore, `${name}.sourceBefore`);
  if (record.sourceFingerprintAfter !== null) sha256Hash(record.sourceFingerprintAfter, `${name}.sourceAfter`);
  stringArray(record.cleanupErrors, `${name}.cleanupErrors`, { unique: false });
  nullableString(record.causeName, `${name}.causeName`);
  nullableString(record.causeMessage, `${name}.causeMessage`);
  const requiredPhase = kind === 'cleanup-failed' ? 'cleanup'
    : kind === 'publication-conflict' || kind === 'publication-failed' ? 'publish'
      : kind === 'source-dirty' || kind === 'source-drift' || kind === 'request-invalid'
        || kind === 'build-unattested' ? 'preflight' : null;
  if (requiredPhase !== null && phase !== requiredPhase) {
    throw new Error(`${name}.${kind} 必须位于 ${requiredPhase} phase。`);
  }
  return record as unknown as ArenaPa7FormalFailureV1;
}

function evidenceHashView(record: StrictRecord): Readonly<StrictRecord> {
  return omitField(omitField(record, 'evidenceHash') as StrictRecord, 'generatedAt');
}

export function createArenaPa7FormalEvidenceHashV1(value: unknown): string {
  const source = cloneArenaPa7FormalStrictDataV1(value, 'PA7 evidence hash input');
  const record = strictRecord(
    source,
    EVIDENCE_KEYS.filter((key) => key !== 'evidenceHash'),
    'PA7 evidence hash input',
  );
  return deterministicSha256(omitField(record, 'generatedAt'));
}

export function validateArenaPa7FormalEvidenceV1(value: unknown): ArenaPa7FormalEvidenceV1 {
  const source = cloneArenaPa7FormalStrictDataV1(value, 'ArenaPa7FormalEvidenceV1');
  const record = strictRecord(source, EVIDENCE_KEYS, 'ArenaPa7FormalEvidenceV1');
  if (record.schemaVersion !== ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION
    || record.contractId !== ARENA_PA7_FORMAL_CONTRACT_ID) {
    throw new Error('ArenaPa7FormalEvidenceV1 schema/contract 不受支持。');
  }
  const sourceIdentity = validateSource(record.sourceIdentity, 'PA7 evidence.sourceIdentity');
  validateBuild(record.buildIdentity, 'PA7 evidence.buildIdentity');
  validateEnvironment(record.environmentIdentity, 'PA7 evidence.environmentIdentity');
  validateRequest(record.request, 'PA7 evidence.request');
  const progress = validateProgress(record.progress, 'PA7 evidence.progress');
  const payload = record.payload === null ? null : validatePayloadCloned(record.payload, 'PA7 evidence.payload');
  const gates = strictArray(record.gates, 'PA7 evidence.gates').map((item, index) => {
    const gate = strictRecord(item, GATE_KEYS, `PA7 evidence.gates[${index}]`);
    const expectedId = ARENA_PA7_FORMAL_GATE_IDS[index];
    if (gate.id !== expectedId) throw new Error(`PA7 evidence.gates[${index}] ID/顺序漂移。`);
    if (typeof gate.passed !== 'boolean') throw new TypeError(`PA7 evidence.gates[${index}].passed 必须是 boolean。`);
    sha256Hash(gate.evidenceHash, `PA7 evidence.gates[${index}].evidenceHash`);
    if (gate.passed) {
      if (gate.failureReason !== null) throw new Error(`PA7 evidence.gates[${index}] passed 时 reason 必须 null。`);
    } else {
      enumValue(gate.failureReason, ARENA_PA7_FORMAL_FAILURE_KINDS, `PA7 evidence.gates[${index}].failureReason`);
    }
    return gate as unknown as ArenaPa7FormalGateV1;
  });
  if (gates.length !== ARENA_PA7_FORMAL_GATE_IDS.length) throw new Error('PA7 evidence gates 数量漂移。');
  const cleanup = validateEvidenceCleanup(record.cleanup, 'PA7 evidence.cleanup');
  if (record.status !== 'formal-passed' && record.status !== 'formal-failed') {
    throw new RangeError('PA7 evidence.status 不受支持。');
  }
  const failure = record.failure === null ? null : validateFailure(record.failure, 'PA7 evidence.failure');
  sha256Hash(record.semanticHash, 'PA7 evidence.semanticHash');
  const generatedAt = nonEmptyString(record.generatedAt, 'PA7 evidence.generatedAt');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(generatedAt)
    || Number.isNaN(Date.parse(generatedAt))) throw new TypeError('PA7 evidence.generatedAt 必须是 UTC ISO 时间。');
  if (payload !== null) {
    assertOrderedEqual(record.request, payload.request, 'PA7 evidence request/payload');
    assertOrderedEqual(progress, payload.progressFinal, 'PA7 evidence progress/payload progressFinal');
    if (progress.runToken !== payload.runToken) throw new Error('PA7 evidence progress/payload token 不一致。');
    const build = record.buildIdentity as ArenaPa7FormalBuildIdentityV1;
    if (build.loaderAttestationHash !== payload.workloadIdentity.loaderAttestationHash) {
      throw new Error('PA7 build/workload loader attestation identity 不一致。');
    }
    if (record.semanticHash !== payload.semanticHash) throw new Error('PA7 evidence/payload semanticHash 不一致。');
  }
  if (record.status === 'formal-passed') {
    if (payload === null || failure !== null || gates.some((gate) => !gate.passed)
      || sourceIdentity.sourceDirty
      || sourceIdentity.repositoryFingerprintBefore !== sourceIdentity.repositoryFingerprintAfter
      || cleanup.childProcessesStarted !== cleanup.childProcessesExited
      || cleanup.temporaryPathsCreated !== cleanup.temporaryPathsRemoved
      || cleanup.pendingCleanupCount !== 0 || cleanup.cleanupErrorCount !== 0) {
      throw new Error('PA7 formal-passed 的 payload/gate/source/cleanup 不闭合。');
    }
  } else if (failure === null || gates.every((gate) => gate.passed)) {
    throw new Error('PA7 formal-failed 必须有结构化 failure 与失败 gate。');
  }
  if (failure !== null) {
    if (!gates.some((gate) => !gate.passed && gate.failureReason === failure.kind)) {
      throw new Error('PA7 failure.kind 必须与至少一个失败 gate 对齐。');
    }
    if (failure.completedCases !== progress.completedCases
      || failure.currentCaseIndex !== progress.currentCaseIndex
      || failure.currentCaseId !== progress.currentCaseId
      || failure.currentPass !== progress.currentPass
      || failure.currentTick !== progress.currentTick
      || failure.lastCommittedCaseEvidenceHash !== progress.lastCommittedCaseEvidenceHash) {
      throw new Error('PA7 failure/progress identity 不一致。');
    }
    if (failure.sourceFingerprintBefore !== null
      && failure.sourceFingerprintBefore !== sourceIdentity.repositoryFingerprintBefore) {
      throw new Error('PA7 failure/source before identity 不一致。');
    }
    if (failure.sourceFingerprintAfter !== null
      && failure.sourceFingerprintAfter !== sourceIdentity.repositoryFingerprintAfter) {
      throw new Error('PA7 failure/source after identity 不一致。');
    }
    if (failure.cleanupErrors.length !== cleanup.cleanupErrorCount) {
      throw new Error('PA7 failure/cleanup error count 不一致。');
    }
  }
  sha256Hash(record.evidenceHash, 'PA7 evidence.evidenceHash');
  assertHash(
    record.evidenceHash,
    deterministicSha256(evidenceHashView(record)),
    'PA7 evidence.evidenceHash',
  );
  return record as unknown as ArenaPa7FormalEvidenceV1;
}

export function assertArenaPa7FormalEvidenceV1(value: unknown): asserts value is ArenaPa7FormalEvidenceV1 {
  validateArenaPa7FormalEvidenceV1(value);
}
