import { describe, expect, it } from 'vitest';
import { ARENA_V2_KZ_MAP_RESEARCH_CATALOG } from '../src/arena-v2-kz-map-research-catalog.js';

describe('Arena V2 KZ map research catalog', () => {
  it('keeps four representative movement references as research-only cards', () => {
    expect(ARENA_V2_KZ_MAP_RESEARCH_CATALOG.map(({ referenceId }) => referenceId)).toEqual([
      'kz_longjumps2',
      'kz_cmp_collage_v2',
      'kz_climbers_b01',
      'kz_bhop_arcane',
    ]);
    expect(ARENA_V2_KZ_MAP_RESEARCH_CATALOG.every(({ productionAssetStatus }) => (
      productionAssetStatus === 'research-only'
    ))).toBe(true);
    expect(ARENA_V2_KZ_MAP_RESEARCH_CATALOG.every(({ observedFeatures, notToCopy }) => (
      observedFeatures.length >= 2 && notToCopy.length >= 2
    ))).toBe(true);
  });

  it('does not expose mutable reference lists', () => {
    const [first] = ARENA_V2_KZ_MAP_RESEARCH_CATALOG;
    expect(Object.isFrozen(ARENA_V2_KZ_MAP_RESEARCH_CATALOG)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first?.observedFeatures)).toBe(true);
    expect(Object.isFrozen(first?.notToCopy)).toBe(true);
  });
});
