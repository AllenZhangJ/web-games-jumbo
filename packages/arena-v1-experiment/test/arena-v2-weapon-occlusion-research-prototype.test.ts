import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponOcclusionResearchPrototype } from '../src/index.js';

describe('Arena V2 weapon occlusion research prototype', () => {
  it('uses candidate targeting definitions to expose same-lane occlusion', () => {
    const first = runArenaV2WeaponOcclusionResearchPrototype();
    const second = runArenaV2WeaponOcclusionResearchPrototype();

    expect(first).toEqual(second);
    expect(first.probeVersion).toBe(1);
    expect(first.candidateCount).toBe(5);
    expect(first.results).toHaveLength(15);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.results)).toBe(true);

    for (const candidateId of [
      'research-line-pressure',
      'research-zone-denial',
      'research-delayed-heavy',
      'research-read-punish',
      'research-flank',
    ]) {
      const clear = first.results.find(({ candidateId: id, scenario }) => (
        id === candidateId && scenario === 'clear-target'
      ));
      const sameLane = first.results.find(({ candidateId: id, scenario }) => (
        id === candidateId && scenario === 'same-lane-occlusion'
      ));
      const sideEntry = first.results.find(({ candidateId: id, scenario }) => (
        id === candidateId && scenario === 'side-entry'
      ));
      expect(clear).toMatchObject({
        eligibleTargetIds: ['primary-target'],
        selectedTargetId: 'primary-target',
        occludedTargetIds: [],
        visibilityLoad: 1,
        feedbackAmbiguous: false,
      });
      expect(sameLane).toMatchObject({
        eligibleTargetIds: ['near-target', 'primary-target'],
        selectedTargetId: 'near-target',
        occludedTargetIds: ['primary-target'],
        occlusionDepth: 1,
        visibilityLoad: 2,
        feedbackAmbiguous: true,
      });
      expect(sideEntry).toMatchObject({
        eligibleTargetIds: ['near-target', 'primary-target'],
        selectedTargetId: 'near-target',
        occludedTargetIds: [],
        feedbackAmbiguous: false,
      });
    }
  });
});
