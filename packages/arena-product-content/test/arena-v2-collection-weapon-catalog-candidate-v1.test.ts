import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_COLLECTION_WEAPON_CATALOG_CANDIDATE_V1,
  ARENA_V2_EXPANDED_WEAPON_CATALOG_CANDIDATE_V1,
  ARENA_V2_LAUNCH_WEAPON_CATALOG_CANDIDATE_V1,
  projectArenaV2WeaponNumericDominanceAuditCandidateV1,
} from '../src/index.js';

describe('Arena V2 collection weapon catalog candidate V1', () => {
  it('closes six launch languages and fourteen minimal collection variants', () => {
    const catalog = ARENA_V2_COLLECTION_WEAPON_CATALOG_CANDIDATE_V1;
    expect(catalog).toMatchObject({
      status: 'production-unreachable',
      hardGate: false,
      defaultRegistryWired: false,
      launchWeaponCount: 6,
      collectionWeaponCount: 20,
    });
    expect(ARENA_V2_LAUNCH_WEAPON_CATALOG_CANDIDATE_V1.weaponCount).toBe(6);
    expect(ARENA_V2_EXPANDED_WEAPON_CATALOG_CANDIDATE_V1.weaponCount).toBe(14);
    expect(catalog.weapons.map(({ collectionOrder }) => collectionOrder)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(new Set(catalog.weapons.map(({ learningProblem }) => learningProblem)).size).toBe(20);
    expect(catalog.weapons.every(({ actions, grammar }) => (
      actions.length === 2
      && grammar.contexts.length === 2
      && grammar.requiredInput === 'primary'
      && actions.every(({ input }) => input.channel === 'primary')
    ))).toBe(true);
  });

  it('keeps every collection authority identity unique and frozen', () => {
    const weapons = ARENA_V2_COLLECTION_WEAPON_CATALOG_CANDIDATE_V1.weapons;
    const ids = [
      ...weapons.map(({ id }) => id),
      ...weapons.map(({ equipment }) => equipment.id),
      ...weapons.map(({ grammar }) => grammar.id),
      ...weapons.flatMap(({ actions }) => actions.map(({ id }) => id)),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.isFrozen(weapons)).toBe(true);
    expect(weapons.every(Object.isFrozen)).toBe(true);
    expect(ARENA_V2_COLLECTION_WEAPON_CATALOG_CANDIDATE_V1.contentHash)
      .toMatch(/^[0-9a-f]{8}$/);
  });

  it('reports only semantically comparable numeric dominance pairs without ranking weapons', () => {
    const audit = projectArenaV2WeaponNumericDominanceAuditCandidateV1();
    expect(audit).toMatchObject({
      status: 'production-unreachable',
      hardGate: false,
      defaultRegistryWired: false,
      weaponCount: 20,
      computesCompositePowerScore: false,
      mutatesWeaponTuning: false,
      claimsDynamicBalance: false,
      requiresDynamicThreeModeMapEvidence: true,
      validationStatus: 'not-run',
    });
    expect(audit.comparedPairCount + audit.incomparablePairCount).toBe(20 * 19);
    expect(audit.numericDominancePairCount).toBe(audit.numericDominancePairs.length);
    expect(audit.numericDominancePairs.every((pair) => (
      pair.strictAdvantageAxes.length > 0
      && pair.requiresBalanceReview
      && !pair.provesOverallWeaponDominance
    ))).toBe(true);
  });
});
