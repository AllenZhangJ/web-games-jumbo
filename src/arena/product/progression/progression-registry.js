import { createMatchRewardDefinition } from './match-reward-definition.js';
import { createUnlockDefinition } from './unlock-definition.js';

function compareIds(left, right) {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function normalizeDefinitions(value, createDefinition, name) {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  const keys = Reflect.ownKeys(value);
  const expectedKeys = new Set(['length']);
  const definitions = [];
  for (let index = 0; index < value.length; index += 1) {
    expectedKeys.add(String(index));
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      !descriptor
      || !descriptor.enumerable
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      throw new TypeError(`${name} 不能包含空槽或访问器。`);
    }
    definitions.push(createDefinition(descriptor.value));
  }
  if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    throw new TypeError(`${name} 不能包含额外字段。`);
  }
  return definitions;
}

function assertNoUnlockCycles(definitions, byId) {
  const incoming = new Map(definitions.map((definition) => [
    definition.id,
    definition.prerequisiteIds.length,
  ]));
  const dependents = new Map(definitions.map((definition) => [definition.id, []]));
  for (const definition of definitions) {
    for (const prerequisiteId of definition.prerequisiteIds) {
      dependents.get(prerequisiteId).push(definition.id);
    }
  }
  const ready = definitions.filter((definition) => incoming.get(definition.id) === 0);
  let visited = 0;
  while (ready.length > 0) {
    const definition = ready.pop();
    visited += 1;
    for (const dependentId of dependents.get(definition.id)) {
      const remaining = incoming.get(dependentId) - 1;
      incoming.set(dependentId, remaining);
      if (remaining === 0) ready.push(byId.get(dependentId));
    }
  }
  if (visited !== definitions.length) {
    throw new RangeError('ProgressionRegistry 解锁依赖存在环。');
  }
}

export class ProgressionRegistry {
  #rewards;
  #unlocks;
  #rewardById;
  #unlockById;

  constructor({ rewards: rewardValues, unlocks: unlockValues }) {
    const rewards = normalizeDefinitions(
      rewardValues,
      createMatchRewardDefinition,
      'ProgressionRegistry.rewards',
    )
      .sort(compareIds);
    const unlocks = normalizeDefinitions(
      unlockValues,
      createUnlockDefinition,
      'ProgressionRegistry.unlocks',
    )
      .sort(compareIds);
    const rewardById = new Map();
    for (const reward of rewards) {
      if (rewardById.has(reward.id)) throw new RangeError(`ProgressionRegistry 重复奖励 ${reward.id}。`);
      rewardById.set(reward.id, reward);
    }
    const unlockById = new Map();
    const targetKeys = new Set();
    for (const unlock of unlocks) {
      if (unlockById.has(unlock.id)) throw new RangeError(`ProgressionRegistry 重复解锁 ${unlock.id}。`);
      const targetKey = `${unlock.kind}:${unlock.contentId}`;
      if (targetKeys.has(targetKey)) {
        throw new RangeError(`ProgressionRegistry 重复解锁目标 ${targetKey}。`);
      }
      targetKeys.add(targetKey);
      unlockById.set(unlock.id, unlock);
    }
    for (const unlock of unlocks) {
      for (const prerequisiteId of unlock.prerequisiteIds) {
        if (!unlockById.has(prerequisiteId)) {
          throw new RangeError(`ProgressionRegistry 缺少解锁依赖 ${prerequisiteId}。`);
        }
      }
    }
    assertNoUnlockCycles(unlocks, unlockById);
    this.#rewards = Object.freeze(rewards);
    this.#unlocks = Object.freeze(unlocks);
    this.#rewardById = rewardById;
    this.#unlockById = unlockById;
    Object.freeze(this);
  }

  getReward(id) {
    return this.#rewardById.get(id) ?? null;
  }

  getUnlock(id) {
    return this.#unlockById.get(id) ?? null;
  }

  getRewards() {
    return this.#rewards;
  }

  getUnlocks() {
    return this.#unlocks;
  }
}

export function createProgressionRegistry(value) {
  return value instanceof ProgressionRegistry ? value : new ProgressionRegistry(value);
}
