import {
  ARENA_INPUT_MAPPER_ID,
  createInputMapper,
} from './input-mapper-contract.js';
import { GESTURE_DIRECTION } from './gesture-recognizer.js';

/**
 * Production controls keep combat and traversal visible and independent:
 * left stick moves, the primary button attacks/uses equipment, and the jump
 * button owns both ground and air jumps. No hidden gesture changes semantics.
 */
export function createExplicitCombatJumpMapper() {
  return createInputMapper(ARENA_INPUT_MAPPER_ID.EXPLICIT_COMBAT_JUMP, ({ raw, gestures }) => ({
    moveX: raw.move.vector.x,
    moveZ: raw.move.vector.z,
    primaryPressed: raw.primary.edges.started && !raw.primary.edges.cancelled,
    primaryHeld: raw.primary.active,
    jumpPressed: raw.jump.edges.started && !raw.jump.edges.cancelled,
    jumpHeld: raw.jump.active,
    // The visible jump button remains one-tap simple. Dragging it downward
    // after take-off is the optional advanced down-smash gesture.
    slamPressed: gestures.jump.directionPressed === GESTURE_DIRECTION.DOWN,
  }));
}
