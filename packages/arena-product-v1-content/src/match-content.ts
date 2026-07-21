import {
  ARENA_GAMEPLAY_V2_MAP_ID,
  ARENA_V1_CHARACTER_ID,
  ARENA_V1_DEFAULT_CHARACTER_ID,
  STAGE4_EQUIPMENT_ID,
  STAGE5_MAP_ID,
} from '@number-strategy-jump/arena-definitions';
import {
  CONTENT_REPLACEMENT_DEFINITION_SCHEMA_VERSION,
  ContentReplacementRegistry,
  MATCH_CONTENT_KIND,
  MATCH_CONTENT_POOL_DEFINITION_SCHEMA_VERSION,
  MatchContentCatalog,
  createMatchContentPoolDefinition,
} from '@number-strategy-jump/arena-product-content';

export const ARENA_V1_MATCH_CONTENT_POOL_DEFINITION = createMatchContentPoolDefinition({
  schemaVersion: MATCH_CONTENT_POOL_DEFINITION_SCHEMA_VERSION,
  id: 'arena-v1-match-content',
  contentVersion: 2,
  playerParticipantId: 'player-1',
  opponentParticipantId: 'player-2',
  fallbackCharacterId: ARENA_V1_DEFAULT_CHARACTER_ID,
  fallbackMapId: ARENA_GAMEPLAY_V2_MAP_ID,
  requiredEquipmentIds: Object.values(STAGE4_EQUIPMENT_ID),
});

export const ARENA_V1_MATCH_CONTENT_CATALOG = new MatchContentCatalog({
  characterIds: Object.values(ARENA_V1_CHARACTER_ID),
  equipmentIds: Object.values(STAGE4_EQUIPMENT_ID),
  mapIds: [ARENA_GAMEPLAY_V2_MAP_ID],
});

// V1 remains a replay authority ID while current profiles resolve to the larger V2 arena.
export const ARENA_V1_CONTENT_REPLACEMENT_REGISTRY = new ContentReplacementRegistry([
  {
    schemaVersion: CONTENT_REPLACEMENT_DEFINITION_SCHEMA_VERSION,
    id: 'arena-map-abyss-grid-v1-to-forge-crossroads-v2',
    contentVersion: 1,
    kind: MATCH_CONTENT_KIND.MAP,
    retiredId: STAGE5_MAP_ID,
    replacementId: ARENA_GAMEPLAY_V2_MAP_ID,
  },
]);
