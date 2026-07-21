import { assertNonEmptyString } from '@number-strategy-jump/arena-contracts';
import { validateProductMatchResult } from '../matchmaking/product-match-result.js';
import { createPlayerProfile } from '../profile/player-profile.js';
import { createPlayerProfileDefinition } from '../profile/player-profile-definition.js';
import { createProgressionRegistry } from './progression-registry.js';
import { REWARD_GRANT_SCHEMA_VERSION, createRewardGrant } from './reward-grant.js';
import { UNLOCK_PROFILE_KEY } from './unlock-definition.js';

function validateResult(value) {
  return validateProductMatchResult(value);
}

function createEmptyUnlocks() {
  return {
    characterIds: [],
    appearanceIds: [],
    equipmentIds: [],
    mapIds: [],
  };
}

function resolveUnlocks(registry, profile, projectedExperience) {
  const additions = createEmptyUnlocks();
  const satisfiedDefinitionIds = new Set();
  for (const definition of registry.getUnlocks()) {
    const profileKey = UNLOCK_PROFILE_KEY[definition.kind];
    if (profile.unlocks[profileKey].includes(definition.contentId)) {
      satisfiedDefinitionIds.add(definition.id);
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const definition of registry.getUnlocks()) {
      const profileKey = UNLOCK_PROFILE_KEY[definition.kind];
      if (profile.unlocks[profileKey].includes(definition.contentId)) {
        continue;
      }
      if (additions[profileKey].includes(definition.contentId)) continue;
      if (definition.requiredExperience > projectedExperience) continue;
      if (!definition.prerequisiteIds.every((id) => satisfiedDefinitionIds.has(id))) continue;
      additions[profileKey].push(definition.contentId);
      satisfiedDefinitionIds.add(definition.id);
      changed = true;
    }
  }
  return Object.freeze(Object.fromEntries(Object.entries(additions).map(([key, ids]) => [
    key,
    Object.freeze(ids.sort()),
  ])));
}

export function resolveMatchReward({
  registry: registryValue,
  rewardDefinitionId,
  profileDefinition: profileDefinitionValue,
  profile: profileValue,
  result: resultValue,
}) {
  const registry = createProgressionRegistry(registryValue);
  const rewardDefinition = registry.getReward(assertNonEmptyString(
    rewardDefinitionId,
    'RewardResolver.rewardDefinitionId',
  ));
  if (!rewardDefinition) throw new RangeError('RewardResolver 奖励 Definition 不存在。');
  const profileDefinition = createPlayerProfileDefinition(profileDefinitionValue);
  const profile = createPlayerProfile(profileDefinition, profileValue);
  const result = validateResult(resultValue);
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
  return createRewardGrant({
    schemaVersion: REWARD_GRANT_SCHEMA_VERSION,
    // Profile revision is the local transaction scope: it remains stable while
    // the current result is retryable and advances before another match can settle.
    grantId: `arena-result:r${profile.revision}:${seedHex}:${result.authorityHash}`,
    rewardDefinitionId: rewardDefinition.id,
    resultAuthorityHash: result.authorityHash,
    experienceDelta,
    unlocks: resolveUnlocks(registry, profile, projectedExperience),
  });
}
