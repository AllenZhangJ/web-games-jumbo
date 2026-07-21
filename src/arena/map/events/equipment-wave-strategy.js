import { createRng } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';
import {
  MAP_DOMAIN_EVENT,
  MAP_EVENT_KIND,
  MAP_RULE_COMMAND,
} from '@number-strategy-jump/arena-map';

const EQUIPMENT_WAVE_KEYS = new Set(['spawnPointIds', 'equipmentDefinitionIds', 'count']);

function validate({ event, mapDefinition, equipmentRegistry }) {
  assertKnownKeys(event.parameters, EQUIPMENT_WAVE_KEYS, `${event.id}.parameters`);
  const spawnPointIds = cloneFrozenStringSet(
    event.parameters.spawnPointIds,
    `${event.id}.spawnPointIds`,
  );
  const equipmentDefinitionIds = cloneFrozenStringSet(
    event.parameters.equipmentDefinitionIds,
    `${event.id}.equipmentDefinitionIds`,
  );
  if (spawnPointIds.length === 0 || equipmentDefinitionIds.length === 0) {
    throw new RangeError(`${event.id} 的刷新点和装备池不能为空。`);
  }
  const count = assertIntegerAtLeast(event.parameters.count, 1, `${event.id}.count`);
  if (count > spawnPointIds.length) {
    throw new RangeError(`${event.id}.count 不能超过候选刷新点数。`);
  }
  const knownPoints = new Set(mapDefinition.equipmentSpawnPoints.map(({ id }) => id));
  for (const pointId of spawnPointIds) {
    if (!knownPoints.has(pointId)) throw new RangeError(`${event.id} 引用未知 spawn point ${pointId}。`);
  }
  if (!equipmentRegistry || typeof equipmentRegistry.require !== 'function') {
    throw new TypeError('equipment-wave 验证需要 EquipmentRegistry。');
  }
  for (const definitionId of equipmentDefinitionIds) equipmentRegistry.require(definitionId);
  if (event.schedule.durationTicks !== 0) {
    throw new RangeError(`${event.id} equipment-wave 必须是瞬时事件。`);
  }
}

function plan({ occurrence, mapDefinition, mapSnapshot, seed }) {
  const enabledSurfaces = new Set(
    mapSnapshot.surfaces.filter(({ enabled }) => enabled).map(({ id }) => id),
  );
  const disabledByRelease = new Set();
  for (const event of mapDefinition.events) {
    if (event.kind !== MAP_EVENT_KIND.COLLAPSE_SURFACES) continue;
    for (let index = 0; index < event.schedule.repeatCount; index += 1) {
      const collapseTick = event.schedule.startTick + event.schedule.repeatEveryTicks * index;
      if (collapseTick > occurrence.startTick) continue;
      for (const surfaceId of event.parameters.surfaceIds) disabledByRelease.add(surfaceId);
    }
  }
  const allowedPoints = new Set(occurrence.event.parameters.spawnPointIds);
  const candidates = mapDefinition.equipmentSpawnPoints
    .filter((point) => (
      allowedPoints.has(point.id)
      && enabledSurfaces.has(point.surfaceId)
      && !disabledByRelease.has(point.surfaceId)
    ))
    .map((point) => ({ ...point }));
  const rng = createRng(seed);
  const entries = [];
  while (entries.length < occurrence.event.parameters.count && candidates.length > 0) {
    const pointIndex = rng.int(0, candidates.length - 1);
    const point = candidates.splice(pointIndex, 1)[0];
    const definitionId = rng.pick(occurrence.event.parameters.equipmentDefinitionIds);
    entries.push({
      spawnPointId: point.id,
      surfaceId: point.surfaceId,
      position: point.position,
      equipmentDefinitionId: definitionId,
    });
  }
  return {
    privatePlan: { entries },
    // Landing markers become public at warning time. Equipment identity stays
    // private until release so Bot and player receive the same information.
    publicPayload: {
      spawnPoints: entries.map(({ spawnPointId, surfaceId, position }) => ({
        spawnPointId,
        surfaceId,
        position,
      })),
    },
  };
}

function start({ occurrence, privatePlan }) {
  return {
    commands: privatePlan.entries.map((entry, index) => ({
      kind: MAP_RULE_COMMAND.SPAWN_EQUIPMENT,
      instanceId: `map:${occurrence.occurrenceId}:${index}`,
      definitionId: entry.equipmentDefinitionId,
      spawnId: entry.spawnPointId,
      position: entry.position,
    })),
    events: [{
      type: MAP_DOMAIN_EVENT.EQUIPMENT_WAVE_RELEASED,
      equipment: privatePlan.entries.map((entry) => ({
        spawnPointId: entry.spawnPointId,
        definitionId: entry.equipmentDefinitionId,
      })),
    }],
  };
}

function emptyResult() {
  return { commands: [], events: [] };
}

export function createEquipmentWaveStrategy() {
  return Object.freeze({
    kind: MAP_EVENT_KIND.EQUIPMENT_WAVE,
    validate,
    plan,
    start,
    tick: emptyResult,
    end: emptyResult,
  });
}
