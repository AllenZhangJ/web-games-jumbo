import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_PUBLIC_AXIS_DEFINITIONS,
  ARENA_V2_WEAPON_PUBLIC_CONTEXT_AXIS_IDS,
  ARENA_V2_WEAPON_PUBLIC_BEHAVIOR_AXIS_IDS,
  ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS,
  ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID,
  ARENA_V2_WEAPON_FUNCTION_LANGUAGE_PROFILES,
  createArenaV2WeaponLanguageReadabilityReport,
  createArenaV2WeaponLanguageReadabilityReports,
} from '../src/index.js';

describe('Arena V2 weapon public axis contract', () => {
  it('keeps the actual overview/context fields and research-only gaps explicit', () => {
    expect(ARENA_V2_WEAPON_PUBLIC_AXIS_DEFINITIONS).toHaveLength(14);
    expect(ARENA_V2_WEAPON_PUBLIC_OVERVIEW_AXIS_IDS).toEqual([
      'range', 'coverage', 'startup', 'recovery', 'impact',
      'vertical', 'control', 'self-movement', 'cooldown',
    ]);
    expect(ARENA_V2_WEAPON_PUBLIC_CONTEXT_AXIS_IDS).toEqual([
      'range', 'coverage', 'startup', 'impact', 'vertical', 'height-gap',
    ]);
    expect(ARENA_V2_WEAPON_PUBLIC_BEHAVIOR_AXIS_IDS).toEqual([
      'active-frames', 'direction-tolerance',
    ]);
    expect(ARENA_V2_WEAPON_PUBLIC_AXIS_DEFINITIONS
      .filter(({ surface }) => surface === 'research-only')
      .map(({ id }) => id))
      .toEqual(['delay', 'warning']);
  });

  it('blocks languages whose required player explanation is not on the current card', () => {
    const reports = createArenaV2WeaponLanguageReadabilityReports();
    expect(reports).toHaveLength(ARENA_V2_WEAPON_FUNCTION_LANGUAGE_PROFILES.length);
    expect(reports.filter(({ readiness }) => readiness === 'ready')
      .map(({ languageId }) => languageId))
      .toEqual([
        ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.APPROACH,
        ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.PUSH_AWAY,
        ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.REPOSITION,
        ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.READ_PUNISH,
        ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.LINE_PRESSURE,
        ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.FLANK,
      ]);
    expect(reports.find(({ languageId }) => (
      languageId === ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.ZONE_DENIAL
    ))).toMatchObject({
      readiness: 'blocked',
      unresolvedResearchAxes: ['delay', 'warning'],
    });
  });

  it('rejects an unknown axis instead of silently treating it as readable', () => {
    expect(() => createArenaV2WeaponLanguageReadabilityReport({
      ...ARENA_V2_WEAPON_FUNCTION_LANGUAGE_PROFILES[0]!,
      requiredPublicAxes: ['range', 'unpublished-axis'],
    })).toThrow('未知公开数值轴');
  });
});
