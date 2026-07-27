import { describe, expect, it } from 'vitest';
import { createArenaV2WeaponResearchOverviewMatrix } from '../src/index.js';

describe('Arena V2 weapon research overview matrix', () => {
  it('shows comparable ground/aerial numeric axes, units and direction semantics for all three candidates', () => {
    const matrix = createArenaV2WeaponResearchOverviewMatrix();
    expect(matrix.rows).toHaveLength(3);
    expect(matrix.comparedAxisIds).toHaveLength(9);
    expect(matrix.rows.every(({ contexts, coreVerb, hitResult, mapSpaces, counterplay }) => (
      contexts.length === 2
      && contexts.map(({ id }) => id).join(',') === 'ground,aerial'
      && coreVerb.length > 0
      && hitResult.length > 0
      && mapSpaces.length > 0
      && counterplay.length > 0
      && contexts.every(({ stats, contextStats, behaviorStats }) => (
        stats.length === 9
        && contextStats.length === 6
        && behaviorStats.length === 2
        && stats.every(({ label, value, maxValue, unit, direction, playerMeaning }) => (
          label.length > 0
          && Number.isFinite(value)
          && value >= 0
          && maxValue > value
          && unit.length > 0
          && direction.length > 0
          && playerMeaning.length > 0
        ))
      ))
    ))).toBe(true);
    expect(matrix.rows.map(({ weaponId }) => weaponId)).toEqual([
      'research-line-pressure',
      'research-read-punish',
      'research-flank',
    ]);
    expect(matrix.rows[0]?.contexts[0]?.stats.find(({ id }) => id === 'range')?.value)
      .toBeGreaterThan(matrix.rows[1]?.contexts[0]?.stats.find(({ id }) => id === 'range')?.value ?? 0);
    expect(matrix.rows[1]?.contexts[0]?.stats.find(({ id }) => id === 'startup')?.direction)
      .toBe('lower-is-better');
    expect(matrix.rows[0]?.contexts[1]?.stats.find(({ id }) => id === 'range')?.value)
      .not.toBe(matrix.rows[0]?.contexts[0]?.stats.find(({ id }) => id === 'range')?.value);
    expect(matrix.rows[0]?.contexts[0]?.behaviorStats.find(({ id }) => id === 'direction-tolerance')?.unit)
      .toBe('°');
    expect(matrix.rows[0]?.contexts[0]?.contextStats.find(({ id }) => id === 'height-gap')?.unit)
      .toBe('格');
  });

  it('freezes the research-only matrix and preserves distinct behavior fingerprints', () => {
    const first = createArenaV2WeaponResearchOverviewMatrix();
    expect(first).toEqual(createArenaV2WeaponResearchOverviewMatrix());
    expect(first.allRowsHaveComparableAxes).toBe(true);
    expect(first.allRowsHaveDistinctBehaviorFingerprint).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.rows)).toBe(true);
    expect(Object.isFrozen(first.rows[0]?.contexts)).toBe(true);
    expect(Object.isFrozen(first.rows[0]?.contexts[0]?.stats)).toBe(true);
    expect(Object.isFrozen(first.rows[0]?.contexts[0]?.contextStats)).toBe(true);
  });
});
