import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';

export const MAP_DEFINITION_SCHEMA_VERSION = 1;
export const STATIC_MAP_ID_PREFIX = 'custom-static:';

const DEFINITION_KEYS = new Set([
  'schemaVersion',
  'id',
  'arena',
  'equipmentSpawnPoints',
  'events',
]);
const ARENA_KEYS = new Set(['killY', 'surfaces', 'spawns']);
const SURFACE_KEYS = new Set(['id', 'center', 'halfExtents']);
const SPAWN_POINT_KEYS = new Set(['id', 'surfaceId', 'position']);
const EVENT_KEYS = new Set(['id', 'kind', 'schedule', 'parameters']);
const SCHEDULE_KEYS = new Set([
  'startTick',
  'warningLeadTicks',
  'durationTicks',
  'repeatEveryTicks',
  'repeatCount',
]);
const VECTOR_KEYS = new Set(['x', 'y', 'z']);
const MAX_TIMELINE_OCCURRENCES = 10_000;

function cloneVector(value, name, { positive = false } = {}) {
  assertKnownKeys(value, VECTOR_KEYS, name);
  const result = {};
  for (const axis of VECTOR_KEYS) {
    const component = value[axis];
    if (!Number.isFinite(component)) throw new TypeError(`${name}.${axis} 必须是有限数。`);
    if (positive && component <= 0) throw new RangeError(`${name}.${axis} 必须大于 0。`);
    result[axis] = component;
  }
  return Object.freeze(result);
}

function cloneArena(value) {
  assertKnownKeys(value, ARENA_KEYS, 'MapDefinition.arena');
  if (!Number.isFinite(value.killY)) throw new TypeError('MapDefinition.arena.killY 必须是有限数。');
  if (!Array.isArray(value.surfaces) || value.surfaces.length === 0) {
    throw new RangeError('MapDefinition.arena.surfaces 必须是非空数组。');
  }
  if (!Array.isArray(value.spawns) || value.spawns.length < 2) {
    throw new RangeError('MapDefinition.arena.spawns 至少需要两个出生点。');
  }
  const surfaceIds = new Set();
  const surfaces = value.surfaces.map((surface, index) => {
    const name = `MapDefinition.arena.surfaces[${index}]`;
    assertKnownKeys(surface, SURFACE_KEYS, name);
    const id = assertNonEmptyString(surface.id, `${name}.id`);
    if (surfaceIds.has(id)) throw new RangeError(`重复 map surface ${id}。`);
    surfaceIds.add(id);
    return Object.freeze({
      id,
      center: cloneVector(surface.center, `${name}.center`),
      halfExtents: cloneVector(surface.halfExtents, `${name}.halfExtents`, { positive: true }),
    });
  });
  const spawns = value.spawns.map((spawn, index) => {
    const position = cloneVector(spawn, `MapDefinition.arena.spawns[${index}]`);
    const support = surfaces.find((surface) => (
      Math.abs(position.x - surface.center.x) <= surface.halfExtents.x
      && Math.abs(position.z - surface.center.z) <= surface.halfExtents.z
      && position.y >= surface.center.y + surface.halfExtents.y
    ));
    if (!support) {
      throw new RangeError(`MapDefinition.arena.spawns[${index}] 没有合法支撑 surface。`);
    }
    return position;
  });
  return Object.freeze({
    killY: value.killY,
    surfaces: Object.freeze(surfaces),
    spawns: Object.freeze(spawns),
  });
}

function cloneSchedule(value, name) {
  assertKnownKeys(value, SCHEDULE_KEYS, name);
  const schedule = {
    startTick: assertIntegerAtLeast(value.startTick, 0, `${name}.startTick`),
    warningLeadTicks: assertIntegerAtLeast(
      value.warningLeadTicks,
      0,
      `${name}.warningLeadTicks`,
    ),
    durationTicks: assertIntegerAtLeast(value.durationTicks, 0, `${name}.durationTicks`),
    repeatEveryTicks: assertIntegerAtLeast(
      value.repeatEveryTicks,
      0,
      `${name}.repeatEveryTicks`,
    ),
    repeatCount: assertIntegerAtLeast(value.repeatCount, 1, `${name}.repeatCount`),
  };
  if (schedule.warningLeadTicks > schedule.startTick) {
    throw new RangeError(`${name}.warningLeadTicks 不能早于 activeTick 0。`);
  }
  if (schedule.repeatCount > MAX_TIMELINE_OCCURRENCES) {
    throw new RangeError(`${name}.repeatCount 超过 ${MAX_TIMELINE_OCCURRENCES} 的安全上限。`);
  }
  if (
    (schedule.repeatCount === 1 && schedule.repeatEveryTicks !== 0)
    || (schedule.repeatCount > 1 && schedule.repeatEveryTicks === 0)
  ) {
    throw new RangeError(`${name} 的 repeatEveryTicks/repeatCount 组合无效。`);
  }
  const lastStart = schedule.startTick
    + schedule.repeatEveryTicks * (schedule.repeatCount - 1);
  if (!Number.isSafeInteger(lastStart + schedule.durationTicks)) {
    throw new RangeError(`${name} 的最终 tick 超出安全整数。`);
  }
  return Object.freeze(schedule);
}

function validateSpawnPoint(point, index, arena, pointIds) {
  const name = `MapDefinition.equipmentSpawnPoints[${index}]`;
  assertKnownKeys(point, SPAWN_POINT_KEYS, name);
  const id = assertNonEmptyString(point.id, `${name}.id`);
  if (pointIds.has(id)) throw new RangeError(`重复 equipment spawn point ${id}。`);
  pointIds.add(id);
  const surfaceId = assertNonEmptyString(point.surfaceId, `${name}.surfaceId`);
  const surface = arena.surfaces.find((candidate) => candidate.id === surfaceId);
  if (!surface) throw new RangeError(`${name} 引用未知 surface ${surfaceId}。`);
  const position = cloneVector(point.position, `${name}.position`);
  if (
    Math.abs(position.x - surface.center.x) > surface.halfExtents.x
    || Math.abs(position.z - surface.center.z) > surface.halfExtents.z
  ) throw new RangeError(`${name}.position 不在 surface ${surfaceId} 的水平范围内。`);
  return Object.freeze({ id, surfaceId, position });
}

export class MapDefinition {
  constructor(value) {
    const source = cloneFrozenData(value, 'MapDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'MapDefinition');
    if (source.schemaVersion !== MAP_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(`不支持 MapDefinition schema ${source.schemaVersion}。`);
    }
    const id = assertNonEmptyString(source.id, 'MapDefinition.id');
    const arena = cloneArena(source.arena);
    if (!Array.isArray(source.equipmentSpawnPoints)) {
      throw new TypeError('MapDefinition.equipmentSpawnPoints 必须是数组。');
    }
    const pointIds = new Set();
    const equipmentSpawnPoints = source.equipmentSpawnPoints.map((point, index) => (
      validateSpawnPoint(point, index, arena, pointIds)
    ));
    if (!Array.isArray(source.events)) throw new TypeError('MapDefinition.events 必须是数组。');
    const eventIds = new Set();
    let occurrenceCount = 0;
    const events = source.events.map((event, index) => {
      const name = `MapDefinition.events[${index}]`;
      assertKnownKeys(event, EVENT_KEYS, name);
      const eventId = assertNonEmptyString(event.id, `${name}.id`);
      if (eventIds.has(eventId)) throw new RangeError(`重复 map event ${eventId}。`);
      eventIds.add(eventId);
      const schedule = cloneSchedule(event.schedule, `${name}.schedule`);
      occurrenceCount += schedule.repeatCount;
      if (occurrenceCount > MAX_TIMELINE_OCCURRENCES) {
        throw new RangeError(`MapDefinition ${id} 的时间轴事件超过 ${MAX_TIMELINE_OCCURRENCES}。`);
      }
      return Object.freeze({
        id: eventId,
        kind: assertNonEmptyString(event.kind, `${name}.kind`),
        schedule,
        parameters: cloneFrozenData(event.parameters, `${name}.parameters`),
      });
    });
    Object.defineProperties(this, {
      schemaVersion: { value: MAP_DEFINITION_SCHEMA_VERSION, enumerable: true },
      id: { value: id, enumerable: true },
      arena: { value: arena, enumerable: true },
      equipmentSpawnPoints: { value: Object.freeze(equipmentSpawnPoints), enumerable: true },
      events: { value: Object.freeze(events), enumerable: true },
    });
    Object.freeze(this);
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      arena: this.arena,
      equipmentSpawnPoints: this.equipmentSpawnPoints,
      events: this.events,
    };
  }
}

export function createMapDefinition(value) {
  return value instanceof MapDefinition ? value : new MapDefinition(value);
}

export function createStaticMapDefinition(arena) {
  const hash = createDeterministicDataHash(arena, 'static arena');
  return createMapDefinition({
    schemaVersion: MAP_DEFINITION_SCHEMA_VERSION,
    id: `${STATIC_MAP_ID_PREFIX}${hash}`,
    arena,
    equipmentSpawnPoints: [],
    events: [],
  });
}
