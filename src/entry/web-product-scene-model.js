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

const KICKER_BY_SCENE = Object.freeze({
  loading: 'ARENA LINK',
  home: 'QUICK MATCH',
  'character-select': 'LOADOUT',
  matching: 'MATCH LINK',
  gameplay: 'LIVE ARENA',
  result: 'MATCH REPORT',
  reward: 'MATCH REPORT',
  unlock: 'NEW DROP',
  'recoverable-error': 'RECOVERY',
  'fatal-error': 'SYSTEM NOTICE',
  destroyed: 'SESSION CLOSED',
});

function selectedCharacter(viewModel) {
  return viewModel.characterOptions.find(({ selected }) => selected)
    ?? viewModel.characterOptions[0]
    ?? null;
}

function characterAsset(characterDefinitionId) {
  return CHARACTER_ASSET_BY_ID[characterDefinitionId] ?? WEB_PRODUCT_ASSET.PARKOUR_APPRENTICE;
}

function characterCards(viewModel) {
  return Object.freeze(viewModel.characterOptions.map((option) => Object.freeze({
    id: option.characterDefinitionId,
    name: option.name,
    asset: characterAsset(option.characterDefinitionId),
    selected: option.selected,
    enabled: viewModel.inputEnabled,
    intent: option.selectIntent,
  })));
}

export function createWebProductSceneModel(viewModel) {
  if (!viewModel || typeof viewModel !== 'object' || !viewModel.screen) {
    throw new TypeError('Web Product UI 需要公开 ViewModel。');
  }
  const scene = viewModel.screen.sceneId;
  const selected = selectedCharacter(viewModel);
  const unlock = viewModel.unlocks[0] ?? null;
  const unlockAsset = unlock?.contentId
    ? characterAsset(unlock.contentId)
    : WEB_PRODUCT_ASSET.WIND_UP_CUBE;
  return Object.freeze({
    revision: viewModel.revision,
    scene,
    gameplay: scene === 'gameplay',
    busy: viewModel.busy || viewModel.suspended,
    terminal: viewModel.terminal,
    kicker: KICKER_BY_SCENE[scene] ?? 'ABYSS ARENA',
    title: viewModel.screen.title,
    body: viewModel.screen.body ?? '',
    announcement: viewModel.screen.announcement,
    primaryAction: viewModel.screen.primaryAction,
    secondaryAction: viewModel.screen.secondaryAction,
    selectedCharacterName: selected?.name ?? '挑战者',
    selectedCharacterAsset: selected
      ? characterAsset(selected.characterDefinitionId)
      : WEB_PRODUCT_ASSET.PARKOUR_APPRENTICE,
    opponentName: viewModel.match?.opponent?.displayName ?? '神秘挑战者',
    opponentPortraitAsset: WEB_PRODUCT_ASSET.WIND_UP_CUBE,
    lobbyAsset: WEB_PRODUCT_ASSET.LOBBY_DUO,
    characterCards: characterCards(viewModel),
    outcome: viewModel.result?.outcome ?? null,
    experienceDelta: viewModel.reward?.experienceDelta ?? null,
    unlockName: unlock?.name ?? '',
    unlockAsset,
    errorMessage: viewModel.error?.message ?? '',
  });
}
