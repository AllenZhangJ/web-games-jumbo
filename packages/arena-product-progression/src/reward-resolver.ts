import { assertNonEmptyString } from '@number-strategy-jump/arena-contracts';
import { validateProductMatchResult } from '@number-strategy-jump/arena-product-contracts';
import {
  createPlayerProfile,
  createPlayerProfileDefinition,
  type PlayerProfile,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  REWARD_GRANT_SCHEMA_VERSION,
  UNLOCK_PROFILE_KEY,
  createProgressionRegistry,
  createRewardGrant,
  type ProgressionRegistry,
  type RewardGrant,
  type RewardGrantUnlocks,
  type UnlockProfileKey,
} from '@number-strategy-jump/arena-progression';
import { readExactOptions } from './options.js';

export interface ResolveMatchRewardOptions {
  readonly registry: unknown;
  readonly rewardDefinitionId: unknown;
  readonly profileDefinition: unknown;
  readonly profile: unknown;
  readonly result: unknown;
}

const OPTION_KEYS = new Set([
  'registry', 'rewardDefinitionId', 'profileDefinition', 'profile', 'result',
]);

function createEmptyUnlocks(): Record<UnlockProfileKey, string[]> {
  return {
    characterIds: [],
    appearanceIds: [],
    equipmentIds: [],
    mapIds: [],
  };
}

function resolveUnlocks(
  registry: ProgressionRegistry,
  profile: PlayerProfile,
  projectedExperience: number,
): RewardGrantUnlocks {
  const additions = createEmptyUnlocks();
  const satisfiedDefinitionIds = new Set<string>();
  for (const definition of registry.getUnlocksInDependencyOrder()) {
    const profileKey = UNLOCK_PROFILE_KEY[definition.kind];
    if (profile.unlocks[profileKey].includes(definition.contentId)) {
      satisfiedDefinitionIds.add(definition.id);
      continue;
    }
    if (definition.requiredExperience > projectedExperience) continue;
    if (!definition.prerequisiteIds.every((id) => satisfiedDefinitionIds.has(id))) continue;
    additions[profileKey].push(definition.contentId);
    satisfiedDefinitionIds.add(definition.id);
  }
  return Object.freeze({
    characterIds: Object.freeze(additions.characterIds.sort()),
    appearanceIds: Object.freeze(additions.appearanceIds.sort()),
    equipmentIds: Object.freeze(additions.equipmentIds.sort()),
    mapIds: Object.freeze(additions.mapIds.sort()),
  });
}

export function resolveMatchReward(value: unknown): RewardGrant {
  const options = readExactOptions(value, OPTION_KEYS, 'RewardResolver options');
  const registry = createProgressionRegistry(options.registry);
  const rewardDefinitionId = assertNonEmptyString(
    options.rewardDefinitionId,
    'RewardResolver.rewardDefinitionId',
  );
  const rewardDefinition = registry.getReward(rewardDefinitionId);
  if (!rewardDefinition) throw new RangeError('RewardResolver 奖励 Definition 不存在。');
  const profileDefinition = createPlayerProfileDefinition(options.profileDefinition);
  const profile = createPlayerProfile(profileDefinition, options.profile);
  const result = validateProductMatchResult(options.result);
  const requestedExperience = rewardDefinition.completionExperience
    + (result.authorityResult.isDraw ? rewardDefinition.drawBonusExperience : 0)
    + (result.authorityResult.winnerId === rewardDefinition.participantId
      ? rewardDefinition.winnerBonusExperience
      : 0);
  const experienceDelta = Math.min(
    requestedExperience,
    profileDefinition.limits.maxExperience - profile.progression.experience,
  );
  const projectedExperience = profile.progression.experience + experienceDelta;
  const seedHex = result.matchSeed.toString(16).padStart(8, '0');
  const grantId = `arena-result:r${profile.revision}:${seedHex}:${result.authorityHash}`;
  if (grantId.length > profileDefinition.limits.maxIdentifierLength) {
    throw new RangeError('RewardResolver grantId 超出 Profile 标识符长度上限。');
  }
  return createRewardGrant({
    schemaVersion: REWARD_GRANT_SCHEMA_VERSION,
    grantId,
    rewardDefinitionId: rewardDefinition.id,
    resultAuthorityHash: result.authorityHash,
    experienceDelta,
    unlocks: resolveUnlocks(registry, profile, projectedExperience),
  });
}
