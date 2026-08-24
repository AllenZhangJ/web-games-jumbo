import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_CATALOG_CANDIDATE_V1 as CATALOG,
  ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_MAPS_CANDIDATE_V1,
  resolveArenaV2KzRouteChapterLandmarkMapCandidateV1,
} from '../src/index.js';

function inputFor(index: number): Record<string, unknown> {
  const map = ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_MAPS_CANDIDATE_V1[index]!;
  return {
    mapDefinitionId: map.mapDefinitionId,
    routeDefinitionId: map.routeDefinitionId,
    routeContentHash: map.routeContentHash,
    mapExperienceCatalogContentHash: map.mapExperienceCatalogContentHash,
    segmentIds: [...map.segmentIds],
  };
}

describe('Arena V2 KZ route chapter landmark catalog candidate V1 (not run)', () => {
  it('closes two formal routes into eight ordered chapters and 12/8 segments', () => {
    expect(CATALOG).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      mapCount: 2,
      chapterCount: 8,
      chapterCountPerMap: 4,
      segmentCount: 20,
      segmentCountsByMap: [12, 8],
      usesDefinitionAndExperienceOrdinalOnly: true,
      readsPlayerRuntimeOrFutureState: false,
      changesRouteOrAuthority: false,
      defaultEntryWired: false,
    });
    expect(ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_MAPS_CANDIDATE_V1).toHaveLength(2);
    expect(ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_MAPS_CANDIDATE_V1.map((map) => (
      map.chapters.map(({ segmentIds }) => segmentIds.length)
    ))).toEqual([[3, 3, 3, 3], [2, 2, 2, 2]]);
    expect(ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_MAPS_CANDIDATE_V1.map((map) => (
      map.chapters.map(({ chapterBoundarySegmentId }) => chapterBoundarySegmentId)
    ))).toEqual([
      ['kz-segment-01-platform', 'kz-segment-04-maze', 'kz-segment-07-breather', 'kz-segment-10-gap'],
      ['ks-segment-01-platform', 'ks-segment-03-rising-stairs', 'ks-segment-05-west-wire', 'ks-segment-07-north-gap'],
    ]);
    expect(new Set(ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_MAPS_CANDIDATE_V1.flatMap((map) => (
      map.chapters.map(({ chapterId }) => `${map.mapDefinitionId}\u0000${chapterId}`)
    ))).size).toBe(8);
    for (const map of ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_MAPS_CANDIDATE_V1) {
      expect(new Set(map.chapters.map(({ landmarkGrammar }) => landmarkGrammar)).size).toBe(4);
      expect(map.chapters.flatMap(({ segmentIds }) => segmentIds)).toEqual(map.segmentIds);
      expect(Object.isFrozen(map)).toBe(true);
      expect(Object.isFrozen(map.chapters)).toBe(true);
      expect(map.chapters.every(Object.isFrozen)).toBe(true);
    }
  });

  it('resolves only the exact Definition, experience catalog and ordered segment identity', () => {
    for (const index of [0, 1]) {
      const first = resolveArenaV2KzRouteChapterLandmarkMapCandidateV1(inputFor(index));
      const second = resolveArenaV2KzRouteChapterLandmarkMapCandidateV1(inputFor(index));
      expect(second).toEqual(first);
      expect(second?.contentHash).toBe(first?.contentHash);
    }
    expect(resolveArenaV2KzRouteChapterLandmarkMapCandidateV1({
      mapDefinitionId: 'test-map',
      routeDefinitionId: 'test-route',
      routeContentHash: 'test-route-hash',
      mapExperienceCatalogContentHash: 'test-experience-hash',
      segmentIds: ['test-segment'],
    })).toBeNull();
  });

  it('fails closed on coherent drift, partial formal identity and hostile data', () => {
    const base = inputFor(0);
    const switchback = inputFor(1);
    expect(() => resolveArenaV2KzRouteChapterLandmarkMapCandidateV1({
      ...base,
      routeDefinitionId: switchback.routeDefinitionId,
    })).toThrow(/地图与路线身份漂移/);
    expect(() => resolveArenaV2KzRouteChapterLandmarkMapCandidateV1({
      ...base,
      routeContentHash: 'forged',
    })).toThrow(/来源Definition或体验目录身份漂移/);
    expect(() => resolveArenaV2KzRouteChapterLandmarkMapCandidateV1({
      ...base,
      segmentIds: [...(base.segmentIds as string[])].reverse(),
    })).toThrow(/来源Definition或体验目录身份漂移/);
    expect(() => resolveArenaV2KzRouteChapterLandmarkMapCandidateV1({
      ...base,
      futureField: true,
    })).toThrow(/未知字段/);
    const accessor = { ...base };
    Object.defineProperty(accessor, 'routeContentHash', {
      enumerable: true,
      get: () => base.routeContentHash,
    });
    expect(() => resolveArenaV2KzRouteChapterLandmarkMapCandidateV1(accessor))
      .toThrow(/可枚举数据字段/);
    expect(() => resolveArenaV2KzRouteChapterLandmarkMapCandidateV1({
      ...base,
      [Symbol('hostile')]: true,
    })).toThrow(/Symbol/);
  });
});
