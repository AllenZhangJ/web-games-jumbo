import {
  EQUIPMENT_SUPPLY_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_SUPPLY_EXPIRY_POLICY,
  EQUIPMENT_SUPPLY_REPLACEMENT_POLICY,
  EQUIPMENT_SUPPLY_TICK_ORDER,
  EquipmentSupplyRegistry,
  createEquipmentSupplyDefinition,
} from '@number-strategy-jump/arena-definitions';

export const ARENA_V2_SURVIVAL_SUPPLY_DEFINITION = createEquipmentSupplyDefinition({
  schemaVersion: EQUIPMENT_SUPPLY_DEFINITION_SCHEMA_VERSION,
  id: 'arena-v2.survival-supply.v1',
  firstSpawnTick: 1_200,
  spawnIntervalTicks: 1_200,
  spawnCount: 3,
  pickupRadius: 0.8,
  lifetimeTicks: 600,
  replacementPolicy: EQUIPMENT_SUPPLY_REPLACEMENT_POLICY.ATOMIC_RECYCLE_HELD,
  expiryPolicy: EQUIPMENT_SUPPLY_EXPIRY_POLICY.WORLD_ONLY_AT_EXPIRE_TICK,
  tickOrder: EQUIPMENT_SUPPLY_TICK_ORDER,
});

export const ARENA_V2_SURVIVAL_SUPPLY_DEFINITIONS = Object.freeze([
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
]);

export function createArenaV2SurvivalSupplyRegistry(): EquipmentSupplyRegistry {
  return new EquipmentSupplyRegistry(ARENA_V2_SURVIVAL_SUPPLY_DEFINITIONS);
}
