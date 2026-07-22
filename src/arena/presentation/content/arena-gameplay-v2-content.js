import {
  createArenaGameplayV2CharacterContent,
  createArenaGameplayV2PresentationContent,
  createArenaV1PresentationContent,
} from '@number-strategy-jump/arena-v1-presentation-content';
import {
  STAGE4_ACTION_DEFINITIONS,
  STAGE4_ACTION_ID,
  STAGE4_EQUIPMENT_DEFINITIONS,
} from '@number-strategy-jump/arena-v1-content';
import { STAGE5_MAP_DEFINITION } from '@number-strategy-jump/arena-v1-content';
import { ARENA_GAMEPLAY_V2_MAP_DEFINITION } from '@number-strategy-jump/arena-v1-content';
import { STAGE6_MOVEMENT_ACTION_ID } from '@number-strategy-jump/arena-v1-content';

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
