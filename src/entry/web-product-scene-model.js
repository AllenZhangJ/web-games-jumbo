import { createProductUiSceneModel } from '../arena/presentation/product/product-ui-scene-model.js';

const ASSET_BASE = './assets/arena-product';

export const WEB_PRODUCT_ASSET = Object.freeze({
  LOBBY_DUO: `${ASSET_BASE}/lobby-duo-v1.webp`,
  PARKOUR_APPRENTICE: `${ASSET_BASE}/parkour-apprentice-v1.webp`,
  WIND_UP_CUBE: `${ASSET_BASE}/windup-cube-v1.webp`,
});

const CHARACTER_ASSET_BY_ID = Object.freeze({
  'parkour-apprentice': WEB_PRODUCT_ASSET.PARKOUR_APPRENTICE,
  'wind-up-cube': WEB_PRODUCT_ASSET.WIND_UP_CUBE,
});

function characterAsset(characterDefinitionId) {
  return CHARACTER_ASSET_BY_ID[characterDefinitionId] ?? WEB_PRODUCT_ASSET.PARKOUR_APPRENTICE;
}

function characterCards(model) {
  return Object.freeze(model.characterCards.map((card) => Object.freeze({
    ...card,
    asset: characterAsset(card.id),
  })));
}

export function createWebProductSceneModel(viewModel) {
  const model = createProductUiSceneModel(viewModel);
  const unlockAsset = model.unlock?.id
    ? characterAsset(model.unlock.id)
    : WEB_PRODUCT_ASSET.WIND_UP_CUBE;
  return Object.freeze({
    ...model,
    selectedCharacterName: model.selectedCharacter?.name ?? '挑战者',
    selectedCharacterAsset: model.selectedCharacter
      ? characterAsset(model.selectedCharacter.id)
      : WEB_PRODUCT_ASSET.PARKOUR_APPRENTICE,
    opponentPortraitAsset: WEB_PRODUCT_ASSET.WIND_UP_CUBE,
    lobbyAsset: WEB_PRODUCT_ASSET.LOBBY_DUO,
    characterCards: characterCards(model),
    unlockName: model.unlock?.name ?? '',
    unlockAsset,
  });
}
