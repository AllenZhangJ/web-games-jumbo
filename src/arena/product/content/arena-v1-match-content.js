import { ARENA_V1_DEFAULT_CHARACTER_ID } from '../../content/arena-v1-character-ids.js';
import { ARENA_V1_CHARACTER_DEFINITIONS } from '../../content/arena-v1-characters.js';
import { ARENA_V1_MAP_DEFINITIONS } from '../../content/arena-v1-maps.js';
import {
  STAGE4_EQUIPMENT_DEFINITIONS,
  STAGE4_EQUIPMENT_ID,
} from '../../content/stage4-equipment.js';
import { STAGE5_MAP_ID } from '../../content/stage5-map.js';
import { ContentReplacementRegistry } from '../content-pool/content-replacement-registry.js';
import { MatchContentCatalog } from '../content-pool/match-content-catalog.js';
import {
  MATCH_CONTENT_POOL_DEFINITION_SCHEMA_VERSION,
  createMatchContentPoolDefinition,
} from '../content-pool/match-content-pool-definition.js';

export const ARENA_V1_MATCH_CONTENT_POOL_DEFINITION = createMatchContentPoolDefinition({
  schemaVersion: MATCH_CONTENT_POOL_DEFINITION_SCHEMA_VERSION,
  id: 'arena-v1-match-content',
  contentVersion: 1,
  playerParticipantId: 'player-1',
  opponentParticipantId: 'player-2',
  fallbackCharacterId: ARENA_V1_DEFAULT_CHARACTER_ID,
  fallbackMapId: STAGE5_MAP_ID,
  requiredEquipmentIds: Object.values(STAGE4_EQUIPMENT_ID),
});

export const ARENA_V1_MATCH_CONTENT_CATALOG = new MatchContentCatalog({
  characterIds: ARENA_V1_CHARACTER_DEFINITIONS.map(({ id }) => id),
  equipmentIds: STAGE4_EQUIPMENT_DEFINITIONS.map(({ id }) => id),
  mapIds: ARENA_V1_MAP_DEFINITIONS.map(({ id }) => id),
});

// Removing an ID requires an explicit replacement entry and a Profile migration.
// V1 has no retired production content, so the registry intentionally starts empty.
export const ARENA_V1_CONTENT_REPLACEMENT_REGISTRY = new ContentReplacementRegistry([]);
