import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPositiveFinite,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const EQUIPMENT_SUPPLY_DEFINITION_SCHEMA_VERSION = 1 as const;

export const EQUIPMENT_SUPPLY_REPLACEMENT_POLICY = Object.freeze({
  ATOMIC_RECYCLE_HELD: 'atomic-recycle-held',
} as const);

export const EQUIPMENT_SUPPLY_EXPIRY_POLICY = Object.freeze({
  WORLD_ONLY_AT_EXPIRE_TICK: 'world-only-at-expire-tick',
} as const);

export const EQUIPMENT_SUPPLY_TICK_PHASE = Object.freeze({
  SPAWN: 'spawn',
  EXPIRE: 'expire',
  PICKUP: 'pickup',
  ACTION: 'action',
} as const);

export const EQUIPMENT_SUPPLY_TICK_ORDER = Object.freeze([
  EQUIPMENT_SUPPLY_TICK_PHASE.SPAWN,
  EQUIPMENT_SUPPLY_TICK_PHASE.EXPIRE,
  EQUIPMENT_SUPPLY_TICK_PHASE.PICKUP,
  EQUIPMENT_SUPPLY_TICK_PHASE.ACTION,
] as const);

export type EquipmentSupplyReplacementPolicy =
  typeof EQUIPMENT_SUPPLY_REPLACEMENT_POLICY[keyof typeof EQUIPMENT_SUPPLY_REPLACEMENT_POLICY];

export type EquipmentSupplyExpiryPolicy =
  typeof EQUIPMENT_SUPPLY_EXPIRY_POLICY[keyof typeof EQUIPMENT_SUPPLY_EXPIRY_POLICY];

export type EquipmentSupplyTickPhase = typeof EQUIPMENT_SUPPLY_TICK_ORDER[number];

export interface EquipmentSupplyDefinition {
  readonly schemaVersion: typeof EQUIPMENT_SUPPLY_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly firstSpawnTick: number;
  readonly spawnIntervalTicks: number;
  readonly spawnCount: number;
  readonly pickupRadius: number;
  readonly lifetimeTicks: number;
  readonly replacementPolicy: EquipmentSupplyReplacementPolicy;
  readonly expiryPolicy: EquipmentSupplyExpiryPolicy;
  readonly tickOrder: readonly EquipmentSupplyTickPhase[];
}

const DEFINITION_KEYS = new Set([
  'schemaVersion',
  'id',
  'firstSpawnTick',
  'spawnIntervalTicks',
  'spawnCount',
  'pickupRadius',
  'lifetimeTicks',
  'replacementPolicy',
  'expiryPolicy',
  'tickOrder',
]);

function positiveSafeInteger(value: unknown, name: string): number {
  const normalized = assertIntegerAtLeast(value, 1, name);
  if (!Number.isSafeInteger(normalized)) {
    throw new RangeError(`${name} 必须是正安全整数。`);
  }
  return normalized;
}

function nonNegativeSafeInteger(value: unknown, name: string): number {
  return assertIntegerAtLeast(value, 0, name);
}

function assertTickOrder(value: unknown): readonly EquipmentSupplyTickPhase[] {
  if (!Array.isArray(value) || value.length !== EQUIPMENT_SUPPLY_TICK_ORDER.length) {
    throw new RangeError('EquipmentSupplyDefinition.tickOrder 必须完整声明四个权威阶段。');
  }
  for (let index = 0; index < EQUIPMENT_SUPPLY_TICK_ORDER.length; index += 1) {
    if (value[index] !== EQUIPMENT_SUPPLY_TICK_ORDER[index]) {
      throw new RangeError(
        'EquipmentSupplyDefinition.tickOrder 必须是 spawn → expire → pickup → action。',
      );
    }
  }
  return EQUIPMENT_SUPPLY_TICK_ORDER;
}

export function createEquipmentSupplyDefinition(value: unknown): EquipmentSupplyDefinition {
  const source = cloneFrozenData(value, 'EquipmentSupplyDefinition');
  assertKnownKeys(source, DEFINITION_KEYS, 'EquipmentSupplyDefinition');
  if (source.schemaVersion !== EQUIPMENT_SUPPLY_DEFINITION_SCHEMA_VERSION) {
    throw new RangeError(
      `EquipmentSupplyDefinition.schemaVersion 必须是 ${EQUIPMENT_SUPPLY_DEFINITION_SCHEMA_VERSION}。`,
    );
  }
  if (source.replacementPolicy !== EQUIPMENT_SUPPLY_REPLACEMENT_POLICY.ATOMIC_RECYCLE_HELD) {
    throw new RangeError(
      'EquipmentSupplyDefinition.replacementPolicy 必须是 atomic-recycle-held。',
    );
  }
  if (source.expiryPolicy !== EQUIPMENT_SUPPLY_EXPIRY_POLICY.WORLD_ONLY_AT_EXPIRE_TICK) {
    throw new RangeError(
      'EquipmentSupplyDefinition.expiryPolicy 必须是 world-only-at-expire-tick。',
    );
  }
  return Object.freeze({
    schemaVersion: EQUIPMENT_SUPPLY_DEFINITION_SCHEMA_VERSION,
    id: assertNonEmptyString(source.id, 'EquipmentSupplyDefinition.id'),
    firstSpawnTick: nonNegativeSafeInteger(
      source.firstSpawnTick,
      'EquipmentSupplyDefinition.firstSpawnTick',
    ),
    spawnIntervalTicks: positiveSafeInteger(
      source.spawnIntervalTicks,
      'EquipmentSupplyDefinition.spawnIntervalTicks',
    ),
    spawnCount: positiveSafeInteger(source.spawnCount, 'EquipmentSupplyDefinition.spawnCount'),
    pickupRadius: assertPositiveFinite(
      source.pickupRadius,
      'EquipmentSupplyDefinition.pickupRadius',
    ),
    lifetimeTicks: positiveSafeInteger(
      source.lifetimeTicks,
      'EquipmentSupplyDefinition.lifetimeTicks',
    ),
    replacementPolicy: source.replacementPolicy,
    expiryPolicy: source.expiryPolicy,
    tickOrder: assertTickOrder(source.tickOrder),
  });
}

export function calculateEquipmentSupplySpawnTick(
  definitionValue: unknown,
  waveIndexValue: unknown,
): number {
  const definition = createEquipmentSupplyDefinition(definitionValue);
  const waveIndex = nonNegativeSafeInteger(
    waveIndexValue,
    'EquipmentSupply waveIndex',
  );
  const spawnTick = definition.firstSpawnTick + definition.spawnIntervalTicks * waveIndex;
  if (!Number.isSafeInteger(spawnTick)) {
    throw new RangeError('EquipmentSupply spawn tick 超出安全整数范围。');
  }
  return spawnTick;
}
