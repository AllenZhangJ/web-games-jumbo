import {
  ARENA_INPUT_MAPPER_ID,
  createInputMapper,
} from './input-mapper-contract.js';
import { GESTURE_DIRECTION } from './gesture-recognizer.js';

export function createGestureInputMapperA() {
  return createInputMapper(ARENA_INPUT_MAPPER_ID.GESTURE_MOBILITY, ({ raw, gestures }) => ({
    moveX: raw.move.vector.x,
    moveZ: raw.move.vector.z,
    primaryPressed: raw.primary.edges.started && !raw.primary.edges.cancelled,
    primaryHeld: raw.primary.active,
    jumpPressed:
      gestures.move.directionReleased === GESTURE_DIRECTION.UP
      && !gestures.move.wasDirectionHeld,
    jumpHeld: gestures.move.directionHeld === GESTURE_DIRECTION.UP,
    slamPressed: gestures.move.directionPressed === GESTURE_DIRECTION.DOWN,
  }));
}
