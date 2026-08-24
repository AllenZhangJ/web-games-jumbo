import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
  type DeepReadonly,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import type { ActionExecutionSystemCheckpointV1 } from './action-execution-system.js';

export const ARENA_RULE_ENGINE_CHECKPOINT_V1_SCHEMA_VERSION = 1 as const;

export interface ArenaRuleEngineCheckpointV1 {
  readonly schemaVersion: typeof ARENA_RULE_ENGINE_CHECKPOINT_V1_SCHEMA_VERSION;
  readonly participantIds: readonly string[];
  readonly baseActionDefinitionId: string;
  readonly baseAirActionDefinitionId: string;
  readonly allowBaseAttackWhiff: boolean;
  readonly contentHash: string;
  readonly actionExecutionCheckpoint: ActionExecutionSystemCheckpointV1;
  readonly equipmentCheckpoint: DeepReadonly<unknown>;
  readonly checkpointIdentityHash: string;
}

const CORE_KEYS = new Set([
  'schemaVersion',
  'participantIds',
  'baseActionDefinitionId',
  'baseAirActionDefinitionId',
  'allowBaseAttackWhiff',
  'contentHash',
  'actionExecutionCheckpoint',
  'equipmentCheckpoint',
]);
const KEYS = new Set([...CORE_KEYS, 'checkpointIdentityHash']);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
  return source;
}

function field(source: PlainRecord, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function normalizeCore(
  value: unknown,
): Omit<ArenaRuleEngineCheckpointV1, 'checkpointIdentityHash'> {
  const name = 'ArenaRuleEngineCheckpointV1';
  const source = exactRecord(value, CORE_KEYS, name);
  if (field(source, 'schemaVersion', name) !== ARENA_RULE_ENGINE_CHECKPOINT_V1_SCHEMA_VERSION) {
    throw new RangeError('ArenaRuleEngineCheckpointV1.schemaVersion必须是1。');
  }
  const rawParticipantIds = field(source, 'participantIds', name);
  if (!Array.isArray(rawParticipantIds) || rawParticipantIds.length === 0) {
    throw new RangeError('ArenaRuleEngineCheckpointV1.participantIds必须是非空数组。');
  }
  const participantIds = Object.freeze(rawParticipantIds.map((value, index) => (
    assertNonEmptyString(value, `ArenaRuleEngineCheckpointV1.participantIds[${index}]`)
  )));
  const sortedParticipantIds = Object.freeze([...participantIds].sort(compareText));
  if (
    participantIds.length !== new Set(participantIds).size
    || participantIds.some((participantId, index) => participantId !== sortedParticipantIds[index])
  ) throw new RangeError('ArenaRuleEngineCheckpointV1.participantIds必须唯一稳定升序。');
  const allowBaseAttackWhiff = field(source, 'allowBaseAttackWhiff', name);
  if (typeof allowBaseAttackWhiff !== 'boolean') {
    throw new TypeError('ArenaRuleEngineCheckpointV1.allowBaseAttackWhiff必须是布尔值。');
  }
  const contentHash = field(source, 'contentHash', name);
  if (typeof contentHash !== 'string' || !HASH_PATTERN.test(contentHash)) {
    throw new TypeError('ArenaRuleEngineCheckpointV1.contentHash无效。');
  }
  const actionExecutionCheckpoint = cloneFrozenData(
    field(source, 'actionExecutionCheckpoint', name),
    'ArenaRuleEngineCheckpointV1.actionExecutionCheckpoint',
  ) as DeepReadonly<ActionExecutionSystemCheckpointV1>;
  const equipmentCheckpoint = cloneFrozenData(
    field(source, 'equipmentCheckpoint', name),
    'ArenaRuleEngineCheckpointV1.equipmentCheckpoint',
  );
  return Object.freeze({
    schemaVersion: ARENA_RULE_ENGINE_CHECKPOINT_V1_SCHEMA_VERSION,
    participantIds,
    baseActionDefinitionId: assertNonEmptyString(
      field(source, 'baseActionDefinitionId', name),
      'ArenaRuleEngineCheckpointV1.baseActionDefinitionId',
    ),
    baseAirActionDefinitionId: assertNonEmptyString(
      field(source, 'baseAirActionDefinitionId', name),
      'ArenaRuleEngineCheckpointV1.baseAirActionDefinitionId',
    ),
    allowBaseAttackWhiff,
    contentHash,
    actionExecutionCheckpoint,
    equipmentCheckpoint,
  });
}

function withIdentity(
  core: Omit<ArenaRuleEngineCheckpointV1, 'checkpointIdentityHash'>,
): ArenaRuleEngineCheckpointV1 {
  return Object.freeze({
    ...core,
    checkpointIdentityHash: createDeterministicDataHash(
      core,
      'ArenaRuleEngineCheckpointV1 identity',
    ),
  });
}

export function createArenaRuleEngineCheckpointV1(
  value: unknown,
): ArenaRuleEngineCheckpointV1 {
  return withIdentity(normalizeCore(
    cloneFrozenData(value, 'ArenaRuleEngineCheckpointV1 create options'),
  ));
}

export function validateArenaRuleEngineCheckpointV1(
  value: unknown,
): DeepReadonly<ArenaRuleEngineCheckpointV1> {
  const name = 'ArenaRuleEngineCheckpointV1';
  const source = exactRecord(cloneFrozenData(value, name), KEYS, name);
  const checkpointIdentityHash = field(source, 'checkpointIdentityHash', name);
  if (typeof checkpointIdentityHash !== 'string' || !HASH_PATTERN.test(checkpointIdentityHash)) {
    throw new TypeError('ArenaRuleEngineCheckpointV1.checkpointIdentityHash无效。');
  }
  const core = Object.fromEntries([...CORE_KEYS].map((key) => [key, field(source, key, name)]));
  const normalized = withIdentity(normalizeCore(core));
  if (normalized.checkpointIdentityHash !== checkpointIdentityHash) {
    throw new RangeError('ArenaRuleEngineCheckpointV1 identity hash漂移。');
  }
  return normalized;
}
