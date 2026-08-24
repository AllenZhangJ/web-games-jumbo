import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
  type DeepReadonly,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  EQUIPMENT_LOCATION_STATE,
  createEquipmentRuntimeSnapshot,
  type EquipmentRuntimeSnapshot,
} from './equipment-runtime.js';

export const EQUIPMENT_SYSTEM_CHECKPOINT_V1_SCHEMA_VERSION = 1 as const;

export interface EquipmentSystemCheckpointV1 {
  readonly schemaVersion: typeof EQUIPMENT_SYSTEM_CHECKPOINT_V1_SCHEMA_VERSION;
  readonly participantIds: readonly string[];
  readonly runtimes: readonly EquipmentRuntimeSnapshot[];
  readonly expiredHeldSupplyEquipmentInstanceIds: readonly string[];
  readonly checkpointIdentityHash: string;
}

const CORE_KEYS = new Set([
  'schemaVersion',
  'participantIds',
  'runtimes',
  'expiredHeldSupplyEquipmentInstanceIds',
]);
const KEYS = new Set([...CORE_KEYS, 'checkpointIdentityHash']);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

function exact(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
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

function sortedUniqueIds(value: unknown, name: string, allowEmpty: boolean): readonly string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new RangeError(`${name}必须是${allowEmpty ? '' : '非空'}数组。`);
  }
  const ids = value.map((entry, index) => assertNonEmptyString(entry, `${name}[${index}]`));
  for (let index = 1; index < ids.length; index += 1) {
    if (ids[index - 1]! >= ids[index]!) {
      throw new RangeError(`${name}必须唯一且稳定升序。`);
    }
  }
  return Object.freeze(ids);
}

function normalizeCore(
  value: unknown,
): Omit<EquipmentSystemCheckpointV1, 'checkpointIdentityHash'> {
  const source = exact(value, CORE_KEYS, 'EquipmentSystemCheckpointV1');
  if (field(source, 'schemaVersion', 'EquipmentSystemCheckpointV1')
    !== EQUIPMENT_SYSTEM_CHECKPOINT_V1_SCHEMA_VERSION) {
    throw new RangeError('EquipmentSystemCheckpointV1.schemaVersion必须是1。');
  }
  const participantIds = sortedUniqueIds(
    field(source, 'participantIds', 'EquipmentSystemCheckpointV1'),
    'EquipmentSystemCheckpointV1.participantIds',
    false,
  );
  const rawRuntimes = field(source, 'runtimes', 'EquipmentSystemCheckpointV1');
  if (!Array.isArray(rawRuntimes)) {
    throw new TypeError('EquipmentSystemCheckpointV1.runtimes必须是数组。');
  }
  const runtimes = Object.freeze(rawRuntimes.map(createEquipmentRuntimeSnapshot));
  for (let index = 1; index < runtimes.length; index += 1) {
    if (runtimes[index - 1]!.instanceId >= runtimes[index]!.instanceId) {
      throw new RangeError('EquipmentSystemCheckpointV1.runtimes必须按instanceId唯一稳定升序。');
    }
  }
  const participantSet = new Set(participantIds);
  const heldOwners = new Set<string>();
  for (const runtime of runtimes) {
    if (runtime.locationState !== EQUIPMENT_LOCATION_STATE.HELD) continue;
    if (runtime.ownerId === null || !participantSet.has(runtime.ownerId)) {
      throw new RangeError('EquipmentSystemCheckpointV1 held owner不属于participant。');
    }
    if (heldOwners.has(runtime.ownerId)) {
      throw new RangeError('EquipmentSystemCheckpointV1 participant不能持有多件装备。');
    }
    heldOwners.add(runtime.ownerId);
  }
  const expiredHeldSupplyEquipmentInstanceIds = sortedUniqueIds(
    field(source, 'expiredHeldSupplyEquipmentInstanceIds', 'EquipmentSystemCheckpointV1'),
    'EquipmentSystemCheckpointV1.expiredHeldSupplyEquipmentInstanceIds',
    true,
  );
  const runtimeById = new Map(runtimes.map((runtime) => [runtime.instanceId, runtime]));
  for (const instanceId of expiredHeldSupplyEquipmentInstanceIds) {
    if (runtimeById.get(instanceId)?.locationState !== EQUIPMENT_LOCATION_STATE.HELD) {
      throw new RangeError('EquipmentSystemCheckpointV1 expired-held必须引用仍由participant持有的装备。');
    }
  }
  return Object.freeze({
    schemaVersion: EQUIPMENT_SYSTEM_CHECKPOINT_V1_SCHEMA_VERSION,
    participantIds,
    runtimes,
    expiredHeldSupplyEquipmentInstanceIds,
  });
}

function withIdentity(
  core: Omit<EquipmentSystemCheckpointV1, 'checkpointIdentityHash'>,
): EquipmentSystemCheckpointV1 {
  return Object.freeze({
    ...core,
    checkpointIdentityHash: createDeterministicDataHash(
      core,
      'EquipmentSystemCheckpointV1 identity',
    ),
  });
}

export function createEquipmentSystemCheckpointV1(
  value: unknown,
): EquipmentSystemCheckpointV1 {
  return withIdentity(normalizeCore(
    cloneFrozenData(value, 'EquipmentSystemCheckpointV1 create options'),
  ));
}

export function validateEquipmentSystemCheckpointV1(
  value: unknown,
): DeepReadonly<EquipmentSystemCheckpointV1> {
  const source = exact(
    cloneFrozenData(value, 'EquipmentSystemCheckpointV1'),
    KEYS,
    'EquipmentSystemCheckpointV1',
  );
  const checkpointIdentityHash = field(
    source,
    'checkpointIdentityHash',
    'EquipmentSystemCheckpointV1',
  );
  if (typeof checkpointIdentityHash !== 'string' || !HASH_PATTERN.test(checkpointIdentityHash)) {
    throw new TypeError('EquipmentSystemCheckpointV1 checkpointIdentityHash无效。');
  }
  const core = Object.fromEntries([...CORE_KEYS].map((key) => [
    key,
    field(source, key, 'EquipmentSystemCheckpointV1'),
  ]));
  const normalized = withIdentity(normalizeCore(core));
  if (normalized.checkpointIdentityHash !== checkpointIdentityHash) {
    throw new RangeError('EquipmentSystemCheckpointV1 identity hash漂移。');
  }
  return normalized;
}
