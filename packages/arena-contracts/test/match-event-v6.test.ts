import { describe, expect, it } from 'vitest';
import {
  ARENA_MATCH_EVENT_V6,
  ARENA_MATCH_EVENT_V6_ACTION_SOURCE,
  ARENA_MATCH_EVENT_V6_FALL_CAUSE,
  ARENA_MATCH_EVENT_V6_MODE_ROLE,
  ARENA_MATCH_EVENT_V6_RESPAWN_REASON,
  ARENA_MATCH_EVENT_V6_SLOT_CHANGE_REASON,
  createArenaMatchEventV6,
  createModeResultV3Payload,
} from '../src/match-event-v6.js';

function envelope(type: string, tick = 100) {
  return { id: `event-${type}-${tick}`, sequence: 7, tick, type };
}

describe('P2.0b Arena Match Event V6 candidate', () => {
  it('freezes MatchStarted and canonical participant identity', () => {
    const event = createArenaMatchEventV6({
      ...envelope(ARENA_MATCH_EVENT_V6.MATCH_STARTED),
      modeDefinitionId: 'mode.race.test.v1',
      participantIds: ['player-1', 'player-2', 'player-3'],
    });
    expect(event.type).toBe(ARENA_MATCH_EVENT_V6.MATCH_STARTED);
    if (event.type !== ARENA_MATCH_EVENT_V6.MATCH_STARTED) throw new Error('unexpected type');
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.participantIds)).toBe(true);
    expect(() => createArenaMatchEventV6({
      ...event,
      participantIds: ['player-2', 'player-1'],
    })).toThrow(/排序/);
  });

  it('separates base and equipment ActionStarted identity', () => {
    expect(createArenaMatchEventV6({
      ...envelope(ARENA_MATCH_EVENT_V6.ACTION_STARTED),
      participantId: 'player-1',
      action: 'movement.jump',
      sourceKind: ARENA_MATCH_EVENT_V6_ACTION_SOURCE.BASE_ACTION,
      equipmentInstanceId: null,
      runtimeEquipmentDefinitionId: null,
      collectionEquipmentDefinitionId: null,
      survivalLevel: null,
    })).toMatchObject({ sourceKind: 'base-action', survivalLevel: null });

    expect(createArenaMatchEventV6({
      ...envelope(ARENA_MATCH_EVENT_V6.ACTION_STARTED),
      participantId: 'player-1',
      action: 'hammer.level-2.attack',
      sourceKind: ARENA_MATCH_EVENT_V6_ACTION_SOURCE.EQUIPMENT,
      equipmentInstanceId: 'equipment-1',
      runtimeEquipmentDefinitionId: 'hammer.runtime.level-2.test',
      collectionEquipmentDefinitionId: 'hammer.collection.test',
      survivalLevel: 2,
    })).toMatchObject({ sourceKind: 'equipment', survivalLevel: 2 });

    expect(() => createArenaMatchEventV6({
      ...envelope(ARENA_MATCH_EVENT_V6.ACTION_STARTED),
      participantId: 'player-1',
      action: 'hammer.attack',
      sourceKind: ARENA_MATCH_EVENT_V6_ACTION_SOURCE.BASE_ACTION,
      equipmentInstanceId: 'equipment-1',
      runtimeEquipmentDefinitionId: null,
      collectionEquipmentDefinitionId: null,
      survivalLevel: null,
    })).toThrow(/全部为null/);
  });

  it('carries completed weapon feedback causality without presentation inference', () => {
    const event = createArenaMatchEventV6({
      ...envelope(ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED, 30),
      kind: 'hit-ring-out',
      attackerId: 'player-1',
      targetId: 'player-2',
      actionDefinitionId: 'hammer.attack',
      actionStartedTick: 10,
      firstHitTick: 15,
      targetFallTick: 24,
      initialSupportSurfaceId: 'surface-a',
      finalSupportSurfaceId: null,
      fallCause: 'credited-hit',
      creditedAttackerId: 'player-1',
    });
    expect(event).toMatchObject({
      type: 'WeaponFeedbackResolved',
      kind: 'hit-ring-out',
      creditedAttackerId: 'player-1',
    });
    expect(() => createArenaMatchEventV6({
      ...event,
      creditedAttackerId: 'player-3',
    })).toThrow(/当前攻击者/);
  });

  it('keeps fall facts separate from terminal and slot decisions', () => {
    const enemy = createArenaMatchEventV6({
      ...envelope(ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL),
      modeDefinitionId: 'mode.survival.test.v1',
      participantId: 'enemy-slot-1:1',
      modeRole: ARENA_MATCH_EVENT_V6_MODE_ROLE.ENEMY,
      slotId: 'enemy-slot-1',
      slotGeneration: 1,
      fallCause: ARENA_MATCH_EVENT_V6_FALL_CAUSE.CREDITED_HIT,
      creditedAttackerId: 'player-1',
      supportSurfaceId: null,
    });
    expect(enemy).toMatchObject({ slotId: 'enemy-slot-1', creditedAttackerId: 'player-1' });

    expect(() => createArenaMatchEventV6({
      ...enemy,
      fallCause: ARENA_MATCH_EVENT_V6_FALL_CAUSE.MOVEMENT,
    })).toThrow(/attacker身份/);
    expect(() => createArenaMatchEventV6({
      ...enemy,
      modeRole: ARENA_MATCH_EVENT_V6_MODE_ROLE.PLAYER,
    })).toThrow(/非enemy/);
  });

  it('locks Race respawn scheduling to 180 ticks without freezing Survival delay', () => {
    const race = {
      ...envelope(ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED, 20),
      modeDefinitionId: 'mode.race.test.v1',
      participantId: 'player-2',
      modeRole: ARENA_MATCH_EVENT_V6_MODE_ROLE.COMPETITOR,
      slotId: null,
      slotGeneration: 0,
      readyTick: 200,
      anchorId: 'race.safe.2',
      reason: ARENA_MATCH_EVENT_V6_RESPAWN_REASON.RACE_FALL,
    };
    expect(createArenaMatchEventV6(race)).toMatchObject({ readyTick: 200 });
    expect(() => createArenaMatchEventV6({ ...race, readyTick: 199 })).toThrow(/180 tick/);

    expect(createArenaMatchEventV6({
      ...race,
      modeDefinitionId: 'mode.survival.test.v1',
      modeRole: ARENA_MATCH_EVENT_V6_MODE_ROLE.PLAYER,
      readyTick: 50,
      reason: ARENA_MATCH_EVENT_V6_RESPAWN_REASON.SURVIVAL_FIRST_FALL,
    })).toMatchObject({ readyTick: 50 });
  });

  it('validates Race anchor/finish and Survival slot generation facts', () => {
    expect(createArenaMatchEventV6({
      ...envelope(ARENA_MATCH_EVENT_V6.RACE_SAFE_ANCHOR_COMMITTED),
      modeDefinitionId: 'mode.race.test.v1',
      participantId: 'player-1',
      anchorId: 'race.safe.3',
      progressOrdinal: 3,
    })).toMatchObject({ progressOrdinal: 3 });

    expect(() => createArenaMatchEventV6({
      ...envelope(ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED, 101),
      modeDefinitionId: 'mode.race.test.v1',
      participantId: 'player-1',
      finishTick: 100,
      progressOrdinal: 9,
    })).toThrow(/等于event tick/);

    const activation = {
      ...envelope(ARENA_MATCH_EVENT_V6.SURVIVAL_ENEMY_SLOT_CHANGED),
      modeDefinitionId: 'mode.survival.test.v1',
      participantId: 'enemy-slot-1:2',
      slotId: 'enemy-slot-1',
      previousGeneration: 1,
      generation: 2,
      active: true,
      anchorId: 'survival.enemy.anchor.1',
      reason: ARENA_MATCH_EVENT_V6_SLOT_CHANGE_REASON.REACTIVATION_READY,
    };
    expect(createArenaMatchEventV6(activation)).toMatchObject({ generation: 2, active: true });
    expect(() => createArenaMatchEventV6({ ...activation, generation: 3 })).toThrow(/generation\+1/);
    expect(createArenaMatchEventV6({
      ...activation,
      previousGeneration: 2,
      generation: 2,
      active: false,
      anchorId: null,
      reason: ARENA_MATCH_EVENT_V6_SLOT_CHANGE_REASON.FELL,
    })).toMatchObject({ generation: 2, active: false });
  });

  it('locks first/second Survival fall semantics', () => {
    const first = {
      ...envelope(ARENA_MATCH_EVENT_V6.SURVIVAL_PLAYER_FALL_COUNTED),
      modeDefinitionId: 'mode.survival.test.v1',
      participantId: 'player-1',
      fallCount: 1,
      terminalFallCount: 2,
      terminal: false,
    };
    expect(createArenaMatchEventV6(first)).toMatchObject({ fallCount: 1, terminal: false });
    expect(createArenaMatchEventV6({ ...first, fallCount: 2, terminal: true }))
      .toMatchObject({ fallCount: 2, terminal: true });
    expect(() => createArenaMatchEventV6({ ...first, fallCount: 2 }))
      .toThrow(/fall\/terminal/);
  });

  it('represents Duel, tied Race and Survival results without cross-mode projection', () => {
    expect(createModeResultV3Payload({
      kind: 'duel',
      winnerParticipantIds: ['player-1'],
      isDraw: false,
      reason: 'last-participant-standing',
      endedAtTick: 300,
    })).toMatchObject({ kind: 'duel', isDraw: false });

    const race = createModeResultV3Payload({
      kind: 'race',
      winnerParticipantIds: ['player-1', 'player-2'],
      rankings: [
        { participantId: 'player-1', rank: 1, finishTick: 200, progressOrdinal: 10 },
        { participantId: 'player-2', rank: 1, finishTick: 200, progressOrdinal: 10 },
        { participantId: 'player-3', rank: 3, finishTick: null, progressOrdinal: 8 },
      ],
      reason: 'finish-claimed',
      endedAtTick: 200,
    });
    expect(race.kind).toBe('race');
    if (race.kind === 'race') expect(race.winnerParticipantIds).toHaveLength(2);

    expect(createModeResultV3Payload({
      kind: 'survival',
      playerParticipantId: 'player-1',
      survivedTicks: 3_000,
      pressureStage: 4,
      fallCount: 2,
      reason: 'terminal-player-fall',
      endedAtTick: 3_100,
    })).toMatchObject({ kind: 'survival', fallCount: 2 });
  });

  it('makes MatchEnded carry the exact frozen mode result at the terminal tick', () => {
    const event = createArenaMatchEventV6({
      ...envelope(ARENA_MATCH_EVENT_V6.MATCH_ENDED, 300),
      modeDefinitionId: 'mode.duel.test.v1',
      modeResult: {
        kind: 'duel',
        winnerParticipantIds: ['player-1'],
        isDraw: false,
        reason: 'timeout-score',
        endedAtTick: 300,
      },
    });
    expect(event.type).toBe(ARENA_MATCH_EVENT_V6.MATCH_ENDED);
    if (event.type !== ARENA_MATCH_EVENT_V6.MATCH_ENDED) throw new Error('unexpected type');
    expect(Object.isFrozen(event.modeResult)).toBe(true);
    expect(() => createArenaMatchEventV6({
      ...event,
      modeResult: { ...event.modeResult, endedAtTick: 299 },
    })).toThrow(/等于event tick/);
  });

  it('rejects future fields, accessors, sparse arrays, cycles and unsafe integers', () => {
    const started = {
      ...envelope(ARENA_MATCH_EVENT_V6.MATCH_STARTED),
      modeDefinitionId: 'mode.duel.test.v1',
      participantIds: ['player-1', 'player-2'],
    };
    expect(() => createArenaMatchEventV6({ ...started, future: true })).toThrow(/future/);
    expect(() => createArenaMatchEventV6(Object.defineProperty(
      { ...started },
      'type',
      { enumerable: true, get: () => ARENA_MATCH_EVENT_V6.MATCH_STARTED },
    ))).toThrow(/数据字段/);
    expect(() => createArenaMatchEventV6({ ...started, participantIds: new Array(2) }))
      .toThrow(/空槽/);
    const cyclic = { ...started } as Record<string, unknown>;
    cyclic.self = cyclic;
    expect(() => createArenaMatchEventV6(cyclic)).toThrow(/循环引用/);
    expect(() => createArenaMatchEventV6({
      ...started,
      tick: Number.MAX_SAFE_INTEGER + 1,
    })).toThrow(/安全整数/);
  });
});
