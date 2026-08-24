import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
  ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1,
  ARENA_V2_LEARNING_PROFILE_CANDIDATE_V1,
  ARENA_V2_MAP_ROUTE_VARIETY_AUDIT_CANDIDATE_V1,
} from '../src/index.js';

describe('Arena V2 map route variety and learning coverage candidates', () => {
  it('projects two maps and twenty segments without claiming dynamic balance', () => {
    const audit = ARENA_V2_MAP_ROUTE_VARIETY_AUDIT_CANDIDATE_V1;
    expect(audit).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      hardGate: false,
      validationStatus: 'not-run',
      mapCount: 2,
      segmentCount: 20,
      inputChannelsRemainDirectionAndJumpOnly: true,
      mutatesRouteDefinitions: false,
      producesAutomaticTuning: false,
      provesRouteBalance: false,
      requiresDynamicRaceAndSurvivalEvidence: true,
      hasRouteVarietyFingerprintCollision: false,
    });
    const segments = audit.maps.flatMap(({ segments: mapSegments }) => mapSegments);
    expect(segments).toHaveLength(20);
    expect(new Set(segments.map(({ mapDefinitionId, segmentId }) => (
      `${mapDefinitionId}:${segmentId}`
    ))).size).toBe(20);
    expect(audit.findings.every((finding) => (
      !finding.provesPlayerDominantRoute && finding.requiresDynamicRaceAndSurvivalEvidence
    ))).toBe(true);
  });

  it('keeps the authored switchback branch gap and longitudinal concentration reviewable', () => {
    const base = ARENA_V2_MAP_ROUTE_VARIETY_AUDIT_CANDIDATE_V1.maps.find(
      ({ mapDefinitionId }) => mapDefinitionId === ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
    );
    const switchback = ARENA_V2_MAP_ROUTE_VARIETY_AUDIT_CANDIDATE_V1.maps.find(
      ({ mapDefinitionId }) => mapDefinitionId === ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
    );
    expect(base?.findings.some(({ code }) => code === 'heading-concentration-review')).toBe(true);
    expect(switchback?.findings.some(({ code }) => code === 'no-authored-branch-choice'))
      .toBe(true);
  });

  it('covers every weapon and every map segment with one existing-type challenge', () => {
    const definition = ARENA_V2_LEARNING_PROFILE_CANDIDATE_V1.definition;
    expect(definition.contentVersion).toBe(5);
    expect(definition.challengeDefinitions).toHaveLength(20);
    expect(new Set(definition.challengeDefinitions.map(({ weaponDefinitionId }) => (
      weaponDefinitionId
    )))).toEqual(new Set(definition.weaponDefinitionIds));
    const expectedSegments = new Set(definition.mapDefinitions.flatMap((map) => (
      map.segmentDefinitionIds.map((segmentDefinitionId) => (
        `${map.mapDefinitionId}:${segmentDefinitionId}`
      ))
    )));
    const challengeSegments = new Set(definition.challengeDefinitions.map((challenge) => (
      `${challenge.mapDefinitionId}:${challenge.segmentDefinitionId}`
    )));
    expect(challengeSegments).toEqual(expectedSegments);
    expect(definition.challengeDefinitions.slice(16).every((challenge) => (
      challenge.modeDefinitionId === ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.race
      && challenge.targetProgress === 3
    ))).toBe(true);
  });
});
