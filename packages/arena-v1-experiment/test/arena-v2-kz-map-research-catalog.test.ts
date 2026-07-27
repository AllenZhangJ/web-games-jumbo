import { describe, expect, it } from 'vitest';
import { ARENA_V2_KZ_MAP_RESEARCH_CATALOG } from '../src/arena-v2-kz-map-research-catalog.js';

describe('Arena V2 KZ map research catalog', () => {
  it('keeps six representative movement references as research-only cards', () => {
    expect(ARENA_V2_KZ_MAP_RESEARCH_CATALOG.map(({ referenceId }) => referenceId)).toEqual([
      'kz_longjumps2',
      'kz_cmp_collage_v2',
      'kz_climbers_b01',
      'kz_bhop_arcane',
      'bkz_goldbhop_v2',
      'kz_giantbean_b15',
    ]);
    expect(ARENA_V2_KZ_MAP_RESEARCH_CATALOG.every(({ productionAssetStatus }) => (
      productionAssetStatus === 'research-only'
    ))).toBe(true);
    expect(ARENA_V2_KZ_MAP_RESEARCH_CATALOG.every(({
      observedFeatures,
      notToCopy,
      designSignals,
      sourceProfile,
    }) => (
      observedFeatures.length >= 2
      && notToCopy.length >= 2
      && designSignals.length >= 2
      && sourceProfile.difficulty.length > 0
      && sourceProfile.length.length > 0
    ))).toBe(true);
    expect(ARENA_V2_KZ_MAP_RESEARCH_CATALOG.find(({ referenceId }) => (
      referenceId === 'bkz_goldbhop_v2'
    ))?.sourceProfile).toEqual({
      difficulty: 'average',
      length: 'middle',
      checkpointCount: 16,
      goldCheckpointCount: 3,
    });
    expect(ARENA_V2_KZ_MAP_RESEARCH_CATALOG.find(({ referenceId }) => (
      referenceId === 'kz_giantbean_b15'
    ))?.sourceProfile).toEqual({
      difficulty: 'easy-average',
      length: 'short',
      checkpointCount: 1,
      goldCheckpointCount: 1,
    });
  });

  it('does not expose mutable reference lists', () => {
    const [first] = ARENA_V2_KZ_MAP_RESEARCH_CATALOG;
    expect(Object.isFrozen(ARENA_V2_KZ_MAP_RESEARCH_CATALOG)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first?.sourceProfile)).toBe(true);
    expect(Object.isFrozen(first?.designSignals)).toBe(true);
    expect(Object.isFrozen(first?.observedFeatures)).toBe(true);
    expect(Object.isFrozen(first?.notToCopy)).toBe(true);
  });
});
