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
