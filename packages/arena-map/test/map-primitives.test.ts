import { describe, expect, it } from 'vitest';

import {
  MAP_DEFINITION_SCHEMA_VERSION,
  MapDefinition,
} from '@number-strategy-jump/arena-definitions';

import {
  MAP_EVENT_KIND,
  MAP_TIMELINE_TRANSITION,
  MapTimeline,
  validateCharacterSpawnSafety,
  validateDefaultMapSafety,
  validateWalkableMapTopology,
} from '../src/index.js';

function createTestMap(collapseSurfaceIds: readonly string[] = ['wing']): MapDefinition {
  return new MapDefinition({
    schemaVersion: MAP_DEFINITION_SCHEMA_VERSION,
    id: 'test-map',
    arena: {
      killY: -5,
      surfaces: [
        {
          id: 'base',
          center: { x: 0, y: -0.5, z: 0 },
          halfExtents: { x: 5, y: 0.5, z: 3 },
        },
        {
          id: 'wing',
          center: { x: 6, y: -0.5, z: 0 },
          halfExtents: { x: 1, y: 0.5, z: 3 },
        },
      ],
      spawns: [{ x: -2, y: 1, z: 0 }, { x: 2, y: 1, z: 0 }],
    },
    equipmentSpawnPoints: [],
    events: [
      {
        id: 'wind',
        kind: MAP_EVENT_KIND.WIND_ZONE,
        schedule: {
          startTick: 5,
          warningLeadTicks: 0,
          durationTicks: 5,
          repeatEveryTicks: 0,
          repeatCount: 1,
        },
        parameters: {},
      },
      {
        id: 'collapse',
        kind: MAP_EVENT_KIND.COLLAPSE_SURFACES,
        schedule: {
          startTick: 10,
          warningLeadTicks: 0,
          durationTicks: 0,
          repeatEveryTicks: 0,
          repeatCount: 1,
        },
        parameters: { surfaceIds: collapseSurfaceIds },
      },
    ],
  });
}

describe('arena-map primitives', () => {
  it('orders same-tick end before start with stable occurrence identity', () => {
    const timeline = new MapTimeline(createTestMap());
    expect(timeline.transitionsAt(10).map(({ transition, occurrenceId }) => [
      transition,
      occurrenceId,
    ])).toEqual([
      [MAP_TIMELINE_TRANSITION.WARNING, 'collapse:0'],
      [MAP_TIMELINE_TRANSITION.END, 'wind:0'],
      [MAP_TIMELINE_TRANSITION.START, 'collapse:0'],
    ]);
    expect(timeline.requireOccurrence('collapse:0').startTick).toBe(10);
  });

  it('proves initial and post-collapse walkable topology deterministically', () => {
    expect(validateWalkableMapTopology(createTestMap(), {
      characterRadius: 0.45,
      maximumStepHeight: 0.35,
    })).toEqual({
      initialSurfaceCount: 2,
      permanentSurfaceCount: 1,
      collapseCount: 1,
    });
  });

  it('requires permanent safe surfaces and two collision-safe character spawns', () => {
    const map = createTestMap();
    const permanent = validateDefaultMapSafety(map);
    expect(permanent).toEqual(['base']);
    expect(validateCharacterSpawnSafety(map, {
      characterSpawns: [
        { characterId: 'player-a', collision: { radius: 0.45, halfHeight: 0.55 } },
        { characterId: 'player-b', collision: { radius: 0.45, halfHeight: 0.55 } },
      ],
      permanentSafeSurfaceIds: permanent,
      groundProbeTolerance: 0.035,
    })).toEqual([
      { characterId: 'player-a', spawnIndex: 0, surfaceId: 'base' },
      { characterId: 'player-b', spawnIndex: 1, surfaceId: 'base' },
    ]);
  });

  it('fails closed when the timeline eventually removes every surface', () => {
    const map = createTestMap(['base', 'wing']);
    expect(() => validateDefaultMapSafety(map)).toThrow('不能最终塌陷所有 surface');
    expect(() => validateWalkableMapTopology(map, {
      characterRadius: 0.45,
      maximumStepHeight: 0.35,
    })).toThrow('不能没有可用 surface');
  });
});
