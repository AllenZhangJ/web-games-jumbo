import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  SURVIVAL_MODE_TERMINAL_PLAYER_FALL_COUNT_V1,
  SurvivalModeSystem,
} from '../src/survival-mode-system.js';

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
      participantId: 'enemy-2', modeRole: 'enemy', teamId: 'team.enemy.test',
      controllerKind: 'bot', characterDefinitionId: 'character.enemy.test',
      slotId: 'enemy-slot-2.test', slotGeneration: 0,
    }, {
      participantId: 'enemy-1', modeRole: 'enemy', teamId: 'team.enemy.test',
      controllerKind: 'bot', characterDefinitionId: 'character.enemy.test',
      slotId: 'enemy-slot-1.test', slotGeneration: 0,
    }],
  };
}

function survivalFixture(overrides: Partial<DataRecord> = {}): DataRecord {
  return {
    schemaVersion: 1,
    fixtureDefinitionId: 'arena.mode.survival.runtime.test.v1',
    terminalPlayerFallCount: SURVIVAL_MODE_TERMINAL_PLAYER_FALL_COUNT_V1,
    playerRespawnDelayTicks: 2,
    playerRespawnProtectionTicks: 10,
    playerRespawnAnchorId: 'survival-player-anchor.test',
    hardLimitActiveTicks: 100,
    pressurePolicyDefinitionId: 'arena.survival.pressure.test.v1',
    tierPolicyDefinitionId: 'arena.survival.tier.test.v1',
    slotActivationOrder: ['enemy-slot-1.test', 'enemy-slot-2.test'],
    slotEntries: [{
      slotId: 'enemy-slot-1.test', participantId: 'enemy-1', anchorId: 'enemy-anchor-1.test',
    }, {
      slotId: 'enemy-slot-2.test', participantId: 'enemy-2', anchorId: 'enemy-anchor-2.test',
    }],
    pressureStages: [{
      stage: 0, startActiveTick: 0, desiredActiveEnemySlots: 1, reactivationDelayTicks: 2,
    }, {
      stage: 1, startActiveTick: 3, desiredActiveEnemySlots: 2, reactivationDelayTicks: 2,
    }],
    equipmentTiers: [{
      minimumWaveIndex: 0,
      survivalLevel: 1,
      variants: [{
        collectionEquipmentDefinitionId: 'equipment.collection.blade.test',
        runtimeEquipmentDefinitionId: 'equipment.runtime.blade.level-1.test',
      }],
    }, {
      minimumWaveIndex: 2,
      survivalLevel: 2,
      variants: [{
        collectionEquipmentDefinitionId: 'equipment.collection.blade.test',
        runtimeEquipmentDefinitionId: 'equipment.runtime.blade.level-2.test',
      }],
    }],
    ...overrides,
  };
}

function facts(tick: number, overrides: Partial<DataRecord> = {}): DataRecord {
  return { tick, activeTick: tick, playerFell: false, enemyFalls: [], ...overrides };
}

describe('SurvivalModeSystem production-unreachable candidate', () => {
  it('activates bounded slots in fixture order and advances generation on reactivation', () => {
    const system = new SurvivalModeSystem(survivalConfig(), survivalFixture());
    system.start();
    expect(system.step(facts(0)).commands).toEqual([{
      kind: 'change-enemy-slot',
      participantId: 'enemy-1',
      slotId: 'enemy-slot-1.test',
      previousGeneration: 0,
      generation: 1,
      active: true,
      anchorId: 'enemy-anchor-1.test',
      reason: 'pressure-stage',
    }]);
    const fall = system.step(facts(1, { enemyFalls: ['enemy-1'] }));
    expect(fall.commands.map(({ kind }) => kind)).toEqual([
      'change-enemy-slot', 'change-enemy-slot',
    ]);
    expect(fall.state.enemySlots).toEqual([
      {
        slotId: 'enemy-slot-1.test', participantId: 'enemy-1', active: false,
        generation: 1, anchorId: null, reactivationReadyTick: 3,
      }, {
        slotId: 'enemy-slot-2.test', participantId: 'enemy-2', active: true,
        generation: 1, anchorId: 'enemy-anchor-2.test', reactivationReadyTick: null,
      },
    ]);
    system.step(facts(2));
    const pressure = system.step(facts(3));
    expect(pressure.commands).toContainEqual({
      kind: 'change-enemy-slot',
      participantId: 'enemy-1',
      slotId: 'enemy-slot-1.test',
      previousGeneration: 1,
      generation: 2,
      active: true,
      anchorId: 'enemy-anchor-1.test',
      reason: 'reactivation-ready',
    });
  });

  it('respawns only the first player fall and ends on the second fall', () => {
    const system = new SurvivalModeSystem(survivalConfig(), survivalFixture());
    system.start();
    const first = system.step(facts(0, { playerFell: true }));
    expect(first.commands).toEqual(expect.arrayContaining([{
      kind: 'count-player-fall',
      participantId: 'player-1',
      fallCount: 1,
      terminalFallCount: 2,
      terminal: false,
    }, {
      kind: 'schedule-player-respawn',
      participantId: 'player-1',
      readyTick: 2,
      anchorId: 'survival-player-anchor.test',
      protectionTicks: 10,
    }]));
    system.step(facts(1));
    expect(system.step(facts(2)).commands).toContainEqual({
      kind: 'respawn-player',
      participantId: 'player-1',
      anchorId: 'survival-player-anchor.test',
      protectionTicks: 10,
    });
    const terminal = system.step(facts(3, { playerFell: true }));
    expect(terminal.state.result).toEqual({
      kind: 'survival',
      playerParticipantId: 'player-1',
      survivedTicks: 3,
      pressureStage: 1,
      fallCount: 2,
      reason: 'terminal-player-fall',
      endedAtTick: 3,
    });
    expect(terminal.commands.at(-1)).toEqual({ kind: 'end-survival', result: terminal.state.result });
    expect(() => system.step(facts(4))).toThrow(/active/);
  });

  it('uses only explicit pressure/tier fixtures and never guesses a production value', () => {
    const system = new SurvivalModeSystem(survivalConfig(), survivalFixture());
    expect(system.resolveEquipmentTier({
      waveIndex: 0,
      collectionEquipmentDefinitionId: 'equipment.collection.blade.test',
    })).toEqual({
      tierPolicyDefinitionId: 'arena.survival.tier.test.v1',
      waveIndex: 0,
      survivalLevel: 1,
      collectionEquipmentDefinitionId: 'equipment.collection.blade.test',
      runtimeEquipmentDefinitionId: 'equipment.runtime.blade.level-1.test',
    });
    expect(system.resolveEquipmentTier({
      waveIndex: 2,
      collectionEquipmentDefinitionId: 'equipment.collection.blade.test',
    }).runtimeEquipmentDefinitionId).toBe('equipment.runtime.blade.level-2.test');
    expect(() => system.resolveEquipmentTier({
      waveIndex: 2,
      collectionEquipmentDefinitionId: 'equipment.collection.unknown',
    })).toThrow(/缺少 collection 显式映射/);
    expect(() => new SurvivalModeSystem(survivalConfig(), survivalFixture({
      pressurePolicyDefinitionId: 'arena.survival.pressure.production.v1',
    }))).toThrow(/\.test\./);
    const reusedRuntime = survivalFixture();
    const tiers = reusedRuntime.equipmentTiers as DataRecord[];
    ((tiers[1]!.variants as DataRecord[])[0]!).runtimeEquipmentDefinitionId =
      'equipment.runtime.blade.level-1.test';
    expect(() => new SurvivalModeSystem(survivalConfig(), reusedRuntime)).toThrow(
      /不同 level 不能复用/,
    );

    const reversed = new SurvivalModeSystem(survivalConfig(), survivalFixture({
      slotActivationOrder: ['enemy-slot-2.test', 'enemy-slot-1.test'],
    }));
    reversed.start();
    expect(reversed.step(facts(0)).commands[0]).toMatchObject({
      participantId: 'enemy-2', slotId: 'enemy-slot-2.test', generation: 1,
    });
  });

  it('ends at an explicit hard limit without Profile writes or a manufactured production default', () => {
    const system = new SurvivalModeSystem(survivalConfig(), survivalFixture({
      hardLimitActiveTicks: 1,
    }));
    system.start();
    system.step(facts(0));
    const terminal = system.step(facts(1));
    expect(terminal.state.result).toMatchObject({
      reason: 'survival-time-cap', survivedTicks: 1, endedAtTick: 1,
    });
    expect(terminal.commands.filter(({ kind }) => kind === 'change-enemy-slot')).toEqual([]);
  });

  it('does not schedule a first-fall respawn when the same tick reaches the hard limit', () => {
    const system = new SurvivalModeSystem(survivalConfig(), survivalFixture({
      hardLimitActiveTicks: 1,
    }));
    system.start();
    system.step(facts(0));
    const terminal = system.step(facts(1, { playerFell: true }));
    expect(terminal.commands).toContainEqual({
      kind: 'count-player-fall',
      participantId: 'player-1',
      fallCount: 1,
      terminalFallCount: 2,
      terminal: false,
    });
    expect(terminal.commands.some(({ kind }) => kind === 'schedule-player-respawn')).toBe(false);
    expect(terminal.commands.at(-1)).toEqual({
      kind: 'end-survival',
      result: terminal.state.result,
    });
    expect(terminal.state.result).toMatchObject({
      reason: 'survival-time-cap',
      fallCount: 1,
      survivedTicks: 1,
      endedAtTick: 1,
    });
    expect(terminal.state).toMatchObject({
      playerStatus: 'ended',
      playerRespawnReadyTick: null,
    });
  });

  it('validates the complete checkpoint candidate before replacing authority slots', () => {
    const source = new SurvivalModeSystem(survivalConfig(), survivalFixture());
    source.start();
    const committed = source.step(facts(0)).state;
    const target = new SurvivalModeSystem(survivalConfig(), survivalFixture());
    const before = target.getSnapshot();

    expect(() => target.restoreFromCheckpointState({
      kind: 'survival',
      revision: -1,
      lastProcessedTick: committed.lastProcessedTick,
      playerParticipantId: committed.playerParticipantId,
      playerStatus: committed.playerStatus,
      playerRespawnReadyTick: committed.playerRespawnReadyTick,
      fallCount: committed.fallCount,
      terminalFallCount: committed.terminalFallCount,
      survivedTicks: committed.survivedTicks,
      pressureStage: committed.pressureStage,
      enemySlots: committed.enemySlots,
    }, 'active')).toThrow(/revision/);

    expect(target.lifecycle).toBe('created');
    expect(target.getSnapshot()).toEqual(before);
  });

  it('rejects hostile/reentrant facts before commit and supports pause/destroy boundaries', () => {
    expect(() => new SurvivalModeSystem(survivalConfig(), {
      ...survivalFixture(), schemaVersion: 2,
    })).toThrow(/schemaVersion/);
    let getterCalls = 0;
    const hostileFixture = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    expect(() => new SurvivalModeSystem(survivalConfig(), hostileFixture)).toThrow(
      /访问器|数据字段/,
    );
    expect(getterCalls).toBe(0);

    const system = new SurvivalModeSystem(survivalConfig(), survivalFixture());
    system.start();
    system.pause();
    expect(() => system.step(facts(0))).toThrow(/active/);
    system.resume();
    expect(() => system.step({ ...facts(0), future: true })).toThrow(/future/);
    expect(system.getSnapshot().lastProcessedTick).toBe(-1);
    const hostile = new Proxy(facts(0), {
      ownKeys(target) {
        try { system.step(facts(0)); } catch { /* hostile trap swallows nested rejection */ }
        return Reflect.ownKeys(target);
      },
    });
    expect(() => system.step(hostile)).toThrow(/重入/);
    expect(system.lifecycle).toBe('failed');
    system.destroy();
    system.destroy();
    expect(system.lifecycle).toBe('destroyed');
  });

  it('keeps Profile, Physics, Renderer, DOM, wall clock and randomness outside Survival', () => {
    const source = readFileSync(
      new URL('../src/survival-mode-system.ts', import.meta.url),
      'utf8',
    );
    expect(source).not.toMatch(/Profile|arena-physics|three|Renderer|document\.|window\.|Date\.|performance\.|Math\.random/);
    expect(source).toContain('kind: \'change-enemy-slot\'');
    expect(source).toContain('kind: \'end-survival\'');
  });
});
