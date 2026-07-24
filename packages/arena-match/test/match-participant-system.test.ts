import { describe, expect, it } from 'vitest';
import {
  ARENA_PARTICIPANT_STATUS,
  MatchParticipantSystem,
} from '../src/index.js';

function createSystem(livesPerParticipant = 3): MatchParticipantSystem {
  return new MatchParticipantSystem({
    participantIds: ['player-2', 'player-1'],
    livesPerParticipant,
  });
}

describe('MatchParticipantSystem', () => {
  it('owns stable initial participant state without exposing mutable runtime objects', () => {
    const system = createSystem();
    expect(system.participantIds).toEqual(['player-1', 'player-2']);
    expect(system.listSnapshots().map((value) => value.status)).toEqual([
      ARENA_PARTICIPANT_STATUS.ACTIVE,
      ARENA_PARTICIPANT_STATUS.ACTIVE,
    ]);
    const snapshot = system.getSnapshot('player-1');
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(() => Object.assign(snapshot, { lives: 0 })).toThrow();
    expect(system.getSnapshot('player-1').lives).toBe(3);
  });

  it('advances hitstun, invulnerability and respawn timers through explicit transitions', () => {
    const system = createSystem();
    system.applyHitstun('player-1', 2);
    system.recordHit('player-2', 'player-1', 4);
    expect(system.advanceTimers()).toEqual([]);
    expect(system.getSnapshot('player-1').hitstunTicks).toBe(1);
    system.eliminateBatch(['player-1'], {
      tick: 5,
      suddenDeath: false,
      lastHitCreditTicks: 10,
      respawnTicks: 2,
    });
    expect(system.advanceTimers()).toEqual([]);
    expect(system.advanceTimers()).toEqual(['player-1']);
    expect(system.respawn('player-1', {
      invulnerableTicks: 3,
      reason: 'timer',
    })).toMatchObject({
      status: ARENA_PARTICIPANT_STATUS.ACTIVE,
      invulnerableTicks: 3,
      lastHitBy: null,
      lastHitTick: -1,
    });
  });

  it('resolves simultaneous eliminations and hit credit from one validated batch', () => {
    const system = createSystem(1);
    system.recordHit('player-1', 'player-2', 7);
    system.recordHit('player-2', 'player-1', 7);
    expect(system.eliminateBatch(['player-2', 'player-1'], {
      tick: 8,
      suddenDeath: false,
      lastHitCreditTicks: 5,
      respawnTicks: 2,
    })).toEqual([
      {
        participantId: 'player-1',
        remainingLives: 0,
        creditedAttackerId: 'player-2',
        terminal: true,
      },
      {
        participantId: 'player-2',
        remainingLives: 0,
        creditedAttackerId: 'player-1',
        terminal: true,
      },
    ]);
    expect(system.listByStatus(ARENA_PARTICIPANT_STATUS.ELIMINATED)).toEqual([
      'player-1',
      'player-2',
    ]);
    expect(() => system.applyHitstun('player-1', 1)).toThrow(/active participant/);
    expect(system.resolveTimeout()).toEqual({
      winnerId: null,
      reason: 'timeout-draw',
      isDraw: true,
    });
  });

  it('prevalidates a full elimination batch before any participant mutation', () => {
    const system = createSystem();
    expect(() => system.eliminateBatch(['player-1', 'unknown'], {
      tick: 1,
      suddenDeath: false,
      lastHitCreditTicks: 5,
      respawnTicks: 2,
    })).toThrow(/未知 participant/);
    expect(system.getSnapshot('player-1')).toMatchObject({
      lives: 3,
      deaths: 0,
      status: ARENA_PARTICIPANT_STATUS.ACTIVE,
    });
  });

  it('distinguishes timer completion from an explicit phase-transition respawn', () => {
    const system = createSystem();
    system.eliminateBatch(['player-1'], {
      tick: 1,
      suddenDeath: false,
      lastHitCreditTicks: 5,
      respawnTicks: 3,
    });
    expect(() => system.respawn('player-1', {
      invulnerableTicks: 2,
      reason: 'timer',
    })).toThrow(/计时尚未结束/);
    expect(system.respawn('player-1', {
      invulnerableTicks: 2,
      reason: 'phase-transition',
    })).toMatchObject({
      status: ARENA_PARTICIPANT_STATUS.ACTIVE,
      respawnTicks: 0,
      invulnerableTicks: 2,
    });
  });

  it('rejects getter-owned construction input and has a terminal idempotent lifecycle', () => {
    let getterCalls = 0;
    const options = Object.defineProperty({}, 'participantIds', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return ['player-1', 'player-2'];
      },
    });
    expect(() => new MatchParticipantSystem(options)).toThrow(/数据字段|访问器/);
    expect(getterCalls).toBe(0);

    const system = createSystem();
    system.destroy();
    system.destroy();
    expect(() => system.getSnapshot('player-1')).toThrow(/已销毁/);
  });
});
