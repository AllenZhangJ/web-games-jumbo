import { createProductSessionComposition } from '@number-strategy-jump/arena-product-composition';
import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V1_CONTENT_REPLACEMENT_REGISTRY,
  ARENA_V1_MATCH_CONTENT_CATALOG,
  ARENA_V1_MATCH_CONTENT_POOL_DEFINITION,
  ARENA_V1_MATCH_REWARD_ID,
  ARENA_V1_PLAYER_PROFILE_DEFINITION,
  ARENA_V1_PROGRESSION_REGISTRY,
} from '@number-strategy-jump/arena-product-v1-content';
import { QuickMatchService } from '../../matchmaking/quick-match-service.js';
import { ARENA_V1_BALANCE_DEFINITION } from '../../content/arena-v1-balance.js';

const ARENA_V1_PRODUCT_COMPOSITION_DEFAULTS = Object.freeze({
  quickMatchServiceFactory: (options) => new QuickMatchService(options),
  profileDefinition: ARENA_V1_PLAYER_PROFILE_DEFINITION,
  contentPoolDefinition: ARENA_V1_MATCH_CONTENT_POOL_DEFINITION,
  contentCatalog: ARENA_V1_MATCH_CONTENT_CATALOG,
  replacementRegistry: ARENA_V1_CONTENT_REPLACEMENT_REGISTRY,
  progressionRegistry: ARENA_V1_PROGRESSION_REGISTRY,
  rewardDefinitionId: ARENA_V1_MATCH_REWARD_ID,
  baseMatchConfig: ARENA_V1_BALANCE_DEFINITION.matchConfig,
  enforcedMatchConfig: Object.freeze({
    airJumpHorizontalImpulse: ARENA_GAMEPLAY_V2_TUNING.character.jump.airHorizontalImpulse,
    // Dedicated attack and jump controls must never restore retired proximity gating.
    contextPrimaryMobilityEnabled: false,
  }),
});

export function createArenaV1ProductSession(options) {
  return createProductSessionComposition(options, ARENA_V1_PRODUCT_COMPOSITION_DEFAULTS);
}
