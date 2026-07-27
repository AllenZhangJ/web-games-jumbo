import { describe, expect, it } from 'vitest';
import {
  runArenaV2KzRouteCombatPrototype,
  runArenaV2KzRouteCombatResponsePrototype,
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

  it('compares bounded strafe and jump responses without direct position writes', () => {
    const probes = runArenaV2KzRouteCombatResponsePrototype();
    expect(probes.probeCount).toBe(54);
    const find = (segmentId: string, weaponId: string, responsePolicy: string) => (
      probes.probes.find((probe) => (
        probe.segmentId === segmentId
        && probe.weaponId === weaponId
        && probe.responsePolicy === responsePolicy
      ))
    );

    expect(find('segment-01-platform', 'hammer', 'hold')).toMatchObject({
      responseOutcome: 'hit-ring-out',
      responseTicks: 0,
      jumpStarted: false,
    });
    expect(find('segment-01-platform', 'hammer', 'jump')).toMatchObject({
      responseOutcome: 'hit-safe',
      responseTicks: 1,
      jumpStarted: true,
      finalSupportSurfaceId: 'surface-03-stair-a',
    });
    expect(find('segment-04-maze', 'hammer', 'jump')?.responseOutcome).toBe('hit-ring-out');
    expect(find('segment-05-narrow', 'hammer', 'strafe')).toMatchObject({
      responseOutcome: 'hit-ring-out',
      responseTicks: 10,
    });
    expect(probes.probes.every(({ responsePolicy, responseTicks }) => (
      responsePolicy !== 'strafe' || responseTicks <= 10
    ))).toBe(true);
  });
});
