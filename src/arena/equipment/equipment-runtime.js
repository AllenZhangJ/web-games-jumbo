import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';

export const EQUIPMENT_RUNTIME_SCHEMA_VERSION = 1;

export const EQUIPMENT_LOCATION_STATE = Object.freeze({
  SPAWNED: 'spawned',
  HELD: 'held',
  DROPPED: 'dropped',
  DESPAWNED: 'despawned',
});

const CREATE_KEYS = new Set([
  'instanceId',
  'definitionId',
  'spawnId',
  'position',
  'equipmentRegistry',
]);
const RUNTIME_KEYS = new Set([
  'schemaVersion',
  'instanceId',
  'definitionId',
  'spawnId',
  'locationState',
  'ownerId',
  'originPosition',
  'position',
  'lastSafePosition',
  'cooldownRemainingTicks',
  'revision',
]);
const VECTOR_KEYS = new Set(['x', 'y', 'z']);
const LOCATION_STATES = new Set(Object.values(EQUIPMENT_LOCATION_STATE));

function clonePosition(value, name) {
  assertKnownKeys(value, VECTOR_KEYS, name);
  const result = {};
  for (const axis of VECTOR_KEYS) {
    if (!Number.isFinite(value[axis])) throw new RangeError(`${name}.${axis} 必须是有限数。`);
    result[axis] = value[axis];
  }
  return result;
}

function freezePosition(value) {
  return value ? Object.freeze({ x: value.x, y: value.y, z: value.z }) : null;
}

export function createEquipmentRuntimeState(options) {
  assertKnownKeys(options, CREATE_KEYS, 'EquipmentRuntime options');
  const definitionId = assertNonEmptyString(
    options.definitionId,
    'EquipmentRuntime.definitionId',
  );
  if (!options.equipmentRegistry || typeof options.equipmentRegistry.require !== 'function') {
    throw new TypeError('EquipmentRuntime 需要只读 EquipmentRegistry。');
  }
  options.equipmentRegistry.require(definitionId);
  const position = clonePosition(options.position, 'EquipmentRuntime.position');
  const state = {
    locationState: EQUIPMENT_LOCATION_STATE.SPAWNED,
    ownerId: null,
    originPosition: Object.freeze({ ...position }),
    position,
    lastSafePosition: { ...position },
    cooldownRemainingTicks: 0,
    revision: 0,
  };
  Object.defineProperties(state, {
    schemaVersion: {
      value: EQUIPMENT_RUNTIME_SCHEMA_VERSION,
      enumerable: true,
    },
    instanceId: {
      value: assertNonEmptyString(options.instanceId, 'EquipmentRuntime.instanceId'),
      enumerable: true,
    },
    definitionId: {
      value: definitionId,
      enumerable: true,
    },
    spawnId: {
      value: assertNonEmptyString(options.spawnId, 'EquipmentRuntime.spawnId'),
      enumerable: true,
    },
  });
  return Object.seal(state);
}

export function createEquipmentRuntimeSnapshot(state) {
  assertKnownKeys(state, RUNTIME_KEYS, 'EquipmentRuntime state');
  if (state.schemaVersion !== EQUIPMENT_RUNTIME_SCHEMA_VERSION) {
    throw new RangeError(
      `EquipmentRuntime.schemaVersion 必须是 ${EQUIPMENT_RUNTIME_SCHEMA_VERSION}。`,
    );
  }
  if (!LOCATION_STATES.has(state.locationState)) {
    throw new RangeError(`EquipmentRuntime.locationState 不受支持：${String(state.locationState)}。`);
  }
  const ownerId = state.ownerId === null
    ? null
    : assertNonEmptyString(state.ownerId, 'EquipmentRuntime.ownerId');
  const position = state.position === null
    ? null
    : freezePosition(clonePosition(state.position, 'EquipmentRuntime.position'));
  if (
    state.locationState === EQUIPMENT_LOCATION_STATE.HELD
    && (ownerId === null || position !== null)
  ) throw new RangeError('held EquipmentRuntime 必须有 ownerId 且不能有世界 position。');
  if (
    (state.locationState === EQUIPMENT_LOCATION_STATE.SPAWNED
      || state.locationState === EQUIPMENT_LOCATION_STATE.DROPPED)
    && (ownerId !== null || position === null)
  ) throw new RangeError('spawned/dropped EquipmentRuntime 必须有 position 且不能有 ownerId。');
  if (
    state.locationState === EQUIPMENT_LOCATION_STATE.DESPAWNED
    && (ownerId !== null || position !== null)
  ) throw new RangeError('despawned EquipmentRuntime 不能有 ownerId 或 position。');
  return Object.freeze({
    schemaVersion: EQUIPMENT_RUNTIME_SCHEMA_VERSION,
    instanceId: assertNonEmptyString(state.instanceId, 'EquipmentRuntime.instanceId'),
    definitionId: assertNonEmptyString(state.definitionId, 'EquipmentRuntime.definitionId'),
    spawnId: assertNonEmptyString(state.spawnId, 'EquipmentRuntime.spawnId'),
    locationState: assertNonEmptyString(state.locationState, 'EquipmentRuntime.locationState'),
    ownerId,
    originPosition: freezePosition(clonePosition(state.originPosition, 'EquipmentRuntime.originPosition')),
    position,
    lastSafePosition: state.lastSafePosition === null
      ? null
      : freezePosition(clonePosition(
        state.lastSafePosition,
        'EquipmentRuntime.lastSafePosition',
      )),
    cooldownRemainingTicks: assertIntegerAtLeast(
      state.cooldownRemainingTicks,
      0,
      'EquipmentRuntime.cooldownRemainingTicks',
    ),
    revision: assertIntegerAtLeast(state.revision, 0, 'EquipmentRuntime.revision'),
  });
}
