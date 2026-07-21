import { MOVEMENT_COMMAND_KIND, MOVEMENT_MODE } from '@number-strategy-jump/arena-movement';

function captureMutableFields(state) {
  return {
    mode: state.mode,
    coyoteTicksRemaining: state.coyoteTicksRemaining,
    jumpBufferTicksRemaining: state.jumpBufferTicksRemaining,
    airJumpsUsed: state.airJumpsUsed,
    crouchChargeTicks: state.crouchChargeTicks,
    crouchActionId: state.crouchActionId,
    downSmashActionId: state.downSmashActionId,
  };
}

function markChanged(state, before) {
  if (
    state.mode !== before.mode
    || state.coyoteTicksRemaining !== before.coyoteTicksRemaining
    || state.jumpBufferTicksRemaining !== before.jumpBufferTicksRemaining
    || state.airJumpsUsed !== before.airJumpsUsed
    || state.crouchChargeTicks !== before.crouchChargeTicks
    || state.crouchActionId !== before.crouchActionId
    || state.downSmashActionId !== before.downSmashActionId
  ) state.revision += 1;
}

export function resetTransientMovement(state, { resetAirJumps = false } = {}) {
  state.mode = MOVEMENT_MODE.STANDARD;
  state.coyoteTicksRemaining = 0;
  state.jumpBufferTicksRemaining = 0;
  if (resetAirJumps) state.airJumpsUsed = 0;
  state.crouchChargeTicks = 0;
  state.crouchActionId = null;
  state.downSmashActionId = null;
}

export function prepareMovementRuntimeState({ state, definition, contact, input, canMove }) {
  const before = captureMutableFields(state);
  if (!canMove) {
    resetTransientMovement(state);
    markChanged(state, before);
    return;
  }
  if (contact.grounded) {
    state.coyoteTicksRemaining = definition.jump.coyoteTicks;
    state.airJumpsUsed = 0;
  }
  if (state.mode === MOVEMENT_MODE.CROUCH_CHARGING) {
    if (!contact.grounded) {
      state.mode = MOVEMENT_MODE.STANDARD;
      state.crouchChargeTicks = 0;
      state.crouchActionId = null;
    } else if (input.jumpHeld) {
      state.crouchChargeTicks = Math.min(
        definition.jump.maximumCrouchChargeTicks,
        state.crouchChargeTicks + 1,
      );
    }
  }
  if (input.jumpPressed && state.mode === MOVEMENT_MODE.STANDARD) {
    state.jumpBufferTicksRemaining = definition.jump.bufferTicks;
  }
  markChanged(state, before);
}

export function applyMovementExecutionState(state, operation) {
  const before = captureMutableFields(state);
  const { command } = operation;
  if (command.kind === MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP) {
    state.coyoteTicksRemaining = 0;
    state.jumpBufferTicksRemaining = 0;
  } else if (command.kind === MOVEMENT_COMMAND_KIND.REQUEST_AIR_JUMP) {
    state.coyoteTicksRemaining = 0;
    state.jumpBufferTicksRemaining = 0;
    state.airJumpsUsed += 1;
  } else if (command.kind === MOVEMENT_COMMAND_KIND.BEGIN_CROUCH_JUMP) {
    state.mode = MOVEMENT_MODE.CROUCH_CHARGING;
    state.crouchChargeTicks = 1;
    state.crouchActionId = command.actionDefinitionId;
    state.jumpBufferTicksRemaining = 0;
  } else if (command.kind === MOVEMENT_COMMAND_KIND.RELEASE_CROUCH_JUMP) {
    state.mode = MOVEMENT_MODE.STANDARD;
    state.crouchChargeTicks = 0;
    state.crouchActionId = null;
    state.coyoteTicksRemaining = 0;
    state.jumpBufferTicksRemaining = 0;
  } else {
    state.mode = MOVEMENT_MODE.DOWN_SMASH;
    state.crouchChargeTicks = 0;
    state.crouchActionId = null;
    state.coyoteTicksRemaining = 0;
    state.jumpBufferTicksRemaining = 0;
    state.downSmashActionId = command.actionDefinitionId;
  }
  markChanged(state, before);
}

export function completeMovementRuntimeState({
  state,
  definition,
  beforeContact,
  afterContact,
}) {
  const before = captureMutableFields(state);
  const landed = !beforeContact.grounded && afterContact.grounded;
  let transition = null;
  if (afterContact.grounded) {
    state.coyoteTicksRemaining = definition.jump.coyoteTicks;
    state.airJumpsUsed = 0;
    if (state.mode === MOVEMENT_MODE.DOWN_SMASH) {
      transition = Object.freeze({
        kind: 'down-smash-landed',
        participantId: state.participantId,
        actionDefinitionId: state.downSmashActionId,
      });
      state.mode = MOVEMENT_MODE.STANDARD;
      state.downSmashActionId = null;
    }
  } else {
    if (!beforeContact.grounded && state.coyoteTicksRemaining > 0) {
      state.coyoteTicksRemaining -= 1;
    }
    if (state.mode === MOVEMENT_MODE.CROUCH_CHARGING) {
      state.mode = MOVEMENT_MODE.STANDARD;
      state.crouchChargeTicks = 0;
      state.crouchActionId = null;
    }
  }
  if (!landed && state.jumpBufferTicksRemaining > 0) {
    state.jumpBufferTicksRemaining -= 1;
  }
  markChanged(state, before);
  return transition;
}

export function interruptMovementRuntimeState(state) {
  const before = captureMutableFields(state);
  resetTransientMovement(state);
  markChanged(state, before);
}
