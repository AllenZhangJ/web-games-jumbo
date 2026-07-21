import { ARENA_V1_DEFAULT_CHARACTER_ID } from '../../content/arena-v1-character-ids.js';
import { ARENA_V1_CHARACTER_DEFINITIONS } from '../../content/arena-v1-characters.js';
import { ARENA_GAMEPLAY_V2_MAP_ID } from '../../content/arena-gameplay-v2-map.js';
import {
  STAGE4_EQUIPMENT_DEFINITIONS,
  STAGE4_EQUIPMENT_ID,
} from '../../content/stage4-equipment.js';
import { STAGE5_MAP_ID } from '../../content/stage5-map.js';
import {
  CONTENT_REPLACEMENT_DEFINITION_SCHEMA_VERSION,
  MATCH_CONTENT_KIND,
} from '../content-pool/content-replacement-definition.js';
import { ContentReplacementRegistry } from '../content-pool/content-replacement-registry.js';
import { MatchContentCatalog } from '../content-pool/match-content-catalog.js';
import {
  MATCH_CONTENT_POOL_DEFINITION_SCHEMA_VERSION,
  createMatchContentPoolDefinition,
} from '../content-pool/match-content-pool-definition.js';

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
  characterIds: ARENA_V1_CHARACTER_DEFINITIONS.map(({ id }) => id),
  equipmentIds: STAGE4_EQUIPMENT_DEFINITIONS.map(({ id }) => id),
  mapIds: [ARENA_GAMEPLAY_V2_MAP_ID],
});

// V1 remains in the authority registry for deterministic replay compatibility,
// while the production pool migrates existing profiles to the larger V2 arena.
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
