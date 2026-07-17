import { PRODUCT_SESSION_ERROR_CODE } from '../../product/state/product-session-error.js';
import { PRODUCT_SESSION_STATE } from '../../product/state/product-session-transition-definition.js';
import {
  assertProductMatchSeed,
  createProductPublicOpponent,
  validateProductMatchResult,
} from '../../product/matchmaking/product-match-result.js';
import { createRewardGrant } from '../../product/progression/reward-grant.js';
import {
  assertIntegerAtLeast,
  assertNonEmptyString,
  cloneFrozenData,
} from '../../rules/definition-utils.js';
import { createMatchContentPublicView } from '../../content/match-content-selection.js';
import { assertProductContentPresentationRegistry } from './product-content-presentation-registry.js';
import { PRODUCT_CONTENT_KIND } from './product-content-presentation-definition.js';
import { createProductMessageCatalog } from './product-message-catalog.js';
import { assertProductScreenRegistry } from './product-screen-registry.js';
import { createProductUiIntent } from './product-ui-intent.js';

export const PRODUCT_SESSION_VIEW_MODEL_SCHEMA_VERSION = 1;

const BUSY_STATES = new Set([
  PRODUCT_SESSION_STATE.BOOT,
  PRODUCT_SESSION_STATE.LOADING_PROFILE,
  PRODUCT_SESSION_STATE.MATCHING,
  PRODUCT_SESSION_STATE.PREPARING,
  PRODUCT_SESSION_STATE.RESULTS,
]);
const TERMINAL_STATES = new Set([
  PRODUCT_SESSION_STATE.FATAL_ERROR,
  PRODUCT_SESSION_STATE.DESTROYED,
]);
const RESULT_STATES = new Set([
  PRODUCT_SESSION_STATE.RESULTS,
  PRODUCT_SESSION_STATE.REWARD,
  PRODUCT_SESSION_STATE.UNLOCK,
]);
const ERROR_MESSAGE_BY_CODE = Object.freeze({
  [PRODUCT_SESSION_ERROR_CODE.PROFILE_LOAD_FAILED]: 'error.profile-load-failed',
  [PRODUCT_SESSION_ERROR_CODE.PROFILE_SAVE_FAILED]: 'error.profile-save-failed',
  [PRODUCT_SESSION_ERROR_CODE.REWARD_SAVE_FAILED]: 'error.reward-save-failed',
  [PRODUCT_SESSION_ERROR_CODE.REWARD_PROCESSING_FAILED]: 'error.reward-processing-failed',
  [PRODUCT_SESSION_ERROR_CODE.MATCH_PREPARE_FAILED]: 'error.match-prepare-failed',
  [PRODUCT_SESSION_ERROR_CODE.MATCH_RUNTIME_FAILED]: 'error.match-runtime-failed',
  [PRODUCT_SESSION_ERROR_CODE.LIFECYCLE_FAILED]: 'error.lifecycle-failed',
  [PRODUCT_SESSION_ERROR_CODE.CLEANUP_FAILED]: 'error.cleanup-failed',
});

function activeState(source) {
  const visible = assertNonEmptyString(source.state.state, 'Product snapshot state.state');
  if (visible === PRODUCT_SESSION_STATE.SUSPENDED) {
    return assertNonEmptyString(
      source.state.activeState,
      'Product snapshot state.activeState',
    );
  }
  return visible;
}

function actionView(definition, messages, enabled) {
  if (definition === null) return null;
  return Object.freeze({
    label: messages.format(definition.labelMessageId),
    intent: createProductUiIntent({ id: definition.intentId }),
    enabled,
  });
}

function booleanValue(value, name) {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

function profileView(source, contentRegistry, messages) {
  if (source.profile === null) return Object.freeze({ profile: null, characterOptions: [] });
  const selectedCharacterId = assertNonEmptyString(
    source.profile.selection.characterId,
    'Product snapshot profile.selection.characterId',
  );
  if (!Array.isArray(source.profile.unlocks.characterIds)) {
    throw new TypeError('Product snapshot profile.unlocks.characterIds 必须是数组。');
  }
  if (new Set(source.profile.unlocks.characterIds).size !== source.profile.unlocks.characterIds.length) {
    throw new RangeError('Product snapshot profile.unlocks.characterIds 不能包含重复项。');
  }
  const characterOptions = source.profile.unlocks.characterIds
    .map((characterDefinitionId) => contentRegistry.requireContent(
      PRODUCT_CONTENT_KIND.CHARACTER,
      characterDefinitionId,
    ))
    .map((definition) => {
      if (!definition.selectable) {
        throw new RangeError(
          `Product ViewModel 已解锁角色 ${definition.contentId} 不是可选择内容。`,
        );
      }
      return Object.freeze({
        characterDefinitionId: definition.contentId,
        name: messages.format(definition.nameMessageId),
        previewAssetId: definition.previewAssetId,
        selected: definition.contentId === selectedCharacterId,
        selectIntent: createProductUiIntent({
          id: 'select-character',
          characterDefinitionId: definition.contentId,
        }),
      });
    });
  if (!characterOptions.some(({ selected }) => selected)) {
    throw new RangeError('Product ViewModel 当前选择缺少可选表现定义。');
  }
  return Object.freeze({
    profile: Object.freeze({
      revision: assertIntegerAtLeast(
        source.profile.revision,
        0,
        'Product snapshot profile.revision',
      ),
      experience: assertIntegerAtLeast(
        source.profile.progression.experience,
        0,
        'Product snapshot profile.progression.experience',
      ),
      selectedCharacterId,
      soundEnabled: booleanValue(
        source.profile.settings.soundEnabled,
        'Product snapshot profile.settings.soundEnabled',
      ),
      reducedMotion: booleanValue(
        source.profile.settings.reducedMotion,
        'Product snapshot profile.settings.reducedMotion',
      ),
      qualityProfile: assertNonEmptyString(
        source.profile.settings.qualityProfile,
        'Product snapshot profile.settings.qualityProfile',
      ),
    }),
    characterOptions: Object.freeze(characterOptions),
  });
}

function publicMatchView(source) {
  const info = source.match?.publicMatchInfo;
  if (info === null || info === undefined) return null;
  const opponent = createProductPublicOpponent(info.opponent);
  const content = createMatchContentPublicView(info.content);
  return Object.freeze({
    matchSeed: assertProductMatchSeed(info.matchSeed),
    opponent: Object.freeze({
      displayName: opponent.displayName,
      portraitKey: opponent.portraitKey,
      appearanceKey: opponent.appearanceKey,
    }),
    contentHash: content.contentHash,
    selectedMapDefinitionId: content.selectedMapDefinitionId,
  });
}

function resultView(resultValue) {
  if (resultValue === null || resultValue === undefined) return null;
  const result = validateProductMatchResult(resultValue);
  const authorityResult = result.authorityResult;
  if (!authorityResult || typeof authorityResult !== 'object') {
    throw new TypeError('Product ViewModel result 缺少 authorityResult。');
  }
  if (
    authorityResult.winnerId !== null
    && authorityResult.winnerId !== 'player-1'
    && authorityResult.winnerId !== 'player-2'
  ) {
    throw new RangeError('Product ViewModel result 包含未知 winnerId。');
  }
  const outcome = authorityResult.isDraw
    ? 'draw'
    : authorityResult.winnerId === 'player-1' ? 'win' : 'lose';
  return Object.freeze({
    outcome,
    endedAtTick: authorityResult.endedAtTick,
    authorityHash: assertNonEmptyString(
      result.authorityHash,
      'Product ViewModel result.authorityHash',
    ),
  });
}

function rewardView(source, contentRegistry, messages) {
  if (source.reward === null) return Object.freeze({ reward: null, unlocks: [] });
  const grant = createRewardGrant(source.reward.grant);
  if (typeof source.reward.committed !== 'boolean' || typeof source.reward.duplicate !== 'boolean') {
    throw new TypeError('Product ViewModel reward 提交标记必须是布尔值。');
  }
  const unlocks = [];
  for (const [profileKey, kind] of [
    ['characterIds', PRODUCT_CONTENT_KIND.CHARACTER],
    ['appearanceIds', PRODUCT_CONTENT_KIND.APPEARANCE],
    ['equipmentIds', PRODUCT_CONTENT_KIND.EQUIPMENT],
    ['mapIds', PRODUCT_CONTENT_KIND.MAP],
  ]) {
    for (const contentId of grant.unlocks[profileKey]) {
      const definition = contentRegistry.requireContent(kind, contentId);
      unlocks.push(Object.freeze({
        kind,
        contentId,
        name: messages.format(definition.nameMessageId),
        previewAssetId: definition.previewAssetId,
      }));
    }
  }
  return Object.freeze({
    reward: Object.freeze({
      experienceDelta: grant.experienceDelta,
      committed: source.reward.committed,
      duplicate: source.reward.duplicate,
    }),
    unlocks: Object.freeze(unlocks),
  });
}

function publicError(source, messages) {
  if (source.lastError === null) return null;
  const messageId = ERROR_MESSAGE_BY_CODE[source.lastError.code];
  if (!messageId) throw new RangeError('Product ViewModel 收到未知公开错误码。');
  return Object.freeze({ code: source.lastError.code, message: messages.format(messageId) });
}

export function createProductSessionViewModel(snapshotValue, {
  screenRegistry: screenRegistryValue,
  messageCatalog: messageCatalogValue,
  contentRegistry: contentRegistryValue,
  lastMatchResult = null,
}) {
  const source = cloneFrozenData(snapshotValue, 'ProductSession snapshot for ViewModel');
  const screenRegistry = assertProductScreenRegistry(screenRegistryValue);
  const messages = createProductMessageCatalog(messageCatalogValue);
  const contentRegistry = assertProductContentPresentationRegistry(contentRegistryValue);
  const currentActiveState = activeState(source);
  const definition = screenRegistry.requireForState(currentActiveState);
  const suspended = source.state.state === PRODUCT_SESSION_STATE.SUSPENDED;
  const busy = BUSY_STATES.has(currentActiveState);
  const terminal = TERMINAL_STATES.has(currentActiveState);
  const inputEnabled = !suspended && !busy && !terminal;
  const result = RESULT_STATES.has(currentActiveState)
    ? resultView(lastMatchResult ?? source.match?.result ?? null)
    : null;
  const profile = profileView(source, contentRegistry, messages);
  const reward = rewardView(source, contentRegistry, messages);
  if (
    (currentActiveState === PRODUCT_SESSION_STATE.REWARD
      || currentActiveState === PRODUCT_SESSION_STATE.UNLOCK)
    && reward.reward === null
  ) {
    throw new RangeError(`Product ViewModel ${currentActiveState} 状态缺少奖励快照。`);
  }
  let titleMessageId = definition.titleMessageId;
  if (
    result !== null
    && (currentActiveState === PRODUCT_SESSION_STATE.RESULTS
      || currentActiveState === PRODUCT_SESSION_STATE.REWARD)
  ) titleMessageId = `result.${result.outcome}.title`;
  let body = definition.bodyMessageId === null
    ? null
    : messages.format(definition.bodyMessageId, (
      currentActiveState === PRODUCT_SESSION_STATE.REWARD
        ? { experienceDelta: reward.reward?.experienceDelta ?? 0 }
        : {}
    ));
  const error = publicError(source, messages);
  if (error !== null && currentActiveState === PRODUCT_SESSION_STATE.RECOVERABLE_ERROR) {
    body = error.message;
  }
  const announcementMessageId = titleMessageId === definition.titleMessageId
    ? definition.announcementMessageId
    : titleMessageId;
  return Object.freeze({
    schemaVersion: PRODUCT_SESSION_VIEW_MODEL_SCHEMA_VERSION,
    revision: assertIntegerAtLeast(
      source.state.revision,
      0,
      'Product snapshot state.revision',
    ),
    locale: messages.locale,
    visibleState: source.state.state,
    activeState: currentActiveState,
    suspended,
    busy,
    terminal,
    inputEnabled,
    screen: Object.freeze({
      definitionId: definition.id,
      definitionHash: definition.getContentHash(),
      kind: definition.kind,
      sceneId: definition.sceneId,
      title: messages.format(titleMessageId),
      body,
      announcement: messages.format(announcementMessageId),
      primaryAction: actionView(definition.primaryAction, messages, inputEnabled),
      secondaryAction: actionView(definition.secondaryAction, messages, inputEnabled),
    }),
    profile: profile.profile,
    characterOptions: profile.characterOptions,
    match: publicMatchView(source),
    result,
    reward: reward.reward,
    unlocks: reward.unlocks,
    error,
  });
}
