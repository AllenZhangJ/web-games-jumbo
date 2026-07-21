export const BOT_DIFFICULTY_ID = Object.freeze({
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
} as const);

export type BotDifficultyId = typeof BOT_DIFFICULTY_ID[keyof typeof BOT_DIFFICULTY_ID];

export const BOT_DIFFICULTY_IDS: readonly BotDifficultyId[] = Object.freeze([
  BOT_DIFFICULTY_ID.EASY,
  BOT_DIFFICULTY_ID.NORMAL,
  BOT_DIFFICULTY_ID.HARD,
]);

export interface BotDifficultyProfile {
  readonly id: BotDifficultyId;
  readonly observationDelayTicks: number;
  readonly replanIntervalTicks: number;
  readonly replanJitterTicks: number;
  readonly directionJitterRadians: number;
  readonly actionCommitChance: number;
  readonly shortPauseChance: number;
  readonly maximumPauseTicks: number;
  readonly maximumInputMagnitude: number;
  readonly edgeSafetyMargin: number;
  readonly targetPredictionTicks: number;
  readonly threatAwareness: number;
  readonly attackRangeScale: number;
  readonly minimumMobilityIntervalTicks: number;
  readonly crouchHoldTicks: number;
}

type RawBotDifficultyProfile = Omit<BotDifficultyProfile, 'id'>;

const RAW_PROFILES: Readonly<Record<BotDifficultyId, RawBotDifficultyProfile>> = {
  [BOT_DIFFICULTY_ID.EASY]: {
    observationDelayTicks: 12,
    replanIntervalTicks: 10,
    replanJitterTicks: 2,
    directionJitterRadians: 0.16,
    actionCommitChance: 0.72,
    shortPauseChance: 0.05,
    maximumPauseTicks: 5,
    maximumInputMagnitude: 0.88,
    edgeSafetyMargin: 1.2,
    targetPredictionTicks: 0,
    threatAwareness: 0.15,
    attackRangeScale: 0.95,
    minimumMobilityIntervalTicks: 24,
    crouchHoldTicks: 8,
  },
  [BOT_DIFFICULTY_ID.NORMAL]: {
    observationDelayTicks: 8,
    replanIntervalTicks: 7,
    replanJitterTicks: 1,
    directionJitterRadians: 0.09,
    actionCommitChance: 0.86,
    shortPauseChance: 0.03,
    maximumPauseTicks: 4,
    maximumInputMagnitude: 0.95,
    edgeSafetyMargin: 1.4,
    targetPredictionTicks: 1,
    threatAwareness: 0.6,
    attackRangeScale: 0.88,
    minimumMobilityIntervalTicks: 18,
    crouchHoldTicks: 10,
  },
  [BOT_DIFFICULTY_ID.HARD]: {
    // 60 Hz 下保留 100 ms 观察延迟，避免最强 Bot 获得非人的即时读取。
    observationDelayTicks: 6,
    replanIntervalTicks: 4,
    replanJitterTicks: 1,
    directionJitterRadians: 0.05,
    actionCommitChance: 0.96,
    shortPauseChance: 0.01,
    maximumPauseTicks: 3,
    maximumInputMagnitude: 0.98,
    edgeSafetyMargin: 1.5,
    targetPredictionTicks: 1,
    threatAwareness: 0.55,
    attackRangeScale: 0.9,
    minimumMobilityIntervalTicks: 14,
    crouchHoldTicks: 12,
  },
};

const INTEGER_FIELDS = Object.freeze([
  'observationDelayTicks',
  'replanIntervalTicks',
  'replanJitterTicks',
  'maximumPauseTicks',
  'targetPredictionTicks',
  'minimumMobilityIntervalTicks',
  'crouchHoldTicks',
] as const satisfies readonly (keyof RawBotDifficultyProfile)[]);

const UNIT_INTERVAL_FIELDS = Object.freeze([
  'actionCommitChance',
  'shortPauseChance',
  'maximumInputMagnitude',
  'threatAwareness',
  'attackRangeScale',
] as const satisfies readonly (keyof RawBotDifficultyProfile)[]);

const POSITIVE_FIELDS = Object.freeze([
  'directionJitterRadians',
  'edgeSafetyMargin',
] as const satisfies readonly (keyof RawBotDifficultyProfile)[]);

function validateProfile(
  id: BotDifficultyId,
  profile: RawBotDifficultyProfile,
): BotDifficultyProfile {
  for (const field of INTEGER_FIELDS) {
    if (!Number.isSafeInteger(profile[field]) || profile[field] < 0) {
      throw new RangeError(`Bot ${id}.${field} 必须是非负安全整数。`);
    }
  }
  if (profile.observationDelayTicks < 1 || profile.replanIntervalTicks < 1) {
    throw new RangeError(`Bot ${id} 必须保留观察延迟和规划间隔。`);
  }
  if (profile.maximumPauseTicks < 2) {
    throw new RangeError(`Bot ${id}.maximumPauseTicks 必须至少为 2。`);
  }
  if (profile.minimumMobilityIntervalTicks < 4 || profile.crouchHoldTicks < 2) {
    throw new RangeError(`Bot ${id} mobility tick 配置低于真人输入边界。`);
  }
  for (const field of UNIT_INTERVAL_FIELDS) {
    if (!Number.isFinite(profile[field]) || profile[field] < 0 || profile[field] > 1) {
      throw new RangeError(`Bot ${id}.${field} 必须位于 [0, 1]。`);
    }
  }
  for (const field of POSITIVE_FIELDS) {
    if (!Number.isFinite(profile[field]) || profile[field] <= 0) {
      throw new RangeError(`Bot ${id}.${field} 必须大于 0。`);
    }
  }
  return Object.freeze({ id, ...profile });
}

export const BOT_DIFFICULTY_PROFILES: Readonly<Record<BotDifficultyId, BotDifficultyProfile>>
  = Object.freeze({
    [BOT_DIFFICULTY_ID.EASY]: validateProfile(
      BOT_DIFFICULTY_ID.EASY,
      RAW_PROFILES[BOT_DIFFICULTY_ID.EASY],
    ),
    [BOT_DIFFICULTY_ID.NORMAL]: validateProfile(
      BOT_DIFFICULTY_ID.NORMAL,
      RAW_PROFILES[BOT_DIFFICULTY_ID.NORMAL],
    ),
    [BOT_DIFFICULTY_ID.HARD]: validateProfile(
      BOT_DIFFICULTY_ID.HARD,
      RAW_PROFILES[BOT_DIFFICULTY_ID.HARD],
    ),
  });

export function getBotDifficultyProfile(id: unknown): BotDifficultyProfile {
  if (typeof id !== 'string' || !(id in BOT_DIFFICULTY_PROFILES)) {
    throw new RangeError(`未知机器人难度 ${String(id)}。`);
  }
  return BOT_DIFFICULTY_PROFILES[id as BotDifficultyId];
}
