import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_JUMP_ROUTE_INPUTS,
  createArenaV2JumpRoutePrototype,
} from '../src/index.js';

describe('Arena V2 CS1.6 KZ-inspired jump route prototype', () => {
  it('keeps the six-segment route readable and reusable by survival mode', () => {
    const route = createArenaV2JumpRoutePrototype();

    expect(route.segmentIds).toHaveLength(6);
    expect(route.segmentIds).toEqual(route.segments.map(({ segmentId }) => segmentId));
    expect(ARENA_V2_JUMP_ROUTE_INPUTS).toEqual(['direction', 'jump']);
    expect(route.usesOnlyBaseInputs).toBe(true);
    expect(route.surfacesCanCollapse).toBe(false);
    expect(route.respawnSeconds).toBe(3);
    expect(route.finishAnchor).toBe('anchor-finish');
    expect(route.survivalChoiceSegmentIds).toEqual([
      'segment-04-maze',
      'segment-06-wire',
    ]);
    expect(route.permanentRecoverySegmentIds).toEqual([
      'segment-01-platform',
      'segment-02-gap',
    ]);
    expect(route.segments.every(({ difficulty }) => Object.values(difficulty)
      .every((value) => Number.isInteger(value) && value >= 1 && value <= 4))).toBe(true);
  });
});
