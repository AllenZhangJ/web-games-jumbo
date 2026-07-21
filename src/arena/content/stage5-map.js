import { ARENA_TICK_RATE } from '../config.js';
import {
  MAP_DEFINITION_SCHEMA_VERSION,
  createMapDefinition,
} from '@number-strategy-jump/arena-definitions';
import { MAP_EVENT_KIND } from '@number-strategy-jump/arena-map';
import { STAGE4_EQUIPMENT_ID } from './stage4-equipment.js';

export const STAGE5_MAP_ID = 'abyss-grid-wind-v1';

const TILE_HALF_EXTENTS = Object.freeze({ x: 2, y: 0.5, z: 2 });

function tile(id, x, z) {
  return Object.freeze({
    id,
    center: Object.freeze({ x, y: -0.5, z }),
    halfExtents: TILE_HALF_EXTENTS,
  });
}

const SURFACE = Object.freeze({
  NORTH_WEST: 'tile-north-west',
  NORTH: 'tile-north',
  NORTH_EAST: 'tile-north-east',
  WEST: 'tile-west',
  CENTER: 'tile-center',
  EAST: 'tile-east',
  SOUTH_WEST: 'tile-south-west',
  SOUTH: 'tile-south',
  SOUTH_EAST: 'tile-south-east',
});

export const STAGE5_ABYSS_ARENA = Object.freeze({
  killY: -5,
  surfaces: Object.freeze([
    tile(SURFACE.NORTH_WEST, -4, 4),
    tile(SURFACE.NORTH, 0, 4),
    tile(SURFACE.NORTH_EAST, 4, 4),
    tile(SURFACE.WEST, -4, 0),
    tile(SURFACE.CENTER, 0, 0),
    tile(SURFACE.EAST, 4, 0),
    tile(SURFACE.SOUTH_WEST, -4, -4),
    tile(SURFACE.SOUTH, 0, -4),
    tile(SURFACE.SOUTH_EAST, 4, -4),
  ]),
  spawns: Object.freeze([
    Object.freeze({ x: -1.2, y: 1.02, z: 0 }),
    Object.freeze({ x: 1.2, y: 1.02, z: 0 }),
  ]),
});

const EQUIPMENT_SPAWN_POINTS = Object.freeze([
  Object.freeze({
    id: 'artifact-center',
    surfaceId: SURFACE.CENTER,
    position: Object.freeze({ x: 0, y: 1, z: 0 }),
  }),
  Object.freeze({
    id: 'artifact-north',
    surfaceId: SURFACE.NORTH,
    position: Object.freeze({ x: 0, y: 1, z: 4 }),
  }),
  Object.freeze({
    id: 'artifact-south',
    surfaceId: SURFACE.SOUTH,
    position: Object.freeze({ x: 0, y: 1, z: -4 }),
  }),
  Object.freeze({
    id: 'artifact-west',
    surfaceId: SURFACE.WEST,
    position: Object.freeze({ x: -4, y: 1, z: 0 }),
  }),
  Object.freeze({
    id: 'artifact-east',
    surfaceId: SURFACE.EAST,
    position: Object.freeze({ x: 4, y: 1, z: 0 }),
  }),
]);

const ALL_EQUIPMENT_IDS = Object.freeze(Object.values(STAGE4_EQUIPMENT_ID));
const ALL_SPAWN_POINT_IDS = Object.freeze(EQUIPMENT_SPAWN_POINTS.map(({ id }) => id));

function schedule({
  startSeconds,
  warningSeconds,
  durationSeconds = 0,
  repeatSeconds = 0,
  repeatCount = 1,
}) {
  return Object.freeze({
    startTick: startSeconds * ARENA_TICK_RATE,
    warningLeadTicks: warningSeconds * ARENA_TICK_RATE,
    durationTicks: durationSeconds * ARENA_TICK_RATE,
    repeatEveryTicks: repeatSeconds * ARENA_TICK_RATE,
    repeatCount,
  });
}

function windEvent(id, startSeconds, impulseX) {
  return Object.freeze({
    id,
    kind: MAP_EVENT_KIND.WIND_ZONE,
    schedule: schedule({
      startSeconds,
      warningSeconds: 2,
      durationSeconds: 8,
      repeatSeconds: 40,
      repeatCount: 3,
    }),
    parameters: Object.freeze({
      region: Object.freeze({
        center: Object.freeze({ x: 0, y: 1, z: 0 }),
        halfExtents: Object.freeze({ x: 6, y: 3, z: 2 }),
      }),
      impulsePerTick: Object.freeze({ x: impulseX, y: 0, z: 0 }),
    }),
  });
}

function collapseEvent(id, startSeconds, surfaceIds) {
  return Object.freeze({
    id,
    kind: MAP_EVENT_KIND.COLLAPSE_SURFACES,
    schedule: schedule({ startSeconds, warningSeconds: 3 }),
    parameters: Object.freeze({ surfaceIds: Object.freeze(surfaceIds) }),
  });
}

export const STAGE5_MAP_DEFINITION = createMapDefinition({
  schemaVersion: MAP_DEFINITION_SCHEMA_VERSION,
  id: STAGE5_MAP_ID,
  arena: STAGE5_ABYSS_ARENA,
  equipmentSpawnPoints: EQUIPMENT_SPAWN_POINTS,
  events: [
    windEvent('wind-east', 10, 0.11),
    windEvent('wind-west', 30, -0.11),
    {
      id: 'artifact-wave',
      kind: MAP_EVENT_KIND.EQUIPMENT_WAVE,
      schedule: schedule({
        startSeconds: 30,
        warningSeconds: 3,
        repeatSeconds: 30,
        repeatCount: 4,
      }),
      parameters: {
        spawnPointIds: ALL_SPAWN_POINT_IDS,
        equipmentDefinitionIds: ALL_EQUIPMENT_IDS,
        count: 1,
      },
    },
    collapseEvent('collapse-corners', 60, [
      SURFACE.NORTH_WEST,
      SURFACE.NORTH_EAST,
      SURFACE.SOUTH_WEST,
      SURFACE.SOUTH_EAST,
    ]),
    collapseEvent('collapse-north-south', 90, [SURFACE.NORTH, SURFACE.SOUTH]),
    collapseEvent('collapse-east-west', 110, [SURFACE.EAST, SURFACE.WEST]),
  ],
});
