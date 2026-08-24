import { describe, expect, it } from 'vitest';
import {
  KzRaceModeMapAdapterV1,
  createKzSurvivalRouteTargetProjectionV1,
} from '@number-strategy-jump/arena-match';
import { ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2 } from '../src/index.js';
import { ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1 } from '../src/index.js';

function raceAdapter() {
  return new KzRaceModeMapAdapterV1({
    routeDefinition: ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
    participantIds: ['racer-2', 'racer-1'],
  });
}

describe('KzModeMapAdapterV1', () => {
  it('projects current support/fall/finish facts without writing Race state', () => {
    const adapter = raceAdapter();
    const facts = adapter.createTickFacts({
      tick: 60,
      activeTick: 0,
      preparationRemainingTicks: 0,
      participants: [{
        participantId: 'racer-2',
        supportSurfaceId: 'kz-s12-finish',
        fell: false,
        finishGateCrossed: true,
      }, {
        participantId: 'racer-1',
        supportSurfaceId: 'kz-s03-stair-b',
        fell: false,
        finishGateCrossed: false,
      }],
    });
    expect(facts.safeAnchorClaims).toEqual([{ participantId: 'racer-1', anchorId: 'kz-a-s02-exit', progressOrdinal: 3 }, {
      participantId: 'racer-2', anchorId: 'kz-a-s11-exit', progressOrdinal: 12,
    }]);
    expect(facts.finishClaims).toEqual([{
      participantId: 'racer-2',
      finishGateId: adapter.finishGateId,
      progressOrdinal: 13,
    }]);
    expect(adapter.createInitialSafeAnchors()).toEqual([
      { participantId: 'racer-1', anchorId: 'kz-a-start-1' },
      { participantId: 'racer-2', anchorId: 'kz-a-start-2' },
    ]);
    expect(adapter.createTickFacts({
      tick: 60,
      activeTick: 0,
      preparationRemainingTicks: 0,
      participants: [{
        participantId: 'racer-1',
        supportSurfaceId: 'kz-s01-start',
        fell: false,
        finishGateCrossed: false,
      }, {
        participantId: 'racer-2',
        supportSurfaceId: 'kz-s01-start',
        fell: false,
        finishGateCrossed: false,
      }],
    }).safeAnchorClaims).toEqual([
      { participantId: 'racer-1', anchorId: 'kz-a-start-1', progressOrdinal: 1 },
      { participantId: 'racer-2', anchorId: 'kz-a-start-2', progressOrdinal: 1 },
    ]);
    expect(adapter.fallbackSafeAnchorId).toBe(
      ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.anchorCapabilityId,
    );
  });

  it('rejects preparation facts, unknown surfaces and fall/finish ambiguity', () => {
    const adapter = raceAdapter();
    expect(() => adapter.createTickFacts({
      tick: 0,
      activeTick: 0,
      preparationRemainingTicks: 60,
      participants: ['racer-1', 'racer-2'].map((participantId) => ({
        participantId, supportSurfaceId: 'kz-s01-start', fell: false, finishGateCrossed: false,
      })),
    })).toThrow(/准备期|时间线/);
    expect(() => adapter.createTickFacts({
      tick: 60,
      activeTick: 0,
      preparationRemainingTicks: 0,
      participants: [{
        participantId: 'racer-1', supportSurfaceId: 'unknown', fell: false, finishGateCrossed: false,
      }, {
        participantId: 'racer-2', supportSurfaceId: 'kz-s01-start', fell: false, finishGateCrossed: false,
      }],
    })).toThrow(/不属于KZ route/);
  });

  it('projects only authority-declared current legal Survival transitions', () => {
    const targets = createKzSurvivalRouteTargetProjectionV1(
      ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
      {
        currentSegmentId: 'kz-segment-02-gap',
        playerSegmentId: 'kz-segment-03-stairs',
        legalTransitions: [{
          toSegmentId: 'kz-segment-03-stairs',
          anchorId: 'kz-a-s03-a',
          traversal: 'jump',
        }, {
          toSegmentId: 'kz-segment-01-platform',
          anchorId: 'kz-a-route-start',
          traversal: 'walk',
        }],
      },
    );
    expect(targets.map(({ intent, priority }) => ({ intent, priority }))).toEqual([
      { intent: 'pursuit', priority: 100 },
      { intent: 'recovery', priority: 45 },
    ]);
    expect(() => createKzSurvivalRouteTargetProjectionV1(
      ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
      {
        currentSegmentId: 'kz-segment-02-gap',
        playerSegmentId: null,
        legalTransitions: [{
          toSegmentId: 'kz-segment-12-wire',
          anchorId: 'kz-a-finish',
          traversal: 'walk',
        }],
      },
    )).toThrow(/不是当前route合法换线/);
  });

  it('marks legal route targets as pursuit while player and enemy share a segment', () => {
    const targets = createKzSurvivalRouteTargetProjectionV1(
      ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
      {
        currentSegmentId: 'kz-segment-02-gap',
        playerSegmentId: 'kz-segment-02-gap',
        legalTransitions: [{
          toSegmentId: 'kz-segment-03-stairs',
          anchorId: 'kz-a-s03-a',
          traversal: 'jump',
        }, {
          toSegmentId: 'kz-segment-01-platform',
          anchorId: 'kz-a-route-start',
          traversal: 'walk',
        }],
      },
    );
    expect(targets.every(({ intent, priority }) => (
      intent === 'pursuit' && priority === 100
    ))).toBe(true);
  });
});
