import { ARENA_V1_CHARACTER_ID, ARENA_V1_DEFAULT_CHARACTER_ID } from '../../content/arena-v1-character-ids.js';
import { STAGE4_EQUIPMENT_ID } from '../../content/stage4-equipment.js';
import { ARENA_GAMEPLAY_V2_MAP_ID } from '../../content/arena-gameplay-v2-map.js';
import {
  PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION,
  PLAYER_PROFILE_QUALITY,
  PLAYER_PROFILE_SCHEMA_VERSION,
  createPlayerProfileDefinition,
} from '../profile/player-profile-definition.js';

export const ARENA_V1_PLAYER_PROFILE_DEFINITION = createPlayerProfileDefinition({
  schemaVersion: PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION,
  id: 'arena-v1-local-player',
  contentVersion: 2,
  currentProfileSchemaVersion: PLAYER_PROFILE_SCHEMA_VERSION,
  limits: {
    maxUnlockedPerKind: 256,
    maxCommittedGrantIds: 1024,
    maxExperience: 1_000_000_000,
    maxIdentifierLength: 128,
  },
  defaults: {
    profileId: 'local-player',
    progression: { experience: 0, committedGrantIds: [] },
    unlocks: {
      characterIds: Object.values(ARENA_V1_CHARACTER_ID),
      appearanceIds: [],
      equipmentIds: Object.values(STAGE4_EQUIPMENT_ID),
      mapIds: [ARENA_GAMEPLAY_V2_MAP_ID],
    },
    selection: {
      characterId: ARENA_V1_DEFAULT_CHARACTER_ID,
      appearanceId: null,
    },
    settings: {
      soundEnabled: true,
      reducedMotion: false,
      qualityProfile: PLAYER_PROFILE_QUALITY.AUTO,
    },
  },
});
