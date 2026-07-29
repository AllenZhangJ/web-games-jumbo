import {
  BOT_PROFILE_DEFINITION_SCHEMA_VERSION,
  createBotProfileDefinition,
  type BotProfileDefinition,
} from './bot-profile-definition.js';
import { BotProfileRegistry } from './bot-profile-registry.js';

export const BOT_DIFFICULTY_ID = Object.freeze({
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
} as const);

export type BotDifficultyId = typeof BOT_DIFFICULTY_ID[keyof typeof BOT_DIFFICULTY_ID];
// Keep the legacy default-profile type narrow for existing callers. Controller/Goal
// contexts use BotProfileDefinition when they accept an extensible Registry profile.
export type BotDifficultyProfile = Omit<BotProfileDefinition, 'schemaVersion' | 'id'> & {
  readonly id: BotDifficultyId;
};

export const BOT_DIFFICULTY_IDS: readonly BotDifficultyId[] = Object.freeze([
  BOT_DIFFICULTY_ID.EASY,
  BOT_DIFFICULTY_ID.NORMAL,
  BOT_DIFFICULTY_ID.HARD,
]);

const DEFAULT_PROFILE_DEFINITIONS = Object.freeze([
  createBotProfileDefinition({
    schemaVersion: BOT_PROFILE_DEFINITION_SCHEMA_VERSION,
    id: BOT_DIFFICULTY_ID.EASY,
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
  }),
  createBotProfileDefinition({
    schemaVersion: BOT_PROFILE_DEFINITION_SCHEMA_VERSION,
    id: BOT_DIFFICULTY_ID.NORMAL,
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
  }),
  createBotProfileDefinition({
    schemaVersion: BOT_PROFILE_DEFINITION_SCHEMA_VERSION,
    id: BOT_DIFFICULTY_ID.HARD,
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
  }),
] as const);

export const BOT_PROFILE_REGISTRY = new BotProfileRegistry(DEFAULT_PROFILE_DEFINITIONS);
export const BOT_DIFFICULTY_REGISTRY = BOT_PROFILE_REGISTRY;

function projectLegacyDifficultyProfile(id: BotDifficultyId): BotDifficultyProfile {
  const profile = BOT_PROFILE_REGISTRY.require(id);
  return Object.freeze({
    id,
    observationDelayTicks: profile.observationDelayTicks,
    replanIntervalTicks: profile.replanIntervalTicks,
    replanJitterTicks: profile.replanJitterTicks,
    directionJitterRadians: profile.directionJitterRadians,
    actionCommitChance: profile.actionCommitChance,
    shortPauseChance: profile.shortPauseChance,
    maximumPauseTicks: profile.maximumPauseTicks,
    maximumInputMagnitude: profile.maximumInputMagnitude,
    edgeSafetyMargin: profile.edgeSafetyMargin,
    targetPredictionTicks: profile.targetPredictionTicks,
    threatAwareness: profile.threatAwareness,
    attackRangeScale: profile.attackRangeScale,
    minimumMobilityIntervalTicks: profile.minimumMobilityIntervalTicks,
    crouchHoldTicks: profile.crouchHoldTicks,
  });
}

// Keep this legacy projection's keys and values stable for existing study hashes.
export const BOT_DIFFICULTY_PROFILES: Readonly<Record<BotDifficultyId, BotDifficultyProfile>>
  = Object.freeze({
    [BOT_DIFFICULTY_ID.EASY]: projectLegacyDifficultyProfile(BOT_DIFFICULTY_ID.EASY),
    [BOT_DIFFICULTY_ID.NORMAL]: projectLegacyDifficultyProfile(BOT_DIFFICULTY_ID.NORMAL),
    [BOT_DIFFICULTY_ID.HARD]: projectLegacyDifficultyProfile(BOT_DIFFICULTY_ID.HARD),
  });

export function getBotDifficultyProfile(
  id: BotDifficultyId,
): BotDifficultyProfile;
export function getBotDifficultyProfile(
  id: unknown,
): BotDifficultyProfile;
export function getBotDifficultyProfile(
  id: unknown,
): BotDifficultyProfile {
  if (typeof id !== 'string' || !BOT_DIFFICULTY_IDS.includes(id as BotDifficultyId)) {
    throw new RangeError(`未知机器人难度 ${String(id)}。`);
  }
  return BOT_DIFFICULTY_PROFILES[id as BotDifficultyId];
}
