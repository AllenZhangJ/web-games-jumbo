import { describe, expect, it } from 'vitest';
import { createMatchContentSelectionV2 } from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2ModeHudValidatedPresentationHostV1,
  ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1,
  createArenaV2ModeHudValidatedStepProjectionV1,
} from '../src/index.js';

const HEAVY_HAMMER_GROUND_ACTION =
  'arena-v2.action.heavy-hammer.ground.candidate.v1';

function participant(id: string) {
  return {
    id,
    characterDefinitionId: `fighter-${id}`,
    status: 'active',
    lives: 3,
    eliminations: 0,
    deaths: 0,
    hitstunTicks: 0,
    invulnerableTicks: 0,
    respawnTicks: 0,
    lastHitBy: null,
    lastHitTick: -1,
    action: { definitionId: null, phase: 'idle', ticksRemaining: 0 },
    actionRule: null,
    movement: {
      schemaVersion: 2,
      participantId: id,
      characterDefinitionId: `fighter-${id}`,
      mode: 'standard',
      coyoteTicksRemaining: 0,
      jumpBufferTicksRemaining: 0,
      airJumpsUsed: 0,
      crouchChargeTicks: 0,
      crouchActionId: null,
      downSmashActionId: null,
      revision: 0,
      grounded: true,
    },
    equipment: null,
    position: { x: id === 'p1' ? 0 : 1, y: 1, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    facing: { x: id === 'p1' ? 1 : -1, z: 0 },
    grounded: true,
    supportSurfaceId: 'main',
  };
}

function publicMatchInfo(mapDefinitionId = 'arena-v2-kz-base-map.candidate.v1') {
  return {
    schemaVersion: 2,
    modeDefinitionId: 'mode.duel.test.v1',
    matchSeed: 7,
    localParticipantId: 'p1',
    content: createMatchContentSelectionV2({
      schemaVersion: 2,
      modeDefinitionId: 'mode.duel.test.v1',
      contentDefinitionId: 'content.duel.test.v1',
      contentVersion: 1,
      characterDefinitionIds: ['fighter-p1', 'fighter-p2'],
      equipmentDefinitionIds: [],
      mapDefinitionIds: [mapDefinitionId],
      selectedMapDefinitionId: mapDefinitionId,
      participantCharacters: [
        { participantId: 'p1', definitionId: 'fighter-p1' },
        { participantId: 'p2', definitionId: 'fighter-p2' },
      ],
    }),
    participantAssignments: [
      {
        participantId: 'p1', modeRole: 'competitor', teamId: null,
        slotId: null, slotGeneration: 0,
      },
      {
        participantId: 'p2', modeRole: 'competitor', teamId: null,
        slotId: null, slotGeneration: 0,
      },
    ],
    publicParticipants: [
      {
        participantId: 'p1', displayName: '玩家1', portraitKey: 'portrait.1',
        appearanceKey: 'appearance.1', identityOrdinal: 1, identityGlyphKey: 'glyph.1',
        identityPatternKey: 'pattern.1',
      },
      {
        participantId: 'p2', displayName: '玩家2', portraitKey: 'portrait.2',
        appearanceKey: 'appearance.2', identityOrdinal: 2, identityGlyphKey: 'glyph.2',
        identityPatternKey: 'pattern.2',
      },
    ],
  };
}

function projectionInput(
  tick: number,
  eventSequence: number,
  events: readonly unknown[],
  weaponFeedbackDirectionFactsV2: readonly unknown[] = [],
  mapDefinitionId = 'arena-v2-kz-base-map.candidate.v1',
) {
  const participants = [participant('p1'), participant('p2')];
  return {
    events,
    supplyCues: [],
    supplyCadence: null,
    localJumpAvailability: {
      schemaVersion: 1,
      tick,
      eventSequence,
      participantId: 'p1',
      canMove: true,
      canGroundJump: true,
      canAirJump: false,
      state: 'ready',
    },
    weaponFeedbackDirectionFactsV2,
    readFrameAudit: {
      worldSupplyEquipmentInstanceIds: [],
      expectedWorldSupplyIdentities: [],
    },
    publicMatchInfo: publicMatchInfo(mapDefinitionId),
    readFrame: {
      schemaVersion: 3,
      worldSnapshot: {
        authoritySchemaVersion: 6,
        physicsBackendVersion: 'lightweight-v3',
        configHash: 'deadbeef',
        ruleContentHash: 'c0ffee00',
        matchSeed: 7,
        tick,
        activeTick: tick,
        phase: 'running',
        remainingTicks: 900 - tick,
        eventSequence,
        modeDefinitionId: 'mode.duel.test.v1',
        participants,
        equipment: [],
        activeSupplyProjection: null,
        modeProjection: {
          schemaVersion: 1,
          modeDefinitionId: 'mode.duel.test.v1',
          revision: tick,
          preparationRemainingTicks: null,
          state: { kind: 'duel', suddenDeath: false },
        },
        map: {
          schemaVersion: 1,
          definitionId: mapDefinitionId,
          nextActiveTick: tick + 3,
          revision: tick,
          surfaces: [{ id: 'main', enabled: true, revision: 0 }],
          occurrences: [],
        },
        result: null,
      },
      localActionSidecar: {
        schemaVersion: 3,
        tick,
        eventSequence,
        participantId: 'p1',
        profile: 'local-context-primary',
        primaryActionDefinitionId: null,
        channels: {
          primary: {
            kind: 'none', actionDefinitionId: null, lane: null,
            source: null, reason: 'not-requested',
          },
          primaryHold: {
            kind: 'none', actionDefinitionId: null, lane: null,
            source: null, reason: 'not-requested',
          },
        },
      },
    },
  };
}

function feedbackEvent(sequence: number, tick: number) {
  return {
    id: `feedback-${sequence}`,
    sequence,
    tick,
    type: 'WeaponFeedbackResolved',
    kind: 'hit-confirm' as const,
    attackerId: 'p1',
    targetId: 'p2',
    actionDefinitionId: 'weapon-ground',
    actionStartedTick: tick,
    firstHitTick: tick,
    targetFallTick: null,
    initialSupportSurfaceId: 'main',
    finalSupportSurfaceId: 'main',
    fallCause: null,
    creditedAttackerId: null,
  };
}

function ringOutFeedbackEvent(sequence: number, tick: number) {
  return {
    id: `ring-out-feedback-${sequence}`,
    sequence,
    tick,
    type: 'WeaponFeedbackResolved',
    kind: 'hit-ring-out' as const,
    attackerId: 'p1',
    targetId: 'p2',
    actionDefinitionId: 'weapon-ground',
    actionStartedTick: tick - 2,
    firstHitTick: tick - 1,
    targetFallTick: tick,
    initialSupportSurfaceId: 'main',
    finalSupportSurfaceId: null,
    fallCause: 'credited-hit',
    creditedAttackerId: 'p1',
  };
}

function matchingParticipantFellEvent(sequence: number, tick: number) {
  return {
    id: `participant-fell-${sequence}`,
    sequence,
    tick,
    type: 'ParticipantFell',
    modeDefinitionId: 'mode.duel.test.v1',
    participantId: 'p2',
    modeRole: 'competitor',
    slotId: null,
    slotGeneration: 0,
    fallCause: 'credited-hit',
    creditedAttackerId: 'p1',
    supportSurfaceId: null,
  };
}

function feedbackDirectionFact(event: Readonly<{
  readonly id: string;
  readonly sequence: number;
  readonly tick: number;
  readonly kind: 'hit-confirm' | 'hit-ring-out';
}>) {
  return {
    schemaVersion: 2,
    feedbackEventId: event.id,
    feedbackTick: event.tick,
    feedbackSequence: event.sequence,
    feedbackKind: event.kind,
    resultDirection: {
      schemaVersion: 2,
      kind: 'authority-horizontal-impulse',
      sourceEventId: `knockback-${event.sequence}`,
      source: 'KnockbackApplied',
      worldDirection: { x: 1, z: 0 },
      horizontalImpulseMagnitude: 4,
    },
  };
}

function hostPorts() {
  const calls = { played: 0, presented: 0, cleared: 0, stopped: 0 };
  return {
    calls,
    options: {
      qualityTier: 'medium' as const,
      audio: {
        play() { calls.played += 1; },
        stopAll() { calls.stopped += 1; },
      },
      visual: {
        present() { calls.presented += 1; },
        presentDirectional() { calls.presented += 1; },
        remove() {},
        clear() { calls.cleared += 1; },
      },
    },
  };
}

describe('Arena V2 validated HUD presentation host V1', () => {
  it('requires the authority movement and jump capability at the final scene boundary', () => {
    const input = projectionInput(100, 0, []);
    const { localJumpAvailability: _omitted, ...withoutAvailability } = input;
    expect(() => createArenaV2ModeHudValidatedStepProjectionV1(
      withoutAvailability,
    )).toThrow(/缺少localJumpAvailability/);
    expect(() => createArenaV2ModeHudValidatedStepProjectionV1({
      ...input,
      localJumpAvailability: null,
    })).toThrow(/ArenaLocalJumpAvailabilityV1|必须是普通对象/);
    expect(() => createArenaV2ModeHudValidatedStepProjectionV1({
      ...input,
      localJumpAvailability: {
        ...input.localJumpAvailability,
        eventSequence: 1,
      },
    })).toThrow(/身份漂移/);
  });

  it('fails closed when public match content and the authority frame disagree on the map', () => {
    const input = projectionInput(100, 0, []);
    expect(() => createArenaV2ModeHudValidatedStepProjectionV1({
      ...input,
      publicMatchInfo: publicMatchInfo('map.duel.drifted.v1'),
    })).toThrow(/PublicMatchInfo内容地图身份与Frame不一致/);
  });

  it('fails closed when the duel authority map has no shared learning definition', () => {
    expect(() => createArenaV2ModeHudValidatedStepProjectionV1(
      projectionInput(100, 0, [], [], 'map.duel.unknown.v1'),
    )).toThrow(/1v1地图.*没有学习内容/);
  });

  it('only consumes canonical Frame V3/PublicInfo/V6 projections', () => {
    const ports = hostPorts();
    const host = new ArenaV2ModeHudValidatedPresentationHostV1(ports.options);
    const baseline = createArenaV2ModeHudValidatedStepProjectionV1(
      projectionInput(100, 0, []),
    );
    expect(baseline.getSnapshot()).toMatchObject({
      tick: 100,
      eventSequence: 0,
      sourceEventCount: 0,
      containsOneShotFacts: false,
    });
    host.beginEpoch({
      consumerEpochId: 'runtime-a',
      projection: baseline,
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const hit = feedbackEvent(0, 100);
    const next = createArenaV2ModeHudValidatedStepProjectionV1(
      projectionInput(101, 1, [hit], [feedbackDirectionFact(hit)]),
    );
    host.consume({
      consumerEpochId: 'runtime-a',
      projection: next,
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(ports.calls.played).toBe(1);
    expect(ports.calls.presented).toBe(1);
    expect(host.getSnapshot()).toMatchObject({
      state: 'active',
      projectionConsumer: { tick: 101, eventSequenceWaterline: 1 },
      effectConsumer: { tick: 101 },
    });
    host.dispose();
  });

  it('forwards the validated direction fact into the twenty-weapon feedback owner', () => {
    const ports = hostPorts();
    const host = new ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1(
      ports.options,
    );
    host.beginEpoch({
      consumerEpochId: 'runtime-specialized',
      projection: createArenaV2ModeHudValidatedStepProjectionV1(
        projectionInput(100, 0, []),
      ),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const hit = Object.freeze({
      ...feedbackEvent(0, 100),
      actionDefinitionId: HEAVY_HAMMER_GROUND_ACTION,
    });
    host.consume({
      consumerEpochId: 'runtime-specialized',
      projection: createArenaV2ModeHudValidatedStepProjectionV1(
        projectionInput(101, 1, [hit], [feedbackDirectionFact(hit)]),
      ),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(ports.calls.presented).toBe(1);
    expect(ports.calls.played).toBe(1);
    expect(host.getSnapshot()).toMatchObject({
      state: 'active',
      retainedWeaponReadPlanSourceEventIds: [hit.id],
      retainedDirectionFactSourceEventIds: [hit.id],
    });
    host.dispose();
  });

  it('rejects weapon feedback at the specialized epoch baseline', () => {
    const ports = hostPorts();
    const host = new ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1(
      ports.options,
    );
    const hit = Object.freeze({
      ...feedbackEvent(0, 100),
      actionDefinitionId: HEAVY_HAMMER_GROUND_ACTION,
    });
    expect(() => host.beginEpoch({
      consumerEpochId: 'runtime-specialized',
      projection: createArenaV2ModeHudValidatedStepProjectionV1(
        projectionInput(101, 1, [hit], [feedbackDirectionFact(hit)]),
      ),
      preferences: { reducedMotion: false, soundEnabled: true },
    })).toThrow(/epoch基线不得重放武器反馈/);
    expect(ports.calls.played).toBe(0);
    expect(ports.calls.presented).toBe(0);
    expect(host.getSnapshot()).toMatchObject({ state: 'created' });
    host.dispose();
  });

  it('shows one player-perspective ring-out cue for one authoritative fall', () => {
    const ports = hostPorts();
    const host = new ArenaV2ModeHudValidatedPresentationHostV1(ports.options);
    host.beginEpoch({
      consumerEpochId: 'runtime-a',
      projection: createArenaV2ModeHudValidatedStepProjectionV1(
        projectionInput(100, 0, []),
      ),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const ringOut = ringOutFeedbackEvent(0, 100);
    const participantFell = matchingParticipantFellEvent(1, 100);
    const projection = host.consume({
      consumerEpochId: 'runtime-a',
      projection: createArenaV2ModeHudValidatedStepProjectionV1(
        projectionInput(
          101,
          2,
          [ringOut, participantFell],
          [feedbackDirectionFact(ringOut)],
        ),
      ),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(projection.model.feedbackItems.filter(({ sourceEventId }) => (
      sourceEventId === ringOut.id || sourceEventId === participantFell.id
    ))).toEqual([
      expect.objectContaining({
        sourceEventId: ringOut.id,
        title: '你击落了玩家2[2]',
      }),
    ]);
    expect(ports.calls.played).toBe(1);
    expect(ports.calls.presented).toBe(1);
    host.dispose();
  });

  it('rejects direct HUD models and old runtime callbacks before consumption', () => {
    const host = new ArenaV2ModeHudValidatedPresentationHostV1(hostPorts().options);
    const baseline = createArenaV2ModeHudValidatedStepProjectionV1(
      projectionInput(100, 0, []),
    );
    expect(() => host.beginEpoch({
      consumerEpochId: 'runtime-a',
      projection: { tick: 100, eventSequence: 0 },
      preferences: { reducedMotion: false, soundEnabled: true },
    })).toThrow(/只接受已验证step投影/);
    host.beginEpoch({
      consumerEpochId: 'runtime-a',
      projection: baseline,
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const before = host.getSnapshot();
    expect(() => host.consume({
      consumerEpochId: 'runtime-old',
      projection: baseline,
      preferences: { reducedMotion: false, soundEnabled: true },
    })).toThrow(/旧epoch/);
    expect(host.getSnapshot()).toEqual(before);
    host.dispose();
  });

  it('rejects future projection fields and accessors without invoking getters', () => {
    expect(() => createArenaV2ModeHudValidatedStepProjectionV1({
      ...projectionInput(100, 0, []),
      future: true,
    })).toThrow();
    let getterCalls = 0;
    const value = projectionInput(100, 0, []) as Record<string, unknown>;
    Object.defineProperty(value, 'events', {
      enumerable: true,
      get() { getterCalls += 1; return []; },
    });
    expect(() => createArenaV2ModeHudValidatedStepProjectionV1(value)).toThrow();
    expect(getterCalls).toBe(0);
  });
});
