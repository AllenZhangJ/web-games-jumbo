import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_GRAMMAR_IDS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_KZ_ROUTE_THREE_CHAPTER_LANDMARK_LANGUAGE_CANDIDATE_V1 as CATALOG,
  resolveArenaV2KzRouteThreeChapterLandmarkLanguageCandidateV1,
} from '../src/index.js';

describe('Arena V2 KZ route Three chapter landmark language candidate V1 (not run)', () => {
  it('provides ten unique static non-color geometry signatures', () => {
    const signatures = new Set<string>();
    for (const landmarkGrammar of ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_GRAMMAR_IDS_CANDIDATE_V1) {
      for (const chapterBoundary of [false, true]) {
        const output = resolveArenaV2KzRouteThreeChapterLandmarkLanguageCandidateV1({
          landmarkGrammar,
          chapterBoundary,
        });
        signatures.add(JSON.stringify(output.transform));
        expect(output).toMatchObject({
          schemaVersion: 1,
          landmarkGrammar,
          chapterBoundary,
          colorIsNeverSoleSignal: true,
        });
        expect(Object.isFrozen(output)).toBe(true);
        expect(Object.isFrozen(output.transform)).toBe(true);
      }
    }
    expect(signatures.size).toBe(10);
    expect(CATALOG).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      landmarkGrammarCount: 5,
      chapterBoundaryVariantCount: 2,
      exactTransformCount: 10,
      usesExistingAuthoredSegmentEntryCueOnly: true,
      createsGeometryMaterialsTexturesOrDrawCalls: false,
      changesParentPositionCollisionRouteOrAuthority: false,
      usesColorAsSoleSignal: false,
      usesWallClockRandomOrAnimation: false,
      defaultEntryWired: false,
    });
  });

  it('makes a chapter boundary uniformly stronger without changing its direction grammar', () => {
    for (const landmarkGrammar of ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_GRAMMAR_IDS_CANDIDATE_V1) {
      const member = resolveArenaV2KzRouteThreeChapterLandmarkLanguageCandidateV1({
        landmarkGrammar,
        chapterBoundary: false,
      });
      const boundary = resolveArenaV2KzRouteThreeChapterLandmarkLanguageCandidateV1({
        landmarkGrammar,
        chapterBoundary: true,
      });
      expect(boundary.transform.scaleX / member.transform.scaleX).toBeCloseTo(1.04);
      expect(boundary.transform.scaleY / member.transform.scaleY).toBeCloseTo(1.04);
      expect(boundary.transform.scaleZ / member.transform.scaleZ).toBeCloseTo(1.04);
      expect(boundary.transform.rotationXRadians).toBe(member.transform.rotationXRadians);
      expect(boundary.transform.rotationYRadians).toBe(member.transform.rotationYRadians);
      expect(boundary.transform.rotationZRadians).toBe(member.transform.rotationZRadians);
    }
  });

  it('rejects future, accessor, symbol and unknown grammar inputs', () => {
    expect(() => resolveArenaV2KzRouteThreeChapterLandmarkLanguageCandidateV1({
      landmarkGrammar: 'future-landmark',
      chapterBoundary: false,
    })).toThrow(/未知章节地标语法/);
    expect(() => resolveArenaV2KzRouteThreeChapterLandmarkLanguageCandidateV1({
      landmarkGrammar: 'open-runway-frame',
      chapterBoundary: false,
      futureField: true,
    })).toThrow(/未知字段/);
    const accessor = { landmarkGrammar: 'open-runway-frame' } as Record<string, unknown>;
    Object.defineProperty(accessor, 'chapterBoundary', {
      enumerable: true,
      get: () => false,
    });
    expect(() => resolveArenaV2KzRouteThreeChapterLandmarkLanguageCandidateV1(accessor))
      .toThrow(/可枚举数据字段/);
    expect(() => resolveArenaV2KzRouteThreeChapterLandmarkLanguageCandidateV1({
      landmarkGrammar: 'open-runway-frame',
      chapterBoundary: false,
      [Symbol('hostile')]: true,
    })).toThrow(/Symbol/);
  });
});
