import { createCharacterDefinition } from '@number-strategy-jump/arena-definitions';

export const MOVEMENT_GAIT = Object.freeze({
  IDLE: 'idle',
  WALK: 'walk',
  RUN: 'run',
});

function finiteAxis(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
  return Math.max(-1, Math.min(1, value));
}

/**
 * Projects a semantic stick vector into the normalized intent consumed by the
 * physics adapter. CharacterDefinition remains the only source for walk/run
 * speeds; Physics still owns acceleration, velocity and transforms.
 */
function project(moveX, moveZ, movement) {
  let x = finiteAxis(moveX, 'MovementIntent.moveX');
  let z = finiteAxis(moveZ, 'MovementIntent.moveZ');
  const rawMagnitude = Math.hypot(x, z);
  if (rawMagnitude === 0) {
    return Object.freeze({ x: 0, z: 0, gait: MOVEMENT_GAIT.IDLE, targetSpeed: 0 });
  }
  if (rawMagnitude > 1) {
    x /= rawMagnitude;
    z /= rawMagnitude;
  }
  const inputMagnitude = Math.min(1, rawMagnitude);
  const { walkSpeed, runSpeed, runInputThreshold } = movement;
  let targetSpeed;
  let gait;
  if (inputMagnitude < runInputThreshold) {
    targetSpeed = walkSpeed * (inputMagnitude / runInputThreshold);
    gait = MOVEMENT_GAIT.WALK;
  } else {
    const runRange = 1 - runInputThreshold;
    const runProgress = runRange > 0
      ? (inputMagnitude - runInputThreshold) / runRange
      : 1;
    targetSpeed = walkSpeed + (runSpeed - walkSpeed) * runProgress;
    gait = MOVEMENT_GAIT.RUN;
  }
  const normalizedSpeed = targetSpeed / runSpeed;
  const directionScale = normalizedSpeed / inputMagnitude;
  return Object.freeze({
    x: x * directionScale,
    z: z * directionScale,
    gait,
    targetSpeed,
  });
}

export function createCharacterMovementIntentProjector(characterDefinition) {
  const definition = createCharacterDefinition(characterDefinition);
  const movement = definition.movement;
  return Object.freeze({
    project(moveX, moveZ) {
      return project(moveX, moveZ, movement);
    },
  });
}

export function projectCharacterMovementIntent({ moveX, moveZ, characterDefinition }) {
  return createCharacterMovementIntentProjector(characterDefinition).project(moveX, moveZ);
}
