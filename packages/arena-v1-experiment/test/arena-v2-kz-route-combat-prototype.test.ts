import { describe, expect, it } from 'vitest';
import {
  runArenaV2KzRouteCombatPrototype,
} from '../src/index.js';

describe('Arena V2 KZ route combat prototype', () => {
  it('reuses the six-segment route with shared Rule/Physics attack outcomes', () => {
    const first = runArenaV2KzRouteCombatPrototype();
    const second = runArenaV2KzRouteCombatPrototype();

    expect(first).toEqual(second);
    expect(first.usesSharedRuleAndPhysics).toBe(true);
    expect(first.probeCount).toBe(18);
    expect(first.probes.every(({ firstHitTick }) => firstHitTick !== null)).toBe(true);
    expect(first.probes.every(({ outcome }) => outcome !== 'miss')).toBe(true);
  });

  it('shows that the same weapon changes meaning with segment geometry', () => {
    const probes = runArenaV2KzRouteCombatPrototype().probes;
    const find = (segmentId: string, weaponId: string) => probes.find((probe) => (
      probe.segmentId === segmentId && probe.weaponId === weaponId
    ));

    expect(find('segment-01-platform', 'hammer')).toMatchObject({
      outcome: 'hit-ring-out',
      surfaceWidth: 5.2,
    });
    expect(find('segment-01-platform', 'chain')).toMatchObject({
      outcome: 'hit-safe',
    });
    expect(find('segment-04-maze', 'shield')).toMatchObject({
      outcome: 'hit-ring-out',
      survivalLoopRole: 'choice',
    });
    expect(find('segment-05-narrow', 'hammer')).toMatchObject({
      outcome: 'hit-safe',
      landedOnDifferentSurface: true,
      finalSupportSurfaceId: 'surface-06-wire',
    });
  });
});
