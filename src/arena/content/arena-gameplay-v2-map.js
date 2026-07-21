import { ARENA_TICK_RATE } from '../config.js';
import {
  MAP_DEFINITION_SCHEMA_VERSION,
  createMapDefinition,
} from '@number-strategy-jump/arena-definitions';
import { MAP_EVENT_KIND } from '@number-strategy-jump/arena-map';
import { STAGE4_EQUIPMENT_ID } from './stage4-equipment.js';

export const ARENA_GAMEPLAY_V2_MAP_ID = 'forge-crossroads-v2';

function surface(id, x, z, halfX, halfZ, top = 0) {
  return Object.freeze({
    id,
    center: Object.freeze({ x, y: top - 0.5, z }),
    halfExtents: Object.freeze({ x: halfX, y: 0.5, z: halfZ }),
  });
}

const SURFACE = Object.freeze({
  CENTER: 'forge-center',
  EAST_BRIDGE: 'forge-east-bridge',
  EAST_YARD: 'forge-east-yard',
  EAST_ISLAND: 'forge-east-skill-island',
  WEST_BRIDGE: 'forge-west-bridge',
  WEST_YARD: 'forge-west-yard',
  WEST_ISLAND: 'forge-west-skill-island',
  NORTH_BRIDGE: 'forge-north-bridge',
  NORTH_YARD: 'forge-north-yard',
  NORTH_LEDGE: 'forge-north-ledge',
  SOUTH_BRIDGE: 'forge-south-bridge',
  SOUTH_YARD: 'forge-south-yard',
  SOUTH_LEDGE: 'forge-south-ledge',
});

export const ARENA_GAMEPLAY_V2_ARENA = Object.freeze({
  killY: -6,
  surfaces: Object.freeze([
    surface(SURFACE.CENTER, 0, 0, 4, 4),
    surface(SURFACE.EAST_BRIDGE, 7, 0, 3, 1.75),
    surface(SURFACE.EAST_YARD, 12, 0, 2, 5),
    surface(SURFACE.EAST_ISLAND, 16.5, 0, 2.5, 3.2, 0.35),
    surface(SURFACE.WEST_BRIDGE, -7, 0, 3, 1.75),
    surface(SURFACE.WEST_YARD, -12, 0, 2, 5),
    surface(SURFACE.WEST_ISLAND, -16.5, 0, 2.5, 3.2, 0.35),
    surface(SURFACE.NORTH_BRIDGE, 0, 7, 1.75, 3),
    surface(SURFACE.NORTH_YARD, 0, 12, 6, 2),
    surface(SURFACE.NORTH_LEDGE, 0, 15.75, 3.5, 1.75, 0.3),
    surface(SURFACE.SOUTH_BRIDGE, 0, -7, 1.75, 3),
    surface(SURFACE.SOUTH_YARD, 0, -12, 6, 2),
    surface(SURFACE.SOUTH_LEDGE, 0, -15.75, 3.5, 1.75, 0.3),
  ]),
  spawns: Object.freeze([
    Object.freeze({ x: -1.6, y: 1.02, z: 0 }),
    Object.freeze({ x: 1.6, y: 1.02, z: 0 }),
  ]),
});

const EQUIPMENT_SPAWN_POINTS = Object.freeze([
  Object.freeze({
    id: 'forge-artifact-center',
    surfaceId: SURFACE.CENTER,
    position: Object.freeze({ x: 0, y: 1, z: 0 }),
  }),
  Object.freeze({
    id: 'forge-artifact-east',
    surfaceId: SURFACE.EAST_YARD,
    position: Object.freeze({ x: 12, y: 1, z: 0 }),
  }),
  Object.freeze({
    id: 'forge-artifact-west',
    surfaceId: SURFACE.WEST_YARD,
    position: Object.freeze({ x: -12, y: 1, z: 0 }),
  }),
  Object.freeze({
    id: 'forge-artifact-north',
    surfaceId: SURFACE.NORTH_YARD,
    position: Object.freeze({ x: 0, y: 1, z: 12 }),
  }),
  Object.freeze({
    id: 'forge-artifact-south',
    surfaceId: SURFACE.SOUTH_YARD,
    position: Object.freeze({ x: 0, y: 1, z: -12 }),
  }),
]);

function schedule({ start, warning, duration = 0, repeat = 0, count = 1 }) {
  return Object.freeze({
    startTick: start * ARENA_TICK_RATE,
    warningLeadTicks: warning * ARENA_TICK_RATE,
    durationTicks: duration * ARENA_TICK_RATE,
    repeatEveryTicks: repeat * ARENA_TICK_RATE,
    repeatCount: count,
  });
}

const SPAWN_IDS = Object.freeze(EQUIPMENT_SPAWN_POINTS.map(({ id }) => id));

export const ARENA_GAMEPLAY_V2_MAP_DEFINITION = createMapDefinition({
  schemaVersion: MAP_DEFINITION_SCHEMA_VERSION,
  id: ARENA_GAMEPLAY_V2_MAP_ID,
  arena: ARENA_GAMEPLAY_V2_ARENA,
  equipmentSpawnPoints: EQUIPMENT_SPAWN_POINTS,
  events: [
    {
      id: 'forge-crosswind-east',
      kind: MAP_EVENT_KIND.WIND_ZONE,
      schedule: schedule({ start: 18, warning: 2, duration: 7, repeat: 36, count: 3 }),
      parameters: {
        region: {
          center: { x: 0, y: 1, z: 0 },
          halfExtents: { x: 14, y: 3, z: 2.2 },
        },
        impulsePerTick: { x: 0.095, y: 0, z: 0 },
      },
    },
    {
      id: 'forge-artifact-wave',
      kind: MAP_EVENT_KIND.EQUIPMENT_WAVE,
      schedule: schedule({ start: 22, warning: 3, repeat: 28, count: 4 }),
      parameters: {
        spawnPointIds: SPAWN_IDS,
        equipmentDefinitionIds: Object.values(STAGE4_EQUIPMENT_ID),
        count: 2,
      },
    },
    {
      id: 'forge-collapse-outer-ledges',
      kind: MAP_EVENT_KIND.COLLAPSE_SURFACES,
      schedule: schedule({ start: 72, warning: 4 }),
      parameters: {
        surfaceIds: [
          SURFACE.EAST_ISLAND,
          SURFACE.WEST_ISLAND,
          SURFACE.NORTH_LEDGE,
          SURFACE.SOUTH_LEDGE,
        ],
      },
    },
    {
      id: 'forge-collapse-side-yards',
      kind: MAP_EVENT_KIND.COLLAPSE_SURFACES,
      schedule: schedule({ start: 104, warning: 4 }),
      parameters: {
        surfaceIds: [SURFACE.EAST_YARD, SURFACE.WEST_YARD],
      },
    },
  ],
});
