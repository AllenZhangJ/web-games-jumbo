export const BOT_DIFFICULTY_ID = Object.freeze({
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
});

export const BOT_DIFFICULTY_IDS = Object.freeze([
  BOT_DIFFICULTY_ID.EASY,
  BOT_DIFFICULTY_ID.NORMAL,
  BOT_DIFFICULTY_ID.HARD,
]);

const RAW_PROFILES = {
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
  },
  [BOT_DIFFICULTY_ID.HARD]: {
    // 100 ms observation delay at 60 Hz keeps the strongest bot inside a
    // plausible human reaction envelope instead of granting instant reads.
    observationDelayTicks: 6,
    replanIntervalTicks: 4,
    replanJitterTicks: 1,
    directionJitterRadians: 0.05,
    actionCommitChance: 0.96,
    shortPauseChance: 0.01,
    maximumPauseTicks: 3,
    maximumInputMagnitude: 0.98,
    edgeSafetyMargin: 1.65,
    targetPredictionTicks: 1,
    threatAwareness: 0.7,
    attackRangeScale: 0.82,
  },
};

function validateProfile(id, profile) {
  for (const field of [
    'observationDelayTicks',
    'replanIntervalTicks',
    'replanJitterTicks',
    'maximumPauseTicks',
    'targetPredictionTicks',
  ]) {
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
  for (const field of [
    'actionCommitChance',
    'shortPauseChance',
    'maximumInputMagnitude',
    'threatAwareness',
    'attackRangeScale',
  ]) {
    if (!Number.isFinite(profile[field]) || profile[field] < 0 || profile[field] > 1) {
      throw new RangeError(`Bot ${id}.${field} 必须位于 [0, 1]。`);
    }
  }
  for (const field of ['directionJitterRadians', 'edgeSafetyMargin']) {
    if (!Number.isFinite(profile[field]) || profile[field] <= 0) {
      throw new RangeError(`Bot ${id}.${field} 必须大于 0。`);
    }
  }
  return Object.freeze({ id, ...profile });
}

export const BOT_DIFFICULTY_PROFILES = Object.freeze(Object.fromEntries(
  Object.entries(RAW_PROFILES).map(([id, profile]) => [id, validateProfile(id, profile)]),
));

export function getBotDifficultyProfile(id) {
  const profile = BOT_DIFFICULTY_PROFILES[id];
  if (!profile) throw new RangeError(`未知机器人难度 ${id}。`);
  return profile;
}
