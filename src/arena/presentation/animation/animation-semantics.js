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
});

export const ARENA_ANIMATION_SEMANTIC_IDS = Object.freeze(
  Object.values(ARENA_ANIMATION_SEMANTIC).sort(),
);

export const ARENA_ANIMATION_SOURCE_KIND = Object.freeze({
  CLIP: 'clip',
  PROCEDURAL: 'procedural',
});

export const ARENA_ANIMATION_ACTION_CATEGORY = Object.freeze({
  ATTACK: 'attack',
  DEFEND: 'defend',
  EQUIPMENT: 'equipment',
  MOVEMENT: 'movement',
});
