import { describe, expect, it } from 'vitest';
import {
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_EVENT_TYPE,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_SCHEMA_VERSION,
  ARENA_V2_WEAPON_FEEDBACK_KIND,
  PresentationEventWindow,
  projectArenaWeaponFeedbackEventV6PresentationEvent,
  projectArenaWeaponFeedbackSemanticV1PresentationEvent,
  projectArenaV2WeaponFeedbackPresentationEvent,
} from '../src/index.js';

const FEEDBACK = Object.freeze({
  'hit-confirm': Object.freeze({
    title: '命中·位置被改变',
    explanation: '武器命中成立，目标仍有支撑面，但位置和路线压力已经改变。',
  }),
  'hit-surface-transfer': Object.freeze({
    title: '命中·落点改变',
    explanation: '武器命中改变了目标的最终支撑面，路线位置发生了转移。',
  }),
  'hit-ring-out': Object.freeze({
    title: '击落·失去支撑面',
    explanation: '命中产生的横向控制把目标推出当前安全支撑面。',
  }),
  'attack-evaded': Object.freeze({
    title: '未命中·已避开攻击线',
    explanation: '目标在命中窗口前离开了攻击线，攻击结果是被成功躲开。',
  }),
  'movement-fall': Object.freeze({
    title: '路线失误·先于命中掉落',
    explanation: '玩家在武器命中前失去支撑面，失败原因来自路线而不是武器命中。',
  }),
});

describe('Arena V2 weapon feedback presentation contract', () => {
  it('maps all five authority semantics to explicit visual/audio cues', () => {
    const events = Object.entries(FEEDBACK).map(([kind, feedback], index) => (
      projectArenaV2WeaponFeedbackPresentationEvent({
        id: `kz:${kind}`,
        tick: index + 1,
        sequence: index,
        feedback: { kind, ...feedback },
      })
    ));
    expect(events.map(({ feedbackKind }) => feedbackKind)).toEqual([
      ARENA_V2_WEAPON_FEEDBACK_KIND.HIT_CONFIRM,
      ARENA_V2_WEAPON_FEEDBACK_KIND.HIT_SURFACE_TRANSFER,
      ARENA_V2_WEAPON_FEEDBACK_KIND.HIT_RING_OUT,
      ARENA_V2_WEAPON_FEEDBACK_KIND.ATTACK_EVADED,
      ARENA_V2_WEAPON_FEEDBACK_KIND.MOVEMENT_FALL,
    ]);
    expect(events.map(({ visualCue, audioCue, emphasis }) => [visualCue, audioCue, emphasis])).toEqual([
      ['impact-confirm', 'weapon-hit', 'normal'],
      ['impact-surface-transfer', 'weapon-transfer', 'strong'],
      ['ring-out', 'weapon-ring-out', 'strong'],
      ['evaded-warning', 'weapon-evaded', 'warning'],
      ['movement-fall-warning', 'movement-fall', 'warning'],
    ]);
  });

  it('preserves source action and participant context without moving judgment into presentation', () => {
    const event = projectArenaV2WeaponFeedbackPresentationEvent({
      id: 'kz:surface-transfer',
      tick: 8,
      sequence: 3,
      action: 'chain-pull',
      targetId: 'player-1',
      attackerId: 'player-2',
      feedback: { kind: 'hit-surface-transfer', ...FEEDBACK['hit-surface-transfer'] },
    });
    expect(event).toMatchObject({
      action: 'chain-pull',
      targetId: 'player-1',
      attackerId: 'player-2',
      visualCue: 'impact-surface-transfer',
    });
    expect(Object.isFrozen(event)).toBe(true);
  });

  it('produces stable events that the existing event window can consume', () => {
    const event = projectArenaV2WeaponFeedbackPresentationEvent({
      id: 'kz:hit-ring-out',
      tick: 12,
      sequence: 4,
      feedback: { kind: 'hit-ring-out', ...FEEDBACK['hit-ring-out'] },
    });
    expect(event).toEqual(projectArenaV2WeaponFeedbackPresentationEvent({
      id: 'kz:hit-ring-out',
      tick: 12,
      sequence: 4,
      feedback: { kind: 'hit-ring-out', ...FEEDBACK['hit-ring-out'] },
    }));
    expect(Object.isFrozen(event)).toBe(true);
    const window = new PresentationEventWindow({ capacity: 4 });
    expect(window.consume([event])).toEqual([event]);
    expect(window.consume([event])).toEqual([]);
    window.destroy();
  });

  it('rejects unsupported semantics without attempting to infer a replacement cause', () => {
    expect(() => projectArenaV2WeaponFeedbackPresentationEvent({
      id: 'kz:unknown',
      tick: 1,
      sequence: 0,
      feedback: { kind: 'hit', title: '命中', explanation: '不应被自动归类。' },
    })).toThrow(/受支持的武器反馈语义/);
  });

  it('consumes the exact authority semantic and owns only copy and cue selection', () => {
    const event = projectArenaWeaponFeedbackSemanticV1PresentationEvent({
      schemaVersion: ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_SCHEMA_VERSION,
      id: 'authority-feedback-1',
      type: ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_EVENT_TYPE,
      sequence: 6,
      tick: 40,
      kind: 'hit-ring-out',
      attackerId: 'player-1',
      targetId: 'player-2',
      actionDefinitionId: 'weapon.hammer.attack',
      actionStartedTick: 20,
      firstHitTick: 28,
      targetFallTick: 36,
      initialSupportSurfaceId: 'surface-a',
      finalSupportSurfaceId: null,
      fallCause: 'credited-hit',
      creditedAttackerId: 'player-1',
    });
    expect(event).toMatchObject({
      sourceEventId: 'authority-feedback-1',
      feedbackKind: 'hit-ring-out',
      visualCue: 'ring-out',
      audioCue: 'weapon-ring-out',
      title: '击落·失去支撑面',
    });
  });

  it('adapts the public V6 authority event into the existing bounded cue event', () => {
    const event = projectArenaWeaponFeedbackEventV6PresentationEvent({
      id: 'v6-feedback-1',
      type: 'WeaponFeedbackResolved',
      sequence: 2,
      tick: 30,
      kind: 'attack-evaded',
      attackerId: 'player-1',
      targetId: null,
      actionDefinitionId: 'weapon.chain.attack',
      actionStartedTick: 10,
      firstHitTick: null,
      targetFallTick: null,
      initialSupportSurfaceId: null,
      finalSupportSurfaceId: null,
      fallCause: null,
      creditedAttackerId: null,
    });
    expect(event).toMatchObject({
      sourceEventId: 'v6-feedback-1',
      feedbackKind: 'attack-evaded',
      visualCue: 'evaded-warning',
      emphasis: 'warning',
    });
  });
});
