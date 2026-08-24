import { describe, expect, it } from 'vitest';
import {
  MATCH_MODE_RESULT_POLICY_RESOLVER_V1_SCHEMA_VERSION,
  ModeResultPolicyResolverV1,
} from '../src/mode-result-policy-resolver-v1.js';

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
    participantAssignments: [
      competitor('racer-2', 'bot'),
      competitor('racer-1', 'human'),
      competitor('racer-3', 'bot'),
    ],
  };
}

function raceBundle(): DataRecord {
  return {
    schemaVersion: MATCH_MODE_RESULT_POLICY_RESOLVER_V1_SCHEMA_VERSION,
    modeDefinitionId: 'arena.mode.race.test.v1',
    modeKind: 'race',
    contentHash: 'ace0ace0',
    result: {
      definitionId: 'arena.mode.race.policy.result.test.v1',
      resultKind: 'race',
      allowedReasons: ['finish-claimed', 'no-finisher'],
      projectionPolicy: 'finish-then-progress-with-ties',
    },
  };
}

function duelConfig(): DataRecord {
  return {
    schemaVersion: 6,
    modeDefinitionId: 'arena.mode.duel.test.v1',
    modeKind: 'duel',
    modePolicyContentHash: 'd001d001',
    participantAssignments: [
      competitor('duelist-2', 'bot'),
      competitor('duelist-1', 'human'),
    ],
  };
}

function duelBundle(): DataRecord {
  return {
    schemaVersion: MATCH_MODE_RESULT_POLICY_RESOLVER_V1_SCHEMA_VERSION,
    modeDefinitionId: 'arena.mode.duel.test.v1',
    modeKind: 'duel',
    contentHash: 'd001d001',
    result: {
      definitionId: 'arena.mode.duel.policy.result.test.v1',
      resultKind: 'duel',
      allowedReasons: [
        'last-participant-standing',
        'simultaneous-elimination',
        'timeout-draw',
        'timeout-score',
      ],
      projectionPolicy: 'winner-ids-draw',
    },
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

function survivalBundle(): DataRecord {
  return {
    schemaVersion: MATCH_MODE_RESULT_POLICY_RESOLVER_V1_SCHEMA_VERSION,
    modeDefinitionId: 'arena.mode.survival.test.v1',
    modeKind: 'survival',
    contentHash: '51515151',
    result: {
      definitionId: 'arena.mode.survival.policy.result.test.v1',
      resultKind: 'survival',
      allowedReasons: ['survival-time-cap', 'terminal-player-fall'],
      projectionPolicy: 'ticks-stage-falls',
    },
  };
}

describe('ModeResultPolicyResolverV1', () => {
  it('binds Duel winner and terminal tick to the current match', () => {
    const resolver = new ModeResultPolicyResolverV1(duelConfig(), duelBundle());
    expect(resolver.assertResult({
      kind: 'duel',
      winnerParticipantIds: ['duelist-1'],
      isDraw: false,
      reason: 'last-participant-standing',
      endedAtTick: 90,
    }, 90)).toMatchObject({ kind: 'duel', winnerParticipantIds: ['duelist-1'] });
    expect(() => resolver.assertResult({
      kind: 'duel',
      winnerParticipantIds: ['foreign'],
      isDraw: false,
      reason: 'last-participant-standing',
      endedAtTick: 90,
    }, 90)).toThrow(/不属于本局/);
  });

  it('accepts Race shared-rank finish and progress-tie projection', () => {
    const resolver = new ModeResultPolicyResolverV1(raceConfig(), raceBundle());
    expect(resolver.assertResult({
      kind: 'race',
      winnerParticipantIds: ['racer-1'],
      rankings: [{
        participantId: 'racer-1', rank: 1, finishTick: 50, progressOrdinal: 8,
      }, {
        participantId: 'racer-2', rank: 2, finishTick: null, progressOrdinal: 6,
      }, {
        participantId: 'racer-3', rank: 2, finishTick: null, progressOrdinal: 6,
      }],
      reason: 'finish-claimed',
      endedAtTick: 50,
    }, 50)).toMatchObject({ kind: 'race', reason: 'finish-claimed' });
  });

  it('rejects Race ranking and terminal tick drift', () => {
    const resolver = new ModeResultPolicyResolverV1(raceConfig(), raceBundle());
    expect(() => resolver.assertResult({
      kind: 'race',
      winnerParticipantIds: ['racer-1'],
      rankings: [{
        participantId: 'racer-1', rank: 1, finishTick: 50, progressOrdinal: 8,
      }, {
        participantId: 'racer-2', rank: 3, finishTick: null, progressOrdinal: 6,
      }, {
        participantId: 'racer-3', rank: 2, finishTick: null, progressOrdinal: 5,
      }],
      reason: 'finish-claimed',
      endedAtTick: 50,
    }, 50)).toThrow(/progress|投影/);
    expect(() => resolver.assertResult({
      kind: 'race',
      winnerParticipantIds: [],
      rankings: [{
        participantId: 'racer-1', rank: 1, finishTick: null, progressOrdinal: 8,
      }, {
        participantId: 'racer-2', rank: 2, finishTick: null, progressOrdinal: 6,
      }, {
        participantId: 'racer-3', rank: 3, finishTick: null, progressOrdinal: 5,
      }],
      reason: 'no-finisher',
      endedAtTick: 50,
    }, 51)).toThrow(/终局tick/);
  });

  it('binds Survival result to the single player participant', () => {
    const resolver = new ModeResultPolicyResolverV1(survivalConfig(), survivalBundle());
    expect(resolver.assertResult({
      kind: 'survival',
      playerParticipantId: 'player-1',
      survivedTicks: 120,
      pressureStage: 3,
      fallCount: 2,
      reason: 'terminal-player-fall',
      endedAtTick: 150,
    }, 150)).toMatchObject({ kind: 'survival', playerParticipantId: 'player-1' });
    expect(() => resolver.assertResult({
      kind: 'survival',
      playerParticipantId: 'enemy-1',
      survivedTicks: 120,
      pressureStage: 3,
      fallCount: 2,
      reason: 'terminal-player-fall',
      endedAtTick: 150,
    }, 150)).toThrow(/唯一player/);
    expect(() => resolver.assertResult({
      kind: 'survival',
      playerParticipantId: 'player-1',
      survivedTicks: 120,
      pressureStage: 3,
      fallCount: 2,
      reason: 'survival-time-cap',
      endedAtTick: 150,
    }, 150)).toThrow(/第二次掉落/);
  });

  it('rejects identity drift and accessor-owned bundles without invoking getters', () => {
    expect(() => new ModeResultPolicyResolverV1(raceConfig(), {
      ...raceBundle(), contentHash: 'deadbeef',
    })).toThrow(/identity/);
    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    expect(() => new ModeResultPolicyResolverV1(raceConfig(), hostile)).toThrow(
      /访问器|数据字段/,
    );
    expect(getterCalls).toBe(0);
  });
});
