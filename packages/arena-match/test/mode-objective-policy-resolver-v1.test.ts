import { describe, expect, it } from 'vitest';
import {
  MATCH_MODE_OBJECTIVE_POLICY_RESOLVER_V1_SCHEMA_VERSION,
  ModeObjectivePolicyResolverV1,
} from '../src/mode-objective-policy-resolver-v1.js';

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

function config(modeKind: 'duel' | 'race', participantIds: readonly string[]): DataRecord {
  return {
    schemaVersion: 6,
    modeDefinitionId: `arena.mode.${modeKind}.test.v1`,
    modeKind,
    modePolicyContentHash: `${modeKind === 'duel' ? 'd001d001' : 'ace0ace0'}`,
    participantAssignments: participantIds.map((participantId, index) => (
      competitor(participantId, index === 0 ? 'human' : 'bot')
    )),
  };
}

function bundle(modeKind: 'duel' | 'race' | 'survival'): DataRecord {
  const matchPolicyContentHash = modeKind === 'duel'
    ? 'd001d001'
    : modeKind === 'race' ? 'ace0ace0' : '51515151';
  const objective = modeKind === 'duel'
    ? {
      definitionId: 'arena.mode.duel.policy.objective.test.v1',
      kind: 'duel',
      timeoutPolicy: 'score-or-draw',
    }
    : modeKind === 'race'
      ? {
        definitionId: 'arena.mode.race.policy.objective.test.v1',
        kind: 'race',
        finishGateCapabilityId: 'arena.map.capability.race-finish.test.v1',
        validClaimEndPolicy: 'claim-tick',
        sameTickRankPolicy: 'shared-rank-1',
        hardLimitPolicy: 'no-finisher',
      }
      : {
        definitionId: 'arena.mode.survival.policy.objective.test.v1',
        kind: 'survival',
        terminalPlayerFallCount: 2,
        hardLimitPolicy: 'survival-time-cap',
      };
  return {
    schemaVersion: MATCH_MODE_OBJECTIVE_POLICY_RESOLVER_V1_SCHEMA_VERSION,
    modeDefinitionId: `arena.mode.${modeKind}.test.v1`,
    modeKind,
    matchPolicyContentHash,
    contentHash: modeKind === 'duel' ? '0b1ec710' : modeKind === 'race' ? 'facecafe' : '5a5a5a5a',
    objective,
  };
}

function duelResult(reason: string, winnerParticipantIds: readonly string[]): DataRecord {
  return {
    kind: 'duel',
    winnerParticipantIds,
    isDraw: winnerParticipantIds.length === 0,
    reason,
    endedAtTick: 90,
  };
}

function raceResult(reason: 'finish-claimed' | 'no-finisher'): DataRecord {
  const finished = reason === 'finish-claimed';
  return {
    kind: 'race',
    winnerParticipantIds: finished ? ['racer-1'] : [],
    rankings: [{
      participantId: 'racer-1',
      rank: 1,
      finishTick: finished ? 50 : null,
      progressOrdinal: 8,
    }, {
      participantId: 'racer-2',
      rank: 2,
      finishTick: null,
      progressOrdinal: 6,
    }],
    reason,
    endedAtTick: 50,
  };
}

function survivalConfig(): DataRecord {
  return {
    schemaVersion: 6,
    modeDefinitionId: 'arena.mode.survival.test.v1',
    modeKind: 'survival',
    modePolicyContentHash: '51515151',
    participantAssignments: [{
      participantId: 'player-1',
      modeRole: 'player',
      teamId: null,
      controllerKind: 'human',
      characterDefinitionId: 'character.player.test',
      slotId: null,
      slotGeneration: 0,
    }, {
      participantId: 'enemy-1',
      modeRole: 'enemy',
      teamId: null,
      controllerKind: 'bot',
      characterDefinitionId: 'character.enemy.test',
      slotId: 'enemy-slot-1.test',
      slotGeneration: 1,
    }],
  };
}

describe('ModeObjectivePolicyResolverV1', () => {
  it('asserts Duel elimination and independent timeout-score facts', () => {
    const resolver = new ModeObjectivePolicyResolverV1(
      config('duel', ['duelist-1', 'duelist-2']),
      bundle('duel'),
    );
    expect(resolver.assertTerminalObjective({
      kind: 'duel',
      tick: 90,
      participants: [{
        participantId: 'duelist-1', status: 'active', lives: 1, eliminations: 2,
      }, {
        participantId: 'duelist-2', status: 'eliminated', lives: 0, eliminations: 0,
      }],
    }, duelResult('last-participant-standing', ['duelist-1']))).toMatchObject({
      reason: 'last-participant-standing',
    });
    expect(resolver.assertTerminalObjective({
      kind: 'duel',
      tick: 90,
      participants: [{
        participantId: 'duelist-1', status: 'active', lives: 2, eliminations: 1,
      }, {
        participantId: 'duelist-2', status: 'active', lives: 1, eliminations: 9,
      }],
    }, duelResult('timeout-score', ['duelist-1']))).toMatchObject({ reason: 'timeout-score' });
  });

  it('rejects Duel reason or winner drift from participant facts', () => {
    const resolver = new ModeObjectivePolicyResolverV1(
      config('duel', ['duelist-1', 'duelist-2']),
      bundle('duel'),
    );
    expect(() => resolver.assertTerminalObjective({
      kind: 'duel',
      tick: 90,
      participants: [{
        participantId: 'duelist-1', status: 'active', lives: 2, eliminations: 1,
      }, {
        participantId: 'duelist-2', status: 'active', lives: 2, eliminations: 1,
      }],
    }, duelResult('timeout-score', ['duelist-1']))).toThrow(/reason|draw/);
  });

  it('binds Race finish-claimed and no-finisher to the current terminal facts', () => {
    const resolver = new ModeObjectivePolicyResolverV1(
      config('race', ['racer-1', 'racer-2']),
      bundle('race'),
    );
    expect(resolver.assertTerminalObjective({
      kind: 'race',
      tick: 50,
      activeTick: 20,
      hardLimitActiveTicks: 200,
      finishClaimParticipantIds: ['racer-1'],
    }, raceResult('finish-claimed'))).toMatchObject({ reason: 'finish-claimed' });
    expect(resolver.assertTerminalObjective({
      kind: 'race',
      tick: 50,
      activeTick: 200,
      hardLimitActiveTicks: 200,
      finishClaimParticipantIds: [],
    }, raceResult('no-finisher'))).toMatchObject({ reason: 'no-finisher' });
    expect(() => resolver.assertTerminalObjective({
      kind: 'race',
      tick: 50,
      activeTick: 199,
      hardLimitActiveTicks: 200,
      finishClaimParticipantIds: [],
    }, raceResult('no-finisher'))).toThrow(/hard limit/);
    expect(() => resolver.assertTerminalObjective({
      kind: 'race',
      tick: 50,
      activeTick: 20,
      hardLimitActiveTicks: 200,
      finishClaimParticipantIds: ['spectator-outside-match'],
    }, {
      ...raceResult('finish-claimed'),
      winnerParticipantIds: ['spectator-outside-match'],
    })).toThrow(/本局participant/);
  });

  it('binds Survival terminal-player-fall and time-cap to current facts', () => {
    const resolver = new ModeObjectivePolicyResolverV1(survivalConfig(), bundle('survival'));
    const result = {
      kind: 'survival',
      playerParticipantId: 'player-1',
      survivedTicks: 150,
      pressureStage: 3,
      fallCount: 2,
      reason: 'terminal-player-fall',
      endedAtTick: 150,
    };
    expect(resolver.assertTerminalObjective({
      kind: 'survival',
      tick: 150,
      activeTick: 150,
      hardLimitActiveTicks: 500,
      playerFell: true,
      fallCount: 2,
    }, result)).toMatchObject({ reason: 'terminal-player-fall' });
    expect(() => resolver.assertTerminalObjective({
      kind: 'survival',
      tick: 150,
      activeTick: 150,
      hardLimitActiveTicks: 500,
      playerFell: false,
      fallCount: 2,
    }, result)).toThrow(/第二次玩家掉落/);
    expect(resolver.assertTerminalObjective({
      kind: 'survival',
      tick: 500,
      activeTick: 500,
      hardLimitActiveTicks: 500,
      playerFell: false,
      fallCount: 1,
    }, {
      kind: 'survival',
      playerParticipantId: 'player-1',
      survivedTicks: 500,
      pressureStage: 5,
      fallCount: 1,
      reason: 'survival-time-cap',
      endedAtTick: 500,
    })).toMatchObject({ reason: 'survival-time-cap' });
    expect(() => resolver.assertTerminalObjective({
      kind: 'survival',
      tick: 501,
      activeTick: 501,
      hardLimitActiveTicks: 500,
      playerFell: true,
      fallCount: 3,
    }, {
      kind: 'survival',
      playerParticipantId: 'player-1',
      survivedTicks: 501,
      pressureStage: 5,
      fallCount: 3,
      reason: 'terminal-player-fall',
      endedAtTick: 501,
    })).toThrow(/不能超过/);
  });

  it('rejects match identity drift and accessor bundles without invoking getters', () => {
    expect(() => new ModeObjectivePolicyResolverV1(
      config('race', ['racer-1', 'racer-2']),
      { ...bundle('race'), matchPolicyContentHash: 'deadbeef' },
    )).toThrow(/identity/);
    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    expect(() => new ModeObjectivePolicyResolverV1(
      config('race', ['racer-1', 'racer-2']),
      hostile,
    )).toThrow(/访问器|数据字段/);
    expect(getterCalls).toBe(0);
  });
});
