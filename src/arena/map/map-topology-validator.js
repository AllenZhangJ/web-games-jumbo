import { MAP_EVENT_KIND } from './map-event-types.js';

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function walkConnected(first, second, characterDiameter, maximumStepHeight) {
  const firstTop = first.center.y + first.halfExtents.y;
  const secondTop = second.center.y + second.halfExtents.y;
  if (Math.abs(firstTop - secondTop) > maximumStepHeight) return false;
  const distanceX = Math.abs(first.center.x - second.center.x);
  const distanceZ = Math.abs(first.center.z - second.center.z);
  const gapX = Math.max(0, distanceX - first.halfExtents.x - second.halfExtents.x);
  const gapZ = Math.max(0, distanceZ - first.halfExtents.z - second.halfExtents.z);
  const overlapX = first.halfExtents.x + second.halfExtents.x - distanceX;
  const overlapZ = first.halfExtents.z + second.halfExtents.z - distanceZ;
  return (gapX <= 1e-7 && overlapZ >= characterDiameter)
    || (gapZ <= 1e-7 && overlapX >= characterDiameter);
}

function assertConnected(surfaces, characterDiameter, maximumStepHeight, name) {
  if (surfaces.length === 0) throw new RangeError(`${name} 不能没有可用 surface。`);
  const visited = new Set([surfaces[0].id]);
  const queue = [surfaces[0]];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const candidates = surfaces
      .filter((surface) => !visited.has(surface.id) && walkConnected(
        current,
        surface,
        characterDiameter,
        maximumStepHeight,
      ))
      .sort((left, right) => compareText(left.id, right.id));
    for (const candidate of candidates) {
      visited.add(candidate.id);
      queue.push(candidate);
    }
  }
  if (visited.size !== surfaces.length) {
    const unreachable = surfaces
      .map(({ id }) => id)
      .filter((id) => !visited.has(id))
      .sort(compareText);
    throw new RangeError(`${name} 产生不可步行连通的 surface: ${unreachable.join(', ')}。`);
  }
}

export function validateWalkableMapTopology(mapDefinition, {
  characterRadius,
  maximumStepHeight,
}) {
  if (!mapDefinition || !mapDefinition.arena) throw new TypeError('map topology 需要 MapDefinition。');
  if (!Number.isFinite(characterRadius) || characterRadius <= 0) {
    throw new RangeError('map topology characterRadius 必须大于 0。');
  }
  if (!Number.isFinite(maximumStepHeight) || maximumStepHeight <= 0) {
    throw new RangeError('map topology maximumStepHeight 必须大于 0。');
  }
  const characterDiameter = characterRadius * 2;
  const enabled = new Set(mapDefinition.arena.surfaces.map(({ id }) => id));
  assertConnected(
    mapDefinition.arena.surfaces,
    characterDiameter,
    maximumStepHeight,
    `${mapDefinition.id} initial topology`,
  );
  const collapses = [];
  for (const event of mapDefinition.events) {
    if (event.kind !== MAP_EVENT_KIND.COLLAPSE_SURFACES) continue;
    for (let index = 0; index < event.schedule.repeatCount; index += 1) {
      collapses.push({
        occurrenceId: `${event.id}:${index}`,
        tick: event.schedule.startTick + event.schedule.repeatEveryTicks * index,
        surfaceIds: event.parameters.surfaceIds,
      });
    }
  }
  collapses.sort((left, right) => (
    left.tick - right.tick || compareText(left.occurrenceId, right.occurrenceId)
  ));
  for (const collapse of collapses) {
    for (const surfaceId of collapse.surfaceIds) enabled.delete(surfaceId);
    assertConnected(
      mapDefinition.arena.surfaces.filter(({ id }) => enabled.has(id)),
      characterDiameter,
      maximumStepHeight,
      `${mapDefinition.id} after ${collapse.occurrenceId}`,
    );
  }
  return Object.freeze({
    initialSurfaceCount: mapDefinition.arena.surfaces.length,
    permanentSurfaceCount: enabled.size,
    collapseCount: collapses.length,
  });
}
