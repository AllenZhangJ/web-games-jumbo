import {
  PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION,
  PLAYER_PROFILE_QUALITY,
  PLAYER_PROFILE_SCHEMA_VERSION,
  createPlayerProfileDefinition,
} from '@number-strategy-jump/arena-profile-contracts';
import { ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID } from './arena-v2-kz-base-map-candidate-v1.js';
import {
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
} from './arena-v2-kz-switchback-map-candidate-v1.js';
import {
  ARENA_V2_SIX_CHARACTER_DEFINITION_IDS_CANDIDATE_V1,
} from './arena-v2-six-character-catalog-candidate-v1.js';

const DEFAULT_CHARACTER_ID = ARENA_V2_SIX_CHARACTER_DEFINITION_IDS_CANDIDATE_V1[0]!;

/**
 * Candidate Profile V1 definition used by the mode reward committer. Weapon
 * collection and mastery remain owned by the separate Learning Profile V1.
 */
export const ARENA_V2_MODE_REWARD_PROFILE_DEFINITION_CANDIDATE_V1 =
  createPlayerProfileDefinition({
    schemaVersion: PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION,
    id: 'arena-v2.mode-reward-profile.candidate.v1',
    contentVersion: 3,
    currentProfileSchemaVersion: PLAYER_PROFILE_SCHEMA_VERSION,
    limits: {
      maxUnlockedPerKind: 64,
      maxCommittedGrantIds: 16_384,
      maxExperience: 1_000_000_000,
      maxIdentifierLength: 256,
    },
    defaults: {
      profileId: 'arena-v2-local-mode-reward-profile.candidate.v1',
      progression: {
        experience: 0,
        committedGrantIds: [],
      },
      unlocks: {
        characterIds: ARENA_V2_SIX_CHARACTER_DEFINITION_IDS_CANDIDATE_V1,
        appearanceIds: [],
        equipmentIds: [],
        mapIds: [
          ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
          ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
        ],
      },
      selection: {
        characterId: DEFAULT_CHARACTER_ID,
        appearanceId: null,
      },
      settings: {
        soundEnabled: true,
        reducedMotion: false,
        qualityProfile: PLAYER_PROFILE_QUALITY.AUTO,
      },
    },
  });

export const ARENA_V2_MODE_REWARD_PROFILE_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  definition: ARENA_V2_MODE_REWARD_PROFILE_DEFINITION_CANDIDATE_V1,
  weaponCollectionOwner: 'arena-v2-learning-profile-v1' as const,
  allSixCharactersAvailableFromStart: true as const,
  bothPlayableMapsAvailableFromStart: true as const,
  validationStatus: 'not-run' as const,
  defaultProfileServiceWired: false as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
});
