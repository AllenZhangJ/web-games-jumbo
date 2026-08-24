import { describe, expect, it } from 'vitest';
import {
  MODE_MATCH_REWARD_DEFINITION_V2_SCHEMA_VERSION,
  createModeMatchRewardDefinitionV2,
  createModeProgressionRegistryV2,
} from '../src/index.js';

function duelReward(id = 'reward.duel.test.v2') {
  return {
    schemaVersion: MODE_MATCH_REWARD_DEFINITION_V2_SCHEMA_VERSION,
    id,
    contentVersion: 1,
    modeDefinitionId: 'mode.duel.test.v1',
    completionExperience: 10,
    policy: {
      kind: 'duel',
      winnerBonusExperience: 5,
      drawBonusExperience: 2,
    },
  } as const;
}

describe('P2.5 mode progression V2 candidates', () => {
  it('creates exact immutable mode reward policies', () => {
    const reward = createModeMatchRewardDefinitionV2({
      schemaVersion: MODE_MATCH_REWARD_DEFINITION_V2_SCHEMA_VERSION,
      id: 'reward.race.test.v2',
      contentVersion: 1,
      modeDefinitionId: 'mode.race.test.v1',
      completionExperience: 10,
      policy: {
        kind: 'race',
        finishBonusExperience: 3,
        rankBonuses: [
          { rank: 1, experience: 5 },
          { rank: 2, experience: 2 },
        ],
      },
    });
    expect(reward.policy.kind).toBe('race');
    expect(Object.isFrozen(reward)).toBe(true);
    expect(Object.isFrozen(reward.policy)).toBe(true);
  });

  it('rejects future fields, non-canonical ranks and stages', () => {
    expect(() => createModeMatchRewardDefinitionV2({
      ...duelReward(),
      future: true,
    })).toThrow(/future/);
    expect(() => createModeMatchRewardDefinitionV2({
      schemaVersion: MODE_MATCH_REWARD_DEFINITION_V2_SCHEMA_VERSION,
      id: 'reward.race.test.v2',
      contentVersion: 1,
      modeDefinitionId: 'mode.race.test.v1',
      completionExperience: 10,
      policy: {
        kind: 'race',
        finishBonusExperience: 3,
        rankBonuses: [
          { rank: 2, experience: 2 },
          { rank: 1, experience: 5 },
        ],
      },
    })).toThrow(/升序/);
    expect(() => createModeMatchRewardDefinitionV2({
      schemaVersion: MODE_MATCH_REWARD_DEFINITION_V2_SCHEMA_VERSION,
      id: 'reward.survival.test.v2',
      contentVersion: 1,
      modeDefinitionId: 'mode.survival.test.v1',
      completionExperience: 10,
      policy: {
        kind: 'survival',
        stageBonuses: [
          { minimumPressureStage: 2, experience: 4 },
          { minimumPressureStage: 2, experience: 5 },
        ],
      },
    })).toThrow(/升序/);
  });

  it('allows only one reward definition per mode', () => {
    expect(() => createModeProgressionRegistryV2({
      rewards: [duelReward(), duelReward('reward.duel.other.test.v2')],
      unlocks: [],
    })).toThrow(/多个奖励Definition/);
  });
});
