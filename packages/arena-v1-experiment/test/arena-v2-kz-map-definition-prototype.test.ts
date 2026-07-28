import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_KZ_MAP_DEFINITION_ID,
  createArenaV2JumpRoutePrototype,
  createArenaV2KzMapDefinitionPrototype,
} from '../src/index.js';

describe('Arena V2 CS1.6 KZ-inspired MapDefinition prototype', () => {
  it('compiles the six-segment route into one reusable static map contract', () => {
    const route = createArenaV2JumpRoutePrototype();
    const prototype = createArenaV2KzMapDefinitionPrototype();
    const map = prototype.mapDefinition;

    expect(prototype.mapId).toBe(ARENA_V2_KZ_MAP_DEFINITION_ID);
    expect(prototype.routeId).toBe(route.routeId);
    expect(prototype.segmentIds).toEqual(route.segmentIds);
    expect(map.id).toBe(ARENA_V2_KZ_MAP_DEFINITION_ID);
    expect(map.arena.killY).toBe(-6);
    expect(map.arena.surfaces).toHaveLength(route.surfaces.length);
    expect(map.arena.spawns).toHaveLength(4);
    expect(map.equipmentSpawnPoints).toHaveLength(6);
    expect(map.events).toEqual([]);
    expect(prototype.modeProfiles).toEqual({
      race: { usesFinishAnchor: true, finishAnchor: 'anchor-finish' },
      survival: { usesFinishAnchor: false, finishAnchor: null },
    });
    expect(prototype.segmentIds.every((segmentId) => (
      prototype.segmentSurfaceIds[segmentId]!.length > 0
      && prototype.respawnAnchorBySegment[segmentId] !== undefined
    ))).toBe(true);
    expect(prototype.branchOptionsBySegment['segment-04-maze']).toEqual([
      'maze-direct-low',
      'maze-recovery-high',
    ]);
    expect(prototype.branchOptionsBySegment['segment-06-wire']).toEqual([
      'wire-centerline',
      'wire-edge-cut',
    ]);
    expect(prototype.productionStatus).toBe('research-only');
  });

  it('keeps map geometry and research metadata deeply frozen', () => {
    const prototype = createArenaV2KzMapDefinitionPrototype();
    expect(Object.isFrozen(prototype)).toBe(true);
    expect(Object.isFrozen(prototype.mapDefinition)).toBe(true);
    expect(Object.isFrozen(prototype.mapDefinition.arena)).toBe(true);
    expect(Object.isFrozen(prototype.mapDefinition.arena.surfaces)).toBe(true);
    expect(Object.isFrozen(prototype.segmentSurfaceIds)).toBe(true);
    expect(Object.isFrozen(prototype.branchOptionsBySegment)).toBe(true);
    expect(Object.isFrozen(prototype.modeProfiles)).toBe(true);
  });
});
