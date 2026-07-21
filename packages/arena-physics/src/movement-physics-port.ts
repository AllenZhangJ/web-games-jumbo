import {
  createMovementMutation,
  type MovementMutation,
  type MovementMutationPort,
} from '@number-strategy-jump/arena-movement';

import { assertPhysicsWorld } from './physics-adapter.js';

export function createMovementPhysicsPort(physicsWorld: unknown): MovementMutationPort {
  const world = assertPhysicsWorld(physicsWorld);
  return Object.freeze({
    applyBatch(operations: readonly MovementMutation[]) {
      if (!Array.isArray(operations)) {
        throw new TypeError('Movement physics operations 必须是数组。');
      }
      const normalized = Object.freeze(operations.map(createMovementMutation));
      world.applyCharacterMutationBatch(normalized);
    },
  });
}
