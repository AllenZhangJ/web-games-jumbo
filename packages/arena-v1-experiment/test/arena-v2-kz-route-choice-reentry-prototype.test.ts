import { describe, expect, it } from 'vitest';
import { runArenaV2KzRouteChoiceReentryPrototype } from '../src/index.js';

describe('Arena V2 KZ route choice and reentry prototype', () => {
  it('exposes visible branch trade-offs without adding inputs', () => {
    const first = runArenaV2KzRouteChoiceReentryPrototype();
    const second = runArenaV2KzRouteChoiceReentryPrototype();

    expect(first).toEqual(second);
    expect(first.productionStatus).toBe('research-only');
    expect(first.usesOnlyBaseInputs).toBe(true);
    expect(first.choiceSegmentIds).toEqual(['segment-04-maze', 'segment-06-wire']);
    expect(first.branchCount).toBe(4);
    expect(first.scenarios.every(({ visibleBranchesAtChoice }) => visibleBranchesAtChoice.length === 2)).toBe(true);
    expect(first.scenarios
      .filter(({ branchRole }) => branchRole === 'fast-exposed')
      .every(({ visibleBranchesAtChoice }) => visibleBranchesAtChoice.some(({ role }) => role === 'safe-recovery')))
      .toBe(true);
  });

  it('returns to the named segment and keeps the branch vocabulary after three seconds', () => {
    const result = runArenaV2KzRouteChoiceReentryPrototype();

    expect(result.respawnWaitTicks).toBe(180);
    for (const scenario of result.scenarios) {
      expect(scenario.respawnTick).toBe(scenario.failureTick + 180);
      expect(scenario.reentryTick).toBe(scenario.respawnTick + 2);
      expect(scenario.reentrySegmentId).toBe(scenario.segmentId);
      expect(scenario.reentryAnchorId).toBe(
        scenario.visibleBranchesAtChoice.find(({ branchId }) => branchId === scenario.branchId)?.recoveryAnchor,
      );
      expect(scenario.visibleBranchesAtReentry.map(({ branchId }) => branchId))
        .toEqual(scenario.visibleBranchesAtChoice.map(({ branchId }) => branchId));
      expect(scenario.reentryReadable).toBe(true);
      expect(scenario.outcome).toBe('branch-selected-and-reentered');
    }
  });
});
