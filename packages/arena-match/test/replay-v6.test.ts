import { describe, expect, it } from 'vitest';
import {
  assertArenaReplayV6DeterministicPair,
  createArenaReplayV6,
  validateArenaReplayV6,
} from '../src/replay-v6.js';

type DataRecord = Record<string, unknown>;

function participant(participantId: string): DataRecord {
  return {
    participantId,
    modeRole: 'competitor',
    teamId: null,
    controllerKind: 'human',
    characterDefinitionId: `character.${participantId}.test`,
    slotId: null,
    slotGeneration: 0,
  };
}

function config(): DataRecord {
  return {
    schemaVersion: 6,
    modeDefinitionId: 'arena.mode.duel.test.v6',
    modeKind: 'duel',
    modePolicyContentHash: 'd001d001',
    participantAssignments: [participant('player-1'), participant('player-2')],
  };
}

function inputFrame(tick: number, participantId: string): DataRecord {
  return {
    tick,
    participantId,
    moveX: 0,
    moveZ: 0,
    primaryPressed: false,
    primaryHeld: false,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  };
}

function modeResult(): DataRecord {
  return {
    kind: 'duel',
    winnerParticipantIds: ['player-1'],
    isDraw: false,
    reason: 'last-participant-standing',
    endedAtTick: 1,
  };
}

function replayOptions(): DataRecord {
  const matchConfig = config();
  const result = modeResult();
  return {
    replaySchemaVersion: 6,
    authoritySchemaVersion: 6,
    physicsBackendVersion: 'arena.physics.test.v1',
    modeDefinitionId: 'arena.mode.duel.test.v6',
    contentHash: 'd001d001',
    matchSeed: 73,
    config: matchConfig,
    participantAssignments: matchConfig.participantAssignments,
    inputFrames: [
      inputFrame(0, 'player-1'), inputFrame(0, 'player-2'),
      inputFrame(1, 'player-1'), inputFrame(1, 'player-2'),
    ],
    checkpoints: [{ tick: 0, hash: '11111111' }, { tick: 2, hash: 'abcdef12' }],
    events: [{
      id: 'event-start', sequence: 0, tick: 0, type: 'MatchStarted',
      modeDefinitionId: 'arena.mode.duel.test.v6', participantIds: ['player-1', 'player-2'],
    }, {
      id: 'event-end', sequence: 1, tick: 1, type: 'MatchEnded',
      modeDefinitionId: 'arena.mode.duel.test.v6', modeResult: result,
    }],
    modeResult: result,
    finalHash: 'abcdef12',
  };
}

describe('ArenaReplayV6 production-unreachable candidate', () => {
  it('records finalized assignment, V6 events, result and authority final hash atomically', () => {
    const replay = createArenaReplayV6(replayOptions());
    expect(replay).toMatchObject({
      replaySchemaVersion: 6,
      authoritySchemaVersion: 6,
      physicsBackendVersion: 'arena.physics.test.v1',
      modeDefinitionId: 'arena.mode.duel.test.v6',
      contentHash: 'd001d001',
      matchSeed: 73,
      finalHash: 'abcdef12',
      modeResult: { kind: 'duel', endedAtTick: 1 },
    });
    expect(replay.participantAssignments.map(({ participantId }) => participantId)).toEqual([
      'player-1', 'player-2',
    ]);
    expect(replay.events.map(({ sequence }) => sequence)).toEqual([0, 1]);
    expect(replay.inputFrames).toHaveLength(4);
    expect(Object.isFrozen(replay)).toBe(true);
    expect(Object.isFrozen(replay.events)).toBe(true);
    expect(validateArenaReplayV6(replay)).toEqual(replay);
  });

  it('provides a strict same-config/seed/input double-run identity comparison', () => {
    const first = createArenaReplayV6(replayOptions());
    const second = createArenaReplayV6(replayOptions());
    expect(assertArenaReplayV6DeterministicPair(first, second)).toEqual({
      replayIdentityHash: first.replayIdentityHash,
      modeDefinitionId: first.modeDefinitionId,
      contentHash: first.contentHash,
      matchSeed: first.matchSeed,
      finalHash: first.finalHash,
    });

    const drift = replayOptions();
    (drift.events as DataRecord[])[1]!.id = 'event-end-drift';
    const changed = createArenaReplayV6(drift);
    expect(() => assertArenaReplayV6DeterministicPair(first, changed)).toThrow(/确定性漂移/);
  });

  it('rejects future/unknown schema, event sequence drift and result/assignment mismatch', () => {
    expect(() => createArenaReplayV6({
      ...replayOptions(), replaySchemaVersion: 7,
    })).toThrow(/replaySchemaVersion/);
    expect(() => createArenaReplayV6({
      ...replayOptions(), future: true,
    })).toThrow(/future/);

    const sequenceDrift = replayOptions();
    (sequenceDrift.events as DataRecord[])[1]!.sequence = 2;
    expect(() => createArenaReplayV6(sequenceDrift)).toThrow(/sequence/);

    const foreignWinner = replayOptions();
    (foreignWinner.modeResult as DataRecord).winnerParticipantIds = ['foreign'];
    ((foreignWinner.events as DataRecord[])[1]!.modeResult as DataRecord)
      .winnerParticipantIds = ['foreign'];
    expect(() => createArenaReplayV6(foreignWinner)).toThrow(/winner不属于/);

    const assignmentDrift = replayOptions();
    (assignmentDrift.participantAssignments as DataRecord[])[0]!.participantId = 'foreign';
    expect(() => createArenaReplayV6(assignmentDrift)).toThrow(/assignment|winner不属于/);
  });

  it('rejects incomplete input/checkpoint/final-hash closure and caller tampering', () => {
    const missingInput = replayOptions();
    (missingInput.inputFrames as DataRecord[]).pop();
    expect(() => createArenaReplayV6(missingInput)).toThrow(/完整覆盖/);

    const checkpointDrift = replayOptions();
    (checkpointDrift.checkpoints as DataRecord[])[1]!.hash = '22222222';
    expect(() => createArenaReplayV6(checkpointDrift)).toThrow(/最终checkpoint/);

    const replay = createArenaReplayV6(replayOptions());
    expect(() => validateArenaReplayV6({
      ...replay, replayIdentityHash: '00000000',
    })).toThrow(/重算证据/);
  });

  it('rejects accessor/Proxy input without publishing a replay', () => {
    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'replaySchemaVersion', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 6;
      },
    });
    let published: unknown = null;
    expect(() => {
      published = createArenaReplayV6(hostile);
    }).toThrow(/访问器|数据字段/);
    expect(getterCalls).toBe(0);
    expect(published).toBeNull();

    const proxy = new Proxy(replayOptions(), {
      ownKeys() { throw new Error('replay proxy trap'); },
    });
    expect(() => createArenaReplayV6(proxy)).toThrow(/replay proxy trap/);
  });
});
