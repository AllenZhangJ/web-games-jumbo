import {
  ARENA_INPUT_MAPPER_ID,
  createInputMapper,
} from './input-mapper-contract.js';
import { GESTURE_DIRECTION } from './gesture-recognizer.js';

export function createContextInputMapperB() {
  return createInputMapper(ARENA_INPUT_MAPPER_ID.CONTEXT_PRIMARY, ({
    raw,
    gestures,
    actionAffordance,
  }) => {
    const downGesture = gestures.primary.direction === GESTURE_DIRECTION.DOWN;
    const pressAffordance = actionAffordance?.channels.primary ?? null;
    const holdAffordance = actionAffordance?.channels.primaryHold ?? null;
    const crouchHold = !downGesture
      && gestures.primary.contactHeld
      && pressAffordance?.kind === 'selected'
      && pressAffordance.lane === 'locomotion'
      && holdAffordance?.kind === 'selected'
      && holdAffordance.lane === 'locomotion';
    return {
      moveX: raw.move.vector.x,
      moveZ: raw.move.vector.z,
      primaryPressed: !downGesture && (
        (gestures.primary.contactHoldStarted && !crouchHold)
        || gestures.primary.tapReleased
      ),
      primaryHeld: crouchHold,
      jumpPressed: false,
      jumpHeld: false,
      slamPressed: gestures.primary.directionPressed === GESTURE_DIRECTION.DOWN,
    };
  });
}
