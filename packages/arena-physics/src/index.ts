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
export { createLightweightPhysicsWorld } from './lightweight-physics.js';
