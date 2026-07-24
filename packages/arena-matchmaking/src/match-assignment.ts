import {
  BOT_DIFFICULTY_IDS,
  getBotDifficultyProfile,
} from '@number-strategy-jump/arena-bot';
import type { BotDifficultyId } from '@number-strategy-jump/arena-bot';
import { createRng, deriveSeed } from '@number-strategy-jump/arena-contracts';
import {
  copyOpponentProfile,
  OPPONENT_PROFILES,
} from './opponent-profiles.js';
import type { OpponentProfile } from './opponent-profiles.js';

export interface CreateMatchAssignmentOptions {
  readonly matchSeed: number;
  readonly difficultyOverride?: BotDifficultyId | null;
}

export interface MatchAssignmentSeeds {
  readonly botBehavior: number;
  readonly botPersonality: number;
  readonly map: number;
  readonly equipment: number;
}

export interface MatchAssignment {
  readonly matchSeed: number;
  readonly opponent: OpponentProfile;
  readonly selectedDifficultyId: BotDifficultyId;
  readonly effectiveDifficultyId: BotDifficultyId;
  readonly seeds: MatchAssignmentSeeds;
}

export interface MatchAssignmentDiagnostics {
  readonly matchSeed: number;
  readonly opponentId: string;
  readonly selectedDifficultyId: BotDifficultyId;
  readonly effectiveDifficultyId: BotDifficultyId;
  readonly seeds: MatchAssignmentSeeds;
}

const OPTION_KEYS = Object.freeze(['matchSeed', 'difficultyOverride'] as const);
const ASSIGNMENTS = new WeakSet<object>();

function readOptions(options: unknown): {
  readonly matchSeed: unknown;
  readonly difficultyOverride: unknown;
} {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new TypeError('createMatchAssignment options 必须是普通对象。');
  }
  const prototype = Object.getPrototypeOf(options);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('createMatchAssignment options 必须是普通对象。');
  }
  const descriptors = Object.getOwnPropertyDescriptors(options);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== 'string' || !OPTION_KEYS.includes(key as typeof OPTION_KEYS[number])) {
      throw new TypeError(`createMatchAssignment options 含未知字段 ${String(key)}。`);
    }
    const descriptor = descriptors[key];
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      throw new TypeError(`createMatchAssignment options.${key} 必须是可枚举数据字段。`);
    }
  }
  const seedDescriptor = descriptors.matchSeed;
  if (!seedDescriptor || !('value' in seedDescriptor) || !seedDescriptor.enumerable) {
    throw new TypeError('createMatchAssignment options.matchSeed 必须是可枚举数据字段。');
  }
  const difficultyDescriptor = descriptors.difficultyOverride;
  return Object.freeze({
    matchSeed: seedDescriptor.value,
    difficultyOverride: difficultyDescriptor && 'value' in difficultyDescriptor
      ? difficultyDescriptor.value
      : null,
  });
}

function normalizeMatchSeed(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffffffff) {
    throw new RangeError('quick match seed 必须是 uint32。');
  }
  return value as number;
}

function freezeAssignment(value: MatchAssignment): MatchAssignment {
  Object.freeze(value.seeds);
  const assignment = Object.freeze(value);
  ASSIGNMENTS.add(assignment);
  return assignment;
}

/**
 * Selects every hidden quick-match attribute from independent named streams.
 * A debug difficulty override never changes profile, map or equipment streams.
 */
export function createMatchAssignment(options: CreateMatchAssignmentOptions): MatchAssignment {
  const copiedOptions = readOptions(options);
  const matchSeed = normalizeMatchSeed(copiedOptions.matchSeed);
  const selectedDifficultyId = createRng(
    deriveSeed(matchSeed, 'bot-difficulty'),
  ).pick(BOT_DIFFICULTY_IDS);
  let effectiveDifficultyId = selectedDifficultyId;
  if (copiedOptions.difficultyOverride !== null) {
    effectiveDifficultyId = getBotDifficultyProfile(copiedOptions.difficultyOverride).id;
  }
  const opponent = copyOpponentProfile(createRng(
    deriveSeed(matchSeed, 'opponent-profile'),
  ).pick(OPPONENT_PROFILES));
  return freezeAssignment({
    matchSeed,
    opponent,
    selectedDifficultyId,
    effectiveDifficultyId,
    seeds: {
      botBehavior: deriveSeed(matchSeed, 'bot-behavior:player-2'),
      botPersonality: deriveSeed(matchSeed, 'bot-personality:player-2'),
      map: deriveSeed(matchSeed, 'map'),
      equipment: deriveSeed(matchSeed, 'equipment'),
    },
  });
}

export function copyMatchAssignmentDiagnostics(
  assignment: MatchAssignment,
): MatchAssignmentDiagnostics {
  if (typeof assignment !== 'object' || assignment === null || !ASSIGNMENTS.has(assignment)) {
    throw new TypeError('assignment 必须由 createMatchAssignment 创建。');
  }
  return Object.freeze({
    matchSeed: assignment.matchSeed,
    opponentId: assignment.opponent.id,
    selectedDifficultyId: assignment.selectedDifficultyId,
    effectiveDifficultyId: assignment.effectiveDifficultyId,
    seeds: Object.freeze({ ...assignment.seeds }),
  });
}
