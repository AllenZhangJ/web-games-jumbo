import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_COLLECTION_FALLBACK_SEMANTIC_SOURCE_CANDIDATE_V1,
} from '../src/arena-v2-collection-fallback-semantic-source-candidate-v1.js';

describe('Arena V2 A6.18 collection fallback semantic source candidate V1', () => {
  it('只读投影既有20武器、2地图和20段体验身份', () => {
    const source = ARENA_V2_COLLECTION_FALLBACK_SEMANTIC_SOURCE_CANDIDATE_V1;
    expect(source.weapons).toHaveLength(20);
    expect(source.maps).toHaveLength(2);
    expect(source.maps.map(({ segmentCount }) => segmentCount)).toEqual([12, 8]);
    expect(source.maps.map(({ routeRhythm }) => routeRhythm.length)).toEqual([12, 8]);
    expect(source.maps.flatMap(({ routeRhythm }) => routeRhythm)).toHaveLength(20);
    expect(new Set(source.weapons.map(({ weaponDefinitionId }) => weaponDefinitionId)).size)
      .toBe(20);
    expect(new Set(source.maps.map(({ mapDefinitionId }) => mapDefinitionId)).size).toBe(2);
    expect(source.grantsAssetApproval).toBe(false);
    expect(source.readsRulesAtRenderTime).toBe(false);
    expect(source.implementationStatus).toBe('code-written-not-run');
    expect(source.validationStatus).toBe('not-run');
  });

  it('保持深冻结和确定内容身份', () => {
    const source = ARENA_V2_COLLECTION_FALLBACK_SEMANTIC_SOURCE_CANDIDATE_V1;
    expect(Object.isFrozen(source)).toBe(true);
    expect(Object.isFrozen(source.weapons)).toBe(true);
    expect(Object.isFrozen(source.maps)).toBe(true);
    source.maps.forEach((map) => {
      expect(Object.isFrozen(map)).toBe(true);
      expect(Object.isFrozen(map.routeRhythm)).toBe(true);
      expect(Object.isFrozen(map.landmarkCues)).toBe(true);
      expect(Object.isFrozen(map.leadingLineCues)).toBe(true);
    });
    expect(source.contentHash).toMatch(/^[0-9a-f]{8}$/);
  });
});
