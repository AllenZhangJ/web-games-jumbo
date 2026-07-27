import { describe, expect, it } from 'vitest';
import {
  createArenaV2WeaponCaseStudyReadabilityMatrix,
  createArenaV2WeaponCaseStudyResearchSignalReadout,
  createArenaV2WeaponReadabilityTaskSet,
} from '../src/index.js';

describe('Arena V2 six-case weapon readability matrix', () => {
  it('connects all six research Definition projections to participant tasks', () => {
    const matrix = createArenaV2WeaponCaseStudyReadabilityMatrix();
    expect(matrix.rows).toHaveLength(6);
    expect(matrix.rows.map(({ candidateId }) => candidateId)).toEqual([
      'magic-blood-scythe',
      'true-hades-hook-scythe',
      'white-platinum-dual-guns',
      'blood-shadow-hook-blade',
      'phantom-tiger-fist',
      'mammoth-stone-axe',
    ]);
    expect(matrix.rows.every(({ contexts, mapSpaces, counterplay }) => (
      contexts.length === 2
      && mapSpaces.length > 0
      && counterplay.length > 0
      && contexts.every(({ stats, contextStats, behaviorStats }) => (
        stats.length === 9 && contextStats.length === 6 && behaviorStats.length === 2
      ))
    ))).toBe(true);
    const taskSet = createArenaV2WeaponReadabilityTaskSet(matrix);
    expect(taskSet.sourceWeaponIds).toHaveLength(6);
    expect(taskSet.participantReady).toBe(true);
    expect(taskSet.tasks.every(({ status }) => status === 'ready')).toBe(true);
    expect(Object.isFrozen(matrix)).toBe(true);
    expect(Object.isFrozen(matrix.rows)).toBe(true);
  });

  it('keeps delayed impact visible as an explicit research signal without inventing zeroes', () => {
    const signals = createArenaV2WeaponCaseStudyResearchSignalReadout();
    expect(signals).toHaveLength(6);
    expect(signals.find(({ referenceId }) => referenceId === 'magic-blood-scythe')).toMatchObject({
      delayTicks: 18,
      warningTicks: 18,
      activeTicks: 6,
      status: 'research-hypothesis',
    });
    expect(signals.find(({ referenceId }) => referenceId === 'mammoth-stone-axe')).toMatchObject({
      delayTicks: 18,
      warningTicks: 18,
      activeTicks: 2,
      status: 'research-hypothesis',
    });
    expect(signals.filter(({ status }) => status === 'not-declared')).toHaveLength(4);
    expect(signals.filter(({ delayTicks }) => delayTicks === null)).toHaveLength(4);
    expect(Object.isFrozen(signals)).toBe(true);
    expect(Object.isFrozen(signals[0])).toBe(true);
  });
});
