export {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
  createActionDefinition,
} from './action-definition.js';
export type {
  ActionDefinition,
  ActionCommitmentDefinition,
  ActionCommitmentExpireOutcome,
  ActionEffect,
  ActionEffectTrigger,
  ActionInput,
  ActionInputChannel,
  ActionInputTrigger,
  ActionLane,
  ActionTargeting,
  ActionTiming,
} from './action-definition.js';
export { ActionRegistry } from './action-registry.js';
export {
  CHARACTER_DEFINITION_SCHEMA_VERSION,
  createCharacterDefinition,
} from './character-definition.js';
export type {
  CharacterCollisionDefinition,
  CharacterDefinition,
  CharacterJumpDefinition,
  CharacterMovementDefinition,
} from './character-definition.js';
export {
  assertCharacterRegistry,
  CharacterRegistry,
  createCharacterRegistrySnapshot,
} from './character-registry.js';
export type { CharacterRegistryContract } from './character-registry.js';
export {
  ARENA_GAMEPLAY_V2_TUNING,
  compileHorizontalImpulseFromDistance,
  compileJumpImpulseFromHeight,
} from './arena-gameplay-v2-tuning.js';
export { projectArenaWeaponPublicNumbers } from './arena-weapon-public-projection.js';
export type {
  ArenaGameplayV2AttackTuning,
  ArenaWeaponPublicNumericProjection,
} from './arena-weapon-public-projection.js';
export {
  createEquipmentDefinition,
  EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_DROP_FALLBACK,
  EQUIPMENT_DROP_POLICY,
  EQUIPMENT_PICKUP_MODE,
} from './equipment-definition.js';
export type { EquipmentDefinition } from './equipment-definition.js';
export { EquipmentRegistry } from './equipment-registry.js';
export {
  EQUIPMENT_SUPPLY_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_SUPPLY_EXPIRY_POLICY,
  EQUIPMENT_SUPPLY_REPLACEMENT_POLICY,
  EQUIPMENT_SUPPLY_TICK_ORDER,
  EQUIPMENT_SUPPLY_TICK_PHASE,
  calculateEquipmentSupplySpawnTick,
  createEquipmentSupplyDefinition,
} from './equipment-supply-definition.js';
export { EquipmentSupplyRegistry } from './equipment-supply-registry.js';
export type { EquipmentSupplyRegistryContract } from './equipment-supply-registry.js';
export type {
  EquipmentSupplyDefinition,
  EquipmentSupplyExpiryPolicy,
  EquipmentSupplyReplacementPolicy,
  EquipmentSupplyTickPhase,
} from './equipment-supply-definition.js';
export {
  createMapDefinition,
  createStaticMapDefinition,
  MAP_DEFINITION_SCHEMA_VERSION,
  MapDefinition,
  STATIC_MAP_ID_PREFIX,
} from './map-definition.js';
export type {
  MapArenaDefinition,
  MapEquipmentSpawnPointDefinition,
  MapEventDefinition,
  MapScheduleDefinition,
  MapSurfaceDefinition,
  Vector3Definition,
} from './map-definition.js';
export { MapRegistry } from './map-registry.js';
// P3 versioned KZ route boundary. No route is registered into the production
// MapRegistry by this export; callers must provide an explicit candidate source.
export * from './kz-route-definition-v2.js';
export * from './kz-route-registry-v2.js';
// P4 weapon grammar is data-only and does not register a production weapon.
export * from './weapon-combat-grammar-definition-v1.js';
export {
  ARENA_V1_CHARACTER_ID,
  ARENA_V1_DEFAULT_CHARACTER_ID,
} from './arena-v1-character-ids.js';
export type { ArenaV1CharacterId } from './arena-v1-character-ids.js';
export {
  ARENA_GAMEPLAY_V2_MAP_ID,
  STAGE4_EQUIPMENT_ID,
  STAGE5_MAP_ID,
} from './arena-v1-content-ids.js';
export type { Stage4EquipmentId } from './arena-v1-content-ids.js';

// P2 versioned Definition/Registry boundaries. No production Mode instance is
// registered here; callers must provide an explicit validated registry source.
export * from './mode-definition.js';
export * from './mode-policy-definition.js';
export * from './mode-registry.js';
