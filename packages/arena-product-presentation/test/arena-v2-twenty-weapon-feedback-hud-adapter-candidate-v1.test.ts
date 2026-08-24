import { describe, expect, it } from 'vitest';
import {
  projectArenaWeaponFeedbackEventV6PresentationEvent,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1,
  ArenaV2ModeHudFeedbackEffectConsumerV1,
  advanceArenaV2ModeHudFeedbackQueueV1,
  createArenaV2ModeHudRenderModelV1,
  specializeArenaV2TwentyWeaponFeedbackHudCandidateV1,
  type ArenaV2ModeHudViewModelV1,
} from '../src/index.js';

const ACTION_ID =
  'arena-v2.action.heavy-hammer.ground.survival.level-1.candidate.v1';

function attackEvent() {
  return Object.freeze({
    id: 'feedback-heavy-hammer-1',
    type: 'WeaponFeedbackResolved' as const,
    sequence: 3,
    tick: 20,
    kind: 'hit-surface-transfer' as const,
    attackerId: 'player',
    targetId: 'enemy-1',
    actionDefinitionId: ACTION_ID,
    actionStartedTick: 10,
    firstHitTick: 14,
    targetFallTick: null,
    initialSupportSurfaceId: 'surface-a',
    finalSupportSurfaceId: 'surface-b',
    fallCause: null,
    creditedAttackerId: null,
  });
}

function movementFallEvent() {
  return Object.freeze({
    id: 'feedback-movement-fall-1',
    type: 'WeaponFeedbackResolved' as const,
    sequence: 4,
    tick: 21,
    kind: 'movement-fall' as const,
    attackerId: 'player',
    targetId: 'enemy-1',
    actionDefinitionId: ACTION_ID,
    actionStartedTick: 10,
    firstHitTick: null,
    targetFallTick: 18,
    initialSupportSurfaceId: 'surface-a',
    finalSupportSurfaceId: null,
    fallCause: 'movement' as const,
    creditedAttackerId: null,
  });
}

function unarmedEvent() {
  return Object.freeze({
    ...attackEvent(),
    id: 'feedback-unarmed-1',
    actionDefinitionId: 'arena-v2.action.unarmed-push.ground.candidate.v1',
  });
}

function evadedEvent() {
  return Object.freeze({
    ...attackEvent(),
    id: 'feedback-heavy-hammer-evaded-1',
    kind: 'attack-evaded' as const,
    targetId: null,
    firstHitTick: null,
    targetFallTick: null,
    initialSupportSurfaceId: null,
    finalSupportSurfaceId: null,
    fallCause: null,
    creditedAttackerId: null,
  });
}

function hud(
  event: ReturnType<typeof attackEvent>
    | ReturnType<typeof movementFallEvent>
    | ReturnType<typeof unarmedEvent>
    | ReturnType<typeof evadedEvent>,
) {
  return {
    schemaVersion: 1,
    tick: 22,
    eventSequence: 5,
    modeDefinitionId: 'arena.mode.survival.v1',
    phase: 'active',
    remainingTicks: 4_000,
    preparationRemainingTicks: null,
    localParticipant: {
      participantId: 'player',
      lives: 1,
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
      survivedTicks: 21,
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
      snapshotTick: 22,
      nextWaveIndex: 1,
      nextSpawnTick: 600,
      remainingTicks: 578,
      spawnCount: 3,
    },
    supplyMarkers: [],
    supplyFeedbackCues: [],
    weaponFeedbackEvents: [projectArenaWeaponFeedbackEventV6PresentationEvent(event)],
    modeFeedbackEvents: [],
    result: null,
  } satisfies ArenaV2ModeHudViewModelV1;
}

describe('Arena V2 twenty weapon HUD adapter candidate V1 (not run)', () => {
  it('specializes cue identities before the existing queue and effect consumer', () => {
    const event = attackEvent();
    const generic = createArenaV2ModeHudRenderModelV1(hud(event), {
      reducedMotion: false,
      soundEnabled: true,
    });
    const specialized = specializeArenaV2TwentyWeaponFeedbackHudCandidateV1({
      schemaVersion: 1,
      renderModel: generic,
      events: [event],
    });
    const item = specialized.renderModel.feedbackItems[0]!;
    expect(item.title).toBe('重锤·地面：你改变了敌人的落点');
    expect(item.explanation).toBe(
      '本招用途：地面正面重击，制造最高的一次性水平击退。'
      + '敌人的最终支撑面和路线位置已经转移。',
    );
    expect(item.visualCue).toContain(
      'arena.cue.vfx.weapon-feedback.heavy-hammer.ground.hit-surface-transfer.survival',
    );
    expect(item.audioCue).toContain(
      'arena.cue.audio.weapon-feedback.heavy-hammer.ground.hit-surface-transfer.survival',
    );
    expect(specialized.weaponReadPlans[0]).toMatchObject({
      weaponId: 'heavy-hammer',
      actionContext: 'ground',
      coreVerb: 'push',
      vfx: { baseVisualCue: 'impact-surface-transfer' },
      audio: { baseAudioCue: 'weapon-transfer', maximumConcurrentVoices: 8 },
    });

    const queue = advanceArenaV2ModeHudFeedbackQueueV1(specialized.renderModel, null);
    const presented: unknown[] = [];
    const played: unknown[] = [];
    const consumer = new ArenaV2ModeHudFeedbackEffectConsumerV1({
      qualityTier: 'high',
      visual: { present(value: unknown) { presented.push(value); }, remove() {}, clear() {} },
      audio: { play(value: unknown) { played.push(value); }, stopAll() {} },
    }).load();
    consumer.consume(queue);
    expect(presented[0]).toMatchObject({ sourceEventId: event.id, cueId: item.visualCue });
    expect(played[0]).toMatchObject({ sourceEventId: event.id, cueId: item.audioCue });
    consumer.dispose();
    expect(consumer.state).toBe(
      ARENA_V2_MODE_HUD_FEEDBACK_EFFECT_CONSUMER_STATE_V1.DISPOSED,
    );
  });

  it('keeps movement fall global and preserves muted reduced-motion fallback', () => {
    const event = movementFallEvent();
    const generic = createArenaV2ModeHudRenderModelV1(hud(event), {
      reducedMotion: true,
      soundEnabled: false,
    });
    const specialized = specializeArenaV2TwentyWeaponFeedbackHudCandidateV1({
      schemaVersion: 1,
      renderModel: generic,
      events: [event],
    });
    expect(specialized.renderModel.feedbackItems[0]).toMatchObject({
      visualCue: expect.stringContaining('movement-global.movement-fall.survival'),
      audioCue: expect.any(String),
      motionPolicy: 'standard',
    });
    const queue = advanceArenaV2ModeHudFeedbackQueueV1(specialized.renderModel, null);
    expect(queue.visibleItems[0]).toMatchObject({ motionPolicy: 'static' });
    expect(queue.oneShotAudioCues).toEqual([]);
    expect(specialized.weaponReadPlans[0]).toMatchObject({
      weaponSpecific: false,
      weaponId: null,
      sourceActionDefinitionId: ACTION_ID,
      accessibility: {
        lowQualityKeepsCausalRead: true,
        colorIndependent: true,
      },
    });
  });

  it('keeps a validated unarmed action on the existing generic feedback language', () => {
    const event = unarmedEvent();
    const generic = createArenaV2ModeHudRenderModelV1(hud(event), {
      reducedMotion: false,
      soundEnabled: true,
    });
    const specialized = specializeArenaV2TwentyWeaponFeedbackHudCandidateV1({
      schemaVersion: 1,
      renderModel: generic,
      events: [event],
    });
    expect(specialized.weaponReadPlans).toEqual([]);
    expect(specialized.passthroughUnarmedSourceEventIds).toEqual([event.id]);
    expect(specialized.renderModel.feedbackItems[0]).toEqual(generic.feedbackItems[0]);
    expect(specialized.renderModel.feedbackItems[0]).toMatchObject({
      visualCue: 'impact-confirm',
      audioCue: 'weapon-hit',
    });
  });

  it('uses the same weapon-detail risk copy as a short retry hint after an evaded attack', () => {
    const event = evadedEvent();
    const generic = createArenaV2ModeHudRenderModelV1(hud(event), {
      reducedMotion: false,
      soundEnabled: true,
    });
    const specialized = specializeArenaV2TwentyWeaponFeedbackHudCandidateV1({
      schemaVersion: 1,
      renderModel: generic,
      events: [event],
    });
    expect(specialized.renderModel.feedbackItems[0]).toMatchObject({
      title: '重锤·地面：你的攻击未命中',
      explanation: '下次注意：挥空后恢复较长；确认对手进入有效范围后再出手，并给恢复阶段留出安全位置。'
        + '你的攻击窗口已经结束，没有命中或掉落事实。',
    });
  });

  it('shows a counterplay hint to the local target and no coaching for an observed hit', () => {
    const incoming = Object.freeze({
      ...attackEvent(),
      id: 'feedback-heavy-hammer-incoming-1',
      attackerId: 'enemy-1',
      targetId: 'player',
    });
    const incomingSpecialized = specializeArenaV2TwentyWeaponFeedbackHudCandidateV1({
      schemaVersion: 1,
      renderModel: createArenaV2ModeHudRenderModelV1(hud(incoming), {
        reducedMotion: false,
        soundEnabled: true,
      }),
      events: [incoming],
    });
    expect(incomingSpecialized.renderModel.feedbackItems[0]!.explanation).toBe(
      '下次可改变方向或跳跃离开；对方弱点：挥空后恢复较长。'
        + '你的最终支撑面和路线位置已经转移。',
    );

    const observed = Object.freeze({
      ...attackEvent(),
      id: 'feedback-heavy-hammer-observed-1',
      attackerId: 'enemy-1',
      targetId: 'enemy-2',
    });
    const observedSpecialized = specializeArenaV2TwentyWeaponFeedbackHudCandidateV1({
      schemaVersion: 1,
      renderModel: createArenaV2ModeHudRenderModelV1(hud(observed), {
        reducedMotion: false,
        soundEnabled: true,
      }),
      events: [observed],
    });
    expect(observedSpecialized.renderModel.feedbackItems[0]!.explanation).toBe(
      '敌人的最终支撑面和路线位置已经转移。',
    );
  });

  it('uses the exact aerial counter input without inventing a block or extra action', () => {
    const incoming = Object.freeze({
      ...attackEvent(),
      id: 'feedback-heavy-hammer-aerial-incoming-1',
      attackerId: 'enemy-1',
      targetId: 'player',
      actionDefinitionId:
        'arena-v2.action.heavy-hammer.aerial.survival.level-1.candidate.v1',
    });
    const specialized = specializeArenaV2TwentyWeaponFeedbackHudCandidateV1({
      schemaVersion: 1,
      renderModel: createArenaV2ModeHudRenderModelV1(hud(incoming), {
        reducedMotion: false,
        soundEnabled: true,
      }),
      events: [incoming],
    });
    expect(specialized.renderModel.feedbackItems[0]!.explanation).toBe(
      '下次可改变方向；对方弱点：空中出手会承诺落点。'
        + '你的最终支撑面和路线位置已经转移。',
    );
    expect(specialized.renderModel.feedbackItems[0]!.explanation).not.toMatch(
      /格挡|技能|瞄准键/,
    );
  });

  it('fails closed when generic HUD copy or cue identity drifts', () => {
    const event = attackEvent();
    const generic = createArenaV2ModeHudRenderModelV1(hud(event), {
      reducedMotion: false,
      soundEnabled: true,
    });
    expect(() => specializeArenaV2TwentyWeaponFeedbackHudCandidateV1({
      schemaVersion: 1,
      renderModel: {
        ...generic,
        feedbackItems: [{ ...generic.feedbackItems[0]!, visualCue: 'guessed-hit' }],
      },
      events: [event],
    })).toThrow(/语义漂移/);
  });
});
