import { describe, expect, it } from 'vitest';
import {
  projectArenaWeaponFeedbackEventV6PresentationEvent,
} from '@number-strategy-jump/arena-presentation-runtime';
import type {
  WeaponFeedbackResolvedEventV6,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1,
  ArenaV2TwentyWeaponFeedbackHudHostCandidateV1,
  type ArenaV2ModeHudViewModelV1,
} from '../src/index.js';

const ACTION_ID =
  'arena-v2.action.heavy-hammer.ground.survival.level-1.candidate.v1';

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
      heldCollectionEquipmentDefinitionId: 'arena-v2.weapon.heavy-hammer.candidate.v1',
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

function feedbackEvent(
  actionDefinitionId = ACTION_ID,
  participants: Readonly<{
    attackerId: string | null;
    targetId: string | null;
  }> = { attackerId: 'player', targetId: 'enemy' },
) {
  return Object.freeze({
    id: 'event-5',
    sequence: 5,
    tick: 40,
    type: 'WeaponFeedbackResolved' as const,
    kind: 'hit-confirm' as const,
    attackerId: participants.attackerId,
    targetId: participants.targetId,
    actionDefinitionId,
    actionStartedTick: 35,
    firstHitTick: 38,
    targetFallTick: null,
    initialSupportSurfaceId: 'surface-a',
    finalSupportSurfaceId: 'surface-a',
    fallCause: null,
    creditedAttackerId: null,
  });
}

function ringOutFeedbackEvent() {
  return Object.freeze({
    ...feedbackEvent(),
    kind: 'hit-ring-out' as const,
    targetFallTick: 40,
    finalSupportSurfaceId: null,
    fallCause: 'credited-hit' as const,
    creditedAttackerId: 'player',
  });
}

function activeModel(
  event: WeaponFeedbackResolvedEventV6,
): ArenaV2ModeHudViewModelV1 {
  const source = baseline();
  return {
    ...source,
    tick: 41,
    eventSequence: 6,
    remainingTicks: 599,
    supplyCadence: {
      ...source.supplyCadence!,
      snapshotTick: 41,
      remainingTicks: 559,
    },
    mode: {
      kind: 'survival',
      mapDefinitionId: 'arena-v2-kz-base-map.candidate.v1',
      mapDisplayName: 'KZ 十二段竞技路线',
      playerParticipantId: 'player',
      survivedTicks: 40,
      pressureStage: 1,
      activeEnemyCount: 1,
      fallCount: 0,
      terminalFallCount: 2,
    },
    weaponFeedbackEvents: [projectArenaWeaponFeedbackEventV6PresentationEvent(event)],
  };
}

function directionFact(event: Readonly<{
  readonly id: string;
  readonly tick: number;
  readonly sequence: number;
  readonly kind: 'hit-confirm' | 'hit-ring-out';
}> = feedbackEvent()) {
  return Object.freeze({
    schemaVersion: 2 as const,
    feedbackEventId: event.id,
    feedbackTick: event.tick,
    feedbackSequence: event.sequence,
    feedbackKind: event.kind,
    resultDirection: Object.freeze({
      schemaVersion: 2 as const,
      kind: 'authority-horizontal-impulse' as const,
      sourceEventId: `knockback:${event.id}`,
      source: 'KnockbackApplied' as const,
      worldDirection: Object.freeze({ x: 1, z: 0 }),
      horizontalImpulseMagnitude: 6,
    }),
  });
}

function ports(overrides: Readonly<{
  failStopAt?: number;
  onPlay?: () => void;
}> = {}) {
  const visuals: Array<Record<string, unknown>> = [];
  const audio: Array<Record<string, unknown>> = [];
  let clears = 0;
  let stops = 0;
  return {
    visuals,
    audio,
    get clears() { return clears; },
    get stops() { return stops; },
    options: {
      qualityTier: 'medium' as const,
      visual: {
        present(value: Record<string, unknown>) { visuals.push(value); },
        presentPassthroughDirectional(value: Record<string, unknown>) {
          visuals.push(value);
        },
        remove() {},
        clear() { clears += 1; },
      },
      audio: {
        play(value: Record<string, unknown>) {
          audio.push(value);
          overrides.onPlay?.();
        },
        stopAll() {
          stops += 1;
          if (stops === overrides.failStopAt) throw new Error('audio stop unavailable');
        },
      },
    },
  };
}

describe('Arena V2 twenty weapon feedback HUD host candidate V1 (not run)', () => {
  it('rejects cyclic and over-depth synchronous port method prototypes before owner creation', () => {
    const port = ports();
    let cyclicAudio!: object;
    cyclicAudio = new Proxy({}, {
      getPrototypeOf: () => cyclicAudio,
    });
    expect(() => new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1({
      ...port.options,
      audio: cyclicAudio,
    })).toThrow(/play方法原型链存在循环/);

    const audioBase = {
      play() {},
      stopAll() {},
    };
    let deepAudio: object = audioBase;
    for (let index = 0; index < 33; index += 1) {
      deepAudio = Object.create(deepAudio) as object;
    }
    expect(() => new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1({
      ...port.options,
      audio: deepAudio,
    })).toThrow(/play方法原型链超过32层/);
    expect(port.clears).toBe(0);
    expect(port.stops).toBe(0);
  });

  it('rejects an optional directional-port accessor without executing it', () => {
    const port = ports();
    let accessorCalls = 0;
    const visual = Object.create(port.options.visual) as Record<string, unknown>;
    Object.defineProperty(visual, 'presentDirectional', {
      enumerable: true,
      configurable: true,
      get() {
        accessorCalls += 1;
        return () => undefined;
      },
    });

    expect(() => new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1({
      ...port.options,
      visual,
    })).toThrow(/presentDirectional必须是同步数据方法/);
    expect(accessorCalls).toBe(0);
    expect(port.clears).toBe(0);
    expect(port.stops).toBe(0);
  });

  it('rejects external-port reentry before specialized identities and inner host commit', () => {
    let reentryError: unknown = null;
    let host!: ArenaV2TwentyWeaponFeedbackHudHostCandidateV1;
    const port = ports({
      onPlay: () => {
        try {
          host.dispose();
        } catch (error) {
          reentryError = error;
        }
      },
    });
    host = new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1(port.options);
    host.beginEpoch({
      consumerEpochId: 'epoch-a',
      baselineModel: baseline(),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const event = feedbackEvent();
    expect(() => host.consume({
      consumerEpochId: 'epoch-a',
      model: activeModel(event),
      sourceEvents: [event],
      weaponFeedbackDirectionFactsV2: [directionFact(event)],
      preferences: { reducedMotion: false, soundEnabled: true },
    })).toThrow(/同步重入|消费失败/);

    expect(String(reentryError)).toMatch(/consume期间同步重入dispose/);
    expect(port.audio).toHaveLength(1);
    expect(host.getSnapshot()).toMatchObject({
      state: ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1.FAILED,
      consumerEpochId: 'epoch-a',
      retainedWeaponReadPlanSourceEventIds: ['event-5'],
      retainedDirectionFactSourceEventIds: ['event-5'],
      innerHost: { state: 'failed', consumerEpochId: 'epoch-a' },
      cleanup: { started: true, innerHostDisposed: false },
    });
    host.dispose();
    expect(host.getSnapshot()).toMatchObject({
      state: ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1.DISPOSED,
      consumerEpochId: null,
      retainedWeaponReadPlanSourceEventIds: [],
      retainedDirectionFactSourceEventIds: [],
      innerHost: { state: 'disposed', consumerEpochId: null },
      cleanup: { started: true, innerHostDisposed: true },
    });
  });

  it('specializes commands inside one epoch and retains the plan for visible queue state', () => {
    const port = ports();
    const host = new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1(port.options);
    host.beginEpoch({
      consumerEpochId: 'epoch-a',
      baselineModel: baseline(),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const event = feedbackEvent();
    const model = activeModel(event);
    host.consume({
      consumerEpochId: 'epoch-a',
      model,
      sourceEvents: [event],
      weaponFeedbackDirectionFactsV2: [directionFact(event)],
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(port.visuals[0]!.cueId).toContain(
      'arena.cue.vfx.weapon-feedback.heavy-hammer.ground.hit-confirm.survival',
    );
    expect(port.visuals[0]!.title).toContain('重锤·地面');
    expect(port.visuals[0]!.title).toContain('轻击');
    expect(port.visuals[0]!.title).toMatch(/^命中确认 · 轻击 · 地图东向/u);
    expect(port.audio[0]!.cueId).toContain(
      'arena.cue.audio.weapon-feedback.heavy-hammer.ground.hit-confirm.survival',
    );
    expect(host.getSnapshot().retainedWeaponReadPlanSourceEventIds).toEqual(['event-5']);

    host.consume({
      consumerEpochId: 'epoch-a',
      model: { ...model, weaponFeedbackEvents: [] },
      sourceEvents: [],
      weaponFeedbackDirectionFactsV2: [],
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(port.visuals).toHaveLength(1);
    expect(port.audio).toHaveLength(1);
    expect(host.getSnapshot().innerHost.effectConsumer).toMatchObject({
      activeVisualSourceEventIds: ['event-5'],
      consumedVisualSourceEventIds: ['event-5'],
      consumedAudioSourceEventIds: ['event-5'],
    });
    host.dispose();
  });

  it('preserves same-tick multi-target feedback order without replaying retained identities', () => {
    const port = ports();
    const host = new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1(port.options);
    host.beginEpoch({
      consumerEpochId: 'epoch-multi-target',
      baselineModel: baseline(),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const first = feedbackEvent();
    const second = Object.freeze({
      ...feedbackEvent(),
      id: 'event-6',
      sequence: 6,
      targetId: 'enemy-b',
    });
    const third = Object.freeze({
      ...feedbackEvent(),
      id: 'event-7',
      sequence: 7,
      targetId: 'enemy-c',
    });
    const model = Object.freeze({
      ...activeModel(first),
      eventSequence: 8,
      weaponFeedbackEvents: Object.freeze([
        projectArenaWeaponFeedbackEventV6PresentationEvent(first),
        projectArenaWeaponFeedbackEventV6PresentationEvent(second),
        projectArenaWeaponFeedbackEventV6PresentationEvent(third),
      ]),
    });

    host.consume({
      consumerEpochId: 'epoch-multi-target',
      model,
      sourceEvents: [first, second, third],
      weaponFeedbackDirectionFactsV2: [
        directionFact(first),
        directionFact(second),
        directionFact(third),
      ],
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(port.visuals.map(({ sourceEventId }) => sourceEventId)).toEqual([
      'event-5',
      'event-6',
      'event-7',
    ]);
    expect(port.audio.map(({ sourceEventId }) => sourceEventId)).toEqual([
      'event-5',
      'event-6',
      'event-7',
    ]);

    host.consume({
      consumerEpochId: 'epoch-multi-target',
      model: { ...model, weaponFeedbackEvents: [] },
      sourceEvents: [],
      weaponFeedbackDirectionFactsV2: [],
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(port.visuals).toHaveLength(3);
    expect(port.audio).toHaveLength(3);
    expect(host.getSnapshot().innerHost.effectConsumer).toMatchObject({
      consumedVisualSourceEventIds: ['event-5', 'event-6', 'event-7'],
      consumedAudioSourceEventIds: ['event-5', 'event-6', 'event-7'],
    });
    host.dispose();
  });

  it('distinguishes incoming and observed authority hits from local hit confirmation', () => {
    const incomingPort = ports();
    const incomingHost = new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1(
      incomingPort.options,
    );
    incomingHost.beginEpoch({
      consumerEpochId: 'epoch-incoming',
      baselineModel: baseline(),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const incoming = feedbackEvent(ACTION_ID, {
      attackerId: 'enemy',
      targetId: 'player',
    });
    incomingHost.consume({
      consumerEpochId: 'epoch-incoming',
      model: activeModel(incoming),
      sourceEvents: [incoming],
      weaponFeedbackDirectionFactsV2: [directionFact(incoming)],
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(incomingPort.visuals[0]!.title).toMatch(/^受击警告 · 轻击 · 地图东向/u);
    expect(incomingPort.visuals[0]).toMatchObject({ emphasis: 'warning' });
    expect(incomingPort.audio[0]).toMatchObject({ priority: 2, gainDb: -2, bus: 'SFX' });
    incomingHost.dispose();

    const observedPort = ports();
    const observedHost = new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1(
      observedPort.options,
    );
    observedHost.beginEpoch({
      consumerEpochId: 'epoch-observed',
      baselineModel: baseline(),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const observed = feedbackEvent(ACTION_ID, {
      attackerId: 'enemy-a',
      targetId: 'enemy-b',
    });
    observedHost.consume({
      consumerEpochId: 'epoch-observed',
      model: activeModel(observed),
      sourceEvents: [observed],
      weaponFeedbackDirectionFactsV2: [directionFact(observed)],
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(observedPort.visuals[0]!.title).toMatch(/^交战信息 · 轻击 · 地图东向/u);
    expect(observedPort.visuals[0]).toMatchObject({ emphasis: 'normal' });
    expect(observedPort.audio[0]).toMatchObject({ priority: 2, gainDb: -6, bus: 'SFX' });
    observedHost.dispose();
  });

  it('raises only the existing audio priority and gain tiers for a heavy authority impulse', () => {
    const port = ports();
    const host = new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1(port.options);
    host.beginEpoch({
      consumerEpochId: 'epoch-heavy',
      baselineModel: baseline(),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const event = feedbackEvent();
    const fact = directionFact(event);
    host.consume({
      consumerEpochId: 'epoch-heavy',
      model: activeModel(event),
      sourceEvents: [event],
      weaponFeedbackDirectionFactsV2: [{
        ...fact,
        resultDirection: { ...fact.resultDirection, horizontalImpulseMagnitude: 12 },
      }],
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(port.visuals[0]!.title).toContain('重击');
    expect(port.audio[0]).toMatchObject({ priority: 3, gainDb: -2, bus: 'SFX' });
    host.dispose();
  });

  it('raises heavy impact gain even when the existing ring-out voice priority is already maximum', () => {
    const port = ports();
    const host = new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1(port.options);
    host.beginEpoch({
      consumerEpochId: 'epoch-heavy-ring-out',
      baselineModel: baseline(),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const event = ringOutFeedbackEvent();
    const fact = directionFact(event);
    host.consume({
      consumerEpochId: 'epoch-heavy-ring-out',
      model: activeModel(event),
      sourceEvents: [event],
      weaponFeedbackDirectionFactsV2: [{
        ...fact,
        resultDirection: { ...fact.resultDirection, horizontalImpulseMagnitude: 12 },
      }],
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(port.audio[0]).toMatchObject({
      cueId: expect.stringContaining('.hit-ring-out.'),
      priority: 3,
      gainDb: -2,
      bus: 'SFX',
    });
    host.dispose();
  });

  it('clears retained plans atomically when switching consumer epoch', () => {
    const port = ports();
    const host = new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1(port.options);
    host.beginEpoch({
      consumerEpochId: 'epoch-a',
      baselineModel: baseline(),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const event = feedbackEvent();
    host.consume({
      consumerEpochId: 'epoch-a',
      model: activeModel(event),
      sourceEvents: [event],
      weaponFeedbackDirectionFactsV2: [directionFact(event)],
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const nextBaseline = {
      ...baseline(),
      tick: 41,
      eventSequence: 6,
      remainingTicks: 599,
    };
    host.beginEpoch({
      consumerEpochId: 'epoch-b',
      baselineModel: nextBaseline,
      preferences: { reducedMotion: true, soundEnabled: false },
    });
    expect(host.getSnapshot()).toMatchObject({
      state: 'active',
      consumerEpochId: 'epoch-b',
      retainedWeaponReadPlanSourceEventIds: [],
      innerHost: { consumerEpochId: 'epoch-b' },
    });
    expect(port.clears).toBe(2);
    expect(port.stops).toBe(2);
    host.dispose();
  });

  it('passes a validated unarmed action through without requiring a weapon plan', () => {
    const port = ports();
    const host = new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1(port.options);
    host.beginEpoch({
      consumerEpochId: 'epoch-a',
      baselineModel: baseline(),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const event = feedbackEvent('arena-v2.action.unarmed-push.ground.candidate.v1');
    host.consume({
      consumerEpochId: 'epoch-a',
      model: activeModel(event),
      sourceEvents: [event],
      weaponFeedbackDirectionFactsV2: [directionFact(event)],
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(port.visuals[0]).toMatchObject({
      schemaVersion: 1,
      command: { cueId: 'impact-confirm' },
      directionFact: {
        feedbackEventId: 'event-5',
        resultDirection: { worldDirection: { x: 1, z: 0 } },
      },
    });
    expect(port.audio[0]!.cueId).toBe('weapon-hit');
    expect(host.getSnapshot()).toMatchObject({
      retainedWeaponReadPlanSourceEventIds: [],
      retainedGenericUnarmedSourceEventIds: ['event-5'],
      retainedDirectionFactSourceEventIds: ['event-5'],
    });
    host.dispose();
  });

  it('fails closed before side effects when a weapon action is outside the catalog', () => {
    const port = ports();
    const host = new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1(port.options);
    host.beginEpoch({
      consumerEpochId: 'epoch-a',
      baselineModel: baseline(),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const event = feedbackEvent('arena-v2.action.unknown.ground.candidate.v1');
    expect(() => host.consume({
      consumerEpochId: 'epoch-a',
      model: activeModel(event),
      sourceEvents: [event],
      weaponFeedbackDirectionFactsV2: [directionFact(event)],
      preferences: { reducedMotion: false, soundEnabled: true },
    })).toThrow(/原子消费失败/);
    expect(host.state).toBe(
      ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_HOST_STATE_CANDIDATE_V1.FAILED,
    );
    expect(host.getSnapshot().retainedWeaponReadPlanSourceEventIds).toEqual([]);
  });

  it('rejects duplicate direction facts before presenting the feedback', () => {
    const port = ports();
    const host = new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1(port.options);
    host.beginEpoch({
      consumerEpochId: 'epoch-a',
      baselineModel: baseline(),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const event = feedbackEvent();
    const fact = directionFact(event);
    expect(() => host.consume({
      consumerEpochId: 'epoch-a',
      model: activeModel(event),
      sourceEvents: [event],
      weaponFeedbackDirectionFactsV2: [fact, fact],
      preferences: { reducedMotion: false, soundEnabled: true },
    })).toThrow(/原子消费失败/);
    expect(port.visuals).toHaveLength(0);
    expect(port.audio).toHaveLength(0);
  });

  it('rejects a retained feedback id whose authority direction changes', () => {
    const port = ports();
    const host = new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1(port.options);
    host.beginEpoch({
      consumerEpochId: 'epoch-a',
      baselineModel: baseline(),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const event = feedbackEvent();
    const model = activeModel(event);
    host.consume({
      consumerEpochId: 'epoch-a',
      model,
      sourceEvents: [event],
      weaponFeedbackDirectionFactsV2: [directionFact(event)],
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const changedDirection = {
      ...directionFact(event),
      resultDirection: {
        ...directionFact(event).resultDirection,
        worldDirection: { x: 0, z: 1 },
      },
    };
    expect(() => host.consume({
      consumerEpochId: 'epoch-a',
      model,
      sourceEvents: [event],
      weaponFeedbackDirectionFactsV2: [changedDirection],
      preferences: { reducedMotion: false, soundEnabled: true },
    })).toThrow(/原子消费失败/);
    expect(port.visuals).toHaveLength(1);
    expect(port.audio).toHaveLength(1);
  });

  it('rejects a retained weapon feedback id whose authority event changes', () => {
    const port = ports();
    const host = new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1(port.options);
    host.beginEpoch({
      consumerEpochId: 'epoch-a',
      baselineModel: baseline(),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const event = feedbackEvent();
    host.consume({
      consumerEpochId: 'epoch-a',
      model: activeModel(event),
      sourceEvents: [event],
      weaponFeedbackDirectionFactsV2: [directionFact(event)],
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const changedEvent = Object.freeze({
      ...event,
      firstHitTick: event.firstHitTick + 1,
    });
    expect(() => host.consume({
      consumerEpochId: 'epoch-a',
      model: activeModel(changedEvent),
      sourceEvents: [changedEvent],
      weaponFeedbackDirectionFactsV2: [directionFact(changedEvent)],
      preferences: { reducedMotion: false, soundEnabled: true },
    })).toThrow(/原子消费失败/);
    expect(port.visuals).toHaveLength(1);
    expect(port.audio).toHaveLength(1);
  });

  it('keeps retained unarmed authority identity immutable across frames', () => {
    const port = ports();
    const host = new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1(port.options);
    host.beginEpoch({
      consumerEpochId: 'epoch-a',
      baselineModel: baseline(),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const event = feedbackEvent('arena-v2.action.unarmed-push.ground.candidate.v1');
    const model = activeModel(event);
    host.consume({
      consumerEpochId: 'epoch-a',
      model,
      sourceEvents: [event],
      weaponFeedbackDirectionFactsV2: [directionFact(event)],
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const changedDirection = {
      ...directionFact(event),
      resultDirection: {
        ...directionFact(event).resultDirection,
        worldDirection: { x: -1, z: 0 },
      },
    };
    expect(() => host.consume({
      consumerEpochId: 'epoch-a',
      model,
      sourceEvents: [event],
      weaponFeedbackDirectionFactsV2: [changedDirection],
      preferences: { reducedMotion: false, soundEnabled: true },
    })).toThrow(/原子消费失败/);
    expect(port.visuals).toHaveLength(1);
    expect(port.audio).toHaveLength(1);
  });

  it('retains feedback identity while inner cleanup is incomplete and clears it after retry', () => {
    const port = ports({ failStopAt: 1 });
    const host = new ArenaV2TwentyWeaponFeedbackHudHostCandidateV1(port.options);
    host.beginEpoch({
      consumerEpochId: 'epoch-a',
      baselineModel: baseline(),
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const event = feedbackEvent();
    const model = activeModel(event);
    host.consume({
      consumerEpochId: 'epoch-a',
      model,
      sourceEvents: [event],
      weaponFeedbackDirectionFactsV2: [directionFact(event)],
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    const changedDirection = {
      ...directionFact(event),
      resultDirection: {
        ...directionFact(event).resultDirection,
        worldDirection: { x: 0, z: 1 },
      },
    };

    expect(() => host.consume({
      consumerEpochId: 'epoch-a',
      model,
      sourceEvents: [event],
      weaponFeedbackDirectionFactsV2: [changedDirection],
      preferences: { reducedMotion: false, soundEnabled: true },
    })).toThrow(/原子消费失败/);
    expect(host.getSnapshot()).toMatchObject({
      state: 'failed',
      consumerEpochId: 'epoch-a',
      retainedWeaponReadPlanSourceEventIds: ['event-5'],
      retainedDirectionFactSourceEventIds: ['event-5'],
      cleanup: { started: true, innerHostDisposed: false },
    });

    host.dispose();

    expect(host.getSnapshot()).toMatchObject({
      state: 'disposed',
      consumerEpochId: null,
      retainedWeaponReadPlanSourceEventIds: [],
      retainedDirectionFactSourceEventIds: [],
      cleanup: { started: true, innerHostDisposed: true },
    });
    expect(port.stops).toBe(2);
  });
});
