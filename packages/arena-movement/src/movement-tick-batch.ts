import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';

export interface MovementContactSnapshot {
  readonly participantId: string;
  readonly grounded: boolean;
}

export interface MovementTickInput {
  readonly tick: number;
  readonly participantId: string;
  readonly jumpPressed: boolean;
  readonly jumpHeld: boolean;
  readonly moveX: number;
  readonly moveZ: number;
}

export interface MovementAvailability {
  readonly participantId: string;
  readonly canMove: boolean;
}

export interface MovementPrepareBatch {
  readonly tick: number;
  readonly contacts: Map<string, MovementContactSnapshot>;
  readonly inputs: Map<string, MovementTickInput>;
  readonly availability: Map<string, MovementAvailability>;
}

export interface MovementCompleteBatch {
  readonly tick: number;
  readonly contacts: Map<string, MovementContactSnapshot>;
}

const PREPARE_KEYS = new Set(['tick', 'contacts', 'inputs', 'availability']);
const COMPLETE_KEYS = new Set(['tick', 'contacts']);
const CONTACT_KEYS = new Set(['participantId', 'grounded']);
const INPUT_KEYS = new Set([
  'tick',
  'participantId',
  'jumpPressed',
  'jumpHeld',
  'moveX',
  'moveZ',
]);
const AVAILABILITY_KEYS = new Set(['participantId', 'canMove']);

function cloneParticipantBatch<T>(
  values: unknown,
  participantIds: readonly string[],
  keys: ReadonlySet<string>,
  name: string,
  cloneValue: (value: PlainRecord, index: number, participantId: string) => T,
): Map<string, T> {
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
    byId.set(participantId, cloneValue(value, index, participantId));
  }
  return byId;
}

function createContactBatch(
  values: unknown,
  participantIds: readonly string[],
  name: string,
): Map<string, MovementContactSnapshot> {
  return cloneParticipantBatch(values, participantIds, CONTACT_KEYS, name, (
    value,
    index,
    participantId,
  ) => {
    if (typeof value.grounded !== 'boolean') {
      throw new TypeError(`${name}[${index}].grounded 必须是布尔值。`);
    }
    return Object.freeze({ participantId, grounded: value.grounded });
  });
}

function createInputBatch(
  values: unknown,
  participantIds: readonly string[],
  tick: number,
): Map<string, MovementTickInput> {
  return cloneParticipantBatch(
    values,
    participantIds,
    INPUT_KEYS,
    'Movement inputs',
    (value, index, participantId) => {
      if (value.tick !== tick) {
        throw new RangeError(`Movement inputs[${index}].tick 必须等于 ${tick}。`);
      }
      if (typeof value.jumpPressed !== 'boolean' || typeof value.jumpHeld !== 'boolean') {
        throw new TypeError(`Movement inputs[${index}] 跳跃字段必须是布尔值。`);
      }
      const moveX = value.moveX ?? 0;
      const moveZ = value.moveZ ?? 0;
      if (typeof moveX !== 'number' || !Number.isFinite(moveX)
        || typeof moveZ !== 'number' || !Number.isFinite(moveZ)) {
        throw new TypeError(`Movement inputs[${index}] moveX/moveZ 必须是有限数。`);
      }
      return Object.freeze({
        tick,
        participantId,
        jumpPressed: value.jumpPressed,
        jumpHeld: value.jumpHeld,
        moveX: Math.max(-1, Math.min(1, moveX)),
        moveZ: Math.max(-1, Math.min(1, moveZ)),
      });
    },
  );
}

function createAvailabilityBatch(
  values: unknown,
  participantIds: readonly string[],
): Map<string, MovementAvailability> {
  return cloneParticipantBatch(
    values,
    participantIds,
    AVAILABILITY_KEYS,
    'Movement availability',
    (value, index, participantId) => {
      if (typeof value.canMove !== 'boolean') {
        throw new TypeError(`Movement availability[${index}].canMove 必须是布尔值。`);
      }
      return Object.freeze({ participantId, canMove: value.canMove });
    },
  );
}

export function createMovementPrepareBatch(
  options: unknown,
  participantIds: readonly string[],
): MovementPrepareBatch {
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

export function createMovementCompleteBatch(
  options: unknown,
  participantIds: readonly string[],
): MovementCompleteBatch {
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
