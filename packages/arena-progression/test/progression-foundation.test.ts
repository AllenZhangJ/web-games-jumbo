import { describe, expect, it } from 'vitest';
import {
  MATCH_REWARD_DEFINITION_SCHEMA_VERSION,
  MatchRewardDefinition,
  ProgressionRegistry,
  REWARD_GRANT_SCHEMA_VERSION,
  UNLOCK_DEFINITION_SCHEMA_VERSION,
  UNLOCK_KIND,
  UnlockDefinition,
  createMatchRewardDefinition,
  createProgressionRegistry,
  createRewardGrant,
  createUnlockDefinition,
} from '../src/index.js';

function reward(id = 'reward') {
  return {
    schemaVersion: MATCH_REWARD_DEFINITION_SCHEMA_VERSION,
    id,
    contentVersion: 1,
    participantId: 'player-1',
    completionExperience: 10,
    winnerBonusExperience: 5,
    drawBonusExperience: 2,
  } as const;
}

function unlock(
  id: string,
  contentId: string,
  prerequisiteIds: readonly string[] = [],
) {
  return {
    schemaVersion: UNLOCK_DEFINITION_SCHEMA_VERSION,
    id,
    contentVersion: 1,
    kind: UNLOCK_KIND.CHARACTER,
    contentId,
    requiredExperience: 10,
    prerequisiteIds,
  } as const;
}

describe('arena-progression foundation', () => {
  it('sorts immutable definitions and rejects accessor options', () => {
    const registry = new ProgressionRegistry({
      rewards: [reward('z-reward'), reward('a-reward')],
      unlocks: [unlock('z-unlock', 'z-hero'), unlock('a-unlock', 'a-hero')],
    });
    expect(registry.getRewards().map(({ id }) => id)).toEqual(['a-reward', 'z-reward']);
    expect(registry.getUnlocks().map(({ id }) => id)).toEqual(['a-unlock', 'z-unlock']);
    expect(Object.isFrozen(registry.getRewards())).toBe(true);
    expect(Object.isFrozen(registry.getUnlocks()[0])).toBe(true);
    let getterCalls = 0;
    const options = Object.defineProperty({}, 'rewards', {
      enumerable: true,
      get() { getterCalls += 1; return []; },
    });
    expect(() => new ProgressionRegistry(options as never)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
  });

  it('keeps exact native instances but rejects subclass and prototype-shaped inputs', () => {
    const rewardDefinition = createMatchRewardDefinition(reward());
    const unlockDefinition = createUnlockDefinition(unlock('unlock', 'hero'));
    const registry = createProgressionRegistry({
      rewards: [rewardDefinition],
      unlocks: [unlockDefinition],
    });
    expect(createMatchRewardDefinition(rewardDefinition)).toBe(rewardDefinition);
    expect(createUnlockDefinition(unlockDefinition)).toBe(unlockDefinition);
    expect(createProgressionRegistry(registry)).toBe(registry);

    class ForgedReward extends MatchRewardDefinition {}
    class ForgedUnlock extends UnlockDefinition {}
    expect(() => createMatchRewardDefinition(new ForgedReward(reward()))).toThrow(/普通对象/);
    expect(() => createUnlockDefinition(new ForgedUnlock(unlock('forged', 'forged-hero')))).toThrow(/普通对象/);
    expect(() => createProgressionRegistry(Object.create(registry))).toThrow(/普通对象/);
  });

  it('rejects sparse, accessor, duplicate, missing and cyclic registry content', () => {
    const sparse = new Array(1);
    expect(() => new ProgressionRegistry({ rewards: sparse, unlocks: [] })).toThrow(/空槽/);
    let itemGetterCalls = 0;
    const accessorItems: unknown[] = [];
    Object.defineProperty(accessorItems, '0', {
      enumerable: true,
      get() { itemGetterCalls += 1; return reward(); },
    });
    Object.defineProperty(accessorItems, 'length', { value: 1 });
    expect(() => new ProgressionRegistry({ rewards: accessorItems, unlocks: [] })).toThrow(/访问器/);
    expect(itemGetterCalls).toBe(0);
    expect(() => new ProgressionRegistry({
      rewards: [reward(), reward()],
      unlocks: [],
    })).toThrow(/重复奖励/);
    expect(() => new ProgressionRegistry({
      rewards: [],
      unlocks: [unlock('one', 'hero'), unlock('two', 'hero')],
    })).toThrow(/重复解锁目标/);
    expect(() => new ProgressionRegistry({
      rewards: [],
      unlocks: [unlock('one', 'hero', ['missing'])],
    })).toThrow(/缺少解锁依赖/);
    expect(() => new ProgressionRegistry({
      rewards: [],
      unlocks: [unlock('one', 'hero-1', ['two']), unlock('two', 'hero-2', ['one'])],
    })).toThrow(/存在环/);
  });

  it('exposes one immutable dependency order for linear reward resolution', () => {
    const registry = new ProgressionRegistry({
      rewards: [],
      unlocks: [
        unlock('c', 'hero-c', ['b']),
        unlock('a', 'hero-a'),
        unlock('b', 'hero-b', ['a']),
      ],
    });
    expect(registry.getUnlocks().map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    expect(registry.getUnlocksInDependencyOrder().map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    expect(Object.isFrozen(registry.getUnlocksInDependencyOrder())).toBe(true);
  });

  it('creates a deeply immutable reward grant and rejects ambiguous values', () => {
    const grant = createRewardGrant({
      schemaVersion: REWARD_GRANT_SCHEMA_VERSION,
      grantId: 'grant-1',
      rewardDefinitionId: 'reward',
      resultAuthorityHash: 'abcdef01',
      experienceDelta: 15,
      unlocks: {
        characterIds: ['hero-b', 'hero-a'],
        appearanceIds: [],
        equipmentIds: ['sword'],
        mapIds: [],
      },
    });
    expect(grant.unlocks.characterIds).toEqual(['hero-a', 'hero-b']);
    expect(Object.isFrozen(grant)).toBe(true);
    expect(Object.isFrozen(grant.unlocks)).toBe(true);
    expect(Object.isFrozen(grant.unlocks.characterIds)).toBe(true);
    expect(() => createRewardGrant({ ...grant, resultAuthorityHash: 'ABCDEF01' })).toThrow(/8 位十六进制/);
    expect(() => createRewardGrant({
      ...grant,
      unlocks: { ...grant.unlocks, characterIds: ['hero', 'hero'] },
    })).toThrow(/重复项/);
  });
});
