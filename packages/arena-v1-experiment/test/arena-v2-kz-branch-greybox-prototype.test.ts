import { describe, expect, it } from 'vitest';
import { runArenaV2KzBranchGreyboxPrototype } from '../src/index.js';

describe('Arena V2 KZ branch greybox prototype', () => {
  it('runs every declared branch through shared lightweight physics', () => {
    const first = runArenaV2KzBranchGreyboxPrototype();
    const second = runArenaV2KzBranchGreyboxPrototype();

    expect(first).toEqual(second);
    expect(first.productionStatus).toBe('research-only');
    expect(first.usesSharedPhysics).toBe(true);
    expect(first.usesOnlyBaseInputs).toBe(true);
    expect(first.branchCount).toBe(4);
    expect(first.scenarios.map(({ branchId }) => branchId)).toEqual([
      'maze-direct-low',
      'maze-recovery-high',
      'wire-centerline',
      'wire-edge-cut',
    ]);
  });

  it('measures completed branch surfaces instead of reusing planned route ticks', () => {
    const result = runArenaV2KzBranchGreyboxPrototype();

    for (const scenario of result.scenarios) {
      expect(scenario.completed).toBe(true);
      expect(scenario.measuredTraversalTicks).toEqual(expect.any(Number));
      expect(scenario.routeTicksDelta).toEqual(expect.any(Number));
      expect(scenario.surfaceCount).toBeGreaterThanOrEqual(2);
      expect(scenario.maximumCenterDistance).toBeLessThanOrEqual(1.75);
      expect(scenario.finalSupportSurfaceId).toBe(scenario.surfaceIds.at(-1));
      expect(scenario.failedReason).toBeNull();
    }
    const scenarioById = new Map(result.scenarios.map((scenario) => [scenario.branchId, scenario]));
    expect(scenarioById.get('maze-recovery-high')?.measuredTraversalTicks)
      .toBeGreaterThan(scenarioById.get('maze-direct-low')?.measuredTraversalTicks ?? 0);
    expect(scenarioById.get('wire-centerline')?.measuredTraversalTicks)
      .toBeGreaterThan(scenarioById.get('wire-edge-cut')?.measuredTraversalTicks ?? 0);
  });
});
