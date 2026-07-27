import { describe, expect, it } from 'vitest';
import { runArenaV2CollectionBudgetPrototype } from '../src/arena-v2-collection-budget-prototype.js';

describe('Arena V2 collection budget prototype', () => {
  it('forms a candidate 200-hour budget from weapon, map, mode and challenge evidence', () => {
    const result = runArenaV2CollectionBudgetPrototype();
    expect(result.targetHours).toBe(200);
    expect(result.totalHours).toBe(200);
    expect(result.reachesTarget).toBe(true);
    expect(result.totalRepeatDropHours).toBe(0);
    expect(result.weaponPlans).toHaveLength(20);
    expect(result.weaponPlans.every(({ evidence }) => evidence)).toBe(true);
    expect(result.weaponPlans[0]?.evidence).toHaveLength(6);
  });

  it('requires each weapon to be understood across ground, aerial, map, counterplay and survival contexts', () => {
    const result = runArenaV2CollectionBudgetPrototype();
    const kinds = result.weaponPlans[0]?.evidence.map(({ kind }) => kind);
    expect(kinds).toEqual([
      'first-use',
      'ground-context',
      'aerial-context',
      'map-edge-context',
      'one-v-one-counterplay',
      'survival-application',
    ]);
    expect(result.tracks.map(({ id }) => id)).toEqual([
      'weapon-collection',
      'weapon-contexts',
      'map-routes',
      'mode-records',
      'challenge-sets',
    ]);
  });

  it('exposes sensitivity instead of pretending weapon count is already final', () => {
    const result = runArenaV2CollectionBudgetPrototype();
    expect(result.baselineIsCandidateOnly).toBe(true);
    expect(result.sensitivity.map(({ weaponCount }) => weaponCount)).toEqual([12, 20, 28]);
    expect(result.sensitivity.map(({ totalHours }) => totalHours)).toEqual([152, 200, 248]);
    expect(result.milestones.map(({ hours }) => hours)).toEqual([0.05, 1, 10, 100, 200]);
  });

  it('rejects invalid budget inputs and remains deterministic', () => {
    expect(() => runArenaV2CollectionBudgetPrototype({ weaponCount: 0 })).toThrow();
    expect(() => runArenaV2CollectionBudgetPrototype({ unexpected: true })).toThrow();
    expect(runArenaV2CollectionBudgetPrototype()).toEqual(runArenaV2CollectionBudgetPrototype());
  });
});
