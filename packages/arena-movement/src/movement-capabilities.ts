import {
  MOVEMENT_MODE,
  type MovementMode,
  type MovementRuntimeState,
} from './movement-runtime.js';

import type { CharacterDefinition } from '@number-strategy-jump/arena-definitions';

export interface MovementContact {
  readonly grounded: boolean;
}

export interface CreateMovementCapabilitiesOptions {
  readonly participantId: string;
  readonly state: MovementRuntimeState;
  readonly definition: CharacterDefinition;
  readonly contact: MovementContact;
  readonly canMove: boolean;
}

export interface MovementCapabilities {
  readonly participantId: string;
  readonly canMove: boolean;
  readonly grounded: boolean;
  readonly mode: MovementMode;
  readonly crouchActionDefinitionId: string | null;
  readonly hasBufferedJump: boolean;
  readonly canGroundJump: boolean;
  readonly canAirJump: boolean;
  readonly canBeginCrouchJump: boolean;
  readonly canReleaseCrouchJump: boolean;
  readonly canBeginDownSmash: boolean;
}

export function createMovementCapabilities({
  participantId,
  state,
  definition,
  contact,
  canMove,
}: CreateMovementCapabilitiesOptions): MovementCapabilities {
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
