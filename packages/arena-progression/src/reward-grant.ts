import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';

export const REWARD_GRANT_SCHEMA_VERSION = 1;
export interface RewardGrantUnlocks {
  readonly characterIds: readonly string[];
  readonly appearanceIds: readonly string[];
  readonly equipmentIds: readonly string[];
  readonly mapIds: readonly string[];
}
export interface RewardGrant {
  readonly schemaVersion: 1;
  readonly grantId: string;
  readonly rewardDefinitionId: string;
  readonly resultAuthorityHash: string;
  readonly experienceDelta: number;
  readonly unlocks: RewardGrantUnlocks;
}

const KEYS = new Set(['schemaVersion', 'grantId', 'rewardDefinitionId', 'resultAuthorityHash', 'experienceDelta', 'unlocks']);
const UNLOCK_KEYS = new Set(['characterIds', 'appearanceIds', 'equipmentIds', 'mapIds']);
function authorityHash(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}$/.test(value)) {
    throw new TypeError('RewardGrant.resultAuthorityHash 必须是 8 位十六进制 hash。');
  }
  return value;
}

export function createRewardGrant(value: unknown): RewardGrant {
  const source = cloneFrozenData(value, 'RewardGrant');
  assertKnownKeys(source, KEYS, 'RewardGrant');
  if (source.schemaVersion !== REWARD_GRANT_SCHEMA_VERSION) {
    throw new RangeError(`不支持 RewardGrant schema ${String(source.schemaVersion)}。`);
  }
  assertKnownKeys(source.unlocks, UNLOCK_KEYS, 'RewardGrant.unlocks');
  const unlocks = Object.freeze({
    characterIds: cloneFrozenStringSet(
      source.unlocks.characterIds as readonly unknown[] | undefined,
      'RewardGrant.unlocks.characterIds',
    ),
    appearanceIds: cloneFrozenStringSet(
      source.unlocks.appearanceIds as readonly unknown[] | undefined,
      'RewardGrant.unlocks.appearanceIds',
    ),
    equipmentIds: cloneFrozenStringSet(
      source.unlocks.equipmentIds as readonly unknown[] | undefined,
      'RewardGrant.unlocks.equipmentIds',
    ),
    mapIds: cloneFrozenStringSet(
      source.unlocks.mapIds as readonly unknown[] | undefined,
      'RewardGrant.unlocks.mapIds',
    ),
  });
  return Object.freeze({
    schemaVersion: REWARD_GRANT_SCHEMA_VERSION,
    grantId: assertNonEmptyString(source.grantId, 'RewardGrant.grantId'),
    rewardDefinitionId: assertNonEmptyString(source.rewardDefinitionId, 'RewardGrant.rewardDefinitionId'),
    resultAuthorityHash: authorityHash(source.resultAuthorityHash),
    experienceDelta: assertIntegerAtLeast(source.experienceDelta, 0, 'RewardGrant.experienceDelta'),
    unlocks,
  });
}
