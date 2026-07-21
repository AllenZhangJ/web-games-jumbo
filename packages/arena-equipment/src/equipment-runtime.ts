import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import type { EquipmentDefinition } from '@number-strategy-jump/arena-definitions';

export const EQUIPMENT_RUNTIME_SCHEMA_VERSION = 1;

export const EQUIPMENT_LOCATION_STATE = Object.freeze({
  SPAWNED: 'spawned',
  HELD: 'held',
  DROPPED: 'dropped',
  DESPAWNED: 'despawned',
} as const);

export type EquipmentLocationState =
  typeof EQUIPMENT_LOCATION_STATE[keyof typeof EQUIPMENT_LOCATION_STATE];

export interface EquipmentPosition {
  x: number;
  y: number;
  z: number;
}

export interface EquipmentRegistryContract {
  require(id: string): EquipmentDefinition;
}

export interface EquipmentRuntimeState {
  readonly schemaVersion: typeof EQUIPMENT_RUNTIME_SCHEMA_VERSION;
  readonly instanceId: string;
  readonly definitionId: string;
  readonly spawnId: string;
  locationState: EquipmentLocationState;
  ownerId: string | null;
  readonly originPosition: Readonly<EquipmentPosition>;
  position: EquipmentPosition | null;
  lastSafePosition: EquipmentPosition | null;
  cooldownRemainingTicks: number;
  revision: number;
}

export interface EquipmentRuntimeSnapshot {
  readonly schemaVersion: typeof EQUIPMENT_RUNTIME_SCHEMA_VERSION;
  readonly instanceId: string;
  readonly definitionId: string;
  readonly spawnId: string;
  readonly locationState: EquipmentLocationState;
  readonly ownerId: string | null;
  readonly originPosition: Readonly<EquipmentPosition>;
  readonly position: Readonly<EquipmentPosition> | null;
  readonly lastSafePosition: Readonly<EquipmentPosition> | null;
  readonly cooldownRemainingTicks: number;
  readonly revision: number;
}

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
const LOCATION_STATES: ReadonlySet<string> = new Set(Object.values(EQUIPMENT_LOCATION_STATE));

function clonePosition(value: unknown, name: string): EquipmentPosition {
  assertKnownKeys(value, VECTOR_KEYS, name);
  const result: EquipmentPosition = { x: 0, y: 0, z: 0 };
  for (const axis of ['x', 'y', 'z'] as const) {
    const coordinate = value[axis];
    if (!Number.isFinite(coordinate)) throw new RangeError(`${name}.${axis} 必须是有限数。`);
    result[axis] = coordinate as number;
  }
  return result;
}

function freezePosition(
  value: EquipmentPosition | null,
): Readonly<EquipmentPosition> | null {
  return value ? Object.freeze({ x: value.x, y: value.y, z: value.z }) : null;
}

export function createEquipmentRuntimeState(options: unknown): EquipmentRuntimeState {
  assertKnownKeys(options, CREATE_KEYS, 'EquipmentRuntime options');
  const definitionId = assertNonEmptyString(
    options.definitionId,
    'EquipmentRuntime.definitionId',
  );
  const equipmentRegistry = options.equipmentRegistry as Partial<EquipmentRegistryContract> | null;
  if (!equipmentRegistry || typeof equipmentRegistry.require !== 'function') {
    throw new TypeError('EquipmentRuntime 需要只读 EquipmentRegistry。');
  }
  equipmentRegistry.require(definitionId);
  const position = clonePosition(options.position, 'EquipmentRuntime.position');
  const state = {
    locationState: EQUIPMENT_LOCATION_STATE.SPAWNED,
    ownerId: null,
    originPosition: Object.freeze({ ...position }),
    position,
    lastSafePosition: { ...position },
    cooldownRemainingTicks: 0,
    revision: 0,
  } as Omit<EquipmentRuntimeState, 'schemaVersion' | 'instanceId' | 'definitionId' | 'spawnId'>
    & Partial<Pick<
      EquipmentRuntimeState,
      'schemaVersion' | 'instanceId' | 'definitionId' | 'spawnId'
    >>;
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
  return Object.seal(state) as EquipmentRuntimeState;
}

export function createEquipmentRuntimeSnapshot(state: unknown): EquipmentRuntimeSnapshot {
  assertKnownKeys(state, RUNTIME_KEYS, 'EquipmentRuntime state');
  if (state.schemaVersion !== EQUIPMENT_RUNTIME_SCHEMA_VERSION) {
    throw new RangeError(
      `EquipmentRuntime.schemaVersion 必须是 ${EQUIPMENT_RUNTIME_SCHEMA_VERSION}。`,
    );
  }
  if (typeof state.locationState !== 'string' || !LOCATION_STATES.has(state.locationState)) {
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
    locationState: state.locationState as EquipmentLocationState,
    ownerId,
    originPosition: freezePosition(
      clonePosition(state.originPosition, 'EquipmentRuntime.originPosition'),
    ) as Readonly<EquipmentPosition>,
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
