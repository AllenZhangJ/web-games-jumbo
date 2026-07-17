import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../rules/definition-utils.js';

const PREPARE_KEYS = new Set(['tick', 'contacts', 'inputs', 'availability']);
const COMPLETE_KEYS = new Set(['tick', 'contacts']);
const CONTACT_KEYS = new Set(['participantId', 'grounded']);
const INPUT_KEYS = new Set(['tick', 'participantId', 'jumpPressed', 'jumpHeld']);
const AVAILABILITY_KEYS = new Set(['participantId', 'canMove']);

function cloneParticipantBatch(values, participantIds, keys, name, cloneValue) {
  if (!Array.isArray(values) || values.length !== participantIds.length) {
    throw new RangeError(`${name} 必须覆盖全部 participants。`);
  }
  const participantIdSet = new Set(participantIds);
  const byId = new Map();
  for (let index = 0; index < values.length; index += 1) {
    // The owning options object was already recursively cloned and frozen by
    // createMovementPrepareBatch/createMovementCompleteBatch. Re-cloning each
    // entry here doubled the hot-path validation cost without adding a trust
    // boundary.
    const value = values[index];
    assertKnownKeys(value, keys, `${name}[${index}]`);
    const participantId = assertNonEmptyString(
      value.participantId,
      `${name}[${index}].participantId`,
    );
    if (!participantIdSet.has(participantId)) {
      throw new RangeError(`${name} 包含未知 participant ${participantId}。`);
    }
    if (byId.has(participantId)) throw new RangeError(`${name} 包含重复 ${participantId}。`);
    byId.set(participantId, cloneValue(value, index));
  }
  return byId;
}

function createContactBatch(values, participantIds, name) {
  return cloneParticipantBatch(values, participantIds, CONTACT_KEYS, name, (value, index) => {
    if (typeof value.grounded !== 'boolean') {
      throw new TypeError(`${name}[${index}].grounded 必须是布尔值。`);
    }
    return Object.freeze({ participantId: value.participantId, grounded: value.grounded });
  });
}

function createInputBatch(values, participantIds, tick) {
  return cloneParticipantBatch(
    values,
    participantIds,
    INPUT_KEYS,
    'Movement inputs',
    (value, index) => {
      if (value.tick !== tick) {
        throw new RangeError(`Movement inputs[${index}].tick 必须等于 ${tick}。`);
      }
      if (typeof value.jumpPressed !== 'boolean' || typeof value.jumpHeld !== 'boolean') {
        throw new TypeError(`Movement inputs[${index}] 跳跃字段必须是布尔值。`);
      }
      return Object.freeze({
        tick,
        participantId: value.participantId,
        jumpPressed: value.jumpPressed,
        jumpHeld: value.jumpHeld,
      });
    },
  );
}

function createAvailabilityBatch(values, participantIds) {
  return cloneParticipantBatch(
    values,
    participantIds,
    AVAILABILITY_KEYS,
    'Movement availability',
    (value, index) => {
      if (typeof value.canMove !== 'boolean') {
        throw new TypeError(`Movement availability[${index}].canMove 必须是布尔值。`);
      }
      return Object.freeze({ participantId: value.participantId, canMove: value.canMove });
    },
  );
}

export function createMovementPrepareBatch(options, participantIds) {
  const source = cloneFrozenData(options, 'MovementSystem prepareTick options');
  assertKnownKeys(source, PREPARE_KEYS, 'MovementSystem prepareTick options');
  const tick = assertIntegerAtLeast(source.tick, 0, 'MovementSystem prepareTick tick');
  return Object.freeze({
    tick,
    contacts: createContactBatch(source.contacts, participantIds, 'Movement contacts'),
    inputs: createInputBatch(source.inputs, participantIds, tick),
    availability: createAvailabilityBatch(source.availability, participantIds),
  });
}

export function createMovementCompleteBatch(options, participantIds) {
  const source = cloneFrozenData(options, 'MovementSystem completeTick options');
  assertKnownKeys(source, COMPLETE_KEYS, 'MovementSystem completeTick options');
  return Object.freeze({
    tick: assertIntegerAtLeast(source.tick, 0, 'MovementSystem completeTick tick'),
    contacts: createContactBatch(
      source.contacts,
      participantIds,
      'Movement after contacts',
    ),
  });
}
