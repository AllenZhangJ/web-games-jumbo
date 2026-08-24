import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1,
  ARENA_V2_MODE_HUD_CONSUMER_EPOCH_STATE_V1,
  ArenaV2ModeHudConsumerEpochV1,
  advanceArenaV2ModeHudFeedbackQueueV1,
  createArenaV2ModeHudLayoutV1,
  createArenaV2ModeHudRenderModelV1,
  createArenaV2ModeHudRenderPlanV1,
  paintArenaV2UiRenderPlanV1,
  projectArenaV2ModeHudWeaponFeedbackEmphasisV1,
  type ArenaV2UiCanvasPaintPortV1,
  type ArenaV2ModeHudViewModelV1,
} from '../src/index.js';

function measuredCanvasPort(): Readonly<{
  port: ArenaV2UiCanvasPaintPortV1;
  text: string[];
}> {
  const text: string[] = [];
  const port: ArenaV2UiCanvasPaintPortV1 = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    closePath() {},
    rect() {},
    clip() {},
    fill() {},
    stroke() {},
    fillRect() {},
    fillText(value) { text.push(value); },
    measureText(value) { return { width: Array.from(value).length * 12 }; },
  };
  return Object.freeze({ port, text });
}

function survivalHud(): ArenaV2ModeHudViewModelV1 {
  return {
    schemaVersion: 1,
    tick: 1201,
    eventSequence: 8,
    modeDefinitionId: 'arena.mode.survival.v1',
    phase: 'active',
    remainingTicks: 4799,
    preparationRemainingTicks: null,
    localParticipant: {
      participantId: 'player',
      lives: 1,
      status: 'active',
      heldCollectionEquipmentDefinitionId: 'line-suppressor',
      survivalLevel: 3,
      cooldownRemainingTicks: 12,
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
      survivedTicks: 1200,
      pressureStage: 4,
      activeEnemyCount: 7,
      fallCount: 1,
      terminalFallCount: 2,
    },
    supplyResyncReady: true,
    supplyCadence: {
      schemaVersion: 1,
      modeDefinitionId: 'arena.mode.survival.v1',
      supplyDefinitionId: 'arena.supply.survival.v1',
      snapshotTick: 1201,
      nextWaveIndex: 2,
      nextSpawnTick: 1501,
      remainingTicks: 300,
      spawnCount: 3,
    },
    supplyMarkers: [
      'arena-v2.weapon.line-suppressor.candidate.v1',
      'arena-v2.weapon.heavy-hammer.candidate.v1',
      'arena-v2.weapon.gravity-chain.candidate.v1',
    ].map((collectionEquipmentDefinitionId, index) => ({
      supplyId: `supply-${index}`,
      slotId: `slot-${index}`,
      collectionEquipmentDefinitionId,
      runtimeEquipmentDefinitionId: `weapon-${index}-lv3`,
      survivalLevel: 3,
      remainingTicks: 300 - index,
      position: { x: index * 2, y: 1, z: -index },
    })),
    supplyFeedbackCues: [{
      schemaVersion: 1,
      id: 'survival:supply-cue-v1:4-4:expired',
      kind: 'expired',
      sourceEventIds: ['supply-source-4'],
      tick: 1199,
      sequenceStart: 4,
      sequenceEnd: 4,
      supplyId: 'supply-older',
      equipmentInstanceId: 'supply-older:equipment',
      participantId: null,
      previousEquipmentInstanceId: null,
      nextEquipmentInstanceId: null,
      runtimeEquipmentDefinitionId: 'arena-v2.weapon.heavy-hammer.survival-level-3.candidate.v1',
      collectionEquipmentDefinitionId: 'arena-v2.weapon.heavy-hammer.candidate.v1',
      survivalLevel: 3,
    }],
    weaponFeedbackEvents: [{
      id: 'presentation:weapon-feedback:event-7',
      type: 'WeaponFeedbackPresented',
      tick: 1200,
      sequence: 7,
      sourceEventId: 'event-7',
      action: 'line-suppressor-ground',
      targetId: 'enemy-1',
      attackerId: 'player',
      feedbackKind: 'hit-surface-transfer',
      title: '命中·落点改变',
      explanation: '目标落点已经改变。',
      visualCue: 'impact-surface-transfer',
      audioCue: 'weapon-transfer',
      emphasis: 'strong',
    }],
    modeFeedbackEvents: [],
    result: null,
  };
}

function duelHud(): ArenaV2ModeHudViewModelV1 {
  const base = survivalHud();
  const localParticipant = {
    ...base.localParticipant,
    lives: 2,
    survivalLevel: null,
  };
  const opponent = {
    participantId: 'opponent',
    lives: 2,
    status: 'active',
    heldCollectionEquipmentDefinitionId: 'arena-v2.weapon.heavy-hammer.candidate.v1',
    survivalLevel: null,
    cooldownRemainingTicks: 0,
  };
  return {
    ...base,
    modeDefinitionId: 'arena.mode.duel.v1',
    localParticipant,
    participantIdentities: [{
      ...base.participantIdentities[0]!,
      modeRole: 'competitor',
    }, {
      participantId: 'opponent',
      displayName: '对手',
      portraitKey: 'portrait.opponent',
      appearanceKey: 'appearance.opponent',
      identityOrdinal: 2,
      identityGlyphKey: 'glyph.2',
      identityPatternKey: 'pattern.2',
      modeRole: 'competitor',
      teamId: null,
      local: false,
    }],
    mode: {
      kind: 'duel',
      mapDefinitionId: 'arena-v2-kz-base-map.candidate.v1',
      mapDisplayName: 'KZ 十二段竞技路线',
      suddenDeath: false,
      participants: [localParticipant, opponent],
    },
    supplyCadence: null,
    supplyMarkers: [],
    supplyFeedbackCues: [],
    weaponFeedbackEvents: [],
    modeFeedbackEvents: [],
  };
}

function raceHud(): ArenaV2ModeHudViewModelV1 {
  const base = survivalHud();
  const participantIds = ['p1', 'p2', 'p3', 'p4'];
  return {
    ...base,
    modeDefinitionId: 'arena.mode.race.v1',
    supplyCadence: null,
    localParticipant: { ...base.localParticipant, participantId: 'p1' },
    participantIdentities: participantIds.map((participantId, index) => ({
      participantId,
      displayName: `玩家${index + 1}`,
      portraitKey: `portrait.${index + 1}`,
      appearanceKey: `appearance.${index + 1}`,
      identityOrdinal: index + 1,
      identityGlyphKey: `glyph.${index + 1}`,
      identityPatternKey: `pattern.${index + 1}`,
      modeRole: 'competitor' as const,
      teamId: null,
      local: index === 0,
    })),
    mode: {
      kind: 'race',
      mapDefinitionId: 'arena-v2-kz-base-map.candidate.v1',
      mapDisplayName: 'KZ 十二段竞技路线',
      segmentCount: 12,
      finishGateId: 'finish',
      participants: participantIds.map((participantId, index) => ({
        participantId,
        status: index === 0 ? 'racing' as const : 'respawning' as const,
        progressOrdinal: 12 - index,
        completedSegmentCount: 12 - index,
        routeTarget: index === 0
          ? { kind: 'finish-gate' as const }
          : {
            kind: 'segment' as const,
            segmentDefinitionId: `segment-${13 - index}`,
            ordinal: 13 - index,
            displayName: `路段${13 - index}`,
            lesson: `练习路段${13 - index}`,
            experienceBeat: 'test' as const,
            experienceIntensity: 4 as const,
            landmarkCue: 'narrow-bridge',
            memoryHook: '守住窄桥落点',
          },
        rank: index + 1,
        respawnReadyTick: index === 0 ? null : 1210,
        finishTick: null,
      })),
    },
    supplyMarkers: [],
    supplyFeedbackCues: [],
    weaponFeedbackEvents: [],
    modeFeedbackEvents: [],
  };
}

function feedbackSourceEvent(id: string, sequence: number, tick: number) {
  return {
    id,
    sequence,
    tick,
    type: 'WeaponFeedbackResolved',
    kind: 'hit-surface-transfer',
    attackerId: 'player',
    targetId: 'enemy-1',
    actionDefinitionId: 'line-suppressor-ground',
    actionStartedTick: tick,
    firstHitTick: tick,
    targetFallTick: null,
    initialSupportSurfaceId: 'surface-a',
    finalSupportSurfaceId: 'surface-b',
    fallCause: null,
    creditedAttackerId: null,
  };
}

describe('Arena V2 mode HUD render/layout V1', () => {
  it('raises every local received weapon impact to warning emphasis', () => {
    const context = {
      localParticipantId: 'player',
      participantIdentities: survivalHud().participantIdentities,
      modeKind: 'survival' as const,
    };
    const base = survivalHud().weaponFeedbackEvents[0]!;
    expect(projectArenaV2ModeHudWeaponFeedbackEmphasisV1(context, {
      ...base,
      feedbackKind: 'hit-confirm',
      targetId: 'player',
      emphasis: 'normal',
    })).toBe('warning');
    expect(projectArenaV2ModeHudWeaponFeedbackEmphasisV1(context, {
      ...base,
      feedbackKind: 'hit-surface-transfer',
      targetId: 'player',
      emphasis: 'strong',
    })).toBe('warning');
    expect(projectArenaV2ModeHudWeaponFeedbackEmphasisV1(context, {
      ...base,
      feedbackKind: 'hit-ring-out',
      targetId: 'player',
      emphasis: 'strong',
    })).toBe('warning');
    expect(projectArenaV2ModeHudWeaponFeedbackEmphasisV1(context, {
      ...base,
      feedbackKind: 'hit-ring-out',
      targetId: 'enemy-1',
      emphasis: 'strong',
    })).toBe('strong');
  });

  it('keeps authority tick, three world anchors and silent static fallback', () => {
    const renderModel = createArenaV2ModeHudRenderModelV1(survivalHud(), {
      reducedMotion: true,
      soundEnabled: false,
    });
    expect(renderModel.primaryTimer.valueText).toBe('01:20');
    expect(renderModel.supplyItems).toHaveLength(3);
    expect(renderModel.supplyItems[0]).toMatchObject({
      remainingTicks: 300,
      remainingTickText: '5秒',
      worldPosition: { x: 0, y: 1, z: 0 },
      coreVerbText: '压制',
    });
    expect(renderModel.modeFacts.find(({ id }) => id === 'survival-next-supply'))
      .toMatchObject({ valueText: '3把 · 5秒' });
    expect(renderModel.localFacts.find(({ id }) => id === 'local-weapon')).toMatchObject({
      valueText: '线性压制器 · Lv.3 · 按一下 · 练平台入口',
      fixedWidthNumeric: false,
    });
    expect(renderModel.localFacts.find(
      ({ id }) => id === 'local-weapon',
    )?.accessibilityText).toContain('操作：按下攻击开始出招');
    expect(renderModel.localFacts.find(
      ({ id }) => id === 'local-weapon',
    )?.accessibilityText).toContain('第1段·起步平台');
    expect(renderModel.feedbackItems.find(({ category }) => category === 'weapon')).toMatchObject({
      title: '你改变了敌人的落点',
      audioCue: 'weapon-transfer',
      motionPolicy: 'standard',
    });
    expect(renderModel.feedbackItems.find(({ category }) => category === 'supply')).toMatchObject({
      title: '重锤 · Lv.3已消失',
      visualCue: 'supply-expired',
    });
    const feedback = advanceArenaV2ModeHudFeedbackQueueV1(renderModel, null);
    expect(feedback.visibleItems).toHaveLength(2);
    expect(feedback.visibleItems.every(({ motionPolicy }) => motionPolicy === 'static')).toBe(true);
    expect(feedback.oneShotAudioCues).toHaveLength(0);
    expect(
      advanceArenaV2ModeHudFeedbackQueueV1(renderModel, feedback.state).oneShotAudioCues,
    ).toHaveLength(0);

    const layout = createArenaV2ModeHudLayoutV1(
      renderModel,
      feedback,
      {
        width: 390,
        height: 844,
        safeAreaInsets: { top: 47, right: 0, bottom: 34, left: 0 },
      },
      { reservedInputBottomCssPixels: 176 },
    );
    expect(layout.supplyItemRects).toHaveLength(3);
    expect(layout.inputReservedRect).not.toBeNull();
    expect(layout.feedbackRect!.y + layout.feedbackRect!.height)
      .toBeLessThanOrEqual(layout.inputReservedRect!.y);
    expect(layout.horizontalOverflowAllowed).toBe(false);
    expect(layout.primaryTimerRect.width).toBeGreaterThanOrEqual(
      ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1.primaryClock
        .minimumWidthCssPixels.narrow,
    );
    const plan = createArenaV2ModeHudRenderPlanV1(renderModel, feedback, layout);
    expect(plan.primitives.filter(({ id }) => id.endsWith(':name'))).toHaveLength(3);
    expect(plan.primitives.filter(({ id }) => id.endsWith(':time'))).toHaveLength(3);
    expect(plan.primitives.find(({ id }) => id === 'hud:supply:supply-0:time'))
      .toMatchObject({ text: 'Lv.3 · 5秒', fixedWidthNumeric: true });
    const persistentWeapon = plan.primitives.find(
      ({ id }) => id === 'hud:local:local-weapon',
    );
    expect(persistentWeapon).toMatchObject({
      kind: 'text',
      maximumLines: 1,
      text: '武器  线性压制器 · Lv.3 · 按一下 · 练平台入口',
      accessibilityText: expect.stringContaining('第1段·起步平台'),
    });
    const canvasHost = measuredCanvasPort();
    const canvasResult = paintArenaV2UiRenderPlanV1(canvasHost.port, plan);
    expect(canvasResult.truncatedTextPrimitiveIds).toContain('hud:local:local-weapon');
    expect(canvasHost.text.some((value) => value.endsWith('…'))).toBe(true);

    const learningRenderModel = Object.freeze({
      ...renderModel,
      feedbackItems: Object.freeze(renderModel.feedbackItems.map((item) => (
        item.category !== 'weapon' ? item : Object.freeze({
          ...item,
          title: `轻击 · 重锤·地面：${item.title}`,
          explanation: '本招用途：地面正面重击，制造最高的一次性水平击退。'
            + item.explanation,
        })
      ))),
    });
    const learningFeedback = advanceArenaV2ModeHudFeedbackQueueV1(learningRenderModel, null);
    const learningLayout = createArenaV2ModeHudLayoutV1(
      learningRenderModel,
      learningFeedback,
      {
        width: 390,
        height: 844,
        safeAreaInsets: { top: 47, right: 0, bottom: 34, left: 0 },
      },
      { reservedInputBottomCssPixels: 176 },
    );
    const learningPlan = createArenaV2ModeHudRenderPlanV1(
      learningRenderModel,
      learningFeedback,
      learningLayout,
    );
    expect(learningPlan.primitives.find(({ id }) => id.endsWith(':title'))).toMatchObject({
      text: expect.stringMatching(/^轻击/),
      role: 'feedback-primary',
      maximumLines: 2,
    });
    expect(learningPlan.primitives.find(({ id }) => id.endsWith(':explanation'))).toMatchObject({
      text: expect.stringMatching(/^本招用途：/),
      role: 'feedback-learning',
      maximumLines: 3,
    });
    expect(learningPlan.primitives.some(({ id }) => id.endsWith(':secondary'))).toBe(false);

    const counterplayRenderModel = Object.freeze({
      ...renderModel,
      feedbackItems: Object.freeze(renderModel.feedbackItems.map((item, index) => (
        item.category !== 'weapon' ? Object.freeze({
          ...item,
          emphasis: 'strong' as const,
          tick: item.tick + 20 + index,
        }) : Object.freeze({
          ...item,
          emphasis: 'normal' as const,
          explanation: '下次可改变方向或跳跃离开；对方弱点：挥空后恢复较长。你的最终支撑面和路线位置已经转移。',
        })
      ))),
    });
    const counterplayFeedback = advanceArenaV2ModeHudFeedbackQueueV1(
      counterplayRenderModel,
      null,
    );
    const counterplayLayout = createArenaV2ModeHudLayoutV1(
      counterplayRenderModel,
      counterplayFeedback,
      {
        width: 390,
        height: 844,
        safeAreaInsets: { top: 47, right: 0, bottom: 34, left: 0 },
      },
      { reservedInputBottomCssPixels: 176 },
    );
    const counterplayPlan = createArenaV2ModeHudRenderPlanV1(
      counterplayRenderModel,
      counterplayFeedback,
      counterplayLayout,
    );
    expect(counterplayPlan.primitives.find(({ id }) => id.endsWith(':explanation')))
      .toMatchObject({
        text: expect.stringMatching(/^下次可/),
        role: 'feedback-learning',
        maximumLines: 3,
      });
    expect(counterplayPlan.primitives.some(({ id }) => id.endsWith(':secondary'))).toBe(false);

    const warningRenderModel = Object.freeze({
      ...counterplayRenderModel,
      feedbackItems: Object.freeze(counterplayRenderModel.feedbackItems.map((item) => (
        item.category === 'mode' ? Object.freeze({
          ...item,
          emphasis: 'warning' as const,
          explanation: '下一次掉落将结束本局。',
        }) : item
      ))),
    });
    const warningFeedback = advanceArenaV2ModeHudFeedbackQueueV1(warningRenderModel, null);
    const warningLayout = createArenaV2ModeHudLayoutV1(
      warningRenderModel,
      warningFeedback,
      {
        width: 390,
        height: 844,
        safeAreaInsets: { top: 47, right: 0, bottom: 34, left: 0 },
      },
      { reservedInputBottomCssPixels: 176 },
    );
    const warningPlan = createArenaV2ModeHudRenderPlanV1(
      warningRenderModel,
      warningFeedback,
      warningLayout,
    );
    expect(warningPlan.primitives.find(({ id }) => id.endsWith(':explanation')))
      .toMatchObject({ text: '下一次掉落将结束本局。' });
  });

  it('keeps sub-second countdowns and zero cooldown ready text in stable slots', () => {
    const source = survivalHud();
    const subSecond = createArenaV2ModeHudRenderModelV1({
      ...source,
      preparationRemainingTicks: 1,
      localParticipant: { ...source.localParticipant, cooldownRemainingTicks: 1 },
    }, { reducedMotion: true, soundEnabled: false });
    expect(subSecond.preparationTimer?.valueText).toBe('0.1秒');
    expect(subSecond.localFacts.find(({ id }) => id === 'local-cooldown'))
      .toMatchObject({ valueText: '0.1秒', fixedWidthNumeric: true });

    const ready = createArenaV2ModeHudRenderModelV1({
      ...source,
      localParticipant: { ...source.localParticipant, cooldownRemainingTicks: 0 },
    }, { reducedMotion: true, soundEnabled: false });
    expect(ready.localFacts.find(({ id }) => id === 'local-cooldown'))
      .toMatchObject({ valueText: '就绪', accessibilityText: '武器已经就绪' });
    expect(ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1).toMatchObject({
      status: 'production-unreachable',
      validationStatus: 'not-run',
      authorityTickFieldsRemainReadOnly: true,
      numeralGlyphs: { policy: 'tabular-monospace' },
      accessibility: {
        liveAnnounceEveryCountdownStep: false,
        mutedRemovesTimeFacts: false,
      },
    });
  });

  it('keeps hold-release readable beside the current weapon in every mode HUD', () => {
    const source = survivalHud();
    const renderModel = createArenaV2ModeHudRenderModelV1({
      ...source,
      localParticipant: {
        ...source.localParticipant,
        heldCollectionEquipmentDefinitionId: 'arena-v2.weapon.read-counter.candidate.v1',
        survivalLevel: null,
      },
    }, { reducedMotion: false, soundEnabled: true });
    expect(renderModel.localFacts.find(({ id }) => id === 'local-weapon')).toMatchObject({
      valueText: '读招反击器 · 按住松开 · 练边缘',
    });
    const operationRead = renderModel.localFacts.find(
      ({ id }) => id === 'local-weapon',
    )?.accessibilityText;
    expect(operationRead).toContain('按住攻击至少0.1秒后松开');
    expect(operationRead).toContain('蓄势中不能转向');
    expect(operationRead).toContain('地面：');
    expect(operationRead).toContain('空中：');
    expect(operationRead).toContain('边缘（第2段·定向断层）');
  });

  it('keeps the duel current weapon connected to the authority map without another HUD fact', () => {
    const source = duelHud();
    const renderModel = createArenaV2ModeHudRenderModelV1(source, {
      reducedMotion: false,
      soundEnabled: true,
    });
    expect(renderModel.localFacts).toHaveLength(3);
    expect(renderModel.localFacts.find(({ id }) => id === 'local-weapon')).toMatchObject({
      valueText: '线性压制器 · 按一下 · 练平台入口',
      fixedWidthNumeric: false,
    });
    const weaponRead = renderModel.localFacts.find(
      ({ id }) => id === 'local-weapon',
    )?.accessibilityText;
    expect(weaponRead).toContain('当前地图KZ 十二段竞技路线');
    expect(weaponRead).toContain('平台入口（第1段·起步平台）');
    expect(renderModel.modeFacts.map(({ id }) => id)).toEqual([
      'participant-identities',
      'duel-opponent-state',
      'duel-opponent-weapon',
      'duel-sudden-death',
    ]);
    expect(renderModel.modeFacts.find(({ id }) => id === 'duel-opponent-weapon'))
      .toMatchObject({
        valueText: '重锤 · 反制变向/跳开',
        accessibilityText: '对手当前武器重锤。可用变向或跳开规避地面攻击',
      });

    if (source.mode.kind !== 'duel') throw new Error('测试夹具必须是1v1模式。');
    const unarmed = createArenaV2ModeHudRenderModelV1({
      ...source,
      localParticipant: {
        ...source.localParticipant,
        heldCollectionEquipmentDefinitionId: null,
      },
      mode: {
        ...source.mode,
        participants: source.mode.participants.map((participant) => (
          participant.participantId !== source.localParticipant.participantId
            ? participant
            : { ...participant, heldCollectionEquipmentDefinitionId: null }
        )),
      },
    }, { reducedMotion: false, soundEnabled: true });
    expect(unarmed.localFacts.find(({ id }) => id === 'local-weapon')).toMatchObject({
      valueText: '无武器',
      accessibilityText: '当前无武器',
    });

    expect(() => createArenaV2ModeHudRenderModelV1({
      ...source,
      mode: { ...source.mode, mapDisplayName: '漂移地图名' },
    }, { reducedMotion: false, soundEnabled: true })).toThrow(/1v1地图.*显示身份漂移/);
  });

  it('starts restored HUD epochs without replaying history and rejects old generations', () => {
    const source = survivalHud();
    const baseline: ArenaV2ModeHudViewModelV1 = {
      ...source,
      supplyFeedbackCues: [],
      weaponFeedbackEvents: [],
      modeFeedbackEvents: [],
    };
    const epoch = new ArenaV2ModeHudConsumerEpochV1();
    const first = epoch.beginEpoch({
      consumerEpochId: 'runtime-generation-a',
      baselineModel: baseline,
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(first.feedback.oneShotAudioCues).toEqual([]);
    expect(first.feedback.liveAnnouncements).toEqual([]);
    expect(epoch.consume({
      consumerEpochId: 'runtime-generation-a',
      model: baseline,
      sourceEvents: [],
      preferences: { reducedMotion: false, soundEnabled: true },
    }).feedback.oneShotAudioCues).toEqual([]);

    const next = epoch.consume({
      consumerEpochId: 'runtime-generation-a',
      model: {
        ...baseline,
        tick: baseline.tick + 1,
        eventSequence: baseline.eventSequence + 1,
        weaponFeedbackEvents: [{
          ...source.weaponFeedbackEvents[0]!,
          tick: baseline.tick,
          sequence: baseline.eventSequence,
          sourceEventId: 'event-after-restore',
        }],
      },
      sourceEvents: [feedbackSourceEvent(
        'event-after-restore',
        baseline.eventSequence,
        baseline.tick,
      )],
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(next.feedback.oneShotAudioCues).toEqual([
      {
        sourceEventId: 'event-after-restore',
        cueId: 'weapon-transfer',
        actionDefinitionId: 'line-suppressor-ground',
        emphasis: 'strong',
        voicePriority: 3,
      },
    ]);
    epoch.beginEpoch({
      consumerEpochId: 'runtime-generation-b',
      baselineModel: {
        ...baseline,
        tick: baseline.tick + 1,
        eventSequence: baseline.eventSequence + 1,
      },
      preferences: { reducedMotion: true, soundEnabled: false },
    });
    expect(() => epoch.consume({
      consumerEpochId: 'runtime-generation-a',
      model: baseline,
      sourceEvents: [],
      preferences: { reducedMotion: false, soundEnabled: true },
    })).toThrow(/旧generation/);
    epoch.dispose();
    expect(epoch.state).toBe(ARENA_V2_MODE_HUD_CONSUMER_EPOCH_STATE_V1.DISPOSED);
  });

  it('fails closed when a restored epoch tries to replay an event below its waterline', () => {
    const source = survivalHud();
    const baseline: ArenaV2ModeHudViewModelV1 = {
      ...source,
      supplyFeedbackCues: [],
      weaponFeedbackEvents: [],
      modeFeedbackEvents: [],
    };
    const epoch = new ArenaV2ModeHudConsumerEpochV1();
    epoch.beginEpoch({
      consumerEpochId: 'runtime-generation-a',
      baselineModel: baseline,
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(() => epoch.consume({
      consumerEpochId: 'runtime-generation-a',
      model: {
        ...baseline,
        tick: baseline.tick + 1,
        eventSequence: baseline.eventSequence + 1,
        weaponFeedbackEvents: [{
          ...source.weaponFeedbackEvents[0]!,
          tick: baseline.tick,
          sequence: baseline.eventSequence - 1,
          sourceEventId: 'historical-event',
        }],
      },
      sourceEvents: [feedbackSourceEvent(
        'current-event',
        baseline.eventSequence,
        baseline.tick,
      )],
      preferences: { reducedMotion: false, soundEnabled: true },
    })).toThrow(/消费失败/);
    expect(epoch.state).toBe(ARENA_V2_MODE_HUD_CONSUMER_EPOCH_STATE_V1.FAILED);
  });

  it('rejects future HUD fields and event waterline jumps without a complete batch', () => {
    const source = survivalHud();
    const baseline: ArenaV2ModeHudViewModelV1 = {
      ...source,
      supplyFeedbackCues: [],
      weaponFeedbackEvents: [],
      modeFeedbackEvents: [],
    };
    const futureFieldEpoch = new ArenaV2ModeHudConsumerEpochV1();
    expect(() => futureFieldEpoch.beginEpoch({
      consumerEpochId: 'future-field',
      baselineModel: { ...baseline, future: true },
      preferences: { reducedMotion: false, soundEnabled: true },
    })).toThrow(/消费失败/);

    const waterlineEpoch = new ArenaV2ModeHudConsumerEpochV1();
    waterlineEpoch.beginEpoch({
      consumerEpochId: 'waterline',
      baselineModel: baseline,
      preferences: { reducedMotion: false, soundEnabled: true },
    });
    expect(() => waterlineEpoch.consume({
      consumerEpochId: 'waterline',
      model: {
        ...baseline,
        tick: baseline.tick + 1,
        eventSequence: baseline.eventSequence + 1,
      },
      sourceEvents: [],
      preferences: { reducedMotion: false, soundEnabled: true },
    })).toThrow(/消费失败/);
    expect(waterlineEpoch.state).toBe(ARENA_V2_MODE_HUD_CONSUMER_EPOCH_STATE_V1.FAILED);
  });

  it('emits each authority feedback audio cue only once', () => {
    const renderModel = createArenaV2ModeHudRenderModelV1(survivalHud(), {
      reducedMotion: false,
      soundEnabled: true,
    });
    const first = advanceArenaV2ModeHudFeedbackQueueV1(renderModel, null);
    expect(first.oneShotAudioCues.map(({ sourceEventId }) => sourceEventId)).toEqual([
      'survival:supply-cue-v1:4-4:expired',
      'event-7',
    ]);
    expect(first.visibleItems).toHaveLength(2);

    const repeated = advanceArenaV2ModeHudFeedbackQueueV1(renderModel, first.state);
    expect(repeated.oneShotAudioCues).toEqual([]);
    expect(repeated.liveAnnouncements).toEqual([]);
    expect(repeated.visibleItems).toHaveLength(2);
  });

  it('announces retained feedback when it first becomes visible and never repeats it', () => {
    const base = createArenaV2ModeHudRenderModelV1(survivalHud(), {
      reducedMotion: false,
      soundEnabled: true,
    });
    const terminal = (
      sourceEventId: string,
      sequence: number,
      visualCue: string,
    ) => Object.freeze({
      sourceEventId,
      tick: 0,
      sequence,
      category: 'mode' as const,
      anchorParticipantId: null,
      attackerParticipantId: null,
      targetParticipantId: null,
      anchorWorldPosition: null,
      actionDefinitionId: null,
      perspective: 'global' as const,
      title: sourceEventId,
      explanation: `${sourceEventId} explanation`,
      emphasis: 'strong' as const,
      visualCue,
      audioCue: null,
      motionPolicy: 'standard' as const,
    });
    const localHit = Object.freeze({
      sourceEventId: 'retained-local-hit',
      tick: 90,
      sequence: 4,
      category: 'weapon' as const,
      anchorParticipantId: 'enemy',
      attackerParticipantId: 'player',
      targetParticipantId: 'enemy',
      anchorWorldPosition: null,
      actionDefinitionId: 'weapon-action',
      perspective: 'local-involved' as const,
      title: '延迟露出的本地命中',
      explanation: '终局反馈离场后才首次可见',
      emphasis: 'normal' as const,
      visualCue: 'impact-confirm',
      audioCue: null,
      motionPolicy: 'standard' as const,
    });
    const congested = advanceArenaV2ModeHudFeedbackQueueV1(Object.freeze({
      ...base,
      tick: 100,
      feedbackItems: Object.freeze([
        terminal('match-ended', 1, 'match-ended'),
        terminal('race-finish', 2, 'race-finish-claimed'),
        terminal('survival-terminal', 3, 'survival-terminal-fall'),
        localHit,
      ]),
    }), null);

    expect(congested.visibleItems.map(({ sourceEventId }) => sourceEventId)).not.toContain(
      localHit.sourceEventId,
    );
    expect(congested.liveAnnouncements).not.toContain(localHit.title);
    expect(congested.state.seenIdentities.find(({ sourceEventId }) => (
      sourceEventId === localHit.sourceEventId
    ))?.announced).toBe(false);

    const firstVisible = advanceArenaV2ModeHudFeedbackQueueV1(Object.freeze({
      ...base,
      tick: 181,
      feedbackItems: Object.freeze([]),
    }), congested.state);
    expect(firstVisible.visibleItems.map(({ sourceEventId }) => sourceEventId)).toEqual([
      localHit.sourceEventId,
    ]);
    expect(firstVisible.liveAnnouncements).toEqual([localHit.title]);
    expect(firstVisible.state.seenIdentities.find(({ sourceEventId }) => (
      sourceEventId === localHit.sourceEventId
    ))?.announced).toBe(true);

    const repeated = advanceArenaV2ModeHudFeedbackQueueV1(Object.freeze({
      ...base,
      tick: 182,
      feedbackItems: Object.freeze([]),
    }), firstVisible.state);
    expect(repeated.visibleItems.map(({ sourceEventId }) => sourceEventId)).toEqual([
      localHit.sourceEventId,
    ]);
    expect(repeated.liveAnnouncements).toEqual([]);
  });

  it('applies current feedback preferences without changing or replaying event identity', () => {
    const source = survivalHud();
    const dynamicAudible = createArenaV2ModeHudRenderModelV1(source, {
      reducedMotion: false,
      soundEnabled: true,
    });
    const first = advanceArenaV2ModeHudFeedbackQueueV1(dynamicAudible, null);
    expect(first.visibleItems.every(({ motionPolicy }) => motionPolicy === 'standard')).toBe(true);
    expect(first.oneShotAudioCues.length).toBeGreaterThan(0);

    const staticMuted = createArenaV2ModeHudRenderModelV1(source, {
      reducedMotion: true,
      soundEnabled: false,
    });
    const changed = advanceArenaV2ModeHudFeedbackQueueV1(staticMuted, first.state);
    expect(changed.visibleItems.every(({ motionPolicy }) => motionPolicy === 'static')).toBe(true);
    expect(changed.oneShotAudioCues).toEqual([]);

    const enabledAgain = advanceArenaV2ModeHudFeedbackQueueV1(dynamicAudible, changed.state);
    expect(enabledAgain.visibleItems.every(({ motionPolicy }) => (
      motionPolicy === 'standard'
    ))).toBe(true);
    expect(enabledAgain.oneShotAudioCues).toEqual([]);
  });

  it('rejects active queue state whose event identity or time waterline drifts', () => {
    const renderModel = createArenaV2ModeHudRenderModelV1(survivalHud(), {
      reducedMotion: false,
      soundEnabled: true,
    });
    const first = advanceArenaV2ModeHudFeedbackQueueV1(renderModel, null);
    const active = first.state.entries[0]!;
    expect(() => advanceArenaV2ModeHudFeedbackQueueV1(renderModel, Object.freeze({
      ...first.state,
      entries: Object.freeze([
        Object.freeze({
          ...active,
          item: Object.freeze({ ...active.item, title: 'forged title' }),
        }),
        ...first.state.entries.slice(1),
      ]),
    }))).toThrow(/active entry与首次接受身份漂移/u);

    expect(() => advanceArenaV2ModeHudFeedbackQueueV1(renderModel, Object.freeze({
      ...first.state,
      entries: Object.freeze([
        Object.freeze({ ...active, expiresAtTick: first.state.tick }),
        ...first.state.entries.slice(1),
      ]),
    }))).toThrow(/生命周期发生漂移|不得保留已过期entry/u);

    expect(() => advanceArenaV2ModeHudFeedbackQueueV1(renderModel, Object.freeze({
      ...first.state,
      entries: Object.freeze([
        Object.freeze({ ...active, expiresAtTick: active.expiresAtTick + 1 }),
        ...first.state.entries.slice(1),
      ]),
    }))).toThrow(/生命周期发生漂移/u);

    expect(() => advanceArenaV2ModeHudFeedbackQueueV1(renderModel, Object.freeze({
      ...first.state,
      entries: Object.freeze([
        Object.freeze({
          ...active,
          expiresAtTick: first.state.tick + 2,
          item: Object.freeze({ ...active.item, tick: first.state.tick + 1 }),
        }),
        ...first.state.entries.slice(1),
      ]),
    }))).toThrow(/不能来自未来tick/u);
  });

  it('keeps decisive falls and match results visible ahead of supply congestion', () => {
    const base = createArenaV2ModeHudRenderModelV1(survivalHud(), {
      reducedMotion: false,
      soundEnabled: true,
    });
    const feedbackItem = (
      sourceEventId: string,
      sequence: number,
      category: 'mode' | 'weapon' | 'supply',
      visualCue: string,
      emphasis: 'normal' | 'strong' | 'warning',
    ) => Object.freeze({
      sourceEventId,
      tick: base.tick - 1,
      sequence,
      category,
      anchorParticipantId: null,
      attackerParticipantId: null,
      targetParticipantId: null,
      anchorWorldPosition: null,
      actionDefinitionId: category === 'weapon' ? 'weapon-action' : null,
      perspective: sourceEventId.startsWith('remote-')
        ? 'remote-only' as const
        : 'local-involved' as const,
      title: sourceEventId,
      explanation: `${sourceEventId} explanation`,
      emphasis,
      visualCue,
      audioCue: `${sourceEventId}-audio`,
      motionPolicy: 'standard' as const,
    });
    const congested = Object.freeze({
      ...base,
      feedbackItems: Object.freeze([
        feedbackItem('supply-warning', 1, 'supply', 'supply-expiring', 'warning'),
        feedbackItem('ordinary-mode-warning', 2, 'mode', 'enemy-entered', 'warning'),
        feedbackItem(
          'weapon-ring-out',
          3,
          'weapon',
          'arena.cue.vfx.weapon-feedback.heavy-hammer.ground.hit-ring-out.duel.candidate.v1',
          'strong',
        ),
        feedbackItem('participant-fell', 4, 'mode', 'participant-fell-credited-hit', 'warning'),
        feedbackItem('match-ended', 5, 'mode', 'match-ended', 'strong'),
      ]),
    });
    const projection = advanceArenaV2ModeHudFeedbackQueueV1(congested, null);
    expect(projection.visibleItems.map(({ sourceEventId }) => sourceEventId)).toEqual([
      'weapon-ring-out',
      'participant-fell',
      'match-ended',
    ]);
    expect(projection.oneShotAudioCues.map(({ sourceEventId }) => sourceEventId)).toEqual([
      'weapon-ring-out',
      'participant-fell',
      'match-ended',
    ]);
  });

  it('keeps local-involved feedback ahead of remote-only feedback at the same semantic level', () => {
    const base = createArenaV2ModeHudRenderModelV1(survivalHud(), {
      reducedMotion: false,
      soundEnabled: true,
    });
    const ringOut = (
      sourceEventId: string,
      sequence: number,
      perspective: 'local-involved' | 'remote-only',
    ) => Object.freeze({
      sourceEventId,
      tick: base.tick - 1,
      sequence,
      category: 'weapon' as const,
      anchorParticipantId: perspective === 'local-involved' ? 'player' : `enemy-${sequence}`,
      attackerParticipantId: 'attacker',
      targetParticipantId: perspective === 'local-involved' ? 'player' : `enemy-${sequence}`,
      anchorWorldPosition: null,
      actionDefinitionId: 'weapon-action',
      perspective,
      title: sourceEventId,
      explanation: `${sourceEventId} explanation`,
      emphasis: 'strong' as const,
      visualCue: 'ring-out',
      audioCue: `${sourceEventId}-audio`,
      motionPolicy: 'standard' as const,
    });
    const projection = advanceArenaV2ModeHudFeedbackQueueV1(Object.freeze({
      ...base,
      feedbackItems: Object.freeze([
        ringOut('remote-ring-out-1', 1, 'remote-only'),
        ringOut('remote-ring-out-2', 2, 'remote-only'),
        ringOut('remote-ring-out-3', 3, 'remote-only'),
        ringOut('local-ring-out', 4, 'local-involved'),
      ]),
    }), null);
    expect(projection.visibleItems.map(({ sourceEventId }) => sourceEventId)).toEqual([
      'remote-ring-out-2',
      'remote-ring-out-3',
      'local-ring-out',
    ]);
    expect(projection.oneShotAudioCues.map(({ sourceEventId }) => sourceEventId)).toContain(
      'local-ring-out',
    );
    expect(projection.oneShotAudioCues.every(({ voicePriority }) => (
      voicePriority === 3
    ))).toBe(true);
  });

  it('keeps one local weapon visual and bounded audio without displacing terminal slots', () => {
    const base = createArenaV2ModeHudRenderModelV1(survivalHud(), {
      reducedMotion: false,
      soundEnabled: true,
    });
    const feedbackItem = (
      sourceEventId: string,
      sequence: number,
      category: 'mode' | 'weapon',
      visualCue: string,
      perspective: 'local-involved' | 'remote-only',
    ) => Object.freeze({
      sourceEventId,
      tick: base.tick - 1,
      sequence,
      category,
      anchorParticipantId: null,
      attackerParticipantId: null,
      targetParticipantId: null,
      anchorWorldPosition: null,
      actionDefinitionId: category === 'weapon' ? 'weapon-action' : null,
      perspective,
      title: sourceEventId,
      explanation: `${sourceEventId} explanation`,
      emphasis: category === 'weapon' ? 'normal' as const : 'warning' as const,
      visualCue,
      audioCue: `${sourceEventId}-audio`,
      motionPolicy: 'standard' as const,
    });
    const projection = advanceArenaV2ModeHudFeedbackQueueV1(Object.freeze({
      ...base,
      feedbackItems: Object.freeze([
        feedbackItem('remote-hit', 0, 'weapon', 'impact-confirm', 'remote-only'),
        feedbackItem('local-hit', 1, 'weapon', 'impact-confirm', 'local-involved'),
        feedbackItem('terminal-fall', 2, 'mode', 'survival-terminal-fall', 'remote-only'),
        feedbackItem('participant-fell', 3, 'mode', 'participant-fell-credited-hit', 'remote-only'),
        feedbackItem('match-ended', 4, 'mode', 'match-ended', 'remote-only'),
      ]),
    }), null);

    expect(projection.visibleItems.map(({ sourceEventId }) => sourceEventId)).toEqual([
      'local-hit',
      'terminal-fall',
      'match-ended',
    ]);
    expect(projection.oneShotAudioCues.map(({ sourceEventId }) => sourceEventId)).toEqual([
      'local-hit',
      'terminal-fall',
      'participant-fell',
      'match-ended',
    ]);
    expect(projection.oneShotAudioCues.some(({ sourceEventId }) => (
      sourceEventId === 'remote-hit'
    ))).toBe(false);
    expect(projection.oneShotAudioCues).toHaveLength(4);
  });

  it('reserves the local weapon slot for a resolved impact before a newer evaded attack', () => {
    const base = createArenaV2ModeHudRenderModelV1(survivalHud(), {
      reducedMotion: false,
      soundEnabled: true,
    });
    const item = (
      sourceEventId: string,
      sequence: number,
      category: 'mode' | 'weapon',
      visualCue: string,
      perspective: 'local-involved' | 'remote-only',
    ) => Object.freeze({
      sourceEventId,
      tick: base.tick - 1,
      sequence,
      category,
      anchorParticipantId: null,
      attackerParticipantId: null,
      targetParticipantId: null,
      anchorWorldPosition: null,
      actionDefinitionId: category === 'weapon' ? 'weapon-action' : null,
      perspective,
      title: sourceEventId,
      explanation: `${sourceEventId} explanation`,
      emphasis: category === 'weapon' ? 'normal' as const : 'warning' as const,
      visualCue,
      audioCue: `${sourceEventId}-audio`,
      motionPolicy: 'standard' as const,
    });
    const projection = advanceArenaV2ModeHudFeedbackQueueV1(Object.freeze({
      ...base,
      feedbackItems: Object.freeze([
        item('local-impact', 1, 'weapon', 'impact-confirm', 'local-involved'),
        item('local-evaded', 2, 'weapon', 'evaded-warning', 'local-involved'),
        item('pressure-1', 3, 'mode', 'enemy-entered', 'remote-only'),
        item('pressure-2', 4, 'mode', 'participant-fell-credited-hit', 'remote-only'),
        item('pressure-3', 5, 'mode', 'survival-first-fall', 'remote-only'),
      ]),
    }), null);

    expect(projection.visibleItems.map(({ sourceEventId }) => sourceEventId)).toContain(
      'local-impact',
    );
    expect(projection.visibleItems.map(({ sourceEventId }) => sourceEventId)).not.toContain(
      'local-evaded',
    );
    expect(projection.oneShotAudioCues.map(({ sourceEventId }) => sourceEventId)).toContain(
      'local-evaded',
    );
    const evadedOnly = advanceArenaV2ModeHudFeedbackQueueV1(Object.freeze({
      ...base,
      feedbackItems: Object.freeze([
        item('local-evaded', 2, 'weapon', 'evaded-warning', 'local-involved'),
        item('pressure-1', 3, 'mode', 'enemy-entered', 'remote-only'),
        item('pressure-2', 4, 'mode', 'participant-fell-credited-hit', 'remote-only'),
        item('pressure-3', 5, 'mode', 'survival-first-fall', 'remote-only'),
      ]),
    }), null);
    expect(evadedOnly.visibleItems.map(({ sourceEventId }) => sourceEventId)).toContain(
      'local-evaded',
    );
  });

  it('does not let a local movement fall claim the weapon-action reservation', () => {
    const base = createArenaV2ModeHudRenderModelV1(survivalHud(), {
      reducedMotion: false,
      soundEnabled: true,
    });
    const feedbackItem = (
      sourceEventId: string,
      sequence: number,
      category: 'mode' | 'weapon',
      visualCue: string,
      emphasis: 'normal' | 'strong' | 'warning',
      perspective: 'local-involved' | 'remote-only',
      actionDefinitionId: string | null,
    ) => Object.freeze({
      sourceEventId,
      tick: base.tick - 1,
      sequence,
      category,
      anchorParticipantId: null,
      attackerParticipantId: null,
      targetParticipantId: null,
      anchorWorldPosition: null,
      actionDefinitionId,
      perspective,
      title: sourceEventId,
      explanation: `${sourceEventId} explanation`,
      emphasis,
      visualCue,
      audioCue: `${sourceEventId}-audio`,
      motionPolicy: 'standard' as const,
    });
    const projection = advanceArenaV2ModeHudFeedbackQueueV1(Object.freeze({
      ...base,
      feedbackItems: Object.freeze([
        feedbackItem(
          'local-movement-fall',
          1,
          'weapon',
          'movement-fall-warning',
          'normal',
          'local-involved',
          null,
        ),
        feedbackItem(
          'remote-strong-impact',
          2,
          'weapon',
          'impact-confirm',
          'strong',
          'remote-only',
          'remote-action',
        ),
        feedbackItem(
          'decisive-fall',
          3,
          'mode',
          'participant-fell-credited-hit',
          'warning',
          'remote-only',
          null,
        ),
        feedbackItem(
          'first-fall',
          4,
          'mode',
          'survival-first-fall',
          'warning',
          'remote-only',
          null,
        ),
      ]),
    }), null);

    expect(projection.visibleItems.map(({ sourceEventId }) => sourceEventId)).toContain(
      'remote-strong-impact',
    );
    expect(projection.visibleItems.map(({ sourceEventId }) => sourceEventId)).not.toContain(
      'local-movement-fall',
    );
  });

  it('teaches the local pickup gesture without turning remote pickups into tutorials', () => {
    const source = survivalHud();
    const cue = source.supplyFeedbackCues[0]!;
    const localPickup = createArenaV2ModeHudRenderModelV1({
      ...source,
      supplyFeedbackCues: [{
        ...cue,
        id: 'local-read-counter-pickup',
        kind: 'picked-up',
        participantId: 'player',
        collectionEquipmentDefinitionId: 'arena-v2.weapon.read-counter.candidate.v1',
        runtimeEquipmentDefinitionId: 'arena-v2.weapon.read-counter.survival-level-3.candidate.v1',
      }],
    }, { reducedMotion: false, soundEnabled: true });
    expect(localPickup.feedbackItems.find(({ sourceEventId }) => (
      sourceEventId === 'local-read-counter-pickup'
    ))).toMatchObject({
      title: '你已拾取读招反击器 · Lv.3',
    });
    expect(localPickup.feedbackItems.find(({ sourceEventId }) => (
      sourceEventId === 'local-read-counter-pickup'
    ))?.explanation).toContain('按住攻击至少0.1秒后松开，蓄势中不能转向；最迟0.2秒自动释放');
    expect(localPickup.feedbackItems.find(({ sourceEventId }) => (
      sourceEventId === 'local-read-counter-pickup'
    ))?.explanation).toMatch(/^当前地图KZ 十二段竞技路线：优先找/);
    expect(localPickup.feedbackItems.find(({ sourceEventId }) => (
      sourceEventId === 'local-read-counter-pickup'
    ))?.explanation).toContain('第2段·定向断层');
    expect(localPickup.feedbackItems.find(({ sourceEventId }) => (
      sourceEventId === 'local-read-counter-pickup'
    ))?.explanation).toContain('地面：');
    expect(localPickup.feedbackItems.find(({ sourceEventId }) => (
      sourceEventId === 'local-read-counter-pickup'
    ))?.explanation).toContain('空中：');

    const remotePickup = createArenaV2ModeHudRenderModelV1({
      ...source,
      participantIdentities: [
        ...source.participantIdentities,
        {
          participantId: 'remote', displayName: '对手', portraitKey: 'portrait.remote',
          appearanceKey: 'appearance.remote', identityOrdinal: 2,
          identityGlyphKey: 'glyph.2', identityPatternKey: 'pattern.2',
          modeRole: 'player', teamId: null, local: false,
        },
      ],
      supplyFeedbackCues: [{
        ...cue,
        id: 'remote-read-counter-pickup',
        kind: 'picked-up',
        participantId: 'remote',
        collectionEquipmentDefinitionId: 'arena-v2.weapon.read-counter.candidate.v1',
        runtimeEquipmentDefinitionId: 'arena-v2.weapon.read-counter.survival-level-3.candidate.v1',
      }],
    }, { reducedMotion: false, soundEnabled: true });
    const remoteExplanation = remotePickup.feedbackItems.find(({ sourceEventId }) => (
      sourceEventId === 'remote-read-counter-pickup'
    ))?.explanation;
    expect(remoteExplanation).toContain('已成为对手 [2]的当前武器');
    expect(remoteExplanation).not.toContain('按住攻击');
    expect(remoteExplanation).not.toContain('地面：');
  });

  it('keeps 2-4 player identity visible without relying on color', () => {
    const renderModel = createArenaV2ModeHudRenderModelV1(raceHud(), {
      reducedMotion: false,
      soundEnabled: true,
    });
    expect(renderModel.participantIdentities).toHaveLength(4);
    expect(renderModel.modeFacts.find(({ id }) => id === 'participant-identities')).toMatchObject({
      valueText: '你[1] · 玩家2[2] · 玩家3[3] · 玩家4[4]',
      fixedWidthNumeric: false,
    });
    expect(
      renderModel.modeFacts.find(({ id }) => id === 'participant-identities')?.accessibilityText,
    ).toContain('符号glyph.4，纹理pattern.4');
    expect(renderModel.modeFacts.find(({ id }) => id === 'race-map')).toMatchObject({
      valueText: 'KZ 十二段竞技路线',
      fixedWidthNumeric: false,
    });
    expect(renderModel.modeFacts.find(({ id }) => id === 'race-route-target')).toMatchObject({
      label: '下一目标',
      valueText: '终点 · 12/12',
      fixedWidthNumeric: false,
    });
    expect(renderModel.localFacts.find(({ id }) => id === 'local-weapon')).toMatchObject({
      valueText: '线性压制器 · Lv.3 · 按一下',
    });
  });

  it('keeps the next race segment scannable through landmark, beat and intensity', () => {
    const source = raceHud();
    if (source.mode.kind !== 'race') throw new Error('测试夹具必须是竞速模式。');
    const raceMode = source.mode;
    const local = raceMode.participants[0]!;
    const renderModel = createArenaV2ModeHudRenderModelV1({
      ...source,
      mode: {
        ...raceMode,
        participants: [{
          ...local,
          progressOrdinal: 4,
          completedSegmentCount: 4,
          routeTarget: {
            kind: 'segment',
            segmentDefinitionId: 'kz-segment-05-narrow',
            ordinal: 5,
            displayName: '窄路校正',
            lesson: '控制起跳节奏，避免在窄桥上连续修正。',
            experienceBeat: 'test',
            experienceIntensity: 4,
            landmarkCue: 'narrow-bridge',
            memoryHook: '看到窄桥就先对齐落点',
          },
        }, ...raceMode.participants.slice(1)],
      },
    }, { reducedMotion: false, soundEnabled: true });
    expect(renderModel.modeFacts.find(({ id }) => id === 'race-route-target')).toMatchObject({
      label: '下一段',
      valueText: '5/12 · 窄桥［考验4］ · 练窄路',
      fixedWidthNumeric: false,
    });
    const routeRead = renderModel.modeFacts.find(
      ({ id }) => id === 'race-route-target',
    )?.accessibilityText;
    expect(routeRead).toContain('强度4');
    expect(routeRead).toContain('练习提示：控制起跳节奏');
    expect(routeRead).toContain('记忆点：看到窄桥就先对齐落点');
    expect(routeRead).toContain('当前武器线性压制器适合在这一段练窄路');
    expect(() => createArenaV2ModeHudRenderModelV1({
      ...source,
      mode: {
        ...raceMode,
        participants: [{
          ...local,
          progressOrdinal: 4,
          completedSegmentCount: 4,
          routeTarget: {
            kind: 'segment',
            segmentDefinitionId: 'kz-segment-05-narrow',
            ordinal: 5,
            displayName: '漂移路段名',
            lesson: '控制起跳节奏，避免在窄桥上连续修正。',
            experienceBeat: 'test',
            experienceIntensity: 4,
            landmarkCue: 'narrow-bridge',
            memoryHook: '看到窄桥就先对齐落点',
          },
        }, ...raceMode.participants.slice(1)],
      },
    }, { reducedMotion: false, soundEnabled: true })).toThrow(/显示身份漂移/);
  });
});
