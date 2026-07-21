import { createContextInputMapperB } from './context-input-mapper-b.js';
import { createExplicitCombatJumpMapper } from './explicit-combat-jump-mapper.js';
import { createGestureInputMapperA } from './gesture-input-mapper-a.js';
import { ARENA_INPUT_MAPPER_ID } from './input-mapper-contract.js';

export function createArenaInputMapper(mapperId) {
  if (mapperId === ARENA_INPUT_MAPPER_ID.GESTURE_MOBILITY) {
    return createGestureInputMapperA();
  }
  if (mapperId === ARENA_INPUT_MAPPER_ID.CONTEXT_PRIMARY) {
    return createContextInputMapperB();
  }
  if (mapperId === ARENA_INPUT_MAPPER_ID.EXPLICIT_COMBAT_JUMP) {
    return createExplicitCombatJumpMapper();
  }
  throw new RangeError(`未知 Arena InputMapper ${String(mapperId)}。`);
}
