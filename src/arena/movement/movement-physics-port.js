import { assertPhysicsWorld } from '../physics/physics-adapter.js';
import { createMovementMutation } from '@number-strategy-jump/arena-movement';

export function createMovementPhysicsPort(physicsWorld) {
  const world = assertPhysicsWorld(physicsWorld);
  return Object.freeze({
    applyBatch(operations) {
      if (!Array.isArray(operations)) {
        throw new TypeError('Movement physics operations 必须是数组。');
      }
      const normalized = Object.freeze(operations.map(createMovementMutation));
      world.applyCharacterMutationBatch(normalized);
    },
  });
}
