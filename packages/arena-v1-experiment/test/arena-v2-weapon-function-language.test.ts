import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_FUNCTION_LANGUAGE_FAMILY_MAP,
  ARENA_V2_WEAPON_FUNCTION_LANGUAGE_PROFILES,
  ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID,
  ARENA_V2_WEAPON_RESEARCH_CATALOG,
  resolveArenaV2WeaponFunctionLanguage,
} from '../src/index.js';

describe('Arena V2 weapon function language research', () => {
  it('maps every researched reference weapon to a reusable combat language', () => {
    expect(ARENA_V2_WEAPON_FUNCTION_LANGUAGE_PROFILES).toHaveLength(8);
    expect(new Set(ARENA_V2_WEAPON_FUNCTION_LANGUAGE_PROFILES.map(({ id }) => id)).size)
      .toBe(8);
    expect(ARENA_V2_WEAPON_RESEARCH_CATALOG.every((card) => {
      const profile = resolveArenaV2WeaponFunctionLanguage(card);
      return profile.requiredPublicAxes.length >= 4
        && profile.counterplay.length >= 2
        && profile.mapSpaces.length >= 2
        && profile.modeFit.length >= 1
        && profile.minimumArenaVersion.length > 0;
    })).toBe(true);
    expect(Object.keys(ARENA_V2_WEAPON_FUNCTION_LANGUAGE_FAMILY_MAP)).toHaveLength(12);
  });

  it('keeps the first Arena weapons aligned with distinct learnable languages', () => {
    expect(ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.APPROACH).toBe('approach');
    expect(ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.PUSH_AWAY).toBe('push-away');
    expect(ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.REPOSITION).toBe('reposition');
    expect(ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.ZONE_DENIAL).toBe('zone-denial');
    const hammerReference = ARENA_V2_WEAPON_RESEARCH_CATALOG.find(({ referenceId }) => (
      referenceId === 'cyclops-hammer'
    ));
    const hookReference = ARENA_V2_WEAPON_RESEARCH_CATALOG.find(({ referenceId }) => (
      referenceId === 'true-hades-hook-scythe'
    ));
    expect(hammerReference).toBeDefined();
    expect(hookReference).toBeDefined();
    expect(resolveArenaV2WeaponFunctionLanguage(hammerReference!).id).toBe('delayed-heavy');
    expect(resolveArenaV2WeaponFunctionLanguage(hookReference!).id).toBe('reposition');
  });
});
