import { describe, expect, it } from 'vitest';
import {
  createMatchContentPublicView,
  createMatchContentSelection,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  ARENA_V1_CHARACTER_ID,
  ARENA_V1_DEFAULT_CHARACTER_ID,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_MATCH_DEFAULTS,
  ARENA_MATCH_PHASE,
  ARENA_PARTICIPANT_STATUS,
  createArenaMatchConfig,
} from '../src/index.js';

function selectionInput(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    contentDefinitionId: 'arena-v1.test-content',
    contentVersion: 2,
    characterDefinitionIds: ['wind-up-cube', 'parkour-apprentice'],
    equipmentDefinitionIds: ['hammer'],
    mapDefinitionIds: ['map-b', 'map-a'],
    selectedMapDefinitionId: 'map-a',
    participantCharacters: [
      { participantId: 'player-2', definitionId: 'wind-up-cube' },
      { participantId: 'player-1', definitionId: 'parkour-apprentice' },
    ],
  };
}

describe('arena-match authority configuration', () => {
  it('keeps phases, participant states and gameplay defaults centralized and immutable', () => {
    const config = createArenaMatchConfig();
    const tuning = ARENA_GAMEPLAY_V2_TUNING.attacks['base-push'];

    expect(ARENA_MATCH_PHASE).toEqual({
      PREPARING: 'preparing',
      RUNNING: 'running',
      SUDDEN_DEATH: 'sudden-death',
      ENDED: 'ended',
    });
    expect(ARENA_PARTICIPANT_STATUS).toEqual({
      ACTIVE: 'active',
      RESPAWNING: 'respawning',
      ELIMINATED: 'eliminated',
    });
    expect(config.basePush).toEqual({
      range: tuning.targeting.range,
      minimumFacingDot: tuning.targeting.minimumFacingDot,
      maximumVerticalDifference: tuning.targeting.maximumVerticalDifference,
      windupTicks: tuning.timing.windupTicks,
      activeTicks: tuning.timing.activeTicks,
      recoveryTicks: tuning.timing.recoveryTicks,
      hitstunTicks: tuning.hitstunTicks,
      horizontalImpulse: tuning.knockback.horizontalImpulse,
      verticalImpulse: tuning.knockback.verticalImpulse,
    });
    expect(config.mapDefinitionId).toBe(ARENA_MATCH_DEFAULTS.mapDefinitionId);
    expect(config.participantCharacters.every(
      (entry) => entry.definitionId === ARENA_V1_DEFAULT_CHARACTER_ID,
    )).toBe(true);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.arena.surfaces)).toBe(true);
  });

  it('rejects accessors and schema drift before evaluating caller-owned configuration', () => {
    let getterCalls = 0;
    const value = Object.defineProperty({}, 'participantIds', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return ['player-1', 'player-2'];
      },
    });

    expect(() => createArenaMatchConfig(value)).toThrow(/数据字段|访问器/);
    expect(getterCalls).toBe(0);
    expect(() => createArenaMatchConfig({ surprise: 1 })).toThrow(/不支持字段 surprise/);
    expect(() => createArenaMatchConfig({
      suddenDeathStartTick: 10,
      hardLimitTicks: 10,
    })).toThrow(/必须早于/);
  });

  it('normalizes match content identity once and rejects hash or assignment drift', () => {
    const selection = createMatchContentSelection(selectionInput());
    expect(selection.characterDefinitionIds).toEqual([
      'parkour-apprentice',
      'wind-up-cube',
    ]);
    expect(selection.participantCharacters.map((entry) => entry.participantId)).toEqual([
      'player-1',
      'player-2',
    ]);
    expect(createMatchContentPublicView(selection)).toEqual(selection);
    expect(() => createMatchContentSelection({
      ...selection,
      contentHash: '00000000',
    })).toThrow(/contentHash/);
    expect(() => createArenaMatchConfig({
      mapDefinitionId: 'map-b',
      contentSelection: selection,
      participantCharacters: selection.participantCharacters,
    })).toThrow(/mapDefinitionId/);
  });

  it('keeps stable Arena V1 character IDs in the Definition catalog', () => {
    expect(ARENA_V1_CHARACTER_ID).toEqual({
      PARKOUR_APPRENTICE: 'parkour-apprentice',
      WIND_UP_CUBE: 'wind-up-cube',
    });
    expect(ARENA_V1_DEFAULT_CHARACTER_ID).toBe('parkour-apprentice');
    expect(Object.isFrozen(ARENA_V1_CHARACTER_ID)).toBe(true);
  });
});
