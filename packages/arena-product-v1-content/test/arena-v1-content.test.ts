import { describe, expect, it } from 'vitest';
import {
  ARENA_GAMEPLAY_V2_MAP_ID,
  ARENA_V1_CHARACTER_ID,
  ARENA_V1_DEFAULT_CHARACTER_ID,
  STAGE4_EQUIPMENT_ID,
  STAGE5_MAP_ID,
} from '@number-strategy-jump/arena-definitions';
import { MATCH_CONTENT_KIND } from '@number-strategy-jump/arena-product-content';
import { createPlayerProfile } from '@number-strategy-jump/arena-profile-contracts';
import {
  ARENA_V1_CONTENT_REPLACEMENT_REGISTRY,
  ARENA_V1_MATCH_CONTENT_CATALOG,
  ARENA_V1_MATCH_CONTENT_POOL_DEFINITION,
  ARENA_V1_MATCH_REWARD_DEFINITION,
  ARENA_V1_MATCH_REWARD_ID,
  ARENA_V1_PLAYER_PROFILE_DEFINITION,
  ARENA_V1_PROGRESSION_REGISTRY,
} from '../src/index.js';

describe('Arena V1 product content', () => {
  it('binds Profile defaults and content Catalog to one stable ID source', () => {
    const profile = createPlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION);
    expect(profile.selection.characterId).toBe(ARENA_V1_DEFAULT_CHARACTER_ID);
    expect(profile.unlocks.characterIds).toEqual(Object.values(ARENA_V1_CHARACTER_ID).sort());
    expect(profile.unlocks.equipmentIds).toEqual(Object.values(STAGE4_EQUIPMENT_ID).sort());
    expect(profile.unlocks.mapIds).toEqual([ARENA_GAMEPLAY_V2_MAP_ID]);
    expect(ARENA_V1_MATCH_CONTENT_CATALOG.toJSON()).toEqual({
      characterIds: profile.unlocks.characterIds,
      equipmentIds: profile.unlocks.equipmentIds,
      mapIds: profile.unlocks.mapIds,
    });
    expect(ARENA_V1_MATCH_CONTENT_POOL_DEFINITION.fallbackMapId)
      .toBe(ARENA_GAMEPLAY_V2_MAP_ID);
  });

  it('keeps the retired map explicit and the reward Registry internally consistent', () => {
    expect(ARENA_V1_CONTENT_REPLACEMENT_REGISTRY.resolve(
      MATCH_CONTENT_KIND.MAP,
      STAGE5_MAP_ID,
    )).toBe(ARENA_GAMEPLAY_V2_MAP_ID);
    expect(ARENA_V1_MATCH_REWARD_DEFINITION.id).toBe(ARENA_V1_MATCH_REWARD_ID);
    expect(ARENA_V1_PROGRESSION_REGISTRY.getReward(ARENA_V1_MATCH_REWARD_ID))
      .toBe(ARENA_V1_MATCH_REWARD_DEFINITION);
  });
});
