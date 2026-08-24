import { describe, expect, it } from 'vitest';
import {
  ARENA_MATCH_CONFIG_V6_MAXIMUM_PARTICIPANTS,
  ARENA_MATCH_CONFIG_V6_SCHEMA_VERSION,
  createArenaMatchConfigV6,
} from '../src/match-config-v6.js';

type DataRecord = Record<string, unknown>;

function competitor(participantId: string, controllerKind: 'human' | 'bot' = 'human'): DataRecord {
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

function player(participantId = 'player-1'): DataRecord {
  return {
    participantId,
    modeRole: 'player',
    teamId: 'team.player.test',
    controllerKind: 'human',
    characterDefinitionId: 'character.player.test',
    slotId: null,
    slotGeneration: 0,
  };
}

function enemy(index: number): DataRecord {
  return {
    participantId: `enemy-${String(index).padStart(2, '0')}`,
    modeRole: 'enemy',
    teamId: 'team.enemy.test',
    controllerKind: 'bot',
    characterDefinitionId: 'character.enemy.test',
    slotId: `enemy-slot-${String(index).padStart(2, '0')}.test`,
    slotGeneration: index - 1,
  };
}

function config(
  modeKind: 'duel' | 'race' | 'survival',
  participantAssignments: DataRecord[],
): DataRecord {
  return {
    schemaVersion: ARENA_MATCH_CONFIG_V6_SCHEMA_VERSION,
    modeDefinitionId: `arena.mode.${modeKind}.test.v1`,
    modeKind,
    modePolicyContentHash: modeKind === 'duel'
      ? 'd001d001'
      : modeKind === 'race' ? 'ace0ace0' : '51515151',
    participantAssignments,
  };
}

describe('ArenaMatchConfigV6 production-unreachable candidate', () => {
  it('normalizes bounded 2/3/4/17 participant rosters without coupling identity to order', () => {
    const duel = createArenaMatchConfigV6(config('duel', [
      competitor('player-2', 'bot'),
      competitor('player-1'),
    ]));
    expect(duel.participantAssignments.map(({ participantId }) => participantId)).toEqual([
      'player-1',
      'player-2',
    ]);

    for (const count of [3, 4]) {
      const race = createArenaMatchConfigV6(config(
        'race',
        Array.from({ length: count }, (_, index) => competitor(
          `racer-${count - index}`,
          index === 0 ? 'human' : 'bot',
        )),
      ));
      expect(race.participantAssignments).toHaveLength(count);
      expect(Object.isFrozen(race.participantAssignments)).toBe(true);
    }

    const maximum = createArenaMatchConfigV6(config('survival', [
      player(),
      ...Array.from({ length: 16 }, (_, index) => enemy(index + 1)).reverse(),
    ]));
    expect(maximum.participantAssignments).toHaveLength(
      ARENA_MATCH_CONFIG_V6_MAXIMUM_PARTICIPANTS,
    );
    expect(maximum.participantAssignments[0]?.participantId).toBe('enemy-01');
    expect(maximum.participantAssignments.at(-1)?.participantId).toBe('player-1');
  });

  it('rejects 1/18 participant boundaries, duplicate participant/slot identity and role drift', () => {
    expect(() => createArenaMatchConfigV6(config('race', [competitor('only')]))).toThrow(/2–17/);
    expect(() => createArenaMatchConfigV6(config('survival', [
      player(),
      ...Array.from({ length: 17 }, (_, index) => enemy(index + 1)),
    ]))).toThrow(/2–17/);
    expect(() => createArenaMatchConfigV6(config('duel', [
      competitor('same'),
      competitor('same'),
    ]))).toThrow(/participantId 必须唯一/);
    expect(() => createArenaMatchConfigV6(config('survival', [
      player(),
      enemy(1),
      { ...enemy(2), slotId: 'enemy-slot-01.test' },
    ]))).toThrow(/slotId 必须唯一/);
    expect(() => createArenaMatchConfigV6(config('survival', [
      player(),
      { ...enemy(1), controllerKind: 'human' },
    ]))).toThrow(/enemy 必须使用 bot/);
    expect(() => createArenaMatchConfigV6(config('duel', [
      { ...competitor('player-1'), slotGeneration: 1 },
      competitor('player-2'),
    ]))).toThrow(/slotId=null/);
  });

  it('rejects future schema, extra/missing keys and malicious accessors without executing getters', () => {
    expect(() => createArenaMatchConfigV6({
      ...config('duel', [competitor('player-1'), competitor('player-2')]),
      schemaVersion: 7,
    })).toThrow(/schemaVersion/);
    expect(() => createArenaMatchConfigV6({
      ...config('duel', [competitor('player-1'), competitor('player-2')]),
      future: true,
    })).toThrow(/future/);
    const missing = config('duel', [competitor('player-1'), competitor('player-2')]);
    delete missing.modeDefinitionId;
    expect(() => createArenaMatchConfigV6(missing)).toThrow(/modeDefinitionId 为必填/);

    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return ARENA_MATCH_CONFIG_V6_SCHEMA_VERSION;
      },
    });
    expect(() => createArenaMatchConfigV6(hostile)).toThrow(/访问器|数据字段/);
    expect(getterCalls).toBe(0);
  });

  it('separates role/team/controller/character/slot identity and freezes a caller-owned copy', () => {
    const source = config('survival', [player(), enemy(1)]);
    const result = createArenaMatchConfigV6(source);
    const enemyAssignment = result.participantAssignments.find(
      ({ modeRole }) => modeRole === 'enemy',
    );
    expect(enemyAssignment).toEqual({
      participantId: 'enemy-01',
      modeRole: 'enemy',
      teamId: 'team.enemy.test',
      controllerKind: 'bot',
      characterDefinitionId: 'character.enemy.test',
      slotId: 'enemy-slot-01.test',
      slotGeneration: 0,
    });
    (source.participantAssignments as DataRecord[])[1]!.participantId = 'mutated';
    expect(result.participantAssignments.map(({ participantId }) => participantId)).toEqual([
      'enemy-01',
      'player-1',
    ]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(enemyAssignment)).toBe(true);
  });
});
