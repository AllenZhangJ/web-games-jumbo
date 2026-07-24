import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { BOT_DIFFICULTY_IDS, type BotDifficultyId } from '@number-strategy-jump/arena-bot';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const HUMAN_MATCH_STUDY_DEFINITION_SCHEMA_VERSION = 1;

export const HUMAN_MATCH_STUDY_PLATFORM = Object.freeze({
  WEB: 'web',
  WECHAT: 'wechat',
  DOUYIN: 'douyin',
});

export const HUMAN_MATCH_STUDY_FORM_FACTOR = Object.freeze({
  PHONE: 'phone',
  TABLET: 'tablet',
});

export const HUMAN_MATCH_STUDY_ORIENTATION = Object.freeze({
  PORTRAIT: 'portrait',
  LANDSCAPE: 'landscape',
});

export const HUMAN_MATCH_STUDY_INPUT_MODE = Object.freeze({
  TOUCH: 'touch',
  MOUSE: 'mouse',
});

const DEFINITION_KEYS = new Set([
  'schemaVersion',
  'id',
  'stage',
  'contentVersion',
  'participantPrompt',
  'assignmentSeed',
  'matchesPerParticipant',
  'candidate',
  'arms',
  'environment',
  'thresholds',
]);
const CANDIDATE_KEYS = new Set([
  'balanceDefinitionId',
  'balanceDefinitionHash',
  'botDifficultyProfilesHash',
  'replaySchemaVersion',
]);
const ARM_KEYS = new Set([
  'id',
  'difficultyId',
  'botStrengthRank',
  'minimumSessionWinRate',
  'maximumSessionWinRate',
]);
const ENVIRONMENT_KEYS = new Set([
  'platform',
  'formFactor',
  'orientation',
  'inputMode',
]);
const THRESHOLD_KEYS = new Set([
  'minimumEligibleParticipantsPerArm',
  'minimumCompletionRate',
  'maximumInvalidationRate',
  'minimumAggregateSessionWinRate',
  'maximumAggregateSessionWinRate',
  'maximumAggregateWilsonIntervalWidth',
  'minimumExtremeSessionWinRateDelta',
  'maximumAdjacentSessionWinRateInversion',
  'targetMinimumTicks',
  'targetMaximumTicks',
  'minimumTargetDurationShare',
  'maximumBotGuessRate',
  'minimumFairnessRatingAverage',
  'minimumNaturalnessRatingAverage',
  'minimumRematchRate',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/;
const MAXIMUM_ARMS = 8;
const MAXIMUM_MATCHES_PER_PARTICIPANT = 9;

type HumanMatchStudyPlatform = typeof HUMAN_MATCH_STUDY_PLATFORM[
  keyof typeof HUMAN_MATCH_STUDY_PLATFORM
];
type HumanMatchStudyFormFactor = typeof HUMAN_MATCH_STUDY_FORM_FACTOR[
  keyof typeof HUMAN_MATCH_STUDY_FORM_FACTOR
];
type HumanMatchStudyOrientation = typeof HUMAN_MATCH_STUDY_ORIENTATION[
  keyof typeof HUMAN_MATCH_STUDY_ORIENTATION
];
type HumanMatchStudyInputMode = typeof HUMAN_MATCH_STUDY_INPUT_MODE[
  keyof typeof HUMAN_MATCH_STUDY_INPUT_MODE
];

export interface HumanMatchStudyCandidate {
  readonly balanceDefinitionId: string;
  readonly balanceDefinitionHash: string;
  readonly botDifficultyProfilesHash: string;
  readonly replaySchemaVersion: number;
}

export interface HumanMatchStudyArm {
  readonly id: string;
  readonly difficultyId: BotDifficultyId;
  readonly botStrengthRank: number;
  readonly minimumSessionWinRate: number;
  readonly maximumSessionWinRate: number;
}

export interface HumanMatchStudyEnvironment {
  readonly platform: HumanMatchStudyPlatform;
  readonly formFactor: HumanMatchStudyFormFactor;
  readonly orientation: HumanMatchStudyOrientation;
  readonly inputMode: HumanMatchStudyInputMode;
}

export interface HumanMatchStudyThresholds {
  readonly minimumEligibleParticipantsPerArm: number;
  readonly minimumCompletionRate: number;
  readonly maximumInvalidationRate: number;
  readonly minimumAggregateSessionWinRate: number;
  readonly maximumAggregateSessionWinRate: number;
  readonly maximumAggregateWilsonIntervalWidth: number;
  readonly minimumExtremeSessionWinRateDelta: number;
  readonly maximumAdjacentSessionWinRateInversion: number;
  readonly targetMinimumTicks: number;
  readonly targetMaximumTicks: number;
  readonly minimumTargetDurationShare: number;
  readonly maximumBotGuessRate: number;
  readonly minimumFairnessRatingAverage: number;
  readonly minimumNaturalnessRatingAverage: number;
  readonly minimumRematchRate: number;
}

export interface HumanMatchStudyDefinitionData {
  readonly schemaVersion: number;
  readonly id: string;
  readonly stage: string;
  readonly contentVersion: number;
  readonly participantPrompt: string;
  readonly assignmentSeed: number;
  readonly matchesPerParticipant: number;
  readonly candidate: HumanMatchStudyCandidate;
  readonly arms: readonly HumanMatchStudyArm[];
  readonly environment: HumanMatchStudyEnvironment;
  readonly thresholds: HumanMatchStudyThresholds;
}

function boundedString(value: unknown, maximumLength: number, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (result.length > maximumLength) {
    throw new RangeError(`${name} 不能超过 ${maximumLength} 字符。`);
  }
  return result;
}

function enumValue<T extends string>(
  value: unknown,
  values: Readonly<Record<string, T>> | readonly T[],
  name: string,
): T {
  const knownValues: readonly T[] = Array.isArray(values)
    ? values as readonly T[]
    : Object.values(values) as T[];
  if (typeof value !== 'string' || !knownValues.includes(value as T)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value as T;
}

function rate(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} 必须位于 [0, 1]。`);
  }
  return value as number;
}

function hashValue(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是 8 位小写十六进制 hash。`);
  }
  return value;
}

function uint32(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value as number;
}

function rating(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 5) {
    throw new RangeError(`${name} 必须位于 [1, 5]。`);
  }
  return value as number;
}

function cloneCandidate(value: unknown): HumanMatchStudyCandidate {
  assertKnownKeys(value, CANDIDATE_KEYS, 'HumanMatchStudyDefinition.candidate');
  return Object.freeze({
    balanceDefinitionId: boundedString(
      value.balanceDefinitionId,
      128,
      'HumanMatchStudyDefinition.candidate.balanceDefinitionId',
    ),
    balanceDefinitionHash: hashValue(
      value.balanceDefinitionHash,
      'HumanMatchStudyDefinition.candidate.balanceDefinitionHash',
    ),
    botDifficultyProfilesHash: hashValue(
      value.botDifficultyProfilesHash,
      'HumanMatchStudyDefinition.candidate.botDifficultyProfilesHash',
    ),
    replaySchemaVersion: assertIntegerAtLeast(
      value.replaySchemaVersion,
      1,
      'HumanMatchStudyDefinition.candidate.replaySchemaVersion',
    ),
  });
}

function cloneArms(values: unknown): readonly HumanMatchStudyArm[] {
  if (!Array.isArray(values) || values.length < 2 || values.length > MAXIMUM_ARMS) {
    throw new RangeError(`HumanMatchStudyDefinition.arms 必须包含 2～${MAXIMUM_ARMS} 项。`);
  }
  const ids = new Set<string>();
  const difficultyIds = new Set<BotDifficultyId>();
  const ranks = new Set<number>();
  const arms = values.map((value, index) => {
    const name = `HumanMatchStudyDefinition.arms[${index}]`;
    assertKnownKeys(value, ARM_KEYS, name);
    const id = boundedString(value.id, 128, `${name}.id`);
    if (ids.has(id)) throw new RangeError(`重复 Human Match Study arm ${id}。`);
    ids.add(id);
    const difficultyId = enumValue(value.difficultyId, BOT_DIFFICULTY_IDS, `${name}.difficultyId`);
    if (difficultyIds.has(difficultyId)) {
      throw new RangeError(`Human Match Study 重复使用 difficulty ${difficultyId}。`);
    }
    difficultyIds.add(difficultyId);
    const botStrengthRank = assertIntegerAtLeast(
      value.botStrengthRank,
      1,
      `${name}.botStrengthRank`,
    );
    if (ranks.has(botStrengthRank)) {
      throw new RangeError(`Human Match Study 重复 botStrengthRank ${botStrengthRank}。`);
    }
    ranks.add(botStrengthRank);
    const minimumSessionWinRate = rate(
      value.minimumSessionWinRate,
      `${name}.minimumSessionWinRate`,
    );
    const maximumSessionWinRate = rate(
      value.maximumSessionWinRate,
      `${name}.maximumSessionWinRate`,
    );
    if (minimumSessionWinRate > maximumSessionWinRate) {
      throw new RangeError(`${name} 的胜率下限不能大于上限。`);
    }
    return Object.freeze({
      id,
      difficultyId,
      botStrengthRank,
      minimumSessionWinRate,
      maximumSessionWinRate,
    });
  });
  const sortedRanks = [...ranks].sort((left, right) => left - right);
  sortedRanks.forEach((rank, index) => {
    if (rank !== index + 1) {
      throw new RangeError('Human Match Study botStrengthRank 必须从 1 严格连续。');
    }
  });
  return Object.freeze(arms);
}

function cloneEnvironment(value: unknown): HumanMatchStudyEnvironment {
  assertKnownKeys(value, ENVIRONMENT_KEYS, 'HumanMatchStudyDefinition.environment');
  return Object.freeze({
    platform: enumValue(
      value.platform,
      HUMAN_MATCH_STUDY_PLATFORM,
      'HumanMatchStudyDefinition.environment.platform',
    ),
    formFactor: enumValue(
      value.formFactor,
      HUMAN_MATCH_STUDY_FORM_FACTOR,
      'HumanMatchStudyDefinition.environment.formFactor',
    ),
    orientation: enumValue(
      value.orientation,
      HUMAN_MATCH_STUDY_ORIENTATION,
      'HumanMatchStudyDefinition.environment.orientation',
    ),
    inputMode: enumValue(
      value.inputMode,
      HUMAN_MATCH_STUDY_INPUT_MODE,
      'HumanMatchStudyDefinition.environment.inputMode',
    ),
  });
}

function cloneThresholds(value: unknown): HumanMatchStudyThresholds {
  assertKnownKeys(value, THRESHOLD_KEYS, 'HumanMatchStudyDefinition.thresholds');
  const result = {
    minimumEligibleParticipantsPerArm: assertIntegerAtLeast(
      value.minimumEligibleParticipantsPerArm,
      1,
      'HumanMatchStudyDefinition.thresholds.minimumEligibleParticipantsPerArm',
    ),
    minimumCompletionRate: rate(
      value.minimumCompletionRate,
      'HumanMatchStudyDefinition.thresholds.minimumCompletionRate',
    ),
    maximumInvalidationRate: rate(
      value.maximumInvalidationRate,
      'HumanMatchStudyDefinition.thresholds.maximumInvalidationRate',
    ),
    minimumAggregateSessionWinRate: rate(
      value.minimumAggregateSessionWinRate,
      'HumanMatchStudyDefinition.thresholds.minimumAggregateSessionWinRate',
    ),
    maximumAggregateSessionWinRate: rate(
      value.maximumAggregateSessionWinRate,
      'HumanMatchStudyDefinition.thresholds.maximumAggregateSessionWinRate',
    ),
    maximumAggregateWilsonIntervalWidth: rate(
      value.maximumAggregateWilsonIntervalWidth,
      'HumanMatchStudyDefinition.thresholds.maximumAggregateWilsonIntervalWidth',
    ),
    minimumExtremeSessionWinRateDelta: rate(
      value.minimumExtremeSessionWinRateDelta,
      'HumanMatchStudyDefinition.thresholds.minimumExtremeSessionWinRateDelta',
    ),
    maximumAdjacentSessionWinRateInversion: rate(
      value.maximumAdjacentSessionWinRateInversion,
      'HumanMatchStudyDefinition.thresholds.maximumAdjacentSessionWinRateInversion',
    ),
    targetMinimumTicks: assertIntegerAtLeast(
      value.targetMinimumTicks,
      1,
      'HumanMatchStudyDefinition.thresholds.targetMinimumTicks',
    ),
    targetMaximumTicks: assertIntegerAtLeast(
      value.targetMaximumTicks,
      1,
      'HumanMatchStudyDefinition.thresholds.targetMaximumTicks',
    ),
    minimumTargetDurationShare: rate(
      value.minimumTargetDurationShare,
      'HumanMatchStudyDefinition.thresholds.minimumTargetDurationShare',
    ),
    maximumBotGuessRate: rate(
      value.maximumBotGuessRate,
      'HumanMatchStudyDefinition.thresholds.maximumBotGuessRate',
    ),
    minimumFairnessRatingAverage: rating(
      value.minimumFairnessRatingAverage,
      'HumanMatchStudyDefinition.thresholds.minimumFairnessRatingAverage',
    ),
    minimumNaturalnessRatingAverage: rating(
      value.minimumNaturalnessRatingAverage,
      'HumanMatchStudyDefinition.thresholds.minimumNaturalnessRatingAverage',
    ),
    minimumRematchRate: rate(
      value.minimumRematchRate,
      'HumanMatchStudyDefinition.thresholds.minimumRematchRate',
    ),
  };
  if (result.minimumAggregateSessionWinRate > result.maximumAggregateSessionWinRate) {
    throw new RangeError('Human Match Study 总体胜率下限不能大于上限。');
  }
  if (result.targetMinimumTicks > result.targetMaximumTicks) {
    throw new RangeError('Human Match Study 目标时长下限不能大于上限。');
  }
  if (result.minimumExtremeSessionWinRateDelta === 0) {
    throw new RangeError('Human Match Study 极端难度胜率差必须大于 0。');
  }
  return Object.freeze(result);
}

export class HumanMatchStudyDefinition {
  readonly schemaVersion!: number;
  readonly id!: string;
  readonly stage!: string;
  readonly contentVersion!: number;
  readonly participantPrompt!: string;
  readonly assignmentSeed!: number;
  readonly matchesPerParticipant!: number;
  readonly candidate!: HumanMatchStudyCandidate;
  readonly arms!: readonly HumanMatchStudyArm[];
  readonly environment!: HumanMatchStudyEnvironment;
  readonly thresholds!: HumanMatchStudyThresholds;

  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'HumanMatchStudyDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'HumanMatchStudyDefinition');
    if (source.schemaVersion !== HUMAN_MATCH_STUDY_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 HumanMatchStudyDefinition schema ${String(source.schemaVersion)}。`,
      );
    }
    const matchesPerParticipant = assertIntegerAtLeast(
      source.matchesPerParticipant,
      1,
      'HumanMatchStudyDefinition.matchesPerParticipant',
    );
    if (matchesPerParticipant > MAXIMUM_MATCHES_PER_PARTICIPANT) {
      throw new RangeError(
        `HumanMatchStudyDefinition.matchesPerParticipant 不能超过 `
        + `${MAXIMUM_MATCHES_PER_PARTICIPANT}。`,
      );
    }
    Object.defineProperties(this, {
      schemaVersion: {
        value: HUMAN_MATCH_STUDY_DEFINITION_SCHEMA_VERSION,
        enumerable: true,
      },
      id: {
        value: boundedString(source.id, 128, 'HumanMatchStudyDefinition.id'),
        enumerable: true,
      },
      stage: {
        value: boundedString(source.stage, 128, 'HumanMatchStudyDefinition.stage'),
        enumerable: true,
      },
      contentVersion: {
        value: assertIntegerAtLeast(
          source.contentVersion,
          1,
          'HumanMatchStudyDefinition.contentVersion',
        ),
        enumerable: true,
      },
      participantPrompt: {
        value: boundedString(
          source.participantPrompt,
          500,
          'HumanMatchStudyDefinition.participantPrompt',
        ),
        enumerable: true,
      },
      assignmentSeed: {
        value: uint32(source.assignmentSeed, 'HumanMatchStudyDefinition.assignmentSeed'),
        enumerable: true,
      },
      matchesPerParticipant: { value: matchesPerParticipant, enumerable: true },
      candidate: { value: cloneCandidate(source.candidate), enumerable: true },
      arms: { value: cloneArms(source.arms), enumerable: true },
      environment: { value: cloneEnvironment(source.environment), enumerable: true },
      thresholds: { value: cloneThresholds(source.thresholds), enumerable: true },
    });
    Object.freeze(this);
  }

  getArm(id: string): HumanMatchStudyArm | null {
    return this.arms.find((arm) => arm.id === id) ?? null;
  }

  toJSON(): HumanMatchStudyDefinitionData {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      stage: this.stage,
      contentVersion: this.contentVersion,
      participantPrompt: this.participantPrompt,
      assignmentSeed: this.assignmentSeed,
      matchesPerParticipant: this.matchesPerParticipant,
      candidate: this.candidate,
      arms: this.arms,
      environment: this.environment,
      thresholds: this.thresholds,
    };
  }

  getContentHash(): string {
    return createDeterministicDataHash(this.toJSON(), `HumanMatchStudyDefinition ${this.id}`);
  }
}

export function createHumanMatchStudyDefinition(value: unknown): HumanMatchStudyDefinition {
  return value instanceof HumanMatchStudyDefinition
    ? value
    : new HumanMatchStudyDefinition(value);
}
