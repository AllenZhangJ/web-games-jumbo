import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenStringSet,
  createRng,
} from '@number-strategy-jump/arena-contracts';
import type { Vector3Definition } from '@number-strategy-jump/arena-definitions';
import { listCollapsedSurfaceIdsBefore } from './collapse-surfaces-strategy.js';
import type {
  MapEventExecutionContext,
  MapEventExecutionResult,
  MapEventPlanResult,
  MapEventStrategy,
  MapEventValidationContext,
} from '../map-event-strategy-registry.js';
import {
  MAP_DOMAIN_EVENT,
  MAP_EVENT_KIND,
  MAP_RULE_COMMAND,
} from '../map-event-types.js';

const EQUIPMENT_WAVE_KEYS = new Set(['spawnPointIds', 'equipmentDefinitionIds', 'count']);
const PRIVATE_PLAN_KEYS = new Set(['entries']);
const ENTRY_KEYS = new Set([
  'spawnPointId',
  'surfaceId',
  'position',
  'equipmentDefinitionId',
]);
const VECTOR_AXES = ['x', 'y', 'z'] as const;
const VECTOR_KEYS = new Set(VECTOR_AXES);

interface EquipmentWaveParameters {
  readonly spawnPointIds: readonly string[];
  readonly equipmentDefinitionIds: readonly string[];
  readonly count: number;
}

interface EquipmentWaveEntry {
  readonly spawnPointId: string;
  readonly surfaceId: string;
  readonly position: Vector3Definition;
  readonly equipmentDefinitionId: string;
}

function readStringSetPreservingOrder(value: unknown, name: string): readonly string[] {
  const checked = cloneFrozenStringSet(value as readonly unknown[], name);
  if (checked.length === 0) throw new RangeError(`${name} 不能为空。`);
  return Object.freeze([...(value as readonly string[])]);
}

function readParameters(value: unknown, name: string): EquipmentWaveParameters {
  assertKnownKeys(value, EQUIPMENT_WAVE_KEYS, name);
  return Object.freeze({
    spawnPointIds: readStringSetPreservingOrder(value.spawnPointIds, `${name}.spawnPointIds`),
    equipmentDefinitionIds: readStringSetPreservingOrder(
      value.equipmentDefinitionIds,
      `${name}.equipmentDefinitionIds`,
    ),
    count: assertIntegerAtLeast(value.count, 1, `${name}.count`),
  });
}

function cloneVector(value: unknown, name: string): Vector3Definition {
  assertKnownKeys(value, VECTOR_KEYS, name);
  const result = { x: 0, y: 0, z: 0 };
  for (const axis of VECTOR_AXES) {
    if (!Number.isFinite(value[axis])) throw new TypeError(`${name}.${axis} 必须是有限数。`);
    result[axis] = value[axis] as number;
  }
  return Object.freeze(result);
}

function validate({ event, mapDefinition, equipmentRegistry }: MapEventValidationContext): void {
  const parameters = readParameters(event.parameters, `${event.id}.parameters`);
  if (parameters.count > parameters.spawnPointIds.length) {
    throw new RangeError(`${event.id}.count 不能超过候选刷新点数。`);
  }
  const knownPoints = new Set(mapDefinition.equipmentSpawnPoints.map(({ id }) => id));
  for (const pointId of parameters.spawnPointIds) {
    if (!knownPoints.has(pointId)) throw new RangeError(`${event.id} 引用未知 spawn point ${pointId}。`);
  }
  if (!equipmentRegistry || typeof equipmentRegistry.require !== 'function') {
    throw new TypeError('equipment-wave 验证需要 EquipmentRegistry。');
  }
  for (const definitionId of parameters.equipmentDefinitionIds) {
    equipmentRegistry.require(definitionId);
  }
  if (event.schedule.durationTicks !== 0) {
    throw new RangeError(`${event.id} equipment-wave 必须是瞬时事件。`);
  }
}

function plan({
  occurrence,
  mapDefinition,
  mapSnapshot,
  seed,
}: MapEventExecutionContext): MapEventPlanResult {
  const parameters = readParameters(
    occurrence.event.parameters,
    `${occurrence.eventId}.parameters`,
  );
  const enabledSurfaces = new Set(
    mapSnapshot.surfaces.filter(({ enabled }) => enabled).map(({ id }) => id),
  );
  const disabledByRelease = listCollapsedSurfaceIdsBefore(
    mapDefinition,
    occurrence.startTick,
  );
  const allowedPoints = new Set(parameters.spawnPointIds);
  const candidates = mapDefinition.equipmentSpawnPoints
    .filter((point) => (
      allowedPoints.has(point.id)
      && enabledSurfaces.has(point.surfaceId)
      && !disabledByRelease.has(point.surfaceId)
    ))
    .map((point) => ({ ...point }));
  const rng = createRng(seed);
  const entries: EquipmentWaveEntry[] = [];
  while (entries.length < parameters.count && candidates.length > 0) {
    const pointIndex = rng.int(0, candidates.length - 1);
    const [point] = candidates.splice(pointIndex, 1);
    if (!point) throw new Error('equipment-wave 候选刷新点选择越界。');
    entries.push(Object.freeze({
      spawnPointId: point.id,
      surfaceId: point.surfaceId,
      position: point.position,
      equipmentDefinitionId: rng.pick(parameters.equipmentDefinitionIds),
    }));
  }
  return {
    privatePlan: { entries },
    publicPayload: {
      spawnPoints: entries.map(({ spawnPointId, surfaceId, position }) => ({
        spawnPointId,
        surfaceId,
        position,
      })),
    },
  };
}

function readEntry(value: unknown, index: number): EquipmentWaveEntry {
  const name = `equipment-wave privatePlan.entries[${index}]`;
  assertKnownKeys(value, ENTRY_KEYS, name);
  if (typeof value.spawnPointId !== 'string' || value.spawnPointId.length === 0) {
    throw new TypeError(`${name}.spawnPointId 必须是非空字符串。`);
  }
  if (typeof value.surfaceId !== 'string' || value.surfaceId.length === 0) {
    throw new TypeError(`${name}.surfaceId 必须是非空字符串。`);
  }
  if (typeof value.equipmentDefinitionId !== 'string' || value.equipmentDefinitionId.length === 0) {
    throw new TypeError(`${name}.equipmentDefinitionId 必须是非空字符串。`);
  }
  return Object.freeze({
    spawnPointId: value.spawnPointId,
    surfaceId: value.surfaceId,
    position: cloneVector(value.position, `${name}.position`),
    equipmentDefinitionId: value.equipmentDefinitionId,
  });
}

function readPrivatePlan(value: unknown): readonly EquipmentWaveEntry[] {
  assertKnownKeys(value, PRIVATE_PLAN_KEYS, 'equipment-wave privatePlan');
  if (!Array.isArray(value.entries)) {
    throw new TypeError('equipment-wave privatePlan.entries 必须是数组。');
  }
  return Object.freeze(value.entries.map(readEntry));
}

function start({ occurrence, privatePlan }: MapEventExecutionContext): MapEventExecutionResult {
  const entries = readPrivatePlan(privatePlan);
  return {
    commands: entries.map((entry, index) => ({
      kind: MAP_RULE_COMMAND.SPAWN_EQUIPMENT,
      instanceId: `map:${occurrence.occurrenceId}:${index}`,
      definitionId: entry.equipmentDefinitionId,
      spawnId: entry.spawnPointId,
      position: entry.position,
    })),
    events: [{
      type: MAP_DOMAIN_EVENT.EQUIPMENT_WAVE_RELEASED,
      equipment: entries.map((entry) => ({
        spawnPointId: entry.spawnPointId,
        definitionId: entry.equipmentDefinitionId,
      })),
    }],
  };
}

function emptyResult(): MapEventExecutionResult {
  return { commands: [], events: [] };
}

export function createEquipmentWaveStrategy(): Readonly<MapEventStrategy> {
  return Object.freeze({
    kind: MAP_EVENT_KIND.EQUIPMENT_WAVE,
    validate,
    plan,
    start,
    tick: emptyResult,
    end: emptyResult,
  });
}
