export const DESIGN_WIDTH = 750;
export const DESIGN_HEIGHT = 1334;
export const FIXED_STEP_MS = 1000 / 60;

export const GAME_RULES = Object.freeze({
  startingValueMin: 6,
  startingValueMax: 18,
  targetMin: 28,
  targetMax: 72,
  movesPerRound: 7,
  minValue: -99,
  maxValue: 199,
  chargeMinMs: 80,
  chargeMaxMs: 1200,
  // Keep input locked until the post-landing camera/world transition settles.
  landingDurationMs: 520,
});

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

export const JUMP_PHYSICS = Object.freeze({
  minChargeMs: GAME_RULES.chargeMinMs,
  maxChargeMs: GAME_RULES.chargeMaxMs,
  minRange: 0.8,
  maxRange: 7.6,
  rangeExponent: 1.18,
  durationMinMs: 520,
  durationMaxMs: 820,
  heightMin: 1.1,
  heightMax: 2.2,
});
