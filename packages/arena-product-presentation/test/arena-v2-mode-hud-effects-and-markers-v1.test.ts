import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1,
  ArenaV2ModeHudFeedbackEffectConsumerV1,
  projectArenaV2ModeHudWorldMarkersV1,
  type ArenaV2ModeHudFeedbackItemV1,
  type ArenaV2ModeHudFeedbackQueueProjectionV1,
  type ArenaV2ModeHudLayoutV1,
  type ArenaV2UiRenderPlanV1,
} from '../src/index.js';

const ITEM: ArenaV2ModeHudFeedbackItemV1 = Object.freeze({
  sourceEventId: 'event-1',
  tick: 100,
  sequence: 1,
  category: 'weapon',
  anchorParticipantId: 'participant-target',
  attackerParticipantId: 'participant-attacker',
  targetParticipantId: 'participant-target',
  anchorWorldPosition: null,
  actionDefinitionId: 'arena-v2.action.unarmed-ground.candidate.v1',
  perspective: 'local-involved',
  title: '命中',
  explanation: '目标位置已经改变。',
  emphasis: 'strong',
  visualCue: 'impact-confirm',
  audioCue: 'weapon-hit',
  motionPolicy: 'standard',
});

function feedback(
  revision: number,
  visibleItems: readonly ArenaV2ModeHudFeedbackItemV1[],
  audio: boolean,
  soundEnabled = true,
): ArenaV2ModeHudFeedbackQueueProjectionV1 {
  return Object.freeze({
    schemaVersion: 1,
    modelTick: 101 + revision,
    stateRevision: revision,
    soundEnabled,
    visibleItems: Object.freeze(visibleItems),
    liveAnnouncements: Object.freeze(visibleItems.map(({ title }) => title)),
    oneShotAudioCues: Object.freeze(audio
      ? [Object.freeze({
        sourceEventId: ITEM.sourceEventId,
        cueId: 'weapon-hit',
        actionDefinitionId: ITEM.actionDefinitionId,
        emphasis: ITEM.emphasis,
        voicePriority: 3,
      })]
      : []),
    droppedSourceEventIds: Object.freeze([]),
    state: Object.freeze({
      schemaVersion: 1,
      tick: 101 + revision,
      revision,
      entries: Object.freeze([]),
      seenIdentities: Object.freeze([]),
    }),
  });
}

function layout(): ArenaV2ModeHudLayoutV1 {
  return Object.freeze({
    schemaVersion: 1,
    density: 'narrow',
    safeRect: Object.freeze({ x: 0, y: 0, width: 390, height: 844 }),
    primaryTimerRect: Object.freeze({ x: 113, y: 12, width: 164, height: 52 }),
    preparationTimerRect: null,
    localStatusRect: Object.freeze({ x: 12, y: 72, width: 179, height: 72 }),
    modeStatusRect: Object.freeze({ x: 199, y: 72, width: 179, height: 72 }),
    supplyRailRect: null,
    supplyRailVisibility: 'empty',
    supplyItemRects: Object.freeze([]),
    feedbackRect: null,
    feedbackVisibility: 'empty',
    visibleFeedbackSourceEventIds: Object.freeze([]),
    inputReservedRect: Object.freeze({ x: 0, y: 668, width: 390, height: 176 }),
    fixedWidthNumeric: true,
    horizontalOverflowAllowed: false,
  });
}

function plan(): ArenaV2UiRenderPlanV1 {
  return Object.freeze({
    schemaVersion: 1,
    surfaceKind: 'hud',
    identity: 'arena.mode.survival.v1:101',
    revision: 101,
    status: 'layout-candidate',
    productionReady: false,
    primitives: Object.freeze([]),
    scrollRegion: null,
    liveAnnouncements: Object.freeze([]),
    audioCues: Object.freeze([]),
    worldAnchors: Object.freeze([
      Object.freeze({
        id: 'supply-a',
        position: Object.freeze({ x: 0, y: 0, z: 0 }),
        label: 'Lv.1',
        accessibilityText: '供给A',
      }),
      Object.freeze({
        id: 'supply-b',
        position: Object.freeze({ x: 1, y: 0, z: 0 }),
        label: 'Lv.2',
        accessibilityText: '供给B',
      }),
      Object.freeze({
        id: 'supply-c',
        position: Object.freeze({ x: 2, y: 0, z: 0 }),
        label: 'Lv.3',
        accessibilityText: '供给C',
      }),
    ]),
    inputExclusionRect: Object.freeze({ x: 0, y: 668, width: 390, height: 176 }),
    formalAssetIds: Object.freeze([] as const),
  });
}

describe('Arena V2 HUD feedback effects and world markers V1', () => {
  it('rejects effect-port lifecycle reentry before the outer consume commits', () => {
    let reentryError: unknown = null;
    let plays = 0;
    let consumer!: ArenaV2ModeHudFeedbackEffectConsumerV1;
    consumer = new ArenaV2ModeHudFeedbackEffectConsumerV1({
      qualityTier: 'low',
      audio: {
        play() {
          plays += 1;
          try {
            consumer.dispose();
          } catch (error) {
            reentryError = error;
          }
        },
        stopAll() {},
      },
      visual: {
        present() {},
        remove() {},
        clear() {},
      },
    }).load();
    consumer.beginEpoch('epoch-a');
    consumer.consumeEpoch('epoch-a', feedback(1, [ITEM], true));

    expect(String(reentryError)).toMatch(/consume期间同步重入dispose/);
    expect(plays).toBe(1);
    expect(consumer.getSnapshot()).toMatchObject({
      state: ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.READY,
      consumerEpochId: 'epoch-a',
      revision: 1,
    });
    consumer.dispose();
  });

  it('rejects non-canonical epoch identities before presentation side effects', () => {
    let plays = 0;
    let presents = 0;
    let clears = 0;
    let stops = 0;
    const consumer = new ArenaV2ModeHudFeedbackEffectConsumerV1({
      qualityTier: 'low',
      audio: {
        play() { plays += 1; },
        stopAll() { stops += 1; },
      },
      visual: {
        present() { presents += 1; },
        remove() {},
        clear() { clears += 1; },
      },
    }).load();

    expect(() => consumer.beginEpoch('   ')).toThrow(/非空字符串/);
    expect(() => consumer.beginEpoch(' epoch-a ')).toThrow(/首尾空白/);
    expect(consumer.getSnapshot().consumerEpochId).toBeNull();
    expect({ plays, presents, clears, stops }).toEqual({
      plays: 0,
      presents: 0,
      clears: 0,
      stops: 0,
    });

    consumer.beginEpoch('epoch-a');
    expect(() => consumer.consumeEpoch(' epoch-a ', feedback(1, [ITEM], true)))
      .toThrow(/首尾空白/);
    expect({ plays, presents }).toEqual({ plays: 0, presents: 0 });
    consumer.dispose();
  });

  it('rejects constructor accessors and overdeep port prototypes without executing them', () => {
    let optionAccessorReads = 0;
    const accessorOptions: Record<string, unknown> = {
      audio: { play() {}, stopAll() {} },
      visual: { present() {}, remove() {}, clear() {} },
    };
    Object.defineProperty(accessorOptions, 'qualityTier', {
      enumerable: true,
      get: () => {
        optionAccessorReads += 1;
        return 'high';
      },
    });
    expect(() => new ArenaV2ModeHudFeedbackEffectConsumerV1(accessorOptions))
      .toThrow(/数据字段/);
    expect(optionAccessorReads).toBe(0);

    let methodAccessorReads = 0;
    const accessorAudio = Object.defineProperty({ stopAll() {} }, 'play', {
      enumerable: true,
      get: () => {
        methodAccessorReads += 1;
        return () => {};
      },
    });
    expect(() => new ArenaV2ModeHudFeedbackEffectConsumerV1({
      qualityTier: 'high',
      audio: accessorAudio,
      visual: { present() {}, remove() {}, clear() {} },
    })).toThrow(/同步数据方法/);
    expect(methodAccessorReads).toBe(0);

    const audioBase = Object.create(null) as Record<string, unknown>;
    Object.defineProperties(audioBase, {
      play: { value() {}, enumerable: true },
      stopAll: { value() {}, enumerable: true },
    });
    let overdeepAudio: object = audioBase;
    for (let depth = 0; depth < 33; depth += 1) {
      overdeepAudio = Object.create(overdeepAudio) as object;
    }
    expect(() => new ArenaV2ModeHudFeedbackEffectConsumerV1({
      qualityTier: 'high',
      audio: overdeepAudio,
      visual: { present() {}, remove() {}, clear() {} },
    })).toThrow(/原型链无效/);

    let bindAccessorReads = 0;
    const play = function play(this: { calls: number }): void {
      this.calls += 1;
    };
    Object.defineProperty(play, 'bind', {
      get: () => {
        bindAccessorReads += 1;
        return Function.prototype.bind;
      },
    });
    const audio = { calls: 0, play, stopAll() {} };
    const consumer = new ArenaV2ModeHudFeedbackEffectConsumerV1({
      qualityTier: 'low',
      audio,
      visual: { present() {}, remove() {}, clear() {} },
    }).load();
    consumer.consume(feedback(1, [ITEM], true));
    expect(bindAccessorReads).toBe(0);
    expect(audio.calls).toBe(1);
    consumer.dispose();
  });

  it('reconciles visuals and consumes one-shot audio idempotently', () => {
    const played: unknown[] = [];
    const presented: unknown[] = [];
    const removed: unknown[] = [];
    let clears = 0;
    let stops = 0;
    const consumer = new ArenaV2ModeHudFeedbackEffectConsumerV1({
      qualityTier: 'high',
      audio: {
        play(cue: unknown) { played.push(cue); },
        stopAll() { stops += 1; },
      },
      visual: {
        present(command: unknown) { presented.push(command); },
        remove(sourceEventId: unknown) { removed.push(sourceEventId); },
        clear() { clears += 1; },
      },
    }).load();
    const first = feedback(1, [ITEM], true);
    consumer.consume(first);
    consumer.consume(first);
    expect(played).toHaveLength(1);
    expect(presented).toHaveLength(1);
    expect(played[0]).toMatchObject({
      bus: 'SFX', gainDb: -3, priority: 3, maximumConcurrentVoices: 8,
    });
    expect(presented[0]).toMatchObject({
      qualityTier: 'high', maximumLayers: 3, maximumParticles: 96,
      perspective: 'local-involved', maximumAverageOverdraw: 2, distortionAllowed: false,
    });

    consumer.consume(feedback(2, [ITEM], false));
    expect(presented).toHaveLength(1);
    expect(consumer.getSnapshot()).toMatchObject({
      activeVisualSourceEventIds: ['event-1'],
      consumedVisualSourceEventIds: ['event-1'],
    });

    consumer.consume(feedback(3, [], false));
    expect(removed).toEqual(['event-1']);
    consumer.consume(feedback(4, [ITEM], false));
    expect(presented).toHaveLength(1);
    expect(consumer.getSnapshot().activeVisualSourceEventIds).toEqual([]);
    consumer.dispose();
    expect(clears).toBe(0);
    expect(stops).toBe(1);
    expect(consumer.state).toBe(ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.DISPOSED);
  });

  it('presents every same-tick feedback identity once in stable queue order', () => {
    const presentedSourceEventIds: unknown[] = [];
    const consumer = new ArenaV2ModeHudFeedbackEffectConsumerV1({
      qualityTier: 'medium',
      audio: { play() {}, stopAll() {} },
      visual: {
        present(command: { sourceEventId: unknown }) {
          presentedSourceEventIds.push(command.sourceEventId);
        },
        remove() {},
        clear() {},
      },
    }).load();
    const items = Object.freeze([
      ITEM,
      Object.freeze({
        ...ITEM,
        sourceEventId: 'event-2',
        sequence: 2,
        title: '击落',
        visualCue: 'ring-out',
        emphasis: 'warning' as const,
      }),
      Object.freeze({
        ...ITEM,
        sourceEventId: 'event-3',
        sequence: 3,
        actionDefinitionId: null,
        title: '移动坠落',
        visualCue: 'movement-fall-warning',
        emphasis: 'warning' as const,
      }),
    ]);

    consumer.consume(feedback(1, items, false));
    consumer.consume(feedback(2, items, false));

    expect(presentedSourceEventIds).toEqual(['event-1', 'event-2', 'event-3']);
    expect(consumer.getSnapshot()).toMatchObject({
      activeVisualSourceEventIds: ['event-1', 'event-2', 'event-3'],
      consumedVisualSourceEventIds: ['event-1', 'event-2', 'event-3'],
    });
    consumer.dispose();
  });

  it('rejects a consumed visual event id with different tick or sequence', () => {
    let presents = 0;
    const consumer = new ArenaV2ModeHudFeedbackEffectConsumerV1({
      qualityTier: 'low',
      audio: { play() {}, stopAll() {} },
      visual: {
        present() { presents += 1; },
        remove() {},
        clear() {},
      },
    }).load();
    consumer.consume(feedback(1, [ITEM], false));

    expect(() => consumer.consume(feedback(2, [Object.freeze({
      ...ITEM,
      sequence: ITEM.sequence + 1,
    })], false))).toThrow(/已消费视觉反馈身份漂移/u);
    expect(() => consumer.consume(feedback(2, [Object.freeze({
      ...ITEM,
      actionDefinitionId: 'arena-v2.action.other-weapon.ground.candidate.v1',
      visualCue: 'other-weapon-impact',
    })], false))).toThrow(/已消费视觉反馈身份漂移/u);
    expect(() => consumer.consume(feedback(2, [Object.freeze({
      ...ITEM,
      anchorParticipantId: 'participant-other-target',
      targetParticipantId: 'participant-other-target',
    })], false))).toThrow(/已消费视觉反馈身份漂移/u);
    expect(presents).toBe(1);
    expect(consumer.state).toBe(
      ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.READY,
    );
    consumer.dispose();
  });

  it('bounds visual one-shot identity history to the existing queue window', () => {
    const consumer = new ArenaV2ModeHudFeedbackEffectConsumerV1({
      qualityTier: 'low',
      audio: { play() {}, stopAll() {} },
      visual: { present() {}, remove() {}, clear() {} },
    }).load();
    for (let ordinal = 1; ordinal <= 65; ordinal += 1) {
      consumer.consume(feedback(ordinal, [Object.freeze({
        ...ITEM,
        sourceEventId: `event-${ordinal}`,
        tick: ITEM.tick + ordinal,
        sequence: ordinal,
      })], false));
    }

    const snapshot = consumer.getSnapshot();
    expect(snapshot.consumedVisualSourceEventIds).toHaveLength(64);
    expect(snapshot.consumedVisualSourceEventIds[0]).toBe('event-2');
    expect(snapshot.consumedVisualSourceEventIds.at(-1)).toBe('event-65');
    consumer.dispose();
  });

  it('plays a retained local weapon cue without allocating a fourth visual', () => {
    const played: unknown[] = [];
    const consumer = new ArenaV2ModeHudFeedbackEffectConsumerV1({
      qualityTier: 'low',
      audio: {
        play(cue: unknown) { played.push(cue); },
        stopAll() {},
      },
      visual: {
        present() {},
        remove() {},
        clear() {},
      },
    }).load();
    const projection = feedback(1, [], false);
    consumer.consume(Object.freeze({
      ...projection,
      oneShotAudioCues: Object.freeze([Object.freeze({
        sourceEventId: ITEM.sourceEventId,
        cueId: ITEM.audioCue!,
        actionDefinitionId: ITEM.actionDefinitionId,
        emphasis: ITEM.emphasis,
        voicePriority: 2 as const,
      })]),
      state: Object.freeze({
        ...projection.state,
        entries: Object.freeze([Object.freeze({
          item: ITEM,
          expiresAtTick: projection.modelTick + 120,
        })]),
      }),
    }));

    expect(played).toHaveLength(1);
    expect(played[0]).toMatchObject({
      sourceEventId: ITEM.sourceEventId,
      gainDb: -3,
      priority: 2,
      maximumConcurrentVoices: 8,
    });
    consumer.dispose();
  });

  it('projects at most three authority anchors without entering HUD/input zones', () => {
    const projection = projectArenaV2ModeHudWorldMarkersV1(plan(), layout(), {
      project(position) {
        if (position.x === 0) return {
          normalizedX: 0, normalizedY: 0, depth: 0.5, behindCamera: false, occluded: false,
        };
        if (position.x === 1) return {
          normalizedX: 2, normalizedY: 0, depth: 0.6, behindCamera: false, occluded: false,
        };
        return {
          normalizedX: 0, normalizedY: 0, depth: -1, behindCamera: true, occluded: false,
        };
      },
    });
    expect(projection.markers).toHaveLength(3);
    expect(projection.markers[0]).toMatchObject({
      id: 'supply-a', visibility: 'visible', placement: 'onscreen', touchTargetCssPixels: 48,
    });
    expect(projection.markers[1]).toMatchObject({
      id: 'supply-b', visibility: 'visible', placement: 'edge-clamped',
    });
    expect(projection.markers[2]).toMatchObject({
      id: 'supply-c', visibility: 'behind-camera', placement: null,
    });
    for (const marker of projection.markers.filter(({ visibility }) => visibility === 'visible')) {
      expect(marker.centerCssPixels!.y).toBeLessThan(668 - 24);
    }
  });

  it('rejects accessor camera ports and declared-then projection results without executing them', () => {
    let projectGetterCalls = 0;
    const accessorCamera = Object.defineProperty({}, 'project', {
      get() {
        projectGetterCalls += 1;
        return () => ({
          normalizedX: 0,
          normalizedY: 0,
          depth: 0,
          behindCamera: false,
          occluded: false,
        });
      },
    });
    expect(() => projectArenaV2ModeHudWorldMarkersV1(
      plan(),
      layout(),
      accessorCamera as never,
    )).toThrow(/project.*必须是数据方法/u);
    expect(projectGetterCalls).toBe(0);

    expect(() => projectArenaV2ModeHudWorldMarkersV1(plan(), layout(), {
      project() {
        return Object.freeze({ then: null });
      },
    } as never)).toThrow(/then字段.*同步完成/u);

    let resultGetterCalls = 0;
    expect(() => projectArenaV2ModeHudWorldMarkersV1(plan(), layout(), {
      project() {
        return Object.defineProperty({
          normalizedY: 0,
          depth: 0,
          behindCamera: false,
          occluded: false,
        }, 'normalizedX', {
          enumerable: true,
          get() {
            resultGetterCalls += 1;
            return 0;
          },
        });
      },
    } as never)).toThrow(/normalizedX.*数据字段/u);
    expect(resultGetterCalls).toBe(0);
  });

  it('turns reduced motion feedback into a zero-particle static result', () => {
    const commands: unknown[] = [];
    const consumer = new ArenaV2ModeHudFeedbackEffectConsumerV1({
      qualityTier: 'high',
      audio: { play() {}, stopAll() {} },
      visual: {
        present(command: unknown) { commands.push(command); },
        remove() {},
        clear() {},
      },
    }).load();
    consumer.consume(feedback(1, [{
      ...ITEM,
      sourceEventId: 'event-static',
      audioCue: null,
      motionPolicy: 'static',
    }], false));
    expect(commands[0]).toMatchObject({
      motionPolicy: 'static',
      timingLanguage: 'static-result-only',
      maximumLayers: 1,
      maximumParticles: 0,
      distortionAllowed: false,
      explicitOffSwitch: true,
    });
    consumer.dispose();
  });

  it('replaces an active visual when reduced-motion policy changes', () => {
    const commands: unknown[] = [];
    const removed: string[] = [];
    const consumer = new ArenaV2ModeHudFeedbackEffectConsumerV1({
      qualityTier: 'high',
      audio: { play() {}, stopAll() {} },
      visual: {
        present(command: unknown) { commands.push(command); },
        remove(sourceEventId: string) { removed.push(sourceEventId); },
        clear() {},
      },
    }).load();
    consumer.consume(feedback(1, [ITEM], false));
    consumer.consume(feedback(2, [Object.freeze({
      ...ITEM,
      motionPolicy: 'static',
    })], false));
    consumer.consume(feedback(3, [ITEM], false));

    expect(removed).toEqual([ITEM.sourceEventId]);
    expect(commands).toHaveLength(2);
    expect(commands[0]).toMatchObject({ motionPolicy: 'standard', maximumParticles: 96 });
    expect(commands[1]).toMatchObject({
      motionPolicy: 'static',
      timingLanguage: 'static-result-only',
      maximumParticles: 0,
    });
    expect(consumer.getSnapshot().activeVisualSourceEventIds).toEqual([ITEM.sourceEventId]);
    consumer.dispose();
  });

  it('stops owned feedback audio on mute without replaying it after unmute', () => {
    let plays = 0;
    let stops = 0;
    const consumer = new ArenaV2ModeHudFeedbackEffectConsumerV1({
      qualityTier: 'low',
      audio: {
        play() { plays += 1; },
        stopAll() { stops += 1; },
      },
      visual: { present() {}, remove() {}, clear() {} },
    }).load();
    consumer.consume(feedback(1, [ITEM], true, true));
    consumer.consume(feedback(2, [ITEM], false, false));
    consumer.consume(feedback(3, [ITEM], false, true));

    expect(plays).toBe(1);
    expect(stops).toBe(1);
    expect(consumer.getSnapshot()).toMatchObject({
      soundEnabled: true,
      consumedAudioSourceEventIds: [ITEM.sourceEventId],
    });
    consumer.dispose();
  });

  it('retries only the external effect cleanup that did not complete', () => {
    let clears = 0;
    let stops = 0;
    const consumer = new ArenaV2ModeHudFeedbackEffectConsumerV1({
      qualityTier: 'low',
      audio: {
        play() {},
        stopAll() {
          stops += 1;
          if (stops === 1) throw new Error('stop failed');
        },
      },
      visual: {
        present() {},
        remove() {},
        clear() { clears += 1; },
      },
    }).load();
    consumer.consume(feedback(1, [ITEM], true));

    expect(() => consumer.dispose()).toThrow(/销毁不完整/);
    expect(consumer.state).toBe(ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.FAILED);
    expect(consumer.getSnapshot().cleanup).toEqual({
      started: true,
      visualCleared: true,
      audioStopped: false,
      visualEffectsOwned: false,
      audioEffectsOwned: true,
    });

    consumer.dispose();
    expect(clears).toBe(1);
    expect(stops).toBe(2);
    expect(consumer.state).toBe(ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.DISPOSED);
  });

  it('disposes a fresh owner without clearing external effects it never owned', () => {
    let clears = 0;
    let stops = 0;
    const consumer = new ArenaV2ModeHudFeedbackEffectConsumerV1({
      qualityTier: 'low',
      audio: { play() {}, stopAll() { stops += 1; } },
      visual: {
        present() {},
        remove() {},
        clear() { clears += 1; },
      },
    }).load();

    consumer.dispose();

    expect(clears).toBe(0);
    expect(stops).toBe(0);
    expect(consumer.state).toBe(ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.DISPOSED);
  });

  it('clears effects on epoch switch and rejects callbacks from the replaced runtime', () => {
    const played: unknown[] = [];
    let clears = 0;
    let stops = 0;
    const consumer = new ArenaV2ModeHudFeedbackEffectConsumerV1({
      qualityTier: 'medium',
      audio: {
        play(command: unknown) { played.push(command); },
        stopAll() { stops += 1; },
      },
      visual: {
        present() {},
        remove() {},
        clear() { clears += 1; },
      },
    }).load();
    consumer.beginEpoch('runtime-generation-a');
    consumer.consumeEpoch('runtime-generation-a', feedback(1, [ITEM], true));
    consumer.beginEpoch('runtime-generation-b');
    expect(() => consumer.consumeEpoch(
      'runtime-generation-a',
      feedback(2, [], false),
    )).toThrow(/旧epoch/);
    consumer.consumeEpoch('runtime-generation-b', feedback(1, [ITEM], true));
    expect(played).toHaveLength(2);
    expect(consumer.getSnapshot()).toMatchObject({
      consumerEpochId: 'runtime-generation-b',
      consumedVisualSourceEventIds: ['event-1'],
      consumedAudioSourceEventIds: ['event-1'],
    });
    expect(clears).toBe(1);
    expect(stops).toBe(1);
    consumer.dispose();
    expect(clears).toBe(2);
    expect(stops).toBe(2);
  });
});
