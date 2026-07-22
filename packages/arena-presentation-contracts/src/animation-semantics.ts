export const ARENA_ANIMATION_SEMANTIC = Object.freeze({
  ATTACK_ACTIVE: 'attack-active',
  ATTACK_WINDUP: 'attack-windup',
  CROUCH_CHARGE: 'crouch-charge',
  CROUCH_JUMP: 'crouch-jump',
  DEFEND: 'defend',
  DOUBLE_JUMP: 'double-jump',
  DOWN_SMASH: 'down-smash',
  DRAW: 'draw',
  ELIMINATED: 'eliminated',
  EQUIPMENT: 'equipment',
  HITSTUN: 'hitstun',
  IDLE: 'idle',
  JUMP: 'jump',
  KNOCKBACK: 'knockback',
  LAND: 'land',
  LOSE: 'lose',
  RUN: 'run',
  WALK: 'walk',
  WIN: 'win',
} as const);

export type ArenaAnimationSemantic =
  typeof ARENA_ANIMATION_SEMANTIC[keyof typeof ARENA_ANIMATION_SEMANTIC];

export const ARENA_ANIMATION_SEMANTIC_IDS = Object.freeze(
  Object.values(ARENA_ANIMATION_SEMANTIC).sort(),
) as readonly ArenaAnimationSemantic[];

export const ARENA_ANIMATION_SOURCE_KIND = Object.freeze({
  CLIP: 'clip',
  PROCEDURAL: 'procedural',
} as const);

export type ArenaAnimationSourceKind =
  typeof ARENA_ANIMATION_SOURCE_KIND[keyof typeof ARENA_ANIMATION_SOURCE_KIND];

export const ARENA_ANIMATION_ACTION_CATEGORY = Object.freeze({
  ATTACK: 'attack',
  DEFEND: 'defend',
  EQUIPMENT: 'equipment',
  MOVEMENT: 'movement',
} as const);

export type ArenaAnimationActionCategory =
  typeof ARENA_ANIMATION_ACTION_CATEGORY[keyof typeof ARENA_ANIMATION_ACTION_CATEGORY];
