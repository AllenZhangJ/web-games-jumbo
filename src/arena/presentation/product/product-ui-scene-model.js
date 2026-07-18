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

function characterCards(viewModel) {
  return Object.freeze(viewModel.characterOptions.map((option) => Object.freeze({
    id: option.characterDefinitionId,
    name: option.name,
    previewAssetId: option.previewAssetId ?? null,
    selected: option.selected,
    enabled: viewModel.inputEnabled,
    intent: option.selectIntent,
  })));
}

/**
 * Projects the public Product ViewModel into host-neutral scene content.
 * Asset URLs, DOM nodes and Canvas drawing remain adapter responsibilities.
 */
export function createProductUiSceneModel(viewModel) {
  if (!viewModel || typeof viewModel !== 'object' || !viewModel.screen) {
    throw new TypeError('Product UI 需要公开 ViewModel。');
  }
  if (!Array.isArray(viewModel.characterOptions) || !Array.isArray(viewModel.unlocks)) {
    throw new TypeError('Product UI ViewModel 内容列表无效。');
  }
  const scene = viewModel.screen.sceneId;
  const selected = selectedCharacter(viewModel);
  const unlock = viewModel.unlocks[0] ?? null;
  return Object.freeze({
    revision: viewModel.revision,
    locale: viewModel.locale,
    scene,
    gameplay: scene === 'gameplay',
    busy: viewModel.busy || viewModel.suspended,
    terminal: viewModel.terminal,
    inputEnabled: viewModel.inputEnabled,
    kicker: KICKER_BY_SCENE[scene] ?? 'ABYSS ARENA',
    title: viewModel.screen.title,
    body: viewModel.screen.body ?? '',
    announcement: viewModel.screen.announcement,
    primaryAction: viewModel.screen.primaryAction,
    secondaryAction: viewModel.screen.secondaryAction,
    selectedCharacter: selected === null ? null : Object.freeze({
      id: selected.characterDefinitionId,
      name: selected.name,
      previewAssetId: selected.previewAssetId ?? null,
    }),
    opponentName: viewModel.match?.opponent?.displayName ?? '神秘挑战者',
    characterCards: characterCards(viewModel),
    outcome: viewModel.result?.outcome ?? null,
    experienceDelta: viewModel.reward?.experienceDelta ?? null,
    unlock: unlock === null ? null : Object.freeze({
      kind: unlock.kind,
      id: unlock.contentId,
      name: unlock.name,
      previewAssetId: unlock.previewAssetId ?? null,
    }),
    errorMessage: viewModel.error?.message ?? '',
  });
}
