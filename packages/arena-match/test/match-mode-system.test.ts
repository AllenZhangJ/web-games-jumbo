import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MatchModeSystem } from '../src/match-mode-system.js';

type DataRecord = Record<string, unknown>;

function survivalConfig(): DataRecord {
  return {
    schemaVersion: 6,
    modeDefinitionId: 'arena.mode.survival.test.v1',
    modeKind: 'survival',
    modePolicyContentHash: '51515151',
    participantAssignments: [{
      participantId: 'player-1', modeRole: 'player', teamId: 'team.player.test',
      controllerKind: 'human', characterDefinitionId: 'character.player.test',
      slotId: null, slotGeneration: 0,
    }, {
      participantId: 'enemy-1', modeRole: 'enemy', teamId: 'team.enemy.test',
      controllerKind: 'bot', characterDefinitionId: 'character.enemy.test',
      slotId: 'enemy-slot-1.test', slotGeneration: 0,
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
      definitionId: 'participant.test', minimumParticipants: 2, maximumParticipants: 17,
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
      definitionId: 'elimination.test',
      roleDispositions: [{ modeRole: 'enemy', fallDisposition: 'deactivate-slot' }, {
        modeRole: 'player', fallDisposition: 'count-for-objective',
      }],
    },
    respawn: {
      definitionId: 'respawn.test',
      rolePolicies: [{
        modeRole: 'enemy', enabled: false, delayTicks: 0, maximumRespawns: 0,
        anchorPolicy: { kind: 'disabled', anchorCapabilityId: null }, protectionTicks: 0,
      }, {
        modeRole: 'player', enabled: true, delayTicks: 30, maximumRespawns: 1,
        anchorPolicy: { kind: 'fixed-anchor', anchorCapabilityId: 'respawn-anchor.test' },
        protectionTicks: 10,
      }],
    },
    relationship: {
      definitionId: 'relationship.test', selfTargeting: 'forbidden',
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

function createSystem(): MatchModeSystem {
  return new MatchModeSystem(survivalConfig(), survivalBundle());
}

describe('MatchModeSystem production-unreachable candidate', () => {
  it('commits only mode state and returns frozen commands/projection in canonical order', () => {
    const system = createSystem();
    system.start();
    expect(system.processTick({ tick: 0, participantFalls: [] })).toMatchObject({
      tick: 0,
      commands: [],
      state: { revision: 0, lastProcessedTick: 0 },
    });
    const resolution = system.processTick({
      tick: 1,
      participantFalls: ['player-1', 'enemy-1'],
    });
    expect(resolution.commands.map(({ participantId }) => participantId)).toEqual([
      'enemy-1',
      'player-1',
    ]);
    expect(resolution.state).toMatchObject({
      modeDefinitionId: 'arena.mode.survival.test.v1',
      modeKind: 'survival',
      revision: 1,
      lastProcessedTick: 1,
      objectiveFallCounts: [{ participantId: 'player-1', count: 1 }],
    });
    expect(resolution.projection.state).toEqual({
      kind: 'survival',
      objectiveFallCounts: [{ participantId: 'player-1', count: 1 }],
    });
    expect(Object.isFrozen(resolution)).toBe(true);
    expect(Object.isFrozen(resolution.commands)).toBe(true);
    expect(Object.isFrozen(resolution.projection.state)).toBe(true);
  });

  it('rejects malformed input before commit and permits the same valid tick retry', () => {
    const system = createSystem();
    system.start();
    expect(() => system.processTick({
      tick: 0,
      participantFalls: ['player-1', 'player-1'],
    })).toThrow(/不能重复/);
    expect(system.getStateSnapshot()).toMatchObject({
      revision: 0,
      lastProcessedTick: -1,
      objectiveFallCounts: [],
    });
    expect(system.processTick({ tick: 0, participantFalls: ['player-1'] }).state).toMatchObject({
      revision: 1,
      lastProcessedTick: 0,
    });
    expect(() => system.processTick({ tick: 2, participantFalls: [] })).toThrow(/严格递增 1/);
    expect(system.getStateSnapshot().lastProcessedTick).toBe(0);
  });

  it('has explicit start/pause/resume/destroy transitions and idempotent completed destroy', () => {
    const system = createSystem();
    expect(() => system.pause()).toThrow(/只能从 active/);
    system.start();
    system.pause();
    expect(system.state).toBe('paused');
    expect(() => system.processTick({ tick: 0, participantFalls: [] })).toThrow(/只在 active/);
    system.resume();
    system.processTick({ tick: 0, participantFalls: [] });
    system.destroy();
    system.destroy();
    expect(system.state).toBe('destroyed');
    expect(() => system.getReadonlyProjection()).toThrow(/已销毁/);
  });

  it('detects swallowed Proxy reentry and fails closed without committing a tick', () => {
    const system = createSystem();
    system.start();
    const facts = new Proxy({ tick: 0, participantFalls: [] }, {
      ownKeys(target) {
        try {
          system.processTick({ tick: 0, participantFalls: [] });
        } catch {
          // A hostile reflection trap cannot hide its reentry attempt.
        }
        return Reflect.ownKeys(target);
      },
    });
    expect(() => system.processTick(facts)).toThrow(/重入/);
    expect(system.state).toBe('failed');
    expect(() => system.getStateSnapshot()).toThrow(/失败关闭/);
  });

  it('keeps Physics, Renderer, Session and wall-clock APIs outside the ModeSystem source', () => {
    const source = readFileSync(new URL('../src/match-mode-system.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/arena-physics|three|Renderer|Session|Date\.|performance\.|Math\.random/);
    expect(source).toContain('commands: Object.freeze(commands)');
    expect(source).toContain('projection: this.getReadonlyProjection()');
  });
});
