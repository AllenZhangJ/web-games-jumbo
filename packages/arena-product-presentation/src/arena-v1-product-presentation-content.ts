import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';
import {
  PRODUCT_UI_INTENT_ID,
  type ProductUiIntentId,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  PRODUCT_SESSION_STATE,
} from '@number-strategy-jump/arena-product-state';
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
  type ProductScreenActionDefinition,
  type ProductScreenActiveState,
  type ProductScreenKind,
} from './product-screen-definition.js';
import { ProductScreenRegistry } from './product-screen-registry.js';

export const ARENA_V1_PRODUCT_PRESENTATION_CONTENT_SCHEMA_VERSION = 1 as const;

export interface ArenaV1ProductPresentationContent {
  readonly schemaVersion: typeof ARENA_V1_PRODUCT_PRESENTATION_CONTENT_SCHEMA_VERSION;
  readonly screenRegistry: ProductScreenRegistry;
  readonly messageCatalog: ProductMessageCatalog;
  readonly contentRegistry: ProductContentPresentationRegistry;
}

type ScreenOptions = Readonly<{
  id: string;
  activeState: ProductScreenActiveState;
  kind: ProductScreenKind;
  sceneId: string;
  titleMessageId: string;
  bodyMessageId?: string | null;
  primaryAction?: ProductScreenActionDefinition | null;
  secondaryAction?: ProductScreenActionDefinition | null;
  announcementMessageId?: string;
}>;

function action(intentId: ProductUiIntentId, labelMessageId: string): ProductScreenActionDefinition {
  return Object.freeze({ intentId, labelMessageId });
}

function screen(options: ScreenOptions): object {
  return {
    schemaVersion: PRODUCT_SCREEN_DEFINITION_SCHEMA_VERSION,
    id: options.id,
    contentVersion: 1,
    activeState: options.activeState,
    kind: options.kind,
    sceneId: options.sceneId,
    titleMessageId: options.titleMessageId,
    bodyMessageId: options.bodyMessageId ?? null,
    primaryAction: options.primaryAction ?? null,
    secondaryAction: options.secondaryAction ?? null,
    announcementMessageId: options.announcementMessageId ?? options.titleMessageId,
  };
}

export const ARENA_V1_PRODUCT_SCREEN_REGISTRY = new ProductScreenRegistry([
  screen({ id: 'arena.product.screen.boot.v1', activeState: PRODUCT_SESSION_STATE.BOOT, kind: PRODUCT_SCREEN_KIND.LOADING, sceneId: 'loading', titleMessageId: 'screen.loading.title' }),
  screen({ id: 'arena.product.screen.loading-profile.v1', activeState: PRODUCT_SESSION_STATE.LOADING_PROFILE, kind: PRODUCT_SCREEN_KIND.LOADING, sceneId: 'loading', titleMessageId: 'screen.loading.title' }),
  screen({
    id: 'arena.product.screen.ready.v1', activeState: PRODUCT_SESSION_STATE.READY,
    kind: PRODUCT_SCREEN_KIND.MENU, sceneId: 'home', titleMessageId: 'screen.home.title',
    bodyMessageId: 'screen.home.body',
    primaryAction: action(PRODUCT_UI_INTENT_ID.START_MATCH, 'action.start-match'),
    secondaryAction: action(PRODUCT_UI_INTENT_ID.OPEN_CHARACTER_SELECT, 'action.choose-character'),
  }),
  screen({
    id: 'arena.product.screen.character-select.v1',
    activeState: PRODUCT_SESSION_STATE.CHARACTER_SELECT, kind: PRODUCT_SCREEN_KIND.MENU,
    sceneId: 'character-select', titleMessageId: 'screen.character-select.title',
    primaryAction: action(PRODUCT_UI_INTENT_ID.CLOSE_CHARACTER_SELECT, 'action.confirm-character'),
  }),
  screen({ id: 'arena.product.screen.matching.v1', activeState: PRODUCT_SESSION_STATE.MATCHING, kind: PRODUCT_SCREEN_KIND.MATCHING, sceneId: 'matching', titleMessageId: 'screen.matching.title', bodyMessageId: 'screen.matching.body' }),
  screen({ id: 'arena.product.screen.preparing.v1', activeState: PRODUCT_SESSION_STATE.PREPARING, kind: PRODUCT_SCREEN_KIND.MATCHING, sceneId: 'matching', titleMessageId: 'screen.preparing.title', bodyMessageId: 'screen.preparing.body' }),
  screen({ id: 'arena.product.screen.in-match.v1', activeState: PRODUCT_SESSION_STATE.IN_MATCH, kind: PRODUCT_SCREEN_KIND.GAMEPLAY, sceneId: 'gameplay', titleMessageId: 'screen.gameplay.title' }),
  screen({ id: 'arena.product.screen.results.v1', activeState: PRODUCT_SESSION_STATE.RESULTS, kind: PRODUCT_SCREEN_KIND.RESULT, sceneId: 'result', titleMessageId: 'screen.results.title', bodyMessageId: 'screen.results.body' }),
  screen({
    id: 'arena.product.screen.reward.v1', activeState: PRODUCT_SESSION_STATE.REWARD,
    kind: PRODUCT_SCREEN_KIND.RESULT, sceneId: 'reward', titleMessageId: 'screen.reward.title',
    bodyMessageId: 'screen.reward.body',
    primaryAction: action(PRODUCT_UI_INTENT_ID.REQUEST_REMATCH, 'action.rematch'),
    secondaryAction: action(PRODUCT_UI_INTENT_ID.CONTINUE_REWARD, 'action.continue'),
  }),
  screen({
    id: 'arena.product.screen.unlock.v1', activeState: PRODUCT_SESSION_STATE.UNLOCK,
    kind: PRODUCT_SCREEN_KIND.UNLOCK, sceneId: 'unlock', titleMessageId: 'screen.unlock.title',
    bodyMessageId: 'screen.unlock.body',
    primaryAction: action(PRODUCT_UI_INTENT_ID.DISMISS_UNLOCKS, 'action.continue'),
    secondaryAction: action(PRODUCT_UI_INTENT_ID.REQUEST_REMATCH, 'action.rematch'),
  }),
  screen({
    id: 'arena.product.screen.recoverable-error.v1',
    activeState: PRODUCT_SESSION_STATE.RECOVERABLE_ERROR, kind: PRODUCT_SCREEN_KIND.ERROR,
    sceneId: 'recoverable-error', titleMessageId: 'screen.recoverable-error.title',
    bodyMessageId: 'screen.recoverable-error.body',
    primaryAction: action(PRODUCT_UI_INTENT_ID.RETRY, 'action.retry'),
  }),
  screen({ id: 'arena.product.screen.fatal-error.v1', activeState: PRODUCT_SESSION_STATE.FATAL_ERROR, kind: PRODUCT_SCREEN_KIND.ERROR, sceneId: 'fatal-error', titleMessageId: 'screen.fatal-error.title', bodyMessageId: 'screen.fatal-error.body' }),
  screen({ id: 'arena.product.screen.destroyed.v1', activeState: PRODUCT_SESSION_STATE.DESTROYED, kind: PRODUCT_SCREEN_KIND.TERMINAL, sceneId: 'destroyed', titleMessageId: 'screen.destroyed.title' }),
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
    'equipment.chain.name': '引力锁链',
    'equipment.hammer.name': '重锤',
    'equipment.shield.name': '冲锋盾',
    'equipment.chain.role': '牵制与拉位',
    'equipment.hammer.role': '重击与击飞',
    'equipment.shield.role': '突进与换位',
    'equipment.chain.description': '远距离命中后把对手拉回，适合控制站位。',
    'equipment.hammer.description': '前摇较长但击飞强，命中一次就能改变边缘位置。',
    'equipment.shield.description': '向前冲撞并带动自身位移，用距离换取主动权。',
    'equipment.chain.core-verb': '拉位',
    'equipment.hammer.core-verb': '推离',
    'equipment.shield.core-verb': '冲入',
    'equipment.chain.tradeoff': '距离长但命中角度窄，空挥后会失去主动。',
    'equipment.hammer.tradeoff': '击飞强但出手慢，挥空后暴露时间长。',
    'equipment.shield.tradeoff': '自身位移大，冲过头会把自己送进危险区。',
    'equipment.chain.counterplay': '横向移动或跳跃，逼它错过拉位时机。',
    'equipment.hammer.counterplay': '离开正面攻击线，诱导挥空后再接近。',
    'equipment.shield.counterplay': '让出直线并从侧面绕开冲撞。',
    'equipment.chain.hit-result': '命中后把对手拉回或改变双方距离，重点是改位置而非重击飞。',
    'equipment.hammer.hit-result': '命中后产生强横向击飞，并用垂直冲量改变对手落点。',
    'equipment.shield.hit-result': '命中后造成较轻击飞，但用自身冲量快速换到另一侧位置。',
    'equipment.chain.map-use': '宽平台和高低差适合远距拉位；窄路入口适合阻止对手直线通过。',
    'equipment.hammer.map-use': '平台边缘和窄路最能放大击飞；宽平台需要提前读落点。',
    'equipment.shield.map-use': '长直线适合冲入抢位；断层边缘要控制冲过头的自身风险。',
    'equipment.context.ground': '地面',
    'equipment.context.aerial': '空中',
    'equipment.chain.ground-summary': '远距离命中后拉开双方站位。',
    'equipment.chain.aerial-summary': '俯冲覆盖更宽，但击飞较轻。',
    'equipment.hammer.ground-summary': '近身重击，把目标推向边缘。',
    'equipment.hammer.aerial-summary': '下砸范围更大，垂直控制更强。',
    'equipment.shield.ground-summary': '冲撞换自身位移，抢直线位置。',
    'equipment.shield.aerial-summary': '下砸改变落点，适合压过窄路。',
    'equipment.stat.range': '有效距离',
    'equipment.stat.coverage': '覆盖宽度',
    'equipment.stat.startup': '出招速度',
    'equipment.stat.recovery': '收招安全',
    'equipment.stat.impact': '横向击飞',
    'equipment.stat.vertical': '纵向控制',
    'equipment.stat.control': '硬直时间',
    'equipment.stat.self-movement': '自身位移风险',
        'equipment.stat.cooldown': '再次使用',
        'equipment.stat.active-span': '有效窗口',
        'equipment.stat.direction-tolerance': '方向容错角',
    'equipment.stat.height-gap': '命中高度差',
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

const CHARACTER_IDS = Object.freeze([
  ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
  ARENA_V1_CHARACTER_ID.WIND_UP_CUBE,
]);
const CHARACTER_KEYS = new Set<string>(CHARACTER_IDS);
const PRESENTATION_KEYS = new Set<string>([
  ...CHARACTER_KEYS,
  'equipmentOverview',
]);
const NAME_MESSAGE_BY_CHARACTER_ID: Readonly<Record<string, string>> = Object.freeze({
  [ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE]: 'character.parkour-apprentice.name',
  [ARENA_V1_CHARACTER_ID.WIND_UP_CUBE]: 'character.wind-up-cube.name',
});

export function createArenaV1ProductPresentationContent(
  characterPreviewAssetIdsValue: unknown,
): ArenaV1ProductPresentationContent {
  const source = cloneFrozenData(
    characterPreviewAssetIdsValue,
    'Arena V1 product character preview assets',
  );
  assertKnownKeys(source, PRESENTATION_KEYS, 'Arena V1 product presentation assets');
  const definitions: unknown[] = CHARACTER_IDS.map((characterDefinitionId) => ({
    schemaVersion: PRODUCT_CONTENT_PRESENTATION_DEFINITION_SCHEMA_VERSION,
    id: `arena.product.content.character.${characterDefinitionId}.v1`,
    contentVersion: 1,
    contentKind: PRODUCT_CONTENT_KIND.CHARACTER,
    contentId: characterDefinitionId,
    nameMessageId: NAME_MESSAGE_BY_CHARACTER_ID[characterDefinitionId],
    previewAssetId: assertNonEmptyString(
      source[characterDefinitionId],
      `Arena V1 product character preview assets.${characterDefinitionId}`,
    ),
    selectable: true,
  }));
  const equipmentOverview = source.equipmentOverview;
  if (equipmentOverview !== undefined) {
    const overviewRecord = assertPlainRecord(
      equipmentOverview,
      'Arena V1 product equipment overview',
    );
    const equipmentDefinitions = Object.keys(overviewRecord).sort().map((equipmentId) => ({
      schemaVersion: PRODUCT_CONTENT_PRESENTATION_DEFINITION_SCHEMA_VERSION,
      id: `arena.product.content.equipment.${equipmentId}.v1`,
      contentVersion: 1,
      contentKind: PRODUCT_CONTENT_KIND.EQUIPMENT,
      contentId: equipmentId,
      nameMessageId: `equipment.${equipmentId}.name`,
      previewAssetId: `weapon:${equipmentId}`,
      selectable: false,
      overview: overviewRecord[equipmentId],
    }));
    definitions.push(...equipmentDefinitions);
  }
  return Object.freeze({
    schemaVersion: ARENA_V1_PRODUCT_PRESENTATION_CONTENT_SCHEMA_VERSION,
    screenRegistry: ARENA_V1_PRODUCT_SCREEN_REGISTRY,
    messageCatalog: ARENA_V1_ZH_CN_PRODUCT_MESSAGES,
    contentRegistry: new ProductContentPresentationRegistry(definitions),
  });
}
