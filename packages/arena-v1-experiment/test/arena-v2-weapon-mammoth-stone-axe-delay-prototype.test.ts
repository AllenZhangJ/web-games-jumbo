import { describe, expect, it } from 'vitest';
import { runArenaV2MammothStoneAxeDelayPrototype } from '../src/index.js';

describe('Arena V2 Mammoth Stone Axe delayed-impact prototype', () => {
  it('separates holding, early route change, impact-time route change and height escape', () => {
    const result = runArenaV2MammothStoneAxeDelayPrototype();
    expect(result).toMatchObject({
      prototypeId: 'arena-v2-mammoth-stone-axe-delay-v1',
      researchOnly: true,
      timingSource: 'research-hypothesis',
      warningRadius: 1.4,
      maximumVerticalDifference: 1,
    });
    expect(result.probes).toHaveLength(4);
    expect(result.probes.map(({ responsePolicy, outcome, firstHitTick }) => (
      [responsePolicy, outcome, firstHitTick]
    ))).toEqual([
      ['hold-center', 'hit', 18],
      ['step-out-early', 'evaded-by-route', null],
      ['step-out-at-impact', 'evaded-by-route', null],
      ['jump-over', 'evaded-by-height', null],
    ]);
  });

  it('keeps the warning window and the map-readable feedback causal', () => {
    const result = runArenaV2MammothStoneAxeDelayPrototype();
    expect(result.probes.map(({ firstActiveTick, warningTicks, activeTicks }) => (
      [firstActiveTick, warningTicks, activeTicks]
    ))).toEqual([
      [18, 18, 2],
      [18, 18, 2],
      [18, 18, 2],
      [18, 18, 2],
    ]);
    expect(result.probes.map(({ feedback, routeChanged }) => [feedback, routeChanged])).toEqual([
      ['impact-hit', false],
      ['route-escape', true],
      ['route-escape', true],
      ['height-escape', false],
    ]);
  });

  it('is deterministic and does not mutate the shared result', () => {
    const first = runArenaV2MammothStoneAxeDelayPrototype();
    expect(first).toEqual(runArenaV2MammothStoneAxeDelayPrototype());
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.probes)).toBe(true);
    expect(Object.isFrozen(first.probes[0])).toBe(true);
  });
});
