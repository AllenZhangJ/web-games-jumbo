import {
  assertIntegerAtLeast,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createMatchContentPublicView,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  assertProductMatchSeed,
  createProductPublicOpponent,
  validateProductMatchResult,
} from '@number-strategy-jump/arena-product-contracts';
import {
  createProductUiIntent,
  type ProductUiIntent,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  PRODUCT_SESSION_ERROR_CODE,
  PRODUCT_SESSION_STATE,
  type ProductSessionErrorCode,
  type ProductSessionState,
} from '@number-strategy-jump/arena-product-state';
import { createRewardGrant } from '@number-strategy-jump/arena-progression';
import { ARENA_V1_PRODUCT_PRESENTATION_CONTENT_SCHEMA_VERSION } from './arena-v1-product-presentation-content.js';
import { ownOptions } from './capability-utils.js';
import { markTrustedProductSessionViewModel } from './product-view-model-trust.js';
import {
  PRODUCT_CONTENT_KIND,
  type ProductContentKind,
} from './product-content-presentation-definition.js';
import {
  assertProductContentPresentationRegistry,
  type ProductContentPresentationRegistry,
} from './product-content-presentation-registry.js';
import {
  createProductMessageCatalog,
  type ProductMessageCatalog,
} from './product-message-catalog.js';
import {
  type ProductScreenActionDefinition,
  type ProductScreenActiveState,
  type ProductScreenKind,
} from './product-screen-definition.js';
import {
  assertProductScreenRegistry,
  type ProductScreenRegistry,
} from './product-screen-registry.js';

export const PRODUCT_SESSION_VIEW_MODEL_SCHEMA_VERSION = 1 as const;

export interface ProductSessionViewModelAction {
  readonly label: string;
  readonly intent: ProductUiIntent;
  readonly enabled: boolean;
}

export interface ProductSessionViewModel {
  readonly schemaVersion: typeof PRODUCT_SESSION_VIEW_MODEL_SCHEMA_VERSION;
  readonly revision: number;
  readonly locale: string;
  readonly visibleState: ProductSessionState;
  readonly activeState: ProductScreenActiveState;
  readonly suspended: boolean;
  readonly busy: boolean;
  readonly terminal: boolean;
  readonly inputEnabled: boolean;
  readonly screen: Readonly<{
    definitionId: string;
    definitionHash: string;
    kind: ProductScreenKind;
    sceneId: string;
    title: string;
    body: string | null;
    announcement: string;
    primaryAction: ProductSessionViewModelAction | null;
    secondaryAction: ProductSessionViewModelAction | null;
  }>;
  readonly profile: Readonly<{
    revision: number;
    experience: number;
    selectedCharacterId: string;
    soundEnabled: boolean;
    reducedMotion: boolean;
    qualityProfile: string;
  }> | null;
  readonly characterOptions: readonly Readonly<{
    characterDefinitionId: string;
    name: string;
    previewAssetId: string;
    selected: boolean;
    selectIntent: ProductUiIntent;
  }>[];
  readonly match: Readonly<{
    matchSeed: number;
    opponent: Readonly<{ displayName: string; portraitKey: string; appearanceKey: string }>;
    contentHash: string;
    selectedMapDefinitionId: string;
  }> | null;
  readonly result: Readonly<{
    outcome: 'draw' | 'win' | 'lose';
    endedAtTick: number;
    authorityHash: string;
  }> | null;
  readonly reward: Readonly<{
    experienceDelta: number;
    committed: boolean;
    duplicate: boolean;
  }> | null;
  readonly unlocks: readonly Readonly<{
    kind: ProductContentKind;
    contentId: string;
    name: string;
    previewAssetId: string;
  }>[];
  readonly error: Readonly<{ code: ProductSessionErrorCode; message: string }> | null;
}

export interface ProductSessionViewModelOptions {
  readonly schemaVersion?: typeof ARENA_V1_PRODUCT_PRESENTATION_CONTENT_SCHEMA_VERSION;
  readonly screenRegistry: ProductScreenRegistry;
  readonly messageCatalog: ProductMessageCatalog | unknown;
  readonly contentRegistry: ProductContentPresentationRegistry;
  readonly lastMatchResult?: unknown;
}

const OPTION_KEYS = new Set([
  'schemaVersion', 'screenRegistry', 'messageCatalog', 'contentRegistry', 'lastMatchResult',
]);
const BUSY_STATES: ReadonlySet<string> = new Set([
  PRODUCT_SESSION_STATE.BOOT,
  PRODUCT_SESSION_STATE.LOADING_PROFILE,
  PRODUCT_SESSION_STATE.MATCHING,
  PRODUCT_SESSION_STATE.PREPARING,
  PRODUCT_SESSION_STATE.RESULTS,
]);
const TERMINAL_STATES: ReadonlySet<string> = new Set([
  PRODUCT_SESSION_STATE.FATAL_ERROR,
  PRODUCT_SESSION_STATE.DESTROYED,
]);
const RESULT_STATES: ReadonlySet<string> = new Set([
  PRODUCT_SESSION_STATE.RESULTS,
  PRODUCT_SESSION_STATE.REWARD,
  PRODUCT_SESSION_STATE.UNLOCK,
]);
const ERROR_MESSAGE_BY_CODE: Readonly<Partial<Record<ProductSessionErrorCode, string>>>
  = Object.freeze({
    [PRODUCT_SESSION_ERROR_CODE.PROFILE_LOAD_FAILED]: 'error.profile-load-failed',
    [PRODUCT_SESSION_ERROR_CODE.PROFILE_SAVE_FAILED]: 'error.profile-save-failed',
    [PRODUCT_SESSION_ERROR_CODE.REWARD_SAVE_FAILED]: 'error.reward-save-failed',
    [PRODUCT_SESSION_ERROR_CODE.REWARD_PROCESSING_FAILED]: 'error.reward-processing-failed',
    [PRODUCT_SESSION_ERROR_CODE.MATCH_PREPARE_FAILED]: 'error.match-prepare-failed',
    [PRODUCT_SESSION_ERROR_CODE.MATCH_RUNTIME_FAILED]: 'error.match-runtime-failed',
    [PRODUCT_SESSION_ERROR_CODE.LIFECYCLE_FAILED]: 'error.lifecycle-failed',
    [PRODUCT_SESSION_ERROR_CODE.CLEANUP_FAILED]: 'error.cleanup-failed',
  });

function record(value: unknown, name: string): PlainRecord {
  return assertPlainRecord(value, name);
}

function activeState(source: PlainRecord): ProductScreenActiveState {
  const state = record(source.state, 'Product snapshot state');
  const visible = assertNonEmptyString(state.state, 'Product snapshot state.state');
  const active = visible === PRODUCT_SESSION_STATE.SUSPENDED
    ? assertNonEmptyString(state.activeState, 'Product snapshot state.activeState')
    : visible;
  return active as ProductScreenActiveState;
}

function actionView(
  definition: ProductScreenActionDefinition | null,
  messages: ProductMessageCatalog,
  enabled: boolean,
): ProductSessionViewModelAction | null {
  if (definition === null) return null;
  return markTrustedProductSessionViewModel(Object.freeze({
    label: messages.format(definition.labelMessageId),
    intent: createProductUiIntent({ id: definition.intentId }),
    enabled,
  }));
}

function booleanValue(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

function profileView(
  source: PlainRecord,
  contentRegistry: ProductContentPresentationRegistry,
  messages: ProductMessageCatalog,
): Pick<ProductSessionViewModel, 'profile' | 'characterOptions'> {
  if (source.profile === null) return Object.freeze({ profile: null, characterOptions: [] });
  const profile = record(source.profile, 'Product snapshot profile');
  const selection = record(profile.selection, 'Product snapshot profile.selection');
  const unlocks = record(profile.unlocks, 'Product snapshot profile.unlocks');
  const progression = record(profile.progression, 'Product snapshot profile.progression');
  const settings = record(profile.settings, 'Product snapshot profile.settings');
  const selectedCharacterId = assertNonEmptyString(
    selection.characterId,
    'Product snapshot profile.selection.characterId',
  );
  if (!Array.isArray(unlocks.characterIds)) {
    throw new TypeError('Product snapshot profile.unlocks.characterIds 必须是数组。');
  }
  if (new Set(unlocks.characterIds).size !== unlocks.characterIds.length) {
    throw new RangeError('Product snapshot profile.unlocks.characterIds 不能包含重复项。');
  }
  const characterOptions = unlocks.characterIds
    .map((value, index) => assertNonEmptyString(
      value,
      `Product snapshot profile.unlocks.characterIds[${index}]`,
    ))
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
      revision: assertIntegerAtLeast(profile.revision, 0, 'Product snapshot profile.revision'),
      experience: assertIntegerAtLeast(
        progression.experience,
        0,
        'Product snapshot profile.progression.experience',
      ),
      selectedCharacterId,
      soundEnabled: booleanValue(
        settings.soundEnabled,
        'Product snapshot profile.settings.soundEnabled',
      ),
      reducedMotion: booleanValue(
        settings.reducedMotion,
        'Product snapshot profile.settings.reducedMotion',
      ),
      qualityProfile: assertNonEmptyString(
        settings.qualityProfile,
        'Product snapshot profile.settings.qualityProfile',
      ),
    }),
    characterOptions: Object.freeze(characterOptions),
  });
}

function publicMatchView(source: PlainRecord): ProductSessionViewModel['match'] {
  const match = record(source.match, 'Product snapshot match');
  const infoValue = match.publicMatchInfo;
  if (infoValue === null || infoValue === undefined) return null;
  const info = record(infoValue, 'Product snapshot match.publicMatchInfo');
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

function resultView(resultValue: unknown): ProductSessionViewModel['result'] {
  if (resultValue === null || resultValue === undefined) return null;
  const result = validateProductMatchResult(resultValue);
  const authorityResult = result.authorityResult;
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

function rewardView(
  source: PlainRecord,
  contentRegistry: ProductContentPresentationRegistry,
  messages: ProductMessageCatalog,
): Pick<ProductSessionViewModel, 'reward' | 'unlocks'> {
  if (source.reward === null) return Object.freeze({ reward: null, unlocks: [] });
  const reward = record(source.reward, 'Product snapshot reward');
  const grant = createRewardGrant(reward.grant);
  const committed = booleanValue(reward.committed, 'Product ViewModel reward.committed');
  const duplicate = booleanValue(reward.duplicate, 'Product ViewModel reward.duplicate');
  const unlockViews: Array<ProductSessionViewModel['unlocks'][number]> = [];
  const groups = [
    [grant.unlocks.characterIds, PRODUCT_CONTENT_KIND.CHARACTER],
    [grant.unlocks.appearanceIds, PRODUCT_CONTENT_KIND.APPEARANCE],
    [grant.unlocks.equipmentIds, PRODUCT_CONTENT_KIND.EQUIPMENT],
    [grant.unlocks.mapIds, PRODUCT_CONTENT_KIND.MAP],
  ] as const;
  for (const [contentIds, kind] of groups) {
    for (const contentId of contentIds) {
      const definition = contentRegistry.requireContent(kind, contentId);
      unlockViews.push(Object.freeze({
        kind,
        contentId,
        name: messages.format(definition.nameMessageId),
        previewAssetId: definition.previewAssetId,
      }));
    }
  }
  return Object.freeze({
    reward: Object.freeze({ experienceDelta: grant.experienceDelta, committed, duplicate }),
    unlocks: Object.freeze(unlockViews),
  });
}

function publicError(
  source: PlainRecord,
  messages: ProductMessageCatalog,
): ProductSessionViewModel['error'] {
  if (source.lastError === null) return null;
  const error = record(source.lastError, 'Product snapshot lastError');
  const code = assertNonEmptyString(
    error.code,
    'Product snapshot lastError.code',
  ) as ProductSessionErrorCode;
  const messageId = ERROR_MESSAGE_BY_CODE[code];
  if (!messageId) throw new RangeError('Product ViewModel 收到未知公开错误码。');
  return Object.freeze({ code, message: messages.format(messageId) });
}

export function createProductSessionViewModel(
  snapshotValue: unknown,
  optionsValue: ProductSessionViewModelOptions,
): ProductSessionViewModel {
  const source = record(
    cloneFrozenData(snapshotValue, 'ProductSession snapshot for ViewModel'),
    'ProductSession snapshot for ViewModel',
  );
  const options = ownOptions(
    optionsValue,
    OPTION_KEYS,
    'ProductSession ViewModel options',
  );
  if (
    options.schemaVersion !== undefined
    && options.schemaVersion !== ARENA_V1_PRODUCT_PRESENTATION_CONTENT_SCHEMA_VERSION
  ) {
    throw new RangeError(
      `ProductSession ViewModel options.schemaVersion 不受支持：${String(options.schemaVersion)}。`,
    );
  }
  const screenRegistry = assertProductScreenRegistry(options.screenRegistry);
  const messages = createProductMessageCatalog(options.messageCatalog);
  const contentRegistry = assertProductContentPresentationRegistry(options.contentRegistry);
  const currentActiveState = activeState(source);
  const definition = screenRegistry.requireForState(currentActiveState);
  const state = record(source.state, 'Product snapshot state');
  const match = record(source.match, 'Product snapshot match');
  const visibleState = assertNonEmptyString(
    state.state,
    'Product snapshot state.state',
  ) as ProductSessionState;
  const suspended = visibleState === PRODUCT_SESSION_STATE.SUSPENDED;
  const busy = BUSY_STATES.has(currentActiveState);
  const terminal = TERMINAL_STATES.has(currentActiveState);
  const inputEnabled = !suspended && !busy && !terminal;
  const result = RESULT_STATES.has(currentActiveState)
    ? resultView(options.lastMatchResult ?? match.result ?? null)
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
    revision: assertIntegerAtLeast(state.revision, 0, 'Product snapshot state.revision'),
    locale: messages.locale,
    visibleState,
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
