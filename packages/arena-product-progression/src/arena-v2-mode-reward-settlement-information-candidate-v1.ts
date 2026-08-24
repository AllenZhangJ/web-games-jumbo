import {
  createPlayerProfile,
  createPlayerProfileDefinition,
} from '@number-strategy-jump/arena-profile-contracts';
import { validateProductMatchResultV3 } from '@number-strategy-jump/arena-product-contracts';
import { createRewardGrant } from '@number-strategy-jump/arena-progression';
import type {
  ArenaV2LearningInformationFieldPatchV1,
} from './arena-v2-learning-information-projection-v1.js';
import {
  projectModeMatchRewardPolicyBreakdownV2,
  type ModeMatchRewardPolicyBreakdownV2,
} from './mode-reward-resolver-v2.js';
import { readExactOptions } from './options.js';

export interface ArenaV2ModeRewardSettlementInformationProjectionCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly settlementStatus: 'committed' | 'duplicate';
  readonly requestedExperience: number;
  readonly grantedExperience: number;
  readonly fieldValues: readonly ArenaV2LearningInformationFieldPatchV1[];
}

const OPTION_KEYS = new Set([
  'registry', 'profileDefinition', 'result', 'recipientParticipantId', 'rewardOutcome',
]);
const OUTCOME_KEYS = new Set(['grant', 'committed', 'duplicate', 'profile']);
const UNLOCK_KEYS = [
  'characterIds', 'appearanceIds', 'equipmentIds', 'mapIds',
] as const;

function field(
  valueText: string,
  accessibilityText: string,
): ArenaV2LearningInformationFieldPatchV1 {
  return Object.freeze({
    fieldId: 'reward-breakdown',
    labelMessageId: 'arena.v2.field.reward-breakdown',
    valueText,
    accessibilityText,
    fixedWidthNumeric: false,
  });
}

function policyText(breakdown: ModeMatchRewardPolicyBreakdownV2): string {
  const completion = breakdown.effectiveCompletion
    ? `完成 +${breakdown.completionExperience}`
    : '未形成有效完成 +0';
  if (breakdown.reason.kind === 'duel') {
    const outcome = breakdown.reason.outcome === 'win'
      ? '获胜'
      : breakdown.reason.outcome === 'draw'
        ? '平局'
        : '落败';
    return `${completion}，${outcome} +${breakdown.bonusExperience}`;
  }
  if (breakdown.reason.kind === 'race') {
    if (breakdown.reason.finishTick === null) {
      return `${completion}，未到达终点 +0`;
    }
    return `${completion}，到达终点 +${breakdown.reason.finishBonusExperience}`
      + `，第${breakdown.reason.rank}名 +${breakdown.reason.rankBonusExperience}`;
  }
  return `${completion}，坚持到压力阶段${breakdown.reason.pressureStage}`
    + ` +${breakdown.bonusExperience}`;
}

/**
 * Turns the already-authoritative Result and committed Reward outcome into one
 * read-only explanation. It never decides or mutates rewards.
 */
export function projectArenaV2ModeRewardSettlementInformationCandidateV1(
  value: unknown,
): ArenaV2ModeRewardSettlementInformationProjectionCandidateV1 {
  const options = readExactOptions(
    value,
    OPTION_KEYS,
    'Arena V2 Mode Reward Settlement information candidate options',
  );
  const definition = createPlayerProfileDefinition(options.profileDefinition);
  const outcome = readExactOptions(
    options.rewardOutcome,
    OUTCOME_KEYS,
    'Arena V2 Mode Reward Settlement outcome',
  );
  if (typeof outcome.committed !== 'boolean' || typeof outcome.duplicate !== 'boolean') {
    throw new TypeError('Arena V2 Mode Reward Settlement状态必须是布尔值。');
  }
  if (outcome.committed === outcome.duplicate) {
    throw new RangeError('Arena V2 Mode Reward Settlement必须且只能是committed或duplicate。');
  }
  const grant = createRewardGrant(outcome.grant);
  const profile = createPlayerProfile(definition, outcome.profile);
  const result = validateProductMatchResultV3(options.result);
  const breakdown = projectModeMatchRewardPolicyBreakdownV2({
    registry: options.registry,
    result,
    recipientParticipantId: options.recipientParticipantId,
  });
  if (grant.resultAuthorityHash !== result.authorityHash) {
    throw new RangeError('Arena V2奖励结算与Result权威身份不一致。');
  }
  if (grant.rewardDefinitionId !== breakdown.rewardDefinitionId) {
    throw new RangeError('Arena V2奖励结算与奖励Definition不一致。');
  }
  if (grant.experienceDelta > breakdown.requestedExperience) {
    throw new RangeError('Arena V2奖励入账经验超过权威规则请求值。');
  }
  if (!profile.progression.committedGrantIds.includes(grant.grantId)) {
    throw new RangeError('Arena V2奖励结算档案未记录当前grant。');
  }
  if (profile.progression.experience < grant.experienceDelta) {
    throw new RangeError('Arena V2奖励结算档案经验小于当前grant。');
  }
  for (const key of UNLOCK_KEYS) {
    if (grant.unlocks[key].some((id) => !profile.unlocks[key].includes(id))) {
      throw new RangeError(`Arena V2奖励结算档案缺少${key}解锁。`);
    }
  }

  const capped = grant.experienceDelta < breakdown.requestedExperience;
  const settlementStatus = outcome.committed ? 'committed' as const : 'duplicate' as const;
  const valueText = `${policyText(breakdown)}；规则经验 +${breakdown.requestedExperience}`
    + (capped ? `，达到档案上限后实际 +${grant.experienceDelta}` : '')
    + (settlementStatus === 'duplicate' ? '；已结算，未重复累计' : '');
  const accessibilityText = `${policyText(breakdown)}。规则经验${breakdown.requestedExperience}。`
    + (capped ? `档案上限限制后实际入账${grant.experienceDelta}。` : '已按规则完整入账。')
    + (settlementStatus === 'duplicate' ? '本次为重复结算请求，没有再次累计。' : '');

  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    settlementStatus,
    requestedExperience: breakdown.requestedExperience,
    grantedExperience: grant.experienceDelta,
    fieldValues: Object.freeze([field(valueText, accessibilityText)]),
  });
}

export const ARENA_V2_MODE_REWARD_SETTLEMENT_INFORMATION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  ownedFieldIds: Object.freeze(['reward-breakdown'] as const),
  authoritativeInputs: Object.freeze(['product-result-v3', 'mode-reward-commit-outcome-v2']),
  validationStatus: 'not-run' as const,
  defaultSurfaceWired: false as const,
});
