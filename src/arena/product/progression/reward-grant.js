import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '../../rules/definition-utils.js';

export const REWARD_GRANT_SCHEMA_VERSION = 1;

const KEYS = new Set([
  'schemaVersion',
  'grantId',
  'rewardDefinitionId',
  'resultAuthorityHash',
  'experienceDelta',
  'unlocks',
]);
const UNLOCK_KEYS = new Set(['characterIds', 'appearanceIds', 'equipmentIds', 'mapIds']);

function authorityHash(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}$/.test(value)) {
    throw new TypeError('RewardGrant.resultAuthorityHash 必须是 8 位十六进制 hash。');
  }
  return value;
}

export function createRewardGrant(value) {
  const source = cloneFrozenData(value, 'RewardGrant');
  assertKnownKeys(source, KEYS, 'RewardGrant');
  if (source.schemaVersion !== REWARD_GRANT_SCHEMA_VERSION) {
    throw new RangeError(`不支持 RewardGrant schema ${String(source.schemaVersion)}。`);
  }
  assertKnownKeys(source.unlocks, UNLOCK_KEYS, 'RewardGrant.unlocks');
  const unlocks = Object.freeze(Object.fromEntries([...UNLOCK_KEYS].map((key) => [
    key,
    cloneFrozenStringSet(source.unlocks[key], `RewardGrant.unlocks.${key}`),
  ])));
  return Object.freeze({
    schemaVersion: REWARD_GRANT_SCHEMA_VERSION,
    grantId: assertNonEmptyString(source.grantId, 'RewardGrant.grantId'),
    rewardDefinitionId: assertNonEmptyString(
      source.rewardDefinitionId,
      'RewardGrant.rewardDefinitionId',
    ),
    resultAuthorityHash: authorityHash(source.resultAuthorityHash),
    experienceDelta: assertIntegerAtLeast(
      source.experienceDelta,
      0,
      'RewardGrant.experienceDelta',
    ),
    unlocks,
  });
}
