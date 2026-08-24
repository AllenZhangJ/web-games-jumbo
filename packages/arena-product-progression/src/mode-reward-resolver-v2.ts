import { assertNonEmptyString } from '@number-strategy-jump/arena-contracts';
import {
  PRODUCT_MODE_ROLE,
  validateProductMatchResultV3,
} from '@number-strategy-jump/arena-product-contracts';
import {
  createPlayerProfile,
  createPlayerProfileDefinition,
  type PlayerProfile,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  MODE_MATCH_REWARD_POLICY_KIND,
  REWARD_GRANT_SCHEMA_VERSION,
  UNLOCK_PROFILE_KEY,
  createModeProgressionRegistryV2,
  createRewardGrant,
  type ModeMatchRewardDefinitionV2,
  type ModeProgressionRegistryV2,
  type RewardGrant,
  type RewardGrantUnlocks,
  type UnlockProfileKey,
} from '@number-strategy-jump/arena-progression';
import { isArenaV2EffectiveMatchCompletionV1 } from './arena-v2-effective-match-completion-v1.js';
import { readExactOptions } from './options.js';

export interface ResolveModeMatchRewardV2Options {
  readonly registry: unknown;
  readonly profileDefinition: unknown;
  readonly profile: unknown;
  readonly result: unknown;
  readonly recipientParticipantId: unknown;
}

export interface ProjectModeMatchRewardPolicyBreakdownV2Options {
  readonly registry: unknown;
  readonly result: unknown;
  readonly recipientParticipantId: unknown;
}

export type ModeMatchRewardPolicyReasonV2 =
  | Readonly<{
    readonly kind: 'duel';
    readonly outcome: 'win' | 'draw' | 'loss';
  }>
  | Readonly<{
    readonly kind: 'race';
    readonly rank: number;
    readonly finishTick: number | null;
    readonly finishBonusExperience: number;
    readonly rankBonusExperience: number;
  }>
  | Readonly<{
    readonly kind: 'survival';
    readonly pressureStage: number;
    readonly matchedMinimumPressureStage: number | null;
  }>;

export interface ModeMatchRewardPolicyBreakdownV2 {
  readonly schemaVersion: 1;
  readonly modeDefinitionId: string;
  readonly rewardDefinitionId: string;
  readonly modeKind: 'duel' | 'race' | 'survival';
  readonly effectiveCompletion: boolean;
  readonly completionExperience: number;
  readonly bonusExperience: number;
  readonly requestedExperience: number;
  readonly reason: ModeMatchRewardPolicyReasonV2;
}

const OPTION_KEYS = new Set([
  'registry', 'profileDefinition', 'profile', 'result', 'recipientParticipantId',
]);
const POLICY_BREAKDOWN_OPTION_KEYS = new Set([
  'registry', 'result', 'recipientParticipantId',
]);

function createEmptyUnlocks(): Record<UnlockProfileKey, string[]> {
  return { characterIds: [], appearanceIds: [], equipmentIds: [], mapIds: [] };
}

function resolveUnlocks(
  registry: ModeProgressionRegistryV2,
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

function assertRewardRecipient(
  result: ReturnType<typeof validateProductMatchResultV3>,
  recipientParticipantId: string,
): void {
  const recipientAssignment = result.participantAssignments.find(
    ({ participantId }) => participantId === recipientParticipantId,
  );
  if (!recipientAssignment || recipientAssignment.modeRole === PRODUCT_MODE_ROLE.ENEMY) {
    throw new RangeError('ModeRewardResolverV2 recipient必须是assignment中的非enemy participant。');
  }
}

function resolvePolicyBreakdown(
  registry: ModeProgressionRegistryV2,
  result: ReturnType<typeof validateProductMatchResultV3>,
  recipientParticipantId: string,
): ModeMatchRewardPolicyBreakdownV2 {
  assertRewardRecipient(result, recipientParticipantId);
  const reward = registry.getRewardByMode(result.modeDefinitionId);
  if (!reward) throw new RangeError('ModeRewardResolverV2缺少对应Mode奖励Definition。');
  if (reward.policy.kind !== result.modeResult.kind) {
    throw new RangeError('ModeRewardResolverV2 Mode/result/policy不一致。');
  }
  const resolved = modeBonus(reward, result, recipientParticipantId);
  const effectiveCompletion = isArenaV2EffectiveMatchCompletionV1(
    result,
    recipientParticipantId,
  );
  const completionExperience = effectiveCompletion ? reward.completionExperience : 0;
  const requestedExperience = completionExperience + resolved.bonusExperience;
  if (!Number.isSafeInteger(requestedExperience)) {
    throw new RangeError('ModeRewardResolverV2请求经验超出安全整数范围。');
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    modeDefinitionId: result.modeDefinitionId,
    rewardDefinitionId: reward.id,
    modeKind: result.modeResult.kind,
    effectiveCompletion,
    completionExperience,
    bonusExperience: resolved.bonusExperience,
    requestedExperience,
    reason: resolved.reason,
  });
}

function modeBonus(
  reward: ModeMatchRewardDefinitionV2,
  result: ReturnType<typeof validateProductMatchResultV3>,
  recipientParticipantId: string,
): Readonly<{
    readonly bonusExperience: number;
    readonly reason: ModeMatchRewardPolicyReasonV2;
  }> {
  const policy = reward.policy;
  if (result.modeResult.kind === MODE_MATCH_REWARD_POLICY_KIND.DUEL) {
    if (policy.kind !== MODE_MATCH_REWARD_POLICY_KIND.DUEL) {
      throw new RangeError('Duel result与奖励policy不一致。');
    }
    const outcome = result.modeResult.isDraw
      ? 'draw' as const
      : result.modeResult.winnerParticipantIds.includes(recipientParticipantId)
        ? 'win' as const
        : 'loss' as const;
    return Object.freeze({
      bonusExperience: outcome === 'draw'
        ? policy.drawBonusExperience
        : outcome === 'win'
          ? policy.winnerBonusExperience
          : 0,
      reason: Object.freeze({ kind: 'duel' as const, outcome }),
    });
  }
  if (result.modeResult.kind === MODE_MATCH_REWARD_POLICY_KIND.RACE) {
    if (policy.kind !== MODE_MATCH_REWARD_POLICY_KIND.RACE) {
      throw new RangeError('Race result与奖励policy不一致。');
    }
    const ranking = result.modeResult.rankings.find(
      ({ participantId }) => participantId === recipientParticipantId,
    );
    if (!ranking) throw new RangeError('Race recipient缺少ranking。');
    const finishBonusExperience = ranking.finishTick === null
      ? 0
      : policy.finishBonusExperience;
    const rankBonusExperience = ranking.finishTick === null
      ? 0
      : policy.rankBonuses.find(({ rank }) => rank === ranking.rank)?.experience ?? 0;
    const total = finishBonusExperience + rankBonusExperience;
    if (!Number.isSafeInteger(total)) throw new RangeError('Race奖励经验超出安全整数范围。');
    return Object.freeze({
      bonusExperience: total,
      reason: Object.freeze({
        kind: 'race' as const,
        rank: ranking.rank,
        finishTick: ranking.finishTick,
        finishBonusExperience,
        rankBonusExperience,
      }),
    });
  }
  if (policy.kind !== MODE_MATCH_REWARD_POLICY_KIND.SURVIVAL) {
    throw new RangeError('Survival result与奖励policy不一致。');
  }
  if (result.modeResult.playerParticipantId !== recipientParticipantId) {
    throw new RangeError('Survival奖励只能授予权威player participant。');
  }
  let bonusExperience = 0;
  let matchedMinimumPressureStage: number | null = null;
  for (const stageBonus of policy.stageBonuses) {
    if (stageBonus.minimumPressureStage > result.modeResult.pressureStage) break;
    bonusExperience = stageBonus.experience;
    matchedMinimumPressureStage = stageBonus.minimumPressureStage;
  }
  return Object.freeze({
    bonusExperience,
    reason: Object.freeze({
      kind: 'survival' as const,
      pressureStage: result.modeResult.pressureStage,
      matchedMinimumPressureStage,
    }),
  });
}

export function projectModeMatchRewardPolicyBreakdownV2(
  value: unknown,
): ModeMatchRewardPolicyBreakdownV2 {
  const options = readExactOptions(
    value,
    POLICY_BREAKDOWN_OPTION_KEYS,
    'ModeRewardPolicyProjectionV2 options',
  );
  return resolvePolicyBreakdown(
    createModeProgressionRegistryV2(options.registry),
    validateProductMatchResultV3(options.result),
    assertNonEmptyString(
      options.recipientParticipantId,
      'ModeRewardPolicyProjectionV2.recipientParticipantId',
    ),
  );
}

export function resolveModeMatchRewardV2(value: unknown): RewardGrant {
  const options = readExactOptions(value, OPTION_KEYS, 'ModeRewardResolverV2 options');
  const registry = createModeProgressionRegistryV2(options.registry);
  const profileDefinition = createPlayerProfileDefinition(options.profileDefinition);
  const profile = createPlayerProfile(profileDefinition, options.profile);
  const result = validateProductMatchResultV3(options.result);
  const recipientParticipantId = assertNonEmptyString(
    options.recipientParticipantId,
    'ModeRewardResolverV2.recipientParticipantId',
  );
  const breakdown = resolvePolicyBreakdown(registry, result, recipientParticipantId);
  const rewardDefinition = registry.getRewardByMode(result.modeDefinitionId);
  if (!rewardDefinition) throw new RangeError('ModeRewardResolverV2缺少对应Mode奖励Definition。');
  const experienceDelta = Math.min(
    breakdown.requestedExperience,
    profileDefinition.limits.maxExperience - profile.progression.experience,
  );
  const projectedExperience = profile.progression.experience + experienceDelta;
  const seedHex = result.matchSeed.toString(16).padStart(8, '0');
  const grantId = [
    'arena-result:v2',
    seedHex,
    result.authorityIdentity.configHash,
    result.authorityIdentity.finalHash,
    result.authorityHash,
  ].join(':');
  if (grantId.length > profileDefinition.limits.maxIdentifierLength) {
    throw new RangeError('ModeRewardResolverV2 grantId超出Profile标识符长度上限。');
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
