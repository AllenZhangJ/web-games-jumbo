import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_KZ_MAP_EXPERIENCE_CATALOG_CANDIDATE_V1 as CATALOG,
  ARENA_V2_KZ_MAP_EXPERIENCE_SEGMENTS_CANDIDATE_V1 as SEGMENTS,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
  requireArenaV2KzMapExperienceSegmentCandidateV1,
} from '../src/index.js';

describe('Arena V2 KZ map experience catalog candidate V1 (not run)', () => {
  it('covers both immutable routes in exact authored order', () => {
    for (const route of [
      ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
      ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
    ]) {
      const experiences = SEGMENTS.filter(({ mapDefinitionId }) => (
        mapDefinitionId === route.mapDefinitionId
      ));
      expect(experiences.map(({ segmentId }) => segmentId)).toEqual(
        route.segments.map(({ id }) => id),
      );
      expect(experiences.map(({ ordinal }) => ordinal)).toEqual(
        route.segments.map((_, index) => index + 1),
      );
      expect(experiences.every(({ landmarkAnchorId, landmarkSurfaceId }, index) => {
        const segment = route.segments[index]!;
        const entry = route.anchors.find(({ id }) => id === segment.entryAnchorId)!;
        return landmarkAnchorId === entry.id && landmarkSurfaceId === entry.surfaceId;
      })).toBe(true);
    }
  });

  it('defines sawtooth contrast, memory cues and no new gameplay surface', () => {
    for (const mapDefinitionId of new Set(SEGMENTS.map((segment) => segment.mapDefinitionId))) {
      const mapSegments = SEGMENTS.filter((segment) => (
        segment.mapDefinitionId === mapDefinitionId
      ));
      const beats = new Set(mapSegments.map(({ experienceBeat }) => experienceBeat));
      const intensities = new Set(mapSegments.map(({ experienceIntensity }) => (
        experienceIntensity
      )));
      expect([...beats]).toEqual(expect.arrayContaining([
        'introduce', 'develop', 'twist', 'test', 'release',
      ]));
      expect(intensities.has(1)).toBe(true);
      expect(intensities.has(5)).toBe(true);
      expect(mapSegments.every((segment) => (
        segment.landmarkCue.length > 0
        && segment.leadingLineCue.length > 0
        && segment.memoryHook.length > 0
        && segment.raceRead.length > 0
        && segment.survivalRead.length > 0
        && segment.usesExistingAuthoredSegmentEntryCue
        && !segment.requiresAuthoredGeometryChange
        && segment.colorIsNeverSoleSignal
      ))).toBe(true);
    }
    expect(new Set(SEGMENTS.map(({ contentHash }) => contentHash)).size).toBe(20);
  });

  it('resolves exact identities and remains unreachable from production content pools', () => {
    expect(requireArenaV2KzMapExperienceSegmentCandidateV1(
      ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.mapDefinitionId,
      'kz-segment-07-breather',
    )).toMatchObject({
      experienceBeat: 'release',
      experienceIntensity: 1,
      landmarkCue: 'reset-deck',
      memoryHook: 'mid-route-breath',
    });
    expect(() => requireArenaV2KzMapExperienceSegmentCandidateV1(
      'foreign-map',
      'foreign-segment',
    )).toThrow(/未知Arena V2地图体验段/);
    expect(CATALOG).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      hardGate: false,
      defaultContentPoolWired: false,
      mapCount: 2,
      segmentCount: 20,
      inputChannelsRemainDirectionAndJumpOnly: true,
      changesCollisionOrAuthority: false,
      requiresDynamicPresentationGeometry: false,
      validationStatus: 'not-run',
    });
  });
});
