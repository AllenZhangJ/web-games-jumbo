import {
  createPlayerProfile,
  createPlayerProfileDefinition,
  type PlayerProfile,
} from '@number-strategy-jump/arena-profile-contracts';
import type {
  ArenaV2LearningInformationFieldPatchV1,
} from './arena-v2-learning-information-projection-v1.js';
import { readExactOptions } from './options.js';

export type ArenaV2RewardProfileInformationScreenIdCandidateV1 =
  | 'home'
  | 'character-select';

export interface ArenaV2RewardProfileInformationScreenPatchCandidateV1 {
  readonly screenId: ArenaV2RewardProfileInformationScreenIdCandidateV1;
  readonly fieldValues: readonly ArenaV2LearningInformationFieldPatchV1[];
}

export interface ArenaV2RewardProfileInformationProjectionCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly profileId: string;
  readonly profileRevision: number;
  readonly experience: number;
  readonly committedRewardCount: number;
  readonly selectedCharacterId: string;
  readonly screens: readonly ArenaV2RewardProfileInformationScreenPatchCandidateV1[];
}

const OPTION_KEYS = new Set(['profileDefinition', 'profile']);

function field(
  fieldId: string,
  valueText: string,
  accessibilityText = valueText,
  fixedWidthNumeric = false,
): ArenaV2LearningInformationFieldPatchV1 {
  if (valueText.length === 0 || accessibilityText.length === 0) {
    throw new RangeError(`Reward Profile information field ${fieldId}不能为空。`);
  }
  return Object.freeze({
    fieldId,
    labelMessageId: `arena.v2.field.${fieldId}`,
    valueText,
    accessibilityText,
    fixedWidthNumeric,
  });
}

function screen(
  screenId: ArenaV2RewardProfileInformationScreenIdCandidateV1,
  fieldValues: readonly ArenaV2LearningInformationFieldPatchV1[],
): ArenaV2RewardProfileInformationScreenPatchCandidateV1 {
  return Object.freeze({
    screenId,
    fieldValues: Object.freeze([...fieldValues]),
  });
}

function currentCharacterRecord(profile: PlayerProfile): string {
  return profile.unlocks.characterIds.includes(profile.selection.characterId)
    ? `当前角色已解锁；档案经验${profile.progression.experience}`
    : '当前角色档案不可用';
}

/**
 * Produces the small set of P6 fields owned by the generic reward Profile.
 * Character-specific mastery remains intentionally absent because the generic
 * Profile only records selection, unlocks and account-wide experience.
 */
export function projectArenaV2RewardProfileInformationCandidateV1(
  value: unknown,
): ArenaV2RewardProfileInformationProjectionCandidateV1 {
  const options = readExactOptions(
    value,
    OPTION_KEYS,
    'Arena V2 Reward Profile information candidate options',
  );
  const definition = createPlayerProfileDefinition(options.profileDefinition);
  const profile = createPlayerProfile(definition, options.profile);
  const committedRewardCount = profile.progression.committedGrantIds.length;
  const experience = profile.progression.experience;
  const selectedCharacterId = profile.selection.characterId;

  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    profileId: profile.profileId,
    profileRevision: profile.revision,
    experience,
    committedRewardCount,
    selectedCharacterId,
    screens: Object.freeze([
      screen('home', [
        field(
          'recent-records',
          `累计结算${committedRewardCount}次；经验${experience}`,
          `档案累计完成${committedRewardCount}次奖励结算，当前经验${experience}。`,
          true,
        ),
      ]),
      screen('character-select', [
        field(
          'selected-character',
          selectedCharacterId,
          `当前选择角色${selectedCharacterId}。`,
        ),
        field(
          'character-record',
          currentCharacterRecord(profile),
          `当前角色已解锁，档案经验${experience}；这是账号档案记录，不是角色属性加成。`,
          true,
        ),
      ]),
    ]),
  });
}

export const ARENA_V2_REWARD_PROFILE_INFORMATION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  ownedFieldIds: Object.freeze([
    'recent-records',
    'selected-character',
    'character-record',
  ]),
  validationStatus: 'not-run' as const,
  defaultSurfaceWired: false as const,
});
