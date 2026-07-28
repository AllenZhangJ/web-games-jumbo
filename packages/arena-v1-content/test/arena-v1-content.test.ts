import { describe, expect, it } from 'vitest';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  ARENA_V1_CHARACTER_ID,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_GAMEPLAY_V2_MAP_DEFINITION,
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITIONS,
  ARENA_V1_BALANCE_DEFINITION,
  ARENA_V1_CHARACTER_DEFINITIONS,
  ARENA_V1_MAP_DEFINITIONS,
  STAGE4_ACTION_DEFINITIONS,
  STAGE4_ACTION_ID,
  STAGE4_EQUIPMENT_DEFINITIONS,
  STAGE6_MOVEMENT_ACTION_DEFINITIONS,
  ARENA_V2_WEAPON_CANDIDATE_CONTENT_DEFINITIONS,
  createArenaV2WeaponCandidateContentRegistries,
  createArenaV2SurvivalSupplyRegistry,
  createArenaV1CharacterRegistry,
  createArenaV1MapRegistry,
  createStage4ContentRegistries,
} from '../src/index.js';

describe('Arena V1 authority content', () => {
  it('publishes one immutable, internally resolvable content catalog', () => {
    expect(createArenaV1CharacterRegistry().list().map(({ id }) => id)).toEqual(
      Object.values(ARENA_V1_CHARACTER_ID).sort(),
    );
    expect(createArenaV1MapRegistry().require(ARENA_GAMEPLAY_V2_MAP_DEFINITION.id))
      .toBe(ARENA_GAMEPLAY_V2_MAP_DEFINITION);
    expect(ARENA_V1_CHARACTER_DEFINITIONS).toHaveLength(2);
    expect(ARENA_V1_MAP_DEFINITIONS).toHaveLength(2);
    expect(STAGE4_EQUIPMENT_DEFINITIONS.map(({ id }) => id).sort())
      .toEqual(Object.values(STAGE4_EQUIPMENT_ID).sort());
    expect(Object.isFrozen(STAGE4_ACTION_DEFINITIONS)).toBe(true);
    expect(Object.isFrozen(STAGE6_MOVEMENT_ACTION_DEFINITIONS)).toBe(true);
    expect(ARENA_V2_SURVIVAL_SUPPLY_DEFINITION).toMatchObject({
      id: 'arena-v2.survival-supply.v1',
      firstSpawnTick: 1_200,
      spawnIntervalTicks: 1_200,
      spawnCount: 3,
      pickupRadius: 0.8,
      lifetimeTicks: 600,
      replacementPolicy: 'atomic-recycle-held',
      tickOrder: ['spawn', 'expire', 'pickup', 'action'],
    });
    expect(ARENA_V2_SURVIVAL_SUPPLY_DEFINITIONS).toEqual([
      ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
    ]);
    const supplyRegistry = createArenaV2SurvivalSupplyRegistry();
    expect(supplyRegistry.list()).toEqual(ARENA_V2_SURVIVAL_SUPPLY_DEFINITIONS);
    expect(supplyRegistry.require('arena-v2.survival-supply.v1'))
      .toBe(supplyRegistry.list()[0]);
  });

  it('compiles the public attack tuning into the authoritative action definitions', () => {
    const basePush = STAGE4_ACTION_DEFINITIONS.find(({ id }) => (
      id === STAGE4_ACTION_ID.BASE_PUSH
    ));
    expect(basePush?.timing).toEqual(
      ARENA_GAMEPLAY_V2_TUNING.attacks[STAGE4_ACTION_ID.BASE_PUSH].timing,
    );
    const registries = createStage4ContentRegistries();
    expect(registries.actionRegistry.require(STAGE4_ACTION_ID.BASE_PUSH)).toEqual(basePush);
    expect(registries.equipmentRegistry.list()).toHaveLength(3);
    expect(ARENA_V1_BALANCE_DEFINITION.matchConfig.livesPerParticipant).toBe(11);
  });

  it('rejects registry option accessors and unknown fields before creating registries', () => {
    let getterCalls = 0;
    const options = {
      get basePush() {
        getterCalls += 1;
        return null;
      },
    };
    expect(() => createStage4ContentRegistries(options)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
    expect(() => createStage4ContentRegistries({ futureMode: true })).toThrow(/futureMode/);
  });

  it('keeps five weapon candidates in an explicit opt-in content registry', () => {
    expect(ARENA_V2_WEAPON_CANDIDATE_CONTENT_DEFINITIONS).toHaveLength(5);
    expect(Object.isFrozen(ARENA_V2_WEAPON_CANDIDATE_CONTENT_DEFINITIONS)).toBe(true);
    expect(ARENA_V2_WEAPON_CANDIDATE_CONTENT_DEFINITIONS.every(({ groundAction, aerialAction }) => (
      groundAction.tags.includes('ground')
      && aerialAction.tags.includes('aerial')
      && aerialAction.effects.some(({ kind }) => kind === 'begin-down-smash')
    ))).toBe(true);
    expect(ARENA_V2_WEAPON_CANDIDATE_CONTENT_DEFINITIONS.find(({ languageId }) => (
      languageId === 'read-punish'
    ))?.groundAction.commitment).toMatchObject({
      commitTicks: 12,
      expireTicks: 18,
      expireOutcome: 'cancel',
    });

    const defaultRegistries = createStage4ContentRegistries();
    const candidateRegistries = createArenaV2WeaponCandidateContentRegistries();
    expect(defaultRegistries.equipmentRegistry.list()).toHaveLength(3);
    expect(candidateRegistries.equipmentRegistry.list()).toHaveLength(8);
    expect(candidateRegistries.equipmentRegistry.require('research-line-pressure'))
      .toEqual(ARENA_V2_WEAPON_CANDIDATE_CONTENT_DEFINITIONS[0]!.equipment);
    expect(candidateRegistries.actionRegistry.require('research-line-pressure-aerial'))
      .toEqual(ARENA_V2_WEAPON_CANDIDATE_CONTENT_DEFINITIONS[0]!.aerialAction);
  });
});
