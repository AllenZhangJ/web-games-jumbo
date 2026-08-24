import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_KZ_ROUTE_GUIDANCE_SHAPE_IDS_CANDIDATE_V1,
  ARENA_V2_KZ_ROUTE_PRESENTATION_PROJECTION_CANDIDATE_V1 as CATALOG,
  ARENA_V2_KZ_ROUTE_RISK_SHAPE_IDS_CANDIDATE_V1,
  projectArenaV2KzRoutePresentationCandidateV1,
} from '../src/index.js';

const RACE_MODE_ID = 'arena-v2.mode.race.candidate.v1';
const SURVIVAL_MODE_ID = 'arena-v2.mode.survival.candidate.v1';

function participant(
  id: string,
  local: boolean,
  supportSurfaceId: string | null,
): Record<string, unknown> {
  return {
    id,
    characterDefinitionId: 'arena-v2.character.vanguard.candidate.v1',
    appearanceKey: local ? 'local' : 'remote',
    displayName: local ? '玩家' : '对手',
    identityOrdinal: local ? 1 : 2,
    identityGlyphKey: local ? 'solid-circle' : 'open-square',
    identityPatternKey: local ? 'single-stripe' : 'double-stripe',
    modeRole: 'competitor',
    local,
    status: 'active',
    lives: 1,
    position: { x: 0, y: 1, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    facing: { x: 1, z: 0 },
    grounded: supportSurfaceId !== null,
    supportSurfaceId,
    hitstunTicks: 0,
    invulnerableTicks: 0,
    respawnTicks: 0,
    action: { phase: 'idle' },
    movement: { phase: 'grounded' },
    equipment: null,
  };
}

function mapSnapshot(
  route: typeof ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
): Record<string, unknown> {
  const surfaceIds = route.segments.flatMap(({ surfaceIds }) => surfaceIds);
  return {
    schemaVersion: 1,
    definitionId: route.mapDefinitionId,
    nextActiveTick: 0,
    revision: 0,
    surfaces: surfaceIds.map((id) => ({ id, enabled: true, revision: 0 })),
    occurrences: [],
  };
}

function raceState(
  participantId = 'player-1',
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    kind: 'race',
    finishGateId: 'arena-v2-race-finish-gate',
    participants: [{
      participantId,
      status: 'racing',
      safeAnchorId: null,
      progressOrdinal: 0,
      respawnReadyTick: null,
      finishTick: null,
      rank: null,
      ...overrides,
    }],
  };
}

function scene(
  options: {
    route?: typeof ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2;
    modeDefinitionId?: string;
    modeState?: Record<string, unknown>;
    supportSurfaceId?: string | null;
    events?: readonly Record<string, unknown>[];
    tick?: number;
  } = {},
): Record<string, unknown> {
  const route = options.route ?? ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2;
  const modeDefinitionId = options.modeDefinitionId ?? RACE_MODE_ID;
  const supportSurfaceId = options.supportSurfaceId === undefined
    ? route.segments[0]!.surfaceIds[0]!
    : options.supportSurfaceId;
  const events = options.events ?? [];
  return {
    schemaVersion: 1,
    status: 'production-unreachable',
    source: {
      matchSeed: 7,
      tick: options.tick ?? 100,
      eventSequence: events.length,
      modeDefinitionId,
      mapDefinitionId: route.mapDefinitionId,
    },
    world: {
      phase: 'running',
      remainingTicks: 10_000,
      map: mapSnapshot(route),
      participants: [participant('player-1', true, supportSurfaceId)],
      equipment: [],
      activeSupplyProjection: null,
      modeProjection: {
        schemaVersion: 1,
        modeDefinitionId,
        revision: 1,
        preparationRemainingTicks: null,
        state: options.modeState ?? raceState(),
      },
    },
    localAction: { participantId: 'player-1' },
    localParticipantId: 'player-1',
    events,
    result: null,
  };
}

function project(value: Record<string, unknown>) {
  return projectArenaV2KzRoutePresentationCandidateV1({ schemaVersion: 1, scene: value });
}

function participantFell(sequence: number, tick: number): Record<string, unknown> {
  return {
    id: `fell-${sequence}`,
    sequence,
    tick,
    type: 'ParticipantFell',
    modeDefinitionId: RACE_MODE_ID,
    participantId: 'player-1',
    modeRole: 'competitor',
    slotId: null,
    slotGeneration: 0,
    fallCause: 'movement',
    creditedAttackerId: null,
    supportSurfaceId: 'kz-s01-start',
  };
}

describe('Arena V2 KZ route presentation projection candidate V1 (not run)', () => {
  it('projects an exact support surface into one renderer-neutral segment without position inference', () => {
    expect(ARENA_V2_KZ_ROUTE_GUIDANCE_SHAPE_IDS_CANDIDATE_V1).toEqual([
      'stable-platform', 'broken-gap', 'rising-steps',
      'branch-diamond', 'narrow-rail', 'balance-line',
    ]);
    expect(ARENA_V2_KZ_ROUTE_RISK_SHAPE_IDS_CANDIDATE_V1).toEqual([
      'solid-safe', 'striped-pressure', 'forked-choice', 'open-recovery',
    ]);
    expect(Object.isFrozen(ARENA_V2_KZ_ROUTE_GUIDANCE_SHAPE_IDS_CANDIDATE_V1)).toBe(true);
    expect(Object.isFrozen(ARENA_V2_KZ_ROUTE_RISK_SHAPE_IDS_CANDIDATE_V1)).toBe(true);
    const output = project(scene({ supportSurfaceId: 'kz-s04-fast-a' }));
    expect(output.route).toMatchObject({
      routeDefinitionId: ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.id,
      mapDefinitionId: ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.mapDefinitionId,
      segmentCount: 12,
      environmentIdentity: 'cool-linear-depth',
      mapAssetMaturity: 'authored-candidate-not-approved',
    });
    expect(output.route.segmentShapeCatalog).toHaveLength(12);
    expect(output.route.segmentShapeCatalog[3]).toEqual({
      segmentId: 'kz-segment-04-maze',
      ordinal: 4,
      landmarkSurfaceId: 'kz-s03-stair-c',
      guidanceShape: 'branch-diamond',
      riskShape: 'forked-choice',
      colorIsNeverSoleSignal: true,
    });
    expect(output.route.segmentShapeCatalog.every(Object.isFrozen)).toBe(true);
    expect(output.local.currentSegment).toMatchObject({
      id: 'kz-segment-04-maze',
      ordinal: 4,
      kind: 'maze',
      currentBranchId: 'kz-branch-maze-fast',
      pacingArc: 'two-cycle-branch-escalation',
      cycleOrdinal: 1,
      experienceBeat: 'twist',
      experienceIntensity: 3,
      landmarkCue: 'route-fork',
      leadingLineCue: 'split-chevron',
      memoryHook: 'first-safe-fast-choice',
      colorIsNeverSoleSignal: true,
      guidanceShape: 'branch-diamond',
      riskShape: 'forked-choice',
    });
    expect(output.governance).toMatchObject({
      ownsRuleOrMatchAuthority: false,
      infersCurrentSegmentFromPosition: false,
      currentSegmentUsesExactSupportSurfaceOnly: true,
      cuesUseStableEventsOnly: true,
      importsThreeOrDom: false,
    });
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.local.currentSegment)).toBe(true);
  });

  it('keeps an airborne player segmentless instead of guessing the nearest route surface', () => {
    const output = project(scene({ supportSurfaceId: null }));
    expect(output.local).toMatchObject({
      grounded: false,
      supportSurfaceId: null,
      currentSegment: null,
    });
  });

  it('projects stable race events into distinct support, reentry and anchor shapes', () => {
    const events = [
      {
        id: 'safe-0', sequence: 0, tick: 70, type: 'RaceSafeAnchorCommitted',
        modeDefinitionId: RACE_MODE_ID, participantId: 'player-1',
        anchorId: 'kz-a-s01-exit', progressOrdinal: 1,
      },
      participantFell(1, 71),
      {
        id: 'respawn-2', sequence: 2, tick: 72, type: 'ParticipantRespawnScheduled',
        modeDefinitionId: RACE_MODE_ID, participantId: 'player-1', modeRole: 'competitor',
        slotId: null, slotGeneration: 0, readyTick: 252,
        anchorId: 'kz-a-s01-exit', reason: 'race-fall',
      },
    ];
    const output = project(scene({
      events,
      modeState: raceState('player-1', {
        status: 'respawning',
        safeAnchorId: 'kz-a-s01-exit',
        progressOrdinal: 1,
        respawnReadyTick: 252,
      }),
    }));
    expect(output.mode).toMatchObject({
      kind: 'race', status: 'respawning', safeAnchorId: 'kz-a-s01-exit',
      progressOrdinal: 1, respawnReadyTick: 252,
    });
    expect(output.cues.map(({ kind, shape }) => ({ kind, shape }))).toEqual([
      { kind: 'safe-anchor-committed', shape: 'small-return-anchor' },
      { kind: 'support-lost', shape: 'broken-down-line' },
      { kind: 'respawn-scheduled', shape: 'open-reentry-arch' },
    ]);
    expect(new Set(output.cues.map(({ sourceEventId }) => sourceEventId)).size).toBe(3);
    expect(output.cues.every(({ colorIsNeverSoleSignal }) => colorIsNeverSoleSignal)).toBe(true);
  });

  it('uses the same adapter for the switchback survival map and keeps fall count authoritative', () => {
    const route = ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2;
    const output = project(scene({
      route,
      modeDefinitionId: SURVIVAL_MODE_ID,
      supportSurfaceId: 'ks-s05-west-wire',
      modeState: {
        kind: 'survival',
        playerParticipantId: 'player-1',
        fallCount: 1,
        terminalFallCount: 2,
        survivedTicks: 1_800,
        pressureStage: 4,
        enemySlots: [],
      },
      events: [{
        id: 'survival-fall-0', sequence: 0, tick: 90,
        type: 'SurvivalPlayerFallCounted', modeDefinitionId: SURVIVAL_MODE_ID,
        participantId: 'player-1', fallCount: 1, terminalFallCount: 2, terminal: false,
      }],
    }));
    expect(output.route).toMatchObject({
      routeDefinitionId: route.id,
      segmentCount: 8,
      environmentIdentity: 'warm-cardinal-turns',
    });
    expect(output.route.segmentShapeCatalog).toHaveLength(8);
    expect(output.local.currentSegment).toMatchObject({
      id: 'ks-segment-05-west-wire', ordinal: 5,
      pacingArc: 'cardinal-switchback-sawtooth',
      cycleOrdinal: 1,
      experienceBeat: 'climax', experienceIntensity: 5,
      landmarkCue: 'reversal-wire', leadingLineCue: 'north-to-west-line',
      guidanceShape: 'balance-line', riskShape: 'striped-pressure',
    });
    expect(output.mode).toEqual({
      kind: 'survival', fallCount: 1, terminalFallCount: 2,
      survivedTicks: 1_800, pressureStage: 4,
    });
    expect(output.cues[0]).toMatchObject({
      kind: 'survival-fall-counted', fallCount: 1, terminal: false,
      shape: 'single-open-fall-ring',
    });
  });

  it('fails closed on widened input, map drift, disabled routes and forged authority fields', () => {
    expect(() => projectArenaV2KzRoutePresentationCandidateV1({
      schemaVersion: 1,
      scene: scene(),
      inferredNearestSurfaceId: 'kz-s01-start',
    })).toThrow(/不支持字段/);

    const mapDrift = scene();
    (mapDrift.source as Record<string, unknown>).mapDefinitionId = 'foreign-map';
    expect(() => project(mapDrift)).toThrow(/无法唯一解析地图/);

    const disabled = scene();
    const disabledMap = (disabled.world as Record<string, unknown>).map as Record<string, unknown>;
    const surfaces = disabledMap.surfaces as Record<string, unknown>[];
    surfaces[0]!.enabled = false;
    expect(() => project(disabled)).toThrow(/不允许关闭Surface/);

    const forgedRace = scene({
      modeState: raceState('player-1', {
        status: 'racing',
        finishTick: 99,
        rank: null,
      }),
    });
    expect(() => project(forgedRace)).toThrow(/状态与重入\/完赛字段不闭合/);

    const forgedAnchor = scene({
      events: [{
        id: 'safe-0', sequence: 0, tick: 90, type: 'RaceSafeAnchorCommitted',
        modeDefinitionId: RACE_MODE_ID, participantId: 'player-1',
        anchorId: 'foreign-anchor', progressOrdinal: 1,
      }],
    });
    expect(() => project(forgedAnchor)).toThrow(/未知路线锚点/);
  });

  it('bounds one-frame route cues and rejects duplicate or out-of-order authority identity', () => {
    const tooManyEvents = Array.from({ length: 33 }, (_, sequence) => (
      participantFell(sequence, 100)
    ));
    expect(() => project(scene({ events: tooManyEvents, tick: 200 }))).toThrow(/不能超过32条/);

    const outOfOrder = [participantFell(1, 80), participantFell(0, 81)];
    expect(() => project(scene({ events: outOfOrder }))).toThrow(/sequence严格递增/);

    const futureEvent = [participantFell(0, 100)];
    expect(() => project(scene({ events: futureEvent, tick: 100 }))).toThrow(/超出post-step Frame水位/);
    expect(CATALOG).toMatchObject({
      hardGate: false,
      defaultCompositionWired: false,
      defaultSurfaceWired: false,
      supportedMapCount: 2,
      maximumRouteCuesPerFrame: 32,
      guidanceShapeCount: 6,
      riskShapeCount: 4,
      formalMapAssetsApproved: false,
      validationStatus: 'not-run',
    });
  });
});
