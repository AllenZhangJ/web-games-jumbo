import { MOVEMENT_MODE } from './movement-runtime.js';

export function createMovementCapabilities({
  participantId,
  state,
  definition,
  contact,
  canMove,
}) {
  const standard = state.mode === MOVEMENT_MODE.STANDARD;
  const canGroundJump = canMove && standard && (
    contact.grounded || state.coyoteTicksRemaining > 0
  );
  return Object.freeze({
    participantId,
    canMove,
    grounded: contact.grounded,
    mode: state.mode,
    crouchActionDefinitionId: state.crouchActionId,
    hasBufferedJump: state.jumpBufferTicksRemaining > 0,
    canGroundJump,
    canAirJump: canMove
      && standard
      && !contact.grounded
      && state.coyoteTicksRemaining === 0
      && state.airJumpsUsed < definition.jump.maximumAirJumps,
    canBeginCrouchJump: canMove
      && standard
      && contact.grounded
      && definition.jump.maximumCrouchChargeTicks > 0,
    canReleaseCrouchJump: canMove
      && state.mode === MOVEMENT_MODE.CROUCH_CHARGING
      && (contact.grounded || state.coyoteTicksRemaining > 0),
    canBeginDownSmash: canMove && standard && !contact.grounded,
  });
}
