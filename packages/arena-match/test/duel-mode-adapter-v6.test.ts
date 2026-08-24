import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DuelModeAdapterV6 } from '../src/duel-mode-adapter-v6.js';

type DataRecord = Record<string, unknown>;

function competitor(participantId: string): DataRecord {
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

function duelConfig(): DataRecord {
  return {
    schemaVersion: 6,
    modeDefinitionId: 'arena.mode.duel.test.v6',
    modeKind: 'duel',
    modePolicyContentHash: 'd001d001',
    participantAssignments: [competitor('player-2'), competitor('player-1')],
  };
}

function duelBundle(): DataRecord {
  return {
    schemaVersion: 1,
    modeDefinitionId: 'arena.mode.duel.test.v6',
    modeKind: 'duel',
    contentHash: 'd001d001',
    participant: {
      definitionId: 'arena.mode.duel.participant.test.v1',
      minimumParticipants: 2,
      maximumParticipants: 2,
      roles: [{
        modeRole: 'competitor',
        minimumCount: 2,
        maximumCount: 2,
        allowedControllerKinds: ['human'],
        teamId: null,
        slotIds: [],
      }],
      controllerKindBounds: [{
        controllerKind: 'human', minimumCount: 2, maximumCount: 2,
      }],
    },
    elimination: {
      definitionId: 'arena.mode.duel.elimination.test.v1',
      roleDispositions: [{ modeRole: 'competitor', fallDisposition: 'eliminate' }],
    },
    respawn: {
      definitionId: 'arena.mode.duel.respawn.test.v1',
      rolePolicies: [{
        modeRole: 'competitor', enabled: false, delayTicks: 0, maximumRespawns: 0,
        anchorPolicy: { kind: 'disabled', anchorCapabilityId: null }, protectionTicks: 0,
      }],
    },
    relationship: {
      definitionId: 'arena.mode.duel.relationship.test.v1',
      selfTargeting: 'forbidden',
      relations: [{
        sourceRole: 'competitor', targetRole: 'competitor', relationship: 'hostile',
      }],
    },
  };
}

describe('DuelModeAdapterV6 production-unreachable candidate', () => {
  it('maps V5 phase, fall and result semantics without inventing tuning values', () => {
    const adapter = new DuelModeAdapterV6(duelConfig(), duelBundle());
    expect(adapter.mapV5Phase({ phase: 'preparing' })).toEqual({
      kind: 'duel', suddenDeath: false,
    });
    expect(adapter.mapV5Phase({ phase: 'sudden-death' })).toEqual({
      kind: 'duel', suddenDeath: true,
    });
    expect(adapter.mapV5ParticipantFall('player-2', 73)).toEqual({
      kind: 'participant-fall',
      tick: 73,
      participantId: 'player-2',
      modeRole: 'competitor',
      fallDisposition: 'eliminate',
      slotId: null,
      slotGeneration: 0,
      respawn: null,
    });
    expect(adapter.mapV5Result({
      winnerId: 'player-1',
      reason: 'last-participant-standing',
      isDraw: false,
      endedAtTick: 2499,
    })).toEqual({
      kind: 'duel',
      winnerParticipantIds: ['player-1'],
      reason: 'last-participant-standing',
      isDraw: false,
      endedAtTick: 2499,
    });
    expect(adapter.mapV5Result({
      winnerId: null,
      reason: 'simultaneous-elimination',
      isDraw: true,
      endedAtTick: 88,
    })).toEqual({
      kind: 'duel',
      winnerParticipantIds: [],
      reason: 'simultaneous-elimination',
      isDraw: true,
      endedAtTick: 88,
    });
  });

  it('rejects V5 identity, draw and exact-key drift before producing a mapping', () => {
    const adapter = new DuelModeAdapterV6(duelConfig(), duelBundle());
    expect(() => adapter.mapV5Result({
      winnerId: 'foreign', reason: 'last-participant-standing', isDraw: false, endedAtTick: 1,
    })).toThrow(/不属于当局/);
    expect(() => adapter.mapV5Result({
      winnerId: null, reason: 'timeout-score', isDraw: true, endedAtTick: 1,
    })).toThrow(/reason\/draw/);
    expect(() => adapter.mapV5Result({
      winnerId: 'player-1', reason: 'last-participant-standing', isDraw: false,
      endedAtTick: 1, future: true,
    })).toThrow(/future/);
    expect(() => adapter.mapV5Phase({ phase: 'ended' })).toThrow(/非终局/);
  });

  it('rejects accessors without execution and keeps authority/render dependencies out', () => {
    const adapter = new DuelModeAdapterV6(duelConfig(), duelBundle());
    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'winnerId', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'player-1';
      },
    });
    expect(() => adapter.mapV5Result(hostile)).toThrow(/访问器|数据字段/);
    expect(getterCalls).toBe(0);

    const source = readFileSync(new URL('../src/duel-mode-adapter-v6.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/Physics|Renderer|three|document\.|Date\.|performance\.|Math\.random/);
    expect(source).not.toMatch(/damage|speed|impulse|gravity|friction/);
  });
});
