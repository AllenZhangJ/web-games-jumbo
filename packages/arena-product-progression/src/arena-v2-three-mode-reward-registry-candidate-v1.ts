import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  MODE_MATCH_REWARD_DEFINITION_V2_SCHEMA_VERSION,
  MODE_MATCH_REWARD_POLICY_KIND,
  createModeProgressionRegistryV2,
  type ModeProgressionRegistryV2,
} from '@number-strategy-jump/arena-progression';

export interface ArenaV2ThreeModeRewardRegistryCandidateV1Options {
  readonly duelModeDefinitionId: unknown;
  readonly raceModeDefinitionId: unknown;
  readonly survivalModeDefinitionId: unknown;
}

const OPTION_KEYS = new Set([
  'duelModeDefinitionId',
  'raceModeDefinitionId',
  'survivalModeDefinitionId',
]);

function requiredIdentifier(source: object, key: string): string {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`Arena three-mode reward registry.${key}必须是数据字段。`);
  }
  return assertNonEmptyString(
    descriptor.value,
    `Arena three-mode reward registry.${key}`,
  );
}

/** Candidate XP pacing only. Learning Profile V1 owns weapon collection. */
export function createArenaV2ThreeModeRewardRegistryCandidateV1(
  value: ArenaV2ThreeModeRewardRegistryCandidateV1Options,
): ModeProgressionRegistryV2 {
  const source = assertPlainRecord(value, 'Arena three-mode reward registry options');
  assertKnownKeys(source, OPTION_KEYS, 'Arena three-mode reward registry options');
  const duelModeDefinitionId = requiredIdentifier(source, 'duelModeDefinitionId');
  const raceModeDefinitionId = requiredIdentifier(source, 'raceModeDefinitionId');
  const survivalModeDefinitionId = requiredIdentifier(source, 'survivalModeDefinitionId');
  if (new Set([
    duelModeDefinitionId,
    raceModeDefinitionId,
    survivalModeDefinitionId,
  ]).size !== 3) {
    throw new RangeError('Arena three-mode reward registry的Mode身份必须唯一。');
  }

  return createModeProgressionRegistryV2({
    rewards: [
      {
        schemaVersion: MODE_MATCH_REWARD_DEFINITION_V2_SCHEMA_VERSION,
        id: 'arena-v2.reward.duel.candidate.v1',
        contentVersion: 1,
        modeDefinitionId: duelModeDefinitionId,
        completionExperience: 10,
        policy: {
          kind: MODE_MATCH_REWARD_POLICY_KIND.DUEL,
          winnerBonusExperience: 5,
          drawBonusExperience: 2,
        },
      },
      {
        schemaVersion: MODE_MATCH_REWARD_DEFINITION_V2_SCHEMA_VERSION,
        id: 'arena-v2.reward.race.candidate.v1',
        contentVersion: 1,
        modeDefinitionId: raceModeDefinitionId,
        completionExperience: 12,
        policy: {
          kind: MODE_MATCH_REWARD_POLICY_KIND.RACE,
          finishBonusExperience: 3,
          rankBonuses: [
            { rank: 1, experience: 6 },
            { rank: 2, experience: 3 },
            { rank: 3, experience: 1 },
          ],
        },
      },
      {
        schemaVersion: MODE_MATCH_REWARD_DEFINITION_V2_SCHEMA_VERSION,
        id: 'arena-v2.reward.survival.candidate.v1',
        contentVersion: 1,
        modeDefinitionId: survivalModeDefinitionId,
        completionExperience: 10,
        policy: {
          kind: MODE_MATCH_REWARD_POLICY_KIND.SURVIVAL,
          stageBonuses: [
            { minimumPressureStage: 1, experience: 2 },
            { minimumPressureStage: 3, experience: 6 },
            { minimumPressureStage: 5, experience: 12 },
            { minimumPressureStage: 8, experience: 20 },
          ],
        },
      },
    ],
    unlocks: [],
  });
}

export const ARENA_V2_THREE_MODE_REWARD_REGISTRY_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  unlockOwner: 'arena-v2-learning-profile-v1' as const,
  validationStatus: 'not-run' as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
});
