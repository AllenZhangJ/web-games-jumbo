import { MAP_EVENT_KIND } from './map-event-types.js';

export function validateDefaultMapSafety(mapDefinition) {
  const collapsed = new Set();
  for (const event of mapDefinition.events) {
    if (event.kind !== MAP_EVENT_KIND.COLLAPSE_SURFACES) continue;
    for (const surfaceId of event.parameters.surfaceIds) collapsed.add(surfaceId);
  }
  const permanentSafeSurfaces = mapDefinition.arena.surfaces
    .map(({ id }) => id)
    .filter((id) => !collapsed.has(id));
  if (permanentSafeSurfaces.length === 0) {
    throw new RangeError(`MapDefinition ${mapDefinition.id} 不能最终塌陷所有 surface。`);
  }
  const equipmentWaves = mapDefinition.events.filter(({ kind }) => (
    kind === MAP_EVENT_KIND.EQUIPMENT_WAVE
  ));
  if (
    (mapDefinition.equipmentSpawnPoints.length > 0 || equipmentWaves.length > 0)
    && !mapDefinition.equipmentSpawnPoints.some(({ surfaceId }) => (
      permanentSafeSurfaces.includes(surfaceId)
    ))
  ) {
    throw new RangeError(`MapDefinition ${mapDefinition.id} 需要一个永久可用的装备刷新点。`);
  }
  const safeSpawns = mapDefinition.arena.spawns.filter((spawn) => (
    mapDefinition.arena.surfaces.some((surface) => (
      permanentSafeSurfaces.includes(surface.id)
      && Math.abs(spawn.x - surface.center.x) <= surface.halfExtents.x
      && Math.abs(spawn.z - surface.center.z) <= surface.halfExtents.z
    ))
  ));
  const distinctSafeSpawns = new Set(safeSpawns.map((spawn) => (
    `${spawn.x}:${spawn.y}:${spawn.z}`
  )));
  if (distinctSafeSpawns.size < 2) {
    throw new RangeError(`MapDefinition ${mapDefinition.id} 至少需要两个永久安全的重生点。`);
  }
  const collapses = mapDefinition.events.filter(({ kind }) => (
    kind === MAP_EVENT_KIND.COLLAPSE_SURFACES
  ));
  for (const wave of equipmentWaves) {
    const allowedPointIds = new Set(wave.parameters.spawnPointIds);
    for (let index = 0; index < wave.schedule.repeatCount; index += 1) {
      const releaseTick = wave.schedule.startTick + wave.schedule.repeatEveryTicks * index;
      const disabledAtRelease = new Set();
      for (const collapse of collapses) {
        for (let collapseIndex = 0; collapseIndex < collapse.schedule.repeatCount; collapseIndex += 1) {
          const collapseTick = collapse.schedule.startTick
            + collapse.schedule.repeatEveryTicks * collapseIndex;
          if (collapseTick > releaseTick) continue;
          for (const surfaceId of collapse.parameters.surfaceIds) {
            disabledAtRelease.add(surfaceId);
          }
        }
      }
      const availableCount = mapDefinition.equipmentSpawnPoints.filter((point) => (
        allowedPointIds.has(point.id) && !disabledAtRelease.has(point.surfaceId)
      )).length;
      if (availableCount < wave.parameters.count) {
        throw new RangeError(
          `MapDefinition ${mapDefinition.id} 的 ${wave.id}:${index} 没有足够的可用装备点。`,
        );
      }
    }
  }
  return Object.freeze([...permanentSafeSurfaces]);
}
