import { MAP_EVENT_KIND } from './map-event-types.js';
import type { MapDefinition, MapSurfaceDefinition } from '@number-strategy-jump/arena-definitions';

const SURFACE_CONTACT_EPSILON = 1e-7;

export interface MapTopologyValidationResult {
  readonly initialSurfaceCount: number;
  readonly permanentSurfaceCount: number;
  readonly collapseCount: number;
}

interface CollapseOccurrence {
  readonly occurrenceId: string;
  readonly tick: number;
  readonly surfaceIds: readonly string[];
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function walkConnected(
  first: MapSurfaceDefinition,
  second: MapSurfaceDefinition,
  characterDiameter: number,
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
  return (gapX <= SURFACE_CONTACT_EPSILON && overlapZ >= characterDiameter)
    || (gapZ <= SURFACE_CONTACT_EPSILON && overlapX >= characterDiameter);
}

function assertConnected(
  surfaces: readonly MapSurfaceDefinition[],
  characterDiameter: number,
  maximumStepHeight: number,
  name: string,
): void {
  if (surfaces.length === 0) throw new RangeError(`${name} 不能没有可用 surface。`);
  const firstSurface = surfaces[0];
  if (!firstSurface) throw new Error(`${name} 缺少首个 surface。`);
  const visited = new Set([firstSurface.id]);
  const queue: MapSurfaceDefinition[] = [firstSurface];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (!current) throw new Error(`${name} topology queue 缺少索引 ${index}。`);
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

export function validateWalkableMapTopology(mapDefinition: MapDefinition, {
  characterRadius,
  maximumStepHeight,
}: {
  readonly characterRadius: number;
  readonly maximumStepHeight: number;
}): Readonly<MapTopologyValidationResult> {
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
  const collapses: CollapseOccurrence[] = [];
  for (const event of mapDefinition.events) {
    if (event.kind !== MAP_EVENT_KIND.COLLAPSE_SURFACES) continue;
    for (let index = 0; index < event.schedule.repeatCount; index += 1) {
      const parameters = event.parameters as Readonly<{ surfaceIds?: unknown }>;
      if (!Array.isArray(parameters.surfaceIds)) {
        throw new TypeError(`${event.id}.surfaceIds 必须是数组。`);
      }
      collapses.push({
        occurrenceId: `${event.id}:${index}`,
        tick: event.schedule.startTick + event.schedule.repeatEveryTicks * index,
        surfaceIds: parameters.surfaceIds.map((surfaceId) => {
          if (typeof surfaceId !== 'string' || surfaceId.length === 0) {
            throw new TypeError(`${event.id}.surfaceIds 必须只含非空字符串。`);
          }
          return surfaceId;
        }),
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
