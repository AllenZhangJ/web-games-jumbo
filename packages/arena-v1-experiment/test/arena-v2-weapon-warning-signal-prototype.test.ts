import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponWarningSignalPrototype } from '../src/index.js';

describe('Arena V2 weapon warning signal prototype', () => {
  it('derives both delayed weapons from their Definition warning hypotheses', () => {
    const first = runArenaV2WeaponWarningSignalPrototype();
    const second = runArenaV2WeaponWarningSignalPrototype();

    expect(first).toEqual(second);
    expect(first.researchOnly).toBe(true);
    expect(first.timingSource).toBe('definition-warning-hypothesis');
    expect(first.probes).toHaveLength(8);
    expect(new Set(first.probes.map(({ referenceId }) => referenceId))).toEqual(new Set([
      'magic-blood-scythe',
      'mammoth-stone-axe',
    ]));
    expect(first.probes.filter(({ responsePolicy }) => responsePolicy === 'hold-center')
      .every(({ firstHitTick, outcome }) => firstHitTick !== null && outcome === 'hit')).toBe(true);
    expect(first.probes.filter(({ responsePolicy }) => responsePolicy === 'step-out-early')
      .every(({ firstHitTick, outcome, feedback }) => (
        firstHitTick === null && outcome === 'evaded-by-route' && feedback === 'route-escape'
      ))).toBe(true);
    expect(first.probes.filter(({ responsePolicy }) => responsePolicy === 'step-out-at-active')
      .every(({ firstHitTick, outcome }) => firstHitTick === null && outcome === 'evaded-by-route')).toBe(true);
    expect(first.probes.filter(({ responsePolicy }) => responsePolicy === 'jump-over')
      .every(({ firstHitTick, outcome, feedback }) => (
        firstHitTick === null && outcome === 'evaded-by-height' && feedback === 'height-escape'
      ))).toBe(true);
  });

  it('keeps the displayed timing values bound to the two source Definitions', () => {
    const probes = runArenaV2WeaponWarningSignalPrototype().probes;
    expect(probes.filter(({ referenceId }) => referenceId === 'magic-blood-scythe')
      .every(({ delayTicks, warningTicks, activeTicks, lingerTicks }) => (
        delayTicks === 18 && warningTicks === 18 && activeTicks === 6 && lingerTicks === 12
      ))).toBe(true);
    expect(probes.filter(({ referenceId }) => referenceId === 'mammoth-stone-axe')
      .every(({ delayTicks, warningTicks, activeTicks, lingerTicks }) => (
        delayTicks === 18 && warningTicks === 18 && activeTicks === 2 && lingerTicks === 0
      ))).toBe(true);
    expect(Object.isFrozen(probes)).toBe(true);
    expect(Object.isFrozen(probes[0])).toBe(true);
  });
});
