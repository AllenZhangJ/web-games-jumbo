import {
  createArenaGameplayV2CharacterContent,
  createArenaGameplayV2PresentationContent,
  createArenaV1PresentationContent,
} from '@number-strategy-jump/arena-v1-presentation-content';
import {
  STAGE4_ACTION_DEFINITIONS,
  STAGE4_ACTION_ID,
  STAGE4_EQUIPMENT_DEFINITIONS,
} from '../../content/stage4-equipment.js';
import { STAGE5_MAP_DEFINITION } from '../../content/stage5-map.js';
import { ARENA_GAMEPLAY_V2_MAP_DEFINITION } from '../../content/arena-gameplay-v2-map.js';
import { STAGE6_MOVEMENT_ACTION_ID } from '../../content/stage6-movement-actions.js';

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
