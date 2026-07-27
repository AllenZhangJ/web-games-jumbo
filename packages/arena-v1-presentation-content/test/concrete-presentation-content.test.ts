import { describe, expect, it } from 'vitest';
import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';
import { ARENA_GAMEPLAY_V2_MAP_DEFINITION, STAGE5_MAP_DEFINITION } from '@number-strategy-jump/arena-v1-content';
import {
  ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
  ARENA_V1_GREYBOX_CONTENT,
  ARENA_V1_PRODUCT_PRESENTATION_CONTENT,
  ARENA_V1_PRODUCT_SCREEN_REGISTRY,
  ARENA_V1_ZH_CN_PRODUCT_MESSAGES,
} from '../src/index.js';

describe('Arena V1 concrete presentation content', () => {
  it('composes immutable gameplay presentation from authoritative V1 definitions', () => {
    expect(ARENA_V1_GREYBOX_CONTENT.map.id).toBe(STAGE5_MAP_DEFINITION.id);
    expect(ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT.map.id)
      .toBe(ARENA_GAMEPLAY_V2_MAP_DEFINITION.id);
    expect(Object.isFrozen(ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT)).toBe(true);
    expect(ARENA_V1_GREYBOX_CONTENT.characterPresentationRegistry.size).toBe(2);
  });

  it('resolves every product preview through the same character presentation catalog', () => {
    for (const characterId of Object.values(ARENA_V1_CHARACTER_ID)) {
      const productDefinition = ARENA_V1_PRODUCT_PRESENTATION_CONTENT.contentRegistry
        .list()
        .find(({ contentId }) => contentId === characterId);
      if (!productDefinition) throw new Error(`缺少角色 ${characterId} 的 Product 表现内容。`);
      expect(productDefinition.previewAssetId)
        .toBe(ARENA_V1_GREYBOX_CONTENT.characters[characterId]?.modelAssetId);
      ARENA_V1_ZH_CN_PRODUCT_MESSAGES.require(productDefinition.nameMessageId);
    }
    const weapons = ARENA_V1_PRODUCT_PRESENTATION_CONTENT.contentRegistry.list()
      .filter(({ contentKind }) => contentKind === 'equipment');
    expect(weapons).toHaveLength(3);
    const hammer = weapons.find(({ contentId }) => contentId === 'hammer');
    expect(hammer?.overview?.stats.find(({ id }) => id === 'range')).toMatchObject({
      value: 1.8,
      unit: '格',
      direction: 'higher-is-better',
    });
    expect(hammer?.overview?.stats.some(({ id }) => id === 'startup')).toBe(true);
    expect(hammer?.overview?.coreVerbMessageId).toBe('equipment.hammer.core-verb');
    expect(hammer?.overview?.contexts.map(({ id }) => id)).toEqual(['ground', 'aerial']);
    expect(hammer?.overview?.contexts[1]?.stats.find(({ id }) => id === 'range'))
      .toMatchObject({ value: 2.5, unit: '格' });
    const shield = weapons.find(({ contentId }) => contentId === 'shield');
    expect(shield?.overview?.stats.find(({ id }) => id === 'self-movement')).toMatchObject({
      value: 6.5,
      direction: 'higher-is-risk',
    });
    expect(ARENA_V1_PRODUCT_SCREEN_REGISTRY.list().length).toBeGreaterThan(0);
  });
});
