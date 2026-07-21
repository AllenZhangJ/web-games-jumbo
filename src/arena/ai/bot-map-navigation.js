import { MAP_EVENT_KIND } from '@number-strategy-jump/arena-map';
import { MAP_OCCURRENCE_PHASE } from '@number-strategy-jump/arena-map';

export function distance2d(first, second) {
  return Math.hypot(second.x - first.x, second.z - first.z);
}

export function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function surfaceContains(surface, position, radius = 0) {
  return Math.abs(position.x - surface.center.x) <= surface.halfExtents.x - radius
    && Math.abs(position.z - surface.center.z) <= surface.halfExtents.z - radius;
}

function isSurfaceEnabled(observation, surfaceId) {
  return observation.map.surfaces.find(({ id }) => id === surfaceId)?.enabled === true;
}

function availableSurfaces(observation) {
  return observation.arena.surfaces.filter(({ id }) => isSurfaceEnabled(observation, id));
}

export function nearestSurface(observation, position, excludedIds = new Set()) {
  return availableSurfaces(observation)
    .filter(({ id }) => !excludedIds.has(id))
    .map((surface, index) => ({
      surface,
      index,
      distance: distance2d(surface.center, position),
    }))
    .sort((a, b) => a.distance - b.distance || a.index - b.index)[0]?.surface ?? null;
}

export function supportSurface(observation, participant) {
  return observation.arena.surfaces.find(
    (surface) => surface.id === participant.supportSurfaceId
      && isSurfaceEnabled(observation, surface.id),
  ) ?? observation.arena.surfaces.find(
    (surface) => isSurfaceEnabled(observation, surface.id)
      && surfaceContains(surface, participant.position),
  ) ?? null;
}

function surfacesAreWalkConnected(first, second, characterRadius, maximumStepHeight) {
  const firstTop = first.center.y + first.halfExtents.y;
  const secondTop = second.center.y + second.halfExtents.y;
  if (Math.abs(firstTop - secondTop) > maximumStepHeight) return false;
  const distanceX = Math.abs(first.center.x - second.center.x);
  const distanceZ = Math.abs(first.center.z - second.center.z);
  const gapX = Math.max(0, distanceX - first.halfExtents.x - second.halfExtents.x);
  const gapZ = Math.max(0, distanceZ - first.halfExtents.z - second.halfExtents.z);
  const overlapX = first.halfExtents.x + second.halfExtents.x - distanceX;
  const overlapZ = first.halfExtents.z + second.halfExtents.z - distanceZ;
  const requiredOpening = characterRadius * 2;
  return (gapX <= 1e-7 && overlapZ >= requiredOpening)
    || (gapZ <= 1e-7 && overlapX >= requiredOpening);
}

export function surfaceForPosition(observation, position) {
  return availableSurfaces(observation).find((surface) => (
    surfaceContains(surface, position)
  )) ?? null;
}

export function findSurfacePath(
  observation,
  fromSurface,
  targetSurface,
  excludedIds = new Set(),
) {
  if (!fromSurface || !targetSurface) return null;
  if (fromSurface.id === targetSurface.id) return [fromSurface];
  const surfaces = availableSurfaces(observation).filter(({ id }) => (
    id === fromSurface.id || !excludedIds.has(id)
  ));
  const byId = new Map(surfaces.map((surface) => [surface.id, surface]));
  const previous = new Map([[fromSurface.id, null]]);
  const queue = [fromSurface.id];
  for (let index = 0; index < queue.length; index += 1) {
    const currentId = queue[index];
    const current = byId.get(currentId);
    const neighbors = surfaces
      .filter((surface) => !previous.has(surface.id) && surfacesAreWalkConnected(
        current,
        surface,
        observation.arena.characterRadius,
        observation.arena.maximumStepHeight,
      ))
      .sort((left, right) => compareText(left.id, right.id));
    for (const neighbor of neighbors) {
      previous.set(neighbor.id, currentId);
      if (neighbor.id === targetSurface.id) {
        const pathIds = [neighbor.id];
        let cursor = currentId;
        while (cursor !== null) {
          pathIds.push(cursor);
          cursor = previous.get(cursor);
        }
        pathIds.reverse();
        return pathIds.map((id) => byId.get(id));
      }
      queue.push(neighbor.id);
    }
  }
  return null;
}

function containingMergedInterval(intervals, coordinate) {
  const sorted = intervals
    .map(([minimum, maximum]) => ({ minimum, maximum }))
    .sort((left, right) => left.minimum - right.minimum || left.maximum - right.maximum);
  const merged = [];
  for (const interval of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || interval.minimum > previous.maximum + 1e-7) {
      merged.push({ ...interval });
    } else {
      previous.maximum = Math.max(previous.maximum, interval.maximum);
    }
  }
  return merged.find(({ minimum, maximum }) => (
    coordinate >= minimum - 1e-7 && coordinate <= maximum + 1e-7
  )) ?? null;
}

export function clearanceFromMapEdge(observation, participant) {
  const surfaces = availableSurfaces(observation);
  const xInterval = containingMergedInterval(surfaces
    .filter((surface) => (
      Math.abs(participant.position.z - surface.center.z) <= surface.halfExtents.z + 1e-7
    ))
    .map((surface) => [
      surface.center.x - surface.halfExtents.x,
      surface.center.x + surface.halfExtents.x,
    ]), participant.position.x);
  const zInterval = containingMergedInterval(surfaces
    .filter((surface) => (
      Math.abs(participant.position.x - surface.center.x) <= surface.halfExtents.x + 1e-7
    ))
    .map((surface) => [
      surface.center.z - surface.halfExtents.z,
      surface.center.z + surface.halfExtents.z,
    ]), participant.position.z);
  if (!xInterval || !zInterval) return Number.NEGATIVE_INFINITY;
  return Math.min(
    participant.position.x - xInterval.minimum,
    xInterval.maximum - participant.position.x,
    participant.position.z - zInterval.minimum,
    zInterval.maximum - participant.position.z,
  ) - observation.arena.characterRadius;
}

export function maximumRecoverableClearance(observation, participant) {
  const surface = supportSurface(observation, participant);
  if (!surface) return 0;
  return Math.max(
    0,
    Math.min(surface.halfExtents.x, surface.halfExtents.z)
      - observation.arena.characterRadius,
  );
}

function occurrenceIsVisibleThreat(occurrence) {
  return occurrence.phase === MAP_OCCURRENCE_PHASE.WARNING
    || occurrence.phase === MAP_OCCURRENCE_PHASE.ACTIVE;
}

export function collapseThreatenedSurfaceIds(observation) {
  const result = new Set();
  for (const occurrence of observation.map.occurrences) {
    if (
      occurrence.kind !== MAP_EVENT_KIND.COLLAPSE_SURFACES
      || !occurrenceIsVisibleThreat(occurrence)
      || !Array.isArray(occurrence.publicPayload?.surfaceIds)
    ) continue;
    for (const surfaceId of occurrence.publicPayload.surfaceIds) result.add(surfaceId);
  }
  return result;
}

function positionInRegion(position, region) {
  return region
    && Math.abs(position.x - region.center.x) <= region.halfExtents.x
    && Math.abs(position.y - region.center.y) <= region.halfExtents.y
    && Math.abs(position.z - region.center.z) <= region.halfExtents.z;
}

export function activeWindThreat(observation) {
  return observation.map.occurrences.find((occurrence) => (
    occurrence.kind === MAP_EVENT_KIND.WIND_ZONE
    && occurrence.phase === MAP_OCCURRENCE_PHASE.ACTIVE
    && positionInRegion(observation.self.position, occurrence.publicPayload?.region)
  )) ?? null;
}

export function safestHazardTarget(observation) {
  const collapseIds = collapseThreatenedSurfaceIds(observation);
  const wind = activeWindThreat(observation);
  const fromSurface = supportSurface(observation, observation.self);
  const candidates = availableSurfaces(observation)
    .filter(({ id }) => !collapseIds.has(id))
    .map((surface, index) => {
      const path = fromSurface
        ? findSurfacePath(observation, fromSurface, surface, collapseIds)
        : [surface];
      return {
        surface,
        path,
        index,
        windSafe: wind ? !positionInRegion(surface.center, wind.publicPayload?.region) : true,
        distance: path
          ? distance2d(observation.self.position, surface.center) + path.length - 1
          : Number.POSITIVE_INFINITY,
      };
    })
    .filter(({ path }) => path)
    .sort((left, right) => (
      Number(right.windSafe) - Number(left.windSafe)
      || left.distance - right.distance
      || left.index - right.index
    ));
  return candidates[0] ?? null;
}
