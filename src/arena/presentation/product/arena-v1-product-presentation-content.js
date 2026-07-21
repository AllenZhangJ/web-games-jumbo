import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';
import { PRODUCT_SESSION_STATE } from '@number-strategy-jump/arena-product-state';
import { ARENA_V1_GREYBOX_CONTENT } from '../content/arena-v1-greybox-content.js';
import {
  PRODUCT_CONTENT_KIND,
  PRODUCT_CONTENT_PRESENTATION_DEFINITION_SCHEMA_VERSION,
} from './product-content-presentation-definition.js';
import { ProductContentPresentationRegistry } from './product-content-presentation-registry.js';
import {
  PRODUCT_MESSAGE_CATALOG_SCHEMA_VERSION,
  ProductMessageCatalog,
} from './product-message-catalog.js';
import {
  PRODUCT_SCREEN_DEFINITION_SCHEMA_VERSION,
  PRODUCT_SCREEN_KIND,
} from './product-screen-definition.js';
import { ProductScreenRegistry } from './product-screen-registry.js';
import { PRODUCT_UI_INTENT_ID } from './product-ui-intent.js';

function action(intentId, labelMessageId) {
  return { intentId, labelMessageId };
}

function screen({
  id,
  activeState,
  kind,
  sceneId,
  titleMessageId,
  bodyMessageId = null,
  primaryAction = null,
  secondaryAction = null,
  announcementMessageId = titleMessageId,
}) {
  return {
    schemaVersion: PRODUCT_SCREEN_DEFINITION_SCHEMA_VERSION,
    id,
    contentVersion: 1,
    activeState,
    kind,
    sceneId,
    titleMessageId,
    bodyMessageId,
    primaryAction,
    secondaryAction,
    announcementMessageId,
  };
}

export const ARENA_V1_PRODUCT_SCREEN_REGISTRY = new ProductScreenRegistry([
  screen({
    id: 'arena.product.screen.boot.v1',
    activeState: PRODUCT_SESSION_STATE.BOOT,
    kind: PRODUCT_SCREEN_KIND.LOADING,
    sceneId: 'loading',
    titleMessageId: 'screen.loading.title',
  }),
  screen({
    id: 'arena.product.screen.loading-profile.v1',
    activeState: PRODUCT_SESSION_STATE.LOADING_PROFILE,
    kind: PRODUCT_SCREEN_KIND.LOADING,
    sceneId: 'loading',
    titleMessageId: 'screen.loading.title',
  }),
  screen({
    id: 'arena.product.screen.ready.v1',
    activeState: PRODUCT_SESSION_STATE.READY,
    kind: PRODUCT_SCREEN_KIND.MENU,
    sceneId: 'home',
    titleMessageId: 'screen.home.title',
    bodyMessageId: 'screen.home.body',
    primaryAction: action(PRODUCT_UI_INTENT_ID.START_MATCH, 'action.start-match'),
    secondaryAction: action(
      PRODUCT_UI_INTENT_ID.OPEN_CHARACTER_SELECT,
      'action.choose-character',
    ),
  }),
  screen({
    id: 'arena.product.screen.character-select.v1',
    activeState: PRODUCT_SESSION_STATE.CHARACTER_SELECT,
    kind: PRODUCT_SCREEN_KIND.MENU,
    sceneId: 'character-select',
    titleMessageId: 'screen.character-select.title',
    primaryAction: action(
      PRODUCT_UI_INTENT_ID.CLOSE_CHARACTER_SELECT,
      'action.confirm-character',
    ),
  }),
  screen({
    id: 'arena.product.screen.matching.v1',
    activeState: PRODUCT_SESSION_STATE.MATCHING,
    kind: PRODUCT_SCREEN_KIND.MATCHING,
    sceneId: 'matching',
    titleMessageId: 'screen.matching.title',
    bodyMessageId: 'screen.matching.body',
  }),
  screen({
    id: 'arena.product.screen.preparing.v1',
    activeState: PRODUCT_SESSION_STATE.PREPARING,
    kind: PRODUCT_SCREEN_KIND.MATCHING,
    sceneId: 'matching',
    titleMessageId: 'screen.preparing.title',
    bodyMessageId: 'screen.preparing.body',
  }),
  screen({
    id: 'arena.product.screen.in-match.v1',
    activeState: PRODUCT_SESSION_STATE.IN_MATCH,
    kind: PRODUCT_SCREEN_KIND.GAMEPLAY,
    sceneId: 'gameplay',
    titleMessageId: 'screen.gameplay.title',
  }),
  screen({
    id: 'arena.product.screen.results.v1',
    activeState: PRODUCT_SESSION_STATE.RESULTS,
    kind: PRODUCT_SCREEN_KIND.RESULT,
    sceneId: 'result',
    titleMessageId: 'screen.results.title',
    bodyMessageId: 'screen.results.body',
  }),
  screen({
    id: 'arena.product.screen.reward.v1',
    activeState: PRODUCT_SESSION_STATE.REWARD,
    kind: PRODUCT_SCREEN_KIND.RESULT,
    sceneId: 'reward',
    titleMessageId: 'screen.reward.title',
    bodyMessageId: 'screen.reward.body',
    primaryAction: action(PRODUCT_UI_INTENT_ID.REQUEST_REMATCH, 'action.rematch'),
    secondaryAction: action(PRODUCT_UI_INTENT_ID.CONTINUE_REWARD, 'action.continue'),
  }),
  screen({
    id: 'arena.product.screen.unlock.v1',
    activeState: PRODUCT_SESSION_STATE.UNLOCK,
    kind: PRODUCT_SCREEN_KIND.UNLOCK,
    sceneId: 'unlock',
    titleMessageId: 'screen.unlock.title',
    bodyMessageId: 'screen.unlock.body',
    primaryAction: action(PRODUCT_UI_INTENT_ID.DISMISS_UNLOCKS, 'action.continue'),
    secondaryAction: action(PRODUCT_UI_INTENT_ID.REQUEST_REMATCH, 'action.rematch'),
  }),
  screen({
    id: 'arena.product.screen.recoverable-error.v1',
    activeState: PRODUCT_SESSION_STATE.RECOVERABLE_ERROR,
    kind: PRODUCT_SCREEN_KIND.ERROR,
    sceneId: 'recoverable-error',
    titleMessageId: 'screen.recoverable-error.title',
    bodyMessageId: 'screen.recoverable-error.body',
    primaryAction: action(PRODUCT_UI_INTENT_ID.RETRY, 'action.retry'),
  }),
  screen({
    id: 'arena.product.screen.fatal-error.v1',
    activeState: PRODUCT_SESSION_STATE.FATAL_ERROR,
    kind: PRODUCT_SCREEN_KIND.ERROR,
    sceneId: 'fatal-error',
    titleMessageId: 'screen.fatal-error.title',
    bodyMessageId: 'screen.fatal-error.body',
  }),
  screen({
    id: 'arena.product.screen.destroyed.v1',
    activeState: PRODUCT_SESSION_STATE.DESTROYED,
    kind: PRODUCT_SCREEN_KIND.TERMINAL,
    sceneId: 'destroyed',
    titleMessageId: 'screen.destroyed.title',
  }),
]);

export const ARENA_V1_ZH_CN_PRODUCT_MESSAGES = new ProductMessageCatalog({
  schemaVersion: PRODUCT_MESSAGE_CATALOG_SCHEMA_VERSION,
  id: 'arena.product.messages.zh-CN.v1',
  contentVersion: 1,
  locale: 'zh-CN',
  messages: {
    'action.choose-character': '选择角色',
    'action.confirm-character': '确认选择',
    'action.continue': '继续',
    'action.rematch': '再来一局',
    'action.retry': '重试',
    'action.start-match': '开始匹配',
    'character.parkour-apprentice.name': '跑酷学徒',
    'character.wind-up-cube.name': '发条方块',
    'error.cleanup-failed': '资源清理未完成，请重新进入',
    'error.lifecycle-failed': '恢复游戏失败，请重试',
    'error.match-prepare-failed': '暂时无法开始，进度已保留',
    'error.match-runtime-failed': '本局发生错误，进度已保留',
    'error.profile-load-failed': '进度读取失败，请重试',
    'error.profile-save-failed': '角色保存失败，请重试',
    'error.reward-processing-failed': '奖励处理失败，请重新进入',
    'error.reward-save-failed': '奖励保存失败，请重试',
    'result.draw.title': '平局',
    'result.lose.title': '再试一次',
    'result.win.title': '胜利',
    'screen.character-select.title': '选择角色',
    'screen.destroyed.title': '游戏已关闭',
    'screen.fatal-error.body': '请重新进入游戏',
    'screen.fatal-error.title': '暂时无法继续',
    'screen.gameplay.title': '对局进行中',
    'screen.home.body': '争夺装备，把对手击出平台',
    'screen.home.title': '竞技场',
    'screen.loading.title': '正在读取进度',
    'screen.matching.body': '正在寻找对手…',
    'screen.matching.title': '正在匹配',
    'screen.preparing.body': '即将进入竞技场',
    'screen.preparing.title': '准备开始',
    'screen.recoverable-error.body': '进度已保留，请重试',
    'screen.recoverable-error.title': '暂时无法开始',
    'screen.results.body': '正在保存本局结果',
    'screen.results.title': '对局结束',
    'screen.reward.body': '经验 +{experienceDelta}',
    'screen.reward.title': '奖励已发放',
    'screen.unlock.body': '可以在下一局使用',
    'screen.unlock.title': '新内容已解锁',
  },
});

function characterContent(characterDefinitionId, nameMessageId) {
  const presentation = ARENA_V1_GREYBOX_CONTENT.characters[characterDefinitionId];
  if (!presentation) {
    throw new RangeError(`Character ${characterDefinitionId} 缺少灰盒表现内容。`);
  }
  return {
    schemaVersion: PRODUCT_CONTENT_PRESENTATION_DEFINITION_SCHEMA_VERSION,
    id: `arena.product.content.character.${characterDefinitionId}.v1`,
    contentVersion: 1,
    contentKind: PRODUCT_CONTENT_KIND.CHARACTER,
    contentId: characterDefinitionId,
    nameMessageId,
    previewAssetId: presentation.modelAssetId,
    selectable: true,
  };
}

export const ARENA_V1_PRODUCT_CONTENT_PRESENTATION_REGISTRY = (
  new ProductContentPresentationRegistry([
    characterContent(
      ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
      'character.parkour-apprentice.name',
    ),
    characterContent(
      ARENA_V1_CHARACTER_ID.WIND_UP_CUBE,
      'character.wind-up-cube.name',
    ),
  ])
);

export const ARENA_V1_PRODUCT_PRESENTATION_CONTENT = Object.freeze({
  schemaVersion: 1,
  screenRegistry: ARENA_V1_PRODUCT_SCREEN_REGISTRY,
  messageCatalog: ARENA_V1_ZH_CN_PRODUCT_MESSAGES,
  contentRegistry: ARENA_V1_PRODUCT_CONTENT_PRESENTATION_REGISTRY,
});
