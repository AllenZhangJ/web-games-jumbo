import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1,
  ArenaV2ModeHudPresentationHostV1,
  type ArenaV2ModeHudViewModelV1,
} from '../src/index.js';

function baseline(): ArenaV2ModeHudViewModelV1 {
  return {
    schemaVersion: 1,
    tick: 40,
    eventSequence: 5,
    modeDefinitionId: 'arena.mode.survival.v1',
    phase: 'active',
    remainingTicks: 600,
    preparationRemainingTicks: null,
    localParticipant: {
      participantId: 'player',
      lives: 2,
      status: 'active',
      heldCollectionEquipmentDefinitionId: null,
      survivalLevel: 1,
      cooldownRemainingTicks: 0,
    },
    participantIdentities: [{
      participantId: 'player',
      displayName: '你',
      portraitKey: 'portrait.player',
      appearanceKey: 'appearance.player',
      identityOrdinal: 1,
      identityGlyphKey: 'glyph.1',
      identityPatternKey: 'pattern.1',
      modeRole: 'player',
      teamId: null,
      local: true,
    }],
    mode: {
      kind: 'survival',
      mapDefinitionId: 'arena-v2-kz-base-map.candidate.v1',
      mapDisplayName: 'KZ 十二段竞技路线',
      playerParticipantId: 'player',
      survivedTicks: 39,
      pressureStage: 1,
      activeEnemyCount: 1,
      fallCount: 0,
      terminalFallCount: 2,
    },
    supplyResyncReady: true,
    supplyCadence: {
      schemaVersion: 1,
      modeDefinitionId: 'arena.mode.survival.v1',
      supplyDefinitionId: 'arena.supply.survival.v1',
      snapshotTick: 40,
      nextWaveIndex: 1,
      nextSpawnTick: 600,
      remainingTicks: 560,
      spawnCount: 3,
    },
    supplyMarkers: [],
    supplyFeedbackCues: [],
    weaponFeedbackEvents: [],
    modeFeedbackEvents: [],
    result: null,
  };
}

function ports(overrides: Readonly<{
  failPresent?: boolean;
  failStopAttempts?: number;
  onPlay?: () => void;
}> = {}) {
  const calls = { clears: 0, stops: 0, plays: 0, presents: 0 };
  return {
    calls,
    options: {
      qualityTier: 'medium' as const,
      audio: {
        play() {
          calls.plays += 1;
          overrides.onPlay?.();
        },
        stopAll() {
          calls.stops += 1;
          if (calls.stops <= (overrides.failStopAttempts ?? 0)) {
            throw new Error('audio stop unavailable');
          }
        },
      },
      visual: {
        present() {
          calls.presents += 1;
          if (overrides.failPresent === true) throw new Error('visual unavailable');
        },
        remove() {},
        clear() { calls.clears += 1; },
      },
    },
  };
}

function feedbackEvent(sequence: number, tick: number) {
  return {
    id: `event-${sequence}`,
    sequence,
    tick,
    type: 'WeaponFeedbackResolved',
    kind: 'hit-confirm',
    attackerId: 'player',
    targetId: 'enemy',
    actionDefinitionId: 'weapon-ground',
    actionStartedTick: tick,
    firstHitTick: tick,
    targetFallTick: null,
    initialSupportSurfaceId: 'surface-a',
    finalSupportSurfaceId: 'surface-a',
    fallCause: null,
    creditedAttackerId: null,
  };
}

function modelWithFeedback(model: ArenaV2ModeHudViewModelV1) {
  return {
    ...model,
    tick: 41,
    eventSequence: 6,
    remainingTicks: 599,
    supplyCadence: {
      ...model.supplyCadence!,
      snapshotTick: 41,
      remainingTicks: 559,
    },
    mode: {
      kind: 'survival' as const,
      mapDefinitionId: 'arena-v2-kz-base-map.candidate.v1',
      mapDisplayName: 'KZ 十二段竞技路线',
      playerParticipantId: 'player',
      survivedTicks: 40,
      pressureStage: 1,
      activeEnemyCount: 1,
      fallCount: 0,
      terminalFallCount: 2,
    },
    weaponFeedbackEvents: [{
      id: 'presentation:event-5',
      type: 'WeaponFeedbackPresented' as const,
      tick: 40,
      sequence: 5,
      sourceEventId: 'event-5',
      action: 'weapon-ground',
      targetId: 'enemy',
      attackerId: 'player',
      feedbackKind: 'hit-confirm' as const,
      title: '命中',
      explanation: '命中已由权威事件确认。',
      visualCue: 'impact-confirm',
      audioCue: 'weapon-hit',
      emphasis: 'strong' as const,
    }],
  };
}

describe('Arena V2 mode HUD presentation host V1', () => {
  it('rejects effect-port host reentry before both child consumers commit', () => {
    let reentryError: unknown = null;
    let host!: ArenaV2ModeHudPresentationHostV1;
    const port = ports({
      onPlay: () => {
        try {
          host.dispose();
        } catch (error) {
          reentryError = error;
        }
      },
    });
    host = new ArenaV2ModeHudPresentationHostV1(port.options);
    const model = baseline();
    host.beginEpoch({
      consumerEpochId: 'epoch-a',
      baselineModel: model,
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    host.consume({
      consumerEpochId: 'epoch-a',
      model: modelWithFeedback(model),
      sourceEvents: [feedbackEvent(5, 40)],
      preferences: { reducedMotion: false, soundEnabled: true },
    });

    expect(String(reentryError)).toMatch(/consume期间同步重入dispose/);
    expect(port.calls.plays).toBe(1);
    expect(host.getSnapshot()).toMatchObject({
      state: ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1.ACTIVE,
      consumerEpochId: 'epoch-a',
      projectionConsumer: { tick: 41 },
      effectConsumer: { tick: 41, revision: 2 },
    });
    host.dispose();
  });

  it('switches projection and effect consumers through one epoch boundary', () => {
    const port = ports();
    const host = new ArenaV2ModeHudPresentationHostV1(port.options);
    const model = baseline();
    const first = host.beginEpoch({
      consumerEpochId: 'epoch-a',
      baselineModel: model,
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(first.feedback.oneShotAudioCues).toEqual([]);
    expect(host.getSnapshot()).toMatchObject({
      state: 'active',
      consumerEpochId: 'epoch-a',
      generation: 1,
      projectionConsumer: { consumerEpochId: 'epoch-a' },
      effectConsumer: { consumerEpochId: 'epoch-a' },
    });
    host.beginEpoch({
      consumerEpochId: 'epoch-b',
      baselineModel: { ...model, tick: 41 },
      preferences: { reducedMotion: true, soundEnabled: false },
    });
    expect(host.getSnapshot()).toMatchObject({
      consumerEpochId: 'epoch-b',
      generation: 2,
      projectionConsumer: { consumerEpochId: 'epoch-b' },
      effectConsumer: { consumerEpochId: 'epoch-b' },
    });
    expect(port.calls.clears).toBe(0);
    expect(port.calls.stops).toBe(0);
    host.dispose();
  });

  it('rejects replaced runtime callbacks before either child mutates', () => {
    const port = ports();
    const host = new ArenaV2ModeHudPresentationHostV1(port.options);
    const model = baseline();
    host.beginEpoch({
      consumerEpochId: 'epoch-a',
      baselineModel: model,
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const before = host.getSnapshot();
    expect(() => host.consume({
      consumerEpochId: 'old-epoch',
      model,
      sourceEvents: [],
      preferences: { reducedMotion: false, soundEnabled: true },
    })).toThrow(/旧epoch/);
    expect(host.getSnapshot()).toEqual(before);
    host.dispose();
  });

  it('fails closed and cleans both consumers after a presentation side-effect failure', () => {
    const port = ports({ failPresent: true });
    const host = new ArenaV2ModeHudPresentationHostV1(port.options);
    const model = baseline();
    host.beginEpoch({
      consumerEpochId: 'epoch-a',
      baselineModel: model,
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(() => host.consume({
      consumerEpochId: 'epoch-a',
      model: {
        ...model,
        tick: 41,
        eventSequence: 6,
        weaponFeedbackEvents: [{
          id: 'presentation:event-5',
          type: 'WeaponFeedbackPresented',
          tick: 40,
          sequence: 5,
          sourceEventId: 'event-5',
          action: 'weapon-ground',
          targetId: 'enemy',
          attackerId: 'player',
          feedbackKind: 'hit-confirm',
          title: '命中',
          explanation: '命中已由权威事件确认。',
          visualCue: 'impact-confirm',
          audioCue: 'weapon-hit',
          emphasis: 'strong',
        }],
      },
      sourceEvents: [feedbackEvent(5, 40)],
      preferences: { reducedMotion: false, soundEnabled: true },
    })).toThrow(/原子消费失败/);
    expect(host.state).toBe(ARENA_V2_MODE_HUD_PRESENTATION_HOST_STATE_V1.FAILED);
    expect(host.getSnapshot()).toMatchObject({
      projectionConsumer: { state: 'disposed' },
      effectConsumer: { state: 'disposed' },
    });
    expect(port.calls.clears).toBe(1);
    expect(port.calls.stops).toBe(0);
  });

  it('rejects accessor and future fields before beginning an epoch', () => {
    const host = new ArenaV2ModeHudPresentationHostV1(ports().options);
    const model = baseline();
    expect(() => host.beginEpoch({
      consumerEpochId: 'epoch-a',
      baselineModel: model,
      preferences: { reducedMotion: false, soundEnabled: true },
      future: true,
    })).toThrow();
    let getterCalls = 0;
    const input = {
      baselineModel: model,
      preferences: { reducedMotion: false, soundEnabled: true },
    } as Record<string, unknown>;
    Object.defineProperty(input, 'consumerEpochId', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'epoch-a';
      },
    });
    expect(() => host.beginEpoch(input)).toThrow();
    expect(getterCalls).toBe(0);
    host.dispose();
  });

  it('retains the projection producer until the effect consumer cleanup succeeds', () => {
    const port = ports({ failStopAttempts: 3 });
    const host = new ArenaV2ModeHudPresentationHostV1(port.options);
    const model = baseline();
    host.beginEpoch({
      consumerEpochId: 'epoch-a',
      baselineModel: model,
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const activeModel = {
      ...model,
      tick: 41,
      eventSequence: 6,
      remainingTicks: 599,
      supplyCadence: {
        ...model.supplyCadence!,
        snapshotTick: 41,
        remainingTicks: 559,
      },
      mode: {
        kind: 'survival' as const,
        mapDefinitionId: 'arena-v2-kz-base-map.candidate.v1',
        mapDisplayName: 'KZ 十二段竞技路线',
        playerParticipantId: 'player',
        survivedTicks: 40,
        pressureStage: 1,
        activeEnemyCount: 1,
        fallCount: 0,
        terminalFallCount: 2,
      },
      weaponFeedbackEvents: [{
        id: 'presentation:event-5',
        type: 'WeaponFeedbackPresented' as const,
        tick: 40,
        sequence: 5,
        sourceEventId: 'event-5',
        action: 'weapon-ground',
        targetId: 'enemy',
        attackerId: 'player',
        feedbackKind: 'hit-confirm' as const,
        title: '命中',
        explanation: '命中已由权威事件确认。',
        visualCue: 'impact-confirm',
        audioCue: 'weapon-hit',
        emphasis: 'strong' as const,
      }],
    };
    host.consume({
      consumerEpochId: 'epoch-a',
      model: activeModel,
      sourceEvents: [feedbackEvent(5, 40)],
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(() => host.beginEpoch({
      consumerEpochId: 'epoch-b',
      baselineModel: { ...activeModel, weaponFeedbackEvents: [] },
      preferences: { reducedMotion: false, soundEnabled: true },
    })).toThrow(/原子消费失败/);
    expect(host.getSnapshot()).toMatchObject({
      state: 'failed',
      consumerEpochId: 'epoch-b',
      projectionConsumer: { state: 'active', consumerEpochId: 'epoch-b' },
      effectConsumer: { state: 'failed' },
      cleanup: {
        started: true,
        projectionConsumerDisposed: false,
        effectConsumerDisposed: false,
      },
    });
    expect(port.calls.clears).toBe(1);
    expect(port.calls.stops).toBe(3);

    host.dispose();

    expect(host.getSnapshot()).toMatchObject({
      state: 'disposed',
      consumerEpochId: null,
      cleanup: {
        projectionConsumerDisposed: true,
        effectConsumerDisposed: true,
      },
    });
    expect(port.calls.clears).toBe(1);
    expect(port.calls.stops).toBe(4);
  });
});
