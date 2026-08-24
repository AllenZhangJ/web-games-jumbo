export { normalizeMovementIntent } from '@number-strategy-jump/arena-contracts';
export {
  assertFiniteNumber,
  assertPhysicsWorld,
  assertPositiveNumber,
  assertVector3,
  cloneCharacterState,
  moveToward,
  validateArenaDefinition,
  validateCharacterDefinition,
} from './physics-adapter.js';
export type {
  PhysicsArenaDefinition,
  PhysicsCharacterBody,
  PhysicsCharacterDefinition,
  PhysicsCharacterResetState,
  PhysicsCharacterState,
  PhysicsRuntimeArena,
  PhysicsRuntimeSurface,
  PhysicsVector2,
  PhysicsVector3,
  PhysicsWorld,
} from './physics-adapter.js';
export { createMovementPhysicsPort } from './movement-physics-port.js';
export {
  ARENA_FIXED_DT,
  ARENA_PHYSICS,
  ARENA_TICK_RATE,
} from './physics-config.js';
export type { ArenaPhysicsConfig } from './physics-config.js';
export {
  LIGHTWEIGHT_PHYSICS_CHECKPOINT_V1_SCHEMA_VERSION,
  createLightweightPhysicsCheckpointV1,
  createLightweightPhysicsWorld,
  createLightweightPhysicsWorldFromCheckpointV1,
  validateLightweightPhysicsCheckpointV1,
} from './lightweight-physics.js';
export type {
  CheckpointableLightweightPhysicsWorldV1,
  LightweightPhysicsCheckpointV1,
  LightweightPhysicsWorldOptions,
} from './lightweight-physics.js';
export { createCharacterPhysicsProfile } from './character-physics-profile.js';
export type { CharacterPhysicsProfile } from './character-physics-profile.js';
