import {
  ARENA_GAMEPLAY_V2_MAP_DEFINITION,
  STAGE4_ACTION_DEFINITIONS,
  STAGE4_ACTION_ID,
  STAGE4_EQUIPMENT_DEFINITIONS,
  STAGE5_MAP_DEFINITION,
  STAGE6_MOVEMENT_ACTION_ID,
} from '@number-strategy-jump/arena-v1-content';
import { createArenaGameplayV2CharacterContent } from './arena-gameplay-v2-character-content.js';
import {
  createArenaGameplayV2PresentationContent,
  createArenaV1PresentationContent,
} from './arena-v1-presentation-content.js';

export const ARENA_V1_GREYBOX_CONTENT = createArenaV1PresentationContent({
  mapDefinition: STAGE5_MAP_DEFINITION,
  actionDefinitions: STAGE4_ACTION_DEFINITIONS,
  equipmentDefinitions: STAGE4_EQUIPMENT_DEFINITIONS,
  combatActionIds: STAGE4_ACTION_ID,
  movementActionIds: STAGE6_MOVEMENT_ACTION_ID,
});

const characterContent = createArenaGameplayV2CharacterContent(ARENA_V1_GREYBOX_CONTENT);

export const ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT = createArenaGameplayV2PresentationContent(
  ARENA_V1_GREYBOX_CONTENT,
  ARENA_GAMEPLAY_V2_MAP_DEFINITION,
  characterContent,
);
