import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  isArenaV2WeaponSituationOpportunityCandidateV1,
} from '../src/index.js';

describe('Arena V2 information content read catalog candidate V1', () => {
  it('owns the single route-segment-kind to weapon-situation mapping', () => {
    expect(isArenaV2WeaponSituationOpportunityCandidateV1('narrow-path', 'edge')).toBe(true);
    expect(isArenaV2WeaponSituationOpportunityCandidateV1(
      'narrow-path',
      'narrow-path',
    )).toBe(true);
    expect(isArenaV2WeaponSituationOpportunityCandidateV1(
      'basic-platform',
      'open-platform',
    )).toBe(true);
    expect(isArenaV2WeaponSituationOpportunityCandidateV1('stairs', 'gap')).toBe(false);
  });

  it('closes all 20 weapons without introducing a new input or authority action', () => {
    const catalog = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1;
    expect(catalog).toMatchObject({
      status: 'production-unreachable',
      hardGate: false,
      defaultSurfaceWired: false,
      formalVisualAssetsReady: false,
      ownerId: 'p5-content',
      weaponCount: 20,
    });
    expect(catalog.weapons.map(({ weaponDefinitionId }) => weaponDefinitionId)).toEqual(
      ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(({ equipment }) => equipment.id),
    );
    expect(catalog.weapons.flatMap(({ actions }) => actions)).toHaveLength(40);
    for (const weapon of catalog.weapons) {
      expect(weapon.actions.map(({ context }) => context)).toEqual(['ground', 'aerial']);
      expect(weapon.modeConsequences.map(({ modeKind }) => modeKind)).toEqual([
        'duel', 'race', 'survival',
      ]);
      expect(weapon.actions.every(({ range, coverageValue }) => (
        range > 0 && Number.isFinite(range)
          && Number.isFinite(coverageValue)
      ))).toBe(true);
      expect(weapon.actions.every(({ primaryGesture, commitment }) => (
        (primaryGesture === 'press' && commitment === null)
        || (primaryGesture === 'hold-release' && commitment !== null)
      ))).toBe(true);
    }
    expect(catalog.weapons.filter(({ actions }) => (
      actions.some(({ primaryGesture }) => primaryGesture === 'hold-release')
    )).map(({ catalogId }) => catalogId)).toEqual(['read-counter', 'commitment-fist']);
  });

  it('closes the 12-segment KZ route with one read entry and supply per segment', () => {
    const map = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps[0]!;
    expect(map.mapDefinitionId).toBe(
      ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.mapDefinitionId,
    );
    expect(map.segments.map(({ segmentDefinitionId }) => segmentDefinitionId)).toEqual(
      ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.segments.map(({ id }) => id),
    );
    expect(map.segments.map(({ ordinal }) => ordinal)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    );
    expect(new Set(map.segments.map(({ supplyPointId }) => supplyPointId)).size).toBe(12);
    expect(map.segments.map(({ experienceBeat }) => experienceBeat)).toEqual([
      'introduce', 'develop', 'develop', 'twist', 'test', 'climax',
      'release', 'develop', 'twist', 'test', 'test', 'climax',
    ]);
    expect(map.segments.map(({ experienceIntensity }) => experienceIntensity)).toEqual([
      1, 2, 2, 3, 4, 5, 1, 3, 4, 4, 5, 5,
    ]);
    expect(map.weaponSituationOpportunityCounts).toEqual([
      {
        situation: 'edge',
        segmentCount: 6,
        exampleSegment: {
          segmentDefinitionId: 'kz-segment-02-gap',
          ordinal: 2,
          nameMessageId: 'arena.v2.map.kz-base.segment-02.name',
        },
      },
      {
        situation: 'narrow-path',
        segmentCount: 2,
        exampleSegment: {
          segmentDefinitionId: 'kz-segment-05-narrow',
          ordinal: 5,
          nameMessageId: 'arena.v2.map.kz-base.segment-05.name',
        },
      },
      {
        situation: 'height-transition',
        segmentCount: 2,
        exampleSegment: {
          segmentDefinitionId: 'kz-segment-03-stairs',
          ordinal: 3,
          nameMessageId: 'arena.v2.map.kz-base.segment-03.name',
        },
      },
      {
        situation: 'platform-entry',
        segmentCount: 4,
        exampleSegment: {
          segmentDefinitionId: 'kz-segment-01-platform',
          ordinal: 1,
          nameMessageId: 'arena.v2.map.kz-base.segment-01.name',
        },
      },
      {
        situation: 'gap',
        segmentCount: 2,
        exampleSegment: {
          segmentDefinitionId: 'kz-segment-02-gap',
          ordinal: 2,
          nameMessageId: 'arena.v2.map.kz-base.segment-02.name',
        },
      },
      {
        situation: 'open-platform',
        segmentCount: 2,
        exampleSegment: {
          segmentDefinitionId: 'kz-segment-01-platform',
          ordinal: 1,
          nameMessageId: 'arena.v2.map.kz-base.segment-01.name',
        },
      },
    ]);
  });
});
