import { createMatchRewardDefinition, type MatchRewardDefinition } from './match-reward-definition.js';
import { createUnlockDefinition, type UnlockDefinition } from './unlock-definition.js';

export interface ProgressionRegistryOptions {
  readonly rewards: readonly unknown[];
  readonly unlocks: readonly unknown[];
}

function compareIds(left: { readonly id: string }, right: { readonly id: string }): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function readOptions(value: unknown): Readonly<{ rewards: unknown; unlocks: unknown }> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('ProgressionRegistry options 必须是普通对象。');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('ProgressionRegistry options 必须是普通对象。');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== 'string' || (key !== 'rewards' && key !== 'unlocks'))) {
    throw new TypeError('ProgressionRegistry options 含未知字段。');
  }
  for (const key of ['rewards', 'unlocks'] as const) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError(`ProgressionRegistry.${key} 必须是可枚举数据字段。`);
    }
  }
  return Object.freeze({
    rewards: (descriptors.rewards as PropertyDescriptor & { value: unknown }).value,
    unlocks: (descriptors.unlocks as PropertyDescriptor & { value: unknown }).value,
  });
}

function normalizeDefinitions<T>(
  value: unknown,
  createDefinition: (item: unknown) => T,
  name: string,
): T[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  if (!lengthDescriptor || !('value' in lengthDescriptor) || !Number.isSafeInteger(lengthDescriptor.value)) {
    throw new TypeError(`${name}.length 必须是数据字段。`);
  }
  const length = lengthDescriptor.value as number;
  const keys = Reflect.ownKeys(value);
  const expectedKeys = new Set(['length']);
  const definitions: T[] = [];
  for (let index = 0; index < length; index += 1) {
    expectedKeys.add(String(index));
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError(`${name} 不能包含空槽或访问器。`);
    }
    definitions.push(createDefinition(descriptor.value));
  }
  if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    throw new TypeError(`${name} 不能包含额外字段。`);
  }
  return definitions;
}

function createUnlockDependencyOrder(
  definitions: readonly UnlockDefinition[],
  byId: ReadonlyMap<string, UnlockDefinition>,
): readonly UnlockDefinition[] {
  const incoming = new Map(definitions.map((definition) => [definition.id, definition.prerequisiteIds.length]));
  const dependents = new Map(definitions.map((definition) => [definition.id, [] as string[]]));
  for (const definition of definitions) {
    for (const prerequisiteId of definition.prerequisiteIds) dependents.get(prerequisiteId)?.push(definition.id);
  }
  const ready = definitions.filter((definition) => incoming.get(definition.id) === 0);
  const ordered: UnlockDefinition[] = [];
  while (ready.length > 0) {
    const definition = ready.pop();
    if (!definition) continue;
    ordered.push(definition);
    for (const dependentId of dependents.get(definition.id) ?? []) {
      const remaining = (incoming.get(dependentId) ?? 0) - 1;
      incoming.set(dependentId, remaining);
      const dependent = byId.get(dependentId);
      if (remaining === 0 && dependent) ready.push(dependent);
    }
  }
  if (ordered.length !== definitions.length) throw new RangeError('ProgressionRegistry 解锁依赖存在环。');
  return Object.freeze(ordered);
}

export class ProgressionRegistry {
  readonly #rewards: readonly MatchRewardDefinition[];
  readonly #unlocks: readonly UnlockDefinition[];
  readonly #rewardById: ReadonlyMap<string, MatchRewardDefinition>;
  readonly #unlockById: ReadonlyMap<string, UnlockDefinition>;
  readonly #unlocksInDependencyOrder: readonly UnlockDefinition[];

  constructor(options: ProgressionRegistryOptions);
  constructor(options: unknown) {
    const source = readOptions(options);
    const rewards = normalizeDefinitions(source.rewards, createMatchRewardDefinition, 'ProgressionRegistry.rewards').sort(compareIds);
    const unlocks = normalizeDefinitions(source.unlocks, createUnlockDefinition, 'ProgressionRegistry.unlocks').sort(compareIds);
    const rewardById = new Map<string, MatchRewardDefinition>();
    for (const reward of rewards) {
      if (rewardById.has(reward.id)) throw new RangeError(`ProgressionRegistry 重复奖励 ${reward.id}。`);
      rewardById.set(reward.id, reward);
    }
    const unlockById = new Map<string, UnlockDefinition>();
    const targetKeys = new Set<string>();
    for (const unlock of unlocks) {
      if (unlockById.has(unlock.id)) throw new RangeError(`ProgressionRegistry 重复解锁 ${unlock.id}。`);
      const targetKey = `${unlock.kind}:${unlock.contentId}`;
      if (targetKeys.has(targetKey)) throw new RangeError(`ProgressionRegistry 重复解锁目标 ${targetKey}。`);
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
    const unlocksInDependencyOrder = createUnlockDependencyOrder(unlocks, unlockById);
    this.#rewards = Object.freeze(rewards);
    this.#unlocks = Object.freeze(unlocks);
    this.#rewardById = rewardById;
    this.#unlockById = unlockById;
    this.#unlocksInDependencyOrder = unlocksInDependencyOrder;
    Object.freeze(this);
  }

  getReward(id: unknown): MatchRewardDefinition | null {
    return typeof id === 'string' ? this.#rewardById.get(id) ?? null : null;
  }
  getUnlock(id: unknown): UnlockDefinition | null {
    return typeof id === 'string' ? this.#unlockById.get(id) ?? null : null;
  }
  getRewards(): readonly MatchRewardDefinition[] { return this.#rewards; }
  getUnlocks(): readonly UnlockDefinition[] { return this.#unlocks; }
  getUnlocksInDependencyOrder(): readonly UnlockDefinition[] {
    return this.#unlocksInDependencyOrder;
  }
}

export function createProgressionRegistry(value: unknown): ProgressionRegistry {
  if (value instanceof ProgressionRegistry && Object.getPrototypeOf(value) === ProgressionRegistry.prototype) {
    return value;
  }
  return new ProgressionRegistry(value as ProgressionRegistryOptions);
}
