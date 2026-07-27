import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID,
  ARENA_V2_WEAPON_MINIMUM_VERSION_SPECIFICATIONS,
  ARENA_V2_WEAPON_MINIMUM_VERSIONS,
  createArenaV2WeaponMinimumVersionCatalog,
  findArenaV2WeaponMinimumVersion,
  listArenaV2WeaponMinimumVersionLanguages,
} from '../src/index.js';

describe('Arena V2 weapon minimum version contract', () => {
  it('defines one structured minimum contract for each battle language', () => {
    expect(ARENA_V2_WEAPON_MINIMUM_VERSION_SPECIFICATIONS).toHaveLength(7);
    expect(listArenaV2WeaponMinimumVersionLanguages()).toEqual([
      ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.APPROACH,
      ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.ZONE_DENIAL,
      ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.REPOSITION,
      ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.READ_PUNISH,
      ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.LINE_PRESSURE,
      ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.FLANK,
      ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.DELAYED_HEAVY,
    ]);
    expect(ARENA_V2_WEAPON_MINIMUM_VERSION_SPECIFICATIONS.every((specification) => (
      specification.input === 'primary-attack'
      && specification.contexts.length === 2
      && specification.minimumRule.targeting.length > 0
      && specification.minimumRule.timing.length > 0
      && specification.minimumRule.hitResult.length > 0
      && specification.minimumRule.mapRelationship.length > 0
      && specification.minimumRule.failureCost.length > 0
      && specification.counterplay.length >= 2
      && specification.notToCopy.length >= 2
    ))).toBe(true);
  });

  it('projects every researched reference weapon into a readable, reviewable minimum version', () => {
    expect(ARENA_V2_WEAPON_MINIMUM_VERSIONS).toHaveLength(12);
    expect(new Set(ARENA_V2_WEAPON_MINIMUM_VERSIONS.map(({ referenceId }) => referenceId)).size)
      .toBe(12);
    expect(ARENA_V2_WEAPON_MINIMUM_VERSIONS.every((version) => (
      version.sourceUrl.startsWith('https://bfo.web.sdo.com/')
      && version.input === 'primary-attack'
      && version.contexts.length >= 2
      && version.requiredPublicAxes.length >= 3
      && version.mapUses.length >= 2
      && version.counterplay.length >= 2
      && version.failureCost.length > 0
      && version.notToCopy.length >= 2
    ))).toBe(true);
    expect(findArenaV2WeaponMinimumVersion('phantom-tiger-fist')).toMatchObject({
      languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.READ_PUNISH,
      coreVerb: '读招反制',
      readiness: 'ready',
      minimumRule: {
        timing: expect.stringContaining('到期取消'),
      },
    });
    expect(findArenaV2WeaponMinimumVersion('magic-blood-scythe')).toMatchObject({
      languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.ZONE_DENIAL,
      readiness: 'blocked',
      unresolvedResearchAxes: ['delay', 'warning'],
    });
  });

  it('rebuilds the same immutable catalog deterministically', () => {
    const rebuilt = createArenaV2WeaponMinimumVersionCatalog();
    expect(rebuilt).toEqual(ARENA_V2_WEAPON_MINIMUM_VERSIONS);
    expect(Object.isFrozen(rebuilt)).toBe(true);
    expect(Object.isFrozen(rebuilt[0])).toBe(true);
    expect(Object.isFrozen(rebuilt[0]?.minimumRule)).toBe(true);
  });
});
