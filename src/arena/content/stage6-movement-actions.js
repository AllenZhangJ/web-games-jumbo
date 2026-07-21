import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
  createActionDefinition,
} from '@number-strategy-jump/arena-definitions';
import { MOVEMENT_COMMAND_KIND } from '../movement/movement-command.js';

export const STAGE6_MOVEMENT_ACTION_ID = Object.freeze({
  EXPLICIT_GROUND_JUMP: 'movement.explicit-ground-jump',
  EXPLICIT_AIR_JUMP: 'movement.explicit-air-jump',
  EXPLICIT_CROUCH_BEGIN: 'movement.explicit-crouch-begin',
  EXPLICIT_CROUCH_RELEASE: 'movement.explicit-crouch-release',
  CONTEXT_GROUND_JUMP: 'movement.context-ground-jump',
  CONTEXT_AIR_JUMP: 'movement.context-air-jump',
  CONTEXT_CROUCH_BEGIN: 'movement.context-crouch-begin',
  CONTEXT_CROUCH_RELEASE: 'movement.context-crouch-release',
  DOWN_SMASH: 'movement.down-smash',
});

function movementAction({ id, channel, trigger, commandKind }) {
  return createActionDefinition({
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id,
    kind: 'movement',
    input: { channel, trigger },
    lane: ACTION_LANE.LOCOMOTION,
    conflictTags: [],
    timing: { windupTicks: 0, activeTicks: 1, recoveryTicks: 0, cooldownTicks: 0 },
    targeting: { kind: 'none', parameters: {} },
    effects: [{
      id: `${id}.command`,
      kind: commandKind,
      trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
      parameters: {},
    }],
    tags: ['movement'],
  });
}

export const STAGE6_MOVEMENT_ACTION_DEFINITIONS = Object.freeze([
  movementAction({
    id: STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP,
    channel: ACTION_INPUT_CHANNEL.JUMP,
    trigger: ACTION_INPUT_TRIGGER.PRESSED,
    commandKind: MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP,
  }),
  movementAction({
    id: STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP,
    channel: ACTION_INPUT_CHANNEL.JUMP,
    trigger: ACTION_INPUT_TRIGGER.PRESSED,
    commandKind: MOVEMENT_COMMAND_KIND.REQUEST_AIR_JUMP,
  }),
  movementAction({
    id: STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_BEGIN,
    channel: ACTION_INPUT_CHANNEL.JUMP,
    trigger: ACTION_INPUT_TRIGGER.HELD,
    commandKind: MOVEMENT_COMMAND_KIND.BEGIN_CROUCH_JUMP,
  }),
  movementAction({
    id: STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_RELEASE,
    channel: ACTION_INPUT_CHANNEL.JUMP,
    trigger: ACTION_INPUT_TRIGGER.RELEASED,
    commandKind: MOVEMENT_COMMAND_KIND.RELEASE_CROUCH_JUMP,
  }),
  movementAction({
    id: STAGE6_MOVEMENT_ACTION_ID.CONTEXT_GROUND_JUMP,
    channel: ACTION_INPUT_CHANNEL.PRIMARY,
    trigger: ACTION_INPUT_TRIGGER.PRESSED,
    commandKind: MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP,
  }),
  movementAction({
    id: STAGE6_MOVEMENT_ACTION_ID.CONTEXT_AIR_JUMP,
    channel: ACTION_INPUT_CHANNEL.PRIMARY,
    trigger: ACTION_INPUT_TRIGGER.PRESSED,
    commandKind: MOVEMENT_COMMAND_KIND.REQUEST_AIR_JUMP,
  }),
  movementAction({
    id: STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_BEGIN,
    channel: ACTION_INPUT_CHANNEL.PRIMARY,
    trigger: ACTION_INPUT_TRIGGER.HELD,
    commandKind: MOVEMENT_COMMAND_KIND.BEGIN_CROUCH_JUMP,
  }),
  movementAction({
    id: STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_RELEASE,
    channel: ACTION_INPUT_CHANNEL.PRIMARY,
    trigger: ACTION_INPUT_TRIGGER.RELEASED,
    commandKind: MOVEMENT_COMMAND_KIND.RELEASE_CROUCH_JUMP,
  }),
  movementAction({
    id: STAGE6_MOVEMENT_ACTION_ID.DOWN_SMASH,
    channel: ACTION_INPUT_CHANNEL.SLAM,
    trigger: ACTION_INPUT_TRIGGER.PRESSED,
    commandKind: MOVEMENT_COMMAND_KIND.BEGIN_DOWN_SMASH,
  }),
]);
