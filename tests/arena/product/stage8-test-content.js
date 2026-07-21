import {
  MATCH_CONTENT_SELECTION_SCHEMA_VERSION,
  createMatchContentPublicView,
  createMatchContentSelection,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_V1_CHARACTER_DEFINITIONS } from '../../../src/arena/content/arena-v1-characters.js';
import { ARENA_V1_MAP_DEFINITIONS } from '../../../src/arena/content/arena-v1-maps.js';
import { STAGE4_EQUIPMENT_DEFINITIONS } from '../../../src/arena/content/stage4-equipment.js';

const characterDefinitionIds = ARENA_V1_CHARACTER_DEFINITIONS.map(({ id }) => id);
const mapDefinitionIds = ARENA_V1_MAP_DEFINITIONS.map(({ id }) => id);

export const TEST_MATCH_CONTENT_SELECTION = createMatchContentSelection({
  schemaVersion: MATCH_CONTENT_SELECTION_SCHEMA_VERSION,
  contentDefinitionId: 'test-match-content',
  contentVersion: 1,
  characterDefinitionIds,
  equipmentDefinitionIds: STAGE4_EQUIPMENT_DEFINITIONS.map(({ id }) => id),
  mapDefinitionIds,
  selectedMapDefinitionId: mapDefinitionIds[0],
  participantCharacters: [
    { participantId: 'player-1', definitionId: characterDefinitionIds[0] },
    { participantId: 'player-2', definitionId: characterDefinitionIds[1] },
  ],
});

export const TEST_MATCH_CONTENT_PUBLIC_VIEW = createMatchContentPublicView(
  TEST_MATCH_CONTENT_SELECTION,
);
