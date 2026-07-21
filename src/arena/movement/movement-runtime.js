import { createCharacterDefinition } from '../character/character-definition.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';

export const MOVEMENT_RUNTIME_SCHEMA_VERSION = 2;

export const MOVEMENT_MODE = Object.freeze({
  STANDARD: 'standard',
  CROUCH_CHARGING: 'crouch-charging',
  DOWN_SMASH: 'down-smash',
});

const MODES = new Set(Object.values(MOVEMENT_MODE));
const CREATE_KEYS = new Set(['participantId', 'characterDefinition']);
const RUNTIME_KEYS = new Set([
  'schemaVersion',
  'participantId',
  'characterDefinitionId',
  'mode',
  'coyoteTicksRemaining',
  'jumpBufferTicksRemaining',
  'airJumpsUsed',
  'crouchChargeTicks',
  'crouchActionId',
  'downSmashActionId',
  'revision',
]);

function integerWithin(value, maximum, name) {
  const normalized = assertIntegerAtLeast(value, 0, name);
  if (normalized > maximum) {
    throw new RangeError(`${name} 不能大于 ${maximum}。`);
  }
  return normalized;
}

function createRawMovementRuntimeState(participantId, characterDefinitionId) {
  const state = {
    mode: MOVEMENT_MODE.STANDARD,
    coyoteTicksRemaining: 0,
    jumpBufferTicksRemaining: 0,
    airJumpsUsed: 0,
    crouchChargeTicks: 0,
    crouchActionId: null,
    downSmashActionId: null,
    revision: 0,
  };
  Object.defineProperties(state, {
    schemaVersion: {
      value: MOVEMENT_RUNTIME_SCHEMA_VERSION,
      enumerable: true,
    },
    participantId: {
      value: assertNonEmptyString(participantId, 'MovementRuntime.participantId'),
      enumerable: true,
    },
    characterDefinitionId: {
      value: assertNonEmptyString(
        characterDefinitionId,
        'MovementRuntime.characterDefinitionId',
      ),
      enumerable: true,
    },
  });
  return Object.seal(state);
}

export function createMovementRuntimeState(options) {
  assertKnownKeys(options, CREATE_KEYS, 'MovementRuntime options');
  const definition = createCharacterDefinition(options.characterDefinition);
  return createRawMovementRuntimeState(options.participantId, definition.id);
}

export function cloneMovementRuntimeState(state) {
  assertKnownKeys(state, RUNTIME_KEYS, 'MovementRuntime state');
  if (state.schemaVersion !== MOVEMENT_RUNTIME_SCHEMA_VERSION) {
    throw new RangeError(
      `MovementRuntime.schemaVersion 必须是 ${MOVEMENT_RUNTIME_SCHEMA_VERSION}。`,
    );
  }
  const clone = createRawMovementRuntimeState(
    state.participantId,
    state.characterDefinitionId,
  );
  clone.mode = state.mode;
  clone.coyoteTicksRemaining = state.coyoteTicksRemaining;
  clone.jumpBufferTicksRemaining = state.jumpBufferTicksRemaining;
  clone.airJumpsUsed = state.airJumpsUsed;
  clone.crouchChargeTicks = state.crouchChargeTicks;
  clone.crouchActionId = state.crouchActionId;
  clone.downSmashActionId = state.downSmashActionId;
  clone.revision = state.revision;
  return clone;
}

function createSnapshotWithDefinition(state, definition) {
  assertKnownKeys(state, RUNTIME_KEYS, 'MovementRuntime state');
  if (state.schemaVersion !== MOVEMENT_RUNTIME_SCHEMA_VERSION) {
    throw new RangeError(
      `MovementRuntime.schemaVersion 必须是 ${MOVEMENT_RUNTIME_SCHEMA_VERSION}。`,
    );
  }
  const participantId = assertNonEmptyString(
    state.participantId,
    'MovementRuntime.participantId',
  );
  const characterDefinitionId = assertNonEmptyString(
    state.characterDefinitionId,
    'MovementRuntime.characterDefinitionId',
  );
  if (characterDefinitionId !== definition.id) {
    throw new RangeError(
      `MovementRuntime ${participantId} 的 CharacterDefinition 引用不一致。`,
    );
  }
  if (!MODES.has(state.mode)) {
    throw new RangeError(`MovementRuntime.mode 不受支持：${String(state.mode)}。`);
  }
  const snapshot = {
    schemaVersion: MOVEMENT_RUNTIME_SCHEMA_VERSION,
    participantId,
    characterDefinitionId,
    mode: state.mode,
    coyoteTicksRemaining: integerWithin(
      state.coyoteTicksRemaining,
      definition.jump.coyoteTicks,
      'MovementRuntime.coyoteTicksRemaining',
    ),
    jumpBufferTicksRemaining: integerWithin(
      state.jumpBufferTicksRemaining,
      definition.jump.bufferTicks,
      'MovementRuntime.jumpBufferTicksRemaining',
    ),
    airJumpsUsed: integerWithin(
      state.airJumpsUsed,
      definition.jump.maximumAirJumps,
      'MovementRuntime.airJumpsUsed',
    ),
    crouchChargeTicks: integerWithin(
      state.crouchChargeTicks,
      definition.jump.maximumCrouchChargeTicks,
      'MovementRuntime.crouchChargeTicks',
    ),
    crouchActionId: state.crouchActionId === null
      ? null
      : assertNonEmptyString(state.crouchActionId, 'MovementRuntime.crouchActionId'),
    downSmashActionId: state.downSmashActionId === null
      ? null
      : assertNonEmptyString(
        state.downSmashActionId,
        'MovementRuntime.downSmashActionId',
      ),
    revision: assertIntegerAtLeast(state.revision, 0, 'MovementRuntime.revision'),
  };
  if (
    snapshot.mode === MOVEMENT_MODE.STANDARD
    && (
      snapshot.crouchChargeTicks !== 0
      || snapshot.crouchActionId !== null
      || snapshot.downSmashActionId !== null
    )
  ) throw new RangeError('standard MovementRuntime 不能保留蓄力或下砸状态。');
  if (
    snapshot.mode === MOVEMENT_MODE.CROUCH_CHARGING
    && (
      snapshot.crouchActionId === null
      || snapshot.downSmashActionId !== null
      || snapshot.crouchChargeTicks < 1
    )
  ) throw new RangeError('crouch-charging MovementRuntime 必须仅保留正蓄力状态。');
  if (
    snapshot.mode === MOVEMENT_MODE.DOWN_SMASH
    && (
      snapshot.downSmashActionId === null
      || snapshot.crouchActionId !== null
      || snapshot.crouchChargeTicks !== 0
    )
  ) throw new RangeError('down-smash MovementRuntime 必须保留 action ID 且不能蓄力。');
  return Object.freeze(snapshot);
}

export function createMovementRuntimeSnapshot(state, characterDefinition) {
  return createSnapshotWithDefinition(state, createCharacterDefinition(characterDefinition));
}

export function createMovementRuntimeSnapshotFromValidatedDefinition(state, definition) {
  if (!Object.isFrozen(definition)) {
    throw new TypeError('MovementRuntime 内部快照需要已冻结 CharacterDefinition。');
  }
  return createSnapshotWithDefinition(state, definition);
}

export function resetMovementRuntimeState(state) {
  state.mode = MOVEMENT_MODE.STANDARD;
  state.coyoteTicksRemaining = 0;
  state.jumpBufferTicksRemaining = 0;
  state.airJumpsUsed = 0;
  state.crouchChargeTicks = 0;
  state.crouchActionId = null;
  state.downSmashActionId = null;
  state.revision += 1;
}
