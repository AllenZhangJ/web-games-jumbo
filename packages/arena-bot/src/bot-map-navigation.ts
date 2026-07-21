import type { ArenaMapOccurrenceSnapshot } from '@number-strategy-jump/arena-contracts';
import { MAP_EVENT_KIND, MAP_OCCURRENCE_PHASE } from '@number-strategy-jump/arena-map';
import type {
  BotArenaSurface,
  BotObservation,
  BotParticipantObservation,
  BotVector3,
} from './bot-observation.js';

interface NumericInterval {
  minimum: number;
  maximum: number;
}

interface BotRegion {
  readonly center: BotVector3;
  readonly halfExtents: BotVector3;
}

export interface BotHazardTarget {
  readonly surface: BotArenaSurface;
  readonly path: readonly BotArenaSurface[];
  readonly index: number;
  readonly windSafe: boolean;
  readonly distance: number;
}

export function distance2d(first: BotVector3, second: BotVector3): number {
  return Math.hypot(second.x - first.x, second.z - first.z);
}

export function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function surfaceContains(
  surface: BotArenaSurface,
  position: BotVector3,
  radius = 0,
): boolean {
  return Math.abs(position.x - surface.center.x) <= surface.halfExtents.x - radius
    && Math.abs(position.z - surface.center.z) <= surface.halfExtents.z - radius;
}

function isSurfaceEnabled(observation: BotObservation, surfaceId: string): boolean {
  return observation.map.surfaces.find(({ id }) => id === surfaceId)?.enabled === true;
}

function availableSurfaces(observation: BotObservation): readonly BotArenaSurface[] {
  return observation.arena.surfaces.filter(({ id }) => isSurfaceEnabled(observation, id));
}

export function nearestSurface(
  observation: BotObservation,
  position: BotVector3,
  excludedIds: ReadonlySet<string> = new Set<string>(),
): BotArenaSurface | null {
  return availableSurfaces(observation)
    .filter(({ id }) => !excludedIds.has(id))
    .map((surface, index) => ({
      surface,
      index,
      distance: distance2d(surface.center, position),
    }))
    .sort((left, right) => left.distance - right.distance || left.index - right.index)[0]
    ?.surface ?? null;
}

export function supportSurface(
  observation: BotObservation,
  participant: BotParticipantObservation,
): BotArenaSurface | null {
  return observation.arena.surfaces.find(
    (surface) => surface.id === participant.supportSurfaceId
      && isSurfaceEnabled(observation, surface.id),
  ) ?? observation.arena.surfaces.find(
    (surface) => isSurfaceEnabled(observation, surface.id)
      && surfaceContains(surface, participant.position),
  ) ?? null;
}

function surfacesAreWalkConnected(
  first: BotArenaSurface,
  second: BotArenaSurface,
  characterRadius: number,
  maximumStepHeight: number,
): boolean {
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

export function surfaceForPosition(
  observation: BotObservation,
  position: BotVector3,
): BotArenaSurface | null {
  return availableSurfaces(observation).find((surface) => (
    surfaceContains(surface, position)
  )) ?? null;
}

export function findSurfacePath(
  observation: BotObservation,
  fromSurface: BotArenaSurface | null,
  targetSurface: BotArenaSurface | null,
  excludedIds: ReadonlySet<string> = new Set<string>(),
): readonly BotArenaSurface[] | null {
  if (!fromSurface || !targetSurface) return null;
  if (fromSurface.id === targetSurface.id) return [fromSurface];
  const surfaces = availableSurfaces(observation).filter(({ id }) => (
    id === fromSurface.id || !excludedIds.has(id)
  ));
  const byId = new Map(surfaces.map((surface) => [surface.id, surface]));
  const previous = new Map<string, string | null>([[fromSurface.id, null]]);
  const queue = [fromSurface.id];
  for (let index = 0; index < queue.length; index += 1) {
    const currentId = queue[index];
    if (currentId === undefined) continue;
    const current = byId.get(currentId);
    if (!current) continue;
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
        let cursor: string | null = currentId;
        while (cursor !== null) {
          pathIds.push(cursor);
          cursor = previous.get(cursor) ?? null;
        }
        pathIds.reverse();
        return pathIds.map((id) => byId.get(id)).filter(
          (surface): surface is BotArenaSurface => surface !== undefined,
        );
      }
      queue.push(neighbor.id);
    }
  }
  return null;
}

function containingMergedInterval(
  intervals: readonly (readonly [number, number])[],
  coordinate: number,
): NumericInterval | null {
  const sorted = intervals
    .map(([minimum, maximum]) => ({ minimum, maximum }))
    .sort((left, right) => left.minimum - right.minimum || left.maximum - right.maximum);
  const merged: NumericInterval[] = [];
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

export function clearanceFromMapEdge(
  observation: BotObservation,
  participant: BotParticipantObservation,
): number {
  const surfaces = availableSurfaces(observation);
  const xInterval = containingMergedInterval(surfaces
    .filter((surface) => (
      Math.abs(participant.position.z - surface.center.z) <= surface.halfExtents.z + 1e-7
    ))
    .map((surface): readonly [number, number] => [
      surface.center.x - surface.halfExtents.x,
      surface.center.x + surface.halfExtents.x,
    ]), participant.position.x);
  const zInterval = containingMergedInterval(surfaces
    .filter((surface) => (
      Math.abs(participant.position.x - surface.center.x) <= surface.halfExtents.x + 1e-7
    ))
    .map((surface): readonly [number, number] => [
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

export function maximumRecoverableClearance(
  observation: BotObservation,
  participant: BotParticipantObservation,
): number {
  const surface = supportSurface(observation, participant);
  if (!surface) return 0;
  return Math.max(
    0,
    Math.min(surface.halfExtents.x, surface.halfExtents.z)
      - observation.arena.characterRadius,
  );
}

function occurrenceIsVisibleThreat(occurrence: ArenaMapOccurrenceSnapshot): boolean {
  return occurrence.phase === MAP_OCCURRENCE_PHASE.WARNING
    || occurrence.phase === MAP_OCCURRENCE_PHASE.ACTIVE;
}

function recordValue(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function regionValue(value: unknown): BotRegion | null {
  const region = recordValue(value);
  const center = recordValue(region?.center);
  const halfExtents = recordValue(region?.halfExtents);
  if (!region || !center || !halfExtents) return null;
  const values = [
    center.x, center.y, center.z,
    halfExtents.x, halfExtents.y, halfExtents.z,
  ];
  if (!values.every((entry) => Number.isFinite(entry))) return null;
  return {
    center: { x: center.x as number, y: center.y as number, z: center.z as number },
    halfExtents: {
      x: halfExtents.x as number,
      y: halfExtents.y as number,
      z: halfExtents.z as number,
    },
  };
}

export function collapseThreatenedSurfaceIds(observation: BotObservation): ReadonlySet<string> {
  const result = new Set<string>();
  for (const occurrence of observation.map.occurrences) {
    const payload = recordValue(occurrence.publicPayload);
    const surfaceIds = payload?.surfaceIds;
    if (
      occurrence.kind !== MAP_EVENT_KIND.COLLAPSE_SURFACES
      || !occurrenceIsVisibleThreat(occurrence)
      || !Array.isArray(surfaceIds)
    ) continue;
    for (const surfaceId of surfaceIds) {
      if (typeof surfaceId === 'string') result.add(surfaceId);
    }
  }
  return result;
}

function positionInRegion(position: BotVector3, region: BotRegion | null): boolean {
  return region !== null
    && Math.abs(position.x - region.center.x) <= region.halfExtents.x
    && Math.abs(position.y - region.center.y) <= region.halfExtents.y
    && Math.abs(position.z - region.center.z) <= region.halfExtents.z;
}

function occurrenceRegion(occurrence: ArenaMapOccurrenceSnapshot): BotRegion | null {
  return regionValue(recordValue(occurrence.publicPayload)?.region);
}

export function activeWindThreat(
  observation: BotObservation,
): ArenaMapOccurrenceSnapshot | null {
  return observation.map.occurrences.find((occurrence) => (
    occurrence.kind === MAP_EVENT_KIND.WIND_ZONE
    && occurrence.phase === MAP_OCCURRENCE_PHASE.ACTIVE
    && positionInRegion(observation.self.position, occurrenceRegion(occurrence))
  )) ?? null;
}

export function safestHazardTarget(observation: BotObservation): BotHazardTarget | null {
  const collapseIds = collapseThreatenedSurfaceIds(observation);
  const wind = activeWindThreat(observation);
  const windRegion = wind ? occurrenceRegion(wind) : null;
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
        windSafe: wind ? !positionInRegion(surface.center, windRegion) : true,
        distance: path
          ? distance2d(observation.self.position, surface.center) + path.length - 1
          : Number.POSITIVE_INFINITY,
      };
    })
    .filter((candidate): candidate is BotHazardTarget => candidate.path !== null)
    .sort((left, right) => (
      Number(right.windSafe) - Number(left.windSafe)
      || left.distance - right.distance
      || left.index - right.index
    ));
  return candidates[0] ?? null;
}
