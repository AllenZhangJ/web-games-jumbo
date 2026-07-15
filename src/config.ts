import {
  DEFAULT_DIFFICULTY,
  defineDifficultyProfile,
  toLegacyGameRules,
  toLegacyJumpPhysics,
  toLegacyWorldOptions,
} from '@number-strategy/difficulty';

export const DESIGN_WIDTH = 750;
export const DESIGN_HEIGHT = 1334;
export const FIXED_STEP_MS = 1000 / 60;

export { DEFAULT_DIFFICULTY };
export const GAME_RULES = toLegacyGameRules(DEFAULT_DIFFICULTY);

export const COLORS = Object.freeze({
  ink: '#263238',
  sky: '#D8DDE2',
  surface: '#FFFFFF',
  surfaceBright: '#F5F1E8',
  text: '#263238',
  muted: '#6F7B82',
  violet: '#5C6BC0',
  cyan: '#16A6A1',
  coral: '#E53935',
  white: '#FFFFFF',
});

export const JUMP_PHYSICS = toLegacyJumpPhysics(DEFAULT_DIFFICULTY);
export const WORLD_OPTIONS = toLegacyWorldOptions(DEFAULT_DIFFICULTY);

export function createRuntimeConfig(difficulty = DEFAULT_DIFFICULTY) {
  const validatedDifficulty = defineDifficultyProfile(difficulty);
  return Object.freeze({
    difficulty: validatedDifficulty,
    gameRules: toLegacyGameRules(validatedDifficulty),
    jumpPhysics: toLegacyJumpPhysics(validatedDifficulty),
    worldOptions: toLegacyWorldOptions(validatedDifficulty),
  });
}
