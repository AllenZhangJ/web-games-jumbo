export const ARENA_V1_CHARACTER_ID = Object.freeze({
  PARKOUR_APPRENTICE: 'parkour-apprentice',
  WIND_UP_CUBE: 'wind-up-cube',
} as const);

export type ArenaV1CharacterId = typeof ARENA_V1_CHARACTER_ID[keyof typeof ARENA_V1_CHARACTER_ID];

export const ARENA_V1_DEFAULT_CHARACTER_ID: ArenaV1CharacterId =
  ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE;
