import { assertKnownKeys, cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  createModeMatchRewardDefinitionV2,
  type ModeMatchRewardDefinitionV2,
} from './mode-match-reward-definition-v2.js';
import { createProgressionRegistry, type ProgressionRegistry } from './progression-registry.js';

export interface ModeProgressionRegistryV2Options {
  readonly rewards: readonly unknown[];
  readonly unlocks: readonly unknown[];
}

const OPTION_KEYS = new Set(['rewards', 'unlocks']);

export class ModeProgressionRegistryV2 {
  readonly #rewards: readonly ModeMatchRewardDefinitionV2[];
  readonly #rewardById: ReadonlyMap<string, ModeMatchRewardDefinitionV2>;
  readonly #rewardByMode: ReadonlyMap<string, ModeMatchRewardDefinitionV2>;
  readonly #unlockRegistry: ProgressionRegistry;

  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'ModeProgressionRegistryV2 options');
    assertKnownKeys(source, OPTION_KEYS, 'ModeProgressionRegistryV2 options');
    if (!Object.hasOwn(source, 'rewards') || !Object.hasOwn(source, 'unlocks')) {
      throw new TypeError('ModeProgressionRegistryV2 options缺少rewards/unlocks。');
    }
    if (!Array.isArray(source.rewards) || !Array.isArray(source.unlocks)) {
      throw new TypeError('ModeProgressionRegistryV2 rewards/unlocks必须是数组。');
    }
    const rewards = source.rewards
      .map(createModeMatchRewardDefinitionV2)
      .sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
    const rewardById = new Map<string, ModeMatchRewardDefinitionV2>();
    const rewardByMode = new Map<string, ModeMatchRewardDefinitionV2>();
    for (const reward of rewards) {
      if (rewardById.has(reward.id)) throw new RangeError(`重复奖励Definition ${reward.id}。`);
      if (rewardByMode.has(reward.modeDefinitionId)) {
        throw new RangeError(`Mode ${reward.modeDefinitionId} 注册了多个奖励Definition。`);
      }
      rewardById.set(reward.id, reward);
      rewardByMode.set(reward.modeDefinitionId, reward);
    }
    this.#rewards = Object.freeze(rewards);
    this.#rewardById = rewardById;
    this.#rewardByMode = rewardByMode;
    this.#unlockRegistry = createProgressionRegistry({ rewards: [], unlocks: source.unlocks });
    Object.freeze(this);
  }

  getReward(id: unknown): ModeMatchRewardDefinitionV2 | null {
    return typeof id === 'string' ? this.#rewardById.get(id) ?? null : null;
  }

  getRewardByMode(modeDefinitionId: unknown): ModeMatchRewardDefinitionV2 | null {
    return typeof modeDefinitionId === 'string'
      ? this.#rewardByMode.get(modeDefinitionId) ?? null
      : null;
  }

  getRewards(): readonly ModeMatchRewardDefinitionV2[] { return this.#rewards; }
  getUnlocksInDependencyOrder() { return this.#unlockRegistry.getUnlocksInDependencyOrder(); }
}

export function createModeProgressionRegistryV2(value: unknown): ModeProgressionRegistryV2 {
  if (value instanceof ModeProgressionRegistryV2
    && Object.getPrototypeOf(value) === ModeProgressionRegistryV2.prototype) return value;
  return new ModeProgressionRegistryV2(value);
}
