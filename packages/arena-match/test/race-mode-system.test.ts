import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  RACE_MODE_PREPARING_TICKS_V1,
  RACE_MODE_RESPAWN_DELAY_TICKS_V1,
  RaceModeSystem,
} from '../src/race-mode-system.js';

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

function raceConfig(count = 2): DataRecord {
  return {
    schemaVersion: 6,
    modeDefinitionId: 'arena.mode.race.test.v1',
    modeKind: 'race',
    modePolicyContentHash: 'ace0ace0',
    participantAssignments: Array.from({ length: count }, (_, index) => competitor(
      `racer-${index + 1}`,
      index === 0 ? 'human' : 'bot',
    )),
  };
}

function raceFixture(count = 2, hardLimitActiveTicks = 500): DataRecord {
  return {
    schemaVersion: 1,
    fixtureDefinitionId: 'arena.mode.race.runtime.test.v1',
    preparingTicks: RACE_MODE_PREPARING_TICKS_V1,
    respawnDelayTicks: RACE_MODE_RESPAWN_DELAY_TICKS_V1,
    respawnProtectionTicks: 12,
    hardLimitActiveTicks,
    finishGateId: 'race-finish-gate.test',
    safeAnchorIds: Array.from({ length: 4 }, (_, index) => `safe-anchor-${index + 1}.test`),
    fallbackSafeAnchorId: 'safe-anchor-1.test',
    initialSafeAnchors: Array.from({ length: count }, (_, index) => ({
      participantId: `racer-${index + 1}`,
      anchorId: `safe-anchor-${index + 1}.test`,
    })),
  };
}

function facts(tick: number, overrides: Partial<DataRecord> = {}): DataRecord {
  const preparing = tick < RACE_MODE_PREPARING_TICKS_V1;
  return {
    tick,
    activeTick: preparing ? null : tick - RACE_MODE_PREPARING_TICKS_V1,
    preparationRemainingTicks: tick <= RACE_MODE_PREPARING_TICKS_V1
      ? RACE_MODE_PREPARING_TICKS_V1 - tick
      : null,
    validSafeAnchorIds: ['safe-anchor-1.test', 'safe-anchor-2.test', 'safe-anchor-3.test',
      'safe-anchor-4.test'],
    safeAnchorClaims: [],
    finishClaims: [],
    participantFalls: [],
    ...overrides,
  };
}

function startAtFirstActiveTick(system: RaceModeSystem): void {
  system.start();
  for (let tick = 0; tick < RACE_MODE_PREPARING_TICKS_V1; tick += 1) {
    system.step(facts(tick));
  }
}

describe('RaceModeSystem production-unreachable candidate', () => {
  it('enforces the authoritative 60-tick countdown and supports 2/3/4 racers', () => {
    for (const count of [2, 3, 4]) {
      const system = new RaceModeSystem(raceConfig(count), raceFixture(count));
      system.start();
      expect(system.step(facts(0)).state).toMatchObject({ lastProcessedTick: 0, result: null });
      for (let tick = 1; tick < RACE_MODE_PREPARING_TICKS_V1; tick += 1) {
        system.step(facts(tick));
      }
      expect(system.step(facts(60)).state).toMatchObject({
        lastProcessedTick: 60,
        participants: expect.arrayContaining([
          expect.objectContaining({ participantId: 'racer-1', status: 'racing' }),
        ]),
      });
    }
    const zeroBoundary = new RaceModeSystem(raceConfig(), raceFixture());
    startAtFirstActiveTick(zeroBoundary);
    expect(() => zeroBoundary.step(facts(60, {
      preparationRemainingTicks: null,
    }))).toThrow(/timeline identity/);
    expect(zeroBoundary.step(facts(60)).tick).toBe(60);

    const invalid = raceConfig(4);
    (invalid.participantAssignments as DataRecord[]).push(competitor('racer-5', 'bot'));
    expect(() => new RaceModeSystem(invalid, raceFixture(5))).toThrow(/2–4/);
  });

  it('uses the latest valid safe anchor and respawns exactly 180 ticks later', () => {
    const system = new RaceModeSystem(raceConfig(), raceFixture());
    startAtFirstActiveTick(system);
    const fall = system.step(facts(60, {
      safeAnchorClaims: [{
        participantId: 'racer-1', anchorId: 'safe-anchor-2.test', progressOrdinal: 7,
      }],
      participantFalls: ['racer-1'],
    }));
    expect(fall.commands).toEqual([
      {
        kind: 'commit-safe-anchor',
        participantId: 'racer-1',
        anchorId: 'safe-anchor-2.test',
        progressOrdinal: 7,
      },
      {
        kind: 'schedule-respawn',
        participantId: 'racer-1',
        readyTick: 240,
        anchorId: 'safe-anchor-2.test',
        protectionTicks: 12,
      },
    ]);
    for (let tick = 61; tick < 240; tick += 1) system.step(facts(tick));
    const respawn = system.step(facts(240, {
      validSafeAnchorIds: ['safe-anchor-1.test'],
    }));
    expect(respawn.commands).toContainEqual({
      kind: 'respawn-participant',
      participantId: 'racer-1',
      anchorId: 'safe-anchor-1.test',
      protectionTicks: 12,
    });
    expect(respawn.state.participants.find(({ participantId }) => (
      participantId === 'racer-1'
    ))?.safeAnchorId).toBe('safe-anchor-1.test');

    const noFallback = new RaceModeSystem(raceConfig(), raceFixture());
    startAtFirstActiveTick(noFallback);
    expect(() => noFallback.step(facts(60, {
      validSafeAnchorIds: [],
      participantFalls: ['racer-1'],
    }))).toThrow(/缺少合法安全锚/);
    expect(noFallback.getSnapshot().lastProcessedTick).toBe(59);
  });

  it('ranks same-tick finishers as ties and rejects duplicate finish identity', () => {
    const system = new RaceModeSystem(raceConfig(3), raceFixture(3));
    startAtFirstActiveTick(system);
    system.step(facts(60));
    const terminal = system.step(facts(61, {
      finishClaims: [{
        participantId: 'racer-2', finishGateId: 'race-finish-gate.test', progressOrdinal: 10,
      }, {
        participantId: 'racer-1', finishGateId: 'race-finish-gate.test', progressOrdinal: 10,
      }],
    }));
    expect(terminal.state.result).toMatchObject({
      winnerParticipantIds: ['racer-1', 'racer-2'],
      reason: 'finish-claimed',
      endedAtTick: 61,
    });
    expect(terminal.state.result?.rankings).toEqual([
      { participantId: 'racer-1', rank: 1, finishTick: 61, progressOrdinal: 10 },
      { participantId: 'racer-2', rank: 1, finishTick: 61, progressOrdinal: 10 },
      { participantId: 'racer-3', rank: 3, finishTick: null, progressOrdinal: 0 },
    ]);

    const duplicate = new RaceModeSystem(raceConfig(), raceFixture());
    startAtFirstActiveTick(duplicate);
    expect(() => duplicate.step(facts(60, {
      finishClaims: [{
        participantId: 'racer-1', finishGateId: 'race-finish-gate.test', progressOrdinal: 1,
      }, {
        participantId: 'racer-1', finishGateId: 'race-finish-gate.test', progressOrdinal: 1,
      }],
    }))).toThrow(/不能重复/);
    expect(duplicate.getSnapshot().lastProcessedTick).toBe(59);
  });

  it('ends deterministically at the explicit hard limit without manufacturing a winner', () => {
    const system = new RaceModeSystem(raceConfig(), raceFixture(2, 1));
    startAtFirstActiveTick(system);
    system.step(facts(60, {
      safeAnchorClaims: [{
        participantId: 'racer-2', anchorId: 'safe-anchor-2.test', progressOrdinal: 4,
      }],
    }));
    const terminal = system.step(facts(61));
    expect(terminal.state.result).toMatchObject({
      winnerParticipantIds: [], reason: 'no-finisher', endedAtTick: 61,
    });
    expect(terminal.state.result?.rankings).toEqual([
      { participantId: 'racer-1', rank: 2, finishTick: null, progressOrdinal: 0 },
      { participantId: 'racer-2', rank: 1, finishTick: null, progressOrdinal: 4 },
    ]);
    expect(() => system.step(facts(62))).toThrow(/active/);
  });

  it('does not schedule respawn when a fall shares the terminal finish or hard-limit tick', () => {
    const finish = new RaceModeSystem(raceConfig(), raceFixture());
    startAtFirstActiveTick(finish);
    const finishTerminal = finish.step(facts(60, {
      finishClaims: [{
        participantId: 'racer-1',
        finishGateId: 'race-finish-gate.test',
        progressOrdinal: 10,
      }],
      participantFalls: ['racer-2'],
    }));
    expect(finishTerminal.commands.some(({ kind }) => kind === 'schedule-respawn')).toBe(false);
    expect(finishTerminal.commands.at(-1)).toEqual({
      kind: 'end-race',
      result: finishTerminal.state.result,
    });

    const hardLimit = new RaceModeSystem(raceConfig(), raceFixture(2, 1));
    startAtFirstActiveTick(hardLimit);
    hardLimit.step(facts(60));
    const hardLimitTerminal = hardLimit.step(facts(61, {
      participantFalls: ['racer-2'],
    }));
    expect(hardLimitTerminal.commands.some(
      ({ kind }) => kind === 'schedule-respawn',
    )).toBe(false);
    expect(hardLimitTerminal.state.result).toMatchObject({
      reason: 'no-finisher',
      endedAtTick: 61,
    });
  });

  it('rejects malformed/reentrant facts before commit and preserves lifecycle cleanup', () => {
    expect(() => new RaceModeSystem(raceConfig(), {
      ...raceFixture(), schemaVersion: 2,
    })).toThrow(/schemaVersion/);
    let getterCalls = 0;
    const hostileFixture = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    expect(() => new RaceModeSystem(raceConfig(), hostileFixture)).toThrow(/访问器|数据字段/);
    expect(getterCalls).toBe(0);

    const system = new RaceModeSystem(raceConfig(), raceFixture());
    system.start();
    expect(() => system.step(facts(0, { activeTick: 0 }))).toThrow(/timeline identity/);
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

  it('keeps Physics, Renderer, DOM, wall clock and randomness outside the mode system', () => {
    const source = readFileSync(new URL('../src/race-mode-system.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/arena-physics|three|Renderer|document\.|window\.|Date\.|performance\.|Math\.random/);
    expect(source).toContain('kind: \'schedule-respawn\'');
    expect(source).toContain('kind: \'end-race\'');
  });
});
