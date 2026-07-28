import {
  MAP_DEFINITION_SCHEMA_VERSION,
  createMapDefinition,
  type MapDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  createArenaV2JumpRoutePrototype,
  type ArenaV2JumpRoutePrototype,
  type ArenaV2JumpRouteSurface,
} from './arena-v2-jump-route-prototype.js';

export const ARENA_V2_KZ_MAP_DEFINITION_ID = 'research-arena-v2-kz-base-route-v1';

export interface ArenaV2KzMapDefinitionPrototype {
  readonly mapDefinition: MapDefinition;
  readonly mapId: typeof ARENA_V2_KZ_MAP_DEFINITION_ID;
  readonly routeId: string;
  readonly segmentIds: readonly string[];
  readonly segmentSurfaceIds: Readonly<Record<string, readonly string[]>>;
  readonly branchOptionsBySegment: Readonly<Record<string, readonly string[]>>;
  readonly respawnAnchorBySegment: Readonly<Record<string, string>>;
  readonly finishAnchor: string;
  readonly respawnSeconds: 3;
  readonly usesOnlyBaseInputs: true;
  readonly surfacesCanCollapse: false;
  readonly modeProfiles: Readonly<{
    readonly race: Readonly<{
      readonly usesFinishAnchor: true;
      readonly finishAnchor: string;
    }>;
    readonly survival: Readonly<{
      readonly usesFinishAnchor: false;
      readonly finishAnchor: null;
    }>;
  }>;
  readonly productionStatus: 'research-only';
}

function surfaceToDefinition(surface: ArenaV2JumpRouteSurface) {
  return Object.freeze({
    id: surface.id,
    center: Object.freeze({ ...surface.center }),
    halfExtents: Object.freeze({ ...surface.halfExtents }),
  });
}

function surfaceTop(surface: ArenaV2JumpRouteSurface): number {
  return surface.center.y + surface.halfExtents.y;
}

function firstSurfaceForSegment(
  route: ArenaV2JumpRoutePrototype,
  segmentId: string,
): ArenaV2JumpRouteSurface {
  const surface = route.surfaces.find(({ segmentId: value }) => value === segmentId);
  if (!surface) throw new RangeError(`KZ 段落 ${segmentId} 缺少 MapDefinition surface。`);
  return surface;
}

function createMapDefinitionForRoute(route: ArenaV2JumpRoutePrototype): MapDefinition {
  const startSurface = route.surfaces[0];
  if (!startSurface) throw new RangeError('KZ 路线缺少起始 surface。');
  const startY = surfaceTop(startSurface) + 0.5;
  const spawnPoints = Object.freeze([
    Object.freeze({ x: startSurface.center.x - 1.2, y: startY, z: startSurface.center.z }),
    Object.freeze({ x: startSurface.center.x - 0.4, y: startY, z: startSurface.center.z }),
    Object.freeze({ x: startSurface.center.x + 0.4, y: startY, z: startSurface.center.z }),
    Object.freeze({ x: startSurface.center.x + 1.2, y: startY, z: startSurface.center.z }),
  ]);
  const equipmentSpawnPoints = Object.freeze(route.segments.map((segment) => {
    const surface = firstSurfaceForSegment(route, segment.segmentId);
    return Object.freeze({
      id: `kz-route-equipment-${segment.segmentId}`,
      surfaceId: surface.id,
      position: Object.freeze({
        x: surface.center.x,
        y: surfaceTop(surface),
        z: surface.center.z,
      }),
    });
  }));
  return createMapDefinition({
    schemaVersion: MAP_DEFINITION_SCHEMA_VERSION,
    id: ARENA_V2_KZ_MAP_DEFINITION_ID,
    arena: {
      killY: -6,
      surfaces: route.surfaces.map(surfaceToDefinition),
      spawns: spawnPoints,
    },
    equipmentSpawnPoints,
    events: [],
  });
}

export function createArenaV2KzMapDefinitionPrototype(): ArenaV2KzMapDefinitionPrototype {
  const route = createArenaV2JumpRoutePrototype();
  const segmentSurfaceIds = Object.freeze(Object.fromEntries(
    route.segmentIds.map((segmentId) => [
      segmentId,
      Object.freeze(route.surfaces
        .filter(({ segmentId: surfaceSegmentId }) => surfaceSegmentId === segmentId)
        .map(({ id }) => id)),
    ]),
  ) as Record<string, readonly string[]>);
  const respawnAnchorBySegment = Object.freeze(Object.fromEntries(
    route.segments.map(({ segmentId, respawnAnchor }) => [segmentId, respawnAnchor]),
  ) as Record<string, string>);
  const branchOptionsBySegment = Object.freeze(Object.fromEntries(
    route.segments.map(({ segmentId, branchOptions }) => [
      segmentId,
      Object.freeze(branchOptions.map(({ branchId }) => branchId)),
    ]),
  ) as Record<string, readonly string[]>);
  const mapDefinition = createMapDefinitionForRoute(route);
  if (mapDefinition.arena.surfaces.length !== route.surfaces.length) {
    throw new Error('KZ MapDefinition 与路线 surface 数量不一致。');
  }
  if (Object.values(segmentSurfaceIds).some((surfaceIds) => surfaceIds.length === 0)) {
    throw new Error('KZ MapDefinition 每个段落都必须至少拥有一个 surface。');
  }
  return Object.freeze({
    mapDefinition,
    mapId: ARENA_V2_KZ_MAP_DEFINITION_ID,
    routeId: route.routeId,
    segmentIds: Object.freeze([...route.segmentIds]),
    segmentSurfaceIds,
    branchOptionsBySegment,
    respawnAnchorBySegment,
    finishAnchor: route.finishAnchor,
    respawnSeconds: 3,
    usesOnlyBaseInputs: true,
    surfacesCanCollapse: false,
    modeProfiles: Object.freeze({
      race: Object.freeze({ usesFinishAnchor: true, finishAnchor: route.finishAnchor }),
      survival: Object.freeze({ usesFinishAnchor: false, finishAnchor: null }),
    }),
    productionStatus: 'research-only',
  });
}
