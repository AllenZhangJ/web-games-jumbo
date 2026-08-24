import { describe, expect, it } from 'vitest';
import {
  SURVIVAL_ENEMY_PRIMARY_SOURCE_V1,
  SURVIVAL_ENEMY_WEAPON_AFFORDANCE_V1_SCHEMA_VERSION,
  createSurvivalEnemyPrimaryActionAffordanceV1,
} from '../src/index.js';

function equipment(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: SURVIVAL_ENEMY_WEAPON_AFFORDANCE_V1_SCHEMA_VERSION,
    sourceKind: SURVIVAL_ENEMY_PRIMARY_SOURCE_V1.EQUIPMENT,
    primaryActionDefinitionId: 'action.runtime.level-3',
    collectionEquipmentDefinitionId: 'equipment.collection',
    runtimeEquipmentDefinitionId: 'equipment.runtime.level-3',
    survivalLevel: 3,
    primaryRange: 2.4,
    minimumCommitmentTicks: 0,
    cooldownRemainingTicks: 0,
    actionBlocked: false,
    ...overrides,
  };
}

describe('Survival enemy weapon affordance v1', () => {
  it('strips equipment identity and exposes only range/input pacing/readiness', () => {
    expect(createSurvivalEnemyPrimaryActionAffordanceV1(equipment())).toEqual({
      primaryRange: 2.4,
      minimumCommitmentTicks: 0,
      actionReady: true,
    });
    expect(Object.keys(createSurvivalEnemyPrimaryActionAffordanceV1(equipment()))).toEqual([
      'primaryRange', 'minimumCommitmentTicks', 'actionReady',
    ]);
  });

  it('derives readiness from cooldown and authority blocking without changing input shape', () => {
    expect(createSurvivalEnemyPrimaryActionAffordanceV1(equipment({
      cooldownRemainingTicks: 1,
    })).actionReady).toBe(false);
    expect(createSurvivalEnemyPrimaryActionAffordanceV1(equipment({
      actionBlocked: true,
    })).actionReady).toBe(false);
  });

  it('accepts base action only without equipment or survival identity', () => {
    expect(createSurvivalEnemyPrimaryActionAffordanceV1({
      ...equipment(),
      sourceKind: SURVIVAL_ENEMY_PRIMARY_SOURCE_V1.BASE_ACTION,
      collectionEquipmentDefinitionId: null,
      runtimeEquipmentDefinitionId: null,
      survivalLevel: null,
    })).toEqual({ primaryRange: 2.4, minimumCommitmentTicks: 0, actionReady: true });
  });

  it('fails closed on incomplete identity, invalid level, aliases, and future fields', () => {
    expect(() => createSurvivalEnemyPrimaryActionAffordanceV1(equipment({
      runtimeEquipmentDefinitionId: null,
    }))).toThrow(/collection\/runtime\/level/);
    expect(() => createSurvivalEnemyPrimaryActionAffordanceV1(equipment({
      survivalLevel: 11,
    }))).toThrow(/不能超过10/);
    expect(() => createSurvivalEnemyPrimaryActionAffordanceV1(equipment({
      runtimeEquipmentDefinitionId: 'equipment.collection',
    }))).toThrow(/分离/);
    expect(() => createSurvivalEnemyPrimaryActionAffordanceV1({
      ...equipment(), futureAimAssist: true,
    })).toThrow(/不支持字段/);
  });
});
