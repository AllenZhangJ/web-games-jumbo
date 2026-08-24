import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type DeepReadonly,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';

export const MODE_MATCH_REWARD_DEFINITION_V2_SCHEMA_VERSION = 2 as const;

export const MODE_MATCH_REWARD_POLICY_KIND = Object.freeze({
  DUEL: 'duel',
  RACE: 'race',
  SURVIVAL: 'survival',
} as const);

export interface DuelMatchRewardPolicyV2 {
  readonly kind: 'duel';
  readonly winnerBonusExperience: number;
  readonly drawBonusExperience: number;
}

export interface RaceMatchRewardRankBonusV2 {
  readonly rank: number;
  readonly experience: number;
}

export interface RaceMatchRewardPolicyV2 {
  readonly kind: 'race';
  readonly finishBonusExperience: number;
  readonly rankBonuses: readonly RaceMatchRewardRankBonusV2[];
}

export interface SurvivalMatchRewardStageBonusV2 {
  readonly minimumPressureStage: number;
  readonly experience: number;
}

export interface SurvivalMatchRewardPolicyV2 {
  readonly kind: 'survival';
  readonly stageBonuses: readonly SurvivalMatchRewardStageBonusV2[];
}

export type ModeMatchRewardPolicyV2 =
  | DuelMatchRewardPolicyV2
  | RaceMatchRewardPolicyV2
  | SurvivalMatchRewardPolicyV2;

export interface ModeMatchRewardDefinitionV2 {
  readonly schemaVersion: typeof MODE_MATCH_REWARD_DEFINITION_V2_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly modeDefinitionId: string;
  readonly completionExperience: number;
  readonly policy: ModeMatchRewardPolicyV2;
}

const DEFINITION_KEYS = new Set([
  'schemaVersion', 'id', 'contentVersion', 'modeDefinitionId',
  'completionExperience', 'policy',
]);
const DUEL_KEYS = new Set(['kind', 'winnerBonusExperience', 'drawBonusExperience']);
const RACE_KEYS = new Set(['kind', 'finishBonusExperience', 'rankBonuses']);
const RANK_BONUS_KEYS = new Set(['rank', 'experience']);
const SURVIVAL_KEYS = new Set(['kind', 'stageBonuses']);
const STAGE_BONUS_KEYS = new Set(['minimumPressureStage', 'experience']);

function requireKeys(value: PlainRecord, keys: ReadonlySet<string>, name: string): void {
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name} 缺少字段 ${key}。`);
  }
}

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is PlainRecord {
  assertKnownKeys(value, keys, name);
  requireKeys(value, keys, name);
}

function experience(value: unknown, name: string): number {
  return assertIntegerAtLeast(value, 0, name);
}

function assertSafeTotal(values: readonly number[], name: string): void {
  if (!Number.isSafeInteger(values.reduce((sum, value) => sum + value, 0))) {
    throw new RangeError(`${name} 经验总和超出安全整数范围。`);
  }
}

function createPolicy(value: unknown, completionExperience: number): ModeMatchRewardPolicyV2 {
  const source = value as PlainRecord;
  if (source.kind === MODE_MATCH_REWARD_POLICY_KIND.DUEL) {
    exactRecord(source, DUEL_KEYS, 'DuelMatchRewardPolicyV2');
    const winnerBonusExperience = experience(
      source.winnerBonusExperience,
      'DuelMatchRewardPolicyV2.winnerBonusExperience',
    );
    const drawBonusExperience = experience(
      source.drawBonusExperience,
      'DuelMatchRewardPolicyV2.drawBonusExperience',
    );
    assertSafeTotal(
      [completionExperience, winnerBonusExperience, drawBonusExperience],
      'DuelMatchRewardPolicyV2',
    );
    return Object.freeze({ kind: 'duel', winnerBonusExperience, drawBonusExperience });
  }
  if (source.kind === MODE_MATCH_REWARD_POLICY_KIND.RACE) {
    exactRecord(source, RACE_KEYS, 'RaceMatchRewardPolicyV2');
    const finishBonusExperience = experience(
      source.finishBonusExperience,
      'RaceMatchRewardPolicyV2.finishBonusExperience',
    );
    if (!Array.isArray(source.rankBonuses)) {
      throw new TypeError('RaceMatchRewardPolicyV2.rankBonuses 必须是数组。');
    }
    const rankBonuses = source.rankBonuses.map((candidate, index) => {
      const name = `RaceMatchRewardPolicyV2.rankBonuses[${index}]`;
      exactRecord(candidate, RANK_BONUS_KEYS, name);
      const rank = assertIntegerAtLeast(candidate.rank, 1, `${name}.rank`);
      if (rank > 4) throw new RangeError(`${name}.rank 只能是1-4。`);
      return Object.freeze({ rank, experience: experience(candidate.experience, `${name}.experience`) });
    });
    for (let index = 1; index < rankBonuses.length; index += 1) {
      if (rankBonuses[index - 1]!.rank >= rankBonuses[index]!.rank) {
        throw new RangeError('Race rankBonuses必须按rank唯一升序。');
      }
    }
    assertSafeTotal(
      [completionExperience, finishBonusExperience, ...rankBonuses.map((item) => item.experience)],
      'RaceMatchRewardPolicyV2',
    );
    return Object.freeze({
      kind: 'race',
      finishBonusExperience,
      rankBonuses: Object.freeze(rankBonuses),
    });
  }
  if (source.kind === MODE_MATCH_REWARD_POLICY_KIND.SURVIVAL) {
    exactRecord(source, SURVIVAL_KEYS, 'SurvivalMatchRewardPolicyV2');
    if (!Array.isArray(source.stageBonuses)) {
      throw new TypeError('SurvivalMatchRewardPolicyV2.stageBonuses 必须是数组。');
    }
    const stageBonuses = source.stageBonuses.map((candidate, index) => {
      const name = `SurvivalMatchRewardPolicyV2.stageBonuses[${index}]`;
      exactRecord(candidate, STAGE_BONUS_KEYS, name);
      return Object.freeze({
        minimumPressureStage: assertIntegerAtLeast(
          candidate.minimumPressureStage,
          0,
          `${name}.minimumPressureStage`,
        ),
        experience: experience(candidate.experience, `${name}.experience`),
      });
    });
    for (let index = 1; index < stageBonuses.length; index += 1) {
      if (stageBonuses[index - 1]!.minimumPressureStage
        >= stageBonuses[index]!.minimumPressureStage) {
        throw new RangeError('Survival stageBonuses必须按minimumPressureStage唯一升序。');
      }
    }
    assertSafeTotal(
      [completionExperience, ...stageBonuses.map((item) => item.experience)],
      'SurvivalMatchRewardPolicyV2',
    );
    return Object.freeze({ kind: 'survival', stageBonuses: Object.freeze(stageBonuses) });
  }
  throw new RangeError(`ModeMatchRewardPolicyV2.kind不受支持：${String(source.kind)}。`);
}

export function createModeMatchRewardDefinitionV2(
  value: unknown,
): DeepReadonly<ModeMatchRewardDefinitionV2> {
  const source = cloneFrozenData(value, 'ModeMatchRewardDefinitionV2');
  exactRecord(source, DEFINITION_KEYS, 'ModeMatchRewardDefinitionV2');
  if (source.schemaVersion !== MODE_MATCH_REWARD_DEFINITION_V2_SCHEMA_VERSION) {
    throw new RangeError('ModeMatchRewardDefinitionV2.schemaVersion必须是2。');
  }
  const completionExperience = experience(
    source.completionExperience,
    'ModeMatchRewardDefinitionV2.completionExperience',
  );
  return Object.freeze({
    schemaVersion: MODE_MATCH_REWARD_DEFINITION_V2_SCHEMA_VERSION,
    id: assertNonEmptyString(source.id, 'ModeMatchRewardDefinitionV2.id'),
    contentVersion: assertIntegerAtLeast(
      source.contentVersion,
      1,
      'ModeMatchRewardDefinitionV2.contentVersion',
    ),
    modeDefinitionId: assertNonEmptyString(
      source.modeDefinitionId,
      'ModeMatchRewardDefinitionV2.modeDefinitionId',
    ),
    completionExperience,
    policy: createPolicy(source.policy, completionExperience),
  });
}
