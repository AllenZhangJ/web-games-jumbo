export const STAGE4_EQUIPMENT_ID = Object.freeze({
  HAMMER: 'hammer',
  CHAIN: 'chain',
  SHIELD: 'shield',
} as const);

export type Stage4EquipmentId =
  typeof STAGE4_EQUIPMENT_ID[keyof typeof STAGE4_EQUIPMENT_ID];

export const STAGE5_MAP_ID = 'abyss-grid-wind-v1' as const;
export const ARENA_GAMEPLAY_V2_MAP_ID = 'forge-crossroads-v2' as const;
