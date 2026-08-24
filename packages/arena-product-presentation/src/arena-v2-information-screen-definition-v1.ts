import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_V2_INFORMATION_SCREEN_DEFINITION_V1_SCHEMA_VERSION = 1 as const;

export const ARENA_V2_INFORMATION_SCREEN_ID_V1 = Object.freeze({
  LOADING: 'loading',
  HOME: 'home',
  MODE_SELECT: 'mode-select',
  CHARACTER_SELECT: 'character-select',
  MATCH_PREP: 'match-prep',
  SURVIVAL_PREP: 'survival-prep',
  WEAPON_INDEX: 'weapon-index',
  WEAPON_DETAIL: 'weapon-detail',
  MAP_INDEX: 'map-index',
  MAP_DETAIL: 'map-detail',
  RESULT_REWARD: 'result-reward',
} as const);

export const ARENA_V2_INFORMATION_SCREEN_ORDER_V1 = Object.freeze([
  ARENA_V2_INFORMATION_SCREEN_ID_V1.LOADING,
  ARENA_V2_INFORMATION_SCREEN_ID_V1.HOME,
  ARENA_V2_INFORMATION_SCREEN_ID_V1.MODE_SELECT,
  ARENA_V2_INFORMATION_SCREEN_ID_V1.CHARACTER_SELECT,
  ARENA_V2_INFORMATION_SCREEN_ID_V1.MATCH_PREP,
  ARENA_V2_INFORMATION_SCREEN_ID_V1.SURVIVAL_PREP,
  ARENA_V2_INFORMATION_SCREEN_ID_V1.WEAPON_INDEX,
  ARENA_V2_INFORMATION_SCREEN_ID_V1.WEAPON_DETAIL,
  ARENA_V2_INFORMATION_SCREEN_ID_V1.MAP_INDEX,
  ARENA_V2_INFORMATION_SCREEN_ID_V1.MAP_DETAIL,
  ARENA_V2_INFORMATION_SCREEN_ID_V1.RESULT_REWARD,
] as const);

export const ARENA_V2_INFORMATION_SCREEN_TEMPLATE_V1 = Object.freeze({
  LOADING: 'loading',
  GOAL: 'goal',
  SELECTION: 'selection',
  PREPARATION: 'preparation',
  COLLECTION: 'collection',
  DETAIL: 'detail',
  RESULT: 'result',
} as const);

export const ARENA_V2_INFORMATION_READ_MODEL_KIND_V1 = Object.freeze({
  PRODUCT_SESSION: 'product-session',
  CONTENT_DEFINITION: 'content-definition',
  PROFILE_SNAPSHOT: 'profile-snapshot',
  PUBLIC_MATCH_INFO: 'public-match-info',
  MODE_READ_FRAME: 'mode-read-frame',
  SUPPLY_PROJECTION: 'supply-projection',
  PRODUCT_RESULT: 'product-result',
} as const);

export const ARENA_V2_INFORMATION_UI_INTENT_V1 = Object.freeze({
  RETRY_LOADING: 'retry-loading',
  OPEN_MODE_SELECT: 'open-mode-select',
  START_SELECTED_MODE: 'start-selected-mode',
  SAVE_CHARACTER: 'save-character',
  START_PREPARED_MATCH: 'start-prepared-match',
  START_SURVIVAL: 'start-survival',
  OPEN_SELECTED_WEAPON: 'open-selected-weapon',
  USE_SELECTED_WEAPON_NEXT_MATCH: 'use-selected-weapon-next-match',
  OPEN_SELECTED_MAP: 'open-selected-map',
  USE_SELECTED_MAP_NEXT_MATCH: 'use-selected-map-next-match',
  PLAY_AGAIN_OR_NEXT: 'play-again-or-next',
} as const);

export type ArenaV2InformationScreenIdV1 = typeof ARENA_V2_INFORMATION_SCREEN_ID_V1[
  keyof typeof ARENA_V2_INFORMATION_SCREEN_ID_V1
];
export type ArenaV2InformationScreenTemplateV1 =
  typeof ARENA_V2_INFORMATION_SCREEN_TEMPLATE_V1[
    keyof typeof ARENA_V2_INFORMATION_SCREEN_TEMPLATE_V1
  ];
export type ArenaV2InformationReadModelKindV1 =
  typeof ARENA_V2_INFORMATION_READ_MODEL_KIND_V1[
    keyof typeof ARENA_V2_INFORMATION_READ_MODEL_KIND_V1
  ];
export type ArenaV2InformationUiIntentV1 = typeof ARENA_V2_INFORMATION_UI_INTENT_V1[
  keyof typeof ARENA_V2_INFORMATION_UI_INTENT_V1
];

export interface ArenaV2InformationPrimaryActionV1 {
  readonly intentId: ArenaV2InformationUiIntentV1;
  readonly labelMessageId: string;
}

export interface ArenaV2InformationScreenDefinitionV1 {
  readonly schemaVersion: typeof ARENA_V2_INFORMATION_SCREEN_DEFINITION_V1_SCHEMA_VERSION;
  readonly id: ArenaV2InformationScreenIdV1;
  readonly ordinal: number;
  readonly template: ArenaV2InformationScreenTemplateV1;
  readonly questionMessageId: string;
  readonly primaryAction: ArenaV2InformationPrimaryActionV1;
  readonly firstViewFieldIds: readonly string[];
  readonly deferredFieldIds: readonly string[];
  readonly readModelKinds: readonly ArenaV2InformationReadModelKindV1[];
  readonly navigationTargetIds: readonly ArenaV2InformationScreenIdV1[];
  readonly bottomNavigationVisible: boolean;
  readonly announcementMessageId: string;
}

const DEFINITION_KEYS = new Set([
  'schemaVersion', 'id', 'ordinal', 'template', 'questionMessageId', 'primaryAction',
  'firstViewFieldIds', 'deferredFieldIds', 'readModelKinds', 'navigationTargetIds',
  'bottomNavigationVisible', 'announcementMessageId',
]);
const ACTION_KEYS = new Set(['intentId', 'labelMessageId']);
const SCREEN_IDS: ReadonlySet<unknown> = new Set(ARENA_V2_INFORMATION_SCREEN_ORDER_V1);
const TEMPLATES: ReadonlySet<unknown> = new Set(
  Object.values(ARENA_V2_INFORMATION_SCREEN_TEMPLATE_V1),
);
const READ_MODEL_KINDS: ReadonlySet<unknown> = new Set(
  Object.values(ARENA_V2_INFORMATION_READ_MODEL_KIND_V1),
);
const UI_INTENTS: ReadonlySet<unknown> = new Set(Object.values(ARENA_V2_INFORMATION_UI_INTENT_V1));

function enumValue<T extends string>(
  value: unknown,
  values: ReadonlySet<unknown>,
  name: string,
): T {
  if (!values.has(value)) throw new RangeError(`${name}不受支持：${String(value)}。`);
  return value as T;
}

function orderedStrings(
  value: unknown,
  name: string,
  minimumLength: number,
  maximumLength = Number.POSITIVE_INFINITY,
): readonly string[] {
  if (!Array.isArray(value) || value.length < minimumLength || value.length > maximumLength) {
    throw new RangeError(`${name}数量必须位于${minimumLength}到${maximumLength}之间。`);
  }
  const result = value.map((entry, index) => assertNonEmptyString(entry, `${name}[${index}]`));
  if (new Set(result).size !== result.length) throw new RangeError(`${name}不能重复。`);
  return Object.freeze(result);
}

function enumArray<T extends string>(
  value: unknown,
  values: ReadonlySet<unknown>,
  name: string,
  minimumLength: number,
): readonly T[] {
  if (!Array.isArray(value) || value.length < minimumLength) {
    throw new RangeError(`${name}至少需要${minimumLength}项。`);
  }
  const result = value.map((entry, index) => enumValue<T>(entry, values, `${name}[${index}]`));
  if (new Set(result).size !== result.length) throw new RangeError(`${name}不能重复。`);
  return Object.freeze(result);
}

export function createArenaV2InformationScreenDefinitionV1(
  value: unknown,
): ArenaV2InformationScreenDefinitionV1 {
  const source = cloneFrozenData(value, 'ArenaV2InformationScreenDefinitionV1');
  assertKnownKeys(source, DEFINITION_KEYS, 'ArenaV2InformationScreenDefinitionV1');
  if (source.schemaVersion !== ARENA_V2_INFORMATION_SCREEN_DEFINITION_V1_SCHEMA_VERSION) {
    throw new RangeError('ArenaV2InformationScreenDefinitionV1.schemaVersion必须是1。');
  }
  assertKnownKeys(source.primaryAction, ACTION_KEYS, 'ArenaV2InformationScreenDefinitionV1.primaryAction');
  if (typeof source.bottomNavigationVisible !== 'boolean') {
    throw new TypeError('ArenaV2InformationScreenDefinitionV1.bottomNavigationVisible必须是布尔值。');
  }
  return Object.freeze({
    schemaVersion: ARENA_V2_INFORMATION_SCREEN_DEFINITION_V1_SCHEMA_VERSION,
    id: enumValue<ArenaV2InformationScreenIdV1>(
      source.id,
      SCREEN_IDS,
      'ArenaV2InformationScreenDefinitionV1.id',
    ),
    ordinal: assertIntegerAtLeast(source.ordinal, 1, 'ArenaV2InformationScreenDefinitionV1.ordinal'),
    template: enumValue<ArenaV2InformationScreenTemplateV1>(
      source.template,
      TEMPLATES,
      'ArenaV2InformationScreenDefinitionV1.template',
    ),
    questionMessageId: assertNonEmptyString(
      source.questionMessageId,
      'ArenaV2InformationScreenDefinitionV1.questionMessageId',
    ),
    primaryAction: Object.freeze({
      intentId: enumValue<ArenaV2InformationUiIntentV1>(
        source.primaryAction.intentId,
        UI_INTENTS,
        'ArenaV2InformationScreenDefinitionV1.primaryAction.intentId',
      ),
      labelMessageId: assertNonEmptyString(
        source.primaryAction.labelMessageId,
        'ArenaV2InformationScreenDefinitionV1.primaryAction.labelMessageId',
      ),
    }),
    firstViewFieldIds: orderedStrings(
      source.firstViewFieldIds,
      'ArenaV2InformationScreenDefinitionV1.firstViewFieldIds',
      1,
      3,
    ),
    deferredFieldIds: orderedStrings(
      source.deferredFieldIds,
      'ArenaV2InformationScreenDefinitionV1.deferredFieldIds',
      0,
    ),
    readModelKinds: enumArray<ArenaV2InformationReadModelKindV1>(
      source.readModelKinds,
      READ_MODEL_KINDS,
      'ArenaV2InformationScreenDefinitionV1.readModelKinds',
      1,
    ),
    navigationTargetIds: enumArray<ArenaV2InformationScreenIdV1>(
      source.navigationTargetIds,
      SCREEN_IDS,
      'ArenaV2InformationScreenDefinitionV1.navigationTargetIds',
      0,
    ),
    bottomNavigationVisible: source.bottomNavigationVisible,
    announcementMessageId: assertNonEmptyString(
      source.announcementMessageId,
      'ArenaV2InformationScreenDefinitionV1.announcementMessageId',
    ),
  });
}
