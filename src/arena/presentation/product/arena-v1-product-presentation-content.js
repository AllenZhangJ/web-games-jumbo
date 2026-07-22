import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V1_PRODUCT_SCREEN_REGISTRY,
  ARENA_V1_ZH_CN_PRODUCT_MESSAGES,
  createArenaV1ProductPresentationContent,
} from '@number-strategy-jump/arena-product-presentation';
import { ARENA_V1_GREYBOX_CONTENT } from '../content/arena-v1-greybox-content.js';

function requirePreviewAssetId(characterDefinitionId) {
  const presentation = ARENA_V1_GREYBOX_CONTENT.characters[characterDefinitionId];
  if (!presentation) {
    throw new RangeError(`Character ${characterDefinitionId} 缺少灰盒表现内容。`);
  }
  return presentation.modelAssetId;
}

export { ARENA_V1_PRODUCT_SCREEN_REGISTRY, ARENA_V1_ZH_CN_PRODUCT_MESSAGES };

export const ARENA_V1_PRODUCT_PRESENTATION_CONTENT = createArenaV1ProductPresentationContent({
  [ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE]: requirePreviewAssetId(
    ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
  ),
  [ARENA_V1_CHARACTER_ID.WIND_UP_CUBE]: requirePreviewAssetId(
    ARENA_V1_CHARACTER_ID.WIND_UP_CUBE,
  ),
});

export const ARENA_V1_PRODUCT_CONTENT_PRESENTATION_REGISTRY = (
  ARENA_V1_PRODUCT_PRESENTATION_CONTENT.contentRegistry
);
