import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEB_PRODUCT_ASSET,
  createWebProductSceneModel,
} from '../src/entry/web-product-scene-model.js';

function viewModel(overrides = {}) {
  return {
    revision: 7,
    locale: 'zh-CN',
    activeState: 'ready',
    busy: false,
    suspended: false,
    terminal: false,
    inputEnabled: true,
    screen: {
      sceneId: 'home',
      title: '竞技场',
      body: '争夺装备，把对手击出平台',
      announcement: '竞技场',
      primaryAction: { label: '开始匹配', enabled: true, intent: { id: 'start-match' } },
      secondaryAction: { label: '选择角色', enabled: true, intent: { id: 'open-character-select' } },
    },
    characterOptions: [
      {
        characterDefinitionId: 'parkour-apprentice',
        name: '跑酷学徒',
        selected: true,
        selectIntent: { id: 'select-character', characterDefinitionId: 'parkour-apprentice' },
      },
      {
        characterDefinitionId: 'wind-up-cube',
        name: '发条方块',
        selected: false,
        selectIntent: { id: 'select-character', characterDefinitionId: 'wind-up-cube' },
      },
    ],
    match: null,
    result: null,
    reward: null,
    unlocks: [],
    error: null,
    ...overrides,
  };
}

test('Web product scene model maps public character choices to accepted concept assets', () => {
  const model = createWebProductSceneModel(viewModel());
  assert.equal(model.scene, 'home');
  assert.equal(model.gameplay, false);
  assert.equal(model.lobbyAsset, WEB_PRODUCT_ASSET.LOBBY_DUO);
  assert.equal(model.selectedCharacterAsset, WEB_PRODUCT_ASSET.PARKOUR_APPRENTICE);
  assert.deepEqual(
    model.characterCards.map(({ id, asset, selected }) => ({ id, asset, selected })),
    [
      {
        id: 'parkour-apprentice',
        asset: WEB_PRODUCT_ASSET.PARKOUR_APPRENTICE,
        selected: true,
      },
      {
        id: 'wind-up-cube',
        asset: WEB_PRODUCT_ASSET.WIND_UP_CUBE,
        selected: false,
      },
    ],
  );
});

test('Web product scene model exposes only player-facing matching and reward data', () => {
  const matching = createWebProductSceneModel(viewModel({
    activeState: 'matching',
    busy: true,
    screen: {
      sceneId: 'matching',
      title: '正在匹配',
      body: '正在寻找对手…',
      announcement: '正在匹配',
      primaryAction: null,
      secondaryAction: null,
    },
    match: { opponent: { displayName: '山岚' } },
  }));
  assert.equal(matching.opponentName, '山岚');
  assert.doesNotMatch(JSON.stringify(matching), /bot|difficulty|机器人|简单|普通|困难/i);

  const reward = createWebProductSceneModel(viewModel({
    activeState: 'reward',
    screen: {
      sceneId: 'reward',
      title: '胜利',
      body: '经验 +125',
      announcement: '胜利',
      primaryAction: { label: '再来一局', enabled: true, intent: { id: 'request-rematch' } },
      secondaryAction: { label: '继续', enabled: true, intent: { id: 'continue-reward' } },
    },
    result: { outcome: 'win' },
    reward: { experienceDelta: 125 },
  }));
  assert.equal(reward.outcome, 'win');
  assert.equal(reward.experienceDelta, 125);
});
