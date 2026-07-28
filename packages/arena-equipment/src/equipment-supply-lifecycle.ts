import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  createEquipmentSupplyDefinition,
  type EquipmentSupplyDefinition,
} from '@number-strategy-jump/arena-definitions';

export const EQUIPMENT_SUPPLY_LIFECYCLE_SCHEMA_VERSION = 1 as const;

export interface EquipmentSupplyLifecycle {
  readonly schemaVersion: typeof EQUIPMENT_SUPPLY_LIFECYCLE_SCHEMA_VERSION;
  readonly supplyDefinitionId: string;
  readonly supplyId: string;
  readonly equipmentInstanceId: string;
  readonly spawnTick: number;
  readonly expireTick: number;
}

export type EquipmentSupplyEventIdentity = Omit<EquipmentSupplyLifecycle, 'schemaVersion'>;

const LIFECYCLE_KEYS = new Set([
  'schemaVersion',
  'supplyDefinitionId',
  'supplyId',
  'equipmentInstanceId',
  'spawnTick',
  'expireTick',
]);

function safeTick(value: unknown, name: string): number {
  const tick = assertIntegerAtLeast(value, 0, name);
  if (!Number.isSafeInteger(tick)) throw new RangeError(`${name} 必须是安全整数。`);
  return tick;
}

export function createEquipmentSupplyLifecycle(
  value: unknown,
  definitionValue: unknown,
): EquipmentSupplyLifecycle {
  const source = cloneFrozenData(value, 'EquipmentSupplyLifecycle');
  assertKnownKeys(source, LIFECYCLE_KEYS, 'EquipmentSupplyLifecycle');
  if (source.schemaVersion !== EQUIPMENT_SUPPLY_LIFECYCLE_SCHEMA_VERSION) {
    throw new RangeError(
      `EquipmentSupplyLifecycle.schemaVersion 必须是 ${EQUIPMENT_SUPPLY_LIFECYCLE_SCHEMA_VERSION}。`,
    );
  }
  const definition: EquipmentSupplyDefinition = createEquipmentSupplyDefinition(definitionValue);
  const supplyDefinitionId = assertNonEmptyString(
    source.supplyDefinitionId,
    'EquipmentSupplyLifecycle.supplyDefinitionId',
  );
  if (supplyDefinitionId !== definition.id) {
    throw new RangeError('EquipmentSupplyLifecycle.supplyDefinitionId 与 Definition 不一致。');
  }
  const spawnTick = safeTick(source.spawnTick, 'EquipmentSupplyLifecycle.spawnTick');
  const expireTick = safeTick(source.expireTick, 'EquipmentSupplyLifecycle.expireTick');
  if (spawnTick < definition.firstSpawnTick) {
    throw new RangeError(
      `EquipmentSupplyLifecycle.spawnTick 不能早于 firstSpawnTick ${definition.firstSpawnTick}。`,
    );
  }
  const waveOffsetTicks = spawnTick - definition.firstSpawnTick;
  if (waveOffsetTicks % definition.spawnIntervalTicks !== 0) {
    throw new RangeError(
      'EquipmentSupplyLifecycle.spawnTick 必须属于 Definition 的合法生成波次。',
    );
  }
  const expectedExpireTick = spawnTick + definition.lifetimeTicks;
  if (!Number.isSafeInteger(expectedExpireTick)) {
    throw new RangeError('EquipmentSupplyLifecycle.expireTick 超出安全整数范围。');
  }
  if (expireTick !== expectedExpireTick) {
    throw new RangeError(
      `EquipmentSupplyLifecycle.expireTick 必须等于 spawnTick + ${definition.lifetimeTicks}。`,
    );
  }
  return Object.freeze({
    schemaVersion: EQUIPMENT_SUPPLY_LIFECYCLE_SCHEMA_VERSION,
    supplyDefinitionId,
    supplyId: assertNonEmptyString(source.supplyId, 'EquipmentSupplyLifecycle.supplyId'),
    equipmentInstanceId: assertNonEmptyString(
      source.equipmentInstanceId,
      'EquipmentSupplyLifecycle.equipmentInstanceId',
    ),
    spawnTick,
    expireTick,
  });
}

export function createEquipmentSupplyEventIdentity(
  lifecycleValue: unknown,
  definitionValue: unknown,
): EquipmentSupplyEventIdentity {
  const lifecycle = createEquipmentSupplyLifecycle(lifecycleValue, definitionValue);
  return Object.freeze({
    supplyDefinitionId: lifecycle.supplyDefinitionId,
    supplyId: lifecycle.supplyId,
    equipmentInstanceId: lifecycle.equipmentInstanceId,
    spawnTick: lifecycle.spawnTick,
    expireTick: lifecycle.expireTick,
  });
}
