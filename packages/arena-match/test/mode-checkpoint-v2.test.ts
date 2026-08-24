import { describe, expect, it } from 'vitest';
import {
  createArenaModeCheckpointV2,
  restoreArenaModeCheckpointV2,
  validateArenaModeCheckpointV2,
} from '../src/mode-checkpoint-v2.js';

type DataRecord = Record<string, unknown>;

function competitor(participantId: string, controllerKind: 'human' | 'bot'): DataRecord {
  return {
    participantId,
    modeRole: 'competitor',
    teamId: null,
    controllerKind,
    characterDefinitionId: `character.${participantId}.test`,
    slotId: null,
    slotGeneration: 0,
  };
}

function raceConfig(): DataRecord {
  return {
    schemaVersion: 6,
    modeDefinitionId: 'arena.mode.race.test.v1',
    modeKind: 'race',
    modePolicyContentHash: 'ace0ace0',
    participantAssignments: [competitor('racer-1', 'human'), competitor('racer-2', 'bot')],
  };
}

function raceCheckpointOptions(): DataRecord {
  const config = raceConfig();
  return {
    checkpointSchemaVersion: 2,
    matchSchemaVersion: 6,
    modeDefinitionId: 'arena.mode.race.test.v1',
    contentHash: 'ace0ace0',
    matchSeed: 91,
    config,
    participantAssignments: config.participantAssignments,
    tick: 61,
    phase: 'running',
    eventSequence: 3,
    modeState: {
      kind: 'race',
      revision: 61,
      lastProcessedTick: 60,
      finishGateId: 'race-finish-gate.test',
      participants: [{
        participantId: 'racer-1', status: 'racing', safeAnchorId: 'safe-anchor-1.test',
        progressOrdinal: 2, respawnReadyTick: null, finishTick: null, rank: null,
      }, {
        participantId: 'racer-2', status: 'respawning', safeAnchorId: 'safe-anchor-2.test',
        progressOrdinal: 1, respawnReadyTick: 240, finishTick: null, rank: null,
      }],
    },
    modeResult: null,
    stateHash: '1234abcd',
  };
}

function survivalConfig(): DataRecord {
  return {
    schemaVersion: 6,
    modeDefinitionId: 'arena.mode.survival.test.v1',
    modeKind: 'survival',
    modePolicyContentHash: '51515151',
    participantAssignments: [{
      participantId: 'enemy-1', modeRole: 'enemy', teamId: 'team.enemy.test',
      controllerKind: 'bot', characterDefinitionId: 'character.enemy.test',
      slotId: 'enemy-slot-1.test', slotGeneration: 0,
    }, {
      participantId: 'player-1', modeRole: 'player', teamId: 'team.player.test',
      controllerKind: 'human', characterDefinitionId: 'character.player.test',
      slotId: null, slotGeneration: 0,
    }],
  };
}

function survivalCheckpointOptions(): DataRecord {
  const config = survivalConfig();
  return {
    checkpointSchemaVersion: 2,
    matchSchemaVersion: 6,
    modeDefinitionId: 'arena.mode.survival.test.v1',
    contentHash: '51515151',
    matchSeed: 19,
    config,
    participantAssignments: config.participantAssignments,
    tick: 1,
    phase: 'running',
    eventSequence: 2,
    modeState: {
      kind: 'survival',
      revision: 1,
      lastProcessedTick: 0,
      playerParticipantId: 'player-1',
      playerStatus: 'active',
      playerRespawnReadyTick: null,
      fallCount: 0,
      terminalFallCount: 2,
      survivedTicks: 0,
      pressureStage: 0,
      enemySlots: [{
        slotId: 'enemy-slot-1.test', participantId: 'enemy-1', active: true,
        generation: 1, anchorId: 'enemy-anchor-1.test', reactivationReadyTick: null,
      }],
    },
    modeResult: null,
    stateHash: '5151abcd',
  };
}

describe('ArenaModeCheckpointV2 production-unreachable candidate', () => {
  it('records Race safe-anchor/respawn/finish future state with full assignment identity', () => {
    const checkpoint = createArenaModeCheckpointV2(raceCheckpointOptions());
    expect(checkpoint).toMatchObject({
      checkpointSchemaVersion: 2,
      matchSchemaVersion: 6,
      modeDefinitionId: 'arena.mode.race.test.v1',
      contentHash: 'ace0ace0',
      matchSeed: 91,
      tick: 61,
      phase: 'running',
      stateHash: '1234abcd',
    });
    expect(checkpoint.modeState).toMatchObject({
      kind: 'race',
      participants: [{ participantId: 'racer-1', safeAnchorId: 'safe-anchor-1.test' }, {
        participantId: 'racer-2', status: 'respawning', respawnReadyTick: 240,
      }],
    });
    expect(Object.isFrozen(checkpoint)).toBe(true);
    expect(Object.isFrozen(checkpoint.modeState)).toBe(true);
    expect(validateArenaModeCheckpointV2(checkpoint)).toEqual(checkpoint);
  });

  it('records bounded Survival fall/pressure/slot generation state', () => {
    const checkpoint = createArenaModeCheckpointV2(survivalCheckpointOptions());
    expect(checkpoint.modeState).toEqual({
      kind: 'survival',
      revision: 1,
      lastProcessedTick: 0,
      playerParticipantId: 'player-1',
      playerStatus: 'active',
      playerRespawnReadyTick: null,
      fallCount: 0,
      terminalFallCount: 2,
      survivedTicks: 0,
      pressureStage: 0,
      enemySlots: [{
        slotId: 'enemy-slot-1.test', participantId: 'enemy-1', active: true,
        generation: 1, anchorId: 'enemy-anchor-1.test', reactivationReadyTick: null,
      }],
    });
  });

  it('restores only after config/content/assignment/seed identity closes', () => {
    const checkpoint = createArenaModeCheckpointV2(raceCheckpointOptions());
    const restored = restoreArenaModeCheckpointV2(checkpoint, {
      expectedConfig: raceConfig(),
      expectedMatchSeed: 91,
    });
    expect(restored).toMatchObject({
      matchSeed: 91,
      tick: 61,
      eventSequence: 3,
      stateHash: '1234abcd',
      checkpointIdentityHash: checkpoint.checkpointIdentityHash,
    });
    expect(Object.isFrozen(restored)).toBe(true);

    let published: unknown = null;
    expect(() => {
      published = restoreArenaModeCheckpointV2(checkpoint, {
        expectedConfig: raceConfig(),
        expectedMatchSeed: 92,
      });
    }).toThrow(/identity/);
    expect(published).toBeNull();
  });

  it('rejects future/unknown schema, assignment drift and terminal result mismatch', () => {
    expect(() => createArenaModeCheckpointV2({
      ...raceCheckpointOptions(), checkpointSchemaVersion: 3,
    })).toThrow(/checkpointSchemaVersion/);
    expect(() => createArenaModeCheckpointV2({
      ...raceCheckpointOptions(), future: true,
    })).toThrow(/future/);

    const assignmentDrift = raceCheckpointOptions();
    (assignmentDrift.participantAssignments as DataRecord[])[0]!.participantId = 'foreign';
    expect(() => createArenaModeCheckpointV2(assignmentDrift)).toThrow(/assignment identity/);

    const terminal = raceCheckpointOptions();
    terminal.tick = 62;
    terminal.phase = 'ended';
    terminal.modeResult = {
      kind: 'race',
      winnerParticipantIds: [],
      rankings: [{
        participantId: 'racer-1', rank: 1, finishTick: null, progressOrdinal: 2,
      }, {
        participantId: 'racer-2', rank: 2, finishTick: null, progressOrdinal: 1,
      }],
      reason: 'no-finisher',
      endedAtTick: 61,
    };
    const state = terminal.modeState as DataRecord;
    state.lastProcessedTick = 61;
    (state.participants as DataRecord[])[0]!.rank = 2;
    (state.participants as DataRecord[])[1]!.rank = 1;
    expect(() => createArenaModeCheckpointV2(terminal)).toThrow(/ranking identity/);
  });

  it('rejects tampered hash and accessor/Proxy values without a half restore', () => {
    const checkpoint = createArenaModeCheckpointV2(raceCheckpointOptions());
    expect(() => validateArenaModeCheckpointV2({
      ...checkpoint, checkpointIdentityHash: '00000000',
    })).toThrow(/声明hash/);

    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'checkpointSchemaVersion', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 2;
      },
    });
    expect(() => createArenaModeCheckpointV2(hostile)).toThrow(/访问器|数据字段/);
    expect(getterCalls).toBe(0);

    const proxy = new Proxy(raceCheckpointOptions(), {
      ownKeys() { throw new Error('checkpoint proxy trap'); },
    });
    expect(() => createArenaModeCheckpointV2(proxy)).toThrow(/checkpoint proxy trap/);
  });
});
