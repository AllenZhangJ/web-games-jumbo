import { describe, expect, it } from 'vitest';
import {
  MATCH_MODE_POLICY_RESOLVER_SCHEMA_VERSION,
  ModePolicyResolver,
} from '../src/mode-policy-resolver.js';

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
    participantAssignments: [competitor('racer-2', 'bot'), competitor('racer-1', 'human')],
  };
}

function raceBundle(): DataRecord {
  return {
    schemaVersion: MATCH_MODE_POLICY_RESOLVER_SCHEMA_VERSION,
    modeDefinitionId: 'arena.mode.race.test.v1',
    modeKind: 'race',
    contentHash: 'ace0ace0',
    participant: {
      definitionId: 'arena.mode.race.policy.participant.test.v1',
      minimumParticipants: 2,
      maximumParticipants: 4,
      roles: [{
        modeRole: 'competitor',
        minimumCount: 2,
        maximumCount: 4,
        allowedControllerKinds: ['human', 'bot'],
        teamId: null,
        slotIds: [],
      }],
      controllerKindBounds: [{
        controllerKind: 'bot', minimumCount: 0, maximumCount: 3,
      }, {
        controllerKind: 'human', minimumCount: 1, maximumCount: 4,
      }],
    },
    elimination: {
      definitionId: 'arena.mode.race.policy.elimination.test.v1',
      roleDispositions: [{
        modeRole: 'competitor', fallDisposition: 'schedule-respawn',
      }],
    },
    respawn: {
      definitionId: 'arena.mode.race.policy.respawn.test.v1',
      rolePolicies: [{
        modeRole: 'competitor',
        enabled: true,
        delayTicks: 180,
        maximumRespawns: null,
        anchorPolicy: {
          kind: 'latest-valid-safe-anchor',
          anchorCapabilityId: 'race-start-safe-anchor.test',
        },
        protectionTicks: 12,
      }],
    },
    relationship: {
      definitionId: 'arena.mode.race.policy.relationship.test.v1',
      selfTargeting: 'forbidden',
      relations: [{
        sourceRole: 'competitor', targetRole: 'competitor', relationship: 'hostile',
      }],
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
      teamId: 'team.player.test',
      controllerKind: 'human',
      characterDefinitionId: 'character.player.test',
      slotId: null,
      slotGeneration: 0,
    }, {
      participantId: 'enemy-1',
      modeRole: 'enemy',
      teamId: 'team.enemy.test',
      controllerKind: 'bot',
      characterDefinitionId: 'character.enemy.test',
      slotId: 'enemy-slot-1.test',
      slotGeneration: 3,
    }],
  };
}

function survivalBundle(): DataRecord {
  return {
    schemaVersion: 1,
    modeDefinitionId: 'arena.mode.survival.test.v1',
    modeKind: 'survival',
    contentHash: '51515151',
    participant: {
      definitionId: 'arena.mode.survival.policy.participant.test.v1',
      minimumParticipants: 2,
      maximumParticipants: 17,
      roles: [{
        modeRole: 'enemy', minimumCount: 1, maximumCount: 16,
        allowedControllerKinds: ['bot'], teamId: 'team.enemy.test',
        slotIds: ['enemy-slot-1.test'],
      }, {
        modeRole: 'player', minimumCount: 1, maximumCount: 1,
        allowedControllerKinds: ['human'], teamId: 'team.player.test', slotIds: [],
      }],
      controllerKindBounds: [{
        controllerKind: 'bot', minimumCount: 1, maximumCount: 16,
      }, {
        controllerKind: 'human', minimumCount: 1, maximumCount: 1,
      }],
    },
    elimination: {
      definitionId: 'arena.mode.survival.policy.elimination.test.v1',
      roleDispositions: [{ modeRole: 'enemy', fallDisposition: 'deactivate-slot' }, {
        modeRole: 'player', fallDisposition: 'count-for-objective',
      }],
    },
    respawn: {
      definitionId: 'arena.mode.survival.policy.respawn.test.v1',
      rolePolicies: [{
        modeRole: 'enemy', enabled: false, delayTicks: 0, maximumRespawns: 0,
        anchorPolicy: { kind: 'disabled', anchorCapabilityId: null }, protectionTicks: 0,
      }, {
        modeRole: 'player', enabled: true, delayTicks: 30, maximumRespawns: 1,
        anchorPolicy: {
          kind: 'fixed-anchor', anchorCapabilityId: 'survival-respawn-anchor.test',
        }, protectionTicks: 10,
      }],
    },
    relationship: {
      definitionId: 'arena.mode.survival.policy.relationship.test.v1',
      selfTargeting: 'forbidden',
      relations: [{
        sourceRole: 'enemy', targetRole: 'enemy', relationship: 'neutral',
      }, {
        sourceRole: 'enemy', targetRole: 'player', relationship: 'hostile',
      }, {
        sourceRole: 'player', targetRole: 'enemy', relationship: 'hostile',
      }, {
        sourceRole: 'player', targetRole: 'player', relationship: 'neutral',
      }],
    },
  };
}

describe('ModePolicyResolver', () => {
  it('consumes readonly policy data and emits authority-neutral fall commands', () => {
    const bundle = raceBundle();
    const resolver = new ModePolicyResolver(raceConfig(), bundle);
    expect(resolver.resolveParticipantFall('racer-1', 4)).toEqual({
      kind: 'participant-fall',
      tick: 4,
      participantId: 'racer-1',
      modeRole: 'competitor',
      fallDisposition: 'schedule-respawn',
      slotId: null,
      slotGeneration: 0,
      respawn: {
        delayTicks: 180,
        maximumRespawns: null,
        anchorPolicy: {
          kind: 'latest-valid-safe-anchor',
          anchorCapabilityId: 'race-start-safe-anchor.test',
        },
        protectionTicks: 12,
      },
    });
    expect(resolver.relationshipBetween('racer-1', 'racer-2')).toBe('hostile');
    ((bundle.respawn as DataRecord).rolePolicies as DataRecord[])[0]!.delayTicks = 999;
    expect(resolver.resolveParticipantFall('racer-1', 5).respawn?.delayTicks).toBe(180);
    expect(Object.isFrozen(resolver.definitionBundle)).toBe(true);
  });

  it('keeps player/enemy fall, team, controller and slot policies separate', () => {
    const resolver = new ModePolicyResolver(survivalConfig(), survivalBundle());
    expect(resolver.resolveParticipantFall('player-1', 1)).toMatchObject({
      modeRole: 'player', fallDisposition: 'count-for-objective', slotId: null,
      respawn: { delayTicks: 30, maximumRespawns: 1 },
    });
    expect(resolver.resolveParticipantFall('enemy-1', 1)).toMatchObject({
      modeRole: 'enemy', fallDisposition: 'deactivate-slot',
      slotId: 'enemy-slot-1.test', slotGeneration: 3, respawn: null,
    });
    expect(resolver.relationshipBetween('enemy-1', 'player-1')).toBe('hostile');
    expect(() => resolver.relationshipBetween('player-1', 'player-1')).toThrow(/self targeting/);
  });

  it('rejects future schema, identity drift, duplicate policy roles and unknown participants', () => {
    expect(() => new ModePolicyResolver(raceConfig(), {
      ...raceBundle(), schemaVersion: 2,
    })).toThrow(/schemaVersion/);
    expect(() => new ModePolicyResolver(raceConfig(), {
      ...raceBundle(), contentHash: 'deadbeef',
    })).toThrow(/identity/);
    const duplicated = raceBundle();
    ((duplicated.elimination as DataRecord).roleDispositions as DataRecord[]).push({
      modeRole: 'competitor', fallDisposition: 'eliminate',
    });
    expect(() => new ModePolicyResolver(raceConfig(), duplicated)).toThrow(/不能重复/);
    const resolver = new ModePolicyResolver(raceConfig(), raceBundle());
    expect(() => resolver.resolveParticipantFall('foreign', 0)).toThrow(/未知 participant/);
  });

  it('rejects accessor-owned policy data without invoking getters', () => {
    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    expect(() => new ModePolicyResolver(raceConfig(), hostile)).toThrow(/访问器|数据字段/);
    expect(getterCalls).toBe(0);
  });
});
