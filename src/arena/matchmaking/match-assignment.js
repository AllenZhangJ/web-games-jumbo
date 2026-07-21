import { copyOpponentProfile, OPPONENT_PROFILES } from '../content/opponent-profiles.js';
import { BOT_DIFFICULTY_IDS, getBotDifficultyProfile } from '../ai/bot-difficulty.js';
import { createRng, deriveSeed } from '@number-strategy-jump/arena-contracts';

function matchSeed(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError('quick match seed 必须是 uint32。');
  }
  return value;
}

function freezeAssignment(value) {
  Object.freeze(value.opponent);
  Object.freeze(value.seeds);
  return Object.freeze(value);
}

/**
 * Selects every hidden quick-match attribute from independent named streams.
 * A debug difficulty override never changes profile, map or equipment streams.
 */
export function createMatchAssignment({ matchSeed: seed, difficultyOverride = null }) {
  const normalizedSeed = matchSeed(seed);
  const selectedDifficultyId = createRng(
    deriveSeed(normalizedSeed, 'bot-difficulty'),
  ).pick(BOT_DIFFICULTY_IDS);
  if (difficultyOverride !== null) getBotDifficultyProfile(difficultyOverride);
  const opponent = copyOpponentProfile(createRng(
    deriveSeed(normalizedSeed, 'opponent-profile'),
  ).pick(OPPONENT_PROFILES));
  return freezeAssignment({
    matchSeed: normalizedSeed,
    opponent,
    selectedDifficultyId,
    effectiveDifficultyId: difficultyOverride ?? selectedDifficultyId,
    seeds: {
      botBehavior: deriveSeed(normalizedSeed, 'bot-behavior:player-2'),
      botPersonality: deriveSeed(normalizedSeed, 'bot-personality:player-2'),
      map: deriveSeed(normalizedSeed, 'map'),
      equipment: deriveSeed(normalizedSeed, 'equipment'),
    },
  });
}

export function copyMatchAssignmentDiagnostics(assignment) {
  return {
    matchSeed: assignment.matchSeed,
    opponentId: assignment.opponent.id,
    selectedDifficultyId: assignment.selectedDifficultyId,
    effectiveDifficultyId: assignment.effectiveDifficultyId,
    seeds: { ...assignment.seeds },
  };
}
